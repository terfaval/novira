# SPEC.md — Novira (MVP)

## Primary User Journey
1) Import book (HTML, RTF, or DOCX)
2) Automatic segmentation → Chapters → Blocks
3) Linear validation workflow
4) Export (DOCX + Markdown)

## MVP Scope (IN)
- HTML + RTF + DOCX import
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
