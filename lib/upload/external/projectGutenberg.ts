import { createHash } from "node:crypto";
import JSZip from "jszip";
import iconv from "iconv-lite";
import { load } from "cheerio";
import { parseToCanonical, type CanonicalBook } from "@/lib/upload/parser";

const PROJECT_GUTENBERG_SOURCE = "project_gutenberg";
const PROJECT_GUTENBERG_LICENSE_URL = "https://www.gutenberg.org/policy/license.html";
const DEFAULT_URL_TEMPLATE = "https://www.gutenberg.org/cache/epub/{work_id}/pg{work_id}-h.zip";
const DEFAULT_REQUEST_INTERVAL_MS = 1000;
const DEFAULT_RETRY_COUNT = 3;

let lastRequestAt = 0;

export type ProjectGutenbergImportResult = {
  canonical: CanonicalBook;
  sourceName: "project_gutenberg";
  sourceUrl: string;
  sourceWorkId: string;
  sourceLicenseUrl: string;
  sourceRetrievedAt: string;
  sourceOriginalSha256: string;
  sourceFilename: string;
  zipBuffer: Buffer;
  titleHint: string;
};

export async function importProjectGutenbergHtmlZip(workId: number): Promise<ProjectGutenbergImportResult> {
  const sourceWorkId = `${workId}`;
  const urls = buildProjectGutenbergZipUrls(sourceWorkId);
  const userAgent = getImporterUserAgent();

  const fetched = await fetchFirstWorkingZip({
    urls,
    userAgent,
    retriesPerUrl: DEFAULT_RETRY_COUNT,
    minIntervalMs: DEFAULT_REQUEST_INTERVAL_MS,
  });

  const zip = await JSZip.loadAsync(fetched.buffer);
  const htmlEntry = discoverMainHtmlEntry(zip);
  if (!htmlEntry) {
    throw new Error("A Project Gutenberg ZIP nem tartalmaz feldolgozható HTML fájlt.");
  }

  const rawHtmlBuffer = await htmlEntry.async("nodebuffer");
  const decodedHtml = decodeHtmlBuffer(rawHtmlBuffer);
  const cleanedHtml = stripProjectGutenbergBoilerplate(removeImageNodes(decodedHtml));
  const sourceOriginalSha256 = createHash("sha256").update(cleanedHtml).digest("hex");

  let canonical = await parseToCanonical(Buffer.from(cleanedHtml, "utf8"), "html");
  canonical = splitByJourneyToWestChapterHeadings(canonical);

  if (canonical.chapters.length === 0) {
    throw new Error("A letöltött forrásból nem sikerült fejezet/blokk tartalmat kinyerni.");
  }

  return {
    canonical,
    sourceName: PROJECT_GUTENBERG_SOURCE,
    sourceUrl: fetched.url,
    sourceWorkId,
    sourceLicenseUrl: PROJECT_GUTENBERG_LICENSE_URL,
    sourceRetrievedAt: new Date().toISOString(),
    sourceOriginalSha256,
    sourceFilename: htmlEntry.name.split("/").pop() ?? `pg${sourceWorkId}-h.htm`,
    zipBuffer: fetched.buffer,
    titleHint: canonical.chapters[0]?.title?.trim() || `Project Gutenberg #${sourceWorkId}`,
  };
}

function getImporterUserAgent(): string {
  const configured = (process.env.EXTERNAL_IMPORT_USER_AGENT ?? "").trim();
  if (configured) return configured;
  return "NoviraExternalImporter/1.0 (+https://example.local/novira)";
}

function buildProjectGutenbergZipUrls(workId: string): string[] {
  const mirrors = `${process.env.PG_MIRRORS ?? ""}`
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const envTemplate = (process.env.PG_DEFAULT_URL_TEMPLATE ?? "").trim() || DEFAULT_URL_TEMPLATE;
  const urls = [
    ...mirrors.map((base) => `${base.replace(/\/+$/, "")}/cache/epub/${workId}/pg${workId}-h.zip`),
    applyWorkIdTemplate(envTemplate, workId),
  ];

  const dedup = new Set<string>();
  for (const url of urls) {
    if (!url) continue;
    dedup.add(url);
  }
  return [...dedup];
}

function applyWorkIdTemplate(template: string, workId: string): string {
  return template
    .replaceAll("{work_id}", workId)
    .replaceAll("{id}", workId)
    .replaceAll("{workId}", workId);
}

async function fetchFirstWorkingZip(input: {
  urls: string[];
  userAgent: string;
  retriesPerUrl: number;
  minIntervalMs: number;
}): Promise<{ url: string; buffer: Buffer }> {
  const errors: string[] = [];
  for (const url of input.urls) {
    for (let attempt = 1; attempt <= input.retriesPerUrl; attempt += 1) {
      try {
        await waitForNextRequestWindow(input.minIntervalMs);
        const response = await fetch(url, {
          headers: {
            "User-Agent": input.userAgent,
            Accept: "application/zip, application/octet-stream;q=0.9, */*;q=0.8",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          if (!isRetriableStatus(response.status) || attempt === input.retriesPerUrl) {
            errors.push(`${url} -> HTTP ${response.status}`);
            break;
          }
          await sleep(2 ** attempt * 400);
          continue;
        }

        const arr = await response.arrayBuffer();
        return { url, buffer: Buffer.from(arr) };
      } catch (error: any) {
        const message = error?.message ?? "ismeretlen fetch hiba";
        if (attempt === input.retriesPerUrl) {
          errors.push(`${url} -> ${message}`);
          break;
        }
        await sleep(2 ** attempt * 400);
      }
    }
  }

  throw new Error(`A Project Gutenberg ZIP letoltes sikertelen. ${errors.join("; ")}`);
}

async function waitForNextRequestWindow(minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < minIntervalMs) {
    await sleep(minIntervalMs - elapsed);
  }
  lastRequestAt = Date.now();
}

function isRetriableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function discoverMainHtmlEntry(zip: JSZip): JSZip.JSZipObject | null {
  const htmlCandidates = Object.values(zip.files)
    .filter((entry) => !entry.dir && /\.(htm|html)$/i.test(entry.name))
    .sort((a, b) => scoreHtmlEntry(b.name) - scoreHtmlEntry(a.name));

  return htmlCandidates[0] ?? null;
}

function scoreHtmlEntry(name: string): number {
  const lower = name.toLowerCase();
  let score = 0;
  if (lower.endsWith("-h.htm") || lower.endsWith("-h.html")) score += 60;
  if (lower.includes("/pg")) score += 25;
  if (lower.includes("index")) score -= 20;
  return score;
}

function decodeHtmlBuffer(buf: Buffer): string {
  const head = buf.subarray(0, 4096).toString("latin1").toLowerCase();
  const match = head.match(/charset\s*=\s*["']?([a-z0-9._-]+)/i);
  const charset = match?.[1] ?? "utf-8";

  if (charset.includes("iso-8859-2")) return iconv.decode(buf, "iso-8859-2");
  if (charset.includes("windows-1250") || charset.includes("cp1250")) return iconv.decode(buf, "windows-1250");
  if (charset.includes("big5")) return iconv.decode(buf, "big5");
  if (charset.includes("gb2312") || charset.includes("gbk") || charset.includes("gb18030")) {
    return iconv.decode(buf, "gb18030");
  }
  return iconv.decode(buf, "utf-8");
}

function removeImageNodes(html: string): string {
  const $ = load(html);
  $("img,picture,figure,svg").remove();
  return $.html();
}

function stripProjectGutenbergBoilerplate(html: string): string {
  const $ = load(html);
  const candidates = $("body")
    .find("p,pre,div,h1,h2,h3,h4,h5,h6,section,article")
    .toArray();

  const texts = candidates.map((el) => $(el).text().replace(/\s+/g, " ").trim());
  const startIdx = texts.findIndex((text) =>
    /start of (the|this) project gutenberg ebook/i.test(text) || /^\*\*\*\s*start of/i.test(text)
  );
  const endIdx = texts.findIndex((text) =>
    /end of (the|this) project gutenberg ebook/i.test(text) || /^\*\*\*\s*end of/i.test(text)
  );

  if (startIdx >= 0) {
    for (let i = 0; i <= startIdx; i += 1) $(candidates[i]).remove();
  }
  if (endIdx >= 0) {
    for (let i = endIdx; i < candidates.length; i += 1) $(candidates[i]).remove();
  }

  $("body")
    .find("p,div,pre")
    .filter((_, el) => /project gutenberg/i.test($(el).text()))
    .slice(0, 2)
    .remove();

  return $.html();
}

function splitByJourneyToWestChapterHeadings(book: CanonicalBook): CanonicalBook {
  const headingPattern = /^第[\p{Script=Han}0-9〇一二三四五六七八九十百千兩两零]+回(?:[\s\u3000:：、，。．·-].*)?$/u;
  const flatBlocks = book.chapters.flatMap((chapter) => chapter.blocks.map((block) => block.raw_text.trim()));
  if (flatBlocks.length === 0) return book;

  const chapters: CanonicalBook["chapters"] = [];
  let currentTitle = book.chapters[0]?.title?.trim() || "1. fejezet";
  let currentBlocks: CanonicalBook["chapters"][number]["blocks"] = [];
  let foundHeading = false;

  const flush = () => {
    if (currentBlocks.length === 0) return;
    chapters.push({
      chapter_index: chapters.length + 1,
      title: currentTitle,
      blocks: currentBlocks.map((block, index) => ({
        chapter_index: index + 1,
        type: "paragraph",
        raw_text: block.raw_text,
      })),
    });
  };

  for (const text of flatBlocks) {
    if (!text) continue;
    if (headingPattern.test(text)) {
      flush();
      currentTitle = text;
      currentBlocks = [];
      foundHeading = true;
      continue;
    }
    currentBlocks.push({
      chapter_index: currentBlocks.length + 1,
      type: "paragraph",
      raw_text: text,
    });
  }
  flush();

  if (!foundHeading || chapters.length === 0) return book;
  return { chapters };
}
