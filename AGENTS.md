# AGENTS.md — Novira (Single Source of Truth)

This file defines operating rules for the Development Agent (Codex) and how to navigate Novira’s documentation.

---

## 0) Prime Directive

Do not implement features until documentation is internally consistent.
If a contradiction exists between docs, stop and resolve it via the dedicated docs-cleanup ticket.

---

## 1) Source of Truth Order (Read in This Order)

1) SPEC.md  
2) TICKETS.md  
3) DECISIONS.md  
4) SECURITY.md  
5) strategy/ (memos that define canonical models)

If any file conflicts with a higher-priority file, the higher-priority file wins, and the conflict must be resolved via a docs ticket.

---

## 2) Repository Structure (Expected)

Root (current truth):
- SPEC.md
- TICKETS.md
- DECISIONS.md
- SECURITY.md
- README.md
- CHANGELOG.md
- OPEN_QUESTIONS.md
- AGENTS.md

Reference docs (conceptual + policies):
- docs/ (policies + operational memos)
- strategy/ (canonical models + architecture memos)
- legal/ (legal baseline and demo corpus policies)

Snapshots:
- EXPORTS/YYYY-MM-DD_MX/ (immutable milestone snapshots)

---

## 3) Scope Control

- Work only within the active ticket scope.
- No refactors outside ticket scope.
- No “nice to have” improvements unless explicitly ticketed.
- Do not silently change product behavior—update docs first.

---

## 4) Documentation Discipline (Hard Rule)

If work changes:
- import formats
- data model / schema
- user workflow
- security posture

Then Codex must:
1) update SPEC.md and/or DECISIONS.md (and relevant memo)
2) update TICKETS.md acceptance criteria
3) commit docs changes BEFORE code changes

---

## 5) Decision Logging

- DECISIONS.md must contain short decision statements.
- Long rationale/specs belong in docs/ or strategy/ memos.
- New decisions: add D-0xx entries, do not rewrite history.

---

## 6) Security Rules (Non-negotiable)

- No secrets in client code.
- Server-side model calls only.
- Supabase RLS must remain enabled.
- Validate all uploads (type + size).
- No public writable DB surface.

---

## 7) Commit Discipline

- Prefer small, single-purpose commits.
- Docs alignment commit must be separate from feature implementation.
- Never commit unrelated file changes inside a ticket.

Allowed:
- `git add SPEC.md TICKETS.md DECISIONS.md` (explicit files)

Not allowed:
- `git add .` (unless ticket explicitly includes all changes)

---

## 8) When to Stop and Ask

Stop and ask if:
- docs conflict on scope (e.g., EPUB IN vs EPUB OUT)
- schema mismatch blocks implementation
- a change would require new tables/policies not defined in docs

---

Project: Novira  
Mode: Hungarian-only MVP  
Current build focus: file upload ingestion (HTML/RTF/DOCX) + canonical parsing
