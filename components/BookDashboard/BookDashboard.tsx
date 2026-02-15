"use client";

import {
  type CSSProperties,
  Fragment,
  type FocusEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ensureAnonIdentity } from "@/lib/auth/anon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  acceptBlockVariant,
  deleteEditedBlockVariant,
  fetchBookDashboardData,
  type BookDashboardData,
  type DashboardBlock,
  type DashboardInlineNote,
} from "@/lib/db/queries/books";
import type { LlmResponse } from "@/lib/llm/types";
import type {
  DashboardActivePanel,
  DashboardPanelMode,
  DashboardViewState,
} from "@/components/BookDashboard/types";
import { BookCoverIcon } from "@/components/BookCoverIcon";
import { ShellTopBar } from "@/components/ShellTopBar";
import { Icon } from "@/src/ui/icons/Icon";
import styles from "@/components/BookDashboard/BookDashboard.module.css";

type LoadState =
  | { status: "booting" }
  | { status: "error"; message: string }
  | { status: "ready"; userId: string; data: BookDashboardData };

type BookEditForm = {
  title: string;
  author: string;
  year: string;
  description: string;
  icon: string;
};

type GenerateErrorState = {
  blockId: string;
  message: string;
};
type ManualEditErrorState = {
  blockId: string;
  message: string;
};
type NoteErrorState = {
  blockId: string;
  message: string;
};
type BlockSelectionRange = {
  start: number;
  end: number;
  text: string;
};
type SuggestedRange = {
  anchorStart: number;
  anchorEnd: number;
  markerStart: number;
  markerEnd: number;
  number: number;
  content: string;
};
type DashboardDesktopLayout = "single" | "split";
type ChapterGroup = {
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  blocks: DashboardBlock[];
};
type ChapterRow = {
  id: string;
  chapter_index: number;
};
type BlockIndexRow = {
  id: string;
  block_index: number;
};
type MobileDashboardPage = "original" | "translated" | "toc" | "notes" | "bookmarks";

/**
 * Store-like UI state for this dashboard.
 *
 * - completion: server-derived from accepted/total blocks
 * - viewState: selected dashboard mode ("workbench" or "reader")
 * - panelMode: mobile presentation model ("single" or "stacked")
 */
type DashboardViewStore = {
  viewState: DashboardViewState;
  panelMode: DashboardPanelMode;
  desktopLayout: DashboardDesktopLayout;
  activePanel: DashboardActivePanel;
  syncScroll: boolean;
};

type OnboardingRoute = "/book/[id]";
type OnboardingPlacement = "top" | "bottom" | "left" | "right" | "center";
type OnboardingCompleteOn =
  | "next"
  | "mode_toggled"
  | "generate_success"
  | "accept_success"
  | "note_requested"
  | "note_decided"
  | "chapter_saved";

type OnboardingStep = {
  id: string;
  route: OnboardingRoute;
  anchorId: string;
  title: string;
  body: string;
  placement: OnboardingPlacement;
  completeOn?: OnboardingCompleteOn;
  skippable: boolean;
};

type OnboardingPopupPosition = {
  left: number;
  top: number;
  maxWidth: number;
};

type OnboardingStepCompletionReason = "next" | "skip" | OnboardingCompleteOn;
type OnboardingTelemetryEventName =
  | "onboarding_started"
  | "onboarding_step_shown"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "onboarding_skipped";

type OnboardingProgressPayload = {
  onboardingVersion: number;
  completedStepIds: string[];
};

type DashboardBookmarkPayload = {
  items: DashboardBookmarkEntry[];
};

type DashboardBookmarkKind = "progress" | "important";

type DashboardBookmarkEntry = {
  id: string;
  markerId: string;
  colorKey: string;
  name: string;
  kind: DashboardBookmarkKind;
};

type BookmarkColorOption = {
  key: string;
  label: string;
  color: string;
};

const BOOK_EDITORIAL_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "step_dashboard_modes",
    route: "/book/[id]",
    anchorId: "onb-mode-controls",
    title: "Workbench es Reader",
    body: "A Workbench szerkeszteshez valo, a Reader csak teljesen elfogadott allapotban erheto el.",
    placement: "left",
    completeOn: "mode_toggled",
    skippable: true,
  },
  {
    id: "step_progress_meaning",
    route: "/book/[id]",
    anchorId: "onb-progress",
    title: "Completion jelentes",
    body: "A completion mutatja, hany blokk van elfogadva, es mikor nyilik meg a Reader.",
    placement: "top",
    completeOn: "next",
    skippable: true,
  },
  {
    id: "step_block_workflow",
    route: "/book/[id]",
    anchorId: "onb-block-actions",
    title: "Blokk munkafolyamat",
    body: "A folyamat: Generalas, atnezes, majd Elfogad.",
    placement: "left",
    completeOn: "next",
    skippable: true,
  },
  {
    id: "step_generate",
    route: "/book/[id]",
    anchorId: "onb-generate",
    title: "Generalas",
    body: "A Generalas uj szerkesztett valtozatot keszit az adott blokkhoz.",
    placement: "left",
    completeOn: "generate_success",
    skippable: true,
  },
  {
    id: "step_accept",
    route: "/book/[id]",
    anchorId: "onb-accept",
    title: "Elfogadas",
    body: "Az Elfogad gomb a megfelelo valtozatot rogzitett allapotba teszi.",
    placement: "left",
    completeOn: "accept_success",
    skippable: true,
  },
  {
    id: "step_note_request",
    route: "/book/[id]",
    anchorId: "onb-note-trigger",
    title: "Jegyzet kerese",
    body: "Kijelolt szovegreszre kerhetsz magyarazo jegyzetet.",
    placement: "top",
    completeOn: "note_requested",
    skippable: true,
  },
  {
    id: "step_note_decision",
    route: "/book/[id]",
    anchorId: "onb-note-suggestion",
    title: "Javaslat elfogadasa vagy elvetese",
    body: "A javaslatot elfogadhatod vagy elutasithatod a tooltipben.",
    placement: "top",
    completeOn: "note_decided",
    skippable: true,
  },
  {
    id: "step_chapter_edit",
    route: "/book/[id]",
    anchorId: "onb-chapter-header",
    title: "Fejezet cim szerkesztese",
    body: "A fejezetcim inline szerkesztheto es azonnal mentheto.",
    placement: "bottom",
    completeOn: "chapter_saved",
    skippable: true,
  },
  {
    id: "step_done",
    route: "/book/[id]",
    anchorId: "onb-replay",
    title: "Onboarding kesz",
    body: "Az onboarding barmikor ujraindithato az erre kijelolt gombbal.",
    placement: "left",
    completeOn: "next",
    skippable: false,
  },
];

const ONBOARDING_VERSION = 1;
const BOOKMARK_COLOR_OPTIONS: BookmarkColorOption[] = [
  { key: "amber", label: "Borostyan", color: "#F2B134" },
  { key: "rose", label: "Rose", color: "#E06C75" },
  { key: "vermilion", label: "Vermilion", color: "#D96C4A" },
  { key: "gold", label: "Arany", color: "#C79A2E" },
  { key: "olive", label: "Oliva", color: "#8A9A3A" },
  { key: "emerald", label: "Smaragd", color: "#2E8B57" },
  { key: "teal", label: "Teal", color: "#2D8C8A" },
  { key: "azure", label: "Azur", color: "#3A7BD5" },
  { key: "indigo", label: "Indigo", color: "#5865C3" },
  { key: "slate", label: "Pala", color: "#637381" },
];
const DEFAULT_BOOKMARK_COLOR_KEY = BOOKMARK_COLOR_OPTIONS[0].key;
const IMPORTANT_BOOKMARK_DEFAULT_COLOR_KEY = "rose";

function normalizeBookmarkColorKey(value: string | null | undefined): string {
  if (!value) return DEFAULT_BOOKMARK_COLOR_KEY;
  return BOOKMARK_COLOR_OPTIONS.some((option) => option.key === value) ? value : DEFAULT_BOOKMARK_COLOR_KEY;
}

function normalizeBookmarkKind(value: string | null | undefined): DashboardBookmarkKind {
  return value === "important" ? "important" : "progress";
}

function resolveLegacyBookmarkColorKey(legacyColor: string | null | undefined): string {
  if (!legacyColor) return DEFAULT_BOOKMARK_COLOR_KEY;
  const normalized = legacyColor.trim().toLowerCase();
  const byExact = BOOKMARK_COLOR_OPTIONS.find((option) => option.color.toLowerCase() === normalized);
  return byExact ? byExact.key : DEFAULT_BOOKMARK_COLOR_KEY;
}

function resolveCurrentOnboardingStep(args: {
  route: OnboardingRoute;
  completedStepIds: Set<string>;
  isAnchorAvailable: (anchorId: string) => boolean;
}): OnboardingStep | null {
  const { route, completedStepIds, isAnchorAvailable } = args;
  for (const step of BOOK_EDITORIAL_ONBOARDING_STEPS) {
    if (step.route !== route) continue;
    if (completedStepIds.has(step.id)) continue;
    if (!isAnchorAvailable(step.anchorId)) return null;
    return step;
  }
  return null;
}

function findOnboardingStepById(stepId: string | null): OnboardingStep | null {
  if (!stepId) return null;
  return BOOK_EDITORIAL_ONBOARDING_STEPS.find((step) => step.id === stepId) ?? null;
}

function findOnboardingStepIndex(stepId: string | null): number {
  if (!stepId) return -1;
  return BOOK_EDITORIAL_ONBOARDING_STEPS.findIndex((step) => step.id === stepId);
}

function onboardingProgressKey(args: { userId: string; bookId: string; route: OnboardingRoute }): string {
  const { userId, bookId, route } = args;
  return `novira:onboarding:${ONBOARDING_VERSION}:${route}:${userId}:${bookId}`;
}

function readOnboardingProgress(args: { userId: string; bookId: string; route: OnboardingRoute }): Set<string> {
  if (typeof window === "undefined") return new Set();
  const storageKey = onboardingProgressKey(args);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return new Set();

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingProgressPayload> | null;
    if (!parsed || parsed.onboardingVersion !== ONBOARDING_VERSION) {
      window.localStorage.removeItem(storageKey);
      return new Set();
    }
    if (!Array.isArray(parsed.completedStepIds)) return new Set();
    return new Set(parsed.completedStepIds.filter((value): value is string => typeof value === "string"));
  } catch {
    window.localStorage.removeItem(storageKey);
    return new Set();
  }
}

function writeOnboardingProgress(args: {
  userId: string;
  bookId: string;
  route: OnboardingRoute;
  completedStepIds: Set<string>;
}): void {
  if (typeof window === "undefined") return;
  const storageKey = onboardingProgressKey(args);
  const payload: OnboardingProgressPayload = {
    onboardingVersion: ONBOARDING_VERSION,
    completedStepIds: Array.from(args.completedStepIds),
  };
  window.localStorage.setItem(storageKey, JSON.stringify(payload));
}

function bookmarkStorageKey(args: { userId: string; bookId: string }): string {
  return `novira:bookmark:${args.userId}:${args.bookId}`;
}

function readDashboardBookmark(args: { userId: string; bookId: string }): DashboardBookmarkPayload {
  if (typeof window === "undefined") {
    return { items: [] };
  }

  const storageKey = bookmarkStorageKey(args);
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return { items: [] };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DashboardBookmarkPayload> | null;
    if (Array.isArray(parsed?.items)) {
      const items: DashboardBookmarkEntry[] = [];
      for (const row of parsed.items) {
        if (!row || typeof row !== "object") continue;
        const r = row as Partial<DashboardBookmarkEntry>;
        if (typeof r.id !== "string" || !r.id.trim()) continue;
        if (typeof r.markerId !== "string" || !r.markerId.trim()) continue;
        items.push({
          id: r.id,
          markerId: r.markerId,
          colorKey: normalizeBookmarkColorKey(r.colorKey),
          name: typeof r.name === "string" ? r.name : "",
          kind: normalizeBookmarkKind(r.kind),
        });
      }
      return { items };
    }

    const legacyMarkerId =
      typeof (parsed as { markerId?: unknown } | null)?.markerId === "string"
        ? ((parsed as { markerId: string }).markerId ?? null)
        : typeof (parsed as { blockId?: unknown } | null)?.blockId === "string"
          ? ((parsed as { blockId: string }).blockId ?? null)
          : null;
    if (!legacyMarkerId) return { items: [] };

    const parsedColorKey =
      typeof (parsed as { colorKey?: unknown } | null)?.colorKey === "string"
        ? ((parsed as { colorKey: string }).colorKey ?? null)
        : null;
    const legacyColor =
      typeof (parsed as { color?: unknown } | null)?.color === "string"
        ? ((parsed as { color: string }).color ?? null)
        : null;
    const colorKey = parsedColorKey ? normalizeBookmarkColorKey(parsedColorKey) : resolveLegacyBookmarkColorKey(legacyColor);
    const name = typeof (parsed as { name?: unknown } | null)?.name === "string" ? ((parsed as { name: string }).name ?? "") : "";

    return {
      items: [
        {
          id: `bm_${Date.now()}`,
          markerId: legacyMarkerId,
          colorKey,
          name,
          kind: "progress",
        },
      ],
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return { items: [] };
  }
}

function writeDashboardBookmark(args: { userId: string; bookId: string; bookmark: DashboardBookmarkPayload }): void {
  if (typeof window === "undefined") return;
  const storageKey = bookmarkStorageKey(args);
  window.localStorage.setItem(storageKey, JSON.stringify(args.bookmark));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function findVisibleOnboardingAnchor(anchorId: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const nodes = document.querySelectorAll<HTMLElement>(`[data-onboarding-id="${anchorId}"]`);
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return node;
    }
  }
  return null;
}

function resolveOnboardingPopupPosition(args: {
  anchorId: string;
  placement: OnboardingPlacement;
  allowCenterFallback?: boolean;
}): OnboardingPopupPosition | null {
  const { anchorId, placement, allowCenterFallback = false } = args;
  if (typeof window === "undefined") return null;
  const anchor = findVisibleOnboardingAnchor(anchorId);
  if (!anchor) {
    if (!allowCenterFallback) return null;
    return {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      maxWidth: Math.min(360, window.innerWidth - 24),
    };
  }

  const rect = anchor.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const edgePadding = 12;
  const gap = 10;
  const maxWidth = Math.min(360, viewportWidth - edgePadding * 2);
  const popupHeightEstimate = 170;

  let left = rect.left + rect.width / 2;
  let top = rect.top - gap;

  if (placement === "bottom") {
    top = rect.bottom + gap;
  } else if (placement === "left") {
    left = rect.left - gap;
    top = rect.top + rect.height / 2;
  } else if (placement === "right") {
    left = rect.right + gap;
    top = rect.top + rect.height / 2;
  } else if (placement === "center") {
    left = viewportWidth / 2;
    top = viewportHeight / 2;
  }

  const halfWidth = maxWidth / 2;
  left = clamp(left, edgePadding + halfWidth, viewportWidth - edgePadding - halfWidth);
  top = clamp(top, edgePadding + 8, viewportHeight - edgePadding - popupHeightEstimate);

  return { left, top, maxWidth };
}

const MOBILE_BREAKPOINT = 960;
const NOTE_PREVIEW_MAX_LENGTH = 180;

function completionPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

function normalizeIconSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeAuthor(author: string): string {
  return author
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const AUTHOR_SPINE_COLOR_RULES: Array<{ match: string[]; color: string }> = [
  { match: ["babits"], color: "#2F3A52" },
  { match: ["benedek"], color: "#7E9B91" },
  { match: ["nietzsche", "nietzche", "friederich", "friedrich"], color: "#5B4F3F" },
  { match: ["gardonyi"], color: "#6B7D6A" },
  { match: ["justh"], color: "#8A6F52" },
  { match: ["krudy"], color: "#2B3248" },
  { match: ["mikszath"], color: "#4A3E34" },
  { match: ["mora"], color: "#6F8E8A" },
  { match: ["moricz"], color: "#5A664A" },
  { match: ["tomorkeny", "tomotkeny"], color: "#6E775C" },
  { match: ["madach"], color: "#3E4A63" },
  { match: ["jokai"], color: "#1E3A5F" },
  { match: ["arany"], color: "#7A6A49" },
];

function authorSpineColor(author: string): string {
  const normalized = normalizeAuthor(author);
  for (const rule of AUTHOR_SPINE_COLOR_RULES) {
    if (rule.match.some((name) => normalized.includes(name))) {
      return rule.color;
    }
  }
  return "#4A5C78";
}

function toBookEditForm(data: BookDashboardData): BookEditForm {
  const publicationYear = data.book.publication_year;
  const legacyYear = data.book.year;

  return {
    title: data.book.title ?? "",
    author: data.book.author ?? "",
    year:
      publicationYear !== null && publicationYear !== undefined && String(publicationYear).trim() !== ""
        ? String(publicationYear)
        : legacyYear !== null && legacyYear !== undefined && String(legacyYear).trim() !== ""
          ? String(legacyYear)
          : "",
    description: data.book.description ?? "",
    icon: data.book.cover_slug ?? data.book.background_slug ?? "",
  };
}

function resolveTopbarIconSlug(book: BookDashboardData["book"]): string {
  const fromCover = normalizeIconSlug(book.cover_slug ?? "");
  if (fromCover) return fromCover;
  return normalizeIconSlug(book.title ?? "");
}

function mapGenerateError(status: number, fallbackMessage?: string): string {
  if (status === 429) {
    return "Tul sok generalasi keres erkezett. Varj egy kicsit, majd probald ujra.";
  }
  if (status === 400) {
    return "A blokk most nem generalhato. Ellenorizd a tartalmat, majd probald ujra.";
  }
  if (status >= 500) {
    return "A generalas most nem elerheto. Probald meg par perc mulva.";
  }
  if (fallbackMessage && fallbackMessage.trim()) {
    return fallbackMessage;
  }
  return "Sikertelen generalas.";
}

function mapNoteError(status: number, fallbackMessage?: string): string {
  if (status === 429) {
    return "Tul sok jegyzetkeres erkezett. Varj egy kicsit, majd probald ujra.";
  }
  if (status === 400) {
    return "A kijelolt reszlethez most nem kerheto jegyzet. Jelolj ki egy rovidebb szoveget.";
  }
  if (status >= 500) {
    return "A jegyzetgeneralas most nem elerheto. Probald meg par perc mulva.";
  }
  if (fallbackMessage && fallbackMessage.trim()) {
    return fallbackMessage;
  }
  return "Sikertelen jegyzetgeneralas.";
}

function mapSummaryError(status: number, fallbackMessage?: string): string {
  if (status === 429) {
    return "Tul sok leirasgeneralasi keres erkezett. Varj egy kicsit, majd probald ujra.";
  }
  if (status === 400) {
    return "A leiras most nem generalhato ehhez a konyvhoz.";
  }
  if (status >= 500) {
    return "A leirasgeneralas most nem elerheto. Probald meg par perc mulva.";
  }
  if (fallbackMessage && fallbackMessage.trim()) {
    return fallbackMessage;
  }
  return "Sikertelen leirasgeneralas.";
}

async function requestDraftGeneration(args: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  bookId: string;
  blockId: string;
}): Promise<void> {
  const { supabase, bookId, blockId } = args;
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionErr || !accessToken) {
    throw new Error(sessionErr?.message ?? "Nem talalhato ervenyes munkamenet.");
  }

  const response = await fetch("/api/llm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: "translate_block",
      bookId,
      blockId,
    }),
  });

  const payload = (await response.json().catch(() => null)) as LlmResponse | null;
  if (!response.ok || !payload?.ok) {
    const fallbackMessage = payload && !payload.ok ? payload.error.message : undefined;
    throw new Error(mapGenerateError(response.status, fallbackMessage));
  }
}

async function requestSelectionNote(args: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  bookId: string;
  blockId: string;
  selectedText: string;
}): Promise<string> {
  const { supabase, bookId, blockId, selectedText } = args;
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionErr || !accessToken) {
    throw new Error(sessionErr?.message ?? "Nem talalhato ervenyes munkamenet.");
  }

  const response = await fetch("/api/llm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: "generate_note",
      bookId,
      blockId,
      selectedText,
    }),
  });

  const payload = (await response.json().catch(() => null)) as LlmResponse | null;
  if (!response.ok || !payload?.ok || !("noteText" in payload)) {
    const fallbackMessage = payload && !payload.ok ? payload.error.message : undefined;
    throw new Error(mapNoteError(response.status, fallbackMessage));
  }
  return payload.noteText.trim();
}

async function requestBookSummary(args: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  bookId: string;
}): Promise<string> {
  const { supabase, bookId } = args;
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionErr || !accessToken) {
    throw new Error(sessionErr?.message ?? "Nem talalhato ervenyes munkamenet.");
  }

  const response = await fetch("/api/llm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: "generate_book_summary",
      bookId,
    }),
  });

  const payload = (await response.json().catch(() => null)) as LlmResponse | null;
  if (!response.ok || !payload?.ok || !("summaryText" in payload)) {
    const fallbackMessage = payload && !payload.ok ? payload.error.message : undefined;
    throw new Error(mapSummaryError(response.status, fallbackMessage));
  }
  return payload.summaryText.trim();
}

function getSelectionRangeWithin(container: HTMLElement): BlockSelectionRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;

  const selectedText = range.toString();
  if (!selectedText.trim()) return null;

  const before = range.cloneRange();
  before.selectNodeContents(container);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const end = start + selectedText.length;
  if (end <= start) return null;

  return { start, end, text: selectedText };
}

function stripLeadingFootnoteNumber(content: string, number: number): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  const escapedNumber = String(number).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const specificNumberPattern = new RegExp(
    `^(?:\\[\\s*${escapedNumber}\\s*\\]|${escapedNumber})[\\.)\\]:-]?\\s*`,
    "i",
  );
  const genericNumberPattern = /^(?:\[\s*\d+\s*\]|\d+)[\.)\]:-]?\s*/;

  const withoutSpecific = trimmed.replace(specificNumberPattern, "");
  const withoutGeneric = withoutSpecific.replace(genericNumberPattern, "");
  return withoutGeneric.trim();
}

function findSuggestedRanges(
  text: string,
  suggestions: DashboardBlock["footnoteSuggestions"],
  dismissedNumbers: Set<number>,
): SuggestedRange[] {
  if (suggestions.length === 0) return [];
  const byNumber = new Map<number, string>();
  for (const item of suggestions) {
    if (dismissedNumbers.has(item.number)) continue;
    byNumber.set(item.number, item.text);
  }
  if (byNumber.size === 0) return [];

  const ranges: SuggestedRange[] = [];
  const re = /\[\[fn:(\d+)\]\]/g;
  let match: RegExpExecArray | null = re.exec(text);
  while (match) {
    const rawNumber = Number(match[1]);
    if (Number.isFinite(rawNumber) && byNumber.has(rawNumber)) {
      const markerStart = match.index;
      const markerEnd = match.index + match[0].length;
      let anchorEnd = markerStart;
      let anchorStart = markerStart;

      // Prefer the immediate preceding word/phrase so suggestion points to real text, not only marker token.
      while (anchorStart > 0 && /\s/.test(text[anchorStart - 1])) {
        anchorStart -= 1;
      }
      while (anchorStart > 0 && !/\s/.test(text[anchorStart - 1])) {
        anchorStart -= 1;
      }
      if (anchorStart === anchorEnd) {
        anchorStart = markerStart;
        anchorEnd = markerEnd;
      }

      ranges.push({
        anchorStart,
        anchorEnd,
        markerStart,
        markerEnd,
        number: rawNumber,
        content: stripLeadingFootnoteNumber(byNumber.get(rawNumber) ?? "", rawNumber),
      });
    }
    match = re.exec(text);
  }
  return ranges;
}

function renderTextWithInlineNotes(args: {
  text: string;
  notes: DashboardInlineNote[];
  suggestions: SuggestedRange[];
  blockId: string;
  onApproveSuggestion: (args: {
    blockId: string;
    number: number;
    content: string;
    start: number;
    end: number;
  }) => void;
  onRejectSuggestion: (args: { blockId: string; number: number }) => void;
}): JSX.Element[] {
  const { text, notes, suggestions, blockId, onApproveSuggestion, onRejectSuggestion } = args;
  const sortedNotes = [...notes].sort((a, b) => a.anchorStart - b.anchorStart || a.anchorEnd - b.anchorEnd);
  const sortedSuggestions = [...suggestions].sort(
    (a, b) => a.anchorStart - b.anchorStart || a.markerStart - b.markerStart,
  );
  const suggestionDisplayIndexByMarkerStart = new Map<number, number>();
  sortedSuggestions.forEach((item, index) => {
    suggestionDisplayIndexByMarkerStart.set(item.markerStart, index + 1);
  });
  const nodes: JSX.Element[] = [];
  let cursor = 0;
  let noteIdx = 0;
  let suggestionIdx = 0;

  while (cursor < text.length) {
    const note = sortedNotes[noteIdx];
    const suggestion = sortedSuggestions[suggestionIdx];

    const nextNoteStart =
      note && note.anchorStart >= cursor && note.anchorEnd > note.anchorStart ? note.anchorStart : Number.POSITIVE_INFINITY;
    const nextSuggestionStart =
      suggestion && suggestion.anchorStart >= cursor && suggestion.markerEnd > suggestion.markerStart
        ? suggestion.anchorStart
        : Number.POSITIVE_INFINITY;

    const nextStart = Math.min(nextNoteStart, nextSuggestionStart);
    if (!Number.isFinite(nextStart)) break;

    if (nextStart > cursor) {
      nodes.push(<span key={`text-${cursor}`}>{text.slice(cursor, nextStart)}</span>);
      cursor = nextStart;
    }

    if (nextStart === nextNoteStart && note) {
      if (note.anchorStart < 0 || note.anchorEnd > text.length || note.anchorEnd <= note.anchorStart) {
        noteIdx += 1;
        continue;
      }
      nodes.push(
        <span key={`note-${note.id}`} className={styles.inlineNoteMark}>
          {text.slice(note.anchorStart, note.anchorEnd)}
          <span className={styles.inlineTooltip}>{note.content}</span>
        </span>,
      );
      cursor = note.anchorEnd;
      noteIdx += 1;
      while (suggestionIdx < sortedSuggestions.length && sortedSuggestions[suggestionIdx].markerStart < cursor) {
        suggestionIdx += 1;
      }
      continue;
    }

    if (nextStart === nextSuggestionStart && suggestion) {
      if (suggestion.anchorStart < cursor) {
        suggestionIdx += 1;
        continue;
      }
      if (suggestion.anchorStart > cursor) {
        nodes.push(<span key={`pre-sugg-${cursor}`}>{text.slice(cursor, suggestion.anchorStart)}</span>);
      }
      const displayIndex =
        suggestionDisplayIndexByMarkerStart.get(suggestion.markerStart) ?? suggestionIdx + 1;
      nodes.push(
        <span
          key={`sugg-${blockId}-${suggestion.markerStart}-${suggestion.number}`}
          className={styles.suggestedNoteMark}
        >
          {text.slice(suggestion.anchorStart, suggestion.anchorEnd)}
          <sup className={styles.suggestedMarkerTag}>{displayIndex}</sup>
          <span className={styles.inlineTooltip}>
            <span>{suggestion.content || "Automatikus jegyzetjavaslat."}</span>
            <span className={styles.suggestionActions} data-onboarding-id="onb-note-suggestion">
              <button
                type="button"
                className={styles.suggestionActionButton}
                onClick={() =>
                  onApproveSuggestion({
                    blockId,
                    number: suggestion.number,
                    content: suggestion.content,
                    start: suggestion.anchorStart,
                    end: suggestion.anchorEnd,
                  })
                }
              >
                âś“
              </button>
              <button
                type="button"
                className={styles.suggestionActionButton}
                onClick={() => onRejectSuggestion({ blockId, number: suggestion.number })}
              >
                X
              </button>
            </span>
          </span>
        </span>,
      );
      cursor = suggestion.markerEnd;
      suggestionIdx += 1;
    }
  }

  if (cursor < text.length) {
    nodes.push(<span key={`tail-${cursor}`}>{text.slice(cursor)}</span>);
  }

  return nodes;
}

function groupBlocksByChapter(blocks: DashboardBlock[]): ChapterGroup[] {
  const groups: ChapterGroup[] = [];
  for (const block of blocks) {
    const previous = groups.at(-1);
    if (!previous || previous.chapterId !== block.chapterId) {
      groups.push({
        chapterId: block.chapterId,
        chapterIndex: block.chapterIndex,
        chapterTitle: block.chapterTitle?.trim() || "Cim nelkul",
        blocks: [block],
      });
      continue;
    }
    previous.blocks.push(block);
  }
  return groups;
}

function actionToneColor(tone: "generate" | "accept" | "delete"): string {
  if (tone === "accept") return "#2B7A44";
  if (tone === "delete") return "#AA3A32";
  return "#3969A8";
}

function blockTone(args: { block: DashboardBlock; hasError: boolean }): "generate" | "accept" | "delete" {
  const { block, hasError } = args;
  if (hasError || block.workflowStatus === "rejected") return "delete";
  if (block.isAccepted) return "accept";
  return "generate";
}

function ActionIcon({ type }: { type: "generate" | "accept" | "delete" | "edit" | "merge" }) {
  return <Icon name={type} />;
}

function ToolIcon({
  type,
}: {
  type:
    | "single"
    | "split"
    | "workbench"
    | "reader"
    | "admin"
    | "sync"
    | "back"
    | "swap"
    | "onboarding"
    | "bookmark";
}) {
  return <Icon name={type} />;
}

function BlockControls({
  block,
  textMode,
  acceptInFlight,
  generateInFlight,
  deleteInFlight,
  generateError,
  onAccept,
  onGenerate,
  onDelete,
  onStartManualEdit,
  onRejectToOriginal,
  onSetBookmarkBefore,
  allowDelete,
  mobileExpanded,
  hasProgressBookmarkAtThisBlock,
  importantBookmarkCountAtThisBlock,
}: {
  block: DashboardBlock;
  textMode: DashboardActivePanel;
  acceptInFlight: boolean;
  generateInFlight: boolean;
  deleteInFlight: boolean;
  generateError: string | null;
  onAccept: (block: DashboardBlock) => void;
  onGenerate: (block: DashboardBlock) => void;
  onDelete: (block: DashboardBlock) => void;
  onStartManualEdit: (block: DashboardBlock) => void;
  onRejectToOriginal: (block: DashboardBlock) => void;
  onSetBookmarkBefore: (block: DashboardBlock, kind: DashboardBookmarkKind) => void;
  allowDelete: boolean;
  mobileExpanded: boolean;
  hasProgressBookmarkAtThisBlock: boolean;
  importantBookmarkCountAtThisBlock: number;
}) {
  const canAccept = block.hasAcceptableVariant && !block.isAccepted;
  const translatedTrim = block.translatedText?.trim() ?? "";
  const hasGeneratedContent = translatedTrim.length > 0 && translatedTrim !== block.originalText.trim();
  const showAcceptAction = textMode === "translated" && hasGeneratedContent;
  const showRejectToOriginal = textMode === "translated" && hasGeneratedContent && !block.isAccepted;

  return (
    <div
      className={styles.blockControls}
      role="group"
      aria-label="Blokk muveletek"
      data-onboarding-id="onb-block-actions"
    >
      {textMode === "translated" ? (
        <>
          {showAcceptAction ? (
            <button
              className={styles.actionIconButton}
              type="button"
              onClick={() => onAccept(block)}
              disabled={!canAccept || acceptInFlight || generateInFlight || deleteInFlight}
              data-tone="accept"
              data-mobile-expanded={mobileExpanded ? "true" : "false"}
              data-onboarding-id="onb-accept"
            >
              <span>{block.isAccepted ? "Elfogadva" : acceptInFlight ? "Mentese..." : "Elfogad"}</span>
              <ActionIcon type="accept" />
            </button>
          ) : null}
          {showRejectToOriginal ? (
            <button
              className={styles.actionIconButton}
              type="button"
              onClick={() => onRejectToOriginal(block)}
              disabled={acceptInFlight || generateInFlight || deleteInFlight}
              data-tone="delete"
              data-mobile-expanded={mobileExpanded ? "true" : "false"}
              aria-label="Elutasitas"
              title="Elutasitas"
            >
              <span>Elutasitas</span>
              X
            </button>
          ) : null}
          <button
            className={styles.actionIconButton}
            type="button"
            onClick={() => onGenerate(block)}
            disabled={generateInFlight || acceptInFlight || deleteInFlight}
            data-tone="generate"
            data-mobile-expanded={mobileExpanded ? "true" : "false"}
            data-onboarding-id="onb-generate"
          >
            <span>{generateInFlight ? "Generalas..." : "Generalas"}</span>
            <ActionIcon type="generate" />
          </button>
          <button
            className={styles.actionIconButton}
            type="button"
            onClick={() => onStartManualEdit(block)}
            disabled={generateInFlight || acceptInFlight || deleteInFlight}
            data-tone="generate"
            data-mobile-expanded={mobileExpanded ? "true" : "false"}
          >
            <span>Kezi javitas</span>
            <ActionIcon type="edit" />
          </button>
          <button
            className={styles.actionIconButton}
            type="button"
            onClick={() => onSetBookmarkBefore(block, "progress")}
            disabled={generateInFlight || acceptInFlight || deleteInFlight}
            data-tone="bookmark"
            data-mobile-expanded={mobileExpanded ? "true" : "false"}
          >
            <span>{hasProgressBookmarkAtThisBlock ? "Haladas itt" : "Haladas jelzo"}</span>
            <Icon name="bookmark" />
          </button>
          <button
            className={styles.actionIconButton}
            type="button"
            onClick={() => onSetBookmarkBefore(block, "important")}
            disabled={generateInFlight || acceptInFlight || deleteInFlight}
            data-tone="bookmark-important"
            data-mobile-expanded={mobileExpanded ? "true" : "false"}
          >
            <span>{importantBookmarkCountAtThisBlock > 0 ? "Fontos +" : "Fontos jelzes"}</span>
            <Icon name="bookmark" />
          </button>
        </>
      ) : null}
      {allowDelete ? (
        <button
          className={styles.actionIconButton}
          type="button"
          onClick={() => onDelete(block)}
          disabled={deleteInFlight || acceptInFlight || generateInFlight}
          data-tone="delete"
          data-mobile-expanded={mobileExpanded ? "true" : "false"}
        >
          <span>
            {deleteInFlight
              ? "Torles..."
              : block.editedVariantId
                ? "Visszaallitas / torles"
                : "Blokk torlese"}
          </span>
          <ActionIcon type="delete" />
        </button>
      ) : null}
      {generateError ? <div className={styles.blockError}>{generateError}</div> : null}
    </div>
  );
}

function mergePairKey(leftBlockId: string, rightBlockId: string): string {
  return `${leftBlockId}::${rightBlockId}`;
}

function bookmarkBeforeKey(block: DashboardBlock): string {
  return `before:${block.chapterId}:${block.id}`;
}

function parseBookmarkBeforeKey(markerId: string): { chapterId: string; blockId: string } | null {
  const parts = markerId.split(":");
  if (parts.length !== 3 || parts[0] !== "before") return null;
  return {
    chapterId: parts[1],
    blockId: parts[2],
  };
}

function BlockMergeHandle({
  leftBlock,
  rightBlock,
  mergeInFlight,
  disabled,
  onMerge,
}: {
  leftBlock: DashboardBlock;
  rightBlock: DashboardBlock;
  mergeInFlight: boolean;
  disabled: boolean;
  onMerge: (leftBlock: DashboardBlock, rightBlock: DashboardBlock) => void;
}) {
  return (
    <div className={styles.blockMergeSlot}>
      <button
        className={styles.blockMergeButton}
        type="button"
        onClick={() => onMerge(leftBlock, rightBlock)}
        disabled={disabled || mergeInFlight}
        aria-label={`Blokkok osszevonasa: ${leftBlock.blockIndex}. es ${rightBlock.blockIndex}. blokk`}
      >
        <ActionIcon type="merge" />
        <span className={styles.blockMergeLabel}>
          {mergeInFlight ? "Osszevonas..." : "Blokkok osszevonasa"}
        </span>
      </button>
    </div>
  );
}

function BookmarkMarkerStripe({
  markerId,
  entries,
  bookmarkColorByKey,
}: {
  markerId: string;
  entries: DashboardBookmarkEntry[];
  bookmarkColorByKey: Record<string, string>;
}) {
  return (
    <div
      className={styles.bookmarkGapSlot}
      data-bookmarked="true"
      data-bookmark-marker-id={markerId}
      aria-hidden="true"
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={styles.bookmarkGapEntry}
          style={{ "--bookmark-color": bookmarkColorByKey[entry.colorKey] ?? BOOKMARK_COLOR_OPTIONS[0].color } as CSSProperties}
        >
          <span className={styles.bookmarkGapLine} />
          {entry.name.trim() ? <span className={styles.bookmarkGapLabel}>{entry.name}</span> : null}
        </div>
      ))}
    </div>
  );
}

function ChapterHeader({
  group,
  showActions,
  isEditing,
  editTitle,
  actionBusy,
  error,
  onStartEdit,
  onEditTitle,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: {
  group: ChapterGroup;
  showActions: boolean;
  isEditing: boolean;
  editTitle: string;
  actionBusy: boolean;
  error: string | null;
  onStartEdit: (group: ChapterGroup) => void;
  onEditTitle: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (group: ChapterGroup) => void;
}) {
  return (
    <div className={styles.chapterSticky} data-onboarding-id="onb-chapter-header">
      <div className={styles.chapterTitle}>
        <span>Fejezet {group.chapterIndex}</span>
        {isEditing ? (
          <>
            <input
              className={`input ${styles.chapterInlineInput}`}
              value={editTitle}
              onChange={(event) => onEditTitle(event.target.value)}
              disabled={actionBusy}
            />
            {error ? <div className={styles.chapterInlineError}>{error}</div> : null}
          </>
        ) : (
          <strong>{group.chapterTitle}</strong>
        )}
      </div>
      {showActions ? (
        <div className={styles.chapterHeaderActions}>
          {isEditing ? (
            <>
              <button
                className={styles.chapterEditButton}
                type="button"
                onClick={onSaveEdit}
                disabled={actionBusy}
                aria-label={`Fejezet ${group.chapterIndex} cimenek mentese`}
                title="Mentese"
              >
                <ActionIcon type="accept" />
              </button>
              <button
                className={styles.chapterEditButton}
                type="button"
                onClick={onCancelEdit}
                disabled={actionBusy}
                aria-label={`Fejezet ${group.chapterIndex} szerkesztes megszakitasa`}
                title="Megse"
              >
                X
              </button>
            </>
          ) : (
            <button
              className={styles.chapterEditButton}
              type="button"
              onClick={() => onStartEdit(group)}
              disabled={actionBusy}
              aria-label={`Fejezet ${group.chapterIndex} cimenek szerkesztese`}
              title="Fejezet cim szerkesztese"
            >
              <ActionIcon type="edit" />
            </button>
          )}
          <button
            className={styles.chapterEditButton}
            type="button"
            onClick={() => onDelete(group)}
            disabled={actionBusy}
            aria-label={`Fejezet ${group.chapterIndex} torlese`}
            title="Fejezet torlese"
          >
            <ActionIcon type="delete" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function BlockCard({
  block,
  textMode,
  acceptInFlight,
  generateInFlight,
  deleteInFlight,
  generateError,
  noteError,
  manualEditError,
  manualSaveInFlight,
  creatingNoteInFlight,
  onAccept,
  onGenerate,
  onDelete,
  onSaveManualEdit,
  onRejectToOriginal,
  onSetBookmarkBefore,
  onCreateNote,
  onApproveSuggestion,
  onRejectSuggestion,
  dismissedSuggestionNumbers,
  allowDelete,
  showControls,
  accentColor,
  isMobile,
  mobileActionsVisible,
  onMobileActivate,
  bookmarksBeforeBlock,
}: {
  block: DashboardBlock;
  textMode: DashboardActivePanel;
  acceptInFlight: boolean;
  generateInFlight: boolean;
  deleteInFlight: boolean;
  generateError: string | null;
  noteError: string | null;
  manualEditError: string | null;
  manualSaveInFlight: boolean;
  creatingNoteInFlight: boolean;
  onAccept: (block: DashboardBlock) => void;
  onGenerate: (block: DashboardBlock) => void;
  onDelete: (block: DashboardBlock) => void;
  onSaveManualEdit: (args: { block: DashboardBlock; text: string }) => Promise<boolean>;
  onRejectToOriginal: (block: DashboardBlock) => void;
  onSetBookmarkBefore: (block: DashboardBlock, kind: DashboardBookmarkKind) => void;
  onCreateNote: (args: { block: DashboardBlock; range: BlockSelectionRange }) => Promise<void>;
  onApproveSuggestion: (args: {
    block: DashboardBlock;
    number: number;
    content: string;
    start: number;
    end: number;
  }) => Promise<void>;
  onRejectSuggestion: (args: { block: DashboardBlock; number: number }) => void;
  dismissedSuggestionNumbers: Set<number>;
  allowDelete: boolean;
  showControls: boolean;
  accentColor: string;
  isMobile: boolean;
  mobileActionsVisible: boolean;
  onMobileActivate: (blockId: string) => void;
  bookmarksBeforeBlock: DashboardBookmarkEntry[];
}) {
  const [selectionRange, setSelectionRange] = useState<BlockSelectionRange | null>(null);
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [manualDraftText, setManualDraftText] = useState("");
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const text =
    textMode === "original"
      ? block.originalText
      : block.translatedText?.trim() || block.originalText;
  const notesForCurrentText =
    textMode === "translated"
      ? block.inlineNotes.filter((note) => note.anchorStart >= 0 && note.anchorEnd <= text.length)
      : [];
  const suggestedRanges =
    textMode === "translated"
      ? findSuggestedRanges(text, block.footnoteSuggestions, dismissedSuggestionNumbers)
      : [];
  const remainingSuggestionCount = block.footnoteSuggestions.filter(
    (item) => !dismissedSuggestionNumbers.has(item.number),
  ).length;
  const explanationSignalCount = remainingSuggestionCount + notesForCurrentText.length;
  const renderedText =
    notesForCurrentText.length > 0 || suggestedRanges.length > 0
      ? renderTextWithInlineNotes({
          text,
          notes: notesForCurrentText,
          suggestions: suggestedRanges,
          blockId: block.id,
          onApproveSuggestion: ({ number, content, start, end }) =>
            onApproveSuggestion({ block, number, content, start, end }),
          onRejectSuggestion: ({ number }) => onRejectSuggestion({ block, number }),
        })
      : text;
  const translatedTrim = block.translatedText?.trim() ?? "";
  const hasTranslatedContent = Boolean(translatedTrim);
  const hasEditedContent =
    textMode === "translated" &&
    hasTranslatedContent &&
    translatedTrim !== block.originalText.trim();
  const needsAttention = textMode === "translated" && (block.workflowStatus === "rejected" || generateError !== null);
  const tone = blockTone({ block, hasError: needsAttention });
  const hasProgressBookmarkAtThisBlock = bookmarksBeforeBlock.some((entry) => entry.kind === "progress");
  const importantBookmarkCountAtThisBlock = bookmarksBeforeBlock.filter((entry) => entry.kind === "important").length;

  const captureSelection = useCallback(() => {
    if (textMode !== "translated" || !textRef.current) return;
    const range = getSelectionRangeWithin(textRef.current);
    setSelectionRange(range);
  }, [textMode]);

  const clearSelection = useCallback(() => {
    setSelectionRange(null);
  }, []);

  const positionTooltipForMarker = useCallback((marker: HTMLElement | null) => {
    const textNode = textRef.current;
    if (!textNode || !marker) return;

    const panelNode = textNode.closest(`.${styles.panelBody}`) as HTMLElement | null;
    const markerRect = marker.getBoundingClientRect();
    const panelRect = (panelNode ?? textNode).getBoundingClientRect();

    const tooltipX = panelRect.left + panelRect.width / 2;
    const tooltipY = markerRect.top - 8;
    const tooltipWidth = Math.max(220, panelRect.width - 10);

    textNode.style.setProperty("--inline-tooltip-x", `${Math.round(tooltipX)}px`);
    textNode.style.setProperty("--inline-tooltip-y", `${Math.round(tooltipY)}px`);
    textNode.style.setProperty("--inline-tooltip-width", `${Math.round(tooltipWidth)}px`);
  }, []);

  const handleTooltipPointer = useCallback((event: MouseEvent<HTMLParagraphElement>) => {
    const target = event.target as HTMLElement | null;
    const marker = target?.closest(`.${styles.inlineNoteMark}, .${styles.suggestedNoteMark}`) as HTMLElement | null;
    positionTooltipForMarker(marker);
  }, [positionTooltipForMarker]);

  const handleTooltipFocus = useCallback((event: FocusEvent<HTMLParagraphElement>) => {
    const target = event.target as HTMLElement | null;
    const marker = target?.closest(`.${styles.inlineNoteMark}, .${styles.suggestedNoteMark}`) as HTMLElement | null;
    positionTooltipForMarker(marker);
  }, [positionTooltipForMarker]);

  const openManualEdit = useCallback(() => {
    setManualDraftText(textMode === "translated" ? (block.translatedText?.trim() || block.originalText) : block.originalText);
    setManualEditOpen(true);
  }, [block.originalText, block.translatedText, textMode]);

  return (
    <article
      className={styles.blockCard}
      data-dashboard-block-id={block.id}
      data-status={block.workflowStatus}
      data-edited={hasEditedContent ? "true" : "false"}
      data-alert={needsAttention ? "true" : "false"}
      data-mode={textMode}
      data-note-signal={explanationSignalCount > 0 ? "true" : "false"}
      data-mobile-active={mobileActionsVisible ? "true" : "false"}
      onClick={(event) => {
        event.stopPropagation();
        if (!isMobile || !showControls) return;
        onMobileActivate(block.id);
      }}
      style={
        {
          "--panel-accent-color": accentColor,
          "--block-state-color":
            textMode === "original" || (textMode === "translated" && !hasTranslatedContent)
              ? "transparent"
              : actionToneColor(tone),
        } as CSSProperties
      }
    >
      {explanationSignalCount > 0 ? (
        <div className={styles.noteSignalRow}>
          <span className={styles.noteSignalBadge}>
            Magyarazati jelzes: {explanationSignalCount}
          </span>
          {remainingSuggestionCount > 0 ? (
            <span className={styles.noteSignalMeta}>Uj javaslat: {remainingSuggestionCount}</span>
          ) : null}
        </div>
      ) : null}
      {showControls ? (
        <BlockControls
          block={block}
          textMode={textMode}
          acceptInFlight={acceptInFlight}
          generateInFlight={generateInFlight}
          deleteInFlight={deleteInFlight}
          generateError={generateError}
          onAccept={onAccept}
          onGenerate={onGenerate}
          onDelete={onDelete}
          onStartManualEdit={openManualEdit}
          onRejectToOriginal={onRejectToOriginal}
          onSetBookmarkBefore={onSetBookmarkBefore}
          allowDelete={allowDelete}
          mobileExpanded={mobileActionsVisible}
          hasProgressBookmarkAtThisBlock={hasProgressBookmarkAtThisBlock}
          importantBookmarkCountAtThisBlock={importantBookmarkCountAtThisBlock}
        />
      ) : null}
      <p
        ref={textRef}
        className={styles.blockText}
        onMouseUp={captureSelection}
        onMouseOver={handleTooltipPointer}
        onKeyUp={captureSelection}
        onFocusCapture={handleTooltipFocus}
        onBlur={clearSelection}
      >
        {renderedText}
      </p>
      {textMode === "translated" && manualEditOpen ? (
        <div className={styles.manualEditPanel}>
          <textarea
            className={styles.manualEditTextarea}
            value={manualDraftText}
            onChange={(event) => setManualDraftText(event.target.value)}
            placeholder="Tisztitott blokk szoveg"
          />
          <div className={styles.manualEditActions}>
            <button
              type="button"
              className="btn"
              disabled={manualSaveInFlight}
              onClick={async () => {
                const ok = await onSaveManualEdit({ block, text: manualDraftText });
                if (ok) {
                  setManualEditOpen(false);
                }
              }}
            >
              {manualSaveInFlight ? "Mentes..." : "Mentes"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={manualSaveInFlight}
              onClick={() => setManualEditOpen(false)}
            >
              Megse
            </button>
          </div>
          {manualEditError ? <div className={styles.inlineNoteError}>{manualEditError}</div> : null}
        </div>
      ) : null}
      {textMode === "translated" && selectionRange ? (
        <div className={styles.selectionActions}>
          <button
            type="button"
            className={styles.inlineActionButton}
            disabled={creatingNoteInFlight}
            onClick={() => onCreateNote({ block, range: selectionRange })}
            data-onboarding-id="onb-note-trigger"
          >
            {creatingNoteInFlight ? "Jegyzet..." : "Jegyzet kerese"}
          </button>
        </div>
      ) : null}
      {noteError ? <div className={styles.inlineNoteError}>{noteError}</div> : null}
    </article>
  );
}

export function BookDashboard({ bookId }: { bookId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<LoadState>({ status: "booting" });
  const [editForm, setEditForm] = useState<BookEditForm>({
    title: "",
    author: "",
    year: "",
    description: "",
    icon: "",
  });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);
  const [editFeedback, setEditFeedback] = useState<string | null>(null);
  const [store, setStore] = useState<DashboardViewStore>({
    viewState: "workbench",
    panelMode: "single",
    desktopLayout: "single",
    activePanel: "translated",
    syncScroll: true,
  });
  const [acceptingBlockId, setAcceptingBlockId] = useState<string | null>(null);
  const [generatingBlockId, setGeneratingBlockId] = useState<string | null>(null);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<GenerateErrorState | null>(null);
  const [manualSavingBlockId, setManualSavingBlockId] = useState<string | null>(null);
  const [manualEditError, setManualEditError] = useState<ManualEditErrorState | null>(null);
  const [creatingNoteBlockId, setCreatingNoteBlockId] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<NoteErrorState | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<string, Set<number>>>({});
  const [chapterEdit, setChapterEdit] = useState<{
    chapterId: string;
    chapterIndex: number;
    title: string;
  } | null>(null);
  const [chapterEditSaving, setChapterEditSaving] = useState(false);
  const [chapterDeleteSaving, setChapterDeleteSaving] = useState(false);
  const [chapterEditError, setChapterEditError] = useState<string | null>(null);
  const [mergingPairKey, setMergingPairKey] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobilePage, setMobilePage] = useState<MobileDashboardPage>("translated");
  const [mobileToolPanelOpen, setMobileToolPanelOpen] = useState(false);
  const [desktopEditPanelOpen, setDesktopEditPanelOpen] = useState(false);
  const [activeMobileBlockId, setActiveMobileBlockId] = useState<string | null>(null);
  const [expandedNoteIds, setExpandedNoteIds] = useState<Set<string>>(() => new Set());
  const [bookmarks, setBookmarks] = useState<DashboardBookmarkEntry[]>([]);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  const [bookmarkReady, setBookmarkReady] = useState(false);
  const [onboardingCompletedStepIds, setOnboardingCompletedStepIds] = useState<Set<string>>(() => new Set());
  const [onboardingReplaySeed, setOnboardingReplaySeed] = useState(0);
  const [onboardingPopupPosition, setOnboardingPopupPosition] = useState<OnboardingPopupPosition | null>(null);
  const [onboardingProgressReady, setOnboardingProgressReady] = useState(false);
  const [onboardingGuideOpen, setOnboardingGuideOpen] = useState(false);
  const [onboardingSelectedStepId, setOnboardingSelectedStepId] = useState<string | null>(null);
  const currentOnboardingStepRef = useRef<OnboardingStep | null>(null);
  const onboardingStartedRef = useRef(false);
  const onboardingCompletedRef = useRef(false);
  const onboardingLastShownStepIdRef = useRef<string | null>(null);
  const onboardingLastNavigatedStepIdRef = useRef<string | null>(null);
  const initializedView = useRef(false);
  const originalPanelRef = useRef<HTMLDivElement | null>(null);
  const translatedPanelRef = useRef<HTMLDivElement | null>(null);
  const syncLock = useRef<"original" | "translated" | null>(null);

  const applyViewDefaults = useCallback((data: BookDashboardData) => {
    setStore((prev) => {
      if (data.completion.isComplete) {
        // UX decision: at 100% accepted, reader is the default entry state.
        return { ...prev, viewState: "reader", activePanel: "translated" };
      }
      if (prev.viewState === "reader") {
        return { ...prev, viewState: "workbench" };
      }
      return prev;
    });
  }, []);

  const loadDashboard = useCallback(
    async (opts?: { keepCurrentView?: boolean }) => {
      const boot = await ensureAnonIdentity();
      if (!boot.ok) {
        setState({ status: "error", message: boot.reason });
        return;
      }

      try {
        const data = await fetchBookDashboardData(supabase, bookId);
        setState({ status: "ready", userId: boot.userId, data });
        setEditForm(toBookEditForm(data));

        if (opts?.keepCurrentView) {
          if (data.completion.isComplete) {
            applyViewDefaults(data);
          }
          return;
        }

        if (!initializedView.current) {
          applyViewDefaults(data);
          initializedView.current = true;
        } else {
          applyViewDefaults(data);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Ismeretlen hiba.";
        setState({ status: "error", message });
      }
    },
    [applyViewDefaults, bookId, supabase],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setActiveMobileBlockId(null);
      setMobileToolPanelOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (state.status !== "ready") {
      setBookmarkReady(false);
      return;
    }
    const restored = readDashboardBookmark({ userId: state.userId, bookId });
    setBookmarks(restored.items);
    setSelectedBookmarkId(restored.items[0]?.id ?? null);
    setBookmarkReady(true);
  }, [bookId, state.status, state.status === "ready" ? state.userId : null]);

  useEffect(() => {
    if (state.status !== "ready" || !bookmarkReady) return;
    writeDashboardBookmark({
      userId: state.userId,
      bookId,
      bookmark: {
        items: bookmarks,
      },
    });
  }, [
    bookmarks,
    bookmarkReady,
    bookId,
    state.status,
    state.status === "ready" ? state.userId : null,
  ]);

  const emitOnboardingTelemetry = useCallback(
    (
      name: OnboardingTelemetryEventName,
      payload?: { step_id?: string; reason?: OnboardingStepCompletionReason },
    ) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent("onboarding:telemetry", {
          detail: {
            name,
            route: "/book/[id]",
            book_id: bookId,
            onboarding_version: ONBOARDING_VERSION,
            timestamp: Date.now(),
            ...(payload ?? {}),
          },
        }),
      );
    },
    [bookId],
  );

  useEffect(() => {
    if (state.status !== "ready") {
      setOnboardingProgressReady(false);
      return;
    }
    const restored = readOnboardingProgress({
      userId: state.userId,
      bookId,
      route: "/book/[id]",
    });
    setOnboardingCompletedStepIds(restored);
    setOnboardingProgressReady(true);
  }, [bookId, state.status, state.status === "ready" ? state.userId : null]);

  useEffect(() => {
    if (state.status !== "ready" || !onboardingProgressReady) return;
    writeOnboardingProgress({
      userId: state.userId,
      bookId,
      route: "/book/[id]",
      completedStepIds: onboardingCompletedStepIds,
    });
  }, [
    bookId,
    onboardingCompletedStepIds,
    onboardingProgressReady,
    state.status,
    state.status === "ready" ? state.userId : null,
  ]);

  const resetOnboardingTrackingRefs = useCallback(() => {
    onboardingStartedRef.current = false;
    onboardingCompletedRef.current = false;
    onboardingLastShownStepIdRef.current = null;
    onboardingLastNavigatedStepIdRef.current = null;
  }, []);

  const handleOnboardingReplay = useCallback(() => {
    resetOnboardingTrackingRefs();
    setOnboardingSelectedStepId(null);
    setOnboardingCompletedStepIds(new Set());
    setOnboardingReplaySeed((prev) => prev + 1);
    setStore((prev) => ({
      ...prev,
      viewState: "workbench",
      activePanel: prev.activePanel ?? "translated",
    }));
    if (isMobile) {
      setMobileToolPanelOpen(true);
    }
  }, [isMobile, resetOnboardingTrackingRefs]);

  const stopOnboardingFlow = useCallback((stepId?: string) => {
    setOnboardingSelectedStepId(null);
    setOnboardingGuideOpen(false);
    setOnboardingCompletedStepIds(new Set(BOOK_EDITORIAL_ONBOARDING_STEPS.map((step) => step.id)));
    if (stepId) {
      emitOnboardingTelemetry("onboarding_step_completed", { step_id: stepId, reason: "skip" });
      emitOnboardingTelemetry("onboarding_skipped", { step_id: stepId, reason: "skip" });
    }
  }, [emitOnboardingTelemetry]);

  useEffect(() => {
    window.addEventListener("onboarding:replay-request", handleOnboardingReplay as EventListener);
    return () => {
      window.removeEventListener("onboarding:replay-request", handleOnboardingReplay as EventListener);
    };
  }, [handleOnboardingReplay]);

  const completeOnboardingByEvent = useCallback((event: OnboardingCompleteOn) => {
    setOnboardingCompletedStepIds((prev) => {
      const step = currentOnboardingStepRef.current;
      if (!step || step.completeOn !== event) return prev;
      if (prev.has(step.id)) return prev;
      emitOnboardingTelemetry("onboarding_step_completed", {
        step_id: step.id,
        reason: event,
      });
      const next = new Set(prev);
      next.add(step.id);
      return next;
    });
  }, [emitOnboardingTelemetry]);

  const handleAccept = useCallback(
    async (block: DashboardBlock) => {
      if (state.status !== "ready") return;
      setAcceptingBlockId(block.id);
      try {
        await acceptBlockVariant({
          supabase,
          userId: state.userId,
          block,
        });
        await loadDashboard({ keepCurrentView: true });
        completeOnboardingByEvent("accept_success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen mentes.";
        setState({ status: "error", message });
      } finally {
        setAcceptingBlockId(null);
      }
    },
    [completeOnboardingByEvent, loadDashboard, state, supabase],
  );

  const handleGenerate = useCallback(
    async (block: DashboardBlock) => {
      if (state.status !== "ready") return;
      setGenerateError(null);
      setGeneratingBlockId(block.id);
      try {
        await requestDraftGeneration({
          supabase,
          bookId,
          blockId: block.id,
        });
        await loadDashboard({ keepCurrentView: true });
        completeOnboardingByEvent("generate_success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen generalas.";
        setGenerateError({ blockId: block.id, message });
      } finally {
        setGeneratingBlockId(null);
      }
    },
    [bookId, completeOnboardingByEvent, loadDashboard, state.status, supabase],
  );

  const handleCreateNote = useCallback(
    async ({ block, range }: { block: DashboardBlock; range: BlockSelectionRange }) => {
      if (state.status !== "ready") return;
      const selectedText = range.text.trim();
      if (!selectedText) return;

      setNoteError(null);
      setCreatingNoteBlockId(block.id);

      try {
        const generatedNote = await requestSelectionNote({
          supabase,
          bookId,
          blockId: block.id,
          selectedText,
        });

        const notesTable = supabase.from("notes") as any;
        const payload = {
          owner_id: state.userId,
          book_id: block.bookId,
          chapter_id: block.chapterId,
          block_id: block.id,
          anchor_start: range.start,
          anchor_end: range.end,
          kind: "lexical",
          content: generatedNote,
        };

        const { error } = await notesTable.insert(payload);
        if (error) {
          throw new Error(error.message || "Sikertelen jegyzetmentes.");
        }

        await loadDashboard({ keepCurrentView: true });
        completeOnboardingByEvent("note_requested");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen jegyzetgeneralas.";
        setNoteError({ blockId: block.id, message });
      } finally {
        setCreatingNoteBlockId(null);
      }
    },
    [bookId, completeOnboardingByEvent, loadDashboard, state, supabase],
  );

  const markSuggestionDismissed = useCallback((blockId: string, number: number) => {
    setDismissedSuggestions((prev) => {
      const current = prev[blockId] ?? new Set<number>();
      const nextSet = new Set(current);
      nextSet.add(number);
      return { ...prev, [blockId]: nextSet };
    });
  }, []);

  const handleApproveSuggestion = useCallback(
    async (args: { block: DashboardBlock; number: number; content: string; start: number; end: number }) => {
      if (state.status !== "ready") return;
      const { block, number, content, start, end } = args;
      setNoteError(null);
      setCreatingNoteBlockId(block.id);
      try {
        const notesTable = supabase.from("notes") as any;
        const payload = {
          owner_id: state.userId,
          book_id: block.bookId,
          chapter_id: block.chapterId,
          block_id: block.id,
          anchor_start: start,
          anchor_end: end,
          kind: "historical",
          content: content || "Automatikus jegyzetjavaslat.",
        };
        const { error } = await notesTable.insert(payload);
        if (error) throw new Error(error.message || "Sikertelen jegyzetmentes.");

        markSuggestionDismissed(block.id, number);
        await loadDashboard({ keepCurrentView: true });
        completeOnboardingByEvent("note_decided");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen jegyzetmentes.";
        setNoteError({ blockId: block.id, message });
      } finally {
        setCreatingNoteBlockId(null);
      }
    },
    [completeOnboardingByEvent, loadDashboard, markSuggestionDismissed, state, supabase],
  );

  const handleRejectSuggestion = useCallback(
    ({ block, number }: { block: DashboardBlock; number: number }) => {
      markSuggestionDismissed(block.id, number);
      completeOnboardingByEvent("note_decided");
    },
    [completeOnboardingByEvent, markSuggestionDismissed],
  );

  const handleDeleteBlock = useCallback(
    async (block: DashboardBlock) => {
      if (state.status !== "ready") return;
      const confirmed = window.confirm(
        block.editedVariantId
          ? "Biztosan toroljuk a blokk szerkesztett valtozatat?"
          : "Biztosan toroljuk a teljes blokkot? Ez az eredeti szoveget is eltavolitja.",
      );
      if (!confirmed) return;

      setDeletingBlockId(block.id);
      try {
        if (block.editedVariantId) {
          await deleteEditedBlockVariant({ supabase, block });
        } else {
          const blocksTable = supabase.from("blocks") as any;
          const { error } = await blocksTable
            .delete()
            .eq("id", block.id)
            .eq("book_id", block.bookId);
          if (error) throw new Error(error.message || "Sikertelen blokk torles.");
        }
        await loadDashboard({ keepCurrentView: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen torles.";
        setState({ status: "error", message });
      } finally {
        setDeletingBlockId(null);
      }
    },
    [loadDashboard, state.status, supabase],
  );

  const handleRejectToOriginal = useCallback(
    async (block: DashboardBlock) => {
      if (state.status !== "ready") return;
      if (!block.editedVariantId) return;
      const confirmed = window.confirm(
        "Biztosan elutasitod ezt a valtozatot? A blokk visszaall az eredeti szovegre.",
      );
      if (!confirmed) return;

      setDeletingBlockId(block.id);
      try {
        await deleteEditedBlockVariant({ supabase, block });
        await loadDashboard({ keepCurrentView: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen elutasitas.";
        setState({ status: "error", message });
      } finally {
        setDeletingBlockId(null);
      }
    },
    [loadDashboard, state.status, supabase],
  );

  const handleSaveManualEdit = useCallback(
    async ({ block, text }: { block: DashboardBlock; text: string }): Promise<boolean> => {
      if (state.status !== "ready") return false;
      const cleaned = text.trim();
      if (!cleaned) {
        setManualEditError({ blockId: block.id, message: "A blokk szovege nem lehet ures." });
        return false;
      }

      setManualEditError(null);
      setManualSavingBlockId(block.id);
      try {
        const variantsTable = supabase.from("variants") as any;
        const { data: latestVariantRows, error: latestVariantError } = await variantsTable
          .select("variant_index")
          .eq("block_id", block.id)
          .order("variant_index", { ascending: false })
          .limit(1);
        if (latestVariantError) {
          throw new Error(latestVariantError.message || "Sikertelen varians lekerdezes.");
        }

        const nextIndex = ((latestVariantRows as Array<{ variant_index: number }> | null)?.[0]?.variant_index ?? 0) + 1;
        const payload = {
          owner_id: state.userId,
          book_id: block.bookId,
          chapter_id: block.chapterId,
          block_id: block.id,
          variant_index: nextIndex,
          status: "draft",
          text: cleaned,
        };
        const { error: insertError } = await variantsTable.insert(payload);
        if (insertError) {
          throw new Error(insertError.message || "Sikertelen kezi javitas mentes.");
        }

        await loadDashboard({ keepCurrentView: true });
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen kezi javitas mentes.";
        setManualEditError({ blockId: block.id, message });
        return false;
      } finally {
        setManualSavingBlockId(null);
      }
    },
    [loadDashboard, state, supabase],
  );

  const handleSetBookmarkBeforeBlock = useCallback((block: DashboardBlock, kind: DashboardBookmarkKind) => {
    const markerId = bookmarkBeforeKey(block);
    if (kind === "progress") {
      setBookmarks((prev) => {
        const existing = prev.find((entry) => entry.kind === "progress");
        if (existing) {
          return prev.map((entry) =>
            entry.id === existing.id
              ? { ...entry, markerId, name: entry.name.trim() ? entry.name : "Haladas jelzo" }
              : entry,
          );
        }
        const created: DashboardBookmarkEntry = {
          id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          markerId,
          kind: "progress",
          colorKey: DEFAULT_BOOKMARK_COLOR_KEY,
          name: "Haladas jelzo",
        };
        setSelectedBookmarkId(created.id);
        return [...prev, created];
      });
      return;
    }

    const created: DashboardBookmarkEntry = {
      id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      markerId,
      kind: "important",
      colorKey: IMPORTANT_BOOKMARK_DEFAULT_COLOR_KEY,
      name: "Fontos jeloles",
    };
    setBookmarks((prev) => [...prev, created]);
    setSelectedBookmarkId(created.id);
  }, []);

  const handleJumpToBookmark = useCallback((bookmarkId?: string) => {
    if (typeof document === "undefined") return;
    const targetBookmark = bookmarkId
      ? bookmarks.find((entry) => entry.id === bookmarkId)
      : selectedBookmarkId
        ? bookmarks.find((entry) => entry.id === selectedBookmarkId)
        : null;
    if (!targetBookmark?.markerId) return;
    const target = document.querySelector<HTMLElement>(`[data-bookmark-marker-id="${targetBookmark.markerId}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (isMobile) {
      setMobilePage("translated");
      setStore((prev) => ({ ...prev, activePanel: "translated", panelMode: "single" }));
    }
  }, [bookmarks, isMobile, selectedBookmarkId]);

  const handleJumpToChapter = useCallback((chapterId: string) => {
    if (typeof document === "undefined") return;
    const target = document.querySelector<HTMLElement>(
      `[data-panel-kind="translated"] [data-dashboard-chapter-id="${chapterId}"]`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (isMobile) {
      setMobilePage("translated");
      setStore((prev) => ({ ...prev, activePanel: "translated", panelMode: "single" }));
    }
  }, [isMobile]);

  const handleJumpToBlock = useCallback((blockId: string) => {
    if (typeof document === "undefined") return;
    const translatedTarget = document.querySelector<HTMLElement>(
      `[data-panel-kind="translated"] [data-dashboard-block-id="${blockId}"]`,
    );
    const fallbackTarget = document.querySelector<HTMLElement>(`[data-dashboard-block-id="${blockId}"]`);
    (translatedTarget ?? fallbackTarget)?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (isMobile) {
      setMobilePage("translated");
      setStore((prev) => ({ ...prev, activePanel: "translated", panelMode: "single" }));
    }
  }, [isMobile]);

  const handleEditSubmit = useCallback(async () => {
    if (state.status !== "ready") return;

    const title = editForm.title.trim();
    const author = editForm.author.trim();
    const description = editForm.description.trim();
    const icon = normalizeIconSlug(editForm.icon);
    const yearRaw = editForm.year.trim();

    if (!title) {
      setEditFeedback("A cim kotelezo.");
      return;
    }

    let yearValue: number | null = null;
    if (yearRaw) {
      if (!/^\d{3,4}$/.test(yearRaw)) {
        setEditFeedback("Az ev csak 3 vagy 4 szamjegy lehet.");
        return;
      }
      yearValue = Number(yearRaw);
    }

    setEditFeedback(null);
    setIsEditSaving(true);

    const fullPayload = {
      title,
      author: author || null,
      publication_year: yearValue,
      description: description || null,
      cover_slug: icon || null,
      background_slug: icon || null,
    };

    const basePayload = {
      title,
      author: author || null,
      description: description || null,
    };

    // Untyped browser client can infer `update` payload as `never`; use a local loose table handle for this form submit.
    const booksTable = supabase.from("books") as any;
    const updateQuery = booksTable.update(fullPayload).eq("id", bookId).eq("user_id", state.userId);
    const { error } = await updateQuery;

    if (error) {
      const message = `${error.message ?? ""}`.toLowerCase();
      const missingOptionalColumn =
        message.includes("publication_year") ||
        message.includes("cover_slug") ||
        message.includes("background_slug");

      if (missingOptionalColumn) {
        const fallback = await booksTable.update(basePayload).eq("id", bookId).eq("user_id", state.userId);

        if (fallback.error) {
          setEditFeedback(fallback.error.message || "Sikertelen mentes.");
          setIsEditSaving(false);
          return;
        }

        setEditFeedback(
          "A cim/szerzo/leiras mentve. Az ev vagy ikon oszlop hianyzik az adatbazisban.",
        );
        setIsEditSaving(false);
        await loadDashboard({ keepCurrentView: true });
        return;
      }

      setEditFeedback(error.message || "Sikertelen mentes.");
      setIsEditSaving(false);
      return;
    }

    setEditFeedback("Konyv adatai mentve.");
    setIsEditSaving(false);
    await loadDashboard({ keepCurrentView: true });
  }, [bookId, editForm, loadDashboard, state, supabase]);

  const handleGenerateSummary = useCallback(async () => {
    if (state.status !== "ready") return;
    setEditFeedback(null);
    setIsSummaryGenerating(true);
    try {
      const summary = await requestBookSummary({ supabase, bookId });
      setEditForm((prev) => ({ ...prev, description: summary }));
      setEditFeedback("Leiras generalva. Ellenorizd, majd mentsd.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen leirasgeneralas.";
      setEditFeedback(message);
    } finally {
      setIsSummaryGenerating(false);
    }
  }, [bookId, state.status, supabase]);

  const syncPanels = useCallback(
    (source: "original" | "translated") => {
      if (isMobile || !store.syncScroll || store.viewState !== "workbench") return;
      const sourcePanel = source === "original" ? originalPanelRef.current : translatedPanelRef.current;
      const targetPanel = source === "original" ? translatedPanelRef.current : originalPanelRef.current;
      if (!sourcePanel || !targetPanel) return;

      if (syncLock.current && syncLock.current !== source) return;
      syncLock.current = source;

      const maxSource = sourcePanel.scrollHeight - sourcePanel.clientHeight;
      const maxTarget = targetPanel.scrollHeight - targetPanel.clientHeight;
      const ratio = maxSource <= 0 ? 0 : sourcePanel.scrollTop / maxSource;
      targetPanel.scrollTop = ratio * Math.max(0, maxTarget);

      window.requestAnimationFrame(() => {
        syncLock.current = null;
      });
    },
    [isMobile, store.syncScroll, store.viewState],
  );

  const isReady = state.status === "ready";
  const bookTitle = isReady ? state.data.book.title : "Konyv";
  const bookAuthor = isReady ? state.data.book.author?.trim() || "Ismeretlen szerzo" : "Betoltes...";
  const panelAccentColor = authorSpineColor(bookAuthor);
  const blocks = isReady ? state.data.blocks : [];
  const completion = isReady ? state.data.completion : { accepted: 0, total: 0, ratio: 0, isComplete: false };
  const progress = completionPercent(completion.ratio);
  const canReader = completion.isComplete;
  const readerDisabledReason =
    completion.accepted === 0
      ? "Reader mod 0%-nal nem erheto el."
      : "Reader mod csak 100%-os completionnel erheto el.";
  const iconPreviewSlug = normalizeIconSlug(editForm.icon);
  const topbarIconSlug = isReady ? resolveTopbarIconSlug(state.data.book) : "";
  const iconPreviewPath = iconPreviewSlug
    ? `url('/covers/SVG/${iconPreviewSlug}.svg'), url('/covers/${iconPreviewSlug}.png')`
    : null;
  const chapterGroups = useMemo(() => groupBlocksByChapter(blocks), [blocks]);
  const bookmarkColorByKey = useMemo(
    () =>
      BOOKMARK_COLOR_OPTIONS.reduce<Record<string, string>>((acc, option) => {
        acc[option.key] = option.color;
        return acc;
      }, {}),
    [],
  );
  const selectedBookmark = useMemo(
    () => bookmarks.find((entry) => entry.id === selectedBookmarkId) ?? null,
    [bookmarks, selectedBookmarkId],
  );
  const activeBookmarkColorKey = selectedBookmark?.colorKey ?? DEFAULT_BOOKMARK_COLOR_KEY;
  const bookmarksByMarkerId = useMemo(() => {
    const grouped = new Map<string, DashboardBookmarkEntry[]>();
    for (const entry of bookmarks) {
      const bucket = grouped.get(entry.markerId);
      if (bucket) {
        bucket.push(entry);
      } else {
        grouped.set(entry.markerId, [entry]);
      }
    }
    return grouped;
  }, [bookmarks]);
  const bookmarkedPlacements = useMemo(() => {
    const result = new Map<string, { chapterIndex: number; block: DashboardBlock }>();
    for (const group of chapterGroups) {
      for (const block of group.blocks) {
        const markerId = bookmarkBeforeKey(block);
        if (!bookmarksByMarkerId.has(markerId)) continue;
        result.set(markerId, { chapterIndex: group.chapterIndex, block });
      }
    }
    return result;
  }, [bookmarksByMarkerId, chapterGroups]);
  const hasBookmarks = bookmarks.length > 0;
  const chapterProgressItems = useMemo(
    () =>
      chapterGroups.map((group) => {
        const total = group.blocks.length;
        const translated = group.blocks.filter((block) => Boolean(block.translatedText?.trim())).length;
        const ratio = total > 0 ? translated / total : 0;
        return {
          chapterId: group.chapterId,
          chapterIndex: group.chapterIndex,
          chapterTitle: group.chapterTitle,
          total,
          translated,
          ratio,
        };
      }),
    [chapterGroups],
  );
  const noteNavigatorItems = useMemo(() => {
    const items: Array<{
      id: string;
      blockId: string;
      chapterIndex: number;
      blockIndex: number;
      expression: string;
      description: string;
    }> = [];
    for (const group of chapterGroups) {
      for (const block of group.blocks) {
        if (block.inlineNotes.length === 0) continue;
        const sourceText = block.translatedText?.trim() || block.originalText;
        for (const note of block.inlineNotes) {
          const safeStart = Math.max(0, Math.min(sourceText.length, note.anchorStart));
          const safeEnd = Math.max(safeStart, Math.min(sourceText.length, note.anchorEnd));
          const expression = sourceText.slice(safeStart, safeEnd).trim() || "Jelolt kifejezes";
          items.push({
            id: note.id,
            blockId: block.id,
            chapterIndex: group.chapterIndex,
            blockIndex: block.blockIndex,
            expression,
            description: note.content,
          });
        }
      }
    }
    return items;
  }, [chapterGroups]);
  const bookmarkNavigatorItems = useMemo(() => {
    return bookmarks.map((entry) => {
      const placement = bookmarkedPlacements.get(entry.markerId);
      return {
        entry,
        placement,
      };
    });
  }, [bookmarkedPlacements, bookmarks]);
  const selectedOnboardingStep = useMemo(
    () => findOnboardingStepById(onboardingSelectedStepId),
    [onboardingSelectedStepId],
  );
  const currentOnboardingStep = useMemo(() => {
    if (state.status !== "ready") return null;
    if (!onboardingProgressReady) return null;
    if (!onboardingGuideOpen && !onboardingSelectedStepId) return null;
    if (selectedOnboardingStep) return selectedOnboardingStep;
    if (typeof document === "undefined") return null;

    return resolveCurrentOnboardingStep({
      route: "/book/[id]",
      completedStepIds: onboardingCompletedStepIds,
      isAnchorAvailable: (anchorId) =>
        document.querySelector(`[data-onboarding-id="${anchorId}"]`) !== null,
    });
  }, [
    state.status,
    onboardingProgressReady,
    onboardingGuideOpen,
    selectedOnboardingStep,
    onboardingCompletedStepIds,
    store.viewState,
    store.desktopLayout,
    store.activePanel,
    store.panelMode,
    isMobile,
    progress,
    blocks.length,
    chapterEdit,
    generatingBlockId,
    acceptingBlockId,
    creatingNoteBlockId,
    onboardingReplaySeed,
  ]);

  useEffect(() => {
    const validIds = new Set<string>(bookmarkedPlacements.keys());
    if (validIds.size === bookmarks.length) return;
    setBookmarks((prev) => prev.filter((entry) => validIds.has(entry.markerId)));
  }, [bookmarkedPlacements, bookmarks.length]);

  useEffect(() => {
    if (!selectedBookmarkId && bookmarks.length > 0) {
      setSelectedBookmarkId(bookmarks[0].id);
      return;
    }
    if (!selectedBookmarkId) return;
    if (bookmarks.some((entry) => entry.id === selectedBookmarkId)) return;
    setSelectedBookmarkId(bookmarks[0]?.id ?? null);
  }, [bookmarks, selectedBookmarkId]);

  useEffect(() => {
    currentOnboardingStepRef.current = currentOnboardingStep;
  }, [currentOnboardingStep]);

  useEffect(() => {
    if (state.status !== "ready" || !onboardingProgressReady) return;

    if (currentOnboardingStep) {
      if (!onboardingStartedRef.current) {
        emitOnboardingTelemetry("onboarding_started");
        onboardingStartedRef.current = true;
      }
      if (onboardingLastShownStepIdRef.current !== currentOnboardingStep.id) {
        emitOnboardingTelemetry("onboarding_step_shown", { step_id: currentOnboardingStep.id });
        onboardingLastShownStepIdRef.current = currentOnboardingStep.id;
      }
      return;
    }

    if (
      onboardingCompletedStepIds.size >= BOOK_EDITORIAL_ONBOARDING_STEPS.length &&
      !onboardingCompletedRef.current
    ) {
      emitOnboardingTelemetry("onboarding_completed");
      onboardingCompletedRef.current = true;
    }
  }, [
    currentOnboardingStep,
    emitOnboardingTelemetry,
    onboardingCompletedStepIds.size,
    onboardingProgressReady,
    state.status,
  ]);

  useEffect(() => {
    if (!currentOnboardingStep) {
      setOnboardingPopupPosition(null);
      return;
    }

    const updatePosition = () => {
      const next = resolveOnboardingPopupPosition({
        anchorId: currentOnboardingStep.anchorId,
        placement: currentOnboardingStep.placement,
        allowCenterFallback: Boolean(onboardingSelectedStepId),
      });
      setOnboardingPopupPosition(next);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [currentOnboardingStep, onboardingSelectedStepId]);

  useEffect(() => {
    if (!currentOnboardingStep) return;
    if (onboardingLastNavigatedStepIdRef.current === currentOnboardingStep.id) return;
    const anchor = findVisibleOnboardingAnchor(currentOnboardingStep.anchorId);
    if (!anchor) return;
    anchor.scrollIntoView({ block: "center", behavior: "smooth" });
    onboardingLastNavigatedStepIdRef.current = currentOnboardingStep.id;
  }, [currentOnboardingStep]);

  const markOnboardingStepCompleted = useCallback((stepId: string, reason: OnboardingStepCompletionReason) => {
    setOnboardingCompletedStepIds((prev) => {
      if (prev.has(stepId)) return prev;
      emitOnboardingTelemetry("onboarding_step_completed", { step_id: stepId, reason });
      if (reason === "skip") {
        emitOnboardingTelemetry("onboarding_skipped", { step_id: stepId, reason });
      }
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
  }, [emitOnboardingTelemetry]);

  const handleOnboardingNext = useCallback(() => {
    if (!currentOnboardingStep) return;
    if (onboardingSelectedStepId) {
      const currentIndex = findOnboardingStepIndex(onboardingSelectedStepId);
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex + 1) % BOOK_EDITORIAL_ONBOARDING_STEPS.length
          : 0;
      setOnboardingSelectedStepId(BOOK_EDITORIAL_ONBOARDING_STEPS[nextIndex]?.id ?? null);
      return;
    }
    markOnboardingStepCompleted(currentOnboardingStep.id, "next");
  }, [currentOnboardingStep, markOnboardingStepCompleted, onboardingSelectedStepId]);

  const handleOnboardingSkip = useCallback(() => {
    if (!currentOnboardingStep || !currentOnboardingStep.skippable) return;
    stopOnboardingFlow(currentOnboardingStep.id);
  }, [currentOnboardingStep, stopOnboardingFlow]);

  const handleModeToggle = useCallback((nextViewState: DashboardViewState) => {
    if (store.viewState !== nextViewState) {
      completeOnboardingByEvent("mode_toggled");
    }
    if (nextViewState === "reader") {
      if (isMobile) setMobilePage("translated");
      setStore((prev) => ({ ...prev, viewState: "reader", activePanel: "translated" }));
      return;
    }
    setStore((prev) => ({ ...prev, viewState: "workbench" }));
  }, [completeOnboardingByEvent, isMobile, store.viewState]);

  const handleOpenOnboardingGuide = useCallback(() => {
    setOnboardingGuideOpen((prev) => {
      const nextOpen = !prev;
      if (!nextOpen) {
        setOnboardingSelectedStepId(null);
        return nextOpen;
      }
      setOnboardingSelectedStepId((current) => {
        if (current) return current;
        return currentOnboardingStep?.id ?? BOOK_EDITORIAL_ONBOARDING_STEPS[0]?.id ?? null;
      });
      return nextOpen;
    });
  }, [currentOnboardingStep]);

  const handleSelectOnboardingGuideStep = useCallback((stepId: string) => {
    setOnboardingGuideOpen(true);
    setOnboardingSelectedStepId(stepId);
    setStore((prev) => ({ ...prev, viewState: "workbench", activePanel: "translated" }));
    if (isMobile) {
      const step = findOnboardingStepById(stepId);
      const needsToolPanel = step?.anchorId === "onb-mode-controls" || step?.anchorId === "onb-replay";
      setMobileToolPanelOpen(Boolean(needsToolPanel));
    }
  }, [isMobile]);

  const handleChapterEditOpen = useCallback((group: ChapterGroup) => {
    setChapterEdit({
      chapterId: group.chapterId,
      chapterIndex: group.chapterIndex,
      title: group.chapterTitle,
    });
    setChapterEditError(null);
  }, []);

  const handleChapterEditSubmit = useCallback(async () => {
    if (state.status !== "ready" || !chapterEdit) return;
    const nextTitle = chapterEdit.title.trim();
    if (!nextTitle) {
      setChapterEditError("A fejezet cim nem lehet ures.");
      return;
    }

    setChapterEditSaving(true);
    setChapterEditError(null);
    const chaptersTable = supabase.from("chapters") as any;
    const { error } = await chaptersTable
      .update({ title: nextTitle })
      .eq("id", chapterEdit.chapterId)
      .eq("book_id", bookId);

    if (error) {
      setChapterEditSaving(false);
      setChapterEditError(error.message || "Sikertelen mentes.");
      return;
    }

    setChapterEditSaving(false);
    setChapterEdit(null);
    await loadDashboard({ keepCurrentView: true });
    completeOnboardingByEvent("chapter_saved");
  }, [bookId, chapterEdit, completeOnboardingByEvent, loadDashboard, state.status, supabase]);

  const handleChapterDelete = useCallback(async (group: ChapterGroup) => {
    if (state.status !== "ready" || chapterEditSaving || chapterDeleteSaving) return;
    const confirmed = window.confirm(
      `Biztosan toroljuk a(z) ${group.chapterIndex}. fejezetet? A fejezet blokkjai es valtozatai is torlodnek.`,
    );
    if (!confirmed) return;

    setChapterEditError(null);
    setChapterDeleteSaving(true);
    const chaptersTable = supabase.from("chapters") as any;

    const { error: deleteError } = await chaptersTable
      .delete()
      .eq("id", group.chapterId)
      .eq("book_id", bookId);

    if (deleteError) {
      setChapterDeleteSaving(false);
      setChapterEditError(deleteError.message || "Sikertelen fejezet torles.");
      return;
    }

    const { data: chapterRows, error: fetchError } = await chaptersTable
      .select("id,chapter_index")
      .eq("book_id", bookId)
      .order("chapter_index", { ascending: true });

    if (fetchError) {
      setChapterDeleteSaving(false);
      setChapterEditError(fetchError.message || "Sikertelen ujraszamozas.");
      return;
    }

    const rows = ((chapterRows ?? []) as ChapterRow[]).sort((a, b) => a.chapter_index - b.chapter_index);
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const tempIndex = 10000 + index + 1;
      const { error } = await chaptersTable
        .update({ chapter_index: tempIndex })
        .eq("id", row.id)
        .eq("book_id", bookId);
      if (error) {
        setChapterDeleteSaving(false);
        setChapterEditError(error.message || "Sikertelen ujraszamozas.");
        return;
      }
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const finalIndex = index + 1;
      const { error } = await chaptersTable
        .update({ chapter_index: finalIndex })
        .eq("id", row.id)
        .eq("book_id", bookId);
      if (error) {
        setChapterDeleteSaving(false);
        setChapterEditError(error.message || "Sikertelen ujraszamozas.");
        return;
      }
    }

    setChapterDeleteSaving(false);
    setChapterEdit((prev) => (prev?.chapterId === group.chapterId ? null : prev));
    await loadDashboard({ keepCurrentView: true });
  }, [bookId, chapterDeleteSaving, chapterEditSaving, loadDashboard, state.status, supabase]);

  const handleMergeBlocks = useCallback(async (leftBlock: DashboardBlock, rightBlock: DashboardBlock) => {
    if (state.status !== "ready" || chapterEditSaving || chapterDeleteSaving) return;
    if (leftBlock.chapterId !== rightBlock.chapterId) return;
    setMergeError(null);

    const confirmed = window.confirm(
      `Biztosan osszevonjuk a ${leftBlock.blockIndex}. es ${rightBlock.blockIndex}. blokkot? A masodik blokk torlodik.`,
    );
    if (!confirmed) return;

    const pairKey = mergePairKey(leftBlock.id, rightBlock.id);
    setMergingPairKey(pairKey);

    try {
      const blocksTable = supabase.from("blocks") as any;
      const { data: selectedRows, error: selectError } = await blocksTable
        .select("id,original_text")
        .eq("book_id", bookId)
        .eq("chapter_id", leftBlock.chapterId)
        .in("id", [leftBlock.id, rightBlock.id]);
      if (selectError) throw new Error(selectError.message || "Sikertelen blokk-osszevonas.");

      const mergeRows = (selectedRows ?? []) as Array<{ id: string; original_text: string | null }>;
      const leftRow = mergeRows.find((row) => row.id === leftBlock.id);
      const rightRow = mergeRows.find((row) => row.id === rightBlock.id);
      if (!leftRow || !rightRow) {
        throw new Error("A blokkok mar nem talalhatok. Frissitsd az oldalt, majd probald ujra.");
      }

      const leftText = `${leftRow.original_text ?? ""}`.trim();
      const rightText = `${rightRow.original_text ?? ""}`.trim();
      const mergedOriginalText = [leftText, rightText].filter(Boolean).join(" ");
      if (!mergedOriginalText) {
        throw new Error("Az osszevonas ures szoveget eredmenyezne, ezert megszakitottuk.");
      }

      const { error: mergeError } = await blocksTable
        .update({ original_text: mergedOriginalText })
        .eq("id", leftBlock.id)
        .eq("book_id", bookId);
      if (mergeError) throw new Error(mergeError.message || "Sikertelen blokk-osszevonas.");

      const { error: deleteError } = await blocksTable
        .delete()
        .eq("id", rightBlock.id)
        .eq("book_id", bookId);
      if (deleteError) throw new Error(deleteError.message || "Sikertelen blokk-osszevonas.");

      const { data: blockRows, error: fetchError } = await blocksTable
        .select("id,block_index")
        .eq("book_id", bookId)
        .eq("chapter_id", leftBlock.chapterId)
        .order("block_index", { ascending: true });
      if (fetchError) throw new Error(fetchError.message || "Sikertelen blokk ujraszamozas.");

      const rows = ((blockRows ?? []) as BlockIndexRow[]).sort((a, b) => a.block_index - b.block_index);
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const tempIndex = 10000 + index + 1;
        const { error } = await blocksTable
          .update({ block_index: tempIndex })
          .eq("id", row.id)
          .eq("book_id", bookId)
          .eq("chapter_id", leftBlock.chapterId);
        if (error) throw new Error(error.message || "Sikertelen blokk ujraszamozas.");
      }

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const finalIndex = index + 1;
        const { error } = await blocksTable
          .update({ block_index: finalIndex })
          .eq("id", row.id)
          .eq("book_id", bookId)
          .eq("chapter_id", leftBlock.chapterId);
        if (error) throw new Error(error.message || "Sikertelen blokk ujraszamozas.");
      }

      await loadDashboard({ keepCurrentView: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen blokk-osszevonas.";
      setMergeError(message);
      await loadDashboard({ keepCurrentView: true });
    } finally {
      setMergingPairKey(null);
    }
  }, [bookId, chapterDeleteSaving, chapterEditSaving, loadDashboard, state.status, supabase]);

  const renderOriginalPanel = (showControls: boolean, showSwap: boolean) => (
    <section className={styles.panel} data-panel-kind="original">
      <div className={styles.panelTitle}>
        <span>Eredeti</span>
        {showSwap ? (
          <button
            className={styles.panelSwapButton}
            type="button"
            onClick={() => setStore((prev) => ({ ...prev, activePanel: "translated" }))}
            aria-label="Valtas a szerkesztett panelre"
            title="Valtas a szerkesztett panelre"
          >
            <Icon name="swap" size={16} />
          </button>
        ) : null}
      </div>
      <div
        className={styles.panelBody}
        ref={originalPanelRef}
        onScroll={() => syncPanels("original")}
        onClick={() => {
          if (!isMobile) return;
          setActiveMobileBlockId(null);
        }}
      >
        {chapterGroups.map((group) => (
          <section
            key={`original-chapter-${group.chapterId}`}
            className={styles.chapterGroup}
            data-dashboard-chapter-id={group.chapterId}
          >
            <ChapterHeader
              group={group}
              showActions={showControls}
              isEditing={chapterEdit?.chapterId === group.chapterId}
              editTitle={chapterEdit?.chapterId === group.chapterId ? chapterEdit.title : group.chapterTitle}
              actionBusy={chapterEditSaving || chapterDeleteSaving}
              error={chapterEdit?.chapterId === group.chapterId ? chapterEditError : null}
              onStartEdit={handleChapterEditOpen}
              onEditTitle={(value) =>
                setChapterEdit((prev) => (prev && prev.chapterId === group.chapterId ? { ...prev, title: value } : prev))
              }
              onSaveEdit={handleChapterEditSubmit}
              onCancelEdit={() => setChapterEdit(null)}
              onDelete={handleChapterDelete}
            />
            {group.blocks.map((block) => {
              const currentMarkerId = bookmarkBeforeKey(block);
              const markerEntries = bookmarksByMarkerId.get(currentMarkerId) ?? [];

              return (
                <Fragment key={`original-row-${block.id}`}>
                  {markerEntries.length > 0 ? (
                    <BookmarkMarkerStripe
                      markerId={currentMarkerId}
                      entries={markerEntries}
                      bookmarkColorByKey={bookmarkColorByKey}
                    />
                  ) : null}
                  <BlockCard
                    key={`original-${block.id}`}
                    block={block}
                    textMode="original"
                    acceptInFlight={acceptingBlockId === block.id}
                    generateInFlight={generatingBlockId === block.id}
                    deleteInFlight={deletingBlockId === block.id}
                    generateError={generateError?.blockId === block.id ? generateError.message : null}
                    noteError={noteError?.blockId === block.id ? noteError.message : null}
                    manualEditError={manualEditError?.blockId === block.id ? manualEditError.message : null}
                    manualSaveInFlight={manualSavingBlockId === block.id}
                    creatingNoteInFlight={creatingNoteBlockId === block.id}
                    onAccept={handleAccept}
                    onGenerate={handleGenerate}
                    onDelete={handleDeleteBlock}
                    onSaveManualEdit={handleSaveManualEdit}
                    onRejectToOriginal={handleRejectToOriginal}
                    onSetBookmarkBefore={handleSetBookmarkBeforeBlock}
                    onCreateNote={handleCreateNote}
                    onApproveSuggestion={handleApproveSuggestion}
                    onRejectSuggestion={handleRejectSuggestion}
                    dismissedSuggestionNumbers={dismissedSuggestions[block.id] ?? new Set<number>()}
                    allowDelete={showControls}
                    showControls={showControls}
                    accentColor={panelAccentColor}
                    isMobile={isMobile}
                    mobileActionsVisible={isMobile && showControls && activeMobileBlockId === block.id}
                    onMobileActivate={setActiveMobileBlockId}
                    bookmarksBeforeBlock={markerEntries}
                  />
                </Fragment>
              );
            })}
          </section>
        ))}
      </div>
    </section>
  );

  const renderTranslatedPanel = (showControls: boolean, showSwap: boolean) => (
    <section className={styles.panel} data-panel-kind="translated">
      <div className={styles.panelTitle}>
        <span>Szerkesztett</span>
        {showSwap ? (
          <button
            className={styles.panelSwapButton}
            type="button"
            onClick={() => setStore((prev) => ({ ...prev, activePanel: "original" }))}
            aria-label="Valtas az eredeti panelre"
            title="Valtas az eredeti panelre"
          >
            <Icon name="swap" size={16} />
          </button>
        ) : null}
      </div>
      <div
        className={styles.panelBody}
        ref={translatedPanelRef}
        onScroll={() => syncPanels("translated")}
        onClick={() => {
          if (!isMobile) return;
          setActiveMobileBlockId(null);
        }}
      >
        {mergeError ? <div className={styles.panelInlineError}>{mergeError}</div> : null}
        {chapterGroups.map((group) => (
          <section
            key={`translated-chapter-${group.chapterId}`}
            className={styles.chapterGroup}
            data-dashboard-chapter-id={group.chapterId}
          >
            <ChapterHeader
              group={group}
              showActions={showControls}
              isEditing={chapterEdit?.chapterId === group.chapterId}
              editTitle={chapterEdit?.chapterId === group.chapterId ? chapterEdit.title : group.chapterTitle}
              actionBusy={chapterEditSaving || chapterDeleteSaving}
              error={chapterEdit?.chapterId === group.chapterId ? chapterEditError : null}
              onStartEdit={handleChapterEditOpen}
              onEditTitle={(value) =>
                setChapterEdit((prev) => (prev && prev.chapterId === group.chapterId ? { ...prev, title: value } : prev))
              }
              onSaveEdit={handleChapterEditSubmit}
              onCancelEdit={() => setChapterEdit(null)}
              onDelete={handleChapterDelete}
            />
            {group.blocks.map((block, index) => {
              const nextBlock = group.blocks[index + 1];
              const currentMergeKey = nextBlock ? mergePairKey(block.id, nextBlock.id) : null;
              const currentMarkerId = bookmarkBeforeKey(block);
              const markerEntries = bookmarksByMarkerId.get(currentMarkerId) ?? [];
              const mergeBusy =
                Boolean(currentMergeKey) && mergingPairKey !== null && currentMergeKey === mergingPairKey;
              const mergeDisabled =
                mergingPairKey !== null ||
                chapterEditSaving ||
                chapterDeleteSaving ||
                acceptingBlockId !== null ||
                generatingBlockId !== null ||
                deletingBlockId !== null;

              return (
                <Fragment key={`translated-row-${block.id}`}>
                  {markerEntries.length > 0 ? (
                    <BookmarkMarkerStripe
                      markerId={currentMarkerId}
                      entries={markerEntries}
                      bookmarkColorByKey={bookmarkColorByKey}
                    />
                  ) : null}
                  <BlockCard
                    key={`translated-${block.id}`}
                    block={block}
                    textMode="translated"
                    acceptInFlight={acceptingBlockId === block.id}
                    generateInFlight={generatingBlockId === block.id}
                    deleteInFlight={deletingBlockId === block.id}
                    generateError={generateError?.blockId === block.id ? generateError.message : null}
                    noteError={noteError?.blockId === block.id ? noteError.message : null}
                    manualEditError={manualEditError?.blockId === block.id ? manualEditError.message : null}
                    manualSaveInFlight={manualSavingBlockId === block.id}
                    creatingNoteInFlight={creatingNoteBlockId === block.id}
                    onAccept={handleAccept}
                    onGenerate={handleGenerate}
                    onDelete={handleDeleteBlock}
                    onSaveManualEdit={handleSaveManualEdit}
                    onRejectToOriginal={handleRejectToOriginal}
                    onSetBookmarkBefore={handleSetBookmarkBeforeBlock}
                    onCreateNote={handleCreateNote}
                    onApproveSuggestion={handleApproveSuggestion}
                    onRejectSuggestion={handleRejectSuggestion}
                    dismissedSuggestionNumbers={dismissedSuggestions[block.id] ?? new Set<number>()}
                    allowDelete={showControls}
                    showControls={showControls}
                    accentColor={panelAccentColor}
                    isMobile={isMobile}
                    mobileActionsVisible={isMobile && showControls && activeMobileBlockId === block.id}
                    onMobileActivate={setActiveMobileBlockId}
                    bookmarksBeforeBlock={markerEntries}
                  />
                  {showControls && nextBlock ? (
                    <BlockMergeHandle
                      leftBlock={block}
                      rightBlock={nextBlock}
                      mergeInFlight={mergeBusy}
                      disabled={mergeDisabled}
                      onMerge={handleMergeBlocks}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </section>
        ))}
      </div>
    </section>
  );

  const renderWorkbenchDesktop = () => (
    store.desktopLayout === "single" ? (
      <div className={styles.readerDesktop}>
        {store.activePanel === "original"
          ? renderOriginalPanel(true, true)
          : renderTranslatedPanel(true, true)}
      </div>
    ) : (
      <div className={styles.desktopSplit}>
        {renderOriginalPanel(true, false)}
        {renderTranslatedPanel(true, false)}
      </div>
    )
  );

  const renderReaderDesktop = () => (
    <div className={styles.readerDesktop}>
      {renderTranslatedPanel(false, false)}
    </div>
  );

  const renderChapterNavigator = (mobile: boolean) => (
    <section className={mobile ? styles.mobileInfoBlock : styles.infoColumn}>
      <header className={styles.infoColumnHeader}>
        <strong>Tartalomjegyzek</strong>
        <span>Fejezet progress</span>
      </header>
      <div className={styles.infoColumnBody}>
        {chapterProgressItems.length === 0 ? (
          <div className={styles.infoEmptyState}>Nincs fejezet.</div>
        ) : (
          chapterProgressItems.map((item) => (
            <button
              key={item.chapterId}
              type="button"
              className={styles.infoListButton}
              onClick={() => handleJumpToChapter(item.chapterId)}
            >
              <span className={styles.infoListTitle}>
                {item.chapterIndex}. fejezet: {item.chapterTitle}
              </span>
              <span className={styles.infoListMeta}>
                {item.translated}/{item.total} blokk leforditva
              </span>
              <span className={styles.infoMiniTrack} aria-hidden="true">
                <span className={styles.infoMiniFill} style={{ width: `${completionPercent(item.ratio)}%` }} />
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );

  const renderNoteNavigator = (mobile: boolean) => (
    <section className={mobile ? styles.mobileInfoBlock : styles.infoColumn}>
      <header className={styles.infoColumnHeader}>
        <strong>Jegyzetek</strong>
        <span>Kifejezes + leiras</span>
      </header>
      <div className={styles.infoColumnBody}>
        {noteNavigatorItems.length === 0 ? (
          <div className={styles.infoEmptyState}>Nincs tarolt jegyzet.</div>
        ) : (
          noteNavigatorItems.map((item) => {
            const isExpanded = expandedNoteIds.has(item.id);
            const fullDescription = item.description.trim();
            const shouldCollapse = fullDescription.length > NOTE_PREVIEW_MAX_LENGTH;
            const previewDescription =
              shouldCollapse && !isExpanded
                ? `${fullDescription.slice(0, NOTE_PREVIEW_MAX_LENGTH).trimEnd()}...`
                : fullDescription;

            return (
              <article key={item.id} className={styles.infoListCard}>
                <button
                  type="button"
                  className={styles.infoListButton}
                  onClick={() => handleJumpToBlock(item.blockId)}
                >
                  <span className={styles.infoListTitle}>{item.expression}</span>
                  <span className={styles.infoListDescription}>
                    {previewDescription}
                    {shouldCollapse ? (
                      <>
                        {" "}
                        <button
                          type="button"
                          className={styles.infoInlineExpandButton}
                          onClick={(event) => {
                            event.stopPropagation();
                            setExpandedNoteIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.id)) {
                                next.delete(item.id);
                              } else {
                                next.add(item.id);
                              }
                              return next;
                            });
                          }}
                        >
                          {isExpanded ? "Kevesebb" : "Tovabbiak..."}
                        </button>
                      </>
                    ) : null}
                  </span>
                  <span className={styles.infoListMeta}>
                    {item.chapterIndex}.f / {item.blockIndex}.b
                  </span>
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );

  const renderBookmarkNavigator = (mobile: boolean) => (
    <section className={mobile ? styles.mobileInfoBlock : styles.infoColumn}>
      <header className={styles.infoColumnHeader}>
        <strong>Konyvjelzok</strong>
        <span>Tarolt poziciok</span>
      </header>
      <div className={styles.infoColumnBody}>
        {bookmarkNavigatorItems.length === 0 ? (
          <div className={styles.infoEmptyState}>Nincs tarolt konyvjelzo.</div>
        ) : (
          bookmarkNavigatorItems.map(({ entry, placement }) => (
            <button
              key={entry.id}
              type="button"
              className={styles.infoListButton}
              onClick={() => handleJumpToBookmark(entry.id)}
            >
              <span className={styles.infoListTitle}>
                <span
                  className={styles.infoBookmarkSwatch}
                  style={{ "--bookmark-color": bookmarkColorByKey[entry.colorKey] ?? BOOKMARK_COLOR_OPTIONS[0].color } as CSSProperties}
                  aria-hidden="true"
                />
                {entry.name || "Nev nelkul"}
              </span>
              <span className={styles.infoListDescription}>
                {entry.kind === "progress" ? "Haladas jelzo" : "Fontos jeloles"}
              </span>
              <span className={styles.infoListMeta}>
                {placement ? `${placement.chapterIndex}.f / ${placement.block.blockIndex}.b` : "n/a"}
              </span>
            </button>
          ))
        )}
      </div>
    </section>
  );

  const renderDesktopInformationPanel = () => (
    <section className={`card ${styles.progressCard} ${styles.infoPanelCard}`}>
      <div className={styles.infoPanelGrid}>
        {renderChapterNavigator(false)}
        {renderNoteNavigator(false)}
        {renderBookmarkNavigator(false)}
      </div>
    </section>
  );

  const renderMobileInfoPage = (page: Exclude<MobileDashboardPage, "original" | "translated">) => {
    if (page === "toc") {
      return <section className={`card ${styles.mobileInfoCard}`}>{renderChapterNavigator(true)}</section>;
    }
    if (page === "notes") {
      return <section className={`card ${styles.mobileInfoCard}`}>{renderNoteNavigator(true)}</section>;
    }
    return <section className={`card ${styles.mobileInfoCard}`}>{renderBookmarkNavigator(true)}</section>;
  };

  const renderMobilePageTabs = () => (
    <nav className={styles.mobilePageTabs} aria-label="Mobil oldalak">
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "original" ? styles.mobilePageTabActive : ""}`}
        onClick={() => {
          setMobilePage("original");
          setStore((prev) => ({ ...prev, activePanel: "original", panelMode: "single" }));
        }}
      >
        Eredeti
      </button>
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "translated" ? styles.mobilePageTabActive : ""}`}
        onClick={() => {
          setMobilePage("translated");
          setStore((prev) => ({ ...prev, activePanel: "translated", panelMode: "single" }));
        }}
      >
        Szerkesztett
      </button>
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "toc" ? styles.mobilePageTabActive : ""}`}
        onClick={() => setMobilePage("toc")}
      >
        Tartalom
      </button>
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "notes" ? styles.mobilePageTabActive : ""}`}
        onClick={() => setMobilePage("notes")}
      >
        Jegyzetek
      </button>
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "bookmarks" ? styles.mobilePageTabActive : ""}`}
        onClick={() => setMobilePage("bookmarks")}
      >
        Konyvjelzok
      </button>
    </nav>
  );

  const renderMobileContent = () => {
    if (mobilePage === "toc" || mobilePage === "notes" || mobilePage === "bookmarks") {
      return renderMobileInfoPage(mobilePage);
    }

    const panels =
      store.viewState === "reader"
        ? { primary: "translated" as DashboardActivePanel, secondary: "original" as DashboardActivePanel }
        : { primary: "original" as DashboardActivePanel, secondary: "translated" as DashboardActivePanel };

    if (store.panelMode === "stacked") {
      if (store.viewState === "reader") {
        return (
          <div className={styles.mobileStack}>
            {renderTranslatedPanel(false, false)}
            {renderOriginalPanel(false, false)}
          </div>
        );
      }
      return (
        <div className={styles.mobileStack}>
          {renderOriginalPanel(true, false)}
          {renderTranslatedPanel(true, false)}
        </div>
      );
    }

    if (mobilePage === "original" || store.activePanel === "original") {
      return renderOriginalPanel(store.viewState === "workbench", false);
    }
    if (mobilePage === "translated" || store.activePanel === "translated") {
      return renderTranslatedPanel(store.viewState === "workbench", false);
    }
    return panels.primary === "original"
      ? renderOriginalPanel(store.viewState === "workbench", false)
      : renderTranslatedPanel(store.viewState === "workbench", false);
  };

  const pageStyle = { "--panel-accent-color": panelAccentColor } as CSSProperties;
  const renderBookMetaSection = () => {
    if (!isReady) return null;

    return (
      <section className={`card ${styles.progressCard} ${styles.desktopMetaCard}`}>
        <section className={styles.editPanel}>
          <div className={styles.editGrid}>
            <label className={styles.editField}>
              <span>Cim</span>
              <input
                className="input"
                value={editForm.title}
                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="pl. A jo palocok"
              />
            </label>
            <label className={styles.editField}>
              <span>Szerzo</span>
              <input
                className="input"
                value={editForm.author}
                onChange={(event) => setEditForm((prev) => ({ ...prev, author: event.target.value }))}
                placeholder="pl. Mikszath Kalman"
              />
            </label>
            <label className={styles.editField}>
              <span>Ev</span>
              <input
                className="input"
                value={editForm.year}
                onChange={(event) => setEditForm((prev) => ({ ...prev, year: event.target.value }))}
                placeholder="pl. 1901"
                inputMode="numeric"
              />
            </label>
            <label className={styles.editField}>
              <span>Ikon (slug)</span>
              <input
                className="input"
                value={editForm.icon}
                onChange={(event) => setEditForm((prev) => ({ ...prev, icon: event.target.value }))}
                placeholder="pl. golyakalifa"
              />
            </label>
          </div>

          <label className={styles.editField}>
            <span>Rovid leiras</span>
            <textarea
              className={styles.editTextarea}
              value={editForm.description}
              onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="2 mondatos osszefoglalo."
            />
          </label>

          <div className={styles.editActions}>
            <button className="btn" type="button" onClick={handleGenerateSummary} disabled={isSummaryGenerating}>
              {isSummaryGenerating ? "Generalas..." : "Leiras generalasa"}
            </button>
          </div>

          {iconPreviewPath ? (
            <div className={styles.iconPreview}>
              <div className={styles.iconPreviewImage} style={{ backgroundImage: iconPreviewPath }} />
              <span>{iconPreviewSlug}</span>
            </div>
          ) : null}

          {editFeedback ? <div className={styles.editFeedback}>{editFeedback}</div> : null}

          <div className={styles.editActions}>
            <button className="btn" type="button" onClick={handleEditSubmit} disabled={isEditSaving}>
              {isEditSaving ? "Mentese..." : "Mentes"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setEditFeedback(null);
                setEditForm(toBookEditForm(state.data));
              }}
              disabled={isEditSaving}
            >
              Visszaallitas
            </button>
          </div>
        </section>
      </section>
    );
  };

  const renderBookmarkPalette = (size: "desktop" | "mobile") => (
    <div className={size === "desktop" ? styles.bookmarkPalette : styles.mobileBookmarkPalette} role="radiogroup" aria-label="Konyvjelzo szinkategoria">
      {BOOKMARK_COLOR_OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={activeBookmarkColorKey === option.key}
          className={`${styles.bookmarkPaletteSwatch} ${activeBookmarkColorKey === option.key ? styles.bookmarkPaletteSwatchActive : ""}`}
          title={option.label}
          disabled={!selectedBookmark}
          onClick={() =>
            setBookmarks((prev) =>
              prev.map((entry) =>
                entry.id === selectedBookmarkId ? { ...entry, colorKey: option.key } : entry,
              ),
            )
          }
          style={{ "--bookmark-color": option.color } as CSSProperties}
        />
      ))}
    </div>
  );

  const renderMobileToolPanel = () => {
    if (!isMobile || state.status !== "ready") return null;

    return (
      <>
        <button
          type="button"
          className={styles.mobileToolFab}
          aria-label="Tool panel megnyitasa"
          aria-expanded={mobileToolPanelOpen}
          onClick={() => setMobileToolPanelOpen(true)}
        >
          <ToolIcon type="admin" />
        </button>

        {mobileToolPanelOpen ? (
          <>
            <button
              type="button"
              className={styles.mobileToolBackdrop}
              aria-label="Tool panel bezarasa"
              onClick={() => setMobileToolPanelOpen(false)}
            />
            <section className={styles.mobileToolSheet} aria-label="Dashboard tool panel">
              <div className={styles.mobileToolSheetTitle}>
                <span>Tool panel</span>
                <ToolIcon type="admin" />
              </div>
              <div className={styles.mobileToolRows}>
                <button
                  className={`${styles.mobileToolRow} ${store.desktopLayout === "single" ? styles.mobileToolRowActive : ""}`}
                  type="button"
                  onClick={() => {
                    setStore((prev) => ({ ...prev, desktopLayout: "single" }));
                    setMobileToolPanelOpen(false);
                  }}
                >
                  <span>Egy oldalas nezet</span>
                  <ToolIcon type="single" />
                </button>
                <button
                  className={`${styles.mobileToolRow} ${store.desktopLayout === "split" ? styles.mobileToolRowActive : ""}`}
                  type="button"
                  onClick={() => {
                    setStore((prev) => ({ ...prev, desktopLayout: "split" }));
                    setMobileToolPanelOpen(false);
                  }}
                >
                  <span>Osztott nezet</span>
                  <ToolIcon type="split" />
                </button>
                <button
                  className={`${styles.mobileToolRow} ${store.viewState === "workbench" ? styles.mobileToolRowActive : ""}`}
                  type="button"
                  data-onboarding-id="onb-mode-controls"
                  onClick={() => {
                    handleModeToggle("workbench");
                    setMobileToolPanelOpen(false);
                  }}
                >
                  <span>Workbench</span>
                  <ToolIcon type="workbench" />
                </button>
                <button
                  className={`${styles.mobileToolRow} ${store.viewState === "reader" ? styles.mobileToolRowActive : ""}`}
                  type="button"
                  disabled={!canReader}
                  title={!canReader ? readerDisabledReason : undefined}
                  onClick={() => {
                    handleModeToggle("reader");
                    setMobileToolPanelOpen(false);
                  }}
                >
                  <span>Reader</span>
                  <ToolIcon type="reader" />
                </button>
                <button
                  className={`${styles.mobileToolRow} ${store.activePanel === "original" ? styles.mobileToolRowActive : ""}`}
                  type="button"
                  onClick={() => {
                    setMobilePage("original");
                    setStore((prev) => ({ ...prev, activePanel: "original", panelMode: "single" }));
                    setMobileToolPanelOpen(false);
                  }}
                >
                  <span>Eredeti panel</span>
                  <ToolIcon type="swap" />
                </button>
                <button
                  className={`${styles.mobileToolRow} ${store.activePanel === "translated" ? styles.mobileToolRowActive : ""}`}
                  type="button"
                  onClick={() => {
                    setMobilePage("translated");
                    setStore((prev) => ({ ...prev, activePanel: "translated", panelMode: "single" }));
                    setMobileToolPanelOpen(false);
                  }}
                >
                  <span>Szerkesztett panel</span>
                  <ToolIcon type="swap" />
                </button>
                <button
                  className={`${styles.mobileToolRow} ${store.syncScroll ? styles.mobileToolRowActive : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={store.syncScroll}
                  onClick={() => setStore((prev) => ({ ...prev, syncScroll: !prev.syncScroll }))}
                >
                  <span>Szinkron gorgetes: {store.syncScroll ? "ON" : "OFF"}</span>
                  <ToolIcon type="sync" />
                </button>
                <button
                  className={`${styles.mobileToolRow} ${onboardingGuideOpen ? styles.mobileToolRowActive : ""}`}
                  type="button"
                  data-onboarding-id="onb-replay"
                  onClick={handleOpenOnboardingGuide}
                >
                  <span>Onboarding sugo</span>
                  <ToolIcon type="onboarding" />
                </button>
                <div className={styles.mobileBookmarkColorControl}>
                  <span>Kategoria</span>
                  {renderBookmarkPalette("mobile")}
                </div>
                {hasBookmarks ? (
                  <>
                    <div className={styles.mobileBookmarkList}>
                      {bookmarks.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          className={`${styles.mobileToolRow} ${selectedBookmarkId === entry.id ? styles.mobileToolRowActive : ""}`}
                          onClick={() => setSelectedBookmarkId(entry.id)}
                        >
                          <span>{entry.kind === "progress" ? "Haladas" : "Fontos"}: {entry.name || "Nev nelkul"}</span>
                          <ToolIcon type="bookmark" />
                        </button>
                      ))}
                    </div>
                    <label className={styles.mobileBookmarkNameControl}>
                      <span>Label</span>
                      <input
                        className={`input ${styles.mobileBookmarkNameInput}`}
                        value={selectedBookmark?.name ?? ""}
                        onChange={(event) =>
                          setBookmarks((prev) =>
                            prev.map((entry) =>
                              entry.id === selectedBookmarkId ? { ...entry, name: event.target.value } : entry,
                            ),
                          )
                        }
                        placeholder="Konyvjelzo label"
                        aria-label="Konyvjelzo label"
                        disabled={!selectedBookmark}
                      />
                    </label>
                    <button
                      className={`${styles.mobileToolRow} ${styles.mobileToolRowActive}`}
                      type="button"
                      disabled={!selectedBookmark}
                      onClick={() => {
                        handleJumpToBookmark();
                        setMobileToolPanelOpen(false);
                      }}
                    >
                      <span>Ugras a konyvjelzohoz</span>
                      <ToolIcon type="bookmark" />
                    </button>
                    <button
                      className={styles.mobileToolRow}
                      type="button"
                      onClick={() => {
                        if (!selectedBookmarkId) return;
                        setBookmarks((prev) => prev.filter((entry) => entry.id !== selectedBookmarkId));
                      }}
                    >
                      <span>Konyvjelzo torlese</span>
                      X
                    </button>
                  </>
                ) : null}
              </div>
            </section>
          </>
        ) : null}
      </>
    );
  };

  const renderOnboardingPopup = () => {
    if (!currentOnboardingStep || !onboardingPopupPosition) return null;
    const stepIndex = findOnboardingStepIndex(currentOnboardingStep.id);
    const positionStyle = {
      "--onb-popup-left": `${Math.round(onboardingPopupPosition.left)}px`,
      "--onb-popup-top": `${Math.round(onboardingPopupPosition.top)}px`,
      "--onb-popup-max-width": `${Math.round(onboardingPopupPosition.maxWidth)}px`,
    } as CSSProperties;
    const isGuidePreview = Boolean(onboardingSelectedStepId);
    const anchorAvailable = findVisibleOnboardingAnchor(currentOnboardingStep.anchorId) !== null;

    return (
      <section
        className={styles.onboardingPopup}
        style={positionStyle}
        data-placement={currentOnboardingStep.placement}
        aria-live="polite"
      >
        <div className={styles.onboardingPopupHeader}>
          <strong>{currentOnboardingStep.title}</strong>
          <span>
            {stepIndex + 1}/{BOOK_EDITORIAL_ONBOARDING_STEPS.length}
          </span>
        </div>
        <p className={styles.onboardingPopupBody}>{currentOnboardingStep.body}</p>
        {!anchorAvailable ? (
          <p className={styles.onboardingPopupHint}>Ehhez a lepeshez most nincs aktiv horgonypont a nezetben.</p>
        ) : null}
        {isGuidePreview ? (
          <p className={styles.onboardingPopupHint}>Sugo nezet: valassz masik lepest az onboarding panelen.</p>
        ) : null}
        <div className={styles.onboardingPopupActions}>
          <button type="button" className="btn" onClick={handleOnboardingNext}>
            {currentOnboardingStep.id === "step_done" ? "Kesz" : "Kovetkezo"}
          </button>
          {isGuidePreview ? (
            <button type="button" className="btn" onClick={() => setOnboardingSelectedStepId(null)}>
              Flow folytatasa
            </button>
          ) : currentOnboardingStep.skippable ? (
            <button type="button" className="btn" onClick={handleOnboardingSkip}>
              Kihagyas
            </button>
          ) : null}
        </div>
      </section>
    );
  };

  const renderOnboardingGuide = () => {
    if (state.status !== "ready" || !onboardingGuideOpen) return null;
    const highlightedStepId = onboardingSelectedStepId ?? currentOnboardingStep?.id ?? null;

    return (
      <section className={styles.onboardingGuidePanel} aria-label="Onboarding sugo lepesek">
        <div className={styles.onboardingGuideHeader}>
          <strong>Onboarding sugo</strong>
          <button
            type="button"
            className={styles.onboardingGuideClose}
            onClick={() => {
              setOnboardingGuideOpen(false);
              setOnboardingSelectedStepId(null);
            }}
          >
            X
          </button>
        </div>
        <div className={styles.onboardingGuideList}>
          {BOOK_EDITORIAL_ONBOARDING_STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              className={`${styles.onboardingGuideItem} ${highlightedStepId === step.id ? styles.onboardingGuideItemActive : ""}`}
              onClick={() => handleSelectOnboardingGuideStep(step.id)}
            >
              {step.title}
            </button>
          ))}
        </div>
        <div className={styles.onboardingGuideActions}>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setOnboardingSelectedStepId(null);
              handleOnboardingReplay();
            }}
          >
            Ujrainditas
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setOnboardingSelectedStepId(null)}
          >
            Flow nezet
          </button>
        </div>
      </section>
    );
  };

  return (
    <div
      className={`book-page-shell ${styles.pageShell}`}
      style={pageStyle}
      data-onboarding-step-id={currentOnboardingStep?.id ?? ""}
    >
      <header className={styles.header}>
        <ShellTopBar
          className={styles.topBar}
          href="/"
          title={bookTitle}
          subtitle={bookAuthor}
          ariaLabel="Konyv oldal"
          middleSlot={
            topbarIconSlug ? (
              <span className={styles.topBarBookIcon} aria-hidden="true">
                <BookCoverIcon slug={topbarIconSlug} title={`${bookTitle} borito ikon`} />
              </span>
            ) : null
          }
          rightSlot={
            <div className={styles.topBarRight}>
              <Link className={styles.topBarBackButton} href="/" aria-label="Vissza a konyvtarba" title="Vissza a konyvtarba">
                <ToolIcon type="back" />
              </Link>
            </div>
          }
        />
      </header>

    <main className={styles.main}>
      {state.status === "booting" ? (
        <div className="card">Betoltes...</div>
      ) : state.status === "error" ? (
        <div className="card">
          <div style={{ fontWeight: 650, marginBottom: 6 }}>Dashboard hiba</div>
          <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>{state.message}</div>
          <div style={{ marginTop: 12 }}>
            <button className="btn" type="button" onClick={() => loadDashboard()}>
              Ujraprobalas
            </button>
          </div>
        </div>
      ) : blocks.length === 0 ? (
        <div className="card">Ehhez a konyvhoz meg nincs blokk.</div>
      ) : isMobile ? (
        <div className={styles.mobileStage}>
          {renderMobilePageTabs()}
          {renderMobileContent()}
          <section className={`card ${styles.progressCard}`} data-onboarding-id="onb-progress">
            <div className={styles.progressSummary}>
              <div className={styles.progressPercent}>{progress}%</div>
              <div className={styles.progressLabel}>
                Completion: <span>{completion.accepted}</span> / <span>{completion.total}</span>
              </div>
            </div>
            <div
              className={`${styles.progressTrack} ${progress === 100 ? styles.progressTrackComplete : ""}`}
              aria-label={`Completion ${progress}%`}
            >
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.desktopStage}>
          <div className={styles.desktopViewport}>
            {store.viewState === "workbench" ? renderWorkbenchDesktop() : renderReaderDesktop()}
          </div>
          <section
            className={`card ${styles.progressCard} ${styles.desktopProgress}`}
            data-onboarding-id="onb-progress"
          >
            <div className={styles.progressSummary}>
              <div className={styles.progressPercent}>{progress}%</div>
              <div className={styles.progressLabel}>
                Completion: <span>{completion.accepted}</span> / <span>{completion.total}</span>
              </div>
            </div>
            <div
              className={`${styles.progressTrack} ${progress === 100 ? styles.progressTrackComplete : ""}`}
              aria-label={`Completion ${progress}%`}
            >
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
          </section>
          {renderDesktopInformationPanel()}
          {desktopEditPanelOpen ? renderBookMetaSection() : null}
        </div>
      )}
    </main>

      {!isMobile && state.status === "ready" ? (
        <aside className={styles.sidebar}>
          <section className={`card ${styles.activityPanel}`}>
            <div className={styles.activityGroup}>
              <div className={styles.activityGroupTitle}>Nezet</div>
              <div className={styles.activityOptions}>
                <button
                  className={`${styles.activityIconButton} ${store.desktopLayout === "single" ? styles.activeToggle : ""}`}
                  type="button"
                  onClick={() =>
                    setStore((prev) => ({
                      ...prev,
                      desktopLayout: "single",
                      activePanel: prev.activePanel ?? "translated",
                    }))
                  }
                  aria-label="Egy oldalas nezet"
                  title="Egy oldalas nezet"
                >
                  <ToolIcon type="single" />
                </button>
                <button
                  className={`${styles.activityIconButton} ${store.desktopLayout === "split" ? styles.activeToggle : ""}`}
                  type="button"
                  onClick={() => setStore((prev) => ({ ...prev, desktopLayout: "split" }))}
                  aria-label="Osztott nezet"
                  title="Osztott nezet"
                >
                  <ToolIcon type="split" />
                </button>
              </div>
            </div>

            <div className={styles.activityGroup}>
              <div className={styles.activityGroupTitle}>Onboarding</div>
              <div className={styles.activityOptions}>
                <button
                  className={`${styles.activityIconButton} ${onboardingGuideOpen ? styles.activeToggle : ""}`}
                  type="button"
                  data-onboarding-id="onb-replay"
                  aria-label="Onboarding sugo"
                  title="Onboarding sugo"
                  onClick={handleOpenOnboardingGuide}
                >
                  <ToolIcon type="onboarding" />
                </button>
              </div>
            </div>

            <div className={styles.activityGroup}>
              <div className={styles.activityGroupTitle}>Konyvjelzo</div>
              <div className={styles.activityOptions}>
                <label className={styles.bookmarkColorControl}>
                  <span>Kategoria</span>
                  {renderBookmarkPalette("desktop")}
                </label>
                {hasBookmarks ? (
                  <>
                    <div className={styles.bookmarkList}>
                      {bookmarks.map((entry) => {
                        const placement = bookmarkedPlacements.get(entry.markerId);
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            className={`${styles.bookmarkListItem} ${selectedBookmarkId === entry.id ? styles.bookmarkListItemActive : ""}`}
                            onClick={() => setSelectedBookmarkId(entry.id)}
                          >
                            <span className={styles.bookmarkListMeta}>
                              {entry.kind === "progress" ? "Haladas" : "Fontos"}
                            </span>
                            <span>{entry.name || "Nev nelkul"}</span>
                            <span className={styles.bookmarkListMeta}>
                              {placement ? `${placement.chapterIndex}.f / ${placement.block.blockIndex}.b` : "n/a"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <label className={styles.bookmarkNameControl}>
                      <span>Label</span>
                      <input
                        className={`input ${styles.bookmarkNameInput}`}
                        value={selectedBookmark?.name ?? ""}
                        onChange={(event) =>
                          setBookmarks((prev) =>
                            prev.map((entry) =>
                              entry.id === selectedBookmarkId ? { ...entry, name: event.target.value } : entry,
                            ),
                          )
                        }
                        placeholder="Konyvjelzo label"
                        aria-label="Konyvjelzo label"
                        disabled={!selectedBookmark}
                      />
                    </label>
                    <button
                      className={styles.activityIconButton}
                      type="button"
                      disabled={!selectedBookmark}
                      onClick={() => handleJumpToBookmark()}
                      aria-label="Ugras a konyvjelzohoz"
                      title="Ugras a konyvjelzohoz"
                    >
                      <ToolIcon type="bookmark" />
                    </button>
                    <button
                      className={styles.bookmarkClearButton}
                      type="button"
                      onClick={() => {
                        if (!selectedBookmarkId) return;
                        setBookmarks((prev) => prev.filter((entry) => entry.id !== selectedBookmarkId));
                      }}
                    >
                      Konyvjelzo torlese
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <div className={styles.activityGroup}>
              <div className={styles.activityGroupTitle}>Szerkesztes</div>
              <div className={styles.activityOptions}>
                <button
                  className={`${styles.activityIconButton} ${desktopEditPanelOpen ? styles.activeToggle : ""}`}
                  type="button"
                  aria-label={desktopEditPanelOpen ? "Book edit panel elrejtese" : "Book edit panel megjelenitese"}
                  title={desktopEditPanelOpen ? "Book edit panel elrejtese" : "Book edit panel megjelenitese"}
                  onClick={() => setDesktopEditPanelOpen((prev) => !prev)}
                >
                  <ToolIcon type="admin" />
                </button>
              </div>
            </div>

          </section>
        </aside>
      ) : null}
      {renderOnboardingGuide()}
      {renderOnboardingPopup()}
      {renderMobileToolPanel()}
  </div>
);
}

