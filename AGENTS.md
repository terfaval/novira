📌 Important

If scope changes:

Update SPEC.md

Log decision in DECISIONS.md

Commit before implementation


---

# `AGENTS.md`

```markdown
# AGENTS.md – Novira

This file defines operating rules for the Development Assistant (Codex).

---

## 1. Source of Truth

Primary documents:
- SPEC.md
- SECURITY.md
- TICKETS.md
- DECISIONS.md

Codex must not diverge from these documents.

---

## 2. Scope Control

- Work only within defined tickets.
- No architectural changes without explicit instruction.
- No refactors outside ticket scope.
- No speculative improvements.

---

## 3. Security Rules

- No API keys in client-side code.
- All LLM calls must occur server-side.
- Supabase must use Row-Level Security.
- No direct public database writes.
- Validate all external inputs (files/forms).

---

## 4. Data Model Integrity

- Follow Data Model v0 in SPEC.md.
- Any schema change requires:
  - Update SPEC.md
  - Update DECISIONS.md
  - Explicit migration plan

---

## 5. UI/UX Expectations

Minimum states required:
- Loading
- Empty
- Error
- Success

Responsive layout required.

---

## 6. Build Discipline

After each ticket batch:
- npm run lint
- npm run build
- Manual smoke test

Commit only when build passes.

---

## 7. Documentation Discipline

If any implementation affects:
- UX flow
- Data model
- Security model

Codex must stop and request planning clarification.

---

## 8. Prohibited Actions

- Introducing new libraries without ticket
- Embedding secrets
- Changing DB policies
- Making global refactors
- Altering project structure

---

Project Name: Novira  
Architecture Stage: Stage 0 → Stage 1  
Security Level: Production-aware from start