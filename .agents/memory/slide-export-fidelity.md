---
name: Slide export fidelity
description: Non-obvious PowerPoint conversion behavior and the required verification boundary for slide artifacts.
---

PowerPoint conversion can isolate each slide's component root from its outer artifact wrappers. Typography variables and font fallbacks inherited only from those wrappers may therefore disappear during conversion.

**Why:** Browser previews can remain correct while the exported deck substitutes fonts or changes text geometry. XML point sizes alone are not a reliable visual comparison because browser pixels and presentation points use different mappings.

**How to apply:** Put export-critical typography values on the root that the converter preserves, keep safe Office font substitutions scoped to export, and render representative PPTX slides through a presentation engine to check clipping, reflow, overlap, and hierarchy.