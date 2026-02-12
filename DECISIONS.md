# DECISIONS.md – Novira

This document logs architectural and product decisions.
Each entry includes context and reasoning to prevent future drift.

---

## D-001 – Anonymous Background Identity (No Visible Login)

Status: Accepted  
Stage: M2  

Decision:
Novira will not require visible email/password login in MVP.
Instead, the system generates and stores an anonymous background identity per user session/device.

Why:
- Preserves frictionless UX.
- Prevents public/shared database exposure.
- Enables future upgrade to full auth without refactor.

Risk if ignored:
- Public writable database.
- Data vandalism.
- Loss of user-specific persistence.

Future upgrade path:
Anonymous → Email-based auth → Multi-user workspaces.

---

## D-002 – Supabase + Row-Level Security From Start

Status: Accepted  
Stage: M2  

Decision:
All user-specific data will be stored in Supabase Postgres with RLS enabled.

Why:
- Enforces data isolation.
- Prevents cross-user visibility.
- Production-ready baseline.

Risk if ignored:
- Security refactor required later.
- Potential data leaks.

Implementation note:
All content tables must include `user_id` column.
RLS policies enforce `auth.uid() = user_id`.

---

## D-003 – Server-Side LLM Calls Only

Status: Accepted  
Stage: M2  

Decision:
All AI model calls must occur server-side via Next.js API routes.

Why:
- Protects API keys.
- Prevents misuse and cost abuse.
- Aligns with security baseline.

Risk if ignored:
- Secret exposure.
- Cost explosion.
- Immediate vulnerability.

---

## D-004 – Linear Validation UX as Primary Workflow

Status: Accepted  
Stage: M1  

Decision:
The primary workflow follows linear reading and block-level validation.

Flow:
Upload → Segment → Read → Validate → Accept/Modify → Continue → Export

Why:
- Matches real editorial workflow.
- Reduces cognitive overload.
- Keeps MVP focused.

Risk if ignored:
- Fragmented navigation.
- UX complexity explosion.

---

## D-005 – LLM Provider Abstraction Layer

Status: Accepted  
Stage: M2  

Decision:
Novira must not be tightly coupled to a single AI provider.
An internal provider layer will abstract model calls.

Why:
- Flexibility (OpenAI, Anthropic, etc.)
- Future-proofing.
- Pricing agility.

Risk if ignored:
- Vendor lock-in.
- Expensive refactors.

---

## D-006 – Brand Discipline from MVP

Status: Accepted  
Stage: M2  

Decision:
UI and copy must follow NOVIRA brand guideline from first build.

Principles:
- No AI hype language.
- Calm, editorial tone.
- Curated, minimal interface.

Why:
- Product identity consistency.
- Trust positioning.
- Long-term credibility.

Risk if ignored:
- Rebranding refactor.
- UX tone inconsistency.

---

## D-007 – Export as Editorial Artifact (Not Raw Output)

Status: Accepted  
Stage: M1  

Decision:
Exported documents must reflect curated editorial state (accepted blocks only).

Why:
- Reinforces editorial control.
- Avoids raw AI output confusion.
- Aligns with “Curator + Creator” archetype.

Risk if ignored:
- Inconsistent output quality.
- Loss of professional credibility.

---

## D-008 – Block-Based Data Model (Chapter → Block → Variant)

Status: Accepted  
Stage: M1  

Decision:
The atomic editing unit is a Block.
Each block may contain multiple Variants.
One Variant may be marked as Accepted.

Why:
- Supports audit trail.
- Enables experimentation.
- Preserves traceability.

Risk if ignored:
- No revision history.
- Difficult rollback.

---

## D-009 – MVP Scope Discipline (6–8 Weeks)

Status: Accepted  
Stage: M1  

IN:
- Upload (DOCX/EPUB)
- Segmentation
- 1 Style Profile (“Mai irodalmi”)
- Block editor (original + rewrite)
- Note generation
- DOCX/Markdown export

OUT:
- Multi-user collaboration
- Role-based permissions
- ePub export
- Advanced analytics
- Marketplace features

Why:
- Prevents scope creep.
- Enables shipping.

---

## D-010 – Security Baseline Before Feature Expansion

Status: Accepted  
Stage: M2  

Decision:
No feature expansion may occur unless:
- RLS confirmed active
- Secrets server-only
- Validation implemented
- Rate limiting strategy defined

Why:
- Avoids retrofitting security.
- Protects infrastructure cost.

---

End of Decision Log (M2)

## D-011 – Hungarian-only MVP (No Multi-language Support)

Status: Accepted  
Stage: M2  

Decision:
Novira MVP supports Hungarian texts only (input and UI). Multi-language support is explicitly out of scope.

Why:
- Keeps scope tight and shippable.
- Enables Hungarian-specific style profiles and copy.
- Avoids i18n and language-variant complexity.

Risk if ignored:
- Significant UX + data model complexity early.
- Higher implementation and testing cost.

Future upgrade path:
Introduce `language_code` fields and i18n only when multi-language becomes a confirmed milestone.

---

## D-012 – Deferred: Multilingual Critical Translation Mode (CN–EN–HU)

Status: Deferred  
Stage: Post-MVP  

Decision:

Novira may introduce a future “Multilingual Critical Translation Mode” 
supporting parallel source layers (e.g. Original + Reference + Hungarian output), 
but only after the core Hungarian translation engine has proven stability.

Strict Activation Gate:

This decision may only move from Deferred to Planning if:

1. At least one full Hungarian public domain novella has been successfully translated.
2. Block-level validation workflow is stable.
3. Terminology consistency is demonstrably maintained across long text.
4. Structured notes function reliably.
5. Export output is editorial-grade.
6. Audit trail is functioning correctly.

Until these conditions are satisfied, no architectural planning or implementation may begin.

Why:

- Prevents premature complexity.
- Protects MVP delivery.
- Ensures core engine maturity before adding multi-source orchestration.
- Maintains scope discipline aligned with D-009 and D-011.

Scope of Future Mode:

- Multi-source block schema (Source A + Source B + Hungarian target)
- Reference-layer support (not mechanical retranslation)
- Terminology memory system
- Entity locking (characters, places, doctrinal terms)
- Three-column parallel reading UI
- Source-attributed notes

Risk if introduced too early:

- Data model instability.
- Context orchestration complexity.
- UX overload.
- Delayed shipping.

Strategic Classification:

Long-term differentiation feature.
Not part of MVP.
Not part of early scaling.

Reference:
See MEMO_multilingual-critical-mode.md for conceptual and architectural outline.

---

## D-013 -- Controlled MEK Source Import (MVP Scope Clarification)

**Date:** 2026-02-11\
**Status:** Accepted\
**Stage:** Stage 0 (Kickoff)\
**Impact:** Medium

### Decision

The system will support controlled source import specifically from MEK
(mek.oszk.hu) in MVP form.

Import will: - Accept a MEK work page URL (not direct file links
required from user) - Programmatically resolve available formats -
Prefer HTML (fallback: RTF/DOC; PDF only if necessary) - Normalize
content into canonical internal text representation - Store source
metadata (URL, format, timestamp)

EPUB-specific import is not required for MVP.

------------------------------------------------------------------------

### Rationale

1.  MEK provides multiple machine-readable formats.
2.  HTML/RTF are sufficient for clean structural parsing.
3.  EPUB handling adds unnecessary complexity in Stage 0.
4.  Controlled domain import strengthens legal transparency.
5.  Import-from-source supports the Novira brand value: traceability.

------------------------------------------------------------------------

### Non-Goals (MVP)

-   General web scraping
-   Arbitrary external domain imports
-   Automated copyright validation logic
-   EPUB-first pipeline

------------------------------------------------------------------------

### Security Constraints

-   Domain whitelist: mek.oszk.hu only
-   File size limit
-   Content-type validation
-   Metadata storage for audit trail

------------------------------------------------------------------------

### Future Extension

-   Expand whitelist (e.g., gutenberg.org)
-   Add EPUB ingestion
-   Automated copyright year checks
-   Version diff against re-imported source

------------------------------------------------------------------------
---

## D-014 -- Local File Upload First (No Server-side URL Fetch in M4)

**Date:** 2026-02-11\
**Status:** Accepted\
**Stage:** Stage 0 -> Stage 1\
**Impact:** Medium

### Decision

For NOV-004 (M4), ingestion is limited to user-uploaded local files:
- `.html` (including MEK-compatible exports)
- `.rtf`
- `.docx`

Server-side URL fetch/scrape is deferred and out of scope for this ticket.

### Why

1. Keeps ingestion security boundary simple and auditable in MVP.
2. Delivers canonical parsing value without crawl/origin complexity.
3. Aligns with D-013 import discipline and stage timeline.

### Security Constraints

- Strict extension + MIME validation
- File size limit enforcement
- Parsing failure must not create partial readable artifacts
- Metadata persistence for provenance and troubleshooting

### Revisit Trigger

URL-based ingest can be reconsidered only when:
- origin allow-list policy is finalized
- fetch timeout/retry policy is defined
- legal/source validation process is documented

---

## D-015 -- NOVIRA Color System v1 (Closed Palette)

**Date:** 2026-02-12  
**Status:** Accepted  
**Stage:** M2  
**Impact:** Medium

### Decision

Novira UI must use the closed `NOVIRA COLOR SYSTEM v1` palette below.  
No additional brand colors are allowed unless this decision is explicitly updated.

Core colors:
- Indigo (primary): `#1F2A44`
- Indigo (deeper alternative): `#162033`
- Off-white background: `#F4F1E8`
- Pale gold accent: `#C6A75E`
- Bronze depth accent: `#8C6B3E`

### Why

- Preserves visual identity consistency from MVP.
- Supports calm, editorial brand tone defined in D-006.
- Prevents ad hoc palette drift across surfaces.

### Constraint

This is a closed system. Do not deviate from the palette without a new decision entry.

---
