# Participant-Facing Copy

Authoritative participant-facing wording for the **Joy Plot User Study** web application.

> **Implementation note:** Treat this document as the canonical source for participant-facing wording. Keep the content configurable rather than hard-coded across frontend components. Text marked `[TO BE CONFIRMED]` must remain editable and must not be replaced without researcher approval.

---

## 1. Welcome / Consent

### Title

**Visualisation of Spatial Data — User Study**

### Introduction

Thank you for taking part in this study.

This research investigates how people interpret different visualisations of spatial data. You will first receive brief instructions and complete two practice tasks. You will then answer six map-reading questions.

The study takes approximately **5–10 minutes** and should be completed on a **desktop or laptop computer**.

### Participation requirements

- You must be **18 years of age or older**.
- Please complete the study on a **desktop or laptop computer**.
- Please complete the study in one sitting if possible.

### Participation and data

Participation is voluntary. You may stop the study at any time by closing the browser window.

We do not ask for your name, email address, or other directly identifying information. The study records your responses, response times, basic demographic information provided in the questionnaire, and limited technical information about the device and browser used to complete the study.

The collected data will be used for academic research and may be reported in aggregated or anonymised form in scientific publications and related research outputs.

### What data will be collected?

The study records:

- your age, gender category and whether you have a background in cartography or GIS;
- your answers to the six experimental questions;
- response times and basic interactions with the visualisations, such as use of image zoom;
- your final preference between the two visualisation methods;
- basic technical information such as browser type, screen size and viewport size.

These technical data are collected only to assess the quality and comparability of the experimental responses.

### Risks and benefits

No risks beyond those normally associated with using a computer are expected. There is no direct personal benefit from participating, but your responses will contribute to research on cartographic visualisation and map design.

### Research contact

This study is conducted by **Josef Münzberger**, **CTU Prague**.

If you have questions about the study, please contact:

**josef.munzberger@fsv.cvut.cz**

### Ethics / data protection information

**[TO BE CONFIRMED — insert institutional ethics approval/reference or other required CTU data-protection information if applicable.]**

### Consent

☐ **I confirm that I am at least 18 years old, that I have read the information above, and that I voluntarily agree to participate in this study.**

Button:

**Continue**

### Server-side consent record

Store:

- `consent_given = true`
- `consent_timestamp`
- `consent_version = "1.0"`

---

## 2. Participant Information

### Title

**About You**

### Introduction

Before we begin, please answer three short questions about yourself.

### Age

**What is your age?**

Input:

- integer

Placeholder:

**Age**

Validation message:

**Please enter your age as a whole number.**

### Gender

**How do you describe your gender?**

Options:

- Man
- Woman
- Another gender
- Prefer not to say

### Cartographic background

**Do you have an educational or professional background in cartography or GIS?**

Options:

- Yes
- No

Button:

**Continue**

---

## 3. Instructions — Introduction

### Title

**How to Read the Visualisations**

In this study, you will work with two different methods for visualising two spatial variables: **Variable A** and **Variable B**.

The following screens briefly explain how to read each visualisation. You will then complete two practice questions before starting the measured part of the study.

Button:

**Continue**

---

## 4. Joy Plot Instructions

### Title

**Joy Plot**

A joy plot represents spatial values using a series of profiles.

**Variable A** and **Variable B** are shown as two overlaid sets of ridges.

The **height of a ridge represents the value of the variable at that location:**

**Higher ridge = higher value.**

To compare values, look at the relative heights of the corresponding ridges at the location of interest.

Visual key:

- **Variable A — blue**
- **Variable B — red**

Button:

**Continue**

---

## 5. Bivariate Choropleth Instructions

### Title

**Bivariate Choropleth Map**

A bivariate choropleth map represents **Variable A** and **Variable B** simultaneously using colour.

Each map cell belongs to one of nine colour classes representing a combination of values of the two variables.

Use the **3 × 3 legend** to interpret the colour of a cell:

- one direction of the legend represents **Variable A**, from low to high;
- the other direction represents **Variable B**, from low to high.

To identify the values at a location, match the colour of the corresponding map cell to the legend.

Button:

**Continue**

---

## 6. Practice Introduction

### Title

**Practice**

You will now complete two practice questions:

- one using a **joy plot**;
- one using a **bivariate choropleth map**.

These practice questions are **not part of the measured test**, and your response time will not be analysed.

After submitting each answer, you will see the correct response.

The numbered circles indicate the **regions to be compared**. Consider the visual pattern within the marked circle rather than trying to identify a single exact pixel or point.

Button:

**Start Practice**

---

## 7. Practice 1 — Joy Plot

### Header

**Practice 1 of 2 — Joy Plot**

### Training asset

Repository path:

`training/T0a01_J.png`

This is a **non-measured training stimulus** and must never be included among the six measured trials.

### Question

**At which marked region is Variable B higher than Variable A?**

### Response options

- Region 1
- Region 2
- Region 3
- Region 4

### Correct answer

**Region 3**

The correct answer must be used only for training feedback and must not be exposed before the participant submits a response.

### Button before selection

**Check answer**

The button remains disabled until a response has been selected.

### Correct-answer feedback

**Correct.**

At **Region 3**, Variable B is higher than Variable A.

In a joy plot, compare the ridge heights within the marked region. Remember:

**Higher ridge = higher value.**

Button:

**Next Practice Question**

### Incorrect-answer feedback

**Not quite. The correct answer is Region 3.**

At **Region 3**, Variable B is higher than Variable A.

In a joy plot, compare the ridge heights within the marked region. Remember:

**Higher ridge = higher value.**

Button:

**Next Practice Question**

---

## 8. Practice 2 — Bivariate Choropleth Map

### Header

**Practice 2 of 2 — Bivariate Choropleth Map**

### Training asset

Repository path:

`training/T0a01_CH.png`

This is a **non-measured training stimulus** and must never be included among the six measured trials.

### Question

**Which marked region shows a low value of Variable A and a high value of Variable B?**

### Response options

- Region 1
- Region 2
- Region 3
- Region 4

### Correct answer

**Region 2**

The correct answer must be used only for training feedback and must not be exposed before the participant submits a response.

### Button before selection

**Check answer**

The button remains disabled until a response has been selected.

### Correct-answer feedback

**Correct.**

**Region 2** represents a low value of Variable A and a high value of Variable B.

To interpret a bivariate choropleth map, match the colour of the cells within the marked region to the corresponding position in the **3 × 3 legend**.

Button:

**Continue**

### Incorrect-answer feedback

**Not quite. The correct answer is Region 2.**

**Region 2** represents a low value of Variable A and a high value of Variable B.

To interpret a bivariate choropleth map, match the colour of the cells within the marked region to the corresponding position in the **3 × 3 legend**.

Button:

**Continue**

---

## 9. Ready to Begin

### Title

**Ready to Begin**

The practice is complete.

The measured part of the study contains **six questions**.

Please answer each question as **accurately and efficiently as you can**.

Your response time will be measured from the moment each question and visualisation appear until you submit your answer.

You may enlarge the visualisation if needed.

Once you submit an answer, you cannot return to the previous question.

Please complete all six questions in one sitting if possible.

**The test will begin after a short 3–2–1 countdown.**

Button:

**Start Test**

---

## 10. Countdown

Display only:

**3**

then:

**2**

then:

**1**

Do not expose the first measured question or stimulus during the countdown.

---

## 11. Measured Trial Interaction Copy

The exact question wording and response options for measured trials must be loaded from the locked experiment configuration in `config/`.

### Trial header

**Question [X] of 6**

### Zoom control

Suggested label:

**Enlarge image**

### Next button

**Next**

The button remains disabled until a response has been selected.

Do not show correctness feedback during measured trials.

Do not allow Back navigation after submission.

---

## 12. Method Preference

### Question

**Which visualisation method did you prefer overall?**

Options:

- I preferred the joy plot.
- I preferred the bivariate choropleth map.
- I had no preference.

Button:

**Submit**

---

## 13. Thank You

### Title

**Thank You**

Thank you for taking part in this study.

Your responses have been recorded successfully.

**[OPTIONAL FINAL CONTACT / RESEARCH INFORMATION TO BE CONFIRMED]**

---

## 14. Locked Training Specification

The training module is now defined as follows.

| Practice | Method | Asset | Question | Correct answer |
|---|---|---|---|---|
| Practice 1 | Joy plot | `training/T0a01_J.png` | At which marked region is Variable B higher than Variable A? | Region 3 |
| Practice 2 | Bivariate choropleth map | `training/T0a01_CH.png` | Which marked region shows a low value of Variable A and a high value of Variable B? | Region 2 |

Training rules:

- training stimuli are not measured;
- training response times are not included in the measured dataset;
- correctness feedback is shown after each training response;
- training stimuli must not be used in any measured trial;
- the measured V1–V6 version is assigned only after training is complete and the participant presses **Start Test**;
- training wording, filenames and correct answers must not be changed without researcher approval.

---

## 15. Locked / Pending Content

### Locked participant-facing content

- Researcher: **Josef Münzberger**
- Institution: **CTU Prague**
- Contact: **josef.munzberger@fsv.cvut.cz**
- Minimum participant age: **18**
- Participant-facing language: **English**
- Measured trials: **6**
- Minimum experimental viewport: **1100 CSS px**
- Consent is recorded server-side with timestamp and consent-text version
- Training Joy asset/question/correct answer: **locked**
- Training Choropleth asset/question/correct answer: **locked**
- Final method-preference question: **locked**

### Pending institutional/researcher input

- final ethics approval/reference, if applicable;
- final CTU-specific data-protection wording, if required;
- optional final contact/institutional wording on the Thank You screen.

These pending institutional items must not block implementation of the remaining participant flow, but the application must not be opened to real participants until required ethics/data-protection wording has been confirmed.
