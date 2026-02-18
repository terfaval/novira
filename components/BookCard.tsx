"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { BookRow } from "@/lib/types";
import { BookCoverIcon } from "@/components/BookCoverIcon";
import { Icon } from "@/src/ui/icons/Icon";

function inferOriginalBookYear(book: BookRow) {
  const currentYear = new Date().getUTCFullYear();
  const text = `${book.description ?? ""} ${book.source_filename ?? ""}`;
  const yearMatches = [...text.matchAll(/\b(1[5-9]\d{2}|20\d{2})\b/g)];
  const candidateYears = yearMatches
    .map((entry) => Number(entry[1]))
    .filter((year) => Number.isFinite(year) && year <= currentYear);
  if (candidateYears.length > 0) {
    return `${Math.min(...candidateYears)}`;
  }
  return null;
}

function statusMeta(status: BookRow["status"]) {
  switch (status) {
    case "uj":
      return { label: "Új", color: "#A2672D" };
    case "feldolgozas":
    case "processing":
      return { label: "Feldolgozás", color: "#2F6AA8" };
    case "szerkesztes":
      return { label: "Szerkesztés", color: "#B08D57" };
    case "kesz":
      return { label: "Kész", color: "#2D8A4F" };
    case "ready":
      return { label: "Új", color: "#2A7A66" };
    case "hiba":
    case "failed":
      return { label: "Hiba", color: "#B24A3A" };
    default:
      return { label: "Ismeretlen", color: "#6F7691" };
  }
}

function toCoverSlug(book: BookRow) {
  if (typeof book.cover_slug === "string" && book.cover_slug.trim()) {
    return book.cover_slug.trim().toLowerCase();
  }

  return book.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toBackgroundSlug(book: BookRow, fallbackSlug: string) {
  if (typeof book.background_slug === "string" && book.background_slug.trim()) {
    return book.background_slug.trim().toLowerCase();
  }
  return fallbackSlug;
}

function resolveBookYear(book: BookRow) {
  const direct = book.publication_year ?? book.year;
  if (direct !== null && direct !== undefined && `${direct}`.trim() !== "") {
    return `${direct}`.trim();
  }
  return inferOriginalBookYear(book);
}

function normalizeAuthor(author: string) {
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

function authorSpineColor(author: string) {
  const normalized = normalizeAuthor(author);

  for (const rule of AUTHOR_SPINE_COLOR_RULES) {
    if (rule.match.some((name) => normalized.includes(name))) {
      return rule.color;
    }
  }

  return "#4A5C78";
}

export function BookCard({
  book,
  isActive = true,
  onActivate,
  openOnInactive = false,
  onHoverStart,
  onHoverEnd,
}: {
  book: BookRow;
  isActive?: boolean;
  onActivate?: (bookId: string) => void;
  openOnInactive?: boolean;
  onHoverStart?: (bookId: string) => void;
  onHoverEnd?: (bookId: string) => void;
}) {
  const router = useRouter();
  const href = `/book/${book.id}`;
  const progress = typeof book.progress === "number" ? Math.max(0, Math.min(100, book.progress)) : 0;
  const coverSlug = toCoverSlug(book);
  const backgroundSlug = toBackgroundSlug(book, coverSlug);
  const author = book.author?.trim() || "Ismeretlen szerző";
  const spineColor = authorSpineColor(author);
  const cardBackgroundImage = backgroundSlug
    ? `url('/covers/SVG/${encodeURIComponent(backgroundSlug)}.png')`
    : "none";
  const cardStyle = {
    "--book-card-bg-image": cardBackgroundImage,
    "--active-spine-color": spineColor,
  } as CSSProperties;
  const year = resolveBookYear(book);
  const status = statusMeta(book.status);

  function navigate() {
    router.push(href);
  }

  function primaryAction() {
    if (isActive || openOnInactive) {
      navigate();
      return;
    }
    onActivate?.(book.id);
  }

  if (!isActive) {
    const spineStyle = { "--spine-color": spineColor } as CSSProperties;
    return (
      <div
        className="book-spine book-card-clickable"
        style={spineStyle}
        role="link"
        tabIndex={0}
        onClick={primaryAction}
        onMouseEnter={() => onHoverStart?.(book.id)}
        onMouseLeave={() => onHoverEnd?.(book.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            primaryAction();
          }
        }}
        aria-label={`${book.title} megnyitása`}
      >
        <div className="book-spine-author-line">
          <span>{author}</span>
          {book.is_favorite ? (
            <span className="book-spine-favorite-mark" aria-label="Kedvenc könyv">
              <Icon name="favorite" size={10} />
            </span>
          ) : null}
        </div>
        <div className="book-spine-title-line">{book.title}</div>
        <div className="book-spine-icon" aria-hidden="true">
          <BookCoverIcon slug={coverSlug} title={book.title} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="card book-card book-card-clickable"
      style={cardStyle}
      role="link"
      tabIndex={0}
      onClick={primaryAction}
      onMouseEnter={() => onHoverStart?.(book.id)}
      onMouseLeave={() => onHoverEnd?.(book.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          primaryAction();
        }
      }}
      aria-label={`${book.title} megnyitása`}
    >
      <div className="status-pin" style={{ color: status.color }}>
        <span className="status-pin-dot" aria-hidden="true" />
        <span>{status.label}</span>
      </div>

      <div className="book-cover-link" aria-hidden="true">
        <div className="book-cover" aria-hidden="true">
          <BookCoverIcon slug={coverSlug} title={book.title} />
        </div>
      </div>

      <div className="book-meta">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{author}</div>
        {year ? <div className="book-year">{year}</div> : null}
      </div>

      <div style={{ marginTop: 10 }}>
        {(book.status === "failed" || book.status === "hiba") && book.error_message ? (
          <div style={{ color: "var(--muted)", lineHeight: 1.55, marginBottom: 10 }}>
            <strong>Hiba:</strong> {book.error_message}
          </div>
        ) : null}

        <details
          style={{ marginTop: 10 }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <summary className="book-accordion-trigger" aria-label="Leírás kinyitása vagy bezárása" />
          <div className="details">{book.description?.trim() ? book.description : "Nincs megadva leírás."}</div>
        </details>

        {book.status !== "ready" ? (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{progress}%</div>
              <div className="progress" style={{ flex: 1 }}>
                <div style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
