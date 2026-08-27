# STAGING_CHANGE_REQUESTS_3.md

## Joy Plot User Study — Staging QA Change Log, Round 3

This document contains the third round of researcher-requested changes identified during manual QA of the staging application.

### Working rules

- Implement items marked `OPEN`.
- Do not modify the locked experimental configuration, task allocation, answer keys, response timing logic, or source stimulus PNG files unless explicitly stated below.
- Participant-facing terminology must remain consistent across the whole application and canonical copy.
- If implementation reveals a conflict with experimental validity or the locked assets, report it before making a broader change.
- After implementation, run relevant frontend tests and perform manual QA on both training and measured stimuli.

### Status values
- `OPEN` — requested, not yet implemented
- `IN PROGRESS` — implementation started
- `DONE` — implemented and verified
- `HOLD` — intentionally deferred
- `REJECTED` — no longer requested

### Priority values
- `P0` — blocking / invalidates test presentation
- `P1` — important before pilot
- `P2` — usability / presentation improvement
- `P3` — polish / optional

---

## CR3-001 — Prevent page/canvas scrolling while mouse-wheel zooming a map

- **Screen:** Global — every instructional, practice and measured map viewer
- **Status:** DONE
- **Priority:** P1

### Requested change

When the mouse pointer is over a map and the user rotates the mouse wheel, the action must affect **only the map viewer zoom**. At present, wheel zoom also causes the surrounding page/application canvas to move.

### Required behaviour

When the pointer is inside the interactive map area:
- mouse wheel = map zoom only;
- prevent the wheel event from scrolling the surrounding page/canvas;
- keep the map viewer anchored in its current page position;
- preserve max zoom of **200%**;
- preserve click-and-drag pan.

When the pointer is outside the map viewer:
- normal page scrolling continues to work.

### Implementation note

Do **not** globally lock page scrolling. Use local event handling on the map viewer, e.g. an appropriate non-passive wheel listener with `preventDefault()` only while the pointer is over the map.

### Acceptance criteria

1. Wheel input over the map changes map zoom and does not move the surrounding page.
2. Wheel input outside the map scrolls the page normally.
3. Click-drag pan still works.
4. Maximum zoom remains 200%.
5. Existing zoom metrics continue to be recorded for measured trials.
6. No regression in response-time measurement or trial rendering.

---

## CR3-002 — Rename the method consistently to “Bivariate Joy Plot”

- **Screen:** Global participant-facing terminology
- **Status:** DONE
- **Priority:** P1

### Requested change

Replace all participant-facing occurrences of:
- `Joy Plot`
- `joy plot`

with:
- `Bivariate Joy Plot`
- `bivariate joy plot`

respectively, according to sentence capitalization.

### Scope

This includes:
- instruction screen titles;
- explanatory text;
- practice introduction;
- practice headings;
- training feedback;
- method preference wording/options;
- any labels/helper text referring to the method;
- canonical participant-facing copy/configuration.

### Exclusions

Do **not** rename:
- task IDs;
- filenames;
- method codes such as `J`;
- database enum/code values;
- repository folders or experiment configuration identifiers,

unless they are purely participant-facing labels.

### Example

Change:
`I preferred the joy plot.`

to:
`I preferred the bivariate joy plot.`

### Acceptance criteria

A repository search should find no remaining participant-facing use of `Joy Plot` / `joy plot` where the intended method name is the bivariate method.

---

## CR3-003 — Refine the two practice-screen headings

- **Screen:** Practice 1 and Practice 2
- **Status:** DONE
- **Priority:** P2

### Requested change

Replace the em dash with a colon and bold **only the method name**.

### Exact headings

Practice 1:

`Practice 1 of 2: **Bivariate Joy Plot**`

Practice 2:

`Practice 2 of 2: **Bivariate Choropleth Map**`

### Acceptance criteria

1. No em dash (`—`) remains in these two headings.
2. `Practice 1 of 2:` / `Practice 2 of 2:` is regular weight.
3. Only the method name is bold.
4. Both headings remain visually consistent.

---

## CR3-004 — Remove the thin exported black layout frame from choropleth display

- **Screen:** All bivariate choropleth images, including training and measured trials
- **Status:** DONE
- **Priority:** P1

### Background

The choropleth PNGs were exported from GIS with an unintended thin black frame around the outer edge of the layout (approximately 1 pt in the source layout). The frame is visually distracting.

### Required approach

Do **not** edit, overwrite, recompress or regenerate source PNG files.

First inspect the actual choropleth raster files and determine the border thickness in pixels.

Before applying one global rule:
1. verify whether the black frame thickness is consistent across all measured choropleth PNGs;
2. verify the same for the training choropleth;
3. report any exceptions.

If the frame is uniform, remove it **at display time only** using a conservative fixed inset/crop in the choropleth viewer.

Acceptable approaches include:
- a viewer-level clipping wrapper;
- `overflow: hidden` with a precisely measured inset;
- an equivalent non-destructive CSS/rendering solution.

Do not use heuristic/content-aware cropping at every load.

### Critical cautions

- Apply only to **choropleth** images.
- Do not crop Bivariate Joy Plot images.
- Do not alter source files in `stimuli/` or `training/`.
- Crop only the unwanted black outer frame.
- Do not remove any legend, map cell, boundary, label or meaningful whitespace.
- Preserve the visible layout as closely as possible after removing only the frame.

### Acceptance criteria

1. The unwanted black outer frame is no longer visible on displayed choropleths.
2. Source PNG files remain byte-for-byte untouched.
3. No substantive map content or legend is clipped.
4. The same measured inset is used consistently if the frame is confirmed uniform.
5. Training and measured choropleths are manually QA-checked.
6. If border thickness is not uniform, stop and report instead of applying a risky universal crop.

---

## CR3-005 — Refine the Thank You screen and add researcher contact links

- **Screen:** Thank You
- **Status:** DONE
- **Priority:** P2

### Title

Change:
`Thank You`

to:
`Thank You!`

### Remove placeholder

Remove:
`[OPTIONAL FINAL CONTACT / RESEARCH INFORMATION TO BE CONFIRMED]`

### Add contact links

Add a compact minimalist contact row/list below the existing confirmation text.

#### LinkedIn
- **Label:** `LinkedIn`
- **URL:** `https://www.linkedin.com/in/josef-m%C3%BCnzberger-a71a29204/`

#### Email
- **Label:** `josef.munzberger@fsv.cvut.cz`
- **URL:** `mailto:josef.munzberger@fsv.cvut.cz`

#### Academic article / DOI
- **Suggested label:** `Bivariate Joy Plot article`
- **DOI:** `10.1080/00087041.2026.2715285`
- **URL:** `https://doi.org/10.1080/00087041.2026.2715285`

The DOI may not resolve yet but should use the canonical DOI URL.

### Icon requirements

- Use an icon library already included in the project or locally bundled SVG icons.
- Do not add external tracking/CDN dependencies solely for icons.
- LinkedIn icon for LinkedIn.
- Mail/envelope icon for email.
- Document/article/file-text/book-open style icon for the article.
- Provide accessible labels / `aria-label`s.
- External links should open safely in a new tab where appropriate (`rel="noopener noreferrer"`).

### Visual requirement

Keep the contact area minimalist and subordinate to the Thank You message.

### Acceptance criteria

1. Heading reads `Thank You!`.
2. Placeholder is gone.
3. All three contact items are visible.
4. Email uses `mailto:`.
5. LinkedIn points to the supplied profile.
6. DOI uses `https://doi.org/10.1080/00087041.2026.2715285`.
7. Icons are local/existing and accessible.
8. Styling remains consistent with the minimalist interface.

---

## Regression / Technical QA

After implementation, manually verify:

### Map interaction
- T0 Bivariate Joy Plot: wheel zoom does not scroll the page.
- T0 Bivariate Choropleth Map: wheel zoom does not scroll the page.
- One measured J stimulus: zoom/pan and metrics work.
- One measured CH stimulus: zoom/pan, frame removal and metrics work.

### Terminology
Check the complete participant flow for consistent use of:
- `Bivariate Joy Plot`
- `bivariate joy plot`

and ensure no unintended renaming of internal codes/filenames occurred.

### Choropleth frame removal
Inspect at minimum:
- `training/T0a01_CH.png`
- one CZ choropleth measured stimulus
- one FR choropleth measured stimulus

at 100%, 150% and 200% zoom.

Confirm that only the unwanted outer black frame is removed.

### Thank You
Verify all links and accessible labels.

---

## Orchestrator implementation note

When these changes are complete:

1. update each item above from `OPEN` to `DONE` only after acceptance criteria are verified;
2. run the relevant frontend test suite and production build;
3. report any new/changed test coverage;
4. push the reviewed implementation to `develop`;
5. send the researcher a concise Telegram report with commit hash and QA result.

---

## QA result

- The choropleth raster audit covered `training/T0a01_CH.png` and all 18
  measured `*_CH.png` files. The black frame is consistently 2 px at the top,
  2 px on each side, and 1 px at the bottom. T0/T1/T2 exports contain one
  additional blank row after the bottom line (2481 px high); T3 ends on the
  line (2480 px high). A conservative fixed 2 px display inset on every side
  removes the frame and trailing blank row without touching source files.
- Viewer regression coverage verifies locally cancelled wheel events, normal
  wheel behaviour outside the viewer, 200% cap, drag pan, zoom callbacks and
  the choropleth-only crop class. Existing RT arming code was not changed.
- Training Joy/CH and representative measured J/CH paths remain covered at
  100%, 150%, 200% and return to centred 100%. CZ and FR choropleth files were
  included in the raster audit.
- Participant-facing source and canonical copy were searched for obsolete
  standalone `Joy Plot` / `joy plot` terminology. Internal `J` codes,
  filenames and locked experiment configuration were not renamed.
- Thank You regression coverage verifies the heading, placeholder removal,
  exact link targets and accessible link labels.
