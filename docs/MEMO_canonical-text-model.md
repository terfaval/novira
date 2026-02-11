Canonical Internal Text Representation

Project: Novira
Status: Active (MVP Baseline)
Stage: Stage 0 → Stage 1

1. Purpose

Define how imported literary texts are represented internally in Novira.

This representation must:

Preserve essential literary structure

Support block-based translation

Remain export-safe (DOCX / MD)

Avoid premature rich-text complexity

Allow future extensibility

The canonical representation is the structural backbone of the system.

2. Design Principles

Structure before styling

Stability before richness

Export fidelity without editor bloat

Explicit block typing

Future-compatible but MVP-simple

3. Scope (MVP)

The system must preserve:

Chapter structure

Paragraph boundaries

Headings

Inline emphasis (italic)

Basic strong emphasis (bold)

Explicit footnote blocks (as separate entities)

The system will NOT preserve:

Complex Word styling

Arbitrary font families

Exact spacing rules

Word-specific formatting artifacts

4. Canonical Block Model (MVP)

Each imported text is normalized into:

Book
 └── Chapter
      └── Block


Each Block contains:

{
  id: UUID,
  chapter_id: UUID,
  order_index: number,
  type: "paragraph" | "heading" | "quote" | "footnote",
  raw_text: string,
  inline_format: "simplified-markdown",
  metadata: {
    source_offset?: number,
    source_reference?: string
  }
}

5. Inline Formatting Strategy

Inline formatting is stored in simplified markdown-like representation:

italic

bold

Footnote markers as [^1]

No HTML AST in MVP.

Reason:

Easier diffing

Easier export mapping

Lower parsing complexity

Avoids WYSIWYG editor burden

6. Why Not Full Rich Text?

Full HTML AST or ProseMirror-level structure would:

Increase implementation complexity significantly

Complicate block segmentation

Increase token payload size

Require rich-text editor integration

Delay shipping

MVP goal is editorial validation, not layout reproduction.

7. Export Mapping

Canonical → DOCX / MD mapping layer handles:

Headings → proper style

Italics → DOCX italic

Footnotes → proper footnote structure

Accepted variant only

Export layer is responsible for visual fidelity.

Canonical layer is responsible for semantic fidelity.

8. Interaction With Translation Engine

When sending blocks to LLM:

Inline markdown is preserved

Structural type is included in system prompt

Adjacent blocks may be included for context

Footnotes excluded unless explicitly requested

9. MEK Import Alignment

When importing from MEK:

HTML parsed

Structure normalized into canonical block model

Non-essential styling removed

Metadata stored (source URL, timestamp)

See D-013 in DECISIONS.md.

10. Future Extension Path

Possible future upgrades:

Extended inline format support

Verse-mode block type

Parallel source layer support

Structured semantic tagging

Rich editorial mode

These upgrades must not break canonical stability.

11. Governance Rule

Any change to canonical representation requires:

Update to this memo

Update to DECISIONS.md

Migration strategy defined

Export mapping validation

No silent evolution allowed.

END OF MEMO