import { CheerioAPI } from "cheerio"

export function normalizeDom($: CheerioAPI): void {
  // Remove non-content elements
  $("script, style, meta, link, noscript").remove()

  // Remove TOC-like dense anchor blocks
  $("body *").each((_, el) => {
    const node = $(el)
    const links = node.find("a")
    const textLength = node.text().trim().length
    const linkTextLength = links.text().trim().length

    if (textLength > 0 && linkTextLength / textLength > 0.6 && links.length > 3) {
      node.remove()
    }
  })

  // Remove anchor-only blocks
  $("body *").each((_, el) => {
    const node = $(el)
    const text = node.text().trim()
    if (!text && node.children().length === 0) {
      node.remove()
    }
  })

  // Unwrap layout tags
  unwrapTag($, "font")
  unwrapTag($, "center")

  // Remove layout tables (single cell wrapper)
  $("table").each((_, table) => {
    const node = $(table)
    const cells = node.find("td")
    if (cells.length === 1) {
      node.replaceWith(cells.first().html() || "")
    }
  })

  // Strip style & align attributes
  $("*").each((_, el) => {
    $(el).removeAttr("style")
    $(el).removeAttr("align")
  })
}

function unwrapTag($: CheerioAPI, tag: string) {
  $(tag).each((_, el) => {
    const node = $(el)
    node.replaceWith(node.html() || "")
  })
}
