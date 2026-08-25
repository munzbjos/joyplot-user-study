# STAGING_CHANGE_REQUESTS_2.md

## Joy Plot User Study — Staging QA Change Log, Round 2

This document contains the second round of researcher-requested changes after manual QA of the staging application.

### Working rules

- Implement items marked `OPEN`.
- Do not modify locked experimental stimuli or the V1–V6 configuration.
- If a requested change affects experimental validity, response-time measurement, or the supported device/viewport policy, flag it before making a broader design change.
- All experimental and training maps are now confirmed to use **landscape A4 orientation**.
- Do not add separate portrait-specific rendering logic.

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

## Global Changes

### CR2-001 — Enlarge the application canvas and display all maps as full landscape A4 layouts

- **Screen:** Global — Joy instructions, Choropleth instructions, both practice screens, and all measured trials
- **Status:** OPEN
- **Priority:** P0

#### Requested change

The current application canvas and/or inner image frame make the maps appear too small.

All maps used by the study are **landscape A4 layouts**. The viewer should therefore be designed around one consistent landscape format rather than separate portrait/landscape cases.

The complete map must always be shown:
- at its full landscape aspect ratio;
- without cropping;
- without clipping by an inner frame;
- including the complete legend and all map marginal elements.

#### Target logical map size

Treat the original A4 landscape layout as the maximum initial display size.

At standard CSS reference resolution this corresponds approximately to:

```text
A4 landscape
297 × 210 mm
≈ 1123 × 794 CSS px
```

This is a **logical web-display target**, not a claim that CSS millimetres equal physical millimetres on every monitor.

The map should be displayed at up to approximately:

```text
width: 1123px
height: auto
aspect-ratio: 297 / 210
```

Do not stretch the raster and do not alter its native aspect ratio.

#### Canvas / layout requirement

Widen the main application content area sufficiently so that a landscape A4 map can be displayed near its logical full size on a normal desktop monitor.

Recommended starting point:

```text
main content max-width: approximately 1360–1440px
```

The image viewer itself must not introduce a second unnecessarily narrow `max-width`.

Reduce non-essential horizontal padding around the map.

The question and answer controls may use a narrower readable text column if desired, but the **map area must be allowed to use the wider canvas**.

#### Vertical behaviour

Do **not** place the map inside a fixed-height container that crops or scales it down merely to keep the complete page within one browser viewport.

It is acceptable for the web page to require normal vertical scrolling if necessary.

The priority is:
1. preserve the complete A4 landscape map;
2. make the legend visible as part of the image;
3. display the map as large as reasonably possible.

#### Responsive fallback

If the browser viewport is genuinely too narrow to show the target ~1123 px map width plus minimal gutters, scale the whole image down proportionally.

Never:
- crop;
- distort;
- hide the legend;
- or create horizontal clipping.

Do not change the existing minimum-viewport eligibility threshold solely as part of this request. If the current 1100 CSS px threshold prevents the desired presentation in practice, report the measured behaviour to the researcher before proposing a new threshold.

#### Pan / zoom behaviour

Keep the interaction introduced in the first QA round:

- mouse wheel over the image = zoom;
- click-and-drag = pan;
- maximum zoom = **200%**;
- same behaviour for Joy and Choropleth;
- same viewer component for instructions, practice, and measured trials.

Define **100% zoom** as the initial complete-map display size calculated by the viewer.

When zooming above 100%, panning may move the enlarged map inside the viewer.

At 100%, the entire map should be visible and centred.

#### Frame styling

The image may remain inside a subtle visual frame if desired, but:
- the frame must not materially reduce map width;
- it must not crop the image;
- internal padding should be minimal;
- the frame should adapt to the map's landscape aspect ratio.

#### Acceptance criteria

1. All Joy, Choropleth, T0 and measured PNGs are treated as landscape images.
2. No portrait-specific viewer branch remains necessary.
3. The complete PNG is visible at initial 100% view.
4. No map is cropped or distorted.
5. The legend is visible as part of the initial complete image.
6. On a sufficiently wide desktop viewport, the map can reach approximately 1123 px width.
7. The main app canvas is wide enough that the image frame is no longer the limiting factor.
8. Page scrolling is allowed rather than shrinking/cropping the map because of viewport height.
9. Wheel zoom, drag pan and 200% max zoom continue to work.
10. Existing measured-trial zoom metrics continue to be recorded.
11. Relevant frontend tests are updated and pass.

#### Researcher note

The intended visual size follows the original **A4 landscape composition** of the exported experimental maps. The problem to solve is primarily the current narrow application canvas/image frame, not the source PNG files.

---

## Screen-by-Screen Changes

_No additional screen-specific requests in this round yet._

---

## Regression / Technical QA

After implementation, manually verify at minimum:

- one T0 Joy image;
- one T0 Choropleth image;
- one measured Joy stimulus;
- one measured Choropleth stimulus;

at:
- 100% initial view;
- 150% zoom;
- 200% zoom.

Verify that:
- the map stays sharp enough for the source raster;
- no legend or edge is clipped;
- drag-pan works correctly after zoom;
- returning to 100% restores the whole centred map;
- measured RT logic is unaffected by the viewer resize/refactor.
