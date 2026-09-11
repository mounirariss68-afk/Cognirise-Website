---
name: Carousel input affordances
description: Durable interaction rule for tall, media-led horizontal rails.
---

Keep Previous and Next controls visible before tall carousel content, and prevent native image dragging from competing with the carousel gesture. Support trackpad and Shift+wheel as enhancements, not as the only way to advance.

**Why:** A rail can pass scripted button and pointer checks while still feeling immovable to a real visitor when controls sit below a tall card or the browser starts dragging the image itself. Chromium protocol automation may also fail to emit DOM horizontal-wheel events, so that simulation is not authoritative.

**How to apply:** Place controls above tall media cards, disable native dragging on carousel images, preserve vertical-dominant page scrolling, and validate both direct artwork drag and control activation. Treat real-device horizontal scrolling as an enhancement that needs user/device confirmation.

Treat a horizontal swipe and its momentum as one navigation action, not a new action on every wheel event.

**Why:** Trackpads emit many small events for a single gesture; per-event navigation either misses small swipes or advances through multiple cards unexpectedly.

**How to apply:** Preserve a gesture boundary when changing wheel input, while retaining ordinary vertical page scrolling and alternative button and keyboard navigation.