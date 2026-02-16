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
- Admin-only functions (upload/import + admin-labeled tooling) are hidden for non-admin users and server-guarded on API routes.
- Dedicated admin page: `/admin` lists all books and allows toggling `is_public` visibility.
- Library visibility rules:
  - unauthenticated visitors see only `is_public = true` and `ready` books,
  - authenticated non-admin users see own books plus public books,
  - admin sees all books.
- Public base book editing rule:
  - if a user opens another user's public base book, the system auto-creates/reuses a user-owned fork ("sajat olvasat") and opens that fork for editing.
- Book page admin edit panel has two explicit modes:
  - `Konyv adatok` (title/author/year/description/icon),
  - `Forras szerkesztes` (source provenance fields).

## UI Icon Policy
- UI icons must be rendered only through `src/ui/icons/Icon.tsx`.
- UI icons must be sourced from `lucide-react` through the `Icon.tsx` mapping only.
- Inline SVG is not allowed for UI icons.
- Manual `<path>` definitions and custom `viewBox` definitions are not allowed for UI icons.
- Brand/logo and content/cover SVG assets are exceptions and stay on the asset pipeline.
