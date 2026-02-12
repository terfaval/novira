MEMO
Automated Literary Pre-Translation Analysis Dossier (ALPAD)

Project: Novira / Műfordító
Status: Proposed – Post-MVP Layer
Stage: Stage 1 → Stage 2

1. Purpose

Define a structured, semi-automated pre-translation analytical layer that generates a Literary Pre-Translation Dossier before translation begins.

This layer must:

Extract structural and narrative backbone

Identify characters and relational topology

Track motifs and symbolic objects

Map thematic tensions

Profile tone and register

Detect translation risk zones

Produce a stable reference document usable during block-based translation

The dossier is not literary criticism.
It is a translation-support intelligence layer.

2. Strategic Rationale

Translation errors often arise from:

Loss of long-arc narrative memory

Inconsistent character voice

Terminological drift

Missed symbolic recurrence

Misjudged tonal weight

Generating a structured analytical overview before translation:

Improves coherence

Reduces interpretive fragmentation

Supports terminology locking

Reinforces stylistic fidelity

This aligns with Novira’s promise:
Readable with fidelity.

3. System Positioning

This layer activates after canonical block normalization (see Canonical Internal Text Representation 

MEMO_canonical-text-model

).

Pipeline:

Import → Canonical Blocks → ALPAD Analysis → Translation Engine

It does not alter canonical storage.
It produces a parallel analytical artifact.

4. Dossier Structure (v0 Specification)

The generated document must contain the following sections:

4.1 Work Metadata

Title

Author

Original publication year (if available)

Genre classification (inferred)

Narrative mode (1st person / 3rd person / mixed)

4.2 Narrative Spine Extraction

Structured as:

Initial state

Inciting event

Turning Point 1

Turning Point 2 (if detectable)

Climax

Resolution type (closed / open / tragic / cyclical)

Dominant conflict type (internal / interpersonal / societal / metaphysical)

Purpose:
Preserve macro-structure awareness during micro-block translation.

Automation level: Medium.

4.3 Character Topology Map

For each detected character:

Name (normalized entity)

Relative frequency score

Functional role (protagonist / antagonist / mediator / narrator / peripheral)

Primary relational connections

Stylistic speech profile (if dialogue present)

Key scene clusters

Optional graph representation (future stage).

Automation level: High (NER + co-occurrence analysis).

4.4 Motif & Symbol Tracking

For each recurring motif/object:

First occurrence

Recurrence density

Contextual shift pattern

Narrative peak involvement

Final occurrence

Categories:

Natural imagery

Spatial motif

Religious/metaphysical motif

Object-symbol

Temporal motif

Purpose:
Ensure consistent lexical handling in translation.

Automation level: High (keyword clustering + recurrence tracking).

4.5 Thematic Matrix

Structured extraction of:

Dominant theme

Secondary themes

Value-axis tensions (order/chaos, loyalty/betrayal, faith/doubt, etc.)

Abstract noun frequency clusters

Moral polarity indicators

Purpose:
Prevent reductionist translation choices.

Automation level: Medium.

4.6 Tone & Register Profile

Measured indicators:

Average sentence length

Dialogue/narration ratio

Archaic density index

Metaphor density approximation

Modal verbs frequency

Formality level estimate

Output:

Dominant tone (lyrical / ironic / detached / solemn / intimate / etc.)

Register consistency level

Stylistic volatility score

Purpose:
Guide style profile parameterization.

Automation level: High (statistical).

4.7 Time & Spatial Structure

Timeline continuity assessment

Flashback density

Location change frequency

Closed vs open spatial model

Purpose:
Support temporal coherence in translation.

Automation level: Medium.

4.8 Translation Risk Zones

Detected categories:

Idiomatic clusters

Culture-specific references

Multi-meaning lexical nodes

Rhetorical figures

Dense metaphor passages

Ambiguous pronoun chains

Each flagged block must include:

Block ID

Risk type

Suggested strategy (literal / adaptive / annotated / dual rendering candidate)

Purpose:
Reduce interpretive drift.

Automation level: High for detection; Medium for classification.

5. Output Format

The ALPAD document must be exportable as:

Markdown (primary)

PDF (future)

Attached metadata JSON (internal use)

The document is:

Read-only by default

Augmentable with curator notes

No direct modification of canonical blocks allowed.

6. Interaction With Translation Engine

During block translation:

The engine may access:

Character profiles

Locked motif terminology

Tone profile

Risk flag context

But:

The dossier must not override human editorial control.

It is advisory, not prescriptive.

7. Governance Rule

Any structural modification of:

Dossier schema

Detection categories

Risk classification logic

Requires:

Update to this memo

Entry in DECISIONS.md

Validation on at least one full public domain novella

No silent analytical expansion permitted.

8. Non-Goals (Stage 1)

This layer does NOT:

Perform literary critique

Replace editorial interpretation

Generate academic commentary

Predict authorial intent

Replace human thematic reading

It supports translation discipline only.

9. Activation Threshold

This feature may enter development only after:

Stable canonical block ingestion is proven.

At least one full novella translation is completed end-to-end.

Terminology consistency can be demonstrated across 10k+ tokens.

Until then, it remains a structured design document.

10. Long-Term Vision

ALPAD may evolve into:

Interactive character graph

Terminology locking system

Motif-aware translation hints

Multi-version comparative analysis

Academic research export mode

However:

Structural stability precedes expansion.

END OF MEMO