import JSZip from "jszip";

export type UploadFormat = "html" | "rtf" | "docx";
export type CanonicalBlockType = "heading" | "paragraph";

export type CanonicalBlock = {
  order_index: number;
  type: CanonicalBlockType;
  raw_text: string;
};

export type CanonicalChapter = {
  order_index: number;
  title: string;
  blocks: CanonicalBlock[];
};

export type CanonicalBook = {
  chapters: CanonicalChapter[];
};

const ALLOWED_EXT = new Set([".html", ".htm", ".rtf", ".docx"]);

export function detectUploadFormat(fileName: string, contentType?: string | null): UploadFormat | null {
  const lowerName = fileName.toLowerCase();
  if (!ALLOWED_EXT.has(lowerName.slice(lowerName.lastIndexOf(".")))) return null;

  if (lowerName.endsWith(".docx")) return "docx";
  if (lowerName.endsWith(".rtf")) return "rtf";
  if (lowerName.endsWith(".htm") || lowerName.endsWith(".html")) return "html";

  const lowerType = (contentType ?? "").toLowerCase();
  if (lowerType.includes("wordprocessingml")) return "docx";
  if (lowerType.includes("rtf")) return "rtf";
  if (lowerType.includes("html")) return "html";
  return null;
}

export async function parseToCanonical(buffer: Buffer, format: UploadFormat): Promise<CanonicalBook> {
  switch (format) {
    case "html":
      return parseHtml(buffer);
    case "rtf":
      return parseRtf(buffer);
    case "docx":
      return parseDocx(buffer);
    default:
      return { chapters: [] };
  }
}

function parseHtml(buffer: Buffer): CanonicalBook {
  const raw = buffer.toString("utf8");
  const cleaned = raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const tagRe = /<(h[1-6]|p|li|blockquote|div)[^>]*>([\s\S]*?)<\/\1>/gi;
  const tokens: Array<{ tag: string; text: string }> = [];

  for (const match of cleaned.matchAll(tagRe)) {
    const tag = (match[1] ?? "").toLowerCase();
    const text = normalizeText(stripHtml(match[2] ?? ""));
    if (text) tokens.push({ tag, text });
  }

  if (tokens.length === 0) {
    return fromParagraphText(normalizeText(stripHtml(cleaned)));
  }

  return chaptersFromTokens(tokens.map((t) => ({
    kind: t.tag.startsWith("h") ? "heading" : "paragraph",
    text: t.text,
  })));
}

function parseRtf(buffer: Buffer): CanonicalBook {
  const src = buffer.toString("latin1");
  const withHex = src.replace(/\\'([0-9a-fA-F]{2})/g, (_, h: string) =>
    String.fromCharCode(parseInt(h, 16))
  );
  const normalized = withHex
    .replace(/\\par[d]?/g, "\n\n")
    .replace(/\\line/g, "\n")
    .replace(/\\tab/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\r\n/g, "\n");

  return fromParagraphText(normalizeText(normalized), { chapterTitle: "RTF import" });
}

async function parseDocx(buffer: Buffer): Promise<CanonicalBook> {
  const zip = await JSZip.loadAsync(buffer);
  const entry = zip.file("word/document.xml");
  if (!entry) return { chapters: [] };

  const xml = await entry.async("text");
  const paragraphRe = /<w:p[\s\S]*?<\/w:p>/g;
  const tokens: Array<{ kind: "heading" | "paragraph"; text: string }> = [];

  for (const match of xml.matchAll(paragraphRe)) {
    const pxml = match[0] ?? "";
    const text = normalizeText(extractDocxParagraphText(pxml));
    if (!text) continue;

    const isHeading = /w:pStyle[^>]*w:val="Heading\d"/.test(pxml) || /w:pStyle[^>]*w:val="Cim\d"/.test(pxml);
    tokens.push({ kind: isHeading ? "heading" : "paragraph", text });
  }

  if (tokens.length === 0) {
    const allText = normalizeText(extractDocxParagraphText(xml));
    return fromParagraphText(allText, { chapterTitle: "DOCX import" });
  }

  return chaptersFromTokens(tokens);
}

function extractDocxParagraphText(xml: string): string {
  let out = "";
  const tagRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
  for (const m of xml.matchAll(tagRe)) {
    if (m[1] != null) out += decodeXmlEntities(m[1]);
    else if (m[0] === "<w:tab/>") out += " ";
    else out += "\n";
  }
  return out;
}

function chaptersFromTokens(tokens: Array<{ kind: "heading" | "paragraph"; text: string }>): CanonicalBook {
  const chapters: CanonicalChapter[] = [];
  let current: CanonicalChapter = {
    order_index: 0,
    title: "Bevezető",
    blocks: [],
  };
  let chapterIndex = 0;
  let blockIndex = 0;

  const pushCurrent = () => {
    if (current.blocks.length === 0) return;
    chapters.push(current);
  };

  for (const token of tokens) {
    if (token.kind === "heading") {
      pushCurrent();
      chapterIndex += 1;
      blockIndex = 0;
      current = {
        order_index: chapterIndex,
        title: token.text,
        blocks: [],
      };
      continue;
    }

    blockIndex += 1;
    current.blocks.push({
      order_index: blockIndex,
      type: "paragraph",
      raw_text: token.text,
    });
  }

  pushCurrent();

  if (chapters.length === 0) {
    return fromParagraphText(tokens.map((t) => t.text).join("\n\n"));
  }

  return { chapters };
}

function fromParagraphText(text: string, opts?: { chapterTitle?: string }): CanonicalBook {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => normalizeText(p))
    .filter(Boolean);

  if (paragraphs.length === 0) return { chapters: [] };

  return {
    chapters: [
      {
        order_index: 1,
        title: opts?.chapterTitle ?? "1. fejezet",
        blocks: paragraphs.map((p, idx) => ({
          order_index: idx + 1,
          type: "paragraph",
          raw_text: p,
        })),
      },
    ],
  };
}

function stripHtml(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]+>/g, " "));
}

function normalizeText(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function decodeHtmlEntities(input: string): string {
  const partial = input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");

  return partial
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}
