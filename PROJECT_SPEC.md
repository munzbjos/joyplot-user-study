# Joy Plot User Study — Master Project Specification

## Role

Act as the **technical lead and orchestrator** for the development of a research web application for an academic cartographic user study.

You are responsible for coordinating implementation across the available agents (e.g. Codex Orchestrator, Hermes, OpenClaw, or other suitable agents), delegating frontend, backend, database, deployment, QA, testing, and documentation work as appropriate.

Do **not** treat this as a generic survey website. This is a controlled academic experiment, so experimental validity, reproducibility, timing accuracy, data integrity, privacy, and strict adherence to the supplied study configuration take priority over feature richness or visual novelty.

You may make routine implementation decisions without asking the researcher for approval. However, explicitly flag any decision that may materially affect:

- experimental validity,
- response-time measurement,
- participant privacy,
- data integrity,
- security,
- deployment infrastructure,
- or the locked experimental stimuli/configuration.

Do not modify the experimental design or stimuli unless explicitly instructed by the researcher.

---

# 1. Repository and Source of Truth

The authoritative GitHub repository is:

**https://github.com/munzbjos/joyplot-user-study**

Use this repository as the persistent project workspace and source of truth.

Expected top-level structure:

```text
joyplot-user-study/
├── PROJECT_SPEC.md
├── README.md
├── config/
├── stimuli/
├── frontend/
├── backend/
└── deploy/
```

The repository already contains the locked experimental assets and configuration.

## `stimuli/`

Contains the **36 final PNG experimental stimuli**.

These files are frozen master assets.

## `config/`

Contains the complete experiment configuration, including:

- `tasks.public.json`
- `versions.json`
- `answer_key.server.json`
- `experiment.server.json`
- `validate_config.py`
- `validation_report.txt`
- `README.md`

Treat the files in `config/` as the canonical experimental specification.

Before any implementation work:

1. Clone or pull the repository.
2. Read this `PROJECT_SPEC.md` completely.
3. Read `config/README.md`.
4. Run `config/validate_config.py`.
5. Verify that all 36 PNG files in `stimuli/` exist and exactly match the filenames referenced by the configuration.
6. Report any discrepancy immediately.
7. If validation passes, proceed automatically with implementation.

Expected validation result:

```text
EXPERIMENT CONFIGURATION: PASS
```

Expected design:

- 18 unique tasks
- 36 PNG stimuli
- 6 test versions: V1–V6
- 6 measured trials per participant
- 3 Joy + 3 Choropleth per version
- 3 CZ + 3 FR per version
- 2 T1 + 2 T2 + 2 T3 per version
- every participant sees CZ/FR × P1/P2/P3 exactly once
- each task appears once as Joy and once as Choropleth across V1–V6
- complementary version pairs:
  - V1 ↔ V2
  - V3 ↔ V4
  - V5 ↔ V6

Do **not** manually recreate the rotation matrix if `config/versions.json` is available.

Use the supplied configuration as the source of truth.

---

# 2. GitHub Workflow

The researcher uses GitHub but does not need to operate Git from the command line.

The orchestrator is responsible for normal Git operations.

Preferred workflow:

- `main` = stable, reviewed project state
- `develop` = integration branch
- optional feature branches such as:
  - `feature/frontend`
  - `feature/backend`
  - `feature/database`
  - `feature/deployment`
  - `feature/qa`

Sub-agents may work on separate branches where useful.

The orchestrator is responsible for:

- reviewing delegated work,
- resolving conflicts,
- integrating changes,
- committing coherent milestones,
- and keeping `main` stable.

Do not commit:

- secrets,
- passwords,
- database credentials,
- private keys,
- `.env` production files,
- or participant data.

Provide `.env.example` instead.

If GitHub authentication from the VPS is not configured, report that as a setup requirement. Do not alter repository ownership, visibility, or permissions without researcher approval.

Use clear commit messages and preserve a readable history.

---

# 3. Project Goal

Build a production-ready web application for a user study comparing two methods of bivariate spatial-data visualisation:

1. **Bivariate joy plots**
2. **3×3 bivariate choropleth maps**

Each participant completes **six measured map-reading trials**.

Primary study outcomes:

- response accuracy
- response time

Secondary outcome:

- subjective method preference

The entire participant-facing application must be in **English**.

---

# 4. Locked Experimental Assets

The 36 PNG files in `stimuli/` are **FROZEN MASTER STIMULI**.

Do not:

- rename them,
- edit them,
- crop them,
- recolour them,
- resize the source files,
- regenerate them,
- recompress them unnecessarily,
- alter labels,
- move marker positions,
- change legends,
- change question-to-image assignments,
- or create alternative experimental versions.

The application may responsively **display** them at appropriate size.

Any zoom must operate on the original PNG.

Experimental content may be changed only after explicit approval from the researcher.

---

# 5. Configuration Architecture

Use the supplied configuration so that question wording and experimental metadata are stored centrally.

A version should conceptually contain only:

```json
{
  "position": 1,
  "task_id": "T2a01",
  "method": "J"
}
```

The corresponding task configuration supplies:

- question
- response option set
- geography
- pair
- task family
- target pattern
- Joy filename
- Choropleth filename

Do not duplicate question wording across six manually created versions.

Correct answers must remain **server-side**.

`config/answer_key.server.json` must **never** be exposed through the browser's public/static directory.

The frontend must never receive the correct answer during a measured trial.

Correctness must be calculated server-side.

---

# 6. Recommended Technical Stack

Preferred implementation:

## Frontend

- TypeScript
- Vite
- lightweight modern frontend architecture
- React is acceptable if it improves maintainability, but is not required

## Backend

- Python
- FastAPI

## Database

- PostgreSQL

## Deployment

- Docker Compose

## Reverse proxy / HTTPS

- Caddy preferred for simplicity
- equivalent secure reverse proxy is acceptable

The application will initially run on the researcher's VPS, which also hosts the multi-agent system.

Design deployment so the application can later be moved to a university server with minimal changes.

Use environment variables for all deployment-specific settings.

Provide:

- Dockerfile(s)
- `docker-compose.yml`
- `.env.example`
- database migration/init mechanism
- deployment documentation
- update/rollback instructions

---

# 7. General Participant Flow

Implement the participant flow as:

```text
WELCOME / CONSENT
        ↓
PARTICIPANT INFORMATION
        ↓
VISUALISATION INSTRUCTIONS
        ↓
TRAINING
        ↓
START MEASURED TEST
        ↓
PRELOAD SIX ASSIGNED STIMULI
        ↓
3 – 2 – 1 COUNTDOWN
        ↓
TRIAL 1
        ↓
TRIAL 2
        ↓
TRIAL 3
        ↓
TRIAL 4
        ↓
TRIAL 5
        ↓
TRIAL 6
        ↓
METHOD PREFERENCE
        ↓
THANK YOU
```

---

# 8. Welcome / Consent Screen

Create a minimal, neutral introduction.

Suggested neutral framing:

> This study investigates how people interpret different visualisations of spatial data.

Provide configurable placeholders for:

- research institution
- investigator
- expected duration
- voluntary participation
- anonymity / data handling
- withdrawal information
- ethics/contact information

Do **not** invent final institutional or ethics wording.

Make these texts easy to edit from configuration.

Require consent before proceeding.

Avoid strongly priming participants toward a comparison hypothesis.

---

# 9. Participant Information Screen

Collect the following before instructions/training.

## Age

Question:

> What is your age?

Input:

- integer

Validate a sensible human range client-side and server-side.

Do not over-constrain without a good reason.

## Gender

Question:

> How do you describe your gender?

Options:

- Man
- Woman
- Another gender
- Prefer not to say

## Cartographic Background

Question:

> Do you have an educational or professional background in cartography or GIS?

Options:

- Yes
- No

Store these values at participant/session level.

---

# 10. Visualisation Instructions

Explain both experimental visualisation methods before measured trials.

Do not favour either method.

## Joy plot

Include the existing visual convention:

> Higher ridge = higher value.

Explain:

- Variable A
- Variable B
- how to compare ridge heights

## Bivariate choropleth

Explain:

- the 3×3 bivariate legend
- Variable A axis
- Variable B axis
- Low / High interpretation

Keep instructions concise and visually clear.

---

# 11. Training

Provide training for **both methods** before the measured test.

Preferred structure:

- Training 1: Joy plot
- Training 2: Bivariate choropleth

Training stimuli must **not** use any of the 36 measured PNG files.

The repository may not yet contain final training/T0 assets.

Therefore:

- implement the training architecture now,
- support placeholder/configurable training assets,
- do not invent final training stimuli without researcher approval.

Training may provide correctness feedback.

Training response times must **not** be included in the measured dataset.

Do not assign an experimental version before training is complete.

---

# 12. Start of Measured Test

The experimental version must be assigned **only when the participant starts the measured test**.

The frontend must **not** randomly choose V1–V6.

Version assignment is a backend responsibility.

Use **PERMUTED BLOCK RANDOMISATION** with blocks containing exactly:

```text
V1
V2
V3
V4
V5
V6
```

Shuffle order within each block.

This ensures that every six newly assigned participants contain one instance of every version while keeping allocation order unpredictable.

Version assignment must be concurrency-safe.

Use an appropriate PostgreSQL transaction/locking strategy so simultaneous participants cannot corrupt or duplicate allocation state.

Once assigned:

```text
participant/session → version
```

must be immutable.

Refreshing the page must **not** assign another version.

---

# 13. Session Model

Use an anonymous UUID or similarly strong random session identifier.

Do not require personal identification.

Persist session state server-side.

Also store a recoverable session token client-side, e.g. using `localStorage`, so accidental refresh can resume the study.

A refresh must restore:

- participant session
- assigned version
- completed trials
- current trial

Never silently restart the experiment from Trial 1.

Never silently change the assigned version.

---

# 14. Stimulus Preloading

Before the measured test begins:

- preload all six PNG files assigned to that participant
- wait until all six are downloaded
- wait until all six are decoded

Do not begin response timing while images are downloading.

A short neutral screen such as:

> Preparing test…

is acceptable.

Only when all assigned images are ready should the measured session begin.

---

# 15. Countdown

Use a simple:

```text
3
2
1
```

countdown immediately before Trial 1.

Do not expose Trial 1 question or image during the countdown.

A countdown before every individual trial is not required.

Between subsequent trials, a short neutral blank/transition state may be used if needed for stable rendering.

Avoid unnecessary animations.

---

# 16. Measured Trial UI

Use a consistent layout for all six measured trials.

Recommended structure:

```text
Question X of 6

[Question text]

[Stimulus image]

[Enlarge image / zoom control]

[Response options]

[Next button]
```

For T1/T2:

- response options correspond to Region 1–4

For T3:

- use the option set supplied by task configuration

Do not change or randomise response ordering unless explicitly instructed.

The current experiment assumes fixed option ordering.

The `Next` button must initially be disabled.

After one response is selected:

- enable `Next`
- allow the response to be changed until `Next` is pressed

After submission:

- do not show correctness feedback
- do not allow Back navigation
- do not show running score

---

# 17. Response-Time Measurement

Response time is a primary experimental outcome.

Treat timing implementation as critical.

Use:

```javascript
performance.now()
```

Do **not** use `Date.now()` as the primary interval timer.

Timing must begin only after:

- image is already preloaded
- image is decoded
- trial is inserted into the DOM
- browser has rendered the visible trial

Use `requestAnimationFrame` or an equivalent rendering-aware approach.

Record at least:

## `rt_selection_ms`

Time from visible stimulus onset until the participant first selects an answer.

## `rt_submit_ms`

Time from visible stimulus onset until the participant presses `Next`.

Also record:

## `answer_changes`

Number of answer changes after the initial selection.

Server-side timestamps may also be stored as metadata, but must not replace the client high-resolution interval measurement.

---

# 18. Zoom

Allow the participant to enlarge the stimulus.

Use the same zoom mechanism for both methods.

Preferred:

- modal or fullscreen-style enlarge view
- pan if needed
- sensible maximum zoom

Do not alter image content.

Record:

- `zoom_used`
- `zoom_count`

If straightforward, also record:

- `zoom_duration_ms`

Zoom must **not** pause the response timer.

---

# 19. Refresh / Interrupted Trial

If the browser is refreshed during a measured trial:

- resume the same session
- resume the same version
- return to the same incomplete trial
- restart timing for that trial
- mark that trial as interrupted/restarted

Store e.g.:

- `trial_restarted = true`
- `restart_count`

Do not combine pre-refresh and post-refresh timing into a misleading single RT.

---

# 20. Failed Response Submission

A participant must not proceed to the next trial until the backend confirms that the current response has been stored.

If an API request fails:

- keep the response locally
- show a neutral retry state
- retry safely
- prevent duplicate rows through idempotent backend logic

Do not lose responses during temporary network failure.

---

# 21. Method Preference

After Trial 6 and before the Thank You screen, ask exactly one subjective preference question.

Question:

> Which visualisation method did you prefer overall?

Options:

- I preferred the joy plot.
- I preferred the bivariate choropleth map.
- I had no preference.

This is a secondary subjective outcome.

Do not ask this question before measured trials are complete.

---

# 22. Thank You Screen

Display the Thank You screen only after:

- Trial 6 response has been confirmed by the backend
- preference response has been stored
- session status has been marked completed

Provide configurable final text.

---

# 23. Desktop-First Experiment

This study is intended for desktop/laptop use.

Do not treat smartphones as an equivalent experimental environment.

Implement a configurable minimum viewport width.

A starting threshold around 1100–1200 CSS pixels is reasonable.

If the viewport is too small, show a neutral message such as:

> This study requires a desktop or laptop computer with a larger screen.

Record QA metadata such as:

- `screen_width`
- `screen_height`
- `viewport_width`
- `viewport_height`
- `device_pixel_ratio`
- browser / user agent

Do not use these values for unnecessary fingerprinting.

---

# 24. Database Design

Use PostgreSQL.

A reasonable schema should include at least the following.

## Participants / Sessions

Conceptual fields:

```text
id
session_token
assigned_version
status

created_at
started_at
completed_at

age
gender
cartographic_background

preference

screen_width
screen_height
viewport_width
viewport_height
device_pixel_ratio
user_agent
```

## Trial Responses

Conceptual fields:

```text
id
participant_id
trial_position
task_id
task_family
geography
pair
method
stimulus_filename

selected_answer
correct_answer
is_correct

rt_selection_ms
rt_submit_ms

answer_changes
zoom_used
zoom_count
zoom_duration_ms

trial_restarted
restart_count

trial_started_at
submitted_at
```

Normalisation is acceptable where technically appropriate.

Preserve all information required for later statistical analysis.

Correct answers and correctness must be derived server-side from the locked answer key.

---

# 25. Data Export

Provide a simple researcher-facing way to export results.

At minimum support CSV suitable for R.

Preferred primary export:

- one row per measured trial

Include participant-level variables by joining them into each trial row, or provide clearly documented participant + response tables.

A participant-level export may also be provided.

Do not build a complex admin dashboard unless there is a strong reason.

A secure admin endpoint or command-line export is sufficient for the first production version.

---

# 26. API

Design a small clean API.

Exact endpoint names may vary, but conceptually support:

- create/recover session
- save participant information
- start measured test / assign version
- retrieve current session state
- retrieve current trial
- submit trial response
- submit preference
- complete session
- research data export

Version assignment and answer checking must occur server-side.

Validate all incoming values server-side even if the frontend already validates them.

---

# 27. Security and Privacy

Use HTTPS in production.

Do not expose PostgreSQL publicly.

Only expose required web ports.

Use SSH keys for server administration.

Do not hard-code secrets.

Use environment variables.

Do not use:

- Google Analytics
- advertising trackers
- third-party behavioural analytics
- tracking pixels

Avoid storing participant IP addresses unless technically necessary.

If server logs contain IP addresses by default:

- document this
- minimise retention where practical
- provide log rotation

Prefer locally hosted frontend assets.

Avoid externally loaded fonts or JavaScript unless there is a strong reason.

Keep:

- `answer_key.server.json`
- server-only experiment logic
- database credentials

outside any public/static frontend directory.

---

# 28. Visual Design — Phase 1

The researcher prefers **modern minimalist web design**.

Final visual refinement will happen after functional validation.

For the initial implementation use:

- clean minimalist layout
- neutral colours
- high readability
- generous whitespace
- restrained UI
- no decorative distractions
- no flashy transitions
- no unnecessary gradients
- consistent trial-screen geometry
- sensible system font stack

The stimulus must remain the visual focus.

Design styling so final visual refinement can happen later without rewriting experiment logic.

---

# 29. Accessibility / Usability

Ensure:

- visible keyboard focus
- readable contrast
- semantic form controls
- labels associated with controls
- sensible desktop responsiveness
- keyboard-operable controls where appropriate

Do not alter experimental stimulus content for accessibility.

---

# 30. Code Quality

Use:

- GitHub repository as source of truth
- TypeScript type checking
- backend validation models
- database migrations
- automated tests where useful
- linting / formatting
- useful documentation

Separate:

- experimental configuration
- application logic
- styling
- deployment configuration

Avoid hard-coding the six versions into frontend components.

---

# 31. Automated QA

Build automated validation around the supplied experimental configuration.

Before deployment, tests must confirm at minimum:

1. 18 tasks are available.
2. All 36 referenced PNG filenames exist in `stimuli/`.
3. Exactly six versions exist.
4. Each version contains exactly six trials.
5. Each version contains:
   - 3 J
   - 3 CH
   - 3 CZ
   - 3 FR
   - 2 T1
   - 2 T2
   - 2 T3
6. Every participant version contains each geography/pair combination exactly once:
   - CZ P1
   - CZ P2
   - CZ P3
   - FR P1
   - FR P2
   - FR P3
7. Every task appears exactly once as J and once as CH across V1–V6.
8. Every serial position is balanced across J/CH.
9. Complementary version pairs use the same tasks/positions with opposite methods.
10. Every correct answer is valid for its response option set.
11. No answer key is delivered to the frontend.
12. Version assignment survives page reload.
13. Trial state survives page reload.
14. Concurrent version assignment is safe.
15. Duplicate response submissions are idempotently handled.
16. Response timing starts only after visible rendered stimulus onset.
17. A participant cannot continue until the current response is successfully stored.

---

# 32. Development Phases

## Phase 0 — Audit

- clone/pull repository
- read project specification
- inspect configuration
- run validator
- verify all PNG assets
- confirm branch/repository setup
- document architecture decisions

Send the researcher a concise milestone report.

If the locked experimental configuration passes validation, continue without waiting for approval.

## Phase 1 — Functional Core

Implement:

```text
Welcome
→ session handling
→ participant information
→ Start
→ version allocation
→ preload
→ six trials
→ response timing
→ database storage
→ method preference
→ Thank You
```

Visual design may remain basic.

Demonstrate that real supplied PNGs and real task configuration are used.

## Phase 2 — Resilience and QA

Implement and test:

- refresh/resume
- network failure handling
- idempotent submission
- concurrency-safe allocation
- zoom logging
- technical metadata
- data export
- automated experiment validator
- automated tests

## Phase 3 — Full Study Flow

Add/refine:

- consent
- instructions
- training architecture
- countdown
- desktop-size requirement
- final English copy placeholders

Do not invent final training stimuli.

## Phase 4 — Deployment

Deploy through Docker Compose on the VPS.

Configure:

- HTTPS
- reverse proxy
- PostgreSQL
- persistent volumes
- environment configuration
- backup strategy
- operational logging
- update procedure
- rollback procedure

## Phase 5 — Experiment QA

Before declaring the application production-ready, simulate multiple participants across all six versions.

Verify:

- correct trial sequence
- correct filename
- correct question
- correct response options
- correct method
- correct backend answer key
- timing logs
- refresh behaviour
- version persistence
- preference recording
- completed-session state
- CSV export

Provide an automated or semi-automated QA report.

## Phase 6 — Visual Refinement

Only after the functional experiment is stable:

- refine typography
- spacing
- hierarchy
- button styling
- instruction screens
- responsive desktop presentation
- overall minimalist visual language

Do not alter experimental stimulus files.

---

# 33. Multi-Agent Delegation

The orchestrator may delegate work among available agents.

A sensible decomposition is:

## Backend / API Agent

Responsible for:

- FastAPI
- session model
- version allocation
- response submission
- server-side answer checking
- export
- tests

## Database Agent

Responsible for:

- PostgreSQL schema
- migrations
- transaction-safe version assignment
- constraints
- backup considerations

## Frontend Agent

Responsible for:

- participant flow
- trial UI
- preloading
- timing
- zoom
- session recovery
- desktop eligibility
- minimalist layout

## Deployment Agent

Responsible for:

- Docker
- Compose
- Caddy
- HTTPS
- VPS deployment
- environment configuration
- persistence
- operations documentation

## QA / Review Agent

Responsible for:

- independent validation against `config/`
- experiment matrix validation
- security checks
- response-timing logic review
- integration testing
- export verification

Agents may be combined where appropriate.

The orchestrator remains responsible for:

- integration
- review
- consistency
- merge decisions
- final milestone reports

Do not forward unreviewed sub-agent output as final.

---

# 34. Communication with the Researcher

Primary communication channel: **Telegram**.

Do not flood the researcher with low-level implementation details.

Send concise milestone reports containing:

- what was completed
- what was tested
- whether tests passed
- current deployment URL when available
- GitHub branch/commit/PR reference when useful
- any decisions requiring researcher input

Do not ask routine engineering questions that can be answered using standard judgement.

Ask only when:

- experimental validity may change
- locked configuration appears inconsistent
- ethics/privacy wording is required
- final training stimuli are required
- infrastructure credentials/domain decisions are needed
- a significant architectural trade-off requires owner approval

---

# 35. Non-Negotiable Rules

1. The 36 PNG experimental stimuli are immutable.
2. The supplied task bank and V1–V6 configuration are authoritative.
3. Correct answers remain server-side.
4. A participant's assigned version never changes after measured-test start.
5. Version allocation uses balanced permuted blocks, not naive independent randomisation.
6. Response timing must exclude image-download time.
7. No correctness feedback is shown during measured trials.
8. Exactly six measured trials are presented.
9. No Back navigation is allowed during measured trials.
10. Final preference is asked only after Trial 6.
11. Participant-facing UI is English.
12. The researcher must be able to export clean trial-level data for statistical analysis in R.
13. Do not modify the experimental design without explicit researcher approval.
14. Do not commit secrets or participant data to GitHub.
15. `main` must remain a stable, reviewed project state.

---

# 36. First Action

Begin by cloning/pulling:

**https://github.com/munzbjos/joyplot-user-study**

Then:

1. read `PROJECT_SPEC.md`
2. read `config/README.md`
3. run `config/validate_config.py`
4. verify all 36 PNG assets in `stimuli/`
5. inspect the current repository structure
6. confirm GitHub branch strategy
7. propose the concrete repository architecture
8. confirm the final chosen stack
9. propose the database/API architecture
10. propose the agent delegation plan
11. propose implementation milestones

Report the Phase 0 audit to the researcher via Telegram.

If the locked experimental configuration validates successfully and no genuine blocking issue is found, proceed directly into implementation without waiting for another approval.
