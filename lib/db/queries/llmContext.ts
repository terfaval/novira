/**
 * Fetch minimal LLM context for a block.
 */
export type LlmContextRow = {
  blockId: string;
  chapterId: string;
  originalText: string;
  chapterTitle: string | null;
  bookTitle: string | null;
  author: string | null;
  prevText: string | null;
  nextText: string | null;
};

export async function getLlmContextForBlock(
  supabase: any,
  args: { bookId: string; blockId: string }
): Promise<LlmContextRow> {
  const { bookId, blockId } = args;

  const { data: blockRow, error: blockErr } = await supabase
    .from("blocks")
    .select("id,book_id,chapter_id,block_index,original_text")
    .eq("id", blockId)
    .eq("book_id", bookId)
    .single();

  if (blockErr) throw new Error(`Nem sikerult beolvasni a blokkot: ${blockErr.message}`);
  if (!blockRow) throw new Error("A blokk nem található.");

  const chapterId = blockRow.chapter_id;
  const blockIndex = blockRow.block_index;

  const { data: chapterRow, error: chapterErr } = await supabase
    .from("chapters")
    .select("title")
    .eq("id", chapterId)
    .eq("book_id", bookId)
    .maybeSingle();

  if (chapterErr) throw new Error(`Nem sikerult beolvasni a fejezetet: ${chapterErr.message}`);

  const { data: bookRow, error: bookErr } = await supabase
    .from("books")
    .select("title,author")
    .eq("id", bookId)
    .maybeSingle();

  if (bookErr) throw new Error(`Nem sikerült beolvasni a könyvet: ${bookErr.message}`);

  const { data: prevRow } = await supabase
    .from("blocks")
    .select("original_text")
    .eq("chapter_id", chapterId)
    .eq("block_index", blockIndex - 1)
    .maybeSingle();

  const { data: nextRow } = await supabase
    .from("blocks")
    .select("original_text")
    .eq("chapter_id", chapterId)
    .eq("block_index", blockIndex + 1)
    .maybeSingle();

  return {
    blockId,
    chapterId,
    originalText: blockRow.original_text,
    chapterTitle: chapterRow?.title ?? null,
    bookTitle: bookRow?.title ?? null,
    author: bookRow?.author ?? null,
    prevText: prevRow?.original_text ?? null,
    nextText: nextRow?.original_text ?? null,
  };
}
