---
name: Architecture drill-down hit geometry
description: Why CogniOS drill-down controls must not move between appearing and pointer activation.
---

Keep the CogniOS architecture planes and visible close controls on stationary, two-dimensional hit geometry throughout drill-down transitions. Selection can use color, borders, shadows, and opacity, but not perspective, translated surfaces, animated height, or delayed open-state refocusing that moves a target after it appears.

**Why:** Real-browser pointer testing showed that decorative 3D transforms, positional entrance motion, and delayed focus scrolling could make the painted control diverge from the browser's actual hit target during rapid interaction.

**How to apply:** When changing architecture-stage motion, verify the actual rendered X controls with physical pointer/touch events during and after transitions. Focus effects should restore the originating layer or component only after close, not refocus controls on open.