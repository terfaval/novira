export type CanonicalBook = {
  title: string
  author?: string
  chapters: {
    title?: string
    order: number
    blocks: {
      order: number
      text: string
    }[]
  }[]
}
