"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { BookRow } from "@/lib/types";
import { BookCoverIcon } from "@/components/BookCoverIcon";

function statusMeta(status: BookRow["status"]) {
  switch (status) {
    case "uj":
      return { label: "Uj", color: "#A2672D" };
    case "feldolgozas":
    case "processing":
      return { label: "Feldolgozas", color: "#2F6AA8" };
    case "szerkesztes":
      return { label: "Szerkesztes", color: "#2A7A66" };
    case "kesz":
      return { label: "Kesz", color: "#2D8A4F" };
    case "ready":
      return { label: "Feltoltve", color: "#B08D57" };
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

function resolveBookYear(book: BookRow) {
  const direct = book.publication_year ?? book.year;
  if (direct !== null && direct !== undefined && `${direct}`.trim() !== "") {
    return `${direct}`.trim();
  }

  const fromText = `${book.description ?? ""} ${book.source_filename ?? ""}`.match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  if (fromText) return fromText[1];

  const date = new Date(book.created_at);
  return Number.isNaN(date.getTime()) ? null : `${date.getUTCFullYear()}`;
}

function normalizeAuthor(author: string) {
  return author
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function authorSpineColor(author: string) {
  const normalized = normalizeAuthor(author);

  if (normalized.includes("babits")) return "#2F3A52";
  if (normalized.includes("mikszath")) return "#4A3E34";
  if (normalized.includes("jokai")) return "#1E3A5F";
  if (normalized.includes("gardonyi")) return "#4F6F6B";
  if (normalized.includes("krudy")) return "#2B3248";
  if (normalized.includes("moricz")) return "#3C4B3D";
  if (normalized.includes("tomorkeny")) return "#6E7A6B";

  return "#4A5C78";
}

export function BookCard({
  book,
  isActive = true,
  onActivate,
}: {
  book: BookRow;
  isActive?: boolean;
  onActivate?: (bookId: string) => void;
}) {
  const router = useRouter();
  const href = `/book/${book.id}`;
  const progress = typeof book.progress === "number" ? Math.max(0, Math.min(100, book.progress)) : 0;
  const coverSlug = toCoverSlug(book);
  const author = book.author?.trim() || "Ismeretlen szerzo";
  const cardBackgroundImage = coverSlug ? `url('/covers/SVG/${encodeURIComponent(coverSlug)}.png')` : "none";
  const cardStyle = {
    "--book-card-bg-image": cardBackgroundImage,
    "--active-spine-color": authorSpineColor(author),
  } as CSSProperties;
  const year = resolveBookYear(book);
  const status = statusMeta(book.status);

  function navigate() {
    router.push(href);
  }

  function primaryAction() {
    if (isActive) {
      navigate();
      return;
    }
    onActivate?.(book.id);
  }

  if (!isActive) {
    const spineStyle = { "--spine-color": authorSpineColor(author) } as CSSProperties;
    return (
      <div
        className="book-spine book-card-clickable"
        style={spineStyle}
        role="link"
        tabIndex={0}
        onClick={primaryAction}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            primaryAction();
          }
        }}
        aria-label={`${book.title} megnyitasa`}
      >
        <div className="book-spine-icon" aria-hidden="true">
          <BookCoverIcon slug={coverSlug} title={book.title} />
        </div>
        <div className="book-spine-line">{author} - {book.title}</div>
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
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          primaryAction();
        }
      }}
      aria-label={`${book.title} megnyitasa`}
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
          <summary className="book-accordion-trigger" aria-label="Leiras kinyitasa vagy bezarasa" />
          <div className="details">{book.description?.trim() ? book.description : "Nincs megadva leiras."}</div>
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
