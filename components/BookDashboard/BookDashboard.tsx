"use client";

import {
  type ChangeEvent,
  type CSSProperties,
  Fragment,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GuestSessionActions } from "@/components/GuestSessionActions";
import { type AppRole, toSessionIdentity } from "@/lib/auth/identity";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  acceptBlockVariant,
  deleteEditedBlockVariant,
  ensureUserBookContext,
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
  | { status: "ready"; userId: string; role: AppRole; data: BookDashboardData };

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
type UndoVariantStatus = "draft" | "accepted" | "rejected";
type EditedPanelUndoVariantSnapshot = {
  id: string;
  owner_id: string | null;
  book_id: string;
  chapter_id: string;
  block_id: string;
  variant_index: number;
  status: UndoVariantStatus;
  text: string;
};
type EditedPanelUndoBlockSnapshot = {
  id: string;
  book_id: string;
  chapter_id: string;
  block_index: number;
  original_text: string;
};
type EditedPanelUndoSnapshotEntry = {
  blockId: string;
  bookId: string;
  block: EditedPanelUndoBlockSnapshot | null;
  variants: EditedPanelUndoVariantSnapshot[];
};
type EditedPanelUndoSnapshot = {
  actionLabel: string;
  createdAt: number;
  entries: EditedPanelUndoSnapshotEntry[];
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
type RuntimeAlertTone = "error" | "info";

type RuntimeAlertState = {
  id: number;
  tone: RuntimeAlertTone;
  message: string;
};

type ChapterTitleErrorState = {
  chapterId: string;
  message: string;
};

type PendingGenerationRequest =
  | { kind: "block"; block: DashboardBlock }
  | { kind: "batch"; source: "manual" | "scroll" }
  | { kind: "chapter"; group: ChapterGroup };

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

type ChapterBlockListProps = {
  group: ChapterGroup;
  textMode: DashboardActivePanel;
  showControls: boolean;
  panelAccentColor: string;
  isMobile: boolean;
  activeMobileBlockId: string | null;
  onMobileActivate: (blockId: string | null) => void;
  isAdminSourceEditMode: boolean;
  bookmarksByMarkerId: Map<string, DashboardBookmarkEntry[]>;
  bookmarkColorByKey: Record<string, string>;
  acceptingBlockId: string | null;
  generatingBlockId: string | null;
  deletingBlockId: string | null;
  manualSavingBlockId: string | null;
  creatingNoteBlockId: string | null;
  generateError: GenerateErrorState | null;
  noteError: NoteErrorState | null;
  manualEditError: ManualEditErrorState | null;
  dismissedSuggestions: Record<string, Set<number>>;
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
  showMergeHandles: boolean;
  mergingPairKey: string | null;
  chapterActionsBusy: boolean;
  chapterAddMode: boolean;
  chapterAddBusy: boolean;
  onMergeBlocks: (leftBlock: DashboardBlock, rightBlock: DashboardBlock) => void;
  onAddChapterFromBlock: (block: DashboardBlock) => void;
};

type DashboardPanelShellProps = {
  kind: "original" | "translated";
  title: string;
  showSwap: boolean;
  onSwap: () => void;
  swapLabel: string;
  swapTitle: string;
  bodyRef: { current: HTMLDivElement | null };
  onBodyScroll: () => void;
  onBodyClick: () => void;
  inlineErrorMessage?: string | null;
  children: ReactNode;
};

type ChapterSectionProps = {
  panelMode: "original" | "translated";
  group: ChapterGroup;
  textMode: DashboardActivePanel;
  showControls: boolean;
  panelAccentColor: string;
  isMobile: boolean;
  activeMobileBlockId: string | null;
  onMobileActivate: (blockId: string | null) => void;
  isAdminSourceEditMode: boolean;
  bookmarksByMarkerId: Map<string, DashboardBookmarkEntry[]>;
  bookmarkColorByKey: Record<string, string>;
  acceptingBlockId: string | null;
  generatingBlockId: string | null;
  deletingBlockId: string | null;
  manualSavingBlockId: string | null;
  creatingNoteBlockId: string | null;
  generateError: GenerateErrorState | null;
  noteError: NoteErrorState | null;
  manualEditError: ManualEditErrorState | null;
  dismissedSuggestions: Record<string, Set<number>>;
  chapterEdit: { chapterId: string; chapterIndex: number; title: string } | null;
  chapterActionsBusy: boolean;
  chapterTitleGeneratingId: string | null;
  chapterTitleError: ChapterTitleErrorState | null;
  chapterAddMode: boolean;
  chapterAddBusy: boolean;
  chapterEditError: string | null;
  showMergeHandles: boolean;
  mergingPairKey: string | null;
  handlers: ChapterSectionHandlers;
};

type ChapterSectionHandlers = {
  onChapterEditOpen: (group: ChapterGroup) => void;
  onChapterEditTitleChange: (chapterId: string, value: string) => void;
  onChapterEditSave: () => void;
  onChapterEditCancel: () => void;
  onChapterDelete: (group: ChapterGroup) => void;
  onChapterTitleGenerate: (group: ChapterGroup) => void;
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
  onMergeBlocks: (leftBlock: DashboardBlock, rightBlock: DashboardBlock) => void;
  onAddChapterFromBlock: (block: DashboardBlock) => void;
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
const EMPTY_NUMBER_SET = new Set<number>();
const EMPTY_COMPLETION = { accepted: 0, total: 0, ratio: 0, isComplete: false };
const IMPORTANT_BOOKMARK_DEFAULT_COLOR_KEY = "rose";
const MAX_UNACCEPTED_GENERATED_BLOCKS = 12;
const BATCH_GENERATE_CHUNK_SIZE = 4;
const AUTO_GENERATE_SCROLL_THRESHOLD_PX = 320;
const LLM_REQUEST_TIMEOUT_MS = 45_000;
const RUNTIME_ALERT_AUTO_DISMISS_MS = 7_000;

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

function inferOriginalPublicationYearFromMetadata(input: {
  description?: string | null;
  sourceFilename?: string | null;
}): string {
  const currentYear = new Date().getUTCFullYear();
  const text = `${input.description ?? ""} ${input.sourceFilename ?? ""}`;
  const yearMatches = [...text.matchAll(/\b(1[5-9]\d{2}|20\d{2})\b/g)];
  const candidateYears = yearMatches
    .map((entry) => Number(entry[1]))
    .filter((year) => Number.isFinite(year) && year <= currentYear);

  if (candidateYears.length > 0) {
    return `${Math.min(...candidateYears)}`;
  }

  return "";
}

function authorSpineColor(author: string): string {
  const normalized = normalizeAuthor(author);
  for (const rule of AUTHOR_SPINE_COLOR_RULES) {
    if (rule.match.some((name) => normalized.includes(name))) {
      return rule.color;
    }
  }
  return "#4A5C78";
}

function inferBookYear(book: BookDashboardData["book"]): string {
  const direct = book.publication_year ?? book.year;
  if (direct !== null && direct !== undefined && `${direct}`.trim() !== "") {
    return `${direct}`.trim();
  }
  return inferOriginalPublicationYearFromMetadata({
    description: book.description,
    sourceFilename: book.source_filename,
  });
}

function hasBookStoredYear(book: BookDashboardData["book"]): boolean {
  const direct = book.publication_year ?? book.year;
  return direct !== null && direct !== undefined && `${direct}`.trim() !== "";
}

function toBookEditForm(data: BookDashboardData): BookEditForm {
  return {
    title: data.book.title ?? "",
    author: data.book.author ?? "",
    year: inferBookYear(data.book),
    description: data.book.description ?? "",
    icon: data.book.cover_slug ?? data.book.background_slug ?? "",
  };
}

function resolveTopbarIconSlug(book: BookDashboardData["book"]): string {
  const fromCover = normalizeIconSlug(book.cover_slug ?? "");
  if (fromCover) return fromCover;
  return normalizeIconSlug(book.title ?? "");
}

function mapGenerateError(status: number, fallbackMessage?: string, retryAfterSeconds?: number | null): string {
  if (status === 429) {
    if (retryAfterSeconds && retryAfterSeconds > 0) {
      return `Tul sok generalasi keres erkezett. Probald ujra ${retryAfterSeconds} mp mulva.`;
    }
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

function parseRetryAfterSeconds(value: string | null): number | null {
  if (!value) return null;
  const asNumber = Number.parseInt(value, 10);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
  const asDate = Date.parse(value);
  if (Number.isNaN(asDate)) return null;
  const deltaSeconds = Math.ceil((asDate - Date.now()) / 1000);
  return deltaSeconds > 0 ? deltaSeconds : null;
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

function mapChapterTitleError(status: number, fallbackMessage?: string): string {
  if (status === 429) {
    return "Tul sok fejezetcim-generalasi keres erkezett. Varj egy kicsit, majd probald ujra.";
  }
  if (status === 400) {
    return "A fejezetcim most nem generalhato ehhez a fejezethez.";
  }
  if (status >= 500) {
    return "A fejezetcim-generalas most nem elerheto. Probald meg par perc mulva.";
  }
  if (fallbackMessage && fallbackMessage.trim()) {
    return fallbackMessage;
  }
  return "Sikertelen fejezetcim-generalas.";
}

function mapYearInferenceError(status: number, fallbackMessage?: string): string {
  if (status === 429) {
    return "Tul sok evbecslesi keres erkezett. Varj egy kicsit, majd probald ujra.";
  }
  if (status === 400) {
    return "A konyv adatai nem alkalmasak evbecslesre.";
  }
  if (status >= 500) {
    return "Az AI evbecsles most nem elerheto. Probald meg par perc mulva.";
  }
  if (fallbackMessage && fallbackMessage.trim()) {
    return fallbackMessage;
  }
  return "Sikertelen evbecsles.";
}

async function requestDraftGeneration(args: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  bookId: string;
  blockId: string;
  userComment?: string;
}): Promise<string> {
  const { supabase, bookId, blockId, userComment } = args;
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionErr || !accessToken) {
    throw new Error(sessionErr?.message ?? "Nem talalhato ervenyes munkamenet.");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), LLM_REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch("/api/llm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        action: "translate_block",
        bookId,
        blockId,
        options: {
          userComment: userComment?.trim() || undefined,
        },
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`A generalas timeout miatt megszakadt (${Math.round(LLM_REQUEST_TIMEOUT_MS / 1000)} mp).`);
    }
    throw new Error("A generalasi keres kuldese nem sikerult. Probald ujra.");
  } finally {
    window.clearTimeout(timeoutId);
  }

  const payload = (await response.json().catch(() => null)) as LlmResponse | null;
  if (!response.ok || !payload?.ok) {
    const fallbackMessage = payload && !payload.ok ? payload.error.message : undefined;
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get("Retry-After"));
    throw new Error(mapGenerateError(response.status, fallbackMessage, retryAfterSeconds));
  }
  if (!("variant" in payload) || !payload.variant?.text?.trim()) {
    throw new Error("A generalas ures valasszal tert vissza.");
  }
  return payload.variant.text.trim();
}

async function requestChapterTitleGeneration(args: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  bookId: string;
  chapterId: string;
  userComment?: string;
}): Promise<string> {
  const { supabase, bookId, chapterId, userComment } = args;
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
      action: "generate_chapter_title",
      bookId,
      chapterId,
      options: {
        userComment: userComment?.trim() || undefined,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as LlmResponse | null;
  if (!response.ok || !payload?.ok || !("chapterTitle" in payload)) {
    const fallbackMessage = payload && !payload.ok ? payload.error.message : undefined;
    throw new Error(mapChapterTitleError(response.status, fallbackMessage));
  }
  const title = payload.chapterTitle.trim();
  if (!title) throw new Error("Ures fejezetcim erkezett.");
  return title.slice(0, 160);
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

async function requestPublicationYearInference(args: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  bookId: string;
}): Promise<{ inferredYear: number | null; persisted: boolean }> {
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
      action: "infer_publication_year",
      bookId,
    }),
  });

  const payload = (await response.json().catch(() => null)) as LlmResponse | null;
  if (!response.ok || !payload?.ok || !("inferredYear" in payload)) {
    const fallbackMessage = payload && !payload.ok ? payload.error.message : undefined;
    throw new Error(mapYearInferenceError(response.status, fallbackMessage));
  }
  return { inferredYear: payload.inferredYear, persisted: payload.persisted };
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
                OK
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

function hasGeneratedEditedContent(block: Pick<DashboardBlock, "translatedText" | "originalText">): boolean {
  const translatedTrim = block.translatedText?.trim() ?? "";
  return translatedTrim.length > 0 && translatedTrim !== block.originalText.trim();
}

function deriveChapterTitleFromGeneratedText(args: {
  text: string;
  chapterIndex: number;
  maxLength?: number;
}): string {
  const maxLength = args.maxLength ?? 72;
  const cleaned = args.text
    .replace(/\[\[fn:\d+\]\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return `Fejezet ${args.chapterIndex}`;

  const firstSentenceMatch = cleaned.match(/^(.*?[.!?])(?:\s|$)/);
  const base = (firstSentenceMatch?.[1] ?? cleaned).trim();
  const compact = base.replace(/[.!?]+$/g, "").trim();
  if (!compact) return `Fejezet ${args.chapterIndex}`;
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trimEnd()}...`;
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
    | "bookmark"
    | "add"
    | "toc"
    | "notes"
    | "undo"
    | "redo"
    | "favorite";
}) {
  return <Icon name={type} />;
}

const BlockControls = memo(function BlockControls({
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
});
BlockControls.displayName = "BlockControls";

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

const BlockMergeHandle = memo(function BlockMergeHandle({
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
});
BlockMergeHandle.displayName = "BlockMergeHandle";

const BookmarkMarkerStripe = memo(function BookmarkMarkerStripe({
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
});
BookmarkMarkerStripe.displayName = "BookmarkMarkerStripe";

const ChapterHeader = memo(function ChapterHeader({
  group,
  showActions,
  isEditing,
  editTitle,
  actionBusy,
  titleGenerating,
  error,
  titleGenerateError,
  onStartEdit,
  onEditTitle,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onGenerateTitle,
}: {
  group: ChapterGroup;
  showActions: boolean;
  isEditing: boolean;
  editTitle: string;
  actionBusy: boolean;
  titleGenerating: boolean;
  error: string | null;
  titleGenerateError: string | null;
  onStartEdit: (group: ChapterGroup) => void;
  onEditTitle: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (group: ChapterGroup) => void;
  onGenerateTitle: (group: ChapterGroup) => void;
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
          <div className={styles.chapterTitleValueRow}>
            <strong>{group.chapterTitle}</strong>
            {showActions ? (
              <button
                className={styles.chapterTitleGenerateButton}
                type="button"
                onClick={() => onGenerateTitle(group)}
                disabled={actionBusy || titleGenerating}
                aria-label={`Fejezet ${group.chapterIndex} cimenek generalasa`}
                title="Fejezet cim generalasa"
              >
                <ActionIcon type="generate" />
              </button>
            ) : null}
          </div>
        )}
        {titleGenerateError ? <div className={styles.chapterInlineError}>{titleGenerateError}</div> : null}
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
});
ChapterHeader.displayName = "ChapterHeader";

const BlockCard = memo(function BlockCard({
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
  chapterAddMode,
  chapterAddBusy,
  onAddChapterFromBlock,
  accentColor,
  isMobile,
  mobileActionsVisible,
  onMobileActivate,
  isAdminSourceEditMode,
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
  chapterAddMode: boolean;
  chapterAddBusy: boolean;
  onAddChapterFromBlock: (block: DashboardBlock) => void;
  accentColor: string;
  isMobile: boolean;
  mobileActionsVisible: boolean;
  onMobileActivate: (blockId: string) => void;
  isAdminSourceEditMode: boolean;
  bookmarksBeforeBlock: DashboardBookmarkEntry[];
}) {
  const [selectionRange, setSelectionRange] = useState<BlockSelectionRange | null>(null);
  const [manualEditOpen, setManualEditOpen] = useState(false);
  const [manualDraftText, setManualDraftText] = useState("");
  const textRef = useRef<HTMLParagraphElement | null>(null);
  const text = useMemo(
    () =>
      textMode === "original" || isAdminSourceEditMode
        ? block.originalText
        : block.translatedText?.trim() || block.originalText,
    [block.originalText, block.translatedText, isAdminSourceEditMode, textMode],
  );
  const notesForCurrentText = useMemo(
    () =>
      textMode === "translated" && !isAdminSourceEditMode
        ? block.inlineNotes.filter((note) => note.anchorStart >= 0 && note.anchorEnd <= text.length)
        : [],
    [block.inlineNotes, isAdminSourceEditMode, text.length, textMode],
  );
  const suggestedRanges = useMemo(
    () =>
      textMode === "translated" && !isAdminSourceEditMode
        ? findSuggestedRanges(text, block.footnoteSuggestions, dismissedSuggestionNumbers)
        : [],
    [block.footnoteSuggestions, dismissedSuggestionNumbers, isAdminSourceEditMode, text, textMode],
  );
  const remainingSuggestionCount = useMemo(
    () => block.footnoteSuggestions.filter((item) => !dismissedSuggestionNumbers.has(item.number)).length,
    [block.footnoteSuggestions, dismissedSuggestionNumbers],
  );
  const explanationSignalCount = useMemo(
    () => remainingSuggestionCount + notesForCurrentText.length,
    [notesForCurrentText.length, remainingSuggestionCount],
  );
  const renderedText = useMemo(
    () =>
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
        : text,
    [block, notesForCurrentText, onApproveSuggestion, onRejectSuggestion, suggestedRanges, text],
  );
  const translatedTrim = block.translatedText?.trim() ?? "";
  const hasTranslatedContent = Boolean(translatedTrim);
  const hasEditedContent =
    textMode === "translated" &&
    !isAdminSourceEditMode &&
    hasTranslatedContent &&
    translatedTrim !== block.originalText.trim();
  const needsAttention =
    textMode === "translated" &&
    !isAdminSourceEditMode &&
    (block.workflowStatus === "rejected" || generateError !== null);
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
    setManualDraftText(
      textMode === "translated" && !isAdminSourceEditMode
        ? block.translatedText?.trim() || block.originalText
        : block.originalText,
    );
    setManualEditOpen(true);
  }, [block.originalText, block.translatedText, isAdminSourceEditMode, textMode]);

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
      data-chapter-add-mode={chapterAddMode ? "true" : "false"}
      onClick={(event) => {
        event.stopPropagation();
        if (chapterAddMode) {
          const target = event.target as HTMLElement | null;
          if (target?.closest("button, input, textarea, a, [role='button']")) return;
          if (!chapterAddBusy && showControls) {
            onAddChapterFromBlock(block);
          }
          return;
        }
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
            placeholder={isAdminSourceEditMode ? "Forras blokk szoveg" : "Tisztitott blokk szoveg"}
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
});
BlockCard.displayName = "BlockCard";

const ChapterBlockList = memo(function ChapterBlockList({
  group,
  textMode,
  showControls,
  panelAccentColor,
  isMobile,
  activeMobileBlockId,
  onMobileActivate,
  isAdminSourceEditMode,
  bookmarksByMarkerId,
  bookmarkColorByKey,
  acceptingBlockId,
  generatingBlockId,
  deletingBlockId,
  manualSavingBlockId,
  creatingNoteBlockId,
  generateError,
  noteError,
  manualEditError,
  dismissedSuggestions,
  onAccept,
  onGenerate,
  onDelete,
  onSaveManualEdit,
  onRejectToOriginal,
  onSetBookmarkBefore,
  onCreateNote,
  onApproveSuggestion,
  onRejectSuggestion,
  showMergeHandles,
  mergingPairKey,
  chapterActionsBusy,
  chapterAddMode,
  chapterAddBusy,
  onMergeBlocks,
  onAddChapterFromBlock,
}: ChapterBlockListProps) {
  return (
    <>
      {group.blocks.map((block, index) => {
        const nextBlock = group.blocks[index + 1];
        const currentMergeKey = nextBlock ? mergePairKey(block.id, nextBlock.id) : null;
        const currentMarkerId = bookmarkBeforeKey(block);
        const markerEntries = bookmarksByMarkerId.get(currentMarkerId) ?? [];
        const mergeBusy =
          Boolean(currentMergeKey) && mergingPairKey !== null && currentMergeKey === mergingPairKey;
        const mergeDisabled =
          mergingPairKey !== null ||
          chapterActionsBusy ||
          chapterAddMode ||
          chapterAddBusy ||
          acceptingBlockId !== null ||
          generatingBlockId !== null ||
          deletingBlockId !== null;

        return (
          <Fragment key={`${textMode}-row-${block.id}`}>
            {markerEntries.length > 0 ? (
              <BookmarkMarkerStripe
                markerId={currentMarkerId}
                entries={markerEntries}
                bookmarkColorByKey={bookmarkColorByKey}
              />
            ) : null}
            <BlockCard
              key={`${textMode}-${block.id}`}
              block={block}
              textMode={textMode}
              acceptInFlight={acceptingBlockId === block.id}
              generateInFlight={generatingBlockId === block.id}
              deleteInFlight={deletingBlockId === block.id}
              generateError={generateError?.blockId === block.id ? generateError.message : null}
              noteError={noteError?.blockId === block.id ? noteError.message : null}
              manualEditError={manualEditError?.blockId === block.id ? manualEditError.message : null}
              manualSaveInFlight={manualSavingBlockId === block.id}
              creatingNoteInFlight={creatingNoteBlockId === block.id}
              onAccept={onAccept}
              onGenerate={onGenerate}
              onDelete={onDelete}
              onSaveManualEdit={onSaveManualEdit}
              onRejectToOriginal={onRejectToOriginal}
              onSetBookmarkBefore={onSetBookmarkBefore}
              onCreateNote={onCreateNote}
              onApproveSuggestion={onApproveSuggestion}
              onRejectSuggestion={onRejectSuggestion}
              dismissedSuggestionNumbers={dismissedSuggestions[block.id] ?? EMPTY_NUMBER_SET}
              allowDelete={showControls}
              showControls={showControls}
              chapterAddMode={chapterAddMode}
              chapterAddBusy={chapterAddBusy}
              onAddChapterFromBlock={onAddChapterFromBlock}
              accentColor={panelAccentColor}
              isMobile={isMobile}
              mobileActionsVisible={isMobile && showControls && activeMobileBlockId === block.id}
              onMobileActivate={onMobileActivate}
              isAdminSourceEditMode={isAdminSourceEditMode}
              bookmarksBeforeBlock={markerEntries}
            />
            {showMergeHandles && showControls && nextBlock ? (
              <BlockMergeHandle
                leftBlock={block}
                rightBlock={nextBlock}
                mergeInFlight={mergeBusy}
                disabled={mergeDisabled}
                onMerge={onMergeBlocks}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
});
ChapterBlockList.displayName = "ChapterBlockList";

const ChapterSection = memo(function ChapterSection({
  panelMode,
  group,
  textMode,
  showControls,
  panelAccentColor,
  isMobile,
  activeMobileBlockId,
  onMobileActivate,
  isAdminSourceEditMode,
  bookmarksByMarkerId,
  bookmarkColorByKey,
  acceptingBlockId,
  generatingBlockId,
  deletingBlockId,
  manualSavingBlockId,
  creatingNoteBlockId,
  generateError,
  noteError,
  manualEditError,
  dismissedSuggestions,
  chapterEdit,
  chapterActionsBusy,
  chapterTitleGeneratingId,
  chapterTitleError,
  chapterAddMode,
  chapterAddBusy,
  chapterEditError,
  showMergeHandles,
  mergingPairKey,
  handlers,
}: ChapterSectionProps) {
  const isEditing = chapterEdit?.chapterId === group.chapterId;
  const titleGenerateError = chapterTitleError?.chapterId === group.chapterId ? chapterTitleError.message : null;

  return (
    <section
      key={`${panelMode}-chapter-${group.chapterId}`}
      className={styles.chapterGroup}
      data-dashboard-chapter-id={group.chapterId}
    >
      <ChapterHeader
        group={group}
        showActions={showControls}
        isEditing={isEditing}
        editTitle={isEditing ? chapterEdit.title : group.chapterTitle}
        actionBusy={chapterActionsBusy}
        titleGenerating={chapterTitleGeneratingId === group.chapterId}
        error={chapterEditError}
        titleGenerateError={titleGenerateError}
        onStartEdit={handlers.onChapterEditOpen}
        onEditTitle={(value) => handlers.onChapterEditTitleChange(group.chapterId, value)}
        onSaveEdit={handlers.onChapterEditSave}
        onCancelEdit={handlers.onChapterEditCancel}
        onDelete={handlers.onChapterDelete}
        onGenerateTitle={handlers.onChapterTitleGenerate}
      />
      <ChapterBlockList
        group={group}
        textMode={textMode}
        showControls={showControls}
        panelAccentColor={panelAccentColor}
        isMobile={isMobile}
        activeMobileBlockId={activeMobileBlockId}
        onMobileActivate={onMobileActivate}
        isAdminSourceEditMode={isAdminSourceEditMode}
        bookmarksByMarkerId={bookmarksByMarkerId}
        bookmarkColorByKey={bookmarkColorByKey}
        acceptingBlockId={acceptingBlockId}
        generatingBlockId={generatingBlockId}
        deletingBlockId={deletingBlockId}
        manualSavingBlockId={manualSavingBlockId}
        creatingNoteBlockId={creatingNoteBlockId}
        generateError={generateError}
        noteError={noteError}
        manualEditError={manualEditError}
        dismissedSuggestions={dismissedSuggestions}
        onAccept={handlers.onAccept}
        onGenerate={handlers.onGenerate}
        onDelete={handlers.onDelete}
        onSaveManualEdit={handlers.onSaveManualEdit}
        onRejectToOriginal={handlers.onRejectToOriginal}
        onSetBookmarkBefore={handlers.onSetBookmarkBefore}
        onCreateNote={handlers.onCreateNote}
        onApproveSuggestion={handlers.onApproveSuggestion}
        onRejectSuggestion={handlers.onRejectSuggestion}
        showMergeHandles={showMergeHandles}
        mergingPairKey={mergingPairKey}
        chapterActionsBusy={chapterActionsBusy}
        chapterAddMode={chapterAddMode}
        chapterAddBusy={chapterAddBusy}
        onMergeBlocks={handlers.onMergeBlocks}
        onAddChapterFromBlock={handlers.onAddChapterFromBlock}
      />
    </section>
  );
});
ChapterSection.displayName = "ChapterSection";

const DashboardPanelShell = memo(function DashboardPanelShell({
  kind,
  title,
  showSwap,
  onSwap,
  swapLabel,
  swapTitle,
  bodyRef,
  onBodyScroll,
  onBodyClick,
  inlineErrorMessage = null,
  children,
}: DashboardPanelShellProps) {
  return (
    <section className={styles.panel} data-panel-kind={kind}>
      <div className={styles.panelTitle}>
        <span>{title}</span>
        {showSwap ? (
          <button
            className={styles.panelSwapButton}
            type="button"
            onClick={onSwap}
            aria-label={swapLabel}
            title={swapTitle}
          >
            <Icon name="swap" size={16} />
          </button>
        ) : null}
      </div>
      <div className={styles.panelBody} ref={bodyRef} onScroll={onBodyScroll} onClick={onBodyClick}>
        {inlineErrorMessage ? <div className={styles.panelInlineError}>{inlineErrorMessage}</div> : null}
        {children}
      </div>
    </section>
  );
});
DashboardPanelShell.displayName = "DashboardPanelShell";

export function BookDashboard({ bookId }: { bookId: string }) {
  const router = useRouter();
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
  const [isYearInferring, setIsYearInferring] = useState(false);
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
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);
  const [undoFeedback, setUndoFeedback] = useState<string | null>(null);
  const [runtimeAlert, setRuntimeAlert] = useState<RuntimeAlertState | null>(null);
  const [lastEditedPanelUndo, setLastEditedPanelUndo] = useState<EditedPanelUndoSnapshot | null>(null);
  const [lastEditedPanelRedo, setLastEditedPanelRedo] = useState<EditedPanelUndoSnapshot | null>(null);
  const [isUndoApplying, setIsUndoApplying] = useState(false);
  const [isRedoApplying, setIsRedoApplying] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [autoGenerateOnScroll, setAutoGenerateOnScroll] = useState(false);
  const [autoTranslateChapterTitles, setAutoTranslateChapterTitles] = useState(false);
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
  const [chapterAddMode, setChapterAddMode] = useState(false);
  const [chapterAddSaving, setChapterAddSaving] = useState(false);
  const [chapterEditError, setChapterEditError] = useState<string | null>(null);
  const [chapterTitleGeneratingId, setChapterTitleGeneratingId] = useState<string | null>(null);
  const [chapterTitleError, setChapterTitleError] = useState<ChapterTitleErrorState | null>(null);
  const [generationCommentOpen, setGenerationCommentOpen] = useState(false);
  const [generationCommentDraft, setGenerationCommentDraft] = useState("");
  const [pendingGenerationRequest, setPendingGenerationRequest] = useState<PendingGenerationRequest | null>(null);
  const [mergingPairKey, setMergingPairKey] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [mobilePage, setMobilePage] = useState<MobileDashboardPage>("translated");
  const [mobileToolPanelOpen, setMobileToolPanelOpen] = useState(false);
  const [desktopEditPanelOpen, setDesktopEditPanelOpen] = useState(false);
  const [adminSourceEditMode, setAdminSourceEditMode] = useState(false);
  const [isSourceRestoreInFlight, setIsSourceRestoreInFlight] = useState(false);
  const [isBookDeleteInFlight, setIsBookDeleteInFlight] = useState(false);
  const [isFavoriteSaving, setIsFavoriteSaving] = useState(false);
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
  const autoYearInferenceAttemptedRef = useRef(false);
  const initializedView = useRef(false);
  const originalPanelRef = useRef<HTMLDivElement | null>(null);
  const translatedPanelRef = useRef<HTMLDivElement | null>(null);
  const syncLock = useRef<"original" | "translated" | null>(null);
  const autoBatchLockRef = useRef(false);
  const runtimeAlertSeqRef = useRef(0);
  const autoStopNoticeKeyRef = useRef<string | null>(null);

  const showRuntimeAlert = useCallback((message: string, tone: RuntimeAlertTone = "error") => {
    runtimeAlertSeqRef.current += 1;
    setRuntimeAlert({ id: runtimeAlertSeqRef.current, tone, message });
  }, []);

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
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const identity = toSessionIdentity(sessionData.session ?? null);
      if (sessionErr || !identity) {
        setState({
          status: "error",
          message: sessionErr?.message ?? "Nincs aktiv munkamenet. Lepj be a landing oldalon.",
        });
        return;
      }

      try {
        const context = await ensureUserBookContext({
          supabase,
          userId: identity.userId,
          requestedBookId: bookId,
        });
        if (context.resolvedBookId !== bookId) {
          router.replace(`/book/${context.resolvedBookId}`);
          return;
        }

        const data = await fetchBookDashboardData(supabase, context.resolvedBookId);
        setState({ status: "ready", userId: identity.userId, role: identity.role, data });
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
    [applyViewDefaults, bookId, router, supabase],
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    autoYearInferenceAttemptedRef.current = false;
  }, [bookId]);

  useEffect(() => {
    setLastEditedPanelUndo(null);
    setLastEditedPanelRedo(null);
    setUndoFeedback(null);
    setRuntimeAlert(null);
    autoStopNoticeKeyRef.current = null;
  }, [bookId]);

  useEffect(() => {
    if (!runtimeAlert) return;
    const alertId = runtimeAlert.id;
    const timer = window.setTimeout(() => {
      setRuntimeAlert((prev) => (prev && prev.id === alertId ? null : prev));
    }, RUNTIME_ALERT_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [runtimeAlert]);

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

  const generatedUnacceptedCount = useMemo(() => {
    if (state.status !== "ready") return 0;
    return state.data.blocks.filter((block) => hasGeneratedEditedContent(block) && !block.isAccepted).length;
  }, [state]);
  const remainingGenerateSlots = Math.max(0, MAX_UNACCEPTED_GENERATED_BLOCKS - generatedUnacceptedCount);
  const generationCandidates = useMemo(() => {
    if (state.status !== "ready") return [] as DashboardBlock[];
    return state.data.blocks.filter((block) => !block.isAccepted && !hasGeneratedEditedContent(block));
  }, [state]);
  const generationCapacityRemaining = Math.min(remainingGenerateSlots, generationCandidates.length);
  const isEditorBusy =
    acceptingBlockId !== null ||
    generatingBlockId !== null ||
    deletingBlockId !== null ||
    manualSavingBlockId !== null ||
    creatingNoteBlockId !== null ||
    chapterEditSaving ||
    chapterDeleteSaving ||
    chapterAddSaving ||
    chapterTitleGeneratingId !== null ||
    mergingPairKey !== null ||
    isUndoApplying ||
    isRedoApplying ||
    isSourceRestoreInFlight ||
    isBookDeleteInFlight;

  const captureEditedPanelUndoSnapshotFromBlockIds = useCallback(
    async (args: { blockIds: string[]; actionLabel: string }): Promise<EditedPanelUndoSnapshot> => {
      const uniqueBlockIds = [...new Set(args.blockIds.filter((id) => typeof id === "string" && id.trim().length > 0))];
      if (uniqueBlockIds.length === 0) {
        throw new Error("Nem talalhato blokk visszaallitasi menteshez.");
      }

      const blocksTable = supabase.from("blocks") as any;
      const variantsTable = supabase.from("variants") as any;

      const { data: blockRows, error: blockError } = await blocksTable
        .select("id,book_id,chapter_id,block_index,original_text")
        .eq("book_id", bookId)
        .in("id", uniqueBlockIds);
      if (blockError) throw new Error(blockError.message || "Sikertelen blokk visszaallitasi mentes.");

      const blockById = new Map<string, EditedPanelUndoBlockSnapshot>();
      for (const row of (blockRows as EditedPanelUndoBlockSnapshot[] | null) ?? []) {
        blockById.set(row.id, row);
      }

      const { data: variantRows, error: variantError } = await variantsTable
        .select("id,owner_id,book_id,chapter_id,block_id,variant_index,status,text")
        .eq("book_id", bookId)
        .in("block_id", uniqueBlockIds)
        .order("variant_index", { ascending: true });
      if (variantError) throw new Error(variantError.message || "Sikertelen varians visszaallitasi mentes.");

      const variantsByBlockId = new Map<string, EditedPanelUndoVariantSnapshot[]>();
      for (const row of (variantRows as EditedPanelUndoVariantSnapshot[] | null) ?? []) {
        const bucket = variantsByBlockId.get(row.block_id);
        const snapshotVariant = {
          id: row.id,
          owner_id: row.owner_id ?? null,
          book_id: row.book_id,
          chapter_id: row.chapter_id,
          block_id: row.block_id,
          variant_index: row.variant_index,
          status: row.status,
          text: row.text,
        } satisfies EditedPanelUndoVariantSnapshot;
        if (bucket) {
          bucket.push(snapshotVariant);
        } else {
          variantsByBlockId.set(row.block_id, [snapshotVariant]);
        }
      }

      const entries: EditedPanelUndoSnapshotEntry[] = uniqueBlockIds.map((blockIdValue) => ({
        blockId: blockIdValue,
        bookId,
        block: blockById.get(blockIdValue) ?? null,
        variants: variantsByBlockId.get(blockIdValue) ?? [],
      }));

      return {
        actionLabel: args.actionLabel,
        createdAt: Date.now(),
        entries,
      };
    },
    [bookId, supabase],
  );

  const captureEditedPanelUndoSnapshot = useCallback(
    async (args: { blocks: DashboardBlock[]; actionLabel: string }): Promise<EditedPanelUndoSnapshot> => {
      const uniqueBlocks = [...new Map(args.blocks.map((block) => [block.id, block])).values()];
      if (uniqueBlocks.length === 0) {
        throw new Error("Nem talalhato blokk visszaallitasi menteshez.");
      }

      const snapshot = await captureEditedPanelUndoSnapshotFromBlockIds({
        blockIds: uniqueBlocks.map((block) => block.id),
        actionLabel: args.actionLabel,
      });
      const fallbackByBlockId = new Map<string, EditedPanelUndoBlockSnapshot>();
      for (const block of uniqueBlocks) {
        fallbackByBlockId.set(block.id, {
          id: block.id,
          book_id: block.bookId,
          chapter_id: block.chapterId,
          block_index: block.blockIndex,
          original_text: block.originalText,
        });
      }

      return {
        ...snapshot,
        entries: snapshot.entries.map((entry) => ({
          ...entry,
          block: entry.block ?? fallbackByBlockId.get(entry.blockId) ?? null,
        })),
      };
    },
    [captureEditedPanelUndoSnapshotFromBlockIds],
  );

  const applyEditedPanelSnapshot = useCallback(
    async (args: { snapshot: EditedPanelUndoSnapshot; fallbackOwnerId: string }) => {
      const blocksTable = supabase.from("blocks") as any;
      const variantsTable = supabase.from("variants") as any;

      for (const entry of args.snapshot.entries) {
        const entryBookId = entry.block?.book_id ?? entry.bookId;
        const { data: existingBlock, error: existingBlockError } = await blocksTable
          .select("id")
          .eq("id", entry.blockId)
          .eq("book_id", entryBookId)
          .maybeSingle();
        if (existingBlockError) throw new Error(existingBlockError.message || "Sikertelen blokk visszaallitas ellenorzes.");

        if (!entry.block) {
          if (existingBlock) {
            const { error: deleteVariantsError } = await variantsTable
              .delete()
              .eq("book_id", entryBookId)
              .eq("block_id", entry.blockId);
            if (deleteVariantsError) throw new Error(deleteVariantsError.message || "Sikertelen varians torles.");

            const { error: deleteBlockError } = await blocksTable
              .delete()
              .eq("id", entry.blockId)
              .eq("book_id", entryBookId);
            if (deleteBlockError) throw new Error(deleteBlockError.message || "Sikertelen blokk torles.");
          }
          continue;
        }

        if (!existingBlock) {
          const { error: insertBlockError } = await blocksTable.insert({
            id: entry.block.id,
            book_id: entry.block.book_id,
            chapter_id: entry.block.chapter_id,
            block_index: entry.block.block_index,
            original_text: entry.block.original_text,
          });
          if (insertBlockError) throw new Error(insertBlockError.message || "Sikertelen blokk visszaallitas.");
        } else {
          const { error: updateBlockError } = await blocksTable
            .update({
              chapter_id: entry.block.chapter_id,
              block_index: entry.block.block_index,
              original_text: entry.block.original_text,
            })
            .eq("id", entry.block.id)
            .eq("book_id", entry.block.book_id);
          if (updateBlockError) throw new Error(updateBlockError.message || "Sikertelen blokk visszaallitas.");
        }

        const { error: clearVariantsError } = await variantsTable
          .delete()
          .eq("block_id", entry.block.id)
          .eq("book_id", entry.block.book_id);
        if (clearVariantsError) throw new Error(clearVariantsError.message || "Sikertelen varians visszaallitas torles.");

        if (entry.variants.length > 0) {
          const payload = entry.variants.map((variant) => ({
            id: variant.id,
            owner_id: variant.owner_id ?? args.fallbackOwnerId,
            book_id: variant.book_id,
            chapter_id: variant.chapter_id,
            block_id: variant.block_id,
            variant_index: variant.variant_index,
            status: variant.status,
            text: variant.text,
          }));
          const { error: restoreVariantsError } = await variantsTable.insert(payload);
          if (restoreVariantsError) throw new Error(restoreVariantsError.message || "Sikertelen varians visszaallitas.");
        }
      }
    },
    [supabase],
  );

  const handleUndoLastEditedPanelChange = useCallback(async () => {
    if (state.status !== "ready") return;
    if (!lastEditedPanelUndo || isEditorBusy) return;

    setUndoFeedback(null);
    setGenerateError(null);
    setIsUndoApplying(true);

    try {
      const redoSnapshot = await captureEditedPanelUndoSnapshotFromBlockIds({
        blockIds: lastEditedPanelUndo.entries.map((entry) => entry.blockId),
        actionLabel: `Ismetles: ${lastEditedPanelUndo.actionLabel}`,
      });
      await applyEditedPanelSnapshot({ snapshot: lastEditedPanelUndo, fallbackOwnerId: state.userId });

      await loadDashboard({ keepCurrentView: true });
      setLastEditedPanelUndo(null);
      setLastEditedPanelRedo(redoSnapshot);
      setUndoFeedback(`Visszaallitva: ${lastEditedPanelUndo.actionLabel}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen visszaallitas.";
      setUndoFeedback(message);
    } finally {
      setIsUndoApplying(false);
    }
  }, [applyEditedPanelSnapshot, captureEditedPanelUndoSnapshotFromBlockIds, isEditorBusy, lastEditedPanelUndo, loadDashboard, state]);

  const handleRedoLastEditedPanelChange = useCallback(async () => {
    if (state.status !== "ready") return;
    if (!lastEditedPanelRedo || isEditorBusy) return;

    setUndoFeedback(null);
    setGenerateError(null);
    setIsRedoApplying(true);

    try {
      const undoSnapshot = await captureEditedPanelUndoSnapshotFromBlockIds({
        blockIds: lastEditedPanelRedo.entries.map((entry) => entry.blockId),
        actionLabel: `Visszavonas: ${lastEditedPanelRedo.actionLabel}`,
      });
      await applyEditedPanelSnapshot({ snapshot: lastEditedPanelRedo, fallbackOwnerId: state.userId });
      await loadDashboard({ keepCurrentView: true });
      setLastEditedPanelRedo(null);
      setLastEditedPanelUndo(undoSnapshot);
      setUndoFeedback(`Ismetelve: ${lastEditedPanelRedo.actionLabel}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen ujraalkalmazas.";
      setUndoFeedback(message);
    } finally {
      setIsRedoApplying(false);
    }
  }, [applyEditedPanelSnapshot, captureEditedPanelUndoSnapshotFromBlockIds, isEditorBusy, lastEditedPanelRedo, loadDashboard, state]);

  const translateChapterTitlesFromGeneratedBlocks = useCallback(
    async (generatedBlocks: Array<{ chapterId: string; chapterIndex: number; translatedText: string }>) => {
      if (state.status !== "ready" || !autoTranslateChapterTitles || generatedBlocks.length === 0) return;
      const chaptersTable = supabase.from("chapters") as any;
      const currentTitleByChapterId = new Map<string, string>();
      for (const block of state.data.blocks) {
        if (!currentTitleByChapterId.has(block.chapterId)) {
          currentTitleByChapterId.set(block.chapterId, block.chapterTitle?.trim() ?? "");
        }
      }

      const candidateByChapterId = new Map<string, string>();
      for (const item of generatedBlocks) {
        if (candidateByChapterId.has(item.chapterId)) continue;
        const candidate = deriveChapterTitleFromGeneratedText({
          text: item.translatedText,
          chapterIndex: item.chapterIndex,
        });
        if (!candidate.trim()) continue;
        const current = currentTitleByChapterId.get(item.chapterId)?.trim() ?? "";
        if (current === candidate) continue;
        candidateByChapterId.set(item.chapterId, candidate);
      }

      for (const [chapterId, title] of candidateByChapterId) {
        const { error } = await chaptersTable.update({ title }).eq("id", chapterId).eq("book_id", bookId);
        if (error) throw new Error(error.message || "Sikertelen fejezetcim-frissites.");
      }
    },
    [autoTranslateChapterTitles, bookId, state, supabase],
  );

  const handleAccept = useCallback(
    async (block: DashboardBlock) => {
      if (state.status !== "ready") return;
      setAcceptingBlockId(block.id);
      try {
        const undoSnapshot = await captureEditedPanelUndoSnapshot({
          blocks: [block],
          actionLabel: `Elfogadas (${block.blockIndex}. blokk)`,
        });
        await acceptBlockVariant({
          supabase,
          userId: state.userId,
          block,
        });
        await loadDashboard({ keepCurrentView: true });
        setLastEditedPanelUndo(undoSnapshot);
        setLastEditedPanelRedo(null);
        setUndoFeedback(null);
        completeOnboardingByEvent("accept_success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen mentes.";
        setState({ status: "error", message });
      } finally {
        setAcceptingBlockId(null);
      }
    },
    [captureEditedPanelUndoSnapshot, completeOnboardingByEvent, loadDashboard, state, supabase],
  );

  const handleGenerate = useCallback(
    async (block: DashboardBlock, userComment?: string) => {
      if (state.status !== "ready") return;
      if (!hasGeneratedEditedContent(block) && !block.isAccepted && remainingGenerateSlots <= 0) {
        const message = `Elerted a ${MAX_UNACCEPTED_GENERATED_BLOCKS} elfogadatlan generalt blokk limitet. Elobb fogadj el vagy utasits el javaslatokat.`;
        setGenerateError({
          blockId: block.id,
          message,
        });
        showRuntimeAlert(message, "info");
        return;
      }
      setGenerateError(null);
      setBatchFeedback(null);
      setGeneratingBlockId(block.id);
      try {
        const undoSnapshot = await captureEditedPanelUndoSnapshot({
          blocks: [block],
          actionLabel: `Generalas (${block.blockIndex}. blokk)`,
        });
        const translatedText = await requestDraftGeneration({
          supabase,
          bookId,
          blockId: block.id,
          userComment,
        });
        await translateChapterTitlesFromGeneratedBlocks([
          { chapterId: block.chapterId, chapterIndex: block.chapterIndex, translatedText },
        ]);
        await loadDashboard({ keepCurrentView: true });
        setLastEditedPanelUndo(undoSnapshot);
        setLastEditedPanelRedo(null);
        setUndoFeedback(null);
        completeOnboardingByEvent("generate_success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen generalas.";
        setGenerateError({ blockId: block.id, message });
        showRuntimeAlert(message);
      } finally {
        setGeneratingBlockId(null);
      }
    },
    [
      bookId,
      captureEditedPanelUndoSnapshot,
      completeOnboardingByEvent,
      loadDashboard,
      remainingGenerateSlots,
      state.status,
      supabase,
      showRuntimeAlert,
      translateChapterTitlesFromGeneratedBlocks,
    ],
  );

  const handleBatchGenerate = useCallback(
    async (source: "manual" | "scroll" = "manual", userComment?: string) => {
      if (state.status !== "ready") return;
      if (autoBatchLockRef.current || isBatchGenerating || isEditorBusy) return;

      if (remainingGenerateSlots <= 0 || generationCandidates.length === 0) {
        const message =
          remainingGenerateSlots <= 0
            ? `Elerted a ${MAX_UNACCEPTED_GENERATED_BLOCKS} elfogadatlan generalt blokk limitet.`
            : "Nincs tovabbi generalhato blokk.";
        const reasonKey = remainingGenerateSlots <= 0 ? "limit-reached" : "no-candidates";
        if (source === "manual") {
          setBatchFeedback(message);
          showRuntimeAlert(message, "info");
        } else if (autoStopNoticeKeyRef.current !== reasonKey) {
          autoStopNoticeKeyRef.current = reasonKey;
          setBatchFeedback(message);
          showRuntimeAlert(message, "info");
        }
        return;
      }
      autoStopNoticeKeyRef.current = null;

      autoBatchLockRef.current = true;
      setIsBatchGenerating(true);
      setGenerateError(null);
      if (source === "manual") {
        setBatchFeedback("Tobb blokk generalasa folyamatban...");
      }

      const toGenerate = generationCandidates.slice(0, Math.min(BATCH_GENERATE_CHUNK_SIZE, remainingGenerateSlots));
      let successCount = 0;
      let failureCount = 0;
      let undoSnapshot: EditedPanelUndoSnapshot | null = null;
      const generatedForChapterTitles: Array<{ chapterId: string; chapterIndex: number; translatedText: string }> = [];

      try {
        undoSnapshot = await captureEditedPanelUndoSnapshot({
          blocks: toGenerate,
          actionLabel: `Tobb blokk generalasa (${toGenerate.length})`,
        });
        for (const block of toGenerate) {
          setGeneratingBlockId(block.id);
          try {
            const translatedText = await requestDraftGeneration({
              supabase,
              bookId,
              blockId: block.id,
              userComment,
            });
            generatedForChapterTitles.push({
              chapterId: block.chapterId,
              chapterIndex: block.chapterIndex,
              translatedText,
            });
            successCount += 1;
          } catch (error) {
            failureCount += 1;
            const message = error instanceof Error ? error.message : "Sikertelen generalas.";
            setGenerateError({ blockId: block.id, message });
          }
        }

        if (generatedForChapterTitles.length > 0) {
          await translateChapterTitlesFromGeneratedBlocks(generatedForChapterTitles);
        }
        if (successCount > 0 || failureCount > 0) {
          await loadDashboard({ keepCurrentView: true });
        }
        if (successCount > 0 && undoSnapshot) {
          setLastEditedPanelUndo(undoSnapshot);
          setLastEditedPanelRedo(null);
          setUndoFeedback(null);
        }
        if (successCount > 0) {
          completeOnboardingByEvent("generate_success");
        }
        if (source === "manual") {
          setBatchFeedback(
            failureCount > 0
              ? `Generalas kesz: ${successCount} sikeres, ${failureCount} sikertelen.`
              : `Generalas kesz: ${successCount} blokk.`,
          );
        }
        if (failureCount > 0) {
          showRuntimeAlert(
            failureCount > 1
              ? `A blokk-generalas reszben sikertelen (${failureCount} hiba).`
              : "A blokk-generalas kozben hiba tortent.",
          );
        }
      } finally {
        setGeneratingBlockId(null);
        setIsBatchGenerating(false);
        autoBatchLockRef.current = false;
      }
    },
    [
      bookId,
      completeOnboardingByEvent,
      generationCandidates,
      isBatchGenerating,
      isEditorBusy,
      loadDashboard,
      remainingGenerateSlots,
      state.status,
      supabase,
      showRuntimeAlert,
      translateChapterTitlesFromGeneratedBlocks,
    ],
  );

  const handleGenerateChapterTitle = useCallback(
    async (group: ChapterGroup, userComment?: string) => {
      if (state.status !== "ready") return;
      setChapterTitleError(null);
      setChapterTitleGeneratingId(group.chapterId);
      try {
        const nextTitle = await requestChapterTitleGeneration({
          supabase,
          bookId,
          chapterId: group.chapterId,
          userComment,
        });
        const chaptersTable = supabase.from("chapters") as any;
        const { error } = await chaptersTable.update({ title: nextTitle }).eq("id", group.chapterId).eq("book_id", bookId);
        if (error) throw new Error(error.message || "Sikertelen fejezetcim-mentes.");
        await loadDashboard({ keepCurrentView: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen fejezetcim-generalas.";
        setChapterTitleError({ chapterId: group.chapterId, message });
        showRuntimeAlert(message);
      } finally {
        setChapterTitleGeneratingId(null);
      }
    },
    [bookId, loadDashboard, showRuntimeAlert, state.status, supabase],
  );

  const openGenerationCommentModal = useCallback((request: PendingGenerationRequest) => {
    setPendingGenerationRequest(request);
    setGenerationCommentDraft("");
    setGenerationCommentOpen(true);
  }, []);

  const closeGenerationCommentModal = useCallback(() => {
    setGenerationCommentOpen(false);
    setPendingGenerationRequest(null);
    setGenerationCommentDraft("");
  }, []);

  const handleConfirmGenerationComment = useCallback(async () => {
    if (!pendingGenerationRequest) return;
    const comment = generationCommentDraft.trim();
    const request = pendingGenerationRequest;
    closeGenerationCommentModal();
    if (request.kind === "block") {
      await handleGenerate(request.block, comment);
      return;
    }
    if (request.kind === "batch") {
      await handleBatchGenerate(request.source, comment);
      return;
    }
    await handleGenerateChapterTitle(request.group, comment);
  }, [
    closeGenerationCommentModal,
    generationCommentDraft,
    handleBatchGenerate,
    handleGenerate,
    handleGenerateChapterTitle,
    pendingGenerationRequest,
  ]);

  const handleRequestBlockGenerate = useCallback(
    (block: DashboardBlock) => {
      if (isEditorBusy) return;
      openGenerationCommentModal({ kind: "block", block });
    },
    [isEditorBusy, openGenerationCommentModal],
  );

  const handleRequestBatchGenerate = useCallback(() => {
    if (isEditorBusy) return;
    openGenerationCommentModal({ kind: "batch", source: "manual" });
  }, [isEditorBusy, openGenerationCommentModal]);

  const handleRequestChapterTitleGenerate = useCallback(
    (group: ChapterGroup) => {
      if (isEditorBusy) return;
      openGenerationCommentModal({ kind: "chapter", group });
    },
    [isEditorBusy, openGenerationCommentModal],
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
        const undoSnapshot = await captureEditedPanelUndoSnapshot({
          blocks: [block],
          actionLabel: block.editedVariantId
            ? `Szerkesztett valtozat torlese (${block.blockIndex}. blokk)`
            : `Blokk torlese (${block.blockIndex}. blokk)`,
        });
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
        setLastEditedPanelUndo(undoSnapshot);
        setLastEditedPanelRedo(null);
        setUndoFeedback(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen torles.";
        setState({ status: "error", message });
      } finally {
        setDeletingBlockId(null);
      }
    },
    [captureEditedPanelUndoSnapshot, loadDashboard, state.status, supabase],
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
        const undoSnapshot = await captureEditedPanelUndoSnapshot({
          blocks: [block],
          actionLabel: `Elutasitas eredetire (${block.blockIndex}. blokk)`,
        });
        await deleteEditedBlockVariant({ supabase, block });
        await loadDashboard({ keepCurrentView: true });
        setLastEditedPanelUndo(undoSnapshot);
        setLastEditedPanelRedo(null);
        setUndoFeedback(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen elutasitas.";
        setState({ status: "error", message });
      } finally {
        setDeletingBlockId(null);
      }
    },
    [captureEditedPanelUndoSnapshot, loadDashboard, state.status, supabase],
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
        const undoSnapshot = await captureEditedPanelUndoSnapshot({
          blocks: [block],
          actionLabel: `Kezi javitas mentes (${block.blockIndex}. blokk)`,
        });
        if (adminSourceEditMode && state.role === "admin") {
          const blocksTable = supabase.from("blocks") as any;
          const { error: updateError } = await blocksTable
            .update({ original_text: cleaned })
            .eq("id", block.id)
            .eq("book_id", block.bookId);
          if (updateError) {
            throw new Error(updateError.message || "Sikertelen forras szoveg mentes.");
          }
          await loadDashboard({ keepCurrentView: true });
          setLastEditedPanelUndo(undoSnapshot);
          setLastEditedPanelRedo(null);
          setUndoFeedback(null);
          return true;
        }
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
        setLastEditedPanelUndo(undoSnapshot);
        setLastEditedPanelRedo(null);
        setUndoFeedback(null);
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen kezi javitas mentes.";
        setManualEditError({ blockId: block.id, message });
        return false;
      } finally {
        setManualSavingBlockId(null);
      }
    },
    [adminSourceEditMode, captureEditedPanelUndoSnapshot, loadDashboard, state, supabase],
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
  const handleChapterNavigatorJump = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const chapterId = event.currentTarget.dataset.chapterId;
      if (!chapterId) return;
      handleJumpToChapter(chapterId);
    },
    [handleJumpToChapter],
  );
  const handleNoteNavigatorJump = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      const blockId = event.currentTarget.dataset.blockId;
      if (!blockId) return;
      handleJumpToBlock(blockId);
    },
    [handleJumpToBlock],
  );
  const handleNoteNavigatorKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    const blockId = event.currentTarget.dataset.blockId;
    if (!blockId) return;
    handleJumpToBlock(blockId);
  }, [handleJumpToBlock]);
  const handleNoteNavigatorExpandToggle = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const noteId = event.currentTarget.dataset.noteId;
    if (!noteId) return;
    setExpandedNoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }, []);
  const handleBookmarkNavigatorJump = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const bookmarkId = event.currentTarget.dataset.bookmarkId;
      if (!bookmarkId) return;
      handleJumpToBookmark(bookmarkId);
    },
    [handleJumpToBookmark],
  );
  const handleSelectMobileOriginalTab = useCallback(() => {
    setMobilePage("original");
    setStore((prev) => ({ ...prev, activePanel: "original", panelMode: "single" }));
  }, []);
  const handleSelectMobileTranslatedTab = useCallback(() => {
    setMobilePage("translated");
    setStore((prev) => ({ ...prev, activePanel: "translated", panelMode: "single" }));
  }, []);
  const handleSelectMobileTocTab = useCallback(() => setMobilePage("toc"), []);
  const handleSelectMobileNotesTab = useCallback(() => setMobilePage("notes"), []);
  const handleSelectMobileBookmarksTab = useCallback(() => setMobilePage("bookmarks"), []);
  const handleOpenMobileToolPanel = useCallback(() => setMobileToolPanelOpen(true), []);
  const handleCloseMobileToolPanel = useCallback(() => setMobileToolPanelOpen(false), []);
  const handleMobileLayoutChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value === "split" ? "split" : "single";
    setStore((prev) => ({ ...prev, desktopLayout: value }));
  }, []);
  const handleSelectBookmarkFromList = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const bookmarkId = event.currentTarget.dataset.bookmarkId;
    if (!bookmarkId) return;
    setSelectedBookmarkId(bookmarkId);
  }, []);
  const handleSelectedBookmarkNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextName = event.target.value;
      setBookmarks((prev) =>
        prev.map((entry) =>
          entry.id === selectedBookmarkId ? { ...entry, name: nextName } : entry,
        ),
      );
    },
    [selectedBookmarkId],
  );
  const handleSelectedBookmarkColorChange = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      const colorKey = event.currentTarget.dataset.colorKey;
      if (!colorKey) return;
      setBookmarks((prev) =>
        prev.map((entry) =>
          entry.id === selectedBookmarkId ? { ...entry, colorKey } : entry,
        ),
      );
    },
    [selectedBookmarkId],
  );
  const handleJumpToSelectedBookmark = useCallback(() => {
    handleJumpToBookmark();
  }, [handleJumpToBookmark]);
  const handleJumpToSelectedBookmarkAndClose = useCallback(() => {
    handleJumpToBookmark();
    setMobileToolPanelOpen(false);
  }, [handleJumpToBookmark]);
  const handleDeleteSelectedBookmark = useCallback(() => {
    if (!selectedBookmarkId) return;
    setBookmarks((prev) => prev.filter((entry) => entry.id !== selectedBookmarkId));
  }, [selectedBookmarkId]);
  const handleToggleDesktopEditPanel = useCallback(() => {
    if (state.status !== "ready" || state.role !== "admin") return;
    setDesktopEditPanelOpen((prev) => !prev);
  }, [state]);
  const handleToggleBookFavorite = useCallback(async () => {
    if (state.status !== "ready") return;
    if (isFavoriteSaving) return;

    const currentFavorite = state.data.book.is_favorite === true;
    const nextFavorite = !currentFavorite;
    setIsFavoriteSaving(true);

    const booksTable = supabase.from("books") as any;
    const { error } = await booksTable
      .update({ is_favorite: nextFavorite })
      .eq("id", bookId)
      .eq("user_id", state.userId);

    if (error) {
      const message = `${error.message ?? ""}`.toLowerCase();
      if (message.includes("is_favorite")) {
        showRuntimeAlert("A kedvenc jeloleshez hianyzik az `is_favorite` adatbazis oszlop.", "info");
      } else {
        showRuntimeAlert(error.message || "Sikertelen kedvenc jeloles.");
      }
      setIsFavoriteSaving(false);
      return;
    }

    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        data: {
          ...prev.data,
          book: { ...prev.data.book, is_favorite: nextFavorite },
        },
      };
    });
    setIsFavoriteSaving(false);
  }, [bookId, isFavoriteSaving, showRuntimeAlert, state, supabase]);
  const handleToggleAdminSourceEditMode = useCallback(() => {
    if (state.status !== "ready" || state.role !== "admin") return;
    setAdminSourceEditMode((prev) => !prev);
    setStore((prev) => ({ ...prev, viewState: "workbench", activePanel: "translated" }));
    if (isMobile) {
      setMobilePage("translated");
    }
  }, [isMobile, state]);
  const handleToggleChapterAddMode = useCallback(() => {
    if (chapterEditSaving || chapterDeleteSaving || chapterAddSaving) return;
    setChapterEditError(null);
    setChapterAddMode((prev) => {
      const next = !prev;
      if (next) {
        setStore((current) => ({ ...current, viewState: "workbench", activePanel: "translated" }));
        if (isMobile) {
          setMobilePage("translated");
        }
      }
      return next;
    });
  }, [chapterAddSaving, chapterDeleteSaving, chapterEditSaving, isMobile]);

  const handleEditSubmit = useCallback(async () => {
    if (state.status !== "ready" || state.role !== "admin") return;

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
      year: yearValue,
      description: description || null,
      cover_slug: icon || null,
      background_slug: icon || null,
    };

    const legacyPayload = {
      title,
      author: author || null,
      year: yearValue,
      description: description || null,
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
        const legacyFallback = await booksTable.update(legacyPayload).eq("id", bookId).eq("user_id", state.userId);

        if (!legacyFallback.error) {
          setEditFeedback("Konyv adatai mentve (legacy ev mezovel).");
          setIsEditSaving(false);
          await loadDashboard({ keepCurrentView: true });
          return;
        }

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
    if (state.status !== "ready" || state.role !== "admin") return;
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
  }, [bookId, state, supabase]);

  const handleInferPublicationYear = useCallback(async () => {
    if (state.status !== "ready" || state.role !== "admin") return;
    setEditFeedback(null);
    setIsYearInferring(true);
    try {
      const out = await requestPublicationYearInference({ supabase, bookId });
      if (out.inferredYear === null) {
        setEditFeedback("Az AI nem tudott eleg biztos eredeti kiadasi evet becsulni.");
        return;
      }

      setEditForm((prev) => ({ ...prev, year: String(out.inferredYear) }));
      setEditFeedback(out.persisted ? "AI evbecsles mentve az adatbazisba." : "AI evbecsles elkeszult.");
      await loadDashboard({ keepCurrentView: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen evbecsles.";
      setEditFeedback(message);
    } finally {
      setIsYearInferring(false);
    }
  }, [bookId, loadDashboard, state, supabase]);

  const handleRestoreBookFromSource = useCallback(async () => {
    if (state.status !== "ready" || state.role === "guest") return;
    const sourceBookId = state.data.book.source_book_id?.trim() ?? "";
    if (!sourceBookId) return;

    const confirmed = window.confirm(
      "Biztosan visszaallitod ezt a konyvet az eredeti forrasanyagra? A jelenlegi blokkok, variansok es jegyzetek torlodnek.",
    );
    if (!confirmed) return;

    setUndoFeedback(null);
    setIsSourceRestoreInFlight(true);
    try {
      const booksTable = supabase.from("books") as any;
      const chaptersTable = supabase.from("chapters") as any;
      const blocksTable = supabase.from("blocks") as any;
      const variantsTable = supabase.from("variants") as any;
      const notesTable = supabase.from("notes") as any;
      const footnotesTable = supabase.from("footnotes") as any;
      const anchorsTable = supabase.from("footnote_anchors") as any;

      const { data: sourceBook, error: sourceBookError } = await booksTable
        .select("id,status")
        .eq("id", sourceBookId)
        .maybeSingle();
      if (sourceBookError || !sourceBook?.id) {
        throw new Error(sourceBookError?.message || "A forraskonyv nem talalhato.");
      }
      if (sourceBook.status !== "ready") {
        throw new Error("A forraskonyv nem kesz allapotu.");
      }

      const { data: sourceChapterRows, error: sourceChapterError } = await chaptersTable
        .select("id,chapter_index,title")
        .eq("book_id", sourceBookId)
        .order("chapter_index", { ascending: true });
      if (sourceChapterError) throw new Error(sourceChapterError.message || "Sikertelen forras fejezet lekerdezes.");

      const { data: sourceBlockRows, error: sourceBlockError } = await blocksTable
        .select("id,chapter_id,block_index,original_text,original_hash")
        .eq("book_id", sourceBookId)
        .order("block_index", { ascending: true });
      if (sourceBlockError) throw new Error(sourceBlockError.message || "Sikertelen forras blokk lekerdezes.");

      const { data: sourceFootnoteRows, error: sourceFootnoteError } = await footnotesTable
        .select("number,text,source_chapter_id,source_block_id")
        .eq("book_id", sourceBookId)
        .order("number", { ascending: true });
      if (sourceFootnoteError) throw new Error(sourceFootnoteError.message || "Sikertelen forras jegyzet lekerdezes.");

      const { data: sourceAnchorRows, error: sourceAnchorError } = await anchorsTable
        .select("chapter_id,block_id,footnote_number,start_offset,end_offset")
        .eq("book_id", sourceBookId);
      if (sourceAnchorError) throw new Error(sourceAnchorError.message || "Sikertelen forras hivatkozas lekerdezes.");

      const { error: deleteNotesError } = await notesTable.delete().eq("book_id", bookId);
      if (deleteNotesError) throw new Error(deleteNotesError.message || "Sikertelen jegyzet torles.");

      const { error: deleteVariantsError } = await variantsTable.delete().eq("book_id", bookId);
      if (deleteVariantsError) throw new Error(deleteVariantsError.message || "Sikertelen varians torles.");

      const { error: deleteAnchorsError } = await anchorsTable.delete().eq("book_id", bookId);
      if (deleteAnchorsError) throw new Error(deleteAnchorsError.message || "Sikertelen forrashivatkozas torles.");

      const { error: deleteFootnotesError } = await footnotesTable.delete().eq("book_id", bookId);
      if (deleteFootnotesError) throw new Error(deleteFootnotesError.message || "Sikertelen forrasjegyzet torles.");

      const { error: deleteBlocksError } = await blocksTable.delete().eq("book_id", bookId);
      if (deleteBlocksError) throw new Error(deleteBlocksError.message || "Sikertelen blokk torles.");

      const { error: deleteChaptersError } = await chaptersTable.delete().eq("book_id", bookId);
      if (deleteChaptersError) throw new Error(deleteChaptersError.message || "Sikertelen fejezet torles.");

      const chapterIdMap = new Map<string, string>();
      for (const sourceChapter of (sourceChapterRows as Array<{ id: string; chapter_index: number; title: string | null }> | null) ?? []) {
        const { data: insertedChapter, error: insertChapterError } = await chaptersTable
          .insert({
            owner_id: state.userId,
            book_id: bookId,
            chapter_index: sourceChapter.chapter_index,
            title: sourceChapter.title ?? null,
          })
          .select("id")
          .single();
        if (insertChapterError || !insertedChapter?.id) {
          throw new Error(insertChapterError?.message || "Sikertelen fejezet visszaallitas.");
        }
        chapterIdMap.set(sourceChapter.id, insertedChapter.id as string);
      }

      const blockIdMap = new Map<string, string>();
      for (const sourceBlock of
        (sourceBlockRows as Array<{
          id: string;
          chapter_id: string;
          block_index: number;
          original_text: string;
          original_hash: string | null;
        }> | null) ?? []) {
        const mappedChapterId = chapterIdMap.get(sourceBlock.chapter_id);
        if (!mappedChapterId) continue;

        const basePayload = {
          owner_id: state.userId,
          book_id: bookId,
          chapter_id: mappedChapterId,
          block_index: sourceBlock.block_index,
          original_text: sourceBlock.original_text,
          original_hash: sourceBlock.original_hash,
        };
        let insertBlockResult = await blocksTable.insert(basePayload).select("id").single();
        if (insertBlockResult.error && `${insertBlockResult.error.message ?? ""}`.toLowerCase().includes("original_hash")) {
          const fallbackPayload = {
            owner_id: state.userId,
            book_id: bookId,
            chapter_id: mappedChapterId,
            block_index: sourceBlock.block_index,
            original_text: sourceBlock.original_text,
          };
          insertBlockResult = await blocksTable.insert(fallbackPayload).select("id").single();
        }
        if (insertBlockResult.error || !(insertBlockResult.data as { id?: string } | null)?.id) {
          throw new Error(insertBlockResult.error?.message || "Sikertelen blokk visszaallitas.");
        }
        blockIdMap.set(sourceBlock.id, (insertBlockResult.data as { id: string }).id);
      }

      for (const sourceFootnote of
        (sourceFootnoteRows as Array<{ number: number; text: string; source_chapter_id: string; source_block_id: string }> | null) ?? []) {
        const mappedSourceChapterId = chapterIdMap.get(sourceFootnote.source_chapter_id);
        const mappedSourceBlockId = blockIdMap.get(sourceFootnote.source_block_id);
        if (!mappedSourceChapterId || !mappedSourceBlockId) continue;

        const { error: insertFootnoteError } = await footnotesTable.insert({
          owner_id: state.userId,
          book_id: bookId,
          number: sourceFootnote.number,
          text: sourceFootnote.text,
          source_chapter_id: mappedSourceChapterId,
          source_block_id: mappedSourceBlockId,
        });
        if (insertFootnoteError) throw new Error(insertFootnoteError.message || "Sikertelen forrasjegyzet visszaallitas.");
      }

      for (const sourceAnchor of
        (sourceAnchorRows as Array<{
          chapter_id: string;
          block_id: string;
          footnote_number: number;
          start_offset: number;
          end_offset: number;
        }> | null) ?? []) {
        const mappedChapterId = chapterIdMap.get(sourceAnchor.chapter_id);
        const mappedBlockId = blockIdMap.get(sourceAnchor.block_id);
        if (!mappedChapterId || !mappedBlockId) continue;

        const { error: insertAnchorError } = await anchorsTable.insert({
          owner_id: state.userId,
          book_id: bookId,
          chapter_id: mappedChapterId,
          block_id: mappedBlockId,
          footnote_number: sourceAnchor.footnote_number,
          start_offset: sourceAnchor.start_offset,
          end_offset: sourceAnchor.end_offset,
        });
        if (insertAnchorError) throw new Error(insertAnchorError.message || "Sikertelen forrashivatkozas visszaallitas.");
      }

      await loadDashboard({ keepCurrentView: true });
      setLastEditedPanelUndo(null);
      setLastEditedPanelRedo(null);
      setUndoFeedback("Az eredeti forrasanyag teljesen visszaallitva.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen forras-visszaallitas.";
      setUndoFeedback(message);
    } finally {
      setIsSourceRestoreInFlight(false);
    }
  }, [bookId, loadDashboard, state, supabase]);

  const handleDeleteCurrentBook = useCallback(async () => {
    if (state.status !== "ready" || state.role === "guest") return;
    const isSourceBook = !state.data.book.source_book_id;
    if (isSourceBook && state.role !== "admin") {
      setUndoFeedback("A forraskonyv torlese csak adminnal engedelyezett.");
      return;
    }

    if (isSourceBook && state.role === "admin") {
      const password = window.prompt("Admin torles: add meg a jelszavad a forraskonyv torlesehez.");
      if (!password) return;
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.email) {
        setUndoFeedback(userError?.message || "Nem sikerult az admin azonositasa.");
        return;
      }
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userData.user.email,
        password,
      });
      if (verifyError) {
        setUndoFeedback("Hibas jelszo vagy sikertelen admin ellenorzes.");
        return;
      }
    }

    const confirmed = window.confirm(
      "Biztosan toroljuk ezt a konyvet? A torles vegleges, nem visszavonhato.",
    );
    if (!confirmed) return;

    setUndoFeedback(null);
    setIsBookDeleteInFlight(true);
    try {
      const booksTable = supabase.from("books") as any;
      let deleteQuery = booksTable.delete().eq("id", bookId);
      if (state.role !== "admin") {
        deleteQuery = deleteQuery.eq("user_id", state.userId);
      }
      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw new Error(deleteError.message || "Sikertelen konyv torles.");

      router.push("/");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen konyv torles.";
      setUndoFeedback(message);
    } finally {
      setIsBookDeleteInFlight(false);
    }
  }, [bookId, router, state, supabase]);

  useEffect(() => {
    if (state.status !== "ready") return;
    if (state.role !== "admin") return;
    if (autoYearInferenceAttemptedRef.current) return;
    if (hasBookStoredYear(state.data.book)) return;

    autoYearInferenceAttemptedRef.current = true;
    void handleInferPublicationYear();
  }, [handleInferPublicationYear, state]);

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
  const handleSwapToOriginalPanel = useCallback(() => {
    setStore((prev) => ({ ...prev, activePanel: "original" }));
  }, []);
  const handleSwapToTranslatedPanel = useCallback(() => {
    setStore((prev) => ({ ...prev, activePanel: "translated" }));
  }, []);
  const handleOriginalPanelBodyScroll = useCallback(() => {
    syncPanels("original");
  }, [syncPanels]);
  const handleTranslatedPanelBodyScroll = useCallback(() => {
    syncPanels("translated");
    if (!autoGenerateOnScroll || state.status !== "ready" || store.viewState !== "workbench") return;
    const panel = translatedPanelRef.current;
    if (!panel) return;
    const remaining = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    if (remaining > AUTO_GENERATE_SCROLL_THRESHOLD_PX) return;
    void handleBatchGenerate("scroll");
  }, [autoGenerateOnScroll, handleBatchGenerate, state.status, store.viewState, syncPanels]);

  useEffect(() => {
    if (!autoGenerateOnScroll || state.status !== "ready" || store.viewState !== "workbench") return;
    if (isBatchGenerating || isEditorBusy || autoBatchLockRef.current) return;
    const panel = translatedPanelRef.current;
    if (!panel) return;
    const remaining = panel.scrollHeight - panel.scrollTop - panel.clientHeight;
    if (remaining > AUTO_GENERATE_SCROLL_THRESHOLD_PX) return;
    void handleBatchGenerate("scroll");
  }, [
    autoGenerateOnScroll,
    generationCandidates.length,
    generatedUnacceptedCount,
    handleBatchGenerate,
    isBatchGenerating,
    isEditorBusy,
    state.status,
    store.viewState,
  ]);
  const handlePanelBodyClick = useCallback(() => {
    if (!isMobile) return;
    setActiveMobileBlockId(null);
  }, [isMobile]);

  const dashboardDerived = useMemo(() => {
    if (state.status !== "ready") {
      return {
        isReady: false,
        bookTitle: "Konyv",
        bookAuthor: "Betoltes...",
        blocks: [] as DashboardBlock[],
        completion: EMPTY_COMPLETION,
        progress: completionPercent(EMPTY_COMPLETION.ratio),
        canReader: EMPTY_COMPLETION.isComplete,
        readerDisabledReason: "Reader mod 0%-nal nem erheto el.",
        topbarIconSlug: "",
      };
    }

    const { book, blocks, completion } = state.data;
    const bookAuthor = book.author?.trim() || "Ismeretlen szerzo";
    return {
      isReady: true,
      bookTitle: book.title,
      bookAuthor,
      blocks,
      completion,
      progress: completionPercent(completion.ratio),
      canReader: completion.isComplete,
      readerDisabledReason:
        completion.accepted === 0
          ? "Reader mod 0%-nal nem erheto el."
          : "Reader mod csak 100%-os completionnel erheto el.",
      topbarIconSlug: resolveTopbarIconSlug(book),
    };
  }, [state]);
  const { isReady, bookTitle, bookAuthor, blocks, completion, progress, canReader, readerDisabledReason, topbarIconSlug } =
    dashboardDerived;
  const panelAccentColor = authorSpineColor(bookAuthor);
  const iconPreviewSlug = normalizeIconSlug(editForm.icon);
  const iconPreviewPath = iconPreviewSlug
    ? `url('/covers/SVG/${iconPreviewSlug}.svg'), url('/covers/${iconPreviewSlug}.png')`
    : null;
  const isFavoriteBook = state.status === "ready" && state.data.book.is_favorite === true;
  const hasSourceBook = state.status === "ready" && Boolean(state.data.book.source_book_id?.trim());
  const isSourceBook = state.status === "ready" && !state.data.book.source_book_id;
  const chapterGroups = useMemo(() => groupBlocksByChapter(blocks), [blocks]);
  const bookmarkColorByKey = useMemo(
    () =>
      BOOKMARK_COLOR_OPTIONS.reduce<Record<string, string>>((acc, option) => {
        acc[option.key] = option.color;
        return acc;
      }, {}),
    [],
  );
  const bookmarkDerived = useMemo(() => {
    const selectedBookmark = bookmarks.find((entry) => entry.id === selectedBookmarkId) ?? null;
    const activeBookmarkColorKey = selectedBookmark?.colorKey ?? DEFAULT_BOOKMARK_COLOR_KEY;

    const bookmarksByMarkerId = new Map<string, DashboardBookmarkEntry[]>();
    for (const entry of bookmarks) {
      const bucket = bookmarksByMarkerId.get(entry.markerId);
      if (bucket) {
        bucket.push(entry);
      } else {
        bookmarksByMarkerId.set(entry.markerId, [entry]);
      }
    }

    const bookmarkedPlacements = new Map<string, { chapterIndex: number; block: DashboardBlock }>();
    for (const group of chapterGroups) {
      for (const block of group.blocks) {
        const markerId = bookmarkBeforeKey(block);
        if (!bookmarksByMarkerId.has(markerId)) continue;
        bookmarkedPlacements.set(markerId, { chapterIndex: group.chapterIndex, block });
      }
    }

    const bookmarkNavigatorItems = bookmarks.map((entry) => {
      const placement = bookmarkedPlacements.get(entry.markerId);
      return {
        entry,
        placement,
      };
    });

    return {
      selectedBookmark,
      activeBookmarkColorKey,
      bookmarksByMarkerId,
      bookmarkedPlacements,
      hasBookmarks: bookmarks.length > 0,
      bookmarkNavigatorItems,
    };
  }, [bookmarks, chapterGroups, selectedBookmarkId]);
  const {
    selectedBookmark,
    activeBookmarkColorKey,
    bookmarksByMarkerId,
    bookmarkedPlacements,
    hasBookmarks,
    bookmarkNavigatorItems,
  } = bookmarkDerived;
  const navigatorDerived = useMemo(() => {
    const chapterProgressItems = chapterGroups.map((group) => {
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
    });

    const noteNavigatorItems: Array<{
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
          noteNavigatorItems.push({
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

    return {
      chapterProgressItems,
      noteNavigatorItems,
    };
  }, [chapterGroups]);
  const { chapterProgressItems, noteNavigatorItems } = navigatorDerived;
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
  const handleSelectMobileWorkbenchMode = useCallback(() => {
    handleModeToggle("workbench");
    setMobileToolPanelOpen(false);
  }, [handleModeToggle]);
  const handleSelectMobileReaderMode = useCallback(() => {
    handleModeToggle("reader");
    setMobileToolPanelOpen(false);
  }, [handleModeToggle]);

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
    if (state.status !== "ready" || chapterEditSaving || chapterDeleteSaving || chapterAddSaving) return;
    const confirmed = window.confirm(
      `Biztosan toroljuk a(z) ${group.chapterIndex}. fejezetet? A fejezet blokkjai az elozo fejezethez kerulnek.`,
    );
    if (!confirmed) return;

    setChapterEditError(null);
    setChapterDeleteSaving(true);
    const chaptersTable = supabase.from("chapters") as any;
    const blocksTable = supabase.from("blocks") as any;

    const { data: initialChapterRows, error: initialChapterFetchError } = await chaptersTable
      .select("id,chapter_index")
      .eq("book_id", bookId)
      .order("chapter_index", { ascending: true });

    if (initialChapterFetchError) {
      setChapterDeleteSaving(false);
      setChapterEditError(initialChapterFetchError.message || "Sikertelen fejezet lekerdezes.");
      return;
    }

    const initialRows = ((initialChapterRows ?? []) as ChapterRow[]).sort((a, b) => a.chapter_index - b.chapter_index);
    const chapterPosition = initialRows.findIndex((row) => row.id === group.chapterId);
    if (chapterPosition < 0) {
      setChapterDeleteSaving(false);
      setChapterEditError("A torlendo fejezet mar nem talalhato.");
      return;
    }

    const previousChapter = chapterPosition > 0 ? initialRows[chapterPosition - 1] : null;
    const { data: movingBlockRows, error: movingBlockFetchError } = await blocksTable
      .select("id,block_index")
      .eq("book_id", bookId)
      .eq("chapter_id", group.chapterId)
      .order("block_index", { ascending: true });

    if (movingBlockFetchError) {
      setChapterDeleteSaving(false);
      setChapterEditError(movingBlockFetchError.message || "Sikertelen blokk lekerdezes.");
      return;
    }

    const movingBlocks = (movingBlockRows ?? []) as BlockIndexRow[];
    if (movingBlocks.length > 0 && !previousChapter) {
      setChapterDeleteSaving(false);
      setChapterEditError("Az elso fejezet nem torolheto, mert nincs elozo fejezet a blokkok atmozgatasahoz.");
      return;
    }

    if (movingBlocks.length > 0 && previousChapter) {
      const { data: previousLastRows, error: previousLastFetchError } = await blocksTable
        .select("block_index")
        .eq("book_id", bookId)
        .eq("chapter_id", previousChapter.id)
        .order("block_index", { ascending: false })
        .limit(1);

      if (previousLastFetchError) {
        setChapterDeleteSaving(false);
        setChapterEditError(previousLastFetchError.message || "Sikertelen blokk-athelyezes.");
        return;
      }

      let nextBlockIndex = ((previousLastRows as Array<{ block_index: number }> | null)?.[0]?.block_index ?? 0) + 1;
      for (const movingBlock of movingBlocks) {
        const { error: moveError } = await blocksTable
          .update({ chapter_id: previousChapter.id, block_index: nextBlockIndex })
          .eq("id", movingBlock.id)
          .eq("book_id", bookId)
          .eq("chapter_id", group.chapterId);
        if (moveError) {
          setChapterDeleteSaving(false);
          setChapterEditError(moveError.message || "Sikertelen blokk-athelyezes.");
          return;
        }
        nextBlockIndex += 1;
      }

      const movedBlockIds = movingBlocks.map((row) => row.id);

      const variantsTable = supabase.from("variants") as any;
      const { error: variantsMoveError } = await variantsTable
        .update({ chapter_id: previousChapter.id })
        .eq("book_id", bookId)
        .in("block_id", movedBlockIds);
      if (variantsMoveError) {
        setChapterDeleteSaving(false);
        setChapterEditError(variantsMoveError.message || "Sikertelen varians-athelyezes.");
        return;
      }

      const notesTable = supabase.from("notes") as any;
      const { error: notesMoveError } = await notesTable
        .update({ chapter_id: previousChapter.id })
        .eq("book_id", bookId)
        .in("block_id", movedBlockIds);
      if (notesMoveError) {
        setChapterDeleteSaving(false);
        setChapterEditError(notesMoveError.message || "Sikertelen jegyzet-athelyezes.");
        return;
      }

      const anchorsTable = supabase.from("footnote_anchors") as any;
      const { error: anchorsMoveError } = await anchorsTable
        .update({ chapter_id: previousChapter.id })
        .eq("book_id", bookId)
        .in("block_id", movedBlockIds);
      if (anchorsMoveError) {
        setChapterDeleteSaving(false);
        setChapterEditError(anchorsMoveError.message || "Sikertelen labjegyzet-horgony athelyezes.");
        return;
      }

      const footnotesTable = supabase.from("footnotes") as any;
      const { error: footnotesMoveError } = await footnotesTable
        .update({ source_chapter_id: previousChapter.id })
        .eq("book_id", bookId)
        .in("source_block_id", movedBlockIds);
      if (footnotesMoveError) {
        setChapterDeleteSaving(false);
        setChapterEditError(footnotesMoveError.message || "Sikertelen labjegyzet-forras athelyezes.");
        return;
      }

      const { count: remainingCount, error: remainingCountError } = await blocksTable
        .select("id", { count: "exact", head: true })
        .eq("book_id", bookId)
        .eq("chapter_id", group.chapterId);
      if (remainingCountError) {
        setChapterDeleteSaving(false);
        setChapterEditError(remainingCountError.message || "Sikertelen blokk-ellenorzes torles elott.");
        return;
      }
      if ((remainingCount ?? 0) > 0) {
        setChapterDeleteSaving(false);
        setChapterEditError("A fejezet torlese megszakitva: maradt blokk a torlendo fejezetben.");
        return;
      }
    }

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
  }, [bookId, chapterAddSaving, chapterDeleteSaving, chapterEditSaving, loadDashboard, state.status, supabase]);

  const handleAddChapterFromBlock = useCallback(async (block: DashboardBlock) => {
    if (
      state.status !== "ready" ||
      !chapterAddMode ||
      chapterEditSaving ||
      chapterDeleteSaving ||
      chapterAddSaving
    ) {
      return;
    }

    setChapterEditError(null);
    setChapterAddSaving(true);

    try {
      const chaptersTable = supabase.from("chapters") as any;
      const blocksTable = supabase.from("blocks") as any;

      const { data: chapterRows, error: chapterFetchError } = await chaptersTable
        .select("id,chapter_index")
        .eq("book_id", bookId)
        .order("chapter_index", { ascending: true });
      if (chapterFetchError) throw new Error(chapterFetchError.message || "Sikertelen fejezet lekerdezes.");

      const rows = ((chapterRows ?? []) as ChapterRow[]).sort((a, b) => a.chapter_index - b.chapter_index);
      const sourceChapter = rows.find((row) => row.id === block.chapterId);
      if (!sourceChapter) throw new Error("A blokk fejezete mar nem talalhato.");

      for (let index = rows.length - 1; index >= 0; index -= 1) {
        const row = rows[index];
        if (row.chapter_index <= sourceChapter.chapter_index) continue;
        const { error } = await chaptersTable
          .update({ chapter_index: row.chapter_index + 1 })
          .eq("id", row.id)
          .eq("book_id", bookId);
        if (error) throw new Error(error.message || "Sikertelen fejezet-beszuras.");
      }

      const nextTitleRaw = block.originalText.trim();
      const nextTitle = nextTitleRaw ? nextTitleRaw.slice(0, 160) : `Fejezet ${sourceChapter.chapter_index + 1}`;
      const { data: insertedChapter, error: insertChapterError } = await chaptersTable
        .insert({
          owner_id: state.userId,
          book_id: bookId,
          chapter_index: sourceChapter.chapter_index + 1,
          title: nextTitle,
        })
        .select("id")
        .single();
      if (insertChapterError) throw new Error(insertChapterError.message || "Sikertelen uj fejezet letrehozas.");

      const newChapterId = (insertedChapter as { id: string } | null)?.id;
      if (!newChapterId) throw new Error("Sikertelen uj fejezet letrehozas.");

      const { data: sourceBlockRows, error: sourceBlockFetchError } = await blocksTable
        .select("id,block_index")
        .eq("book_id", bookId)
        .eq("chapter_id", sourceChapter.id)
        .order("block_index", { ascending: true });
      if (sourceBlockFetchError) throw new Error(sourceBlockFetchError.message || "Sikertelen blokk lekerdezes.");

      const sourceBlocks = (sourceBlockRows ?? []) as BlockIndexRow[];
      const splitIndex = sourceBlocks.findIndex((row) => row.id === block.id);
      if (splitIndex < 0) throw new Error("A kijelolt blokk mar nem talalhato.");

      const movingBlocks = sourceBlocks.slice(splitIndex);
      if (movingBlocks.length === 0) {
        throw new Error("A kijelolt blokkbol nem kepzodott uj fejezet.");
      }

      let nextBlockIndex = 1;
      for (const movingBlock of movingBlocks) {
        const { error } = await blocksTable
          .update({ chapter_id: newChapterId, block_index: nextBlockIndex })
          .eq("id", movingBlock.id)
          .eq("book_id", bookId)
          .eq("chapter_id", sourceChapter.id);
        if (error) throw new Error(error.message || "Sikertelen blokk-athelyezes.");
        nextBlockIndex += 1;
      }

      const movedBlockIds = movingBlocks.map((row) => row.id);
      const variantsTable = supabase.from("variants") as any;
      const { error: variantsMoveError } = await variantsTable
        .update({ chapter_id: newChapterId })
        .eq("book_id", bookId)
        .in("block_id", movedBlockIds);
      if (variantsMoveError) throw new Error(variantsMoveError.message || "Sikertelen varians-athelyezes.");

      const notesTable = supabase.from("notes") as any;
      const { error: notesMoveError } = await notesTable
        .update({ chapter_id: newChapterId })
        .eq("book_id", bookId)
        .in("block_id", movedBlockIds);
      if (notesMoveError) throw new Error(notesMoveError.message || "Sikertelen jegyzet-athelyezes.");

      const anchorsTable = supabase.from("footnote_anchors") as any;
      const { error: anchorsMoveError } = await anchorsTable
        .update({ chapter_id: newChapterId })
        .eq("book_id", bookId)
        .in("block_id", movedBlockIds);
      if (anchorsMoveError) {
        throw new Error(anchorsMoveError.message || "Sikertelen labjegyzet-horgony athelyezes.");
      }

      const footnotesTable = supabase.from("footnotes") as any;
      const { error: footnotesMoveError } = await footnotesTable
        .update({ source_chapter_id: newChapterId })
        .eq("book_id", bookId)
        .in("source_block_id", movedBlockIds);
      if (footnotesMoveError) {
        throw new Error(footnotesMoveError.message || "Sikertelen labjegyzet-forras athelyezes.");
      }

      const { data: remainingRows, error: remainingFetchError } = await blocksTable
        .select("id,block_index")
        .eq("book_id", bookId)
        .eq("chapter_id", sourceChapter.id)
        .order("block_index", { ascending: true });
      if (remainingFetchError) throw new Error(remainingFetchError.message || "Sikertelen blokk ujraszamozas.");

      const remaining = ((remainingRows ?? []) as BlockIndexRow[]).sort((a, b) => a.block_index - b.block_index);
      for (let index = 0; index < remaining.length; index += 1) {
        const row = remaining[index];
        const tempIndex = 10000 + index + 1;
        const { error } = await blocksTable
          .update({ block_index: tempIndex })
          .eq("id", row.id)
          .eq("book_id", bookId)
          .eq("chapter_id", sourceChapter.id);
        if (error) throw new Error(error.message || "Sikertelen blokk ujraszamozas.");
      }
      for (let index = 0; index < remaining.length; index += 1) {
        const row = remaining[index];
        const finalIndex = index + 1;
        const { error } = await blocksTable
          .update({ block_index: finalIndex })
          .eq("id", row.id)
          .eq("book_id", bookId)
          .eq("chapter_id", sourceChapter.id);
        if (error) throw new Error(error.message || "Sikertelen blokk ujraszamozas.");
      }

      setChapterAddMode(false);
      await loadDashboard({ keepCurrentView: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sikertelen uj fejezet letrehozas.";
      setChapterEditError(message);
      await loadDashboard({ keepCurrentView: true });
    } finally {
      setChapterAddSaving(false);
    }
  }, [
    bookId,
    chapterAddMode,
    chapterAddSaving,
    chapterDeleteSaving,
    chapterEditSaving,
    loadDashboard,
    state,
    supabase,
  ]);

  const handleMergeBlocks = useCallback(async (leftBlock: DashboardBlock, rightBlock: DashboardBlock) => {
    if (state.status !== "ready" || chapterEditSaving || chapterDeleteSaving || chapterAddSaving) return;
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
  }, [bookId, chapterAddSaving, chapterDeleteSaving, chapterEditSaving, loadDashboard, state.status, supabase]);

  const handleChapterEditTitleChange = useCallback((chapterId: string, value: string) => {
    setChapterEdit((prev) => (prev && prev.chapterId === chapterId ? { ...prev, title: value } : prev));
  }, []);
  const handleChapterEditCancel = useCallback(() => setChapterEdit(null), []);
  const chapterSectionHandlers = useMemo<ChapterSectionHandlers>(
    () => ({
      onChapterEditOpen: handleChapterEditOpen,
      onChapterEditTitleChange: handleChapterEditTitleChange,
      onChapterEditSave: handleChapterEditSubmit,
      onChapterEditCancel: handleChapterEditCancel,
      onChapterDelete: handleChapterDelete,
      onChapterTitleGenerate: handleRequestChapterTitleGenerate,
      onAccept: handleAccept,
      onGenerate: handleRequestBlockGenerate,
      onDelete: handleDeleteBlock,
      onSaveManualEdit: handleSaveManualEdit,
      onRejectToOriginal: handleRejectToOriginal,
      onSetBookmarkBefore: handleSetBookmarkBeforeBlock,
      onCreateNote: handleCreateNote,
      onApproveSuggestion: handleApproveSuggestion,
      onRejectSuggestion: handleRejectSuggestion,
      onMergeBlocks: handleMergeBlocks,
      onAddChapterFromBlock: handleAddChapterFromBlock,
    }),
    [
      handleAccept,
      handleApproveSuggestion,
      handleChapterDelete,
      handleChapterEditOpen,
      handleChapterEditSubmit,
      handleChapterEditTitleChange,
      handleRequestChapterTitleGenerate,
      handleCreateNote,
      handleDeleteBlock,
      handleRequestBlockGenerate,
      handleMergeBlocks,
      handleRejectSuggestion,
      handleRejectToOriginal,
      handleSaveManualEdit,
      handleSetBookmarkBeforeBlock,
      handleChapterEditCancel,
      handleAddChapterFromBlock,
    ],
  );

  const renderDashboardPanel = (args: {
    kind: "original" | "translated";
    showControls: boolean;
    showSwap: boolean;
  }) => {
    const { kind, showControls, showSwap } = args;
    const isOriginal = kind === "original";
    const chapterActionsBusy = chapterEditSaving || chapterDeleteSaving || chapterAddSaving || chapterTitleGeneratingId !== null;

    return (
      <DashboardPanelShell
        kind={kind}
        title={isOriginal ? "Eredeti" : "Szerkesztett"}
        showSwap={showSwap}
        onSwap={isOriginal ? handleSwapToTranslatedPanel : handleSwapToOriginalPanel}
        swapLabel={isOriginal ? "Valtas a szerkesztett panelre" : "Valtas az eredeti panelre"}
        swapTitle={isOriginal ? "Valtas a szerkesztett panelre" : "Valtas az eredeti panelre"}
        bodyRef={isOriginal ? originalPanelRef : translatedPanelRef}
        onBodyScroll={isOriginal ? handleOriginalPanelBodyScroll : handleTranslatedPanelBodyScroll}
        onBodyClick={handlePanelBodyClick}
        inlineErrorMessage={isOriginal ? null : mergeError}
      >
        {chapterGroups.map((group) => (
          <ChapterSection
            key={`${kind}-${group.chapterId}`}
            panelMode={kind}
            group={group}
            textMode={isOriginal ? "original" : "translated"}
            showControls={showControls}
            panelAccentColor={panelAccentColor}
            isMobile={isMobile}
            activeMobileBlockId={activeMobileBlockId}
            onMobileActivate={setActiveMobileBlockId}
            isAdminSourceEditMode={adminSourceEditMode}
            bookmarksByMarkerId={bookmarksByMarkerId}
            bookmarkColorByKey={bookmarkColorByKey}
            acceptingBlockId={acceptingBlockId}
            generatingBlockId={generatingBlockId}
            deletingBlockId={deletingBlockId}
            manualSavingBlockId={manualSavingBlockId}
            creatingNoteBlockId={creatingNoteBlockId}
            generateError={generateError}
            noteError={noteError}
            manualEditError={manualEditError}
            dismissedSuggestions={dismissedSuggestions}
            chapterEdit={chapterEdit}
            chapterActionsBusy={chapterActionsBusy}
            chapterTitleGeneratingId={chapterTitleGeneratingId}
            chapterTitleError={chapterTitleError}
            chapterAddMode={chapterAddMode}
            chapterAddBusy={chapterAddSaving}
            chapterEditError={chapterEditError}
            showMergeHandles={!isOriginal}
            mergingPairKey={mergingPairKey}
            handlers={chapterSectionHandlers}
          />
        ))}
      </DashboardPanelShell>
    );
  };

  const renderOriginalPanel = (showControls: boolean, showSwap: boolean) =>
    renderDashboardPanel({ kind: "original", showControls, showSwap });

  const renderTranslatedPanel = (showControls: boolean, showSwap: boolean) =>
    renderDashboardPanel({ kind: "translated", showControls, showSwap });

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
        <div className={styles.infoColumnHeaderRow}>
          <strong>Tartalomjegyzek</strong>
          <button
            type="button"
            className={`${styles.infoHeaderActionButton} ${chapterAddMode ? styles.infoHeaderActionButtonActive : ""}`}
            onClick={handleToggleChapterAddMode}
            disabled={chapterEditSaving || chapterDeleteSaving || chapterAddSaving || !isReady}
            title={chapterAddMode ? "Fejezet-hozzaadas mod kikapcsolasa" : "Fejezet-hozzaadas mod bekapcsolasa"}
          >
            <ToolIcon type="add" />
            <span>{chapterAddMode ? "Aktiv" : "Fejezet +"}</span>
          </button>
        </div>
        <span>{chapterAddMode ? "Aktiv mod: kattints egy blokkra uj fejezethez." : "Fejezet progress"}</span>
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
              data-chapter-id={item.chapterId}
              onClick={handleChapterNavigatorJump}
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
                <div
                  role="button"
                  tabIndex={0}
                  className={styles.infoListButton}
                  data-block-id={item.blockId}
                  onClick={handleNoteNavigatorJump}
                  onKeyDown={handleNoteNavigatorKeyDown}
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
                          data-note-id={item.id}
                          onClick={handleNoteNavigatorExpandToggle}
                        >
                          {isExpanded ? "Kevesebb" : "Tovabbiak..."}
                        </button>
                      </>
                    ) : null}
                  </span>
                  <span className={styles.infoListMeta}>
                    {item.chapterIndex}.f / {item.blockIndex}.b
                  </span>
                </div>
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
              data-bookmark-id={entry.id}
              onClick={handleBookmarkNavigatorJump}
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

  const renderEditorialNotePanel = (mobile: boolean) => (
    <section className={mobile ? styles.mobileInfoBlock : styles.infoColumn}>
      <header className={styles.infoColumnHeader}>
        <strong>Szerkesztoi jegyzet</strong>
        <span>Folyamat emlekezteto</span>
      </header>
      <div className={styles.infoColumnBody}>
        <article className={styles.editorialNoteCard}>
          <p className={styles.editorialNoteLine}>
            Nezet: <strong>{store.viewState === "workbench" ? "Workbench" : "Reader"}</strong>
          </p>
          <p className={styles.editorialNoteLine}>
            Elfogadatlan generalt blokk:{" "}
            <strong>
              {generatedUnacceptedCount}/{MAX_UNACCEPTED_GENERATED_BLOCKS}
            </strong>
          </p>
          <p className={styles.editorialNoteLine}>
            Tobb blokk generalas szabad hely: <strong>{generationCapacityRemaining}</strong>
          </p>
          <p className={styles.editorialNoteHint}>
            Blokk veglegesiteshez hasznald az <strong>Elfogad</strong> lepest.
          </p>
        </article>
      </div>
    </section>
  );

  const renderDesktopInformationPanel = () => (
    <section className={`card ${styles.progressCard} ${styles.infoPanelCard}`}>
      <div className={styles.infoPanelGrid}>
        {renderChapterNavigator(false)}
        {renderNoteNavigator(false)}
        {renderBookmarkNavigator(false)}
        {renderEditorialNotePanel(false)}
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
        onClick={handleSelectMobileOriginalTab}
      >
        <span>Eredeti</span>
        <ToolIcon type="reader" />
      </button>
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "translated" ? styles.mobilePageTabActive : ""}`}
        onClick={handleSelectMobileTranslatedTab}
      >
        <span>Szerkesztett</span>
        <ActionIcon type="edit" />
      </button>
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "toc" ? styles.mobilePageTabActive : ""}`}
        onClick={handleSelectMobileTocTab}
      >
        <span>Tartalom</span>
        <ToolIcon type="toc" />
      </button>
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "notes" ? styles.mobilePageTabActive : ""}`}
        onClick={handleSelectMobileNotesTab}
      >
        <span>Jegyzetek</span>
        <ToolIcon type="notes" />
      </button>
      <button
        type="button"
        className={`${styles.mobilePageTab} ${mobilePage === "bookmarks" ? styles.mobilePageTabActive : ""}`}
        onClick={handleSelectMobileBookmarksTab}
      >
        <span>Konyvjelzok</span>
        <ToolIcon type="bookmark" />
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
    if (state.status !== "ready" || state.role !== "admin") return null;
    const sourceName = state.data.book.source_name?.trim() || "lokalis_feltoltes";
    const sourceUrl = state.data.book.source_url?.trim() || null;
    const sourceRetrievedAt = state.data.book.source_retrieved_at ?? null;
    const sourceLicenseUrl = state.data.book.source_license_url?.trim() || null;
    const sourceWorkId = state.data.book.source_work_id?.trim() || null;
    const sourceSha256 = state.data.book.source_original_sha256?.trim() || null;

    return (
      <section className={`card ${styles.progressCard} ${styles.desktopMetaCard}`}>
        <section className={styles.editPanel}>
          <div className={styles.editActions}>
            <button
              className="btn"
              type="button"
              onClick={handleToggleAdminSourceEditMode}
              aria-pressed={adminSourceEditMode}
            >
              {adminSourceEditMode ? "Forras szerkesztes: aktiv" : "Forras szerkesztes"}
            </button>
          </div>

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
            <button className="btn" type="button" onClick={handleInferPublicationYear} disabled={isYearInferring}>
              {isYearInferring ? "AI evbecsles..." : "Ev becslese (AI)"}
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
                if (state.status !== "ready") return;
                setEditFeedback(null);
                setEditForm(toBookEditForm(state.data));
              }}
              disabled={isEditSaving}
            >
              Visszaallitas
            </button>
          </div>

          <section className={styles.sourcePanel} aria-label="Forras es licenc">
            <div className={styles.sourcePanelTitle}>Forras es licenc (elozet)</div>
            <div className={styles.sourceRow}>
              <span>Forras</span>
              <strong>{sourceName}</strong>
            </div>
            {sourceWorkId ? (
              <div className={styles.sourceRow}>
                <span>Work ID</span>
                <strong>{sourceWorkId}</strong>
              </div>
            ) : null}
            {sourceUrl ? (
              <div className={styles.sourceRow}>
                <span>Forras URL</span>
                <a href={sourceUrl} target="_blank" rel="noreferrer">
                  Megnyitas
                </a>
              </div>
            ) : null}
            {sourceRetrievedAt ? (
              <div className={styles.sourceRow}>
                <span>Letoltve</span>
                <strong>{new Date(sourceRetrievedAt).toLocaleString("hu-HU", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}</strong>
              </div>
            ) : null}
            {sourceLicenseUrl ? (
              <div className={styles.sourceRow}>
                <span>Licenc</span>
                <a href={sourceLicenseUrl} target="_blank" rel="noreferrer">
                  Licenc oldal
                </a>
              </div>
            ) : null}
            {sourceSha256 ? (
              <div className={styles.sourceHash}>
                <span>Original HTML SHA-256</span>
                <code>{sourceSha256}</code>
              </div>
            ) : null}
            {sourceName.toLowerCase() === "project_gutenberg" ? (
              <div className={styles.sourceDisclaimer}>
                Project Gutenberg forras. Hasznalat orszagfuggo szerzoi jogi szabalyokhoz kotott lehet.
              </div>
            ) : null}
          </section>
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
          data-color-key={option.key}
          onClick={handleSelectedBookmarkColorChange}
          style={{ "--bookmark-color": option.color } as CSSProperties}
        />
      ))}
    </div>
  );

  const renderBottomBookActions = () => {
    if (state.status !== "ready" || state.role === "guest") return null;
    const canDeleteThisBook = state.role === "admin" || !isSourceBook;

    return (
      <section className={`card ${styles.bottomBookActions}`} aria-label="Konyv muveletek">
        <div className={styles.bottomBookActionsGrid}>
          <button
            className={styles.bottomBookActionButton}
            type="button"
            onClick={() => void handleRestoreBookFromSource()}
            disabled={!hasSourceBook || isEditorBusy}
            title={hasSourceBook ? "Eredeti konyv visszaallitasa" : "Ehhez a konyvhoz nincs forraskonyv linkelve"}
          >
            <span>{isSourceRestoreInFlight ? "Forras visszaallitasa..." : "Eredeti konyv visszaallitasa"}</span>
            <ToolIcon type="undo" />
          </button>
          <button
            className={`${styles.bottomBookActionButton} ${styles.bottomBookActionDanger}`}
            type="button"
            onClick={() => void handleDeleteCurrentBook()}
            disabled={!canDeleteThisBook || isEditorBusy}
            title={
              canDeleteThisBook
                ? isSourceBook
                  ? "Forraskonyv torlese (admin jelszo szukseges)"
                  : "Sajat konyv torlese"
                : "Forraskonyvet csak admin torolhet"
            }
          >
            <span>{isBookDeleteInFlight ? "Konyv torlese..." : "Konyv torlese"}</span>
            <ActionIcon type="delete" />
          </button>
        </div>
      </section>
    );
  };

  const renderMobileToolPanel = () => {
    if (!isMobile || state.status !== "ready") return null;

    return (
      <>
        <button
          type="button"
          className={styles.mobileToolFab}
          aria-label="Tool panel megnyitasa"
          aria-expanded={mobileToolPanelOpen}
          onClick={handleOpenMobileToolPanel}
        >
          <ToolIcon type="admin" />
        </button>

        {mobileToolPanelOpen ? (
          <>
            <button
              type="button"
              className={styles.mobileToolBackdrop}
              aria-label="Tool panel bezarasa"
              onClick={handleCloseMobileToolPanel}
            />
            <section className={styles.mobileToolSheet} aria-label="Dashboard tool panel">
              <button
                type="button"
                className={styles.mobileToolClose}
                aria-label="Tool panel bezarasa"
                onClick={handleCloseMobileToolPanel}
              >
                X
              </button>
              <section className={`card ${styles.progressCard} ${styles.mobileToolProgress}`} data-onboarding-id="onb-progress">
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
              <div className={styles.mobileToolRows}>
                <section className={styles.mobileActivityGroup}>
                  <div className={styles.mobileActivityGroupTitle}>Nezet</div>
                  <label className={styles.mobileViewSelectControl}>
                    <span>Nezet menu</span>
                    <select
                      className={styles.mobileViewSelect}
                      value={store.desktopLayout}
                      onChange={handleMobileLayoutChange}
                      aria-label="Nezet menu"
                    >
                      <option value="single">Egy oldalas nezet</option>
                      <option value="split">Osztott nezet</option>
                    </select>
                  </label>
                  {renderMobilePageTabs()}
                </section>
                <section className={styles.mobileActivityGroup}>
                  <div className={styles.mobileActivityGroupTitle}>Szerkesztes</div>
                  {state.role === "admin" ? (
                    <button
                      className={`${styles.mobileToolRow} ${styles.adminModeToggle} ${adminSourceEditMode ? styles.adminModeToggleActive : ""}`}
                      type="button"
                      role="switch"
                      aria-checked={adminSourceEditMode}
                      onClick={handleToggleAdminSourceEditMode}
                    >
                      <span>{adminSourceEditMode ? "ADMIN: source aktiv" : "ADMIN: source off"}</span>
                      <ToolIcon type="admin" />
                    </button>
                  ) : null}
                  {state.role === "admin" ? (
                    <button
                      className={`${styles.mobileToolRow} ${chapterAddMode ? styles.mobileToolRowActive : ""}`}
                      type="button"
                      onClick={handleToggleChapterAddMode}
                      disabled={chapterEditSaving || chapterDeleteSaving || chapterAddSaving || !isReady}
                    >
                      <span>{chapterAddMode ? "Fejezet +: aktiv" : "Fejezet +"}</span>
                      <ToolIcon type="add" />
                    </button>
                  ) : null}
                  <button
                    className={styles.mobileToolRow}
                    type="button"
                    onClick={() => void handleUndoLastEditedPanelChange()}
                    disabled={!isReady || !lastEditedPanelUndo || isEditorBusy}
                  >
                    <span>
                      {isUndoApplying ? "Visszaallitas..." : "Utolso szerkesztes visszavonasa"}
                    </span>
                    <ToolIcon type="undo" />
                  </button>
                  {lastEditedPanelRedo ? (
                    <button
                      className={styles.mobileToolRow}
                      type="button"
                      onClick={() => void handleRedoLastEditedPanelChange()}
                      disabled={!isReady || !lastEditedPanelRedo || isEditorBusy}
                    >
                      <span>{isRedoApplying ? "Ujraalkalmazas..." : "Visszavonas ujraalkalmazasa"}</span>
                      <ToolIcon type="redo" />
                    </button>
                  ) : null}
                  {lastEditedPanelUndo ? (
                    <div className={styles.mobileToolHint}>Visszaallithato: {lastEditedPanelUndo.actionLabel}</div>
                  ) : null}
                  {lastEditedPanelRedo ? (
                    <div className={styles.mobileToolHint}>Ujraalkalmazhato: {lastEditedPanelRedo.actionLabel}</div>
                  ) : null}
                  {undoFeedback ? <div className={styles.mobileToolHint}>{undoFeedback}</div> : null}
                </section>
                <section className={styles.mobileActivityGroup}>
                  <div className={styles.mobileActivityGroupTitle}>Onboarding</div>
                  <button
                    className={`${styles.mobileToolRow} ${onboardingGuideOpen ? styles.mobileToolRowActive : ""}`}
                    type="button"
                    data-onboarding-id="onb-replay"
                    onClick={handleOpenOnboardingGuide}
                  >
                    <span>Onboarding sugo</span>
                    <ToolIcon type="onboarding" />
                  </button>
                </section>
                <section className={styles.mobileActivityGroup}>
                  <div className={styles.mobileActivityGroupTitle}>Konyvjelzo</div>
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
                            data-bookmark-id={entry.id}
                            onClick={handleSelectBookmarkFromList}
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
                          onChange={handleSelectedBookmarkNameChange}
                          placeholder="Konyvjelzo label"
                          aria-label="Konyvjelzo label"
                          disabled={!selectedBookmark}
                        />
                      </label>
                      <button
                        className={`${styles.mobileToolRow} ${styles.mobileToolRowActive}`}
                        type="button"
                        disabled={!selectedBookmark}
                        onClick={handleJumpToSelectedBookmarkAndClose}
                      >
                        <span>Ugras a konyvjelzohoz</span>
                        <ToolIcon type="bookmark" />
                      </button>
                      <button
                        className={styles.mobileToolRow}
                        type="button"
                        onClick={handleDeleteSelectedBookmark}
                      >
                        <span>Konyvjelzo torlese</span>
                        X
                      </button>
                    </>
                  ) : null}
                </section>
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

  const renderRuntimeAlert = () => {
    if (!runtimeAlert) return null;
    return (
      <section
        className={`${styles.runtimeAlert} ${runtimeAlert.tone === "info" ? styles.runtimeAlertInfo : styles.runtimeAlertError}`}
        role="alert"
        aria-live="assertive"
      >
        <p>{runtimeAlert.message}</p>
        <button
          type="button"
          className={styles.runtimeAlertClose}
          onClick={() => setRuntimeAlert(null)}
          aria-label="Uzenet bezarasa"
        >
          X
        </button>
      </section>
    );
  };

  const renderGenerationCommentModal = () => {
    if (!generationCommentOpen || !pendingGenerationRequest) return null;

    let title = "Generalasi komment";
    let description = "Adj opcionalis kommentet a generalashoz.";
    if (pendingGenerationRequest.kind === "block") {
      title = `Blokk generalas (${pendingGenerationRequest.block.blockIndex}. blokk)`;
      description = "Adj indulasi kommentet a blokk generalashoz.";
    } else if (pendingGenerationRequest.kind === "batch") {
      title = "Tobb blokk generalasa";
      description = "Adj kozos indulasi kommentet a blokkok generalasahoz.";
    } else if (pendingGenerationRequest.kind === "chapter") {
      title = `Fejezet cim generalasa (${pendingGenerationRequest.group.chapterIndex}. fejezet)`;
      description = "Adj kommentet a fejezetcim forditasahoz vagy ujracimzeshez.";
    }

    return (
      <section className={styles.generationCommentOverlay} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.generationCommentCard}>
          <div className={styles.generationCommentHeader}>
            <strong>{title}</strong>
            <button
              type="button"
              className={styles.generationCommentClose}
              onClick={closeGenerationCommentModal}
              aria-label="Generalasi komment ablak bezarasa"
            >
              X
            </button>
          </div>
          <p className={styles.generationCommentHint}>{description}</p>
          <textarea
            className={styles.generationCommentTextarea}
            value={generationCommentDraft}
            onChange={(event) => setGenerationCommentDraft(event.target.value)}
            placeholder="pl. Tartsd meg az ironikus hangot, legyen tomor."
            autoFocus
            rows={5}
            maxLength={600}
          />
          <div className={styles.generationCommentMeta}>{generationCommentDraft.trim().length}/600</div>
          <div className={styles.generationCommentActions}>
            <button type="button" className="btn" onClick={() => void handleConfirmGenerationComment()}>
              Generalas inditasa
            </button>
            <button type="button" className="btn" onClick={closeGenerationCommentModal}>
              Megse
            </button>
          </div>
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
              {state.status === "ready" && state.role === "guest" ? (
                <GuestSessionActions
                  className={styles.topBarGuestActions}
                  buttonClassName={styles.topBarGuestButton}
                  onDeleted={() => {
                    window.location.href = "/";
                  }}
                />
              ) : null}
              {state.status === "ready" ? (
                <button
                  type="button"
                  className={`${styles.topBarFavoriteButton} ${isFavoriteBook ? styles.topBarFavoriteButtonActive : ""}`}
                  onClick={handleToggleBookFavorite}
                  disabled={isFavoriteSaving}
                  aria-label={isFavoriteBook ? "Konyv eltavolitasa a kedvencekbol" : "Konyv jelolese kedvenckent"}
                  title={isFavoriteBook ? "Kedvenc konyv" : "Jeloles kedvenckent"}
                >
                  <ToolIcon type="favorite" />
                </button>
              ) : null}
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
          {renderMobileContent()}
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
          {desktopEditPanelOpen && state.status === "ready" && state.role === "admin" ? renderBookMetaSection() : null}
        </div>
      )}
      {renderBottomBookActions()}
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
                            data-bookmark-id={entry.id}
                            onClick={handleSelectBookmarkFromList}
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
                        onChange={handleSelectedBookmarkNameChange}
                        placeholder="Konyvjelzo label"
                        aria-label="Konyvjelzo label"
                        disabled={!selectedBookmark}
                      />
                    </label>
                    <button
                      className={styles.activityIconButton}
                      type="button"
                      disabled={!selectedBookmark}
                      onClick={handleJumpToSelectedBookmark}
                      aria-label="Ugras a konyvjelzohoz"
                      title="Ugras a konyvjelzohoz"
                    >
                      <ToolIcon type="bookmark" />
                    </button>
                    <button
                      className={styles.bookmarkClearButton}
                      type="button"
                      onClick={handleDeleteSelectedBookmark}
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
                {state.role === "admin" ? (
                  <>
                    <button
                      className={`${styles.activityIconButton} ${styles.adminModeToggle} ${adminSourceEditMode ? styles.adminModeToggleActive : ""}`}
                      type="button"
                      role="switch"
                      aria-checked={adminSourceEditMode}
                      aria-label={adminSourceEditMode ? "Admin source szerkesztes kikapcsolasa" : "Admin source szerkesztes bekapcsolasa"}
                      title={adminSourceEditMode ? "Admin source szerkesztes kikapcsolasa" : "Admin source szerkesztes bekapcsolasa"}
                      onClick={handleToggleAdminSourceEditMode}
                    >
                      ADMIN
                    </button>
                    <button
                      className={`${styles.activityIconButton} ${chapterAddMode ? styles.activeToggle : ""}`}
                      type="button"
                      aria-label={chapterAddMode ? "Fejezet-hozzaadas mod kikapcsolasa" : "Fejezet-hozzaadas mod bekapcsolasa"}
                      title={chapterAddMode ? "Fejezet-hozzaadas mod kikapcsolasa" : "Fejezet-hozzaadas mod bekapcsolasa"}
                      onClick={handleToggleChapterAddMode}
                      disabled={chapterEditSaving || chapterDeleteSaving || chapterAddSaving || !isReady}
                    >
                      <ToolIcon type="add" />
                    </button>
                    <button
                      className={`${styles.activityIconButton} ${desktopEditPanelOpen ? styles.activeToggle : ""}`}
                      type="button"
                      aria-label={desktopEditPanelOpen ? "Book edit panel elrejtese" : "Book edit panel megjelenitese"}
                      title={desktopEditPanelOpen ? "Book edit panel elrejtese" : "Book edit panel megjelenitese"}
                      onClick={handleToggleDesktopEditPanel}
                    >
                      <ToolIcon type="admin" />
                    </button>
                    <button
                      className={styles.activityIconButton}
                      type="button"
                      aria-label="Tobb blokk generalasa"
                      title={`Tobb blokk generalasa (${generationCapacityRemaining})`}
                      onClick={handleRequestBatchGenerate}
                      disabled={
                        !isReady ||
                        store.viewState !== "workbench" ||
                        isBatchGenerating ||
                        isEditorBusy ||
                        generationCapacityRemaining <= 0
                      }
                    >
                      <ActionIcon type="generate" />
                    </button>
                    <button
                      className={`${styles.activityIconButton} ${autoGenerateOnScroll ? styles.activeToggle : ""}`}
                      type="button"
                      role="switch"
                      aria-checked={autoGenerateOnScroll}
                      aria-label="Gorgetes alapu auto-generalas kapcsolasa"
                      title={autoGenerateOnScroll ? "Gorgetes alapu auto-generalas: ON" : "Gorgetes alapu auto-generalas: OFF"}
                      onClick={() => setAutoGenerateOnScroll((prev) => !prev)}
                    >
                      <ToolIcon type="sync" />
                    </button>
                    <button
                      className={`${styles.activityIconButton} ${autoTranslateChapterTitles ? styles.activeToggle : ""}`}
                      type="button"
                      role="switch"
                      aria-checked={autoTranslateChapterTitles}
                      aria-label="Fejezetcim auto-forditas kapcsolasa"
                      title={autoTranslateChapterTitles ? "Fejezetcim auto-forditas: ON" : "Fejezetcim auto-forditas: OFF"}
                      onClick={() => setAutoTranslateChapterTitles((prev) => !prev)}
                    >
                      <ActionIcon type="edit" />
                    </button>
                  </>
                ) : null}
                <button
                  className={styles.activityIconButton}
                  type="button"
                  aria-label="Utolso szerkesztes visszavonasa"
                  title={lastEditedPanelUndo ? `Utolso szerkesztes visszavonasa: ${lastEditedPanelUndo.actionLabel}` : "Nincs visszaallithato szerkesztes"}
                  onClick={() => void handleUndoLastEditedPanelChange()}
                  disabled={!isReady || !lastEditedPanelUndo || isEditorBusy}
                >
                  <ToolIcon type="undo" />
                </button>
                {lastEditedPanelRedo ? (
                  <button
                    className={styles.activityIconButton}
                    type="button"
                    aria-label="Visszavonas ujraalkalmazasa"
                    title={`Visszavonas ujraalkalmazasa: ${lastEditedPanelRedo.actionLabel}`}
                    onClick={() => void handleRedoLastEditedPanelChange()}
                    disabled={!isReady || !lastEditedPanelRedo || isEditorBusy}
                  >
                    <ToolIcon type="redo" />
                  </button>
                ) : null}
              </div>
              <div className={styles.activityMeta}>
                Elfogadatlan generalt blokk: {generatedUnacceptedCount}/{MAX_UNACCEPTED_GENERATED_BLOCKS}
              </div>
              {lastEditedPanelUndo ? <div className={styles.activityMeta}>Visszaallithato: {lastEditedPanelUndo.actionLabel}</div> : null}
              {lastEditedPanelRedo ? <div className={styles.activityMeta}>Ujraalkalmazhato: {lastEditedPanelRedo.actionLabel}</div> : null}
              {batchFeedback ? <div className={styles.activityMeta}>{batchFeedback}</div> : null}
              {undoFeedback ? <div className={styles.activityMeta}>{undoFeedback}</div> : null}
            </div>

          </section>
        </aside>
      ) : null}
      {renderOnboardingGuide()}
      {renderOnboardingPopup()}
      {renderRuntimeAlert()}
      {renderGenerationCommentModal()}
      {renderMobileToolPanel()}
  </div>
);
}
