"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ensureAnonIdentity } from "@/lib/auth/anon";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);

  async function onUpload() {
    setStatus("uploading");
    setError(null);
    setBookId(null);

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

    if (!file) {
      setStatus("error");
      setError("Kérlek válassz egy fájlt.");
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!(/\.(html?|rtf|docx)$/.test(fileName))) {
      setStatus("error");
      setError("Csak HTML, RTF és DOCX fájl tölthető fel.");
      return;
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session?.access_token) {
      setStatus("error");
      setError(sessionErr?.message ?? "Nem található érvényes munkamenet.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    if (author.trim()) formData.append("author", author.trim());
    if (description.trim()) formData.append("description", description.trim());

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || !result?.ok) {
      setStatus("error");
      setError(result?.message ?? "A feltöltés nem sikerült.");
      return;
    }

    setStatus("done");
    setBookId(result.bookId ?? null);
  }

  return (
    <div className="stack">
      <div className="row">
        <div>
          <div className="h1">Új könyv</div>
          <p className="sub">Lokális feltöltés (HTML, RTF, DOCX) és automatikus feldolgozás.</p>
        </div>
        <Link className="btn" href="/">Vissza a könyvtárba</Link>
      </div>

      <div className="card stack">
        <label>
          <div style={{ marginBottom: 6, color: "var(--muted)" }}>Fájl</div>
          <input
            className="input"
            type="file"
            accept=".html,.htm,.rtf,.docx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <div style={{ marginTop: 6 }}>
            <small>{file ? `Kiválasztva: ${file.name}` : "A kiválasztott fájl a szerverre kerül és feldolgozás indul."}</small>
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
          <button className="btn" onClick={onUpload} disabled={status === "uploading"}>
            {status === "uploading" ? "Feltöltés…" : "Feltöltés indítása"}
          </button>
          {bookId ? <Link className="btn" href={`/book/${bookId}`}>Megnyitás</Link> : <span />}
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
