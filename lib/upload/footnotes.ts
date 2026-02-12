import { createHash } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupabaseServerClient = ReturnType<typeof getSupabaseServerClient>;

type ChapterRow = {
  id: string;
  chapter_index: number;
  title: string | null;
};

type BlockRow = {
  id: string;
  book_id: string;
  chapter_id: string;
  block_index: number;
  original_text: string;
};

type FootnoteUpsertRow = {
  owner_id: string;
  book_id: string;
  number: number;
  text: string;
  source_chapter_id: string;
  source_block_id: string;
};

type AnchorRow = {
  owner_id: string;
  book_id: string;
  chapter_id: string;
  block_id: string;
  footnote_number: number;
  start_offset: number;
  end_offset: number;
};

export async function extractAndAnchorFootnotes(
  supabase: SupabaseServerClient,
  params: { userId: string; bookId: string }
): Promise<void> {
  const { bookId, userId } = params;

  const chapters = await loadChapters(supabase, bookId);
  if (chapters.length === 0) return;

  const blocks = await loadBlocks(supabase, bookId);
  if (blocks.length === 0) return;

  const blocksByChapter = new Map<string, BlockRow[]>();
  for (const block of blocks) {
    const arr = blocksByChapter.get(block.chapter_id) ?? [];
    arr.push(block);
    blocksByChapter.set(block.chapter_id, arr);
  }

  const notesChapter = detectNotesChapter(chapters, blocksByChapter);
  if (!notesChapter) return;

  const notesBlocks = blocksByChapter.get(notesChapter.id) ?? [];
  const footnotes = collectFootnotes(notesBlocks, userId);
  const availableFootnoteNumbers = new Set(footnotes.map((row) => row.number));
  if (footnotes.length > 0) {
    const { error: footnoteErr } = await supabase
      .from("footnotes")
      .upsert(footnotes, { onConflict: "book_id,number" });
    if (footnoteErr) {
      throw new Error(`Nem sikerult menteni a labjegyzeteket: ${footnoteErr.message}`);
    }
  }

  for (const block of blocks) {
    if (block.chapter_id === notesChapter.id) continue;

    const replaced = replaceFootnoteMarkers(block.original_text, availableFootnoteNumbers);
    if (replaced.anchors.length === 0) continue;

    const nextHash = createHash("sha256").update(replaced.text).digest("hex");
    const { error: updateErr } = await supabase
      .from("blocks")
      .update({
        original_text: replaced.text,
        original_hash: nextHash,
      })
      .eq("id", block.id);
    if (updateErr) {
      throw new Error(`Nem sikerult frissiteni a blokkot: ${updateErr.message}`);
    }

    const anchors: AnchorRow[] = replaced.anchors.map((anchor) => ({
      owner_id: userId,
      book_id: block.book_id,
      chapter_id: block.chapter_id,
      block_id: block.id,
      footnote_number: anchor.number,
      start_offset: anchor.start_offset,
      end_offset: anchor.end_offset,
    }));

    const { error: anchorErr } = await supabase
      .from("footnote_anchors")
      .upsert(anchors, {
        onConflict: "block_id,footnote_number,start_offset,end_offset",
      });
    if (anchorErr) {
      throw new Error(`Nem sikerult menteni a labjegyzet horgonyokat: ${anchorErr.message}`);
    }
  }
}

async function loadChapters(
  supabase: SupabaseServerClient,
  bookId: string
): Promise<ChapterRow[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, chapter_index, title")
    .eq("book_id", bookId)
    .order("chapter_index", { ascending: true });

  if (error) {
    throw new Error(`Nem sikerult lekerdezni a fejezeteket: ${error.message}`);
  }

  return (data ?? []) as ChapterRow[];
}

async function loadBlocks(supabase: SupabaseServerClient, bookId: string): Promise<BlockRow[]> {
  const { data, error } = await supabase
    .from("blocks")
    .select("id, book_id, chapter_id, block_index, original_text")
    .eq("book_id", bookId)
    .order("block_index", { ascending: true });

  if (error) {
    throw new Error(`Nem sikerult lekerdezni a blokkokat: ${error.message}`);
  }

  return (data ?? []) as BlockRow[];
}

function detectNotesChapter(
  chapters: ChapterRow[],
  blocksByChapter: Map<string, BlockRow[]>
): ChapterRow | null {
  const titleMatch = chapters.find((chapter) =>
    (chapter.title ?? "").toLocaleLowerCase("hu-HU").includes("jegyzet")
  );
  if (titleMatch) return titleMatch;

  let best: { chapter: ChapterRow; starts: number; markerCount: number; blocks: number } | null =
    null;

  for (const chapter of chapters) {
    const blocks = blocksByChapter.get(chapter.id) ?? [];
    if (blocks.length === 0) continue;

    let starts = 0;
    let markerCount = 0;
    for (const block of blocks) {
      if (/^\s*\[\d+\]/.test(block.original_text)) starts += 1;
      markerCount += (block.original_text.match(/\[\d+\]/g) ?? []).length;
    }

    if (!best || starts > best.starts || (starts === best.starts && markerCount > best.markerCount)) {
      best = { chapter, starts, markerCount, blocks: blocks.length };
    }
  }

  if (!best) return null;

  const startsThreshold = Math.ceil(best.blocks * 0.6);
  const heuristicTriggered = best.starts >= startsThreshold && best.markerCount >= 5;
  if (!heuristicTriggered) return null;

  const chapter13 = chapters.find((chapter) => chapter.chapter_index === 13);
  return chapter13 ?? best.chapter;
}

function collectFootnotes(blocks: BlockRow[], userId: string): FootnoteUpsertRow[] {
  const merged = new Map<number, FootnoteUpsertRow>();
  const markerRe = /\[(\d+)\]/g;

  for (const block of blocks) {
    const matches = Array.from(block.original_text.matchAll(markerRe));
    if (matches.length === 0) continue;

    for (let i = 0; i < matches.length; i += 1) {
      const current = matches[i];
      const number = Number(current[1]);
      if (!Number.isInteger(number)) continue;

      const markerStart = current.index ?? 0;
      const markerEnd = markerStart + current[0].length;
      const nextMarkerStart =
        i + 1 < matches.length ? (matches[i + 1].index ?? block.original_text.length) : block.original_text.length;
      const text = block.original_text.slice(markerEnd, nextMarkerStart).trim();
      if (!text) continue;

      const candidate: FootnoteUpsertRow = {
        owner_id: userId,
        book_id: block.book_id,
        number,
        text,
        source_chapter_id: block.chapter_id,
        source_block_id: block.id,
      };

      const existing = merged.get(number);
      if (!existing || candidate.text.length > existing.text.length) {
        merged.set(number, candidate);
      }
    }
  }

  return Array.from(merged.values());
}

function replaceFootnoteMarkers(
  text: string,
  availableFootnoteNumbers: Set<number>
): {
  text: string;
  anchors: Array<{ number: number; start_offset: number; end_offset: number }>;
} {
  const markerRe = /\[(\d+)\]/g;
  let cursor = 0;
  let next = "";
  const anchors: Array<{ number: number; start_offset: number; end_offset: number }> = [];

  for (const match of text.matchAll(markerRe)) {
    const index = match.index ?? 0;
    const number = Number(match[1]);
    if (!Number.isInteger(number)) continue;

    next += text.slice(cursor, index);
    if (!availableFootnoteNumbers.has(number)) {
      next += match[0];
      cursor = index + match[0].length;
      continue;
    }

    const token = `[[fn:${number}]]`;
    const startOffset = next.length;
    next += token;
    anchors.push({
      number,
      start_offset: startOffset,
      end_offset: next.length,
    });
    cursor = index + match[0].length;
  }

  if (anchors.length === 0) {
    return { text, anchors: [] };
  }

  next += text.slice(cursor);
  return { text: next, anchors };
}
