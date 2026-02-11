import Link from "next/link";

export function TopBar() {
  return (
    <div className="row" style={{ marginBottom: 18 }}>
      <div>
        <div className="h1">Könyvtár</div>
        <p className="sub">A saját munkáid — lineáris haladás, blokk-szintű validálás.</p>
      </div>
      <Link className="btn" href="/upload" aria-label="Új könyv feltöltése">
        Új könyv feltöltése
      </Link>
    </div>
  );
}
