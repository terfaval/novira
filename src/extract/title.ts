import type { CheerioAPI } from "cheerio"
import type { Element } from "domhandler"

export function extractTitle($: CheerioAPI): string {
  const titleTag = $("title").first().text().trim()
  if (titleTag) {
    return cleanTitle(titleTag)
  }

  const h1 = $("h1").first().text().trim()
  if (h1) return h1

  const centered = $("body")
    .find("p")
    .filter((_: number, el: Element) => {
      const text = $(el).text().trim()
      return text.length > 5 && text.length < 120
    })
    .first()
    .text()
    .trim()

  return centered || "Untitled"
}

function cleanTitle(raw: string): string {
  const parts = raw.split(":")
  if (parts.length > 1) {
    return parts.slice(1).join(":").trim()
  }
  return raw.trim()
}
