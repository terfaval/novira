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
- Cloud persistence (anonymous identity)

## MVP Scope (OUT)
- EPUB import (deferred)
- Multi-user collaboration
- ePub/PDF export
- Advanced analytics

## Backend
- Next.js server routes
- Parsing imports (HTML/RTF/DOCX)
- Server-side LLM calls

## UI Icon Policy
- UI icons must be rendered only through `src/ui/icons/Icon.tsx`.
- UI icons must be sourced from `lucide-react` through the `Icon.tsx` mapping only.
- Inline SVG is not allowed for UI icons.
- Manual `<path>` definitions and custom `viewBox` definitions are not allowed for UI icons.
- Brand/logo and content/cover SVG assets are exceptions and stay on the asset pipeline.
