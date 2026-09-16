# Guardrails Redesign Browser Tests

The script `scripts/guardrails-redesign.browser-test.mjs` verifies the redesigned public Guardrails Framework page in Chromium.

It validates the following requirements:
- **Public Delivery:** The page successfully renders the Set, Prove & Hold methodology without placeholder content or unpublished blocks.
- **Section Navigation:** The sticky section navigator highlights Overview, Enforcement, and Lifecycle as the document scrolls. Direct Set, Prove, and Hold hashes remain selectable inside the shared side-by-side overview row.
- **Action Map:** 12 actions are rendered in the proper Set, Prove, and Hold configurations with correct keyboard navigation (Arrow keys, Home, End) and singular selection detail updates.
- **Enforcement Layers:** 4 layers are rendered as a vertical ladder, with accessible keyboard tab-style navigation and reactive scenario data flow details.
- **Lifecycle Matrix:** 12 matrix cells are rendered statically with no interactive controls or duplicated detail blocks, representing the unified model efficiently without nested UI.
- **References Absent:** The legacy "What this is built from" references panel has been completely removed.
- **Accessibility:** Reduced motion is respected natively across all elements (no active animations trigger during standard evaluation).
- **Responsive & Reflow:** The page scales smoothly at 1440, 768, and 390 viewports without introducing horizontal scroll overflow, and correctly supports 200% text enlargement without clipping, breaking structure, or triggering horizontal overflow.