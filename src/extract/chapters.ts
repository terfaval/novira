import type { CheerioAPI } from "cheerio"
import type { Element } from "domhandler"

type EngineBlock = { order: number; text: string }
type EngineChapter = { title?: string; order: number; blocks: EngineBlock[] }

export function extractChapters($: CheerioAPI): EngineChapter[] {
  const chapters: EngineChapter[] = []

  let chapterOrder = 1
  let blockOrder = 0

  // mindig van "current", így nem kell null
  let current: EngineChapter = { title: undefined, order: chapterOrder++, blocks: [] }

  const flushCurrent = () => {
    if (current.blocks.length > 0) chapters.push(current)
  }

  const startChapter = (title?: string) => {
    flushCurrent()
    current = { title: title?.trim() || undefined, order: chapterOrder++, blocks: [] }
    blockOrder = 0
  }

  const nodes = $("body")
    .find("h1,h2,h3,h4,h5,h6,p,li,blockquote,div")
    .toArray() as Element[]

  for (const node of nodes) {
    const el = $(node)

    const text = normalizeText(el.text())
    if (!text) continue
    if (looksLikeNoise(text)) continue

    if (isChapterHeading(node, text)) {
      startChapter(text)
      continue
    }

    // div wrapper: ha csak más blokkokat tartalmaz, ne duplázzunk
    if (node.tagName === "div") {
      const hasBlockChildren = el.find("p,li,blockquote,h1,h2,h3,h4,h5,h6").length > 0
      if (hasBlockChildren) continue
    }

    blockOrder += 1
    current.blocks.push({ order: blockOrder, text })
  }

  flushCurrent()

  // determinisztikus fallback: ha tényleg semmi nem lett
  if (chapters.length === 0) {
    return [{ title: undefined, order: 1, blocks: [] }]
  }

  return chapters
}

function isChapterHeading(node: Element, text: string): boolean {
  if (/^h[1-6]$/i.test(node.tagName)) return true
  if (text.length <= 120 && text === text.toUpperCase()) return true
  if (/^\d+\.\s*/.test(text)) return true
  if (/^I+\.\s*/.test(text)) return true
  return false
}

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
}

function looksLikeNoise(text: string): boolean {
  const t = text.toLowerCase()
  if (t === "tartalom") return true
  if (t.startsWith("ugrás") || t.startsWith("vissza")) return true
  return false
}
