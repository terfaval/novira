export function normalizeBlocks(chapters: any[]) {
  for (const chapter of chapters) {
    const merged: any[] = []

    for (const block of chapter.blocks) {
      if (block.text.length < 30 && merged.length > 0) {
        merged[merged.length - 1].text += " " + block.text
      } else {
        merged.push(block)
      }
    }

    chapter.blocks = merged.map((b, i) => ({
      order: i + 1,
      text: normalizeWhitespace(b.text)
    }))
  }

  return chapters
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}
