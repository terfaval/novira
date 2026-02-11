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
