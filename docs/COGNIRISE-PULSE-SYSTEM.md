# Cognirise Pulse System

**Status:** Authoritative implementation and production specification  
**Applies to:** Cognirise websites, editorial pages, presentations, social and display assets, diagrams, architecture and data explorations, and new visual tools  
**Does not authorize:** changes to protected methodology content, architecture definitions, approved claims, publication status, or media rights

## 1. How to use this document

Pulse is the shared Cognirise visual and verbal language. It makes intelligence visible as it moves work through clear structures, decisions, controls, and outcomes.

Every rule is assigned one of four scopes:

- **Universal** — use across every Cognirise Pulse channel unless a later approved decision says otherwise.
- **Channel-specific** — valid only in the named medium or format.
- **Protected** — preserve the content, relationships, names, order, and behavior; styling may only change inside an explicitly approved boundary.
- **Obsolete or rejected** — evidence of what not to reproduce, even if the source still exists.

Do not average conflicting examples. Apply the source hierarchy below.

## 2. Source authority and conflict resolution

### 2.1 Authority order

When sources disagree, use this order:

1. **Protected live behavior and governed published content.** Current public routes, accessibility behavior, canonical architecture, approved methodology content, and published CMS revisions are the highest operational authority.
2. **Later explicit approval or rejection records.** A later correction overrides an earlier mockup, screenshot, draft, or generic brand note.
3. **Current shared website implementation.** Shared tokens, `BrandButton`, motion rules, current editorial page families, and responsive behavior govern web work.
4. **Approved channel masters.** The Pulse PowerPoint template, approved image library, LinkedIn masters, and connected modular journey govern their own formats.
5. **Approved direction mockups.** Use them for composition, imagery, voice, and intent where they do not conflict with items 1–4.
6. **Strategic plans and early explorations.** Use for rationale only. Recommendations that were not adopted are not specifications.
7. **Rejected, legacy, draft-only, or development-only views.** Never treat these as customer-facing standards.

### 2.2 Governing sources

| Source | Authority | What it governs |
|---|---|---|
| `artifacts/cognirise-website/src/index.css` | Current shared web authority | Core colors, fonts, shared CTA anatomy, focus, motion, reduced motion, angular masks |
| `artifacts/cognirise-website/src/components/ui/brand-button.tsx` | Current shared web authority | CTA variants, semantics, loading/disabled behavior, integrated arrow motion |
| Current website pages and shared components | Live implementation | Editorial layout, responsive behavior, navigation, content hierarchy |
| `.agents/memory/cognirise-pulse-direction.md` | Later approved direction | Light-dominant system, Signal Rail, controlled momentum, rejected patterns |
| `docs/guardrails-pulse-design-review.md` | Later rejection/correction record | Methodology-page composition; rejection of floating frosted panels, nested cards, and tiny monospace labels |
| `artifacts/cognirise-pulse-template/` | Approved channel master | Presentation palette, font fallbacks, layout families, editable diagram and chart patterns |
| Approved Pulse raster and social masters | Approved channel masters | Image world, crops, export formats, safe areas |
| `deliverables/cognirise-five-industry-images/DESIGN-DIRECTION.md` | Approved image direction | Cinematic architectural world, quality bar, subject exclusions |
| `source-material/redesign-plan.md` | Strategy/rationale | Original principles and intent; superseded where implementation or later approvals differ |

### 2.3 Important overrides

- The universal font pair is **Comfortaa + Inter**. DM Sans, DM Mono, Manrope, and Playfair Display seen in asset-room or review mockups are presentation devices inside those development surfaces, not the core brand system.
- The system is **light-dominant**. Dark slides, chapter dividers, image overlays, and bounded technical panels are channel-specific contrast moments, not permission to make a dark Pulse site or asset family.
- The current rounded, integrated shared CTA supersedes old striped buttons and the rejected inset or detached white arrow tile.
- A Pulse-colored card grid is not automatically Pulse. Bespoke spatial representation and editorial hierarchy take priority over generic cards.
- Guardrails and other supporting methods use the established methodology-page family. IDAO and Agent Authority remain protected references, not content to reinterpret.

## 3. Identity and principles

### 3.1 Brand idea

**Intelligence becomes visible when it moves work.**

Pulse should feel:

- executive-grade rather than promotional;
- precise rather than sterile;
- technically credible without generic technology imagery;
- active without spectacle;
- human-led and accountable;
- designed for consequential enterprise, government, regulated, and sovereign work.

### 3.2 Core principles

1. **White space earns trust.** Begin with a warm light field and leave room for hierarchy and evidence.
2. **Evidence earns attention.** Move from claim to proof: a metric, source, working artifact, architecture, decision, named capability, or approved case.
3. **The gradient signals action.** Violet–magenta–coral marks movement, activation, transfer, selection, or a decisive point. It is not decorative fill.
4. **Structure makes intelligence legible.** Use rules, alignment, architectural framing, ordered relationships, and explicit labels.
5. **Human authority remains visible.** Judgment, accountability, controls, and ownership are never hidden behind autonomous-agent spectacle.
6. **Every format adapts.** Preserve the grammar, not a single template. A page, slide, social post, and architecture explorer should share identity without sharing an identical layout.

## 4. Foundation tokens

### 4.1 Core palette

These values are the verified shared system.

| Semantic token | Exact value | Role |
|---|---:|---|
| `canvas.paper` | `#fdfcfb` | Primary website and editorial canvas |
| `canvas.slide` | `#f8f7f4` | Presentation canvas |
| `canvas.soft` | `#f2f4f8` | Light grouping surface |
| `canvas.mist` | `#eef0f5` | Broad tonal section change |
| `ink.primary` | `#102957` | Primary text, rules, controls, structure |
| `ink.deep` | `#071936` | Deep image field and bounded dark surface |
| `ink.brandDeep` | `hsl(217 76% 12%)` | Shared web CTA/deep token; use the live token in code |
| `text.secondary` | `#405777` | Body and explanatory copy |
| `text.tertiary` | `#536887` | Supporting copy |
| `text.muted` | `#647491` | Metadata and secondary labels |
| `line.default` | `#cbd3e1` | Dividers, boundaries, inactive structure |
| `brand.violet` | `hsl(253 66% 61%)` / `#7659df` | Route origin, active system state |
| `brand.pink` | `hsl(326 64% 59%)` / `#db509e` | Emphasis, selection, editorial highlight |
| `brand.coral` | `hsl(10 100% 68%)` / `#ff775d` | Destination, focus, transfer, decisive action |
| `white` | `#ffffff` | Inverse copy and local high-contrast detail |

Hex values shown beside HSL tokens are the approved mockup equivalents. In website code, use the existing HSL custom properties so shared behavior remains consistent.

### 4.2 Color use

**Universal**

- Light surfaces dominate the overall composition.
- Use navy for typography, lines, and structural anchors.
- Use the gradient in a controlled route: `105deg`, violet → pink → coral is the shared direction.
- Keep multicolor coverage restrained, normally below roughly 10–15% of a page or slide.
- Never place long body copy over a multicolor gradient.
- Use semantic green, amber, and red only for real status or feedback, not brand decoration.

**Bounded dark use**

- Allowed for a chapter divider, closing action, image field, modal backdrop, technical depth panel, or a single contrast section.
- Maintain a clear return to the light system.
- Do not make a full website, diagram family, architecture map, or general campaign set dark by default.
- CogniOS architecture is specifically light-dominant: warm white, ivory, pale lilac, and blush; navy is limited to type, fine lines, and small high-contrast details.

### 4.3 Typography

| Role | Family | Weight | Guidance |
|---|---|---:|---|
| Display and headings | `Comfortaa` | 500–700; usually 600 | Tight, large, decisive, sentence case |
| Body and UI | `Inter` | 400–700 | Clear, compact, comfortable line length |
| Monospace | `Menlo` or approved system mono | 400–500 | Sparingly for technical values where monospacing adds meaning |
| PowerPoint display fallback | `Comfortaa`, `Arial Rounded MT Bold`, `Arial`, sans-serif | — | Keep on the exported slide root |
| PowerPoint body fallback | `Inter`, `Aptos`, `Arial`, sans-serif | — | Keep on the exported slide root |

**Website scale**

- Hero/display: `clamp(40px, 4.8vw, 76px)` to `clamp(50px, 7vw, 98px)` according to template.
- Major section heading: approximately `clamp(42px, 5vw, 78px)`.
- Supporting section heading: approximately `clamp(28px, 3vw, 40px)`.
- Lead/body: `16–18px`; use `16–16.5px` for the current primary web body.
- Small body: `14px`.
- Labels/kickers: `10–11px`.
- Heading line height: `0.94–1.05`; body line height: `1.55–1.65`.
- Large heading tracking: `-0.05em` to `-0.08em`.
- Kicker tracking: `0.12em–0.13em`; label tracking: about `0.1em`.

Do not use tiny text to manufacture sophistication. Labels must remain readable at responsive sizes and text enlargement.

**Presentation scale**

- Size with slide-relative units so the complete composition scales together.
- Common display sizes are `4.5–4.8 × --slide-vw`.
- Common slide body and labels are `1.5–2 × --slide-vw`.
- Browser appearance is not proof of export fidelity. Render the PPTX in a presentation engine and inspect reflow, clipping, overlap, and hierarchy.

### 4.4 Spacing and grid

- Base spacing unit: `4px`.
- Preferred scale: `8, 12, 16, 24, 32, 48, 64, 96, 144px`.
- Website horizontal gutter: `4.8vw` on desktop; `21–24px` on mobile.
- Maximum broad content field: approximately `1440px`.
- Use 12 columns on desktop, 8 on tablet, and 4 on mobile as planning guidance; implementation may use asymmetric fractional grids.
- Typical reading measures: `620–900px`; body copy often stays near `410–700px`.
- Prefer large vertical intervals and visible section boundaries over stacks of containers.
- Radius is minimal for fields and panels. The shared primary CTA is an intentional rounded exception.
- Shadows are rare. Use whitespace, rules, image depth, and tonal contrast first.

## 5. Visual and spatial grammar

### 5.1 Editorial composition

Pulse compositions are authored fields, not dashboards by default.

Preferred patterns:

- independent copy and image columns;
- one decisive headline per viewport or slide;
- asymmetrical fractions such as `0.94 / 1.06`, `1.1 / 0.9`, or `1.2 / 0.8`;
- a title field paired with a narrower explanatory measure;
- proof ledgers separated by rules;
- bounded lists or tables with visible order;
- one large image plus two supporting images;
- a full-width spatial diagram with progressive disclosure;
- open action groups anchored by alignment and rules.

### 5.2 Shape language

- Fine 1px structural rules; 2px only for stronger emphasis.
- Square or nearly square editorial frames.
- Angular image crops:
  - primary diagonal: `polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)`;
  - return diagonal: `polygon(0 0, 100% 7%, 100% 100%, 8% 94%)`;
  - lower diagonal: `polygon(0 8%, 100% 0, 100% 100%, 9% 92%)`.
- Circular geometry is reserved for the shared CTA's integrated action marker, meaningful nodes, and genuine circular frameworks.
- Avoid default rounded SaaS cards, pills, and floating glass panels.

### 5.3 Kicker and Signal Rail

The compact editorial kicker pairs an uppercase label with a short gradient rule:

- label: `10px`, semibold, uppercase, approximately `0.12em` tracking;
- rail: `23px × 2px`;
- rail gradient: violet → pink → coral.

The **Signal Rail** is the continuous, visible directional element that connects an action to Pulse movement. In CTAs it belongs inside the single action surface with the arrow and coral signal point. It must not become a detached stripe, a separate white arrow tile, or decorative bars unrelated to action.

## 6. Verbal language

### 6.1 Voice

Pulse language is direct, specific, operational, and accountable.

- Lead with a point of view, not an adjective.
- Prefer active verbs: **build, deploy, govern, integrate, move, reduce, shorten, prove, decide, operate, own**.
- Name the work, decision, constraint, control, route, or outcome.
- Pair conviction with evidence or a clear next step.
- Address executives and technical evaluators without switching into jargon-heavy “AI futurism.”
- Keep human judgment, governance, and client ownership explicit.

### 6.2 Sentence construction

- Headlines are short declarative sentences or compact contrasts.
- Use sentence case. Do not title-case every heading.
- One strong thought is better than a string of claims.
- Use full stops when they make the line more decisive.
- Use em dashes for a meaningful contrast, not as decoration.
- Use the serial comma only when clarity needs it; remain internally consistent.
- Body copy should explain mechanism or consequence, not repeat the headline.
- Avoid stacked nouns, inflated superlatives, and generic claims such as “cutting-edge,” “revolutionary,” or “seamless.”

### 6.3 Approved representative patterns

These examples show the approved construction, not immutable copy unless the text is governed content:

- “Intelligence becomes momentum.”
- “AI should move the business—not just assist it.”
- “AI spend is rising. Too little work is changing.”
- “Three forces. One accountable team.”
- “Measure movement, not activity.”
- “Bring one process. Leave with a route.”
- “Governance in the flow.”
- “Human-led. Agent-accelerated.”

### 6.4 Terminology and capitalization

- Use official names exactly: **Cognirise**, **Cognirise Pulse**, **CogniOS**, **CogniAgents**, **CogniDocs**, **IDAO**, **Agent Authority Model**.
- Preserve the canonical platform inventory, order, ownership, and routes. Editorial content may enrich but not redefine platform identity.
- Use **AI-native advisory and engineering** consistently where the category statement is needed.
- Use **human–agent** with an en dash when describing the paired operating model; do not alternate casually with slash constructions.
- Capitalize named methodologies, platforms, and formal framework stages. Keep generic capabilities and labels in sentence case.
- Protect methodology anchors: IDAO and Agent Authority are read-only canon unless an explicit approval changes them.

### 6.5 Claims and evidence

- Never publish placeholder statistics or invented attribution.
- Every substantive statistic needs a source, market match, verification date, and review/expiry treatment.
- Distinguish an aspiration, illustrative example, capability claim, and verified result.
- Do not imply generated imagery depicts client work.
- Keep source labels close enough to the claim to remain understandable.
- Do not hide caveats in tiny labels or hover-only content.

### 6.6 Labels and CTAs

Labels identify the function: `Model`, `Focus`, `Platform`, `Presence`, `First condition`, `Outcome`, `Source`.

CTA copy names intent or exchange:

- “Bring us one process”
- “Book a value scan”
- “Explore the operating model”
- “Read the architecture”
- “See banking plays”
- “View methodology portfolio”

Avoid vague actions such as “Learn more,” “Discover,” or “Get started” when a specific destination or exchange can be named.

### 6.7 Localization: English and Arabic

- Do not invent Arabic translations. Use approved professional translation and subject review.
- Preserve meaning and authority rather than English word order.
- Support right-to-left layout at the system level: reverse directional layout and icon placement where reading direction requires it, while preserving logical process direction when it carries domain meaning.
- Use an approved Arabic family with comparable clarity and weight; do not force Comfortaa onto Arabic glyphs it does not support.
- Expect Arabic expansion. Test headings, CTA labels, tables, diagram labels, captions, social safe areas, and exported slides with real approved copy.
- Do not encode order only through left/right language. Use numbers, names, and semantic sequence.
- Keep Latin product names in their approved form and isolate bidirectional text correctly.

## 7. Imagery and visual storytelling

### 7.1 Core image world

Use cinematic, photorealistic raster imagery:

- premium near-future architecture rather than literal workplaces;
- monumental warm ivory stone or satin concrete;
- deep midnight-navy structures;
- selective translucent glass and dark reflective surfaces;
- soft dawn or late-afternoon light;
- controlled shadows and atmospheric depth;
- a clear foreground entry, strong spatial anchor, and luminous destination;
- plausible geometry and premium material detail.

Violet, magenta, coral, and restrained warm-orange flows move through floors, channels, apertures, gates, and shared structures. Use a few purposeful routes. The flow represents decisions, exchange, governed movement, or transformation.

### 7.2 Subject patterns

- Abstract a concrete operating reality into physical space.
- Show governance as gates, boundaries, apertures, checkpoints, or architecture in the route—not a compliance badge added afterward.
- Show human and agent collaboration as visible shared judgment and accountable intervention.
- For industry work, use sector metaphors that are legible without obvious symbols or replicas.
- Compose the physical scene first; do not prompt an image model with an abstract business phrase and expect a usable Pulse image.

### 7.3 Image treatment

- Preserve approved artwork at full resolution.
- Use `object-fit: cover` for editorial frames and define a verified focal point.
- Keep critical content in the polygon's central safe area at narrow and wide crops.
- Use restrained navy-to-transparent overlays when white captions need contrast.
- Place short, rebuilt HTML/SVG labels over imagery only when the channel requires them.
- Do not paste a complete slide, screenshot, UI frame, or presentation chrome into a web widget.
- Do not downsample a detailed blueprint merely to fit a boxed component.

### 7.4 Text hygiene

- Public cinematic raster art contains no accidental text, letters, numbers, logos, watermarks, interface labels, or pseudo-writing.
- Generic erasure is not sufficient. Replace text-bearing sheets, signs, or panels with abstract line networks, nodes, or architectural surfaces.
- Inspect every final raster at full size.
- Social masters may contain intentional editable text in SVG, but the embedded raster source must remain clean.

### 7.5 Prohibited imagery

Do not use:

- glowing brains, neural nets, circuit boards, particle clouds, synthetic humanoids, robots, or holographic HUDs;
- generic neon sci-fi corridors or black rooms;
- stock-photo smiles, literal boardroom scenes, or generic workplace photography as the primary Pulse world;
- cartoons, low-poly scenes, flat vector “AI” illustrations, or decorative icon collages;
- malformed people or objects, clipped focal subjects, fake dashboards, or illegible interface fragments;
- flags, weapons, uniforms, branded institutions, or literal landmark replicas unless explicitly required and approved;
- obvious sector shorthand such as coins, padlocks, graduation caps, oil derricks, hotel beds, or aircraft.

## 8. Diagrams, architecture, and data

### 8.1 Diagram principles

- Begin with the actual relationship: sequence, hierarchy, feedback, decision, comparison, ownership, or flow.
- Make direction and consequence visible.
- Keep labels readable without hover.
- Use direct labels near marks; avoid remote legends when they increase effort.
- Use the brand spectrum to show active transfer, selected state, or progression—not to color every category.
- Use navy and neutral rules for the stable system.
- Expose detail progressively, but never make essential understanding dependent on motion.
- Preserve genuine matrix and architecture semantics; do not turn everything into a timeline.

### 8.2 Architecture explorations

- Show a complete overview before drill-down.
- Keep canonical names, order, ownership, and relationships protected.
- Use one selected state, clear keyboard-operable controls, and one active disclosure.
- Use readable labels instead of tiny monospace tags.
- On mobile, linearize secondary detail while preserving the overview and sequence.
- Do not substitute a generic card grid, separate explorer, modal, drawer, or repeated accordion for a connected architecture when the relationships are the content.

### 8.3 Modular panoramas

- Create the journey as one connected master first.
- Divide only through shared conduit or platform sections.
- Preserve segment widths proportionally.
- Never translate or scale individual modules in the assembled state.
- Use tint, opacity, highlight, or overlay for selection so physical joins remain exact.
- Verify reassembly is pixel-identical.

### 8.4 Data displays

- Lead with the decision or outcome, not chart decoration.
- Use direct labels, target context, units, period, and source.
- Keep axes and comparisons honest.
- Reserve the accent color for the key series, threshold, or intervention.
- Do not use gradients to encode quantitative magnitude.
- A dashboard layout is appropriate only when simultaneous monitoring is the task; it is not the default style for editorial storytelling.

## 9. Components and interaction

### 9.1 Primary CTA anatomy

The current shared CTA is the web authority.

- One continuous rounded surface; minimum height `52px`, minimum width `11rem`.
- Outer padding `5px`; no detached arrow tile.
- Primary/submit: white text on deep navy.
- Inverse: deep navy text on approximately 96% white.
- Secondary: navy text on a lightly translucent white surface with a 24% navy border.
- Label is centered with `48px` inline padding and `1.25` line height.
- The integrated circular action marker is `36 × 36px`, positioned inside the surface.
- The marker contains the arrow, a coral signal dot, and a short orbital trail.
- The submit variant may use the violet–pink–coral gradient as the border, never as a long-copy fill.
- Editorial CTA: bold text with a bottom rule and coral arrow; it is not a substitute for the primary action.

### 9.2 CTA states

- **Hover/focus:** on capable devices, the integrated marker travels from the start to `calc(100% - 36px)` over `800ms cubic-bezier(.22,.61,.36,1)`; the label shifts `-4px`; the signal dot completes one turn.
- **Arrival:** a `240ms` coral signal response resolves the motion.
- **Focus-visible:** background-colored 3px separation ring, then a 3px coral ring; preserve the existing shadow.
- **Active:** `translateY(2px) scale(.985)` with a tighter shadow.
- **Disabled:** pointer interaction removed, opacity `.52`, saturation `.55`; links also receive `aria-disabled` and leave the tab order.
- **Loading:** use `aria-busy` and a visible spinner without changing the accessible action name.
- **Reduced motion:** marker rests at the destination; no travel, spin, trail, transition, or animation.

### 9.3 Navigation and controls

- Keep desktop navigation calm, compact, and aligned to the editorial grid.
- Mobile navigation uses the same destinations and state, not a separate content model.
- Preserve search parameters, market, locale, anchors, and canonical routes through navigation.
- Use native links for destinations and buttons for state changes.
- Tabs use `tablist`, `tab`, `tabpanel`, `aria-selected`, roving tab index, and arrow-key movement.
- Dialogs use native or equivalent modal behavior, Escape to close, backdrop behavior, a named close control, and focus return to the trigger.
- Click or touch selection must provide the same information as hover.
- Do not hide the only action or explanation inside hover.

### 9.4 Cards

Cards are permitted when the content is genuinely a repeatable collection:

- searchable asset library items;
- articles, people, downloads, or comparable records;
- equal-priority decisions where the bounded comparison is meaningful;
- dashboard measures when simultaneous monitoring is the task.

Cards are rejected when they merely divide a narrative, replace an architecture, or put every idea in a floating box. Prefer connected tables, ledgers, spatial diagrams, and open editorial sections.

## 10. Motion

### 10.1 Motion grammar

The shared sequence is **arrival → signal → transfer → resolution**.

Use motion to:

- reveal an image through its directional edge;
- show a route, state transition, or transfer;
- clarify spatial relationships;
- confirm selection or arrival;
- give a single visible focal element controlled momentum.

### 10.2 Shared web timings

- Content reveal: opacity `620ms` and transform `760ms`, using `cubic-bezier(.16,1,.3,1)`, from about `24px` vertical and optional `±16px` horizontal displacement.
- Image reveal: opacity `420ms ease-out`; scale and clip `900ms cubic-bezier(.16,1,.3,1)`, beginning near `scale(1.025)` with a directional inset.
- Hero image reveal may run up to `1.2s cubic-bezier(.2,.7,.2,1)`.
- Image hover zoom: approximately `700ms`, maximum around `1.05–1.06`.
- Fast UI feedback: `160–300ms`.

### 10.3 Motion policy

- Keep browser-native scrolling.
- Trigger narrative reveals once where possible.
- Scope continuous motion to the current focal element.
- Do not use page-wide parallax, scroll hijacking, pinned storytelling, repeated reveal cascades, or infinite “breathing.”
- Do not animate information into existence if it is otherwise unavailable.
- Avoid motion that delays comprehension or creates a stuck-page sensation.
- Autoplay media requires an immediate reduced-motion/static alternative and must not be the only carrier of information.

### 10.4 Reduced motion

For `prefers-reduced-motion: reduce`:

- set animation and transition duration to `.01ms` or remove them;
- use one iteration, zero delay, and `scroll-behavior: auto`;
- show all reveal content immediately with full opacity, no transform, and no clip;
- replace hero video with its approved static poster/fallback;
- keep all controls and disclosures usable;
- place CTA markers in the resolved destination state without travel or rotation.

## 11. Responsive behavior

- Design from content priority, not proportional shrinking.
- At mobile widths, change asymmetric two-column compositions to one column.
- Keep the narrative group intact: kicker, heading, body, and action should not become interleaved with unrelated media.
- Use `21–24px` gutters.
- Allow large headings to reduce to about `40–58px` according to length and template; test actual copy and text enlargement.
- Stack proof ledgers into two columns or one readable sequence while retaining borders and label/value association.
- Convert image ledgers to one dominant image followed by supporting images.
- Let tab strips scroll horizontally with native touch behavior when labels cannot fit.
- Replace hover-only affordances with visible mobile affordances.
- Preserve image focal points and avoid clipped people, labels, gateways, or destination structures.
- Avoid document-level horizontal overflow at narrow widths and 200% text sizing.
- Do not make a separate simplified mobile content model unless the domain genuinely requires it.

## 12. Accessibility

Target WCAG 2.2 AA.

- Use semantic landmarks and one clear H1.
- Maintain logical heading order.
- Use actual buttons, links, lists, tables, tabs, and dialogs.
- Provide visible focus for every interactive element. Shared primary actions use the exact coral focus treatment defined above; other controls use a 2–3px coral or pink outline/ring with sufficient offset.
- Keep touch targets at least `44 × 44px` where practical; the primary action is at least `52px` high.
- Ensure keyboard order follows visual and reading order.
- Support Enter/Space for native buttons and arrow keys for composite controls.
- Use alt text that describes the meaningful scene and purpose, not style alone. Decorative imagery uses empty alt text.
- Never put essential copy only inside a raster.
- Captions, sources, units, status, errors, and form labels remain visible and programmatically associated.
- Announce asynchronous success/error state with appropriate live regions.
- Do not rely on color, position, or motion alone.
- Verify contrast on light, dark, image-overlay, hover, focus, disabled, and gradient-adjacent states.
- Test keyboard use, reduced motion, 200% text resizing, and narrow-screen overflow.

## 13. Channel application

### 13.1 Websites and editorial pages

- Use the live shared tokens and components.
- Prefer white/off-white pages with independent copy and image columns.
- Follow claim with proof.
- Use section rules and broad tonal fields instead of nested containers.
- Use the current page family for services, industries, platforms, and methodologies; do not turn a route into a bespoke microsite without approval.
- Preserve CMS authority, market/locale behavior, canonical routes, and protected page content.

### 13.2 Methodology pages

- Use the shared `MethodPageHero`-style asymmetrical composition.
- Keep copy and artwork in independent columns.
- Keep the immediate decision and output visible.
- Put detailed relationships in one optional disclosure where appropriate.
- Preserve matrix semantics and keyboard operation.
- IDAO and Agent Authority are protected references.
- The rejected floating frosted hero panel, nested bordered cards, and tiny technical labels are obsolete.

### 13.3 Presentations and display formats

- Use the approved 16:9 slide system and template families.
- Compose one decision or argument per slide.
- Use image-led covers, light editorial content slides, bounded dark chapter dividers, architecture layouts, direct-label charts, and decisive closing actions.
- Do not treat every slide as a card grid. Equal boxes are valid only for a true equal-priority comparison.
- Keep diagrams editable when reuse is required.
- Put export-critical font values and fallbacks on the slide root preserved by conversion.
- Export and render representative PPTX slides through a presentation engine before release.
- Check clipping, text reflow, overlap, font substitution, hierarchy, and image quality.

### 13.4 Social and profile assets

- LinkedIn post master: `1080 × 1350`, `4:5`.
- LinkedIn profile header: `1584 × 396`.
- Header lower-left safe area: reserve `430 × 146px` for the profile-photo overlay; place no critical copy there.
- The image carries the atmosphere; copy is sparse, intentional, and editable in the SVG master.
- Keep the Cognirise mark and approved copy.
- SVG masters must be self-contained with embedded imagery; do not depend on local file paths.
- Supply a visually verified publish-ready PNG beside each editable SVG.
- Dark social frames are a bounded channel treatment, not the universal canvas.

### 13.5 Asset libraries and galleries

- A repeatable grid is semantically appropriate.
- Provide search/filter controls only when the collection size warrants them.
- Use real buttons for previews and real download links for files.
- Modal preview returns focus to its trigger.
- Show titles, category, source mapping, rights/use notes, and meaningful alt text.
- Preserve original masters; do not silently recompress.

### 13.6 Architecture, data, and interactive visual tools

- Start with the user’s question or decision.
- Preserve the connected system in the main view.
- Use direct manipulation and progressive disclosure without hiding the overview.
- Keep native scrolling and keyboard-operable controls.
- Linearize supporting detail on mobile.
- Use bespoke spatial representations for domain content; do not default to pale cards, steppers, accordions, floating panels, or a generic dashboard.

## 14. Production and asset standards

### 14.1 Raster assets

- Use original full-resolution approved masters.
- Keep source lineage, rights, review state, alt text, intended use, and focal point.
- Generate responsive delivery formats without overwriting the master.
- Use explicit dimensions to prevent layout shift.
- Inspect at 100% and at final crop.
- Reject accidental text, malformed geometry, clipped focal objects, visible generation artifacts, and unsupported client implications.

### 14.2 SVG assets

- Keep intentional text editable where the master is intended for editing.
- Embed linked raster imagery for self-contained distribution.
- Preserve viewBox, aspect ratio, mark clear space, and safe areas.
- Confirm fonts actually render; an embedded font declaration that fails silently is not acceptable.
- Compare the SVG and PNG visually before handoff.

### 14.3 Slides

- Keep the slide root self-contained for typography and color variables.
- Use Office-safe fallbacks.
- Keep live text and editable vector shapes when editability is required.
- Do not flatten reusable diagrams solely to match the browser preview.
- Validate in the exported format, not only the web viewer.

### 14.4 Web

- Use existing shared tokens/components rather than copying CSS from mockups.
- Use responsive images with explicit size and appropriate lazy loading below the fold.
- Treat LCP, INP, and CLS as design constraints.
- Avoid heavy animation libraries unless the interaction requires them.
- Do not hardcode a new alternate palette or type system into a page.

## 15. Anti-patterns and rejection record

Never reproduce these as Pulse defaults:

- **Generic card grid:** equal pale cards used because the content model was not spatially designed.
- **Floating panel:** frosted or floating copy panel over a hero image.
- **Nested boxes:** panel inside card inside container, especially on methodology pages.
- **Boxed artwork:** a detailed approved blueprint downsampled into a self-contained widget.
- **Pasted slide:** finished presentation chrome inserted into a web page instead of rebuilding native labels and interaction.
- **Detached CTA tile:** navy button plus a separate or inset white arrow square.
- **Decorative Signal Rail:** stripes or gradients that do not represent action, selection, or transfer.
- **Generic tech:** robots, brains, circuits, particles, HUDs, fake dashboards, and neon futurism.
- **Dark default:** broad dark backgrounds used as the main Pulse canvas.
- **Motion spectacle:** infinite breathing, page-wide parallax, repeated cascades, pinned scenes, or scroll hijacking.
- **Motion-gated content:** information visible only after animation or hover.
- **Tiny technical labels:** monospace styling used to make essential diagram copy look sophisticated but unreadable.
- **Empty stepper:** numbered stages without meaningful relationships, decisions, outcomes, or evidence.
- **Accordion replacement:** repeated disclosure rows used where one connected system should be visible.
- **Unverified claim:** placeholder metrics, unsupported attribution, or imagery presented as client evidence.

## 16. Extending Pulse

Before adding a new pattern:

1. Identify the content relationship and user decision.
2. Check whether an approved pattern already expresses it.
3. Choose a light editorial field by default.
4. Define what the gradient means.
5. Define keyboard, touch, focus, reduced-motion, and responsive behavior before adding animation.
6. Use the core type and color system.
7. Preserve protected names, content, architecture, and publication boundaries.
8. Label the proposal as a channel adaptation until it is explicitly approved.
9. Record a later approval or rejection so it can override old examples without ambiguity.

A new pattern is justified when it makes a real relationship clearer. Visual novelty alone is not justification.

## 17. Creation checklist

### Strategy and content

- [ ] Name the audience, decision, and intended outcome.
- [ ] Classify source material as universal, channel-specific, protected, or obsolete.
- [ ] Confirm official names, route, order, market, locale, and publication authority.
- [ ] Replace generic claims with a mechanism, evidence, or an explicit next step.
- [ ] Use a specific CTA that states the exchange or destination.

### Visual system

- [ ] Start with the light Pulse canvas.
- [ ] Use Comfortaa for display and Inter for body/UI.
- [ ] Use exact shared colors and semantic roles.
- [ ] Keep gradient coverage restrained and meaningful.
- [ ] Use an editorial or spatial layout rather than default cards.
- [ ] Use rules, asymmetry, and spacing before shadows or containers.
- [ ] Keep dark surfaces bounded.

### Imagery and diagrams

- [ ] Use approved full-resolution cinematic raster masters or create within the approved world.
- [ ] Check crop focal points at wide, narrow, and final export sizes.
- [ ] Inspect for accidental text and malformed details at full size.
- [ ] Keep labels native/editable where required.
- [ ] Preserve connected panorama joins and protected architecture.
- [ ] Make diagram direction, selected state, labels, and outcome visible.

### Interaction

- [ ] Use the shared CTA rather than rebuilding it.
- [ ] Define default, hover, focus, active, disabled, loading, success, and error states as applicable.
- [ ] Keep hover and touch outcomes equivalent.
- [ ] Use native semantic controls.
- [ ] Keep browser-native scrolling.
- [ ] Provide immediate reduced-motion content.

### Production

- [ ] Preserve source lineage, usage rights, alt text, and review status.
- [ ] Make distributable SVGs self-contained.
- [ ] Supply and visually compare publish-ready raster exports.
- [ ] Keep reusable slide diagrams editable.
- [ ] Validate the actual final format, not only its authoring preview.

## 18. Release review checklist

### Authority

- [ ] Does a later approval or rejection supersede any reference used?
- [ ] Are protected methodology, architecture, platform identity, claims, and media status unchanged?
- [ ] Is every channel-specific exception clearly bounded?

### Brand

- [ ] Is the artifact recognizably Pulse without relying only on the logo or gradient?
- [ ] Is it light-dominant, editorial, precise, and evidence-led?
- [ ] Does every accent indicate action, transfer, selection, or proof?
- [ ] Are fonts, values, hierarchy, spacing, and CTA anatomy exact?
- [ ] Are generic-tech, floating-panel, nested-card, boxed-artwork, and dark-default treatments absent?

### Content

- [ ] Is the proposition understandable quickly?
- [ ] Does each major claim lead to evidence?
- [ ] Are headings direct, sentence-case, and specific?
- [ ] Are labels readable and terminology canonical?
- [ ] Are CTA labels intent-specific?
- [ ] Are English and Arabic versions reviewed independently with no invented translation?

### Accessibility and behavior

- [ ] Can every control be understood and operated with keyboard and touch?
- [ ] Is focus clearly visible?
- [ ] Is all essential information present without hover or animation?
- [ ] Does reduced motion show the resolved content immediately?
- [ ] Do alt text, labels, live states, sources, units, and errors remain available?
- [ ] Does the artifact hold at narrow widths and 200% text size without overlap or horizontal overflow?

### Media and export

- [ ] Are raster images full-resolution, correctly cropped, text-clean, and artifact-free?
- [ ] Are social safe areas clear?
- [ ] Do SVG and PNG exports match?
- [ ] Does the rendered PPTX preserve fonts, line breaks, editability, and hierarchy?
- [ ] Are final files named, versioned, and traceable to approved masters?

## 19. Minimum implementation context for future agents

When using this file as machine context, apply these constraints first:

1. Pulse is light-dominant: warm off-white canvas, deep navy structure, violet–pink–coral directional energy.
2. Universal typography is Comfortaa display plus Inter body/UI.
3. Use exact shared tokens; do not infer colors from screenshots.
4. Use bespoke editorial and spatial composition; cards only for genuine repeated records or equal comparisons.
5. Use the current integrated rounded CTA with its internal arrow and signal point; no detached arrow tile.
6. Motion is controlled momentum on visible focal elements; native scroll and immediate reduced-motion content are mandatory.
7. Use cinematic architectural raster imagery, not vectors or generic AI motifs; inspect for accidental text.
8. Rebuild labels and interaction natively around approved artwork; never paste or downsample a complete slide into a web widget.
9. Preserve protected methodology, architecture, platform identity, claims, CMS authority, and media review boundaries.
10. Later explicit approval or rejection overrides earlier mockups and strategy documents.
