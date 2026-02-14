/**
 * Fetch minimal LLM context for a block.
 *
 * NOTE: adjust Supabase client usage to match your repo.
 */
export type LlmContextRow = {
  blockId: string;
  originalText: string;
  chapterTitle: string | null;
  bookTitle: string | null;
  author: string | null;
  prevText: string | null;
  nextText: string | null;
};

export async function getLlmContextForBlock(supabase: any, args: { bookId: string; blockId: string }): Promise<LlmContextRow> {
  const { bookId, blockId } = args;

  const { data: blockRow, error: blockErr } = await supabase
    .from("blocks")
    .select("id,chapter_id,block_index,original_text,chapters!inner(id,book_id,title),books!inner(id,title,author)")
    .eq("id", blockId)
    .eq("chapters.book_id", bookId)
    .single();

  if (blockErr || !blockRow) throw new Error("A blokk nem található.");

  const chapter_id = blockRow.chapter_id ?? blockRow.chapters?.id;
  const blockIndex = blockRow.block_index;

  let prevText: string | null = null;
  let nextText: string | null = null;

  if (chapter_id) {
    const { data: prevRow } = await supabase
      .from("blocks")
      .select("original_text")
      .eq("chapter_id", chapter_id)
      .eq("block_index", blockIndex - 1)
      .maybeSingle();

    const { data: nextRow } = await supabase
      .from("blocks")
      .select("original_text")
      .eq("chapter_id", chapter_id)
      .eq("block_index", blockIndex + 1)
      .maybeSingle();

    prevText = prevRow?.original_text ?? null;
    nextText = nextRow?.original_text ?? null;
  }

  return {
    blockId,
    originalText: blockRow.original_text,
    chapterTitle: blockRow.chapters?.title ?? null,
    bookTitle: blockRow.books?.title ?? null,
    author: blockRow.books?.author ?? null,
    prevText,
    nextText,
  };
}
