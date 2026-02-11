# Novira — M3 Scaffold Apply Guide (2026-02-11)

This package contains a minimal Next.js (App Router) scaffold + Supabase anonymous identity bootstrap + MVP wireframe screens.

## Where to place files

Unzip into the **root of your Novira repo**.

It will add:
- `package.json`, `tsconfig.json`, `next.config.mjs`
- `app/` routes: Library, Upload, Book
- `lib/` Supabase client helpers
- `components/` UI primitives for the Library cards
- `.env.example` (M3 additions)

## Install & run

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase prerequisites
- Your Supabase project must have the M2 schema + RLS applied.
- Ensure anonymous sign-in is enabled in Supabase Auth settings.

## Notes
- Upload processing (DOCX/EPUB/MEK) is stubbed in M3 (tickets included).
- LLM calls are stubbed (`/api/llm/*`) — no provider bound yet (per D-005).
