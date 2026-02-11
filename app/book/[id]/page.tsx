"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ensureAnonIdentity } from "@/lib/auth/anon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BookRow } from "@/lib/types";

type LoadState =
  | { status: "booting" }
  | { status: "error"; message: string }
  | { status: "ready"; book: BookRow };

export default function BookPage({ params }: { params: { id: string } }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [state, setState] = useState<LoadState>({ status: "booting" });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const boot = await ensureAnonIdentity();
      if (!boot.ok) {
        if (!cancelled) setState({ status: "error", message: boot.reason });
        return;
      }

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) {
        if (!cancelled) setState({ status: "error", message: error.message });
        return;
      }

      if (!cancelled) setState({ status: "ready", book: data as BookRow });
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [params.id, supabase]);

  if (state.status === "booting") return <div className="card">Betöltés…</div>;
  if (state.status === "error") return <div className="card">Hiba: {state.message}</div>;

  const b = state.book;

  return (
    <div className="stack">
      <div className="row">
        <div>
          <div className="h1" style={{ marginBottom: 4 }}>{b.title}</div>
          <div style={{ color: "var(--muted)" }}>{b.author ?? "—"}</div>
        </div>
        <Link className="btn" href="/">Vissza a könyvtárba</Link>
      </div>

      <div className="card">
        <div style={{ fontWeight: 650, marginBottom: 6 }}>Szerkesztés (MVP wireframe)</div>
        <div style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          M3-ban ez még csak váz: itt lesz a fejezetlista, blokklista, és a blokk editor (eredeti + átirat + variánsok).
        </div>
      </div>
    </div>
  );
}
