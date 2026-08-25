# STAGING_CHANGE_REQUESTS.md

## Joy Plot User Study — Staging QA Change Log

This document collects researcher-requested changes identified during manual QA of the staging application.

### Working rules

- The researcher may send change requests screen-by-screen in conversational form.
- Each request is recorded here in a structured way.
- Existing locked experimental assets/configuration must not be changed unless explicitly requested.
- Participant-facing wording should remain consistent with `docs/PARTICIPANT_COPY.md` unless a wording change is explicitly approved here.
- If a requested change affects experimental validity, response-time measurement, version allocation, data storage, or privacy, flag it explicitly before implementation.
- Orchestrator should implement changes only after reviewing the latest version of this file.

### Status values

- `OPEN` — requested, not yet implemented
- `IN PROGRESS` — implementation started
- `DONE` — implemented and verified
- `HOLD` — intentionally deferred
- `REJECTED` — no longer requested

### Priority values

- `P0` — blocking / invalidates test
- `P1` — important before pilot
- `P2` — usability / presentation improvement
- `P3` — polish / optional

---

## Global Changes

### CR-012 — Standardise all map/stimulus rendering and interaction

- **Screen:** Global — all instructional, practice and measured map images
- **Status:** OPEN
- **Priority:** P0
- **Requested change:** Use one consistent image-viewer component for all PNG maps.
- **Exact wording / UI requirement:**
  - preserve every PNG's original aspect ratio and full layout;
  - never crop or distort the PNG;
  - the complete image, including its legend, must be visible in the initial view;
  - measured stimuli are portrait; T0 stimuli are landscape;
  - zoom by mouse wheel when the pointer is over the image;
  - pan by click-and-drag;
  - maximum zoom = 200%;
  - identical interaction for Joy and Choropleth.
- **Reason / researcher note:** The complete cartographic layout and legend are experimentally relevant and must be immediately visible. Participants should be able to inspect detail without switching to a separate viewer mode.
- **Acceptance criteria:**
  1. Initial view shows the entire PNG with no clipping.
  2. Aspect ratio is preserved.
  3. Legend is visible without zoom.
  4. Mouse-wheel zoom works anywhere over the image.
  5. Click-drag pan works when zoomed.
  6. Zoom cannot exceed 200%.
  7. The same component/interaction is used in instructions, practice, and measured trials.
  8. Existing zoom metrics remain logged for measured trials.
- **Dependencies / cautions:** Interpret `original dimensions` as preserving the complete original image/layout and native aspect ratio while fitting the whole image into the available desktop viewport initially. Do not force intrinsic pixel dimensions if that causes overflow or hides the legend.
- **Implementation notes:** A stable lightweight pan/zoom library is acceptable.


---

## Screen-by-Screen Changes

### Screen 01 — Welcome / Consent

#### CR-001 — Simplify Welcome content
- **Status:** OPEN
- **Priority:** P1
- **Requested change:** Remove these sections completely:
  - `What data will be collected?`
  - `Risks and benefits`
  - `Ethics / data protection information`
- **Acceptance criteria:** None of the three headings or their body text is rendered.
- **Caution:** Keep the content restorable in case institutional requirements later require it.

#### CR-002 — Remove introductory thank-you sentence
- **Status:** OPEN
- **Priority:** P2
- **Requested change:** Remove `Thank you for taking part in this study.`

#### CR-003 — Adjust Welcome title and wrapping
- **Status:** OPEN
- **Priority:** P2
- **Requested change:** Change `Visualisation of Spatial Data — User Study` to `Visualisation of Spatial Data: User Study`.
- **Acceptance criteria:** Prefer one line; if wrapping is necessary, keep `User Study` together on the second line.

#### CR-004 — Keep consent provisionally
- **Status:** HOLD
- **Priority:** P1
- **Requested change:** Keep the current consent checkbox and flow for now.
- **Researcher note:** The necessity/extent of formal consent for this Czech academic user study is still under consideration.
- **Caution:** Do not remove server-side consent support yet.


### Screen 02 — Participant Information

#### CR-005 — Disable Continue for age below 18
- **Status:** OPEN
- **Priority:** P1
- **Requested change:** If entered age is below 18, the `Continue` button must remain disabled.
- **Acceptance criteria:** Client prevents continuation for age < 18; backend rejects an under-18 value if submitted directly.

#### CR-006 — Gender terminology under review
- **Status:** HOLD
- **Priority:** P3
- **Requested change:** No change yet. Researcher is considering `Male / Female` instead of `Man / Woman`.


### Screen 03 — Instructions Introduction

#### CR-007 — Add map interaction instructions
- **Status:** OPEN
- **Priority:** P1
- **Requested change:** Add a short subsection such as `How to interact with maps`.
- **Exact wording / UI requirement:** Explain concisely that participants can:
  - move the pointer over the image;
  - use the mouse wheel to zoom;
  - click and drag to pan;
  - zoom up to 200%;
  - try these controls during practice.
- **Acceptance criteria:** Instructions match the implemented viewer exactly and are method-neutral.


### Screen 04 — Joy Plot Instructions

#### CR-008 — Show T0 Joy image on first Joy definition screen
- **Status:** OPEN
- **Priority:** P1
- **Requested change:** Display `training/T0a01_J.png` together with the Joy plot definition.
- **Acceptance criteria:** The illustrative image and its legend are visible on the definition screen.

#### CR-009 — Add Back navigation to Joy instructions
- **Status:** OPEN
- **Priority:** P2
- **Requested change:** Add a `Back` button.
- **Acceptance criteria:** `Back` returns to `How to Read the Visualisations`.
- **Caution:** Back navigation is instructional only, never measured-trial navigation.


### Screen 05 — Bivariate Choropleth Instructions

#### CR-010 — Show T0 Choropleth image on first Choropleth definition screen
- **Status:** OPEN
- **Priority:** P1
- **Requested change:** Display `training/T0a01_CH.png` together with the choropleth definition.
- **Acceptance criteria:** The illustrative image and 3×3 legend are visible on the definition screen.

#### CR-011 — Add Back navigation to Choropleth instructions
- **Status:** OPEN
- **Priority:** P2
- **Requested change:** Add a `Back` button.
- **Acceptance criteria:** `Back` returns to the Joy Plot Instructions screen; from there another Back can return to `How to Read the Visualisations`.
- **Caution:** Back navigation is instructional only.


### Screen 06 — Practice Introduction

_No requests yet._

### Screen 07 — Practice 1: Joy Plot

_No requests yet._

### Screen 08 — Practice 2: Bivariate Choropleth Map

_No requests yet._

### Screen 09 — Ready to Begin

_No requests yet._

### Screen 10 — Countdown

_No requests yet._

### Screen 11 — Measured Trials

_No requests yet._

### Screen 12 — Method Preference

_No requests yet._

### Screen 13 — Thank You

_No requests yet._

---

## Change Entry Template

Use the following structure for each requested change:

### CR-XXX — Short title

- **Screen:** 
- **Status:** OPEN
- **Priority:** P2
- **Requested change:** 
- **Exact wording / UI requirement:** 
- **Reason / researcher note:** 
- **Acceptance criteria:** 
- **Dependencies / cautions:** 
- **Implementation notes:** 

---

## QA Notes

_No notes yet._
