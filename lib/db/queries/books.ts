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

type NoteQueryRow = {
  id: string;
  block_id: string;
  anchor_start: number | null;
  anchor_end: number | null;
  kind: string;
  content: string;
  created_at: string;
};

type FootnoteQueryRow = {
  number: number;
  text: string;
};

type FootnoteAnchorRow = {
  block_id: string;
  footnote_number: number;
};

export type DashboardInlineNote = {
  id: string;
  anchorStart: number;
  anchorEnd: number;
  kind: string;
  content: string;
  createdAt: string;
};

export type DashboardFootnoteSuggestion = {
  number: number;
  text: string;
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
  editedVariantId: string | null;
  acceptedVariantId: string | null;
  isAccepted: boolean;
  hasAcceptableVariant: boolean;
  workflowStatus: VariantStatus;
  inlineNotes: DashboardInlineNote[];
  footnoteSuggestions: DashboardFootnoteSuggestion[];
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

  const { data: notesRows, error: notesError } = await supabase
    .from("notes")
    .select("id,block_id,anchor_start,anchor_end,kind,content,created_at")
    .eq("book_id", bookId)
    .order("created_at", { ascending: true });

  if (notesError) throw new Error(errorMessage(notesError));

  const { data: footnoteRows, error: footnoteError } = await supabase
    .from("footnotes")
    .select("number,text")
    .eq("book_id", bookId);

  if (footnoteError) throw new Error(errorMessage(footnoteError));

  const { data: footnoteAnchorRows, error: footnoteAnchorError } = await supabase
    .from("footnote_anchors")
    .select("block_id,footnote_number")
    .eq("book_id", bookId);

  if (footnoteAnchorError) throw new Error(errorMessage(footnoteAnchorError));

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

  const inlineNotesByBlock = new Map<string, DashboardInlineNote[]>();
  for (const row of (notesRows ?? []) as NoteQueryRow[]) {
    if (typeof row.anchor_start !== "number" || typeof row.anchor_end !== "number") continue;
    if (row.anchor_start < 0 || row.anchor_end <= row.anchor_start) continue;

    const current = inlineNotesByBlock.get(row.block_id) ?? [];
    current.push({
      id: row.id,
      anchorStart: row.anchor_start,
      anchorEnd: row.anchor_end,
      kind: row.kind,
      content: row.content,
      createdAt: row.created_at,
    });
    inlineNotesByBlock.set(row.block_id, current);
  }

  const footnoteTextByNumber = new Map<number, string>();
  for (const row of (footnoteRows ?? []) as FootnoteQueryRow[]) {
    footnoteTextByNumber.set(row.number, row.text);
  }

  const footnoteNumbersByBlock = new Map<string, Set<number>>();
  for (const row of (footnoteAnchorRows ?? []) as FootnoteAnchorRow[]) {
    const current = footnoteNumbersByBlock.get(row.block_id) ?? new Set<number>();
    current.add(row.footnote_number);
    footnoteNumbersByBlock.set(row.block_id, current);
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

      const inlineNotes = (inlineNotesByBlock.get(row.id) ?? []).sort((a, b) => a.anchorStart - b.anchorStart);
      const footnoteSuggestions = [...(footnoteNumbersByBlock.get(row.id) ?? new Set<number>())]
        .sort((a, b) => a - b)
        .map((number) => ({ number, text: footnoteTextByNumber.get(number) ?? "" }));

      return {
        id: row.id,
        bookId: row.book_id,
        chapterId: row.chapter_id,
        chapterIndex: chapter.chapterIndex,
        chapterTitle: chapter.chapterTitle,
        blockIndex: row.block_index,
        originalText: row.original_text,
        translatedText,
        editedVariantId: latestNonRejectedVariant?.id ?? null,
        acceptedVariantId: acceptedVariant?.id ?? null,
        isAccepted: Boolean(acceptedVariant),
        hasAcceptableVariant,
        workflowStatus,
        inlineNotes,
        footnoteSuggestions,
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

export async function deleteEditedBlockVariant(args: {
  supabase: SupabaseClient;
  block: DashboardBlock;
}): Promise<void> {
  const { supabase, block } = args;
  if (!block.editedVariantId) return;

  const { error } = await supabase
    .from("variants")
    .delete()
    .eq("id", block.editedVariantId)
    .eq("block_id", block.id);

  if (error) throw new Error(errorMessage(error));
}
