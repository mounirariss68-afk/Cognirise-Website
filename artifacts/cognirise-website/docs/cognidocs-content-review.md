# CogniDocs Content Review

## Overview
This document tracks the disposition of claims, evidence, and demonstrations from the legacy CogniDocs page as it is restored to the current Cognirise Pulse standard.

## 1. Reconciled Content & Claims
| Legacy Claim | Status | Rationale / Disposition |
| :--- | :--- | :--- |
| "at 90%+ accuracy" | **Omitted** | Unsupported absolute. Replaced with focus on "evidence-pinned data" and "human reviewer handoff". |
| "Days → 1 hr" processing time | **Omitted** | Unverified performance guarantee. Replaced with emphasis on deterministic extraction without time promises. |
| "100% can run on-premise..." | **Omitted** | Standalone API integration is not an offline, hardware or on-premises deployment guarantee. |
| Engagement counts, dimensions read and drawing-sheet totals | **Omitted** | Source HTML is an inventory, not independent proof; no engagement metrics are presented. |
| Merchant database size; any institution or universal formats | **Omitted / scoped** | Merchant normalisation retained without database-size claims. Input compatibility, revisions and scale require scoping. |
| First format learns itself; next statement in seconds | **Omitted** | Retain template variability as a problem, not a learning or timing promise. |
| "without hallucination", "refuses to guess", "never read" | **Omitted** | Absolutes removed to adhere to pragmatic voice. Framed as "prioritizes verifiable evidence" and "complex document intelligence". |
| "we'll read in front of you" | **Omitted** | Replaced with a grounded "Discuss your documents" enquiry CTA. |

## 2. Restored Substantive Sections
- **Product Promise:** Positioned as document intelligence for complex enterprise operations, not just generic retrieval or a magic bullet.
- **Three Extraction Layers:** Corrected the architecture to accurately reflect the three layers: (1) Vector Geometry, (2) Text & Coordinates, and (3) Computer Vision.
- **Deterministic Validation:** Clarified that deterministic logic is applied *after* fusion for measurement and reconciliation, rather than acting as a parallel extraction layer.
- **Engineering Editorial:** Restored substantive use cases including BOQ & quantity takeoff, code-compliance review, tender & bid evaluation, procurement & SKU matching, technical query drafting, as-built asset registers, P&ID digitization, and permit review.
- **Finance Editorial:** Retained itemisation, merchant normalisation and classification, dates/amounts/currency, reconciliation, expenses/accounting, spend/audit, lending/onboarding, VAT, disputes and fraud review with human-decision caveats.
- **Reviewer Handoff:** Added explicit coverage of validation and handoff to human analysts/engineers, emphasizing source-linked evidence over automated black-box decisions.
- **CogniOS Integration:** Provided clear distinction between standalone capability and governed agentic workflows, including a direct link to the CogniOS platform.
- **Enquiry CTA:** Replaced booking claims with an honest `/contact` destination titled "Discuss your documents".

## 3. Demonstrations
- Replaced raw string snippets with accessible native HTML facsimiles of a bank statement (table) and an engineering drawing (schematic/title block).
- Selectable fields dynamically highlight the corresponding evidence location on the source facsimile.
- Included Reviewer Notes and clear confidence ratings to illustrate the validation process.
- Added explicit labeling that the data is illustrative and does not represent live processing or actual customer evidence.
- Repurposed AI-generated raster artwork as secondary conceptual visuals to complement the native facsimiles.
- Legacy supporting bank-demo merchant/category mapping is retained as a fictional Careem example. The floor-plan demonstration is adapted to a fictional engineering detail/title-block example; its live counters, pass/fail compliance verdicts and timing stamps are omitted. Neither invented illustration is product proof.

## 4. Visual & UX Hygiene
- Restored to Pulse design system: off-white canvas, navy structure, Comfortaa/Inter, violet/magenta/coral accents.
- Removed legacy glassmorphism, numbered extraction boxes, repeated challenge cards, and parallax.
- Removed `clip-path` treatments from all text surfaces to ensure full legibility and accessibility. (Restricted to hero artwork).
- Reduced motion preferences honored for all interactive components.