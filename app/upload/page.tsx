"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ensureAnonIdentity } from "@/lib/auth/anon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BookRow } from "@/lib/types";

type Status = "idle" | "saving" | "done" | "error";

export default function UploadPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  async function onCreate() {
    setStatus("saving");
    setError(null);
    setCreatedId(null);

    const boot = await ensureAnonIdentity();
    if (!boot.ok) {
      setStatus("error");
      setError(boot.reason);
      return;
    }

    if (!title.trim()) {
      setStatus("error");
      setError("Kérlek add meg a címet.");
      return;
    }

    // NOTE: M3 creates the Book row only. Actual file upload + parsing is M4+.
    const payload: Partial<BookRow> = {
      title: title.trim(),
      author: author.trim() ? author.trim() : null,
      description: description.trim() ? description.trim() : null,
      status: "uj",
      progress: 0,
    };

    const { data, error: insErr } = await supabase
      .from("books")
      .insert(payload)
      .select("*")
      .single();

    if (insErr) {
      setStatus("error");
      setError(insErr.message);
      return;
    }

    setStatus("done");
    setCreatedId((data as any)?.id ?? null);
  }

  return (
    <div className="stack">
      <div className="row">
        <div>
          <div className="h1">Új könyv</div>
          <p className="sub">Könyv létrehozása a könyvtárban. (Feldolgozás M4-ben.)</p>
        </div>
        <Link className="btn" href="/">Vissza a könyvtárba</Link>
      </div>

      <div className="card stack">
        <label>
          <div style={{ marginBottom: 6, color: "var(--muted)" }}>Fájl (M3: csak jelzés)</div>
          <input
            className="input"
            type="file"
            accept=".docx,.epub,.html,.txt"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <div style={{ marginTop: 6 }}>
            <small>{fileName ? `Kiválasztva: ${fileName}` : "Később itt indul a feltöltés + feldolgozás."}</small>
          </div>
        </label>

        <label>
          <div style={{ marginBottom: 6, color: "var(--muted)" }}>Cím</div>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="pl. A jó palócok" />
        </label>

        <label>
          <div style={{ marginBottom: 6, color: "var(--muted)" }}>Szerző</div>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="pl. Mikszáth Kálmán" />
        </label>

        <label>
          <div style={{ marginBottom: 6, color: "var(--muted)" }}>Rövid leírás (opcionális)</div>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="1–2 mondat." />
        </label>

        <div className="row">
          <button className="btn" onClick={onCreate} disabled={status === "saving"}>
            {status === "saving" ? "Mentés…" : "Könyv létrehozása"}
          </button>
          {createdId ? <Link className="btn" href={`/book/${createdId}`}>Megnyitás</Link> : <span />}
        </div>

        {status === "error" && error ? (
          <div style={{ color: "var(--muted)", lineHeight: 1.55 }}>
            <strong>Hiba:</strong> {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
