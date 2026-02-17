# SPEC.md — Novira (MVP)

## Primary User Journey
1) Import book (HTML, RTF, or DOCX)
2) Automatic segmentation → Chapters → Blocks
3) Linear validation workflow
4) Export (DOCX + Markdown)

## MVP Scope (IN)
- HTML + RTF + DOCX import
- External source import (Project Gutenberg HTML ZIP, work-id based)
- Deterministic segmentation
- Parallel editor (original + modernized)
- Variant handling per block
- Anchored notes
- Markdown + DOCX export
- Cloud persistence (password login + guest session)

## MVP Scope (OUT)
- EPUB import (deferred)
- Multi-user collaboration
- ePub/PDF export
- Advanced analytics

## Backend
- Next.js server routes
- Parsing imports (HTML/RTF/DOCX)
- Server-side LLM calls

## Access Model
- First visit shows landing page with `Belepes` and `Vendeg` actions.
- `Belepes`: password-based account session (email + password).
- `Vendeg`: anonymous session that can be upgraded to password account from `/login` by switching to `Regisztracio` on the same form, or discarded (`Torles es kilepes`).
- Upload/import is available for authenticated non-guest users and server-guarded on API routes.
- Admin-labeled tooling remains hidden for non-admin users and server-guarded on API routes.
- Dedicated admin page: `/admin` lists all books and allows toggling `is_public` visibility.
- Library visibility rules:
  - unauthenticated visitors see only `is_public = true` and `ready` books,
  - authenticated non-admin users see own books plus public books,
  - admin sees all books.
- Book favorite rule:
  - on book page, users can toggle favorite state via star action next to `Vissza a konyvtarba`;
  - on home/library, favorite books are pinned before non-favorites within current filtered results;
  - in inactive spine view, favorite books show a star mark on the author line.
- Public base book editing rule:
  - if a user opens another user's public base book, the system auto-creates/reuses a user-owned fork ("sajat olvasat") and opens that fork for editing.
- Book page admin edit panel keeps `Konyv adatok` editing.
- `Forras szerkesztes` on the admin panel toggles source-text editing mode in the `Szerkesztett` content panel (admin edits block `original_text` there).
- Source provenance fields (`source_name`, `source_url`, license/work-id/hash/retrieved_at) are shown as preview metadata on the admin panel.

## UI Icon Policy
- UI icons must be rendered only through `src/ui/icons/Icon.tsx`.
- UI icons must be sourced from `lucide-react` through the `Icon.tsx` mapping only.
- Inline SVG is not allowed for UI icons.
- Manual `<path>` definitions and custom `viewBox` definitions are not allowed for UI icons.
- Brand/logo and content/cover SVG assets are exceptions and stay on the asset pipeline.
