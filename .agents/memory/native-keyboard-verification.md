---
name: Native keyboard verification
description: Distinguish incomplete synthetic keyboard events from broken accessible controls.
---
Keyboard verification must reproduce the browser's native character semantics, not only a key name and virtual key code.

**Why:** Headless Chromium accepted focus and arrow navigation but did not activate native buttons with an Enter event lacking its carriage-return text. This falsely implicated working UI controls.

**How to apply:** When diagnosing a native-control keyboard failure, inspect the synthetic event sequence before adding custom keyboard handlers. Keep real native buttons and verify that the event driver includes Enter's character input.

Headless CDP must give the target page browser focus before using DOM focus to verify React focus-driven menus.

**Why:** An unfocused target changed `document.activeElement` without opening a working focus-driven submenu; bringing the page forward and enabling focus emulation resolved the false failure.

**How to apply:** Establish page focus in the driver before treating a missing focus interaction as a product regression.