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

function blockStatusLabel(block: DashboardBlock): string {
  if (block.isAccepted) return "Elfogadva";
  if (block.translatedText?.trim()) return "Ellenorizendo";
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
  const canAccept = Boolean(block.translatedText?.trim()) && !block.isAccepted;

  return (
    <div className={styles.blockFooter}>
      <span className={styles.blockStatus} data-state={block.isAccepted ? "accepted" : "pending"}>
        {blockStatusLabel(block)}
      </span>
      <button
        className="btn"
        type="button"
        onClick={() => onAccept(block)}
        disabled={!canAccept || acceptInFlight}
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
    <article className={styles.blockCard}>
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
              onClick={() => setStore((prev) => ({ ...prev, viewState: "workbench" }))}
            >
              Workbench
            </button>
            <button
              className="btn"
              type="button"
              disabled={!canReader}
              onClick={() => setStore((prev) => ({ ...prev, viewState: "reader", activePanel: "translated" }))}
            >
              Reader
            </button>
          </div>
        </div>

        <div className={styles.progressRow}>
          <div className={styles.progressLabel}>
            Completion: {completion.accepted} / {completion.total} ({progress}%)
          </div>
          <div className="progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>

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
