import Link from "next/link";

export function LibraryEmpty() {
  return (
    <div className="card">
      <div style={{ fontSize: 16, fontWeight: 650, marginBottom: 6 }}>Még nincs könyv a könyvtárban.</div>
      <div style={{ color: "var(--muted)", lineHeight: 1.55, marginBottom: 12 }}>
        Kezdd egy közkincs szöveggel (MEK vagy saját forrás), és haladj lineárisan blokk-ról blokk-ra.
      </div>
      <Link className="btn" href="/upload">
        Új könyv feltöltése
      </Link>
    </div>
  );
}
