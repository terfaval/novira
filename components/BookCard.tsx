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

export function BookCard({ book }: { book: BookRow }) {
  const progress = typeof book.progress === "number" ? Math.max(0, Math.min(100, book.progress)) : 0;

  return (
    <div className="card">
      <div className="row">
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 650,
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            <Link href={`/book/${book.id}`}>{book.title}</Link>
          </div>
          <div
            style={{
              color: "var(--muted)",
              fontSize: 13,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {book.author ?? "-"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="badge">{statusLabel(book.status)}</span>
        </div>
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
