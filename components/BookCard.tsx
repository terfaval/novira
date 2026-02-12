import Link from "next/link";
import type { BookRow } from "@/lib/types";

function statusLabel(status: BookRow["status"]) {
  switch (status) {
    case "uj": return "Uj";
    case "feldolgozas": return "Feldolgozas";
    case "szerkesztes": return "Szerkesztes";
    case "kesz": return "Kesz";
    case "hiba": return "Hiba";
    case "processing": return "Feldolgozas";
    case "ready": return "Feltoltve";
    case "failed": return "Hiba";
    default: return "Ismeretlen";
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
  const progress = typeof book.progress === "number" ? Math.max(0, Math.min(100, book.progress)) : 0;
  const coverPath = `/covers/${toCoverSlug(book)}.png`;
  const year = resolveBookYear(book);

  return (
    <div className="card book-card">
      <Link href={`/book/${book.id}`} className="book-cover-link" aria-label={`${book.title} megnyitasa`}>
        <div className="book-cover" style={{ backgroundImage: `url('${coverPath}')` }} />
      </Link>

      <div className="book-meta">
        <div className="book-title">
          <Link href={`/book/${book.id}`}>{book.title}</Link>
        </div>
        <div className="book-author">{book.author?.trim() || "Ismeretlen szerzo"}</div>
        {year ? <div className="book-year">{year}</div> : null}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
        <span className="badge">{statusLabel(book.status)}</span>
      </div>

      <div style={{ marginTop: 10 }}>
        {book.status === "failed" && book.error_message ? (
          <div style={{ color: "var(--muted)", lineHeight: 1.55, marginBottom: 10 }}>
            <strong>Hiba:</strong> {book.error_message}
          </div>
        ) : null}

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Rovid leiras</summary>
          <div className="details">
            {book.description?.trim() ? book.description : "Nincs megadva leiras."}
          </div>
        </details>

        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{progress}%</div>
            <div className="progress" style={{ flex: 1 }}>
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
