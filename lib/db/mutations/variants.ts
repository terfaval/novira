/**
 * Insert a new draft variant for a block.
 *
 * Policy v0:
 * - Always insert with status="draft"
 * - variant_index increments per block
 */
export async function insertDraftVariant(
  supabase: any,
  args: { bookId: string; blockId: string; text: string }
): Promise<{ id: string; block_id: string; status: "draft"; text: string }> {
  const { bookId, blockId, text } = args;

  const { data: latestRows, error: latestErr } = await supabase
    .from("variants")
    .select("variant_index")
    .eq("book_id", bookId)
    .eq("block_id", blockId)
    .order("variant_index", { ascending: false })
    .limit(1);

  if (latestErr) throw new Error("Nem sikerült a variáns index lekérdezése.");

  const nextIndex = (latestRows?.[0]?.variant_index ?? 0) + 1;

  const { data: inserted, error: insErr } = await supabase
    .from("variants")
    .insert({
      book_id: bookId,
      block_id: blockId,
      text,
      status: "draft",
      variant_index: nextIndex,
    })
    .select("id,block_id,status,text")
    .single();

  if (insErr || !inserted) throw new Error("Nem sikerült a variáns mentése.");
  return inserted;
}
