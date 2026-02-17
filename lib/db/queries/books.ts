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

export type DashboardVariantOption = {
  id: string;
  text: string;
  status: VariantStatus;
  variantIndex: number;
  updatedAt: string;
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
  variants: DashboardVariantOption[];
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

export type EnsureUserBookContextResult = {
  resolvedBookId: string;
  forked: boolean;
  sourceBookId: string | null;
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

function hasMissingColumnError(error: { message?: string } | null, columnName: string): boolean {
  const normalized = `${error?.message ?? ""}`.toLowerCase();
  const needle = columnName.trim().toLowerCase();
  if (!needle) return false;
  return normalized.includes("column") && normalized.includes(needle);
}

function hasMissingRelationError(error: { message?: string } | null, relationName: string): boolean {
  const normalized = `${error?.message ?? ""}`.toLowerCase();
  const needle = relationName.trim().toLowerCase();
  if (!needle) return false;
  return normalized.includes("relation") && normalized.includes(needle);
}

type ChapterCloneRow = {
  id: string;
  chapter_index: number;
  title: string | null;
};

type BlockCloneRow = {
  id: string;
  chapter_id: string;
  block_index: number;
  original_text: string;
  original_hash: string;
};

type FootnoteCloneRow = {
  number: number;
  text: string;
  source_chapter_id: string;
  source_block_id: string;
};

type FootnoteAnchorCloneRow = {
  chapter_id: string;
  block_id: string;
  footnote_number: number;
  start_offset: number;
  end_offset: number;
};

async function cloneBookStructure(args: {
  supabase: SupabaseClient;
  sourceBookId: string;
  forkBookId: string;
  userId: string;
}): Promise<void> {
  const { supabase, sourceBookId, forkBookId, userId } = args;
  const chaptersTable = supabase.from("chapters") as any;
  const blocksTable = supabase.from("blocks") as any;
  const footnotesTable = supabase.from("footnotes") as any;
  const anchorsTable = supabase.from("footnote_anchors") as any;

  const { data: sourceChapterRows, error: sourceChapterError } = await chaptersTable
    .select("id,chapter_index,title")
    .eq("book_id", sourceBookId)
    .order("chapter_index", { ascending: true });
  if (sourceChapterError) throw new Error(errorMessage(sourceChapterError));

  const chapterIdMap = new Map<string, string>();
  for (const chapter of (sourceChapterRows ?? []) as ChapterCloneRow[]) {
    const { data: insertedChapter, error: insertChapterError } = await chaptersTable
      .insert({
        owner_id: userId,
        book_id: forkBookId,
        chapter_index: chapter.chapter_index,
        title: chapter.title ?? null,
      })
      .select("id")
      .single();
    if (insertChapterError || !insertedChapter?.id) {
      throw new Error(errorMessage(insertChapterError));
    }
    chapterIdMap.set(chapter.id, insertedChapter.id as string);
  }

  const { data: sourceBlockRows, error: sourceBlockError } = await blocksTable
    .select("id,chapter_id,block_index,original_text,original_hash")
    .eq("book_id", sourceBookId)
    .order("block_index", { ascending: true });
  if (sourceBlockError) throw new Error(errorMessage(sourceBlockError));

  const blockIdMap = new Map<string, string>();
  for (const block of (sourceBlockRows ?? []) as BlockCloneRow[]) {
    const mappedChapterId = chapterIdMap.get(block.chapter_id);
    if (!mappedChapterId) continue;

    const { data: insertedBlock, error: insertBlockError } = await blocksTable
      .insert({
        owner_id: userId,
        book_id: forkBookId,
        chapter_id: mappedChapterId,
        block_index: block.block_index,
        original_text: block.original_text,
        original_hash: block.original_hash,
      })
      .select("id")
      .single();
    if (insertBlockError || !insertedBlock?.id) {
      throw new Error(errorMessage(insertBlockError));
    }
    blockIdMap.set(block.id, insertedBlock.id as string);
  }

  const { data: sourceFootnotes, error: sourceFootnotesError } = await footnotesTable
    .select("number,text,source_chapter_id,source_block_id")
    .eq("book_id", sourceBookId)
    .order("number", { ascending: true });
  if (sourceFootnotesError) throw new Error(errorMessage(sourceFootnotesError));

  for (const footnote of (sourceFootnotes ?? []) as FootnoteCloneRow[]) {
    const mappedSourceChapterId = chapterIdMap.get(footnote.source_chapter_id);
    const mappedSourceBlockId = blockIdMap.get(footnote.source_block_id);
    if (!mappedSourceChapterId || !mappedSourceBlockId) continue;

    const { error: footnoteInsertError } = await footnotesTable.insert({
      owner_id: userId,
      book_id: forkBookId,
      number: footnote.number,
      text: footnote.text,
      source_chapter_id: mappedSourceChapterId,
      source_block_id: mappedSourceBlockId,
    });
    if (footnoteInsertError) throw new Error(errorMessage(footnoteInsertError));
  }

  const { data: sourceAnchors, error: sourceAnchorsError } = await anchorsTable
    .select("chapter_id,block_id,footnote_number,start_offset,end_offset")
    .eq("book_id", sourceBookId);
  if (sourceAnchorsError) throw new Error(errorMessage(sourceAnchorsError));

  for (const anchor of (sourceAnchors ?? []) as FootnoteAnchorCloneRow[]) {
    const mappedChapterId = chapterIdMap.get(anchor.chapter_id);
    const mappedBlockId = blockIdMap.get(anchor.block_id);
    if (!mappedChapterId || !mappedBlockId) continue;

    const { error: anchorInsertError } = await anchorsTable.insert({
      owner_id: userId,
      book_id: forkBookId,
      chapter_id: mappedChapterId,
      block_id: mappedBlockId,
      footnote_number: anchor.footnote_number,
      start_offset: anchor.start_offset,
      end_offset: anchor.end_offset,
    });
    if (anchorInsertError) throw new Error(errorMessage(anchorInsertError));
  }
}

/**
 * Resolves the effective book id for a user's editor session.
 *
 * Behavior:
 * - if the requested book belongs to the user, return it unchanged;
 * - if it is a public base book from another user, create/reuse a fork
 *   so the user edits only their own copy.
 */
export async function ensureUserBookContext(args: {
  supabase: SupabaseClient;
  userId: string;
  requestedBookId: string;
}): Promise<EnsureUserBookContextResult> {
  const { supabase, userId, requestedBookId } = args;
  const booksTable = supabase.from("books") as any;

  const { data: sourceBook, error: sourceBookError } = await booksTable.select("*").eq("id", requestedBookId).single();
  if (sourceBookError || !sourceBook?.id) {
    throw new Error(errorMessage(sourceBookError));
  }

  if ((sourceBook.user_id as string) === userId) {
    return {
      resolvedBookId: requestedBookId,
      forked: false,
      sourceBookId: (sourceBook.source_book_id as string | null | undefined) ?? null,
    };
  }

  if (sourceBook.is_public !== true) {
    throw new Error("Ehhez a könyvhöz nincs hozzáférés.");
  }
  if (sourceBook.status !== "ready") {
    throw new Error("A publikus alapkönyv még nincs kész állapotban.");
  }

  let existingForkId: string | null = null;
  const existingForkResult = await booksTable
    .select("id")
    .eq("user_id", userId)
    .eq("source_book_id", requestedBookId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (!existingForkResult.error) {
    existingForkId = (existingForkResult.data as Array<{ id: string }> | null)?.[0]?.id ?? null;
  } else if (!hasMissingColumnError(existingForkResult.error, "source_book_id")) {
    throw new Error(errorMessage(existingForkResult.error));
  }

  if (existingForkId) {
    return { resolvedBookId: existingForkId, forked: false, sourceBookId: requestedBookId };
  }

  const forkBasePayload = {
    owner_id: userId,
    user_id: userId,
    title: sourceBook.title,
    author: sourceBook.author ?? null,
    description: sourceBook.description ?? null,
    source_format: sourceBook.source_format,
    source_filename: sourceBook.source_filename,
    source_mime: sourceBook.source_mime,
    source_size_bytes: sourceBook.source_size_bytes,
    source_storage_path: sourceBook.source_storage_path,
    status: "ready",
    error_message: null,
    is_public: false,
    source_book_id: requestedBookId,
  };

  let insertForkResult = await booksTable.insert(forkBasePayload).select("id").single();
  if (insertForkResult.error && hasMissingColumnError(insertForkResult.error, "source_book_id")) {
    const fallbackPayload = { ...forkBasePayload };
    delete (fallbackPayload as Record<string, unknown>).source_book_id;
    insertForkResult = await booksTable.insert(fallbackPayload).select("id").single();
  }
  if (insertForkResult.error && hasMissingColumnError(insertForkResult.error, "is_public")) {
    const fallbackPayload = { ...forkBasePayload };
    delete (fallbackPayload as Record<string, unknown>).is_public;
    delete (fallbackPayload as Record<string, unknown>).source_book_id;
    insertForkResult = await booksTable.insert(fallbackPayload).select("id").single();
  }

  const forkBookId = (insertForkResult.data as { id?: string } | null)?.id ?? null;
  if (insertForkResult.error || !forkBookId) {
    throw new Error(errorMessage(insertForkResult.error));
  }

  try {
    await cloneBookStructure({ supabase, sourceBookId: requestedBookId, forkBookId, userId });
  } catch (error) {
    await booksTable.delete().eq("id", forkBookId).eq("user_id", userId);
    throw error;
  }

  return {
    resolvedBookId: forkBookId,
    forked: true,
    sourceBookId: requestedBookId,
  };
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
  viewerUserId?: string,
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

  let isPersonalFavorite = false;
  if (viewerUserId) {
    const favoritesTable = supabase.from("book_favorites") as any;
    const { data: favoriteRows, error: favoriteError } = await favoritesTable
      .select("book_id")
      .eq("user_id", viewerUserId)
      .eq("book_id", bookId)
      .limit(1);

    if (favoriteError && !hasMissingRelationError(favoriteError, "book_favorites")) {
      throw new Error(errorMessage(favoriteError));
    }
    isPersonalFavorite = ((favoriteRows as Array<{ book_id: string }> | null) ?? []).length > 0;
  }

  const latestAcceptedByBlock = new Map<string, VariantQueryRow>();
  const latestVariantByBlock = new Map<string, VariantQueryRow>();
  const latestNonRejectedByBlock = new Map<string, VariantQueryRow>();
  const variantsByBlock = new Map<string, DashboardVariantOption[]>();
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
    const text = row.text?.trim();
    if (row.status === "rejected" || !text) continue;
    const bucket = variantsByBlock.get(row.block_id);
    const variantOption = {
      id: row.id,
      text,
      status: row.status,
      variantIndex: row.variant_index,
      updatedAt: row.updated_at,
    } satisfies DashboardVariantOption;
    if (bucket) {
      bucket.push(variantOption);
    } else {
      variantsByBlock.set(row.block_id, [variantOption]);
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
        variants: (variantsByBlock.get(row.id) ?? []).sort((a, b) => a.variantIndex - b.variantIndex),
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

  const isGlobalFavorite = (bookData as { is_favorite?: boolean } | null)?.is_favorite === true;
  const mergedBook = {
    ...(bookData as BookRow),
    is_personal_favorite: isPersonalFavorite,
    is_global_favorite: isGlobalFavorite,
    is_favorite: isGlobalFavorite || isPersonalFavorite,
  } satisfies BookRow;

  return {
    book: mergedBook,
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
