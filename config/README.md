# Joy Plot User Study – Web Configuration

This folder contains the locked experiment configuration for the 18-task / 36-stimulus user study.

## Files

- `tasks.public.json`
  - Safe to expose to the frontend.
  - Contains 18 tasks, English question wording, response option sets, metadata, and J/CH asset filenames.
  - Does **not** contain correct answers.

- `versions.json`
  - Contains the final V1–V6 rotation matrix.
  - Each trial stores only `position`, `task_id`, and `method`.
  - The stimulus filename and question are resolved from `tasks.public.json`.
  - Version assignment is defined as a permuted block of all six versions.

- `answer_key.server.json`
  - Server-only answer key.
  - Do not serve this file from the public/static frontend directory.

- `experiment.server.json`
  - Convenience bundle containing tasks + versions + answer key for backend use.
  - Also server-only.

- `validate_config.py`
  - Validates the experimental design.
  - Checks all 36 PNG filenames in the repository-root `stimuli/` directory.

## Suggested project layout

```text
app/
  config/
    tasks.public.json
    versions.json
    answer_key.server.json
    validate_config.py

  public/
    stimuli/
      T1a01_CZP1_J.png
      ...
      T3a06_FRP3_CH.png
```

In production, expose `tasks.public.json`, `versions.json`, and PNG files only as needed.
Keep `answer_key.server.json` outside the public/static root.

## Runtime resolution

A version trial such as:

```json
{"position": 1, "task_id": "T2a01", "method": "J"}
```

is resolved by looking up task `T2a01` in `tasks.public.json`, then using:

```json
task.assets["J"]
```

for the PNG filename, and `task.question` + its referenced option set for the UI.

This avoids copying question wording or filenames into six separate versions.

## Locked design checks

The validator confirms:

- 18 tasks
- 6 versions
- 6 trials per version
- 3 Joy + 3 Choropleth per version
- 3 CZ + 3 FR per version
- 2 T1 + 2 T2 + 2 T3 per version
- each participant sees CZ/FR × P1/P2/P3 exactly once
- each task appears exactly once as Joy and once as Choropleth across V1–V6
- every serial position contains 3 Joy and 3 Choropleth instances across the six versions
- V1↔V2, V3↔V4, and V5↔V6 have the same tasks/positions with opposite methods
- every server answer is valid for the task's response option set
