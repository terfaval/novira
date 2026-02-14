# DECISIONS.md — Novira

Architectural and product decisions log.

---

## D-001 – Anonymous Background Identity (No Visible Login)
Status: Accepted | Stage: M2
Novira uses anonymous background identity in MVP. No visible login.

---

## D-002 – Supabase + RLS From Start
Status: Accepted | Stage: M2
All user data stored in Supabase Postgres with Row-Level Security enabled.

---

## D-003 – Server-Side LLM Calls Only
Status: Accepted | Stage: M2
All model calls must be server-side. No client-side API keys.

---

## D-004 – Linear Validation Workflow
Status: Accepted | Stage: M1
Workflow: Upload → Segment → Read → Validate → Accept → Continue → Export

---

## D-005 – LLM Provider Abstraction
Status: Accepted | Stage: M2
Use provider abstraction layer to prevent vendor lock-in.

---

## D-006 – Brand Discipline From MVP
Status: Accepted | Stage: M2
No AI hype language. Calm editorial tone required.

---

## D-007 – Export Reflects Curated State Only
Status: Accepted | Stage: M1
Export must include only accepted block variants.

---

## D-008 – Block-Based Data Model
Status: Accepted | Stage: M1
Structure: Chapter → Block → Variant.

---

## D-009 – MVP Scope Discipline
Status: Accepted | Stage: M1
Import formats defined by D-014 (HTML/RTF/DOCX). EPUB deferred.

---

## D-010 – Security Baseline Before Expansion
Status: Accepted | Stage: M2
No feature expansion without RLS, validation, and server-only secrets.

---

## D-011 – Hungarian-Only MVP
Status: Accepted | Stage: M2
UI and content language limited to Hungarian in MVP.

---

## D-012 – Deferred: Multilingual Critical Mode
Status: Deferred | Stage: Post-MVP
See docs/MEMO_multilingual-critical-mode.md

---

## D-013 – Controlled MEK Source Import
Status: Accepted | Stage: Stage 0
Strategic goal: MEK-compatible import. URL ingestion deferred until safe.

---

## D-014 – Local File Upload First
Status: Accepted | Stage: M4
Linked Ticket: NOV-004

MVP ingestion limited to:
- HTML
- RTF
- DOCX

Server-side URL fetch is deferred.

---

## D-015 - Typography Baseline: Spectral + Source Serif 4
Status: Accepted | Stage: M1
Use Spectral as display font and Source Serif 4 as body font. Source Serif 4 keeps Minion-like book typography and allows future migration to licensed Minion without structural refactor.
