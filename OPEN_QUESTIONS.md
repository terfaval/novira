# OPEN QUESTIONS — Műfordító (v0.1)

These are the remaining decisions that may affect architecture or scope.

## 1) Hosting & environments
- Target hosting: Vercel + Supabase? (assumed yes)
- Separate staging project required for MVP?

## 2) Import rules
- DOCX chapter detection: rely on Heading styles or fallback heuristics?
- EPUB chapter boundaries: TOC-based only, or content heuristics?

## 3) Segmentation granularity
- Default blocks: paragraph-level
- Do we need optional sentence-level splitting (toggle)?

## 4) Editorial representation
- Should the “final” variant be a flag on Variant, or a pointer field on Block?
- Do we allow manual edits to “final” directly (yes, likely)?

## 5) Notes in export
- Footnotes vs endnotes default?
- Should notes attach to original text only, or also to modernized text?

## 6) LLM provider choice (initial)
- Which provider/model is preferred initially (OpenAI vs other)?
- Any hard constraints (data residency, cost ceilings, model capabilities)?

## 7) Cost controls
- Per-block generation limits?
- Monthly soft limit warning UI?

## 8) Future auth migration
- When adding email/password later, should anon work be “claimable” by a real account?
