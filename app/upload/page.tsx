"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toSessionIdentity } from "@/lib/auth/identity";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Status = "idle" | "uploading" | "done" | "error";
type ImportMode = "file" | "project_gutenberg";

export default function UploadPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [accessState, setAccessState] = useState<"booting" | "allowed" | "forbidden" | "unauthenticated">("booting");
  const [importMode, setImportMode] = useState<ImportMode>("file");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [projectGutenbergWorkId, setProjectGutenbergWorkId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
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
      setAccessState(identity.role === "guest" ? "forbidden" : "allowed");
    };

    void load();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const identity = toSessionIdentity(session);
      if (!identity) {
        setAccessState("unauthenticated");
        return;
      }
      setAccessState(identity.role === "guest" ? "forbidden" : "allowed");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function onImport() {
    if (accessState !== "allowed") {
      setStatus("error");
      setError("Ehhez a funkciohoz regisztralt felhasznalo kell.");
      return;
    }

    setStatus("uploading");
    setError(null);
    setBookId(null);

    if (!title.trim()) {
      setStatus("error");
      setError("Kerlek add meg a cimet.");
      return;
    }

    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData.session?.access_token) {
      setStatus("error");
      setError(sessionErr?.message ?? "Nem talalhato ervenyes munkamenet.");
      return;
    }

    if (importMode === "file") {
      if (!file) {
        setStatus("error");
        setError("Kerlek valassz egy fajlt.");
        return;
      }
      const fileName = file.name.toLowerCase();
      if (!/\.(html?|rtf|docx)$/.test(fileName)) {
        setStatus("error");
        setError("Csak HTML, RTF es DOCX fajl toltheto fel.");
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
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setStatus("error");
        setError(result?.message ?? "A feltoltes nem sikerult.");
        return;
      }

      setStatus("done");
      setBookId(result.bookId ?? null);
      return;
    }

    const workIdNumber = Number.parseInt(projectGutenbergWorkId.trim(), 10);
    if (!Number.isFinite(workIdNumber) || workIdNumber <= 0) {
      setStatus("error");
      setError("A Project Gutenberg Work ID pozitiv egesz szam legyen.");
      return;
    }

    const response = await fetch("/api/import/external", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        source: "project_gutenberg",
        workId: workIdNumber,
        title: title.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) {
      setStatus("error");
      setError(result?.message ?? "A kulso forras import nem sikerult.");
      return;
    }

    setStatus("done");
    setBookId(result.bookId ?? null);
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
          <p className="sub">Elobb jelentkezz be vagy indits vendeg munkamenetet a landing oldalon.</p>
          <Link className="btn" href="/">
            Vissza a landing oldalra
          </Link>
        </div>
      </div>
    );
  }

  if (accessState === "forbidden") {
    return (
      <div className="stack">
        <div className="card">
          <div style={{ fontWeight: 650, marginBottom: 6 }}>Regisztracio szukseges</div>
          <p className="sub">A konyvfeltoltes csak regisztralt felhasznaloknak erheto el.</p>
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
          <div className="h1">Uj konyv</div>
          <p className="sub">
            Lokalis feltoltes (HTML, RTF, DOCX) vagy kulso forras import (Project Gutenberg HTML ZIP).
          </p>
        </div>
        <Link className="btn" href="/">
          Vissza a konyvtarba
        </Link>
      </div>

      <div className="card stack">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
          <button
            className="btn"
            type="button"
            disabled={status === "uploading"}
            onClick={() => setImportMode("file")}
            aria-pressed={importMode === "file"}
          >
            Lokalis fajl
          </button>
          <button
            className="btn"
            type="button"
            disabled={status === "uploading"}
            onClick={() => setImportMode("project_gutenberg")}
            aria-pressed={importMode === "project_gutenberg"}
          >
            Project Gutenberg
          </button>
        </div>

        {importMode === "file" ? (
          <label>
            <div style={{ marginBottom: 6, color: "var(--muted)" }}>Fajl</div>
            <input
              className="input"
              type="file"
              accept=".html,.htm,.rtf,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div style={{ marginTop: 6 }}>
              <small>
                {file ? `Kivalasztva: ${file.name}` : "A kivalasztott fajl a szerverre kerul es feldolgozas indul."}
              </small>
            </div>
          </label>
        ) : (
          <label>
            <div style={{ marginBottom: 6, color: "var(--muted)" }}>Project Gutenberg Work ID</div>
            <input
              className="input"
              value={projectGutenbergWorkId}
              onChange={(event) => setProjectGutenbergWorkId(event.target.value)}
              placeholder="pl. 23962"
              inputMode="numeric"
            />
            <div style={{ marginTop: 6 }}>
              <small>
                A rendszer a PG HTML ZIP forrast importalja (mirror/fallback URL-lal), majd fejezetekre es blokkokra bontja.
              </small>
            </div>
          </label>
        )}

        <label>
          <div style={{ marginBottom: 6, color: "var(--muted)" }}>Cim</div>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="pl. A jo palocok"
          />
        </label>

        <label>
          <div style={{ marginBottom: 6, color: "var(--muted)" }}>Szerzo</div>
          <input
            className="input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="pl. Mikszath Kalman"
          />
        </label>

        <label>
          <div style={{ marginBottom: 6, color: "var(--muted)" }}>Rovid leiras (opcionalis)</div>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="1-2 mondat."
          />
        </label>

        <div className="row">
          <button className="btn" onClick={onImport} disabled={status === "uploading"}>
            {status === "uploading"
              ? importMode === "file"
                ? "Feltoltes..."
                : "Kulso import..."
              : importMode === "file"
                ? "Feltoltes inditasa"
                : "PG import inditasa"}
          </button>
          {bookId ? (
            <Link className="btn" href={`/book/${bookId}`}>
              Megnyitas
            </Link>
          ) : (
            <span />
          )}
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
