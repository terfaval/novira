import { load } from "cheerio"
import { CanonicalBook } from "./types"
import { normalizeDom } from "./dom/normalizeDom"
import { extractTitle } from "./extract/title"
import { extractChapters } from "./extract/chapters"
import { normalizeBlocks } from "./extract/blocks"

export function parseHtmlToCanonical(html: string): CanonicalBook {
  const $ = load(html)

  normalizeDom($)

  const title = extractTitle($)
  let chapters = extractChapters($)
  chapters = normalizeBlocks(chapters)

  return {
    title,
    chapters
  }
}
