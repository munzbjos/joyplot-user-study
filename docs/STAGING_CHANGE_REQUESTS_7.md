# STAGING_CHANGE_REQUESTS_7.md

## Joy Plot User Study — Pilot Change Request 7

This request introduces a small but methodologically important correction to the instructional screens.

### Working rules

- Implement only the change described below.
- Do not modify measured stimuli, training questions, task wording, answer keys, V1–V6 allocation, timing logic, zoom behaviour, metrics, database schema, or participant flow.
- Preserve the existing training/practice stimuli with markers.
- Keep staging and production behaviour otherwise unchanged.

---

## CR7-001 — Use marker-free T0 images on the visualisation-definition screens

- **Screen:** Visualisation Instructions — Bivariate Joy Plot
- **Screen:** Visualisation Instructions — Bivariate Choropleth Map
- **Status:** DONE
- **Priority:** P1

### Background

The method-definition screens currently display the same marker-containing images that are later reused in the two training/practice questions.

This means participants see the numbered comparison regions before the corresponding practice task begins.

Two new marker-free images have now been added to the repository under `training/`:

- `training/T0_J.png`
- `training/T0_CH.png`

These should be used only on the method-definition screens.

### Requested change

Replace the current instructional image references as follows:

**Bivariate Joy Plot definition**
- replace the current marker-containing image with:
  - `training/T0_J.png`

**Bivariate Choropleth Map definition**
- replace the current marker-containing image with:
  - `training/T0_CH.png`

### Important: training/practice stimuli must remain unchanged

Do **not** change the images used in the actual practice questions:

- Practice 1 — Bivariate Joy Plot:
  - keep `training/T0a01_J.png`
- Practice 2 — Bivariate Choropleth Map:
  - keep `training/T0a01_CH.png`

The numbered markers should therefore first appear when the participant reaches the relevant practice question, not during the preceding method definition.

### Acceptance criteria

1. The Bivariate Joy Plot definition screen displays `T0_J.png`.
2. The Bivariate Choropleth Map definition screen displays `T0_CH.png`.
3. Neither definition image contains numbered region markers.
4. Practice 1 still uses `T0a01_J.png`.
5. Practice 2 still uses `T0a01_CH.png`.
6. Practice questions, correct answers, feedback, timing and interaction behaviour remain unchanged.
7. Measured stimuli and experiment configuration remain unchanged.
8. Frontend tests and production build pass.
9. The change is visually verified on staging before production deployment.

---

## Release / deployment note

Because production is already live for pilot preparation, treat this as a versioned pilot correction rather than an untracked hotfix.

Recommended workflow:

1. implement and verify on `develop`;
2. run frontend tests and production build;
3. verify both definition screens and both practice screens on staging;
4. merge through the normal release workflow to `main`;
5. create a new pilot tag (for example `v1.0.0-pilot.2`);
6. deploy production from that exact tag;
7. confirm that no database migration or production data modification is required.

Do not delete or alter existing production participant records as part of this request.

---

## Orchestrator implementation note

When complete, report:

- commit hash;
- resulting pilot tag;
- frontend test/build result;
- confirmation that definition screens now use `T0_J.png` and `T0_CH.png`;
- confirmation that practice screens still use `T0a01_J.png` and `T0a01_CH.png`;
- confirmation that no experiment config, backend, database, timing or measured stimuli were changed.
