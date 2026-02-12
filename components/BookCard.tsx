import Link from "next/link";
import type { BookRow } from "@/lib/types";

function statusLabel(status: BookRow["status"]) {
  switch (status) {
    case "uj": return "Új";
    case "feldolgozas": return "Feldolgozás";
    case "szerkesztes": return "Szerkesztés";
    case "kesz": return "Kész";
    case "hiba": return "Hiba";
    case "processing": return "Feldolgozás";
    case "ready": return "Kész";
    case "failed": return "Hiba";
    default: return "Ismeretlen";
  }
}

export function BookCard({ book }: { book: BookRow }) {
  const pct = Math.max(0, Math.min(100, Math.round(book.progress ?? 0)));

  return (
    <div className="card">
      <div className="row">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 650, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Link href={`/book/${book.id}`}>{book.title}</Link>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {book.author ?? "—"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="badge">{statusLabel(book.status)}</span>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>{pct}%</span>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="progress" aria-label="Haladás">
          <div style={{ width: `${pct}%` }} />
        </div>

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", color: "var(--muted)" }}>Rövid leírás</summary>
          <div className="details">
            {book.description?.trim() ? book.description : "Nincs megadva leírás."}
          </div>
        </details>
      </div>
    </div>
  );
}
