"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureAnonIdentity } from "@/lib/auth/anon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  acceptBlockVariant,
  fetchBookDashboardData,
  type BookDashboardData,
  type DashboardBlock,
} from "@/lib/db/queries/books";
import type {
  DashboardActivePanel,
  DashboardPanelMode,
  DashboardViewState,
} from "@/components/BookDashboard/types";
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
  background: string;
};

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
  activePanel: DashboardActivePanel;
  syncScroll: boolean;
};

const MOBILE_BREAKPOINT = 960;

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
    icon: data.book.cover_slug ?? "",
    background: data.book.background_slug ?? data.book.cover_slug ?? "",
  };
}

function blockStatusLabel(block: DashboardBlock): string {
  if (block.isAccepted) return "Elfogadva";
  if (block.workflowStatus === "rejected") return "Elutasitott";
  if (block.hasAcceptableVariant) return "Ellenorizendo";
  return "Nincs forditas";
}

function BlockControls({
  block,
  acceptInFlight,
  onAccept,
}: {
  block: DashboardBlock;
  acceptInFlight: boolean;
  onAccept: (block: DashboardBlock) => void;
}) {
  const canAccept = block.hasAcceptableVariant && !block.isAccepted;
  const acceptDisabledReason = canAccept ? undefined : "Nincs elfogadhato valtozat";

  return (
    <div className={styles.blockFooter}>
      <span className={styles.blockStatus} data-state={block.workflowStatus}>
        {blockStatusLabel(block)}
      </span>
      <button
        className="btn"
        type="button"
        onClick={() => onAccept(block)}
        disabled={!canAccept || acceptInFlight}
        title={acceptDisabledReason}
      >
        {block.isAccepted ? "Elfogadva" : acceptInFlight ? "Mentese..." : "Elfogad"}
      </button>
    </div>
  );
}

function BlockCard({
  block,
  textMode,
  acceptInFlight,
  onAccept,
  showControls,
}: {
  block: DashboardBlock;
  textMode: DashboardActivePanel;
  acceptInFlight: boolean;
  onAccept: (block: DashboardBlock) => void;
  showControls: boolean;
}) {
  const title = `Fejezet ${block.chapterIndex} / Blokk ${block.blockIndex}`;
  const subtitle = block.chapterTitle?.trim() ? block.chapterTitle : "Cim nelkul";
  const text =
    textMode === "original"
      ? block.originalText
      : block.translatedText?.trim() || "Nincs forditott valtozat.";

  return (
    <article className={styles.blockCard} data-status={block.workflowStatus}>
      <header className={styles.blockHeader}>
        <div className={styles.blockTitle}>{title}</div>
        <div className={styles.blockSubtitle}>{subtitle}</div>
      </header>
      <p className={styles.blockText}>{text}</p>
      {showControls ? (
        <BlockControls block={block} acceptInFlight={acceptInFlight} onAccept={onAccept} />
      ) : null}
    </article>
  );
}

export function BookDashboard({ bookId }: { bookId: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<LoadState>({ status: "booting" });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<BookEditForm>({
    title: "",
    author: "",
    year: "",
    description: "",
    icon: "",
    background: "",
  });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editFeedback, setEditFeedback] = useState<string | null>(null);
  const [store, setStore] = useState<DashboardViewStore>({
    viewState: "workbench",
    panelMode: "single",
    activePanel: "translated",
    syncScroll: true,
  });
  const [acceptingBlockId, setAcceptingBlockId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
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
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sikertelen mentes.";
        setState({ status: "error", message });
      } finally {
        setAcceptingBlockId(null);
      }
    },
    [loadDashboard, state, supabase],
  );

  const handleEditSubmit = useCallback(async () => {
    if (state.status !== "ready") return;

    const title = editForm.title.trim();
    const author = editForm.author.trim();
    const description = editForm.description.trim();
    const icon = normalizeIconSlug(editForm.icon);
    const background = normalizeIconSlug(editForm.background);
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
      background_slug: background || null,
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
          "A cim/szerzo/leiras mentve. Az ev, ikon vagy hatter oszlop hianyzik az adatbazisban.",
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
    setIsEditOpen(false);
    await loadDashboard({ keepCurrentView: true });
  }, [bookId, editForm, loadDashboard, state, supabase]);

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

  if (state.status === "booting") {
    return <div className="card">Betoltes...</div>;
  }

  if (state.status === "error") {
    return (
      <div className="card">
        <div style={{ fontWeight: 650, marginBottom: 6 }}>Dashboard hiba</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.5 }}>{state.message}</div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={() => loadDashboard()}>
            Ujraprobalas
          </button>
        </div>
      </div>
    );
  }

  const { book, blocks, completion } = state.data;
  const progress = completionPercent(completion.ratio);
  const canReader = completion.isComplete;
  const isReaderPrimary = completion.isComplete;
  const readerDisabledReason =
    completion.accepted === 0
      ? "Reader mod 0%-nal nem erheto el."
      : "Reader mod csak 100%-os completionnel erheto el.";
  const iconPreviewSlug = normalizeIconSlug(editForm.icon);
  const iconPreviewPath = iconPreviewSlug
    ? `url('/covers/SVG/${iconPreviewSlug}.svg'), url('/covers/${iconPreviewSlug}.png')`
    : null;

  const renderOriginalPanel = (showControls: boolean) => (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>Eredeti</div>
      <div
        className={styles.panelBody}
        ref={originalPanelRef}
        onScroll={() => syncPanels("original")}
      >
        {blocks.map((block) => (
          <BlockCard
            key={`original-${block.id}`}
            block={block}
            textMode="original"
            acceptInFlight={acceptingBlockId === block.id}
            onAccept={handleAccept}
            showControls={showControls}
          />
        ))}
      </div>
    </section>
  );

  const renderTranslatedPanel = (showControls: boolean) => (
    <section className={styles.panel}>
      <div className={styles.panelTitle}>Forditott</div>
      <div
        className={styles.panelBody}
        ref={translatedPanelRef}
        onScroll={() => syncPanels("translated")}
      >
        {blocks.map((block) => (
          <BlockCard
            key={`translated-${block.id}`}
            block={block}
            textMode="translated"
            acceptInFlight={acceptingBlockId === block.id}
            onAccept={handleAccept}
            showControls={showControls}
          />
        ))}
      </div>
    </section>
  );

  const renderWorkbenchDesktop = () => (
    <div className={styles.desktopSplit}>
      {renderOriginalPanel(true)}
      {renderTranslatedPanel(true)}
    </div>
  );

  const renderReaderDesktop = () => (
    <div className={styles.readerDesktop}>
      {renderTranslatedPanel(false)}
    </div>
  );

  const renderMobileContent = () => {
    const panels =
      store.viewState === "reader"
        ? { primary: "translated" as DashboardActivePanel, secondary: "original" as DashboardActivePanel }
        : { primary: "original" as DashboardActivePanel, secondary: "translated" as DashboardActivePanel };

    if (store.panelMode === "stacked") {
      if (store.viewState === "reader") {
        return (
          <div className={styles.mobileStack}>
            {renderTranslatedPanel(false)}
            {renderOriginalPanel(false)}
          </div>
        );
      }
      return (
        <div className={styles.mobileStack}>
          {renderOriginalPanel(true)}
          {renderTranslatedPanel(true)}
        </div>
      );
    }

    if (store.activePanel === "original") {
      return renderOriginalPanel(store.viewState === "workbench");
    }
    if (store.activePanel === "translated") {
      return renderTranslatedPanel(store.viewState === "workbench");
    }
    return panels.primary === "original"
      ? renderOriginalPanel(store.viewState === "workbench")
      : renderTranslatedPanel(store.viewState === "workbench");
  };

  return (
    <div className={styles.dashboard}>
      <header className={`card ${styles.header}`}>
        <div className={styles.headerTop}>
          <div>
            <div className="h1">{book.title}</div>
            <div className={styles.metaRow}>{book.author?.trim() || "Ismeretlen szerzo"}</div>
          </div>
          <div className={styles.headerActions}>
            <Link className="btn" href="/">
              Vissza a konyvtarba
            </Link>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setEditFeedback(null);
                setEditForm(toBookEditForm(state.data));
                setIsEditOpen((prev) => !prev);
              }}
            >
              {isEditOpen ? "Szerkesztes bezarasa" : "Konyv adatai szerkesztese"}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => setStore((prev) => ({ ...prev, viewState: "workbench" }))}
            >
              Workbench
            </button>
            <button
              className={`btn ${isReaderPrimary ? styles.primaryAction : ""}`}
              type="button"
              disabled={!canReader}
              title={!canReader ? readerDisabledReason : undefined}
              onClick={() => setStore((prev) => ({ ...prev, viewState: "reader", activePanel: "translated" }))}
            >
              Reader
            </button>
          </div>
        </div>

        <div className={styles.progressRow}>
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
        </div>

        {isEditOpen ? (
          <section className={styles.editPanel}>
            <div className={styles.editGrid}>
              <label className={styles.editField}>
                <span>Cim</span>
                <input
                  className="input"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="pl. A jo palocok"
                />
              </label>
              <label className={styles.editField}>
                <span>Szerzo</span>
                <input
                  className="input"
                  value={editForm.author}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, author: event.target.value }))
                  }
                  placeholder="pl. Mikszath Kalman"
                />
              </label>
              <label className={styles.editField}>
                <span>Ev</span>
                <input
                  className="input"
                  value={editForm.year}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, year: event.target.value }))
                  }
                  placeholder="pl. 1901"
                  inputMode="numeric"
                />
              </label>
              <label className={styles.editField}>
                <span>Ikon (slug)</span>
                <input
                  className="input"
                  value={editForm.icon}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, icon: event.target.value }))
                  }
                  placeholder="pl. golyakalifa"
                />
              </label>
              <label className={styles.editField}>
                <span>Hatter (slug)</span>
                <input
                  className="input"
                  value={editForm.background}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, background: event.target.value }))
                  }
                  placeholder="pl. golyakalifa"
                />
              </label>
            </div>

            <label className={styles.editField}>
              <span>Rovid leiras</span>
              <textarea
                className={styles.editTextarea}
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="1-2 mondat."
              />
            </label>

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
        ) : null}

        <div className={styles.controlsRow}>
          {isMobile ? (
            <>
              <div className={styles.mobileToggleGroup}>
                <button
                  className={`btn ${store.panelMode === "single" ? styles.activeToggle : ""}`}
                  type="button"
                  onClick={() => setStore((prev) => ({ ...prev, panelMode: "single" }))}
                >
                  Single
                </button>
                <button
                  className={`btn ${store.panelMode === "stacked" ? styles.activeToggle : ""}`}
                  type="button"
                  onClick={() => setStore((prev) => ({ ...prev, panelMode: "stacked" }))}
                >
                  Stacked
                </button>
              </div>
              {store.panelMode === "single" ? (
                <div className={styles.mobileToggleGroup}>
                  <button
                    className={`btn ${store.activePanel === "original" ? styles.activeToggle : ""}`}
                    type="button"
                    onClick={() => setStore((prev) => ({ ...prev, activePanel: "original" }))}
                  >
                    Eredeti
                  </button>
                  <button
                    className={`btn ${store.activePanel === "translated" ? styles.activeToggle : ""}`}
                    type="button"
                    onClick={() => setStore((prev) => ({ ...prev, activePanel: "translated" }))}
                  >
                    Forditott
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <label className={styles.syncToggle}>
              <input
                type="checkbox"
                checked={store.syncScroll}
                onChange={(event) =>
                  setStore((prev) => ({ ...prev, syncScroll: event.target.checked }))
                }
              />
              Szinkron gorgetes
            </label>
          )}
        </div>
      </header>

      {blocks.length === 0 ? (
        <div className="card">Ehhez a konyvhoz meg nincs blokk.</div>
      ) : isMobile ? (
        renderMobileContent()
      ) : store.viewState === "workbench" ? (
        renderWorkbenchDesktop()
      ) : (
        renderReaderDesktop()
      )}
    </div>
  );
}
