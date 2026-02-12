import JSZip from "jszip"
import iconv from "iconv-lite"
import { parseHtmlToCanonical } from "../../src"

export type UploadFormat = "html" | "rtf" | "docx"
export type CanonicalBlockType = "heading" | "paragraph"

export type CanonicalBlock = {
  chapter_index: number
  type: CanonicalBlockType
  raw_text: string
}

export type CanonicalChapter = {
  chapter_index: number
  title: string
  blocks: CanonicalBlock[]
}

export type CanonicalBook = {
  chapters: CanonicalChapter[]
}

const ALLOWED_EXT = new Set([".html", ".htm", ".rtf", ".docx"])

export function detectUploadFormat(
  fileName: string,
  contentType?: string | null
): UploadFormat | null {
  const lowerName = fileName.toLowerCase()
  if (!ALLOWED_EXT.has(lowerName.slice(lowerName.lastIndexOf(".")))) return null

  if (lowerName.endsWith(".docx")) return "docx"
  if (lowerName.endsWith(".rtf")) return "rtf"
  if (lowerName.endsWith(".htm") || lowerName.endsWith(".html")) return "html"

  const lowerType = (contentType ?? "").toLowerCase()
  if (lowerType.includes("wordprocessingml")) return "docx"
  if (lowerType.includes("rtf")) return "rtf"
  if (lowerType.includes("html")) return "html"

  return null
}

export async function parseToCanonical(
  fileBuffer: Buffer,
  format: UploadFormat
): Promise<CanonicalBook> {
  switch (format) {
    case "html":
      return parseHtml(fileBuffer)
    case "rtf":
      return parseRtf(fileBuffer)
    case "docx":
      return parseDocx(fileBuffer)
    default:
      return { chapters: [] }
  }
}

/* ------------------------------------------------------------------ */
/* ------------------------- HTML (NEW ENGINE) ---------------------- */
/* ------------------------------------------------------------------ */

function parseHtml(buffer: Buffer): CanonicalBook {
  const html = decodeHtmlBuffer(buffer)

  const engineResult = parseHtmlToCanonical(html)

  return mapEngineToDbCanonical(engineResult)
}

/**
 * Deterministic charset detection + decode
 * MEK corpus miatt kötelező az ISO-8859-2 támogatás.
 */
function decodeHtmlBuffer(buf: Buffer): string {
  const head = buf.subarray(0, 4096).toString("latin1").toLowerCase()
  const match = head.match(/charset\s*=\s*["']?([a-z0-9._-]+)/i)
  const charset = match?.[1] ?? "utf-8"

  if (charset.includes("iso-8859-2")) {
    return iconv.decode(buf, "iso-8859-2")
  }

  if (charset.includes("windows-1250") || charset.includes("cp1250")) {
    return iconv.decode(buf, "windows-1250")
  }

  return iconv.decode(buf, "utf-8")
}

/**
 * Engine output → DB-compatible CanonicalBook
 */
function mapEngineToDbCanonical(engine: {
  title: string
  chapters: {
    title?: string
    order: number
    blocks: { order: number; text: string }[]
  }[]
}): CanonicalBook {

  const chapters: CanonicalChapter[] = engine.chapters.map((ch, i) => ({
    chapter_index: i + 1,
    title: ch.title ?? "",
    blocks: ch.blocks.map((b, j) => ({
      chapter_index: j + 1,
      type: "paragraph",
      raw_text: b.text,
    })),
  }))

  // --- Könyvcím promóció az első fejezetben ---
  if (chapters.length > 0) {
    const first = chapters[0]

    if (!first.title && first.blocks.length > 0) {
      const candidate = first.blocks[0].raw_text.trim()

      if (
        candidate.length < 120 &&
        candidate === candidate.toUpperCase()
      ) {
        first.title = candidate
        first.blocks.shift()

        // reindexelés
        first.blocks = first.blocks.map((b, idx) => ({
          ...b,
          chapter_index: idx + 1,
        }))
      }
    }
  }

  return { chapters }
}

/* ------------------------------------------------------------------ */
/* ------------------------------ RTF ------------------------------- */
/* ------------------------------------------------------------------ */

function parseRtf(buffer: Buffer): CanonicalBook {
  const src = buffer.toString("latin1")

  const withHex = src.replace(/\\'([0-9a-fA-F]{2})/g, (_, h: string) =>
    String.fromCharCode(parseInt(h, 16))
  )

  const normalized = withHex
    .replace(/\\par[d]?/g, "\n\n")
    .replace(/\\line/g, "\n")
    .replace(/\\tab/g, " ")
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\r\n/g, "\n")

  return fromParagraphText(normalizeText(normalized), {
    chapterTitle: "RTF import",
  })
}

/* ------------------------------------------------------------------ */
/* ------------------------------ DOCX ------------------------------ */
/* ------------------------------------------------------------------ */

async function parseDocx(buffer: Buffer): Promise<CanonicalBook> {
  const zip = await JSZip.loadAsync(buffer)
  const entry = zip.file("word/document.xml")
  if (!entry) return { chapters: [] }

  const xml = await entry.async("text")

  const paragraphRe = /<w:p[\s\S]*?<\/w:p>/g
  const tokens: Array<{ kind: "heading" | "paragraph"; text: string }> = []

  for (const match of xml.matchAll(paragraphRe)) {
    const pxml = match[0] ?? ""
    const text = normalizeText(extractDocxParagraphText(pxml))
    if (!text) continue

    const isHeading =
      /w:pStyle[^>]*w:val="Heading\d"/.test(pxml) ||
      /w:pStyle[^>]*w:val="Cim\d"/.test(pxml)

    tokens.push({
      kind: isHeading ? "heading" : "paragraph",
      text,
    })
  }

  if (tokens.length === 0) {
    const allText = normalizeText(extractDocxParagraphText(xml))
    return fromParagraphText(allText, { chapterTitle: "DOCX import" })
  }

  return chaptersFromTokens(tokens)
}

function extractDocxParagraphText(xml: string): string {
  let out = ""
  const tagRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g

  for (const m of xml.matchAll(tagRe)) {
    if (m[1] != null) out += decodeXmlEntities(m[1])
    else if (m[0] === "<w:tab/>") out += " "
    else out += "\n"
  }

  return out
}

/* ------------------------------------------------------------------ */
/* ------------------------- TOKEN → CHAPTER ------------------------ */
/* ------------------------------------------------------------------ */

function chaptersFromTokens(
  tokens: Array<{ kind: "heading" | "paragraph"; text: string }>
): CanonicalBook {
  const chapters: CanonicalChapter[] = []

  let current: CanonicalChapter = {
    chapter_index: 1,
    title: "Bevezető",
    blocks: [],
  }

  let chapterIndex = 0
  let blockIndex = 0

  const pushCurrent = () => {
    if (current.blocks.length === 0) return
    chapters.push(current)
  }

  for (const token of tokens) {
    if (token.kind === "heading") {
      pushCurrent()
      chapterIndex += 1
      blockIndex = 0

      current = {
        chapter_index: chapterIndex,
        title: token.text,
        blocks: [],
      }
      continue
    }

    blockIndex += 1
    current.blocks.push({
      chapter_index: blockIndex,
      type: "paragraph",
      raw_text: token.text,
    })
  }

  pushCurrent()

  if (chapters.length === 0) {
    return fromParagraphText(tokens.map((t) => t.text).join("\n\n"))
  }

  return { chapters }
}

function fromParagraphText(
  text: string,
  opts?: { chapterTitle?: string }
): CanonicalBook {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => normalizeText(p))
    .filter(Boolean)

  if (paragraphs.length === 0) return { chapters: [] }

  return {
    chapters: [
      {
        chapter_index: 1,
        title: opts?.chapterTitle ?? "1. fejezet",
        blocks: paragraphs.map((p, idx) => ({
          chapter_index: idx + 1,
          type: "paragraph",
          raw_text: p,
        })),
      },
    ],
  }
}

/* ------------------------------------------------------------------ */
/* -------------------------- UTILITIES ----------------------------- */
/* ------------------------------------------------------------------ */

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
}
