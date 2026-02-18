"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toSessionIdentity } from "@/lib/auth/identity";
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

type LibraryClientProps = {
  requireSession?: boolean;
  showTools?: boolean;
  showMobileToolsFab?: boolean;
};

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

function isFavorite(book: BookRow) {
  return book.is_favorite === true;
}

function hasMissingRelationError(error: { message?: string } | null, relationName: string): boolean {
  const normalized = `${error?.message ?? ""}`.toLowerCase();
  const needle = relationName.trim().toLowerCase();
  if (!needle) return false;
  return normalized.includes("relation") && normalized.includes(needle);
}

function resolveCarouselVisibleCount(viewportWidth: number | null) {
  if (viewportWidth !== null && viewportWidth <= 720) return 4;
  if (viewportWidth !== null && viewportWidth <= 1100) return 11;
  return 14;
}

export function LibraryClient({
  requireSession = true,
  showTools = true,
  showMobileToolsFab = true,
}: LibraryClientProps = {}) {
  const [state, setState] = useState<LoadState>({ status: "booting" });
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("author_asc");
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadBooks() {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      const identity = toSessionIdentity(sessionData.session ?? null);

      if (requireSession) {
        if (sessionErr || !identity?.userId) {
          if (!cancelled) {
            setState({
              status: "error",
              message: sessionErr?.message ?? "Nincs aktív munkamenet. Lépj be vagy indíts vendég munkamenetet.",
            });
          }
          return;
        }
      }

      let query = supabase
        .from("books")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!identity?.userId) {
        query = query.eq("is_public", true).eq("status", "ready");
      } else {
        query = query.or(`owner_id.eq.${identity.userId},is_public.eq.true`);
      }

      const { data, error } = await query;

      if (error) {
        if (!cancelled) setState({ status: "error", message: error.message });
        return;
      }

      let personalFavoriteBookIds = new Set<string>();
      if (identity?.userId) {
        const favoritesTable = supabase.from("book_favorites") as any;
        const { data: favoriteRows, error: favoriteError } = await favoritesTable
          .select("book_id")
          .eq("user_id", identity.userId);
        if (favoriteError && !hasMissingRelationError(favoriteError, "book_favorites")) {
          if (!cancelled) setState({ status: "error", message: favoriteError.message });
          return;
        }
        personalFavoriteBookIds = new Set(
          ((favoriteRows as Array<{ book_id: string }> | null) ?? []).map((entry) => entry.book_id),
        );
      }

      const mergedBooks = ((data ?? []) as BookRow[]).map((book) => {
        const isGlobalFavorite = book.is_favorite === true;
        const isPersonalFavorite = identity?.userId ? personalFavoriteBookIds.has(book.id) : false;
        return {
          ...book,
          is_global_favorite: isGlobalFavorite,
          is_personal_favorite: isPersonalFavorite,
          is_favorite: isGlobalFavorite || isPersonalFavorite,
        } satisfies BookRow;
      });

      if (!cancelled) {
        setState({ status: "ready", books: mergedBooks });
      }
    }

    loadBooks();

    return () => {
      cancelled = true;
    };
  }, [requireSession, supabase]);

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
  const filteredAndSortedBooks = books
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
  const filteredBooks = [
    ...filteredAndSortedBooks.filter((book) => isFavorite(book)),
    ...filteredAndSortedBooks.filter((book) => !isFavorite(book)),
  ];

  const activeIndex = filteredBooks.findIndex((book) => book.id === activeBookId);
  const effectiveActiveIndex = activeIndex >= 0 ? activeIndex : filteredBooks.length > 0 ? 0 : -1;
  const activeBook = effectiveActiveIndex >= 0 ? filteredBooks[effectiveActiveIndex] : null;
  const isMobileViewport = viewportWidth !== null && viewportWidth <= 720;
  const enableHoverPreview = !isMobileViewport;
  const carouselVisibleCount = resolveCarouselVisibleCount(viewportWidth);
  const visibleBooks = useMemo(() => {
    if (effectiveActiveIndex < 0 || filteredBooks.length === 0) return [];
    const windowSize = Math.min(filteredBooks.length, carouselVisibleCount);
    const maxStart = filteredBooks.length - windowSize;
    const preferredStart = effectiveActiveIndex - Math.floor(windowSize / 2);
    const start = Math.max(0, Math.min(maxStart, preferredStart));
    return filteredBooks.slice(start, start + windowSize);
  }, [carouselVisibleCount, effectiveActiveIndex, filteredBooks]);
  const renderedCarouselBooks = isMobileViewport ? filteredBooks : visibleBooks;
  const hasPrev = effectiveActiveIndex > 0;
  const hasNext = effectiveActiveIndex >= 0 && effectiveActiveIndex < filteredBooks.length - 1;
  const paginationStep = Math.max(1, Math.min(carouselVisibleCount, filteredBooks.length));
  const paginationStarts = useMemo(() => {
    if (filteredBooks.length === 0) return [];
    const starts: number[] = [];
    for (let index = 0; index < filteredBooks.length; index += paginationStep) {
      starts.push(index);
    }
    return starts;
  }, [filteredBooks.length, paginationStep]);
  const activePaginationIndex =
    effectiveActiveIndex >= 0 ? Math.floor(effectiveActiveIndex / paginationStep) : -1;
  const bookIndexById = useMemo(() => {
    const map = new Map<string, number>();
    filteredBooks.forEach((book, index) => map.set(book.id, index));
    return map;
  }, [filteredBooks]);

  function activateByIndex(index: number) {
    const next = filteredBooks[index];
    if (!next) return;
    setActiveBookId(next.id);
  }

  function goPrev() {
    if (!hasPrev) return;
    const remaining = effectiveActiveIndex;
    const step = Math.min(paginationStep, remaining);
    activateByIndex(effectiveActiveIndex - step);
  }

  function goNext() {
    if (!hasNext) return;
    const remaining = filteredBooks.length - 1 - effectiveActiveIndex;
    const step = Math.min(paginationStep, remaining);
    activateByIndex(effectiveActiveIndex + step);
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
        goPrev();
      }

      if (event.key === "ArrowRight" && hasNext) {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, hasNext, hasPrev]);

  useEffect(() => {
    function onResize() {
      setViewportWidth(window.innerWidth);
      if (window.innerWidth > 720) {
        setMobileToolsOpen(false);
      }
    }

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (state.status === "booting") {
    return <div className="card">Betöltés...</div>;
  }

  if (state.status === "error") {
    return (
      <div className="card">
        <div style={{ fontWeight: 650, marginBottom: 6 }}>Hiba történt</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.55 }}>{state.message}</div>
        <div style={{ marginTop: 10 }}>
          <small>Ellenőrizd a munkamenetet, majd próbáld újra a landing oldalról.</small>
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
        <span className="library-tool-label">Szűrés</span>
        <input
          className="input"
          type="text"
          placeholder="Cím, szerző, leírás..."
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
        />
      </label>

      <label className="library-tool-field">
        <span className="library-tool-label">Státusz</span>
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
        <span className="library-tool-label">Sorbarendezés</span>
        <select
          className="input"
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
        >
          <option value="updated_desc">Frissítés (új -&gt; régi)</option>
          <option value="updated_asc">Frissítés (régi -&gt; új)</option>
          <option value="title_asc">Cím (A-Z)</option>
          <option value="title_desc">Cím (Z-A)</option>
          <option value="author_asc">Szerző (A-Z)</option>
          <option value="author_desc">Szerző (Z-A)</option>
          <option value="year_desc">Év (új -&gt; régi)</option>
          <option value="year_asc">Év (régi -&gt; új)</option>
          <option value="length_desc">Hossz (hosszú -&gt; rövid)</option>
          <option value="length_asc">Hossz (rövid -&gt; hosszú)</option>
          <option value="edited_ratio_desc">Szerkesztettség (magas -&gt; alacsony)</option>
          <option value="edited_ratio_asc">Szerkesztettség (alacsony -&gt; magas)</option>
        </select>
      </label>
    </div>
  );

  return (
    <div className="library-layout">
      {showTools ? (
        <section
          className="library-prototype-tools library-toolbar-desktop"
          aria-label="Könyvespolc szűrés és sorbarendezés prototípus"
        >
          {renderToolsContent()}
        </section>
      ) : null}

      <section className="library-carousel-shell" aria-label="Könyvlista">
        <button
          type="button"
          className="carousel-arrow"
          onClick={goPrev}
          disabled={!hasPrev}
          aria-label="Előző könyv"
        >
          <span className="carousel-arrow-icon left" aria-hidden="true" />
        </button>

        <div
          className="library-carousel-stage"
        >
          {activeBook ? (
            <div className="library-carousel-track">
              {renderedCarouselBooks.map((book) => {
                const isActive = isMobileViewport ? false : book.id === activeBook.id;
                const bookIndex = bookIndexById.get(book.id) ?? -1;
                const isBeforeActive = bookIndex >= 0 && bookIndex < effectiveActiveIndex;
                const isAfterActive = bookIndex > effectiveActiveIndex;
                return (
                  <div
                    key={book.id}
                    className={`library-carousel-item${isActive ? " is-active" : " is-inactive"}${isBeforeActive ? " is-before-active" : ""}${isAfterActive ? " is-after-active" : ""}`}
                  >
                    <BookCard
                      book={book}
                      isActive={isActive}
                      onActivate={setActiveBookId}
                      openOnInactive={isMobileViewport}
                      onHoverStart={enableHoverPreview ? setActiveBookId : undefined}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card">Nincs találat a jelenlegi szűrésre.</div>
          )}
        </div>

        <button
          type="button"
          className="carousel-arrow"
          onClick={goNext}
          disabled={!hasNext}
          aria-label="Következő könyv"
        >
          <span className="carousel-arrow-icon right" aria-hidden="true" />
        </button>
      </section>

      <div className="carousel-pagination" aria-label="Könyv oldalak">
        {paginationStarts.map((startIndex, pageIndex) => {
          const pageEnd = Math.min(filteredBooks.length, startIndex + paginationStep);
          return (
          <span
            key={`${startIndex}-${pageEnd}`}
            className={`carousel-dot${pageIndex === activePaginationIndex ? " is-active" : ""}`}
            aria-label={`${startIndex + 1}-${pageEnd}. könyvoldal`}
            aria-hidden="true"
          />
          );
        })}
      </div>

      {showMobileToolsFab && showTools ? (
        <button
          type="button"
          className="mobile-tools-fab"
          aria-label="Tool panel megnyitása"
          aria-expanded={mobileToolsOpen}
          onClick={() => setMobileToolsOpen(true)}
        >
          <Icon name="admin" size={20} />
        </button>
      ) : null}

      {mobileToolsOpen && showMobileToolsFab && showTools ? (
        <>
          <button
            type="button"
            className="mobile-tools-backdrop"
            aria-label="Tool panel bezárása"
            onClick={() => setMobileToolsOpen(false)}
          />
          <section className="mobile-tools-sheet" aria-label="Mobil tool panel">
            {renderToolsContent()}
          </section>
        </>
      ) : null}
    </div>
  );
}
