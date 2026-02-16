"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toSessionIdentity } from "@/lib/auth/identity";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AdminBookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  status: string;
  is_public: boolean | null;
  updated_at: string;
};

type AccessState = "booting" | "unauthenticated" | "forbidden" | "allowed";

export default function AdminPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [accessState, setAccessState] = useState<AccessState>("booting");
  const [books, setBooks] = useState<AdminBookRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyByBook, setBusyByBook] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    const syncAccess = async () => {
      const { data, error: sessionErr } = await supabase.auth.getSession();
      if (!active) return;
      if (sessionErr || !data.session) {
        setAccessState("unauthenticated");
        return;
      }
      const identity = toSessionIdentity(data.session);
      if (!identity) {
        setAccessState("unauthenticated");
        return;
      }
      setAccessState(identity.role === "admin" ? "allowed" : "forbidden");
    };

    void syncAccess();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const identity = toSessionIdentity(session);
      if (!identity) {
        setAccessState("unauthenticated");
        return;
      }
      setAccessState(identity.role === "admin" ? "allowed" : "forbidden");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (accessState !== "allowed") return;
    let cancelled = false;

    async function loadBooks() {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("books")
        .select("id,user_id,title,author,status,is_public,updated_at")
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      setBooks((data ?? []) as AdminBookRow[]);
      setLoading(false);
    }

    void loadBooks();
    const intervalId = window.setInterval(loadBooks, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [accessState, supabase]);

  async function handlePublicToggle(bookId: string, nextValue: boolean) {
    const booksTable = supabase.from("books") as any;
    setBusyByBook((current) => ({ ...current, [bookId]: true }));
    setError(null);
    setBooks((current) =>
      current.map((book) => (book.id === bookId ? { ...book, is_public: nextValue } : book))
    );

    const { error: updateError } = await booksTable.update({ is_public: nextValue }).eq("id", bookId);

    if (updateError) {
      setBooks((current) =>
        current.map((book) => (book.id === bookId ? { ...book, is_public: !nextValue } : book))
      );
      setError(updateError.message);
    }

    setBusyByBook((current) => ({ ...current, [bookId]: false }));
  }

  if (accessState === "booting") {
    return (
      <div className="stack">
        <div className="card">Jogosultsag ellenorzese...</div>
      </div>
    );
  }

  if (accessState === "unauthenticated") {
    return (
      <div className="stack">
        <div className="card">
          <div style={{ fontWeight: 650, marginBottom: 6 }}>Nincs aktiv munkamenet</div>
          <p className="sub">Elobb jelentkezz be a landing oldalon.</p>
          <Link className="btn" href="/landing">
            At a landing oldalra
          </Link>
        </div>
      </div>
    );
  }

  if (accessState === "forbidden") {
    return (
      <div className="stack">
        <div className="card">
          <div style={{ fontWeight: 650, marginBottom: 6 }}>Admin jogosultsag szukseges</div>
          <p className="sub">Ezt az oldalt csak admin erheti el.</p>
          <Link className="btn" href="/">
            Vissza a konyvtarba
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="row">
        <div>
          <div className="h1">Admin - konyv lathatosag</div>
          <p className="sub">Itt allithato, melyik konyv latszik publikus konyvkent minden felhasznalonak.</p>
        </div>
        <Link className="btn" href="/">
          Vissza a konyvtarba
        </Link>
      </div>

      {loading ? <div className="card">Konyvek betoltese...</div> : null}
      {error ? (
        <div className="card" style={{ color: "var(--muted)" }}>
          <strong>Hiba:</strong> {error}
        </div>
      ) : null}

      {!loading && books.length === 0 ? <div className="card">Nincs megjelenitheto konyv.</div> : null}

      {!loading && books.length > 0 ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Publikus</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Cim</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Szerzo</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Statusz</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Tulajdonos user_id</th>
                <th style={{ textAlign: "left", padding: "8px 6px" }}>Frissitve</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => {
                const isBusy = Boolean(busyByBook[book.id]);
                return (
                  <tr key={book.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 6px" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(book.is_public)}
                        disabled={isBusy}
                        onChange={(event) => void handlePublicToggle(book.id, event.target.checked)}
                        aria-label={`${book.title} publikus kapcsolo`}
                      />
                    </td>
                    <td style={{ padding: "8px 6px" }}>{book.title}</td>
                    <td style={{ padding: "8px 6px" }}>{book.author?.trim() || "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{book.status}</td>
                    <td style={{ padding: "8px 6px", fontFamily: "monospace", fontSize: 12 }}>{book.user_id}</td>
                    <td style={{ padding: "8px 6px" }}>
                      {new Date(book.updated_at).toLocaleString("hu-HU", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
