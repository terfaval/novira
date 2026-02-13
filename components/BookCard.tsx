"use client";

import { useRouter } from "next/navigation";
import type { BookRow } from "@/lib/types";

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

export function BookCard({ book }: { book: BookRow }) {
  const router = useRouter();
  const href = `/book/${book.id}`;
  const progress = typeof book.progress === "number" ? Math.max(0, Math.min(100, book.progress)) : 0;
  const coverPath = `/covers/${toCoverSlug(book)}.png`;
  const year = resolveBookYear(book);
  const status = statusMeta(book.status);

  function navigate() {
    router.push(href);
  }

  return (
    <div
      className="card book-card book-card-clickable"
      role="link"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          navigate();
        }
      }}
      aria-label={`${book.title} megnyitasa`}
    >
      <div className="status-pin" style={{ color: status.color }}>
        <span className="status-pin-dot" aria-hidden="true" />
        <span>{status.label}</span>
      </div>

      <div className="book-cover-link" aria-hidden="true">
        <div className="book-cover" style={{ backgroundImage: `url('${coverPath}')` }} />
      </div>

      <div className="book-meta">
        <div className="book-title">{book.title}</div>
        <div className="book-author">{book.author?.trim() || "Ismeretlen szerzo"}</div>
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
          <div className="details">
            {book.description?.trim() ? book.description : "Nincs megadva leiras."}
          </div>
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
