"use client";

import { useEffect, useMemo, useState } from "react";
import { ensureAnonIdentity } from "@/lib/auth/anon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BookRow } from "@/lib/types";
import { BookCard } from "@/components/BookCard";
import { LibraryEmpty } from "@/components/LibraryEmpty";

type LoadState =
  | { status: "booting" }
  | { status: "error"; message: string }
  | { status: "ready"; books: BookRow[] };

export function LibraryClient() {
  const [state, setState] = useState<LoadState>({ status: "booting" });
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadBooks() {
      const boot = await ensureAnonIdentity();
      if (!boot.ok) {
        if (!cancelled) setState({ status: "error", message: boot.reason });
        return;
      }

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        if (!cancelled) setState({ status: "error", message: error.message });
        return;
      }

      if (!cancelled) {
        setState({ status: "ready", books: (data ?? []) as BookRow[] });
      }
    }

    loadBooks();
    const id = window.setInterval(loadBooks, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [supabase]);

  useEffect(() => {
    if (state.status !== "ready" || state.books.length === 0) return;
    if (activeBookId && !state.books.some((book) => book.id === activeBookId)) {
      setActiveBookId(null);
    }
  }, [activeBookId, state]);

  if (state.status === "booting") {
    return <div className="card">Betoltes...</div>;
  }

  if (state.status === "error") {
    return (
      <div className="card">
        <div style={{ fontWeight: 650, marginBottom: 6 }}>Hiba tortent</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.55 }}>{state.message}</div>
        <div style={{ marginTop: 10 }}>
          <small>Ellenorizd a Supabase env valtozokat es az anon auth beallitast.</small>
        </div>
      </div>
    );
  }

  if (state.books.length === 0) return <LibraryEmpty />;

  return (
    <section className="library-carousel" aria-label="Konyvlista">
      {state.books.map((book) => {
        const isActive = activeBookId === book.id;
        return (
          <div
            key={book.id}
            className={`library-carousel-item${isActive ? " is-active" : " is-inactive"}`}
          >
            <BookCard book={book} isActive={isActive} onActivate={setActiveBookId} />
          </div>
        );
      })}
    </section>
  );
}
