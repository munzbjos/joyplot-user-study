# STAGING_CHANGE_REQUESTS_6.md

## Joy Plot User Study — Staging QA Change Log, Round 6

This document contains the sixth round of researcher-requested changes.

### Working rules

- Implement all items marked `OPEN`.
- Do not modify locked experimental stimuli, task wording, answer keys, version allocation, response-time logic, zoom logic, or stored metrics.
- This round is a participant-copy clarification only.
- Keep frontend wording and participant-copy documentation synchronized.

---

## CR6-001 — Clarify the Bivariate Joy Plot legend instructions

- **Screen:** Visualisation Instructions — Bivariate Joy Plot
- **Status:** DONE
- **Priority:** P2

### Background

The current Bivariate Joy Plot instruction explains ridge height and the colour assignments, but it does not explicitly tell participants that the map legend identifies the two variables by colour.

The Bivariate Choropleth Map instruction already refers explicitly to its 3×3 legend, so the Bivariate Joy Plot instruction should provide a similarly clear reference to its legend.

### Requested wording

Replace the current explanatory text:

> A bivariate joy plot represents spatial values using a series of profiles.  
>
> **Variable A** and **Variable B** are shown as two overlaid sets of ridges.  
>
> The **height of a ridge represents the value of the variable at that location:**  
>
> **Higher ridge = higher value.**  
>
> To compare values, look at the relative heights of the corresponding ridges at the location of interest.  
>
> **Variable A — blue**  
> **Variable B — red**

with:

> A bivariate joy plot represents spatial values using a series of profiles.  
>
> **Variable A** and **Variable B** are shown as two overlaid sets of ridges. **The legend identifies the variables by colour: Variable A is blue and Variable B is red.**  
>
> The **height of a ridge represents the value of the variable at that location:**  
>
> **Higher ridge = higher value.**  
>
> To compare values, look at the relative heights of the corresponding ridges at the location of interest.

### Formatting requirements

- Preserve the existing paragraph structure and visual hierarchy.
- Keep emphasis consistent with the current instruction styling.
- Remove the separate final lines:
  - `Variable A — blue`
  - `Variable B — red`
- Do not change the Bivariate Joy Plot training question or measured task wording.

### Documentation sync

Update the corresponding text in the participant-copy documentation as well, especially `docs/PARTICIPANT_COPY.md` if that remains the current documentation source, so that the repository documentation and rendered frontend do not diverge.

### Acceptance criteria

1. The Bivariate Joy Plot instruction explicitly states that the legend identifies Variable A and Variable B by colour.
2. Variable A is described as blue and Variable B as red.
3. `Higher ridge = higher value.` remains clearly visible.
4. The separate colour lines at the bottom are removed.
5. No other participant-facing instruction text changes.
6. Training, measured trials, answer keys, timings, zoom behaviour, and metrics remain unchanged.
7. Frontend participant copy and documentation use the same wording.
8. Frontend tests and production build still pass.

---

## Orchestrator implementation note

When complete:

1. mark CR6-001 `DONE` only after visual verification;
2. run relevant frontend tests and production build;
3. redeploy staging;
4. push reviewed changes to `develop`;
5. send the researcher a concise Telegram report with:
   - commit hash,
   - test/build result,
   - confirmation that the frontend and participant-copy documentation were both updated.
