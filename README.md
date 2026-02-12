# Novira

Novira is a web-based literary transformation tool designed to support
modernization, translation, and culturally aware adaptation of full-length literary works.

This repository follows the Digital Tool Portfolio – Project Playbook v3 methodology.

---

## 🚀 Project Status

Stage: Planning → Early Build  
Milestone: M1 (Planning Package complete)

See:
- SPEC.md
- SECURITY.md
- TICKETS.md
- DECISIONS.md
- EXPORTS/

---

## 🧭 Product Intent

Novira enables:

- Full book upload (DOCX / EPUB)
- Structured segmentation (chapter → block)
- Block-based modernization workflow
- Style-profile driven transformations
- Cultural and lexical notes
- Version control per block
- Export (DOCX / Markdown)

Core UX philosophy:
Linear reading + validation workflow.

---

## 🏗️ Planned Tech Stack (MVP)

- Next.js (App Router, TypeScript)
- Supabase (Postgres + RLS)
- Server-side AI calls (no client-side secrets)
- Environment variables via `.env.local` and Vercel

---

## 🔐 Security Model (MVP)

- No visible login UI
- Anonymous background identity
- Row-Level Security enabled
- Server-side LLM access
- No secrets in client bundle

See SECURITY.md for full details.

---

## 🛠 Development Workflow

Planning Assistant:
- Owns architecture, UX, scope

Codex (Development Assistant):
- Implements tickets only
- No architectural changes without explicit ticket
- No secret exposure
- Must pass lint + build

---

## 📂 Repository Structure

Root:
- SPEC.md (source of truth)
- SECURITY.md
- TICKETS.md
- DECISIONS.md
- CHANGELOG.md
- OPEN_QUESTIONS.md
- AGENTS.md

Snapshots:
- EXPORTS/YYYY-MM-DD_MX/

App code:
- /app
- /lib
- /components
- /db

---

## 📦 Setup (After M2)

```bash
npm install
npm run dev

Environment variables will be defined in .env.local (see .env.example when added).
