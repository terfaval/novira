# Műfordító — SPEC (v0.1, Milestone M1)

Date: 2026-02-11  
Project phase: **Phase A — Planning** (scope-ready for build gate)  

This spec is derived from:
- **Műfordító – Product Kickoff (Termékfókusz)** (uploaded)  
- **Digital Tool Portfolio – Project Playbook v3** (uploaded)

## 1. Product one‑pager (engineering)

### Problem
Classic / archaic / stylistically dense Hungarian (and other) literary texts are hard to read for modern audiences. A purely “one-shot” rewrite fails because literary work requires *continuous editorial control* and *traceability* from original to modernized text.

### Target users (MVP)
- **Editor/translator (single primary user)** working on one book at a time.
- Secondary: researchers / students (future).

### Value proposition (MVP)
- **Parallel, block-level traceability:** user always sees which original segment produced which modernized segment.
- **Editorial workflow:** accept/revert variants, annotate cultural/lexical elements.
- **Continuity:** chapter + global context so rewriting maintains narrative arc.

### Primary user journey (MVP)
1) Import book (DOCX or EPUB)  
2) Auto-segmentation → Chapters → Blocks  
3) Linear reading/validation workflow:
   - select a block → generate modernized variant → accept / request alternative / edit
   - add notes anchored to original text spans
4) Export (DOCX + Markdown) including notes and editor’s foreword (basic)

### Non-goals (MVP)
- Multi-user collaboration
- Public sharing / publishing
- Advanced typography / ePub export
- Full scholarly critical apparatus
- Payments / subscriptions

## 2. MVP scope lock (IN / OUT)

### IN (must-have)
- DOCX + EPUB import
- Deterministic segmentation (chapter + block IDs)
- Parallel editor (original + modernized)
- 1 style profile: **“Mai irodalmi”**
- Variants per block:
  - generate alternative
  - accept as “final”
  - revert to previous
- Notes:
  - anchored to a selected range (start/end offsets)
  - display in side panel + tooltip
  - include in export as footnotes/endnotes (v0)
- Export:
  - Markdown
  - DOCX (basic formatting)
- Persistence:
  - Cloud DB persistence so user can resume later
  - No email/password login; background identity only

### OUT (explicitly not in MVP)
- Team projects / multiple editors
- Auth UI (email/password, SSO)
- Role-based permissions
- ePub/PDF export
- Advanced diff/merge between versions
- Full-text search across library (maybe v1.1+)
- Mobile-first polish beyond “usable”

## 3. System design (high level)

### 3.1 Frontend
- **Next.js (App Router)** web app
- Block editor UI: left column (original) + right/under (modernized)
- Linear reading mode: “Next block”, progress indicator

### 3.2 Backend
- **Next.js server routes** for:
  - parsing imports (optional split: client parsing for EPUB, server for DOCX)
  - LLM calls (keys stay server-side)
  - export generation (optional; v0 can be client-side but server-side is safer for DOCX)

### 3.3 Database
- **Postgres via Supabase** (recommended baseline for later multi-user)
- **Anonymous background identity** (no email/password UI) + row-level access control.

### 3.4 LLM provider abstraction
- Provider-agnostic interface: `generateVariant`, `generateNotes`, `summarizeChapter`, `buildGlobalGlossary`
- Initial provider can be OpenAI *or another*; the interface isolates the app from vendor lock-in.

## 4. Content continuity strategy (global + chapter + local)

### Global layer (book-level)
- Named entities: characters + alias variants, places
- Style rules (profile) + glossary
- Recurring motifs / terms list

### Chapter layer
- Chapter synopsis (short)
- Tone/arc notes (short)
- Local glossary deltas

### Block layer (generation-time payload)
- Current block
- Neighbor blocks (prev 1–2, next 1)
- Chapter synopsis
- Relevant glossary slices

## 5. Data model v0 (conceptual)

Entities (minimum):
- **Book**: id, title, author (optional), source_type (docx/epub), import_meta, created_at
- **Chapter**: id, book_id, order_index, title (optional), synopsis (optional), created_at
- **Block**: id, chapter_id, order_index, original_text, original_hash, offsets_meta, created_at
- **Variant**: id, block_id, style_profile_id, content, status (draft/final), created_at, updated_at
- **Note**: id, block_id, anchor_start, anchor_end, note_type (lexical/cultural/intertextual), content, created_at
- **StyleProfile**: id, name, params_json, created_at
- **Job** (optional): id, type, status, payload_json, created_at (for async processing later)

Identity:
- **AnonUser**: internal user_id issued silently; used for ownership.

## 6. UX flow v0

Screens:
1) **Library / Home**
   - “Import DOCX/EPUB”
   - List of books
2) **Book Overview**
   - Chapters list, progress per chapter
   - Button: “Continue reading”
3) **Editor (Linear mode)**
   - Original block + Modernized block
   - Actions: Generate / Alternative / Accept / Revert / Add note
   - Progress + Next/Prev
4) **Notes panel**
   - Filter by type
5) **Export modal**
   - Choose format: MD, DOCX
   - Include notes: on/off

## 7. Acceptance criteria (MVP)

- Import produces stable chapters + blocks; refreshing the page preserves the mapping.
- For any block, user can generate multiple variants and mark one as final.
- User can anchor notes to exact original spans and see them on hover/panel.
- Export reproduces:
  - original + final modernized text in order
  - notes as footnotes/endnotes
- User can close the app and return later to the same work without logging in.

## 8. M4 addendum: File upload ingestion (NOV-004)

This addendum updates import scope for Stage 0 -> Stage 1 implementation.

IN for NOV-004:
- Local file upload only (no server-side URL fetch/scrape in M4)
- Supported formats: `.html`, `.rtf`, `.docx`
- Canonical normalization: chapter -> block
- Metadata persistence: filename, size, mime, uploaded timestamp
- Storage in Supabase Storage plus metadata rows in Postgres

OUT for NOV-004:
- EPUB ingestion in this ticket
- Arbitrary domain scraping
- Automated copyright checks

Book status model for upload processing:
- `processing` before parsing
- `ready` on successful canonical parse
- `failed` on parse/storage failure with captured error message
