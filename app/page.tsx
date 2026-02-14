import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { LibraryClient } from "@/components/LibraryClient";

export default function Page() {
  return (
    <div className="home-page-shell">
      <div className="home-layer-top">
        <div className="home-container">
          <TopBar />
        </div>
      </div>

      <div className="home-layer-main">
        <div className="home-container">
          <LibraryClient />
        </div>
      </div>

      <div className="home-layer-plus">
        <Link className="home-plus-button" href="/upload" aria-label="Add new book">
          +
        </Link>
      </div>
    </div>
  );
}
