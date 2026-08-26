# STAGING_CHANGE_REQUESTS_5.md

## Joy Plot User Study — Staging QA Change Log, Round 5

This document contains the fifth round of researcher-requested changes identified during manual QA of the staging application.

### Working rules

- Implement all items marked `OPEN`.
- Do not modify locked experimental stimuli, V1–V6 allocation, task wording, answer keys, or response-time logic except where explicitly stated.
- Preserve accessibility: visual cleanup must not remove keyboard focus indication entirely.
- Preserve identical map interaction behaviour for Bivariate Joy Plot and Bivariate Choropleth Map.
- After implementation, run relevant frontend tests and manual QA.

---

## CR5-001 — Remove the oversized focus/bounding-box artefact around the age field

- **Screen:** About You / Participant Information
- **Status:** OPEN
- **Priority:** P2

### Background

When the age input receives focus, a large orange rectangular outline appears around the whole age-question area rather than only around the actual input control.

This is visually distracting and appears as an unintended focus/bounding-box artefact.

### Requested change

Remove the large outer focus/bounding box around the age-question container.

Keep a clear but subtle focus state on the actual age input itself.

### Accessibility requirement

Do **not** remove keyboard focus indication entirely.

Preferred behaviour:

- no orange outline around the full question/container;
- the numeric input itself receives a restrained focus ring/border;
- mouse and keyboard focus remain visually identifiable;
- focus styling is consistent with the minimalist UI.

### Acceptance criteria

1. Clicking into the age input no longer draws a large rectangular outline around the whole question area.
2. The input itself still has a visible accessible focus state.
3. Keyboard tab navigation still makes the focused control obvious.
4. No layout shift occurs when focus is applied.
5. The change does not affect validation or the under-18 Continue-button rule.

---

## CR5-002 — Audit and, if necessary, implement genuinely smooth continuous map zoom

- **Screen:** Global — all instructional, practice, and measured map viewers
- **Status:** OPEN
- **Priority:** P1

### Background

The current zoom behaviour still feels perceptibly stepped/jumpy during manual QA, despite the previous request for continuous zoom.

### Required first step: implementation audit

Before changing behaviour, inspect the current viewer implementation and determine whether zoom is actually continuous or still quantised internally.

Specifically check for:

- predefined scale levels;
- rounding/quantisation of scale values;
- fixed wheel-step increments that are visually too large;
- CSS transitions that create discrete jumps;
- a library configuration that snaps to zoom levels;
- throttling/debouncing that makes continuous wheel input appear stepped.

Report the current mechanism briefly in the implementation summary.

### Required final behaviour

If any stepping/quantisation is present, replace it with genuinely smooth continuous scaling.

Requirements:

- continuous scale values across the full **100–250%** range;
- restrained wheel/trackpad sensitivity;
- cursor-centred zoom where technically feasible;
- no snapping to predefined zoom levels;
- no coarse rounding such as 100 → 125 → 150 → 175 → 200;
- click-drag pan preserved;
- wheel input over the map must not scroll the page;
- same behaviour for Bivariate Joy Plot and Bivariate Choropleth Map.

### Smoothness expectation

A sequence of small wheel/trackpad inputs should produce many intermediate scale values rather than a small set of fixed zoom states.

The interaction should feel similar to a modern web-map/image viewer rather than a slideshow-style stepped zoom.

Do not add long inertial animations that continue after input stops.

### Metrics and timing

Preserve the agreed definitions:

- `zoom_used`
- `zoom_count`
- `zoom_duration_ms`
- `max_zoom_pct`

Do not change RT onset or RT measurement.

`max_zoom_pct` should reflect the actual continuous zoom value reached.

### Acceptance criteria

1. Code audit confirms whether the previous implementation was continuous or quantised.
2. Final viewer has no predefined zoom-level snapping.
3. Small wheel movements produce correspondingly small scale changes.
4. Zoom remains bounded to 100–250%.
5. Cursor-centred behaviour remains functional where supported.
6. Pan remains functional.
7. Page does not scroll during map zoom.
8. Existing zoom metrics remain valid and are still stored/exported.
9. Response-time logic remains unchanged.
10. Manual QA is performed on both T0 maps and at least one measured stimulus of each method.

---

## CR5-003 — Add a softer transition into the final preference question

- **Screen:** Method Preference / penultimate participant screen
- **Status:** OPEN
- **Priority:** P2

### Wording

Use:

**Almost done!**

**One last question about your overall preference.**

Then retain the existing preference question:

**Which visualisation method did you prefer overall?**

Response options remain unchanged:

- I preferred the bivariate joy plot.
- I preferred the bivariate choropleth map.
- I had no preference.

### Rationale

Use `Almost done!` rather than evaluative wording such as `Good job!`.

The measured test does not provide correctness feedback, so the transition should not imply that the participant performed well or answered correctly.

### Visual requirement

- `Almost done!` may act as the screen heading.
- `One last question about your overall preference.` should be short supporting copy.
- The actual preference question should remain visually clear and distinct.
- Keep the screen minimalist.

### Acceptance criteria

1. Preference screen begins with `Almost done!`.
2. Supporting text reads `One last question about your overall preference.`
3. Existing preference question and three response options remain unchanged except for the already-approved `bivariate joy plot` terminology.
4. No performance/correctness feedback is implied.
5. Preference is still recorded only after all six measured trials are complete.

---

## Regression / Manual QA

After implementation verify:

### About You
- click age input with mouse;
- tab into age input with keyboard;
- confirm only the input receives a restrained focus state;
- confirm under-18 validation still works.

### Zoom
Test:
- T0 Bivariate Joy Plot;
- T0 Bivariate Choropleth Map;
- one measured Bivariate Joy Plot;
- one measured Bivariate Choropleth Map.

Confirm:
- smooth continuous scaling;
- intermediate scale values;
- 100–250% bounds;
- cursor-centred behaviour;
- pan;
- no page scroll while zooming;
- valid stored zoom metrics.

### Preference
Complete all six measured trials and confirm:
- `Almost done!`;
- supporting sentence;
- preference question;
- all three options;
- correct preference storage.

---

## Orchestrator implementation note

When complete:

1. mark items `DONE` only after acceptance criteria are verified;
2. run relevant frontend tests and production build;
3. verify zoom metric storage/export after the viewer audit/change;
4. push reviewed changes to `develop`;
5. send the researcher a concise Telegram report including:
   - commit hash;
   - test/build result;
   - explanation of what caused the previous zoom to feel stepped;
   - confirmation of the final focus styling;
   - confirmation of the final preference-screen wording.
