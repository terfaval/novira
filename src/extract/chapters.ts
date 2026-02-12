import { CheerioAPI, Element } from "cheerio"

export function extractChapters($: CheerioAPI) {
  const chapters: any[] = []
  let current: any = null
  let order = 1

  const bodyChildren = $("body").children().toArray()

  for (const node of bodyChildren) {
    const el = $(node)

    if (isChapterHeading($, node)) {
      if (current) chapters.push(current)

      current = {
        title: el.text().trim(),
        order: order++,
        blocks: []
      }
      continue
    }

    if (!current) {
      current = {
        title: undefined,
        order: order++,
        blocks: []
      }
    }

    if (node.tagName === "p") {
      const text = el.text().trim()
      if (text) {
        current.blocks.push({
          order: current.blocks.length + 1,
          text
        })
      }
    }
  }

  if (current) chapters.push(current)

  return chapters.length ? chapters : [{
    title: undefined,
    order: 1,
    blocks: []
  }]
}

function isChapterHeading($: CheerioAPI, node: Element): boolean {
  const el = $(node)

  if (/^h[1-6]$/i.test(node.tagName)) return true

  const text = el.text().trim()

  if (!text) return false

  if (text.length < 120 && text === text.toUpperCase()) return true

  if (/^\d+\.?\s/.test(text)) return true
  if (/^I+\.?\s/.test(text)) return true

  return false
}
