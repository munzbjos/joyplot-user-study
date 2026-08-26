# STAGING_CHANGE_REQUESTS_4.md

## Joy Plot User Study — Staging QA Change Log, Round 4

This document contains the fourth round of researcher-requested changes for the staging application.

### Working rules

- Implement all items marked `OPEN`.
- Do not modify locked experimental stimuli, V1–V6 allocation, task wording, answer keys, or response-time logic except where explicitly stated.
- Preserve identical interaction behaviour for Bivariate Joy Plot and Bivariate Choropleth Map.
- If implementation changes the meaning of stored interaction metrics, update documentation and migrations/tests accordingly.
- After implementation, run relevant frontend/backend tests and manual QA.

---

## CR4-001 — Replace stepped zoom with smooth continuous cursor-centred zoom

- **Screen:** Global — all instructional, practice, and measured map viewers
- **Status:** DONE
- **Priority:** P1

### Requested change

Replace the current stepped/discrete zoom behaviour with a smooth continuous zoom interaction.

### Required behaviour

- continuous smooth zoom rather than predefined zoom steps;
- zoom centred on the current mouse cursor position where technically feasible;
- natural mouse-wheel and trackpad zoom;
- preserve click-and-drag pan;
- minimum zoom = initial complete-map fit view (`100%`);
- maximum zoom = **250%**;
- users cannot zoom below the initial complete-map fit state;
- identical behaviour for Bivariate Joy Plot and Bivariate Choropleth Map;
- wheel interaction over the map must affect only the viewer and must not scroll the surrounding page/canvas.

### Zoom sensitivity

Use restrained zoom sensitivity. The interaction should feel continuous and controllable rather than jumping aggressively. Avoid long inertial/easing animations after input stops.

### Response-time measurement

Keep the existing RT logic unchanged:

- RT starts only after the full image is decoded and rendered in the initial `100%` fit state;
- zooming and panning do not pause RT;
- the new zoom implementation must not alter trial onset measurement.

---

## CR4-002 — Preserve the agreed zoom metric definitions

- **Screen:** Measured trials / backend data model
- **Status:** DONE
- **Priority:** P1

### `zoom_used`

Participant changed zoom above the initial 100% fit state at least once during the measured trial.

Store as boolean.

### `zoom_count`

Number of distinct zoom gestures during the measured trial.

For wheel/trackpad input:

- consecutive zoom events separated by less than **500 ms** belong to one gesture;
- a new event after a gap of 500 ms or more starts a new gesture.

Do not count every raw wheel event separately.

### `zoom_duration_ms`

Total cumulative time during which the map is displayed above 100% zoom.

Requirements:

- start accumulating when zoom becomes `> 100%`;
- stop when zoom returns to `100%` or the trial is submitted;
- if zoomed repeatedly, sum all above-100% intervals;
- do not pause RT.

### Pan

Do not store pan as a separate metric.

---

## CR4-003 — Add `max_zoom_pct`

- **Screen:** Measured trials / backend database / export
- **Status:** DONE
- **Priority:** P1

### Definition

Highest zoom level reached during the measured trial, expressed as a percentage of the initial 100% fit state.

Examples:

```text
100
137
184
250
```

### Requirements

- initialise to `100`;
- update whenever current zoom exceeds the previous maximum;
- maximum possible value = `250`;
- store with numeric precision consistent with the viewer implementation;
- add to the trial-response database model;
- include in CSV/research export;
- document the new metric;
- use a database migration if migrations are already used.

`max_zoom_pct` is a supplementary interaction/usability variable and must not affect RT or correctness logic.

---

## Acceptance criteria

1. Zoom is continuous rather than stepped.
2. Zoom follows pointer position where technically feasible.
3. Zoom range is 100–250%.
4. Click-drag pan still works.
5. Wheel zoom does not scroll the surrounding page.
6. Both visualisation methods use identical viewer behaviour.
7. `zoom_used` follows the `>100% at least once` definition.
8. `zoom_count` follows the 500 ms gesture-grouping rule.
9. `zoom_duration_ms` is cumulative time above 100%.
10. `max_zoom_pct` is stored and exported.
11. RT onset/measurement is unchanged.
12. Refresh/recovery remains functional.
13. Relevant frontend/backend tests and production build pass.

---

## Manual QA

Test at least:

- T0 Bivariate Joy Plot;
- T0 Bivariate Choropleth Map;
- one measured Bivariate Joy Plot stimulus;
- one measured Bivariate Choropleth stimulus.

For each verify smooth zoom, cursor-centred behaviour, 100% minimum, 250% maximum, pan, no page scroll during wheel zoom, and correct return to complete-map view at 100%.

Example metric QA interaction:

- zoom 100% → ~160%;
- return to 100%;
- pause >500 ms;
- zoom again to ~220%;
- submit.

Expected conceptually:

```text
zoom_used = true
zoom_count = 2
zoom_duration_ms > 0
max_zoom_pct ≈ 220
```

---

## Orchestrator implementation note

When complete:

1. mark items `DONE` only after verification;
2. run relevant frontend/backend tests;
3. run production build;
4. verify DB migration/export for `max_zoom_pct`;
5. push reviewed changes to `develop`;
6. send the researcher a concise Telegram report with:
   - commit hash,
   - test results,
   - final zoom range,
   - confirmation of metric definitions,
   - one sample stored trial showing the four zoom metrics.

---

## QA result

- T0 Bivariate Joy Plot, T0 Bivariate Choropleth Map, measured J
  `T1a01_CZP1_J.png`, and measured CH `T1a01_CZP1_CH.png` were exercised by
  the viewer regression suite through continuous intermediate zoom values,
  cursor anchoring, 100% minimum, 250% maximum, pan, locally cancelled wheel
  scrolling, and return to the centred complete-map view.
- The viewer uses a restrained exponential wheel/trackpad response with no
  inertial animation. Both methods use the same component. RT arming code was
  unchanged.
- Gesture tests cover the strict 500 ms grouping boundary. Duration callbacks
  cover entry above and return to 100%; an open interval is included at submit.
  Refresh recovery supplies 100 for legacy pending responses without the new
  field.
- Alembic migration `0003_trial_max_zoom` passed against a clean PostgreSQL
  database and the staging database. API validation, model persistence, CSV
  export, and the 100–250 range are covered by backend tests.
- Staging sample trial `c8de4e21-c8ca-449e-b6b0-f0fe19081757`, position 1:
  `zoom_used=true`, `zoom_count=2`, `zoom_duration_ms=845.3`,
  `max_zoom_pct=219.7`. The database row and CSV export agree.
