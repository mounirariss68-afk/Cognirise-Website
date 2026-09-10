# How We Do It - Pulse Redesign Principles

## Core Visual Language
- **Base Canvas**: Off-white (`#fdfcfb`, `#f3f5f8`) and deep navy (`#102957`, `#071936`) providing architectural structure.
- **Directional Energy**: Violet, magenta, and coral used intentionally for gradients, highlights, and conceptual flow (not pure decoration).
- **Typography**: Comfortaa (display) and Inter (body). High-contrast scaling, editorial asymmetry, tight tracking on large headings (`tracking-[-.05em]`).
- **Imagery**: Cinematic, polygon-masked original raster imagery replacing generic cards and collages.

## Component & Layout Strategy
1. **MethodPageHero**: Shared header component standardizing the introduction of each supporting method. Integrates breadcrumb routing, title, description, supporting text, and the signature polygon-masked hero image.
2. **MethodologyRelationship**: Keep the immediate decision and output visible. Put detailed boundaries and framework connections in one optional disclosure; do not repeat a full relationship map on every page.
3. **Structured Content**: Replaced disjointed card grids with cohesive editorial tables, bounded grids, and explicit visual hierarchy (e.g., `1–5 Scale` evaluations, explicit handover choreography flows).
4. **Motion**: Framer-motion used sparingly for initial entrance reveals (`y: 10`, `opacity: 1`); no heavy parallax or continuous scroll-jacking.

## Page Inventory & Redesign Status

| Page | Status / Action | Reason / Notes |
|------|-----------------|----------------|
| **AI Value-to-Scale** | Keep destination; consolidate model and assessment | Distinct organization-wide seven-dimension diagnostic and personal result report; not interchangeable with one-workflow readiness. No separate worksheet destination. |
| **AI Use-Case Prioritization** | Keep destination | Distinct editable opportunity comparison and sequencing tool. Its six criteria and Stop/Innovate/Demonstrate/Activate rules remain unchanged; no extra explainer page. |
| **Agentic Operations Readiness** | Keep destination | Distinct workflow-level evidence check, condition records, and saved decision links. Consolidating away its route would obscure the tool and risk saved-link compatibility. |
| **Human-Agent Operating Model** | Keep destination | Distinct substantive five-move playbook, decision-rights map, capabilities and measures. Present this material together, not as extra nested pages. |
| **IDAO / Agent Authority** | Untouched | Protected canonical pages. Visual styling explicitly bounded so changes do not bleed into these. |
| **Methodologies Portfolio** | Consolidate into situation-first entry | The selected situation supplies the reason and direct next action. Remove the repeated Methods catalogue and the full static route listings from desktop, mobile and print. |
| **Blank VTS worksheet CTA** | Remove from navigation | Replace with a personal PDF generated from the complete current assessment; do not link to an empty report. |

## Reference-derived interaction rules
- IDAO is the read-only reference for an asymmetrical title/image hero, architectural polygon frame, native section scrolling and spatial hierarchy. Do not copy its lifecycle into a new mandatory supporting-method sequence.
- The industry selector is the read-only reference for one active choice, a clear selected state, one active disclosure and a direct destination. Keyboard arrows change the selected situation; touch uses the same controls rather than a duplicate mobile catalogue.
- Keep stable existing method URLs and section anchors. Return links restore the situation and departure position; direct entry falls back to the situation navigator. Supporting assessment work survives exploration in the same tab.
- Avoid animation-driven information access. Motion-safe transitions are optional enhancements; reduced-motion users retain all content and controls.
- Compose image focal points within the polygon's central safe area on narrow and wide frames. Use coherent architectural scenes; do not solve cropped anatomy with arbitrary repositioning or add raster text.
- No shared token, global stylesheet, canonical-page component, scoring model, or protected asset may be changed to obtain this redesign.

## Privacy and continuity
VTS export is generated in-browser from complete current answers. Tab-session drafts are not analytics events and do not create server records. Readiness retains its explicit save/share/delete behavior; saved URLs load authoritative server answers, with local notes kept separate and scoped to that record.