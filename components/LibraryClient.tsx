"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureAnonIdentity } from "@/lib/auth/anon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BookRow } from "@/lib/types";
import { BookCard } from "@/components/BookCard";
import { LibraryEmpty } from "@/components/LibraryEmpty";
import { Icon } from "@/src/ui/icons/Icon";

type LoadState =
  | { status: "booting" }
  | { status: "error"; message: string }
  | { status: "ready"; books: BookRow[] };

type SortMode =
  | "updated_desc"
  | "updated_asc"
  | "title_asc"
  | "title_desc"
  | "author_asc"
  | "author_desc"
  | "year_desc"
  | "year_asc"
  | "length_desc"
  | "length_asc"
  | "edited_ratio_desc"
  | "edited_ratio_asc";

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveBookYear(book: BookRow) {
  const direct = book.publication_year ?? book.year;
  if (direct !== null && direct !== undefined && `${direct}`.trim() !== "") {
    const parsed = Number.parseInt(`${direct}`, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  const currentYear = new Date().getUTCFullYear();
  const text = `${book.description ?? ""} ${book.source_filename ?? ""}`;
  const matches = [...text.matchAll(/\b(1[5-9]\d{2}|20\d{2})\b/g)];
  const candidateYears = matches
    .map((entry) => Number.parseInt(entry[1], 10))
    .filter((year) => Number.isFinite(year) && year <= currentYear);
  if (candidateYears.length > 0) return Math.min(...candidateYears);
  return null;
}

function resolveBookLength(book: BookRow) {
  return typeof book.source_size_bytes === "number" && Number.isFinite(book.source_size_bytes)
    ? Math.max(0, book.source_size_bytes)
    : 0;
}

function resolveEditedRatio(book: BookRow) {
  const raw = typeof book.progress === "number" && Number.isFinite(book.progress) ? book.progress : 0;
  return Math.max(0, Math.min(100, raw));
}

export function LibraryClient() {
  const [state, setState] = useState<LoadState>({ status: "booting" });
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("author_asc");
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadBooks() {
      const boot = await ensureAnonIdentity();
      if (!boot.ok) {
        if (!cancelled) setState({ status: "error", message: boot.reason });
        return;
      }

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        if (!cancelled) setState({ status: "error", message: error.message });
        return;
      }

      if (!cancelled) {
        setState({ status: "ready", books: (data ?? []) as BookRow[] });
      }
    }

    loadBooks();
    const id = window.setInterval(loadBooks, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [supabase]);

  useEffect(() => {
    if (state.status !== "ready") return;
    if (state.books.length === 0) {
      if (activeBookId !== null) setActiveBookId(null);
      return;
    }
    if (!activeBookId || !state.books.some((book) => book.id === activeBookId)) {
      setActiveBookId(state.books[0].id);
    }
  }, [activeBookId, state]);
  const readyBooks = state.status === "ready" ? state.books : [];
  const normalizedSearch = normalizeText(searchText);
  const books = [...readyBooks];
  const filteredBooks = books
    .filter((book) => {
      if (statusFilter !== "all" && book.status !== statusFilter) return false;
      if (!normalizedSearch) return true;
      const haystack = `${normalizeText(book.title)} ${normalizeText(book.author)} ${normalizeText(book.description)}`;
      return haystack.includes(normalizedSearch);
    })
    .sort((a, b) => {
      if (sortMode === "updated_asc") return a.updated_at.localeCompare(b.updated_at);
      if (sortMode === "title_asc") return a.title.localeCompare(b.title, "hu");
      if (sortMode === "title_desc") return b.title.localeCompare(a.title, "hu");
      if (sortMode === "author_asc") return (a.author ?? "").localeCompare(b.author ?? "", "hu");
      if (sortMode === "author_desc") return (b.author ?? "").localeCompare(a.author ?? "", "hu");
      if (sortMode === "year_desc") return (resolveBookYear(b) ?? -1) - (resolveBookYear(a) ?? -1);
      if (sortMode === "year_asc") return (resolveBookYear(a) ?? -1) - (resolveBookYear(b) ?? -1);
      if (sortMode === "length_desc") return resolveBookLength(b) - resolveBookLength(a);
      if (sortMode === "length_asc") return resolveBookLength(a) - resolveBookLength(b);
      if (sortMode === "edited_ratio_desc") return resolveEditedRatio(b) - resolveEditedRatio(a);
      if (sortMode === "edited_ratio_asc") return resolveEditedRatio(a) - resolveEditedRatio(b);
      return b.updated_at.localeCompare(a.updated_at);
    });

  const activeIndex = filteredBooks.findIndex((book) => book.id === activeBookId);
  const effectiveActiveIndex = activeIndex >= 0 ? activeIndex : filteredBooks.length > 0 ? 0 : -1;
  const activeBook = effectiveActiveIndex >= 0 ? filteredBooks[effectiveActiveIndex] : null;
  const visibleBooks = filteredBooks;
  const hasPrev = effectiveActiveIndex > 0;
  const hasNext = effectiveActiveIndex >= 0 && effectiveActiveIndex < filteredBooks.length - 1;

  function activateByIndex(index: number) {
    const next = filteredBooks[index];
    if (!next) return;
    setActiveBookId(next.id);
  }

  function goPrev() {
    if (!hasPrev) return;
    activateByIndex(effectiveActiveIndex - 1);
  }

  function goNext() {
    if (!hasNext) return;
    activateByIndex(effectiveActiveIndex + 1);
  }

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tagName = target.tagName;
      return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isTypingTarget(event.target)) return;

      if (event.key === "ArrowLeft" && hasPrev) {
        event.preventDefault();
        activateByIndex(effectiveActiveIndex - 1);
      }

      if (event.key === "ArrowRight" && hasNext) {
        event.preventDefault();
        activateByIndex(effectiveActiveIndex + 1);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [effectiveActiveIndex, hasNext, hasPrev, filteredBooks]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 720) {
        setMobileToolsOpen(false);
      }
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (state.status === "booting") {
    return <div className="card">Betoltes...</div>;
  }

  if (state.status === "error") {
    return (
      <div className="card">
        <div style={{ fontWeight: 650, marginBottom: 6 }}>Hiba tortent</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.55 }}>{state.message}</div>
        <div style={{ marginTop: 10 }}>
          <small>Ellenorizd a Supabase env valtozokat es az anon auth beallitast.</small>
        </div>
      </div>
    );
  }

  if (readyBooks.length === 0) return <LibraryEmpty />;

  const allStatuses = Array.from(new Set(readyBooks.map((book) => book.status))).sort((a, b) =>
    a.localeCompare(b, "hu")
  );

  const renderToolsContent = () => (
    <div className="library-tools-grid">
      <label className="library-tool-field">
        <span className="library-tool-label">Szures</span>
        <input
          className="input"
          type="text"
          placeholder="Cim, szerzo, leiras..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </label>

      <label className="library-tool-field">
        <span className="library-tool-label">Statusz</span>
        <select
          className="input"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">Minden</option>
          {allStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className="library-tool-field">
        <span className="library-tool-label">Sorbarendezes</span>
        <select
          className="input"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
        >
          <option value="updated_desc">Frissites (uj -&gt; regi)</option>
          <option value="updated_asc">Frissites (regi -&gt; uj)</option>
          <option value="title_asc">Cim (A-Z)</option>
          <option value="title_desc">Cim (Z-A)</option>
          <option value="author_asc">Szerzo (A-Z)</option>
          <option value="author_desc">Szerzo (Z-A)</option>
          <option value="year_desc">Ev (uj -&gt; regi)</option>
          <option value="year_asc">Ev (regi -&gt; uj)</option>
          <option value="length_desc">Hossz (hosszu -&gt; rovid)</option>
          <option value="length_asc">Hossz (rovid -&gt; hosszu)</option>
          <option value="edited_ratio_desc">Szerkesztettseg (magas -&gt; alacsony)</option>
          <option value="edited_ratio_asc">Szerkesztettseg (alacsony -&gt; magas)</option>
        </select>
      </label>
    </div>
  );

  return (
    <div className="library-layout">
      <section
        className="library-prototype-tools library-toolbar-desktop"
        aria-label="Konyvespolc szures es sorbarendezes prototipus"
      >
        {renderToolsContent()}
      </section>

      <section className="library-carousel-shell" aria-label="Konyvlista">
        <button
          type="button"
          className="carousel-arrow"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Elozo konyv"
        >
          <span className="carousel-arrow-icon left" aria-hidden="true" />
        </button>

        <div className="library-carousel-stage">
          {activeBook ? (
            <div className="library-carousel-track">
              {visibleBooks.map((book) => {
                const isActive = book.id === activeBook.id;
                return (
                  <div
                    key={book.id}
                    className={`library-carousel-item${isActive ? " is-active" : " is-inactive"}`}
                  >
                    <BookCard book={book} isActive={isActive} onActivate={setActiveBookId} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card">Nincs talalat a jelenlegi szuresre.</div>
          )}
        </div>

        <button
          type="button"
          className="carousel-arrow"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Kovetkezo konyv"
        >
          <span className="carousel-arrow-icon right" aria-hidden="true" />
        </button>
      </section>

      <div className="carousel-pagination" aria-label="Konyv oldalak">
        {filteredBooks.map((book, index) => (
          <button
            key={book.id}
            type="button"
            className={`carousel-dot${book.id === activeBook?.id ? " is-active" : ""}`}
            aria-label={`${index + 1}. konyv: ${book.title}`}
            onClick={() => activateByIndex(index)}
          />
        ))}
      </div>

      <button
        type="button"
        className="mobile-tools-fab"
        aria-label="Tool panel megnyitasa"
        aria-expanded={mobileToolsOpen}
        onClick={() => setMobileToolsOpen(true)}
      >
        <Icon name="admin" size={20} />
      </button>

      {mobileToolsOpen ? (
        <>
          <button
            type="button"
            className="mobile-tools-backdrop"
            aria-label="Tool panel bezarasa"
            onClick={() => setMobileToolsOpen(false)}
          />
          <section className="mobile-tools-sheet" aria-label="Mobil tool panel">
            <div className="mobile-tools-sheet-title">
              <span>Tool panel</span>
              <Icon name="admin" size={16} />
            </div>
            {renderToolsContent()}
          </section>
        </>
      ) : null}
    </div>
  );
}

