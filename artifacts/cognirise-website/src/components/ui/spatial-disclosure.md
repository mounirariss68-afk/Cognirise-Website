# SpatialDisclosure

A reusable accessible spatial-disclosure system for Cognirise. It manages accordion/tab behaviors where a user can hover to preview from the balanced collapsed state, but a click/tap/keyboard selection provides a persistent selection that outranks hover.

## State Model
- **Collapsed/Compact:** All panels are hidden or in their compact fallback representation.
- **Pointer/Keyboard Preview:** Hovering or focusing an editorial trigger temporarily reallocates its visual space (`previewIndex`) while the system is balanced and collapsed. It does not expose the supporting region or change `aria-expanded`.
- **Service preview handoff:** The three-service selector opts into `previewOverridesSelection` and `previewExpands`. Hover/focus therefore opens exactly one preview at a time and synchronizes its panel, affordance, focusability, and `aria-expanded`; leaving the component restores any deliberate click selection.
- **Persistent Selected/Expanded:** Clicking or hitting Enter/Space explicitly pins a panel open (`selectedIndex`). That deliberate selection owns the visible and semantic panel until it is collapsed or another item is selected.

## Motion Grammar (Cognirise Pulse)
- **Signal:** The initial focus or hover interaction clearly identifies the target.
- **Transfer:** Spatial elements reshape smoothly to accommodate the content.
- **Reveal:** Panel content is progressively shown without jarring layout shifts.
- **Resolution:** The final layout settles firmly into its expanded state.

## Implementation Guidelines
- **Modes:** 
  - `mode="editorial"` for service panels with roving focus, visual preview, and button/region disclosure semantics.
  - `mode="disclosure"` for FAQ/Work Proof/Platforms where sections stack (conventional `tabIndex={0}`, sets `aria-expanded`).
- **Preview:** Tab mode previews by default. Conventional disclosures only preview when the adoption point opts in with `preview`; FAQ stays click/tap/keyboard-only.
- **Boundaries:** Home owns the summary service opt-in; Services Overview owns the full service opt-in; Platforms owns ecosystem groups; Work owns evidence stages; Industries owns active lines; FAQ owns restrained utility disclosure; ArchitectureStage owns only its existing L0/L1/L2 explorer.
- **Baseline rollback:** Remove one boundary's `SpatialDisclosure` wrappers and restore that section's prior local state/static renderer. Do not revert the shared component or another page. Roll back an individual boundary if content becomes harder to compare, focus or scroll context moves unexpectedly, long copy overlaps, or a route/anchor changes.
- **Fallback content:** Panels stay mounted for stable layout and are related to their triggers with instance-scoped IDs; inactive content is `aria-hidden` and inert. Image boxes reserve their layout space and `PulseImage` supplies a labelled fallback when an asset fails.
- **Responsive & Reduced Motion:** Uses Framer Motion's `useReducedMotion`. Nested transition timings must fall to `0` automatically when reduced motion is preferred. Mobile boundaries reflow natively from horizontal to vertical.
- **Image Behavior:** Replaces static `<img>` tags with `PulseImage` for progressive loading, respecting broken asset states and avoiding nested transform bugs during expansion.
- **Progressive categories:** `ProgressiveCategoryDisclosure` renders a curated initial set and one `+N` / `Show fewer` control without staggered pill animation. Adopt only where a real dense taxonomy exists.

## Homepage industry adoption

- Desktop and tablet present the six governed industries as two stable rows of three. Selection reallocates space only inside its row, so the other row remains a balanced comparison and the two neighbouring panels keep their label, title, crop and affordance.
- Narrow mobile keeps the same content order and interaction semantics in a vertical stack; it does not compress three panels horizontally or require a swipe gesture.
- The current visual treatment uses the approved bright cinematic crops directly, with only restrained legibility gradients. It must not restore the former dark colour wash or substitute unrelated imagery during expansion.
- The fifth canonical entry is Public Sector. The former Manufacturing and Government URLs are query-preserving aliases, not additional published industries.
- This adoption remains bounded to the homepage industries renderer. Its recorded baseline is in `evidence/home-industries-spatial-desktop.jpg` and `evidence/home-industries-spatial-mobile.jpg`; the current desktop, mobile and active states are recorded in the corresponding `home-industries-v2-*` and `home-industries-cinematic-active.jpg` evidence.
- A rollback may restore the prior grouping and styles in `Home.tsx` without changing the shared disclosure state model, the six-industry content contract, routes or CMS records. Public Sector publication and retirement of any older Manufacturing document remain explicit editorial actions; the generated inventory is dry-run evidence and does not publish either state.

## Usage

```tsx
import {
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosureTrigger,
  SpatialDisclosurePanel
} from "@/components/ui/spatial-disclosure";

<SpatialDisclosure defaultValue="item-1" mode="disclosure" orientation="vertical" allowCollapse={true}>
  <SpatialDisclosureItem id="item-1" className={({ isActive }) => isActive ? "bg-active" : ""}>
    <SpatialDisclosureTrigger id="item-1">
      Item 1
    </SpatialDisclosureTrigger>
    <SpatialDisclosurePanel id="item-1">
      Content 1
    </SpatialDisclosurePanel>
  </SpatialDisclosureItem>
</SpatialDisclosure>
```