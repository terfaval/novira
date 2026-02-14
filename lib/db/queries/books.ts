import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookRow } from "@/lib/types";

type ChapterJoinRow =
  | { chapter_index: number; title: string | null }
  | Array<{ chapter_index: number; title: string | null }>
  | null;

type BlockQueryRow = {
  id: string;
  book_id: string;
  chapter_id: string;
  block_index: number;
  original_text: string;
  chapters: ChapterJoinRow;
};

type VariantStatus = "draft" | "accepted" | "rejected";

type VariantQueryRow = {
  id: string;
  block_id: string;
  text: string;
  status: VariantStatus;
  variant_index: number;
  updated_at: string;
};

export type DashboardBlock = {
  id: string;
  bookId: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string | null;
  blockIndex: number;
  originalText: string;
  translatedText: string | null;
  acceptedVariantId: string | null;
  isAccepted: boolean;
  hasAcceptableVariant: boolean;
  workflowStatus: VariantStatus;
};

export type DashboardCompletion = {
  accepted: number;
  total: number;
  ratio: number;
  isComplete: boolean;
};

export type BookDashboardData = {
  book: BookRow;
  blocks: DashboardBlock[];
  completion: DashboardCompletion;
};

function errorMessage(error: { message?: string } | null): string {
  if (!error) return "Ismeretlen hiba.";
  return typeof error.message === "string" && error.message.trim()
    ? error.message
    : "Ismeretlen hiba.";
}

function readChapter(chapters: ChapterJoinRow): { chapterIndex: number; chapterTitle: string | null } {
  if (!chapters) return { chapterIndex: 0, chapterTitle: null };
  const value = Array.isArray(chapters) ? chapters[0] : chapters;
  if (!value) return { chapterIndex: 0, chapterTitle: null };
  return { chapterIndex: value.chapter_index, chapterTitle: value.title };
}

/**
 * Loads everything needed for the Book Dashboard screen.
 *
 * Completion is block-based:
 * a block is complete if it has an accepted variant.
 */
export async function fetchBookDashboardData(
  supabase: SupabaseClient,
  bookId: string,
): Promise<BookDashboardData> {
  const { data: bookData, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .single();

  if (bookError) throw new Error(errorMessage(bookError));

  const { data: blockRows, error: blockError } = await supabase
    .from("blocks")
    .select("id,book_id,chapter_id,block_index,original_text,chapters!inner(chapter_index,title)")
    .eq("book_id", bookId);

  if (blockError) throw new Error(errorMessage(blockError));

  const { data: variantRows, error: variantError } = await supabase
    .from("variants")
    .select("id,block_id,text,status,variant_index,updated_at")
    .eq("book_id", bookId)
    .order("updated_at", { ascending: false })
    .order("variant_index", { ascending: false });

  if (variantError) throw new Error(errorMessage(variantError));

  const latestAcceptedByBlock = new Map<string, VariantQueryRow>();
  const latestVariantByBlock = new Map<string, VariantQueryRow>();
  const latestNonRejectedByBlock = new Map<string, VariantQueryRow>();
  for (const row of (variantRows ?? []) as VariantQueryRow[]) {
    if (!latestVariantByBlock.has(row.block_id)) {
      latestVariantByBlock.set(row.block_id, row);
    }
    if (row.status === "accepted" && !latestAcceptedByBlock.has(row.block_id)) {
      latestAcceptedByBlock.set(row.block_id, row);
    }
    if (row.status !== "rejected" && !latestNonRejectedByBlock.has(row.block_id)) {
      latestNonRejectedByBlock.set(row.block_id, row);
    }
  }

  const blocks = ((blockRows ?? []) as BlockQueryRow[])
    .map((row) => {
      const chapter = readChapter(row.chapters);
      const acceptedVariant = latestAcceptedByBlock.get(row.id);
      const latestVariant = latestVariantByBlock.get(row.id);
      const latestNonRejectedVariant = latestNonRejectedByBlock.get(row.id);
      const translatedText = acceptedVariant?.text ?? latestNonRejectedVariant?.text ?? null;
      const hasAcceptableVariant = Boolean(latestNonRejectedVariant?.text?.trim());
      const workflowStatus: VariantStatus = acceptedVariant
        ? "accepted"
        : latestVariant?.status === "rejected"
          ? "rejected"
          : "draft";

      return {
        id: row.id,
        bookId: row.book_id,
        chapterId: row.chapter_id,
        chapterIndex: chapter.chapterIndex,
        chapterTitle: chapter.chapterTitle,
        blockIndex: row.block_index,
        originalText: row.original_text,
        translatedText,
        acceptedVariantId: acceptedVariant?.id ?? null,
        isAccepted: Boolean(acceptedVariant),
        hasAcceptableVariant,
        workflowStatus,
      } satisfies DashboardBlock;
    })
    .sort((a, b) => {
      if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex;
      return a.blockIndex - b.blockIndex;
    });

  const accepted = blocks.filter((block) => block.isAccepted).length;
  const total = blocks.length;
  const ratio = total === 0 ? 0 : accepted / total;

  return {
    book: bookData as BookRow,
    blocks,
    completion: {
      accepted,
      total,
      ratio,
      isComplete: total > 0 && accepted === total,
    },
  };
}

export type AcceptBlockArgs = {
  supabase: SupabaseClient;
  userId: string;
  block: DashboardBlock;
};

/**
 * Accepts one block by creating an accepted variant row.
 *
 * This ticket intentionally avoids any LLM generation:
 * it only promotes existing translated text to accepted state.
 */
export async function acceptBlockVariant({ supabase, userId, block }: AcceptBlockArgs): Promise<void> {
  if (block.isAccepted) return;

  const { data: sourceVariantRows, error: sourceVariantError } = await supabase
    .from("variants")
    .select("id,text,status")
    .eq("block_id", block.id)
    .neq("status", "rejected")
    .order("updated_at", { ascending: false })
    .order("variant_index", { ascending: false })
    .limit(1);

  if (sourceVariantError) throw new Error(errorMessage(sourceVariantError));

  const sourceVariant = (sourceVariantRows as Array<{ id: string; text: string; status: VariantStatus }> | null)?.[0];
  const translatedText = sourceVariant?.text?.trim();

  if (!sourceVariant || !translatedText) {
    throw new Error("A blokkhoz nincs elfogadhato forditott szoveg.");
  }
  if (sourceVariant.status === "accepted") return;

  const { error: demoteError } = await supabase
    .from("variants")
    .update({ status: "rejected" })
    .eq("block_id", block.id)
    .eq("status", "accepted");

  if (demoteError) throw new Error(errorMessage(demoteError));

  const { data: latestVariant, error: latestVariantError } = await supabase
    .from("variants")
    .select("variant_index")
    .eq("block_id", block.id)
    .order("variant_index", { ascending: false })
    .limit(1);

  if (latestVariantError) throw new Error(errorMessage(latestVariantError));

  const nextIndex = ((latestVariant as Array<{ variant_index: number }> | null)?.[0]?.variant_index ?? 0) + 1;

  const payload = {
    owner_id: userId,
    book_id: block.bookId,
    chapter_id: block.chapterId,
    block_id: block.id,
    variant_index: nextIndex,
    status: "accepted",
    text: translatedText,
  };

  const { error: insertError } = await supabase.from("variants").insert(payload);
  if (insertError) throw new Error(errorMessage(insertError));
}
