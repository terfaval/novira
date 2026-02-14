import Link from "next/link";

export function TopBar() {
  return (
    <Link className="home-topbar-logo" href="/" aria-label="Novira home">
      <span className="home-topbar-logo-mark" aria-hidden="true" />
      <span className="home-topbar-copy">
        <span className="home-topbar-title">NOVIRA</span>
        <span className="home-topbar-subtitle">Az olvashato irodalom muhelye</span>
      </span>
    </Link>
  );
}
