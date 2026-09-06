# STAGING_CHANGE_REQUESTS_8.md

## Joy Plot User Study — Pilot Change Request 8
### Czech UI localisation with language tracking

This request adds a Czech participant-facing UI while preserving the existing English experiment as the canonical version.

The localisation must not create a second experiment, task bank, answer key, allocator, or database. Both language versions use the same experimental configuration, stimuli, response structure, timing logic, and production database.

---

# 1. Core methodological constraints

- **English remains the canonical/source language.**
- Add a Czech participant-facing translation only.
- Use one experiment, one task bank, one answer key, one V1–V6 allocator, and one production database.
- Do not modify measured PNG stimuli.
- Do not modify training PNG stimuli.
- Do not modify task IDs, version IDs, method codes, answer codes, correctness logic, response timing, zoom logic, or randomisation.
- Do not reset or delete existing production participant data.
- Do not reset the production allocation state.
- Existing production responses must remain valid and unchanged.
- Record the selected UI language at participant/session level as `ui_language`.
- Language must not be treated as an experimental manipulation; it is a participant/session metadata field for QA and later sensitivity analysis.

Canonical terminology:

- **Bivariate Joy Plot → bivariantní joyplot**
- **Bivariate Choropleth Map → bivariantní kartogram**
- **Variable A → proměnná A**
- **Variable B → proměnná B**

Do not use alternative Czech terms for these two visualisation methods elsewhere in the UI.

---

# 2. Language switcher behaviour

## CR8-001 — Add language selector to the first screen only

- **Status:** DONE
- **Priority:** P1

Add a simple language switcher to the first Welcome / Consent screen:

**English | Čeština**

Requirements:

- default language = `en`;
- participant may switch freely between English and Czech while still on the first screen;
- switching language must immediately update all visible participant-facing copy on that screen;
- once the participant leaves the first screen by successfully continuing after consent, the language is locked for the session;
- the language selector must not appear on later screens;
- refresh/session recovery must preserve the selected language;
- the participant must not be able to change language during training or measured trials;
- language selection must not alter experimental allocation, timing, correctness, task order, or stimuli.

---

# 3. Database change

## CR8-002 — Add `ui_language`

- **Status:** DONE
- **Priority:** P1

Add participant/session-level field:

```text
ui_language
```

Allowed values:

```text
en
cs
```

Recommended database semantics:

- non-null;
- default/backfill value `en`;
- constrain values to `en` or `cs` if consistent with the existing schema/migration conventions.

### Existing data preservation

Existing production participant records were completed in English and **must be preserved**.

Before applying the migration:

1. create a production DB backup using the existing backup mechanism;
2. record current participant/trial counts and allocation state.

During migration:

- add `ui_language`;
- backfill **all existing production participant records with `en`**;
- do not delete, recreate, or modify existing responses;
- do not reset V1–V6 allocation state;
- do not alter participant IDs, trial IDs, timestamps, answers, RTs, zoom metrics, preference, consent metadata, or technical metadata.

Apply the same schema migration to staging so both environments remain schema-compatible. Existing staging records may likewise be backfilled as `en`.

After migration verify:

- participant count unchanged;
- trial response count unchanged;
- allocation state unchanged;
- every pre-existing participant has `ui_language = 'en'`;
- newly created Czech staging sessions store `ui_language = 'cs'`;
- newly created English staging sessions store `ui_language = 'en'`.

Include `ui_language` in the research CSV export.

---

# 4. Localisation architecture

## CR8-003 — Centralise participant-facing strings

- **Status:** DONE
- **Priority:** P1

Implement localisation in a maintainable way rather than duplicating the application.

Preferred pattern:

```text
en -> canonical participant-facing strings
cs -> approved Czech strings below
```

Requirements:

- no runtime machine translation;
- no separate Czech task bank;
- no separate Czech answer key;
- no duplicated experiment JSON;
- task IDs and answer values remain language-neutral internally;
- response options may render translated labels but must submit the same internal answer codes as English;
- untranslated developer/admin/internal identifiers should remain unchanged.

Run an audit for participant-facing strings so Czech mode does not accidentally expose English UI text except where English text is intentionally embedded in the map PNGs and explicitly explained below.

---

# 5. Embedded English text in map images

The map PNGs remain unchanged.

They contain English labels such as:

- `Variable A`
- `Variable B`
- `Higher ridge = higher value`
- `Low`
- `High`

Do **not** create Czech copies of the 36 measured stimuli.

The Czech instructional screens must explicitly explain these English labels using the approved wording below.

---

# 6. Approved Czech participant-facing copy

The following Czech wording is authoritative.

---

## Screen 1 — Welcome / Consent

### Title

**Vizualizace prostorových dat: uživatelská studie**

### Introductory paragraph

**Studie zkoumá, jak lidé čtou a interpretují různé způsoby zobrazení prostorových dat. Nejprve se krátce seznámíte s použitými vizualizacemi a vyzkoušíte si dvě cvičné úlohy. Poté vás čeká šest otázek zaměřených na čtení map.**

**Studie zabere přibližně 5–10 minut a měla by být absolvována na stolním počítači nebo notebooku.**

### Participation requirements

**Požadavky pro účast**

- Musí vám být **alespoň 18 let**.
- Studii prosím absolvujte na **stolním počítači nebo notebooku**.
- Pokud je to možné, absolvujte studii najednou.

### Participation and data

**Účast a data**

Účast ve studii je dobrovolná. Studii můžete kdykoli ukončit zavřením okna prohlížeče.

Nezjišťujeme vaše jméno, e-mailovou adresu ani jiné údaje, které by vás přímo identifikovaly. Studie zaznamenává vaše odpovědi, reakční časy, základní demografické údaje uvedené v dotazníku a omezené technické informace o zařízení a prohlížeči použitém k absolvování studie.

Shromážděná data budou použita pro akademický výzkum a mohou být v agregované nebo anonymizované podobě publikována ve vědeckých publikacích a souvisejících výstupech výzkumu.

### Research contact

**Kontakt na výzkumníka**

Studii provádí **Josef Münzberger, ČVUT v Praze**.

V případě dotazů ke studii mě můžete kontaktovat na:

**josef.munzberger@fsv.cvut.cz**

### Consent

**Souhlas**

☐ **Potvrzuji, že mi je alespoň 18 let, že jsem si přečetl(a) výše uvedené informace a že dobrovolně souhlasím s účastí v této studii.**

### Button

**Pokračovat**

### Technical states

`Saving consent…`

→ **Ukládání souhlasu…**

`Your consent could not be recorded. Please check your connection and retry.`

→ **Souhlas se nepodařilo zaznamenat. Zkontrolujte prosím připojení k internetu a zkuste to znovu.**

---

## Screen 2 — About You

### Title

**O vás**

### Intro

**Než začneme, uveďte prosím několik základních informací o sobě.**

### Age

**Věk**

### Gender

**Pohlaví**

Options:

- **Muž**
- **Žena**
- **Jiné**
- **Nechci uvést**

### Cartography/GIS background

**Máte vzdělání nebo profesní zkušenosti v oblasti kartografie či GIS?**

Options:

- **Ano**
- **Ne**

### Button

**Pokračovat**

### Validation

`Please enter your age.`

→ **Zadejte prosím svůj věk.**

Under-18 validation:

→ **Studie je určena pouze osobám ve věku 18 let a více.**

---

## Screen 3 — How to Read the Visualisations

### Title

**Jak číst vizualizace**

### Copy

**V této studii budete pracovat se dvěma různými metodami vizualizace dvou prostorových proměnných: proměnné A a proměnné B. V mapách jsou tyto proměnné označeny anglicky jako Variable A a Variable B.**

**Na následujících obrazovkách se stručně seznámíte s tím, jak jednotlivé vizualizace číst. Poté si před zahájením měřené části studie vyzkoušíte dvě cvičné úlohy.**

### Button

**Pokračovat**

---

## Screen 4 — Bivariate Joy Plot definition

### Title

**Bivariantní joyplot**

### Copy

**Bivariantní joyplot znázorňuje prostorové hodnoty pomocí série profilů.**

**Proměnná A** a **proměnná B** jsou zobrazeny jako dvě překrývající se sady profilů. **Legenda rozlišuje proměnné pomocí barev: proměnná A je modrá a proměnná B červená.**

**Výška profilu vyjadřuje hodnotu proměnné v daném místě:**

**Vyšší profil = vyšší hodnota.**

Při porovnávání hodnot sledujte relativní výšku odpovídajících profilů v místě, které vás zajímá.

**V mapě jsou proměnné označeny jako Variable A a Variable B; anglické „Higher ridge = higher value“ znamená „Vyšší profil = vyšší hodnota“.**

The final sentence is ordinary running instructional text, with the same text size as the surrounding copy; it is **not** a footnote.

### Buttons

- **Zpět**
- **Pokračovat**

### Image

Use the existing marker-free definition image:

```text
training/T0_J.png
```

Do not change it.

---

## Screen 5 — Bivariate Choropleth Map definition

### Title

**Bivariantní kartogram**

### Copy

**Bivariantní kartogram znázorňuje dvě prostorové proměnné pomocí kombinace barev.**

**Proměnná A** a **proměnná B** jsou klasifikovány do tří úrovní. Jejich kombinace vytváří matici **3 × 3**, podle které lze určit hodnoty obou proměnných v jednotlivých místech mapy.

**Legenda ukazuje, jaké kombinaci hodnot proměnné A a proměnné B jednotlivé barvy odpovídají.**

Při čtení mapy porovnejte barvu v místě, které vás zajímá, s odpovídající pozicí v legendě.

**V mapě jsou proměnné označeny jako Variable A a Variable B; anglické „Low“ znamená „nízká hodnota“ a „High“ znamená „vysoká hodnota“.**

The final sentence is ordinary running instructional text, with the same text size as the surrounding copy; it is **not** a footnote.

### Buttons

- **Zpět**
- **Pokračovat**

### Image

Use the existing marker-free definition image:

```text
training/T0_CH.png
```

Do not change it.

---

## Screen 6 — How to interact with the map

### Title

**Jak pracovat s mapou**

### Copy

**Mapu můžete podle potřeby přiblížit a posouvat.**

Umístěte kurzor myši nad mapu a pomocí **kolečka myši přibližujte nebo oddalujte**.

Pro posun mapy **klikněte a táhněte myší**.

Maximální přiblížení je **250 %**.

Tyto ovládací prvky si můžete vyzkoušet v následujících cvičných úlohách.

### Button

**Pokračovat**

---

## Screen 7 — Practice 1

### Title

**Cvičení 1 ze 2: Bivariantní joyplot**

### Marker instruction

**Očíslované kruhy označují oblasti, které máte porovnat. Zaměřte se na vizuální vzor uvnitř označeného kruhu, nikoli na jediný přesný pixel nebo bod.**

### Question

**Ve které označené oblasti je hodnota proměnné B vyšší než hodnota proměnné A?**

### Options

- **Oblast 1**
- **Oblast 2**
- **Oblast 3**
- **Oblast 4**

### Submit button

**Odeslat odpověď**

### Correct feedback

**Správně. V oblasti 3 je hodnota proměnné B vyšší než hodnota proměnné A. U bivariantního joyplotu porovnávejte výšky profilů uvnitř označené oblasti. Vyšší profil = vyšší hodnota.**

### Incorrect feedback

**Ne tak docela. Správná odpověď je oblast 3. V oblasti 3 je hodnota proměnné B vyšší než hodnota proměnné A. U bivariantního joyplotu porovnávejte výšky profilů uvnitř označené oblasti. Vyšší profil = vyšší hodnota.**

### Continue button

**Pokračovat**

### Image

Practice image remains unchanged:

```text
training/T0a01_J.png
```

---

## Screen 8 — Practice 2

### Title

**Cvičení 2 ze 2: Bivariantní kartogram**

### Marker instruction

**Očíslované kruhy označují oblasti, které máte porovnat. Zaměřte se na vizuální vzor uvnitř označeného kruhu, nikoli na jediný přesný pixel nebo bod.**

### Question

**Která označená oblast má nízkou hodnotu proměnné A a vysokou hodnotu proměnné B?**

### Options

- **Oblast 1**
- **Oblast 2**
- **Oblast 3**
- **Oblast 4**

### Submit button

**Odeslat odpověď**

### Correct feedback

**Správně. Oblast 2 představuje kombinaci nízké hodnoty proměnné A a vysoké hodnoty proměnné B. U bivariantního kartogramu porovnejte barvu buněk uvnitř označené oblasti s odpovídající pozicí v matici legendy 3 × 3.**

### Incorrect feedback

**Ne tak docela. Správná odpověď je oblast 2. Oblast 2 představuje kombinaci nízké hodnoty proměnné A a vysoké hodnoty proměnné B. U bivariantního kartogramu porovnejte barvu buněk uvnitř označené oblasti s odpovídající pozicí v matici legendy 3 × 3.**

### Continue button

**Pokračovat**

### Image

Practice image remains unchanged:

```text
training/T0a01_CH.png
```

---

## Screen 9 — Ready to Begin

### Title

**Můžeme začít**

### Copy

**Cvičná část je u konce.**

Měřená část studie obsahuje **šest otázek**.

Na každou otázku odpovězte **co nejpřesněji a bez zbytečného prodlení**.

Doba odpovědi se měří od okamžiku, kdy se zobrazí otázka a vizualizace, až do odeslání odpovědi.

Vizualizaci můžete podle potřeby přiblížit.

Po odeslání odpovědi se k předchozí otázce nelze vrátit.

Pokud je to možné, vyplňte všech šest otázek najednou.

**Test začne po krátkém odpočtu 3–2–1.**

### Button

**Spustit test**

The numeric countdown remains:

```text
3
2
1
```

---

# 7. Measured task translations

All internal task IDs, answers, filenames and correct-answer codes remain unchanged.

## T1a

### T1a01 — CZ P1

**Která ze čtyř označených oblastí má nejvyšší hodnotu proměnné A?**

### T1a02 — FR P2

**Která ze čtyř označených oblastí má nejvyšší hodnotu proměnné B?**

### T1a03 — CZ P2

**Která ze čtyř označených oblastí má nejnižší hodnotu proměnné A?**

---

## T1b

### T1b01 — FR P3

**Která označená oblast má nízkou hodnotu proměnné B?**

### T1b02 — CZ P3

**Která označená oblast má vysokou hodnotu proměnné B?**

### T1b03 — FR P1

**Která označená oblast má nízkou hodnotu proměnné A?**

---

## T2a

### T2a01 — FR P1

**Která označená oblast má vysokou hodnotu proměnné A a zároveň vysokou hodnotu proměnné B?**

### T2a02 — CZ P2

**Která označená oblast má vysokou hodnotu proměnné A a zároveň nízkou hodnotu proměnné B?**

### T2a03 — CZ P1

**Která označená oblast má nízkou hodnotu proměnné A a zároveň nízkou hodnotu proměnné B?**

### T2a04 — FR P3

**Která označená oblast má nízkou hodnotu proměnné A a zároveň vysokou hodnotu proměnné B?**

### T2a05 — CZ P3

**Která označená oblast má vysokou hodnotu proměnné A a zároveň vysokou hodnotu proměnné B?**

### T2a06 — FR P2

**Která označená oblast má nízkou hodnotu proměnné A a zároveň vysokou hodnotu proměnné B?**

### T1/T2 response options

Always render:

- **Oblast 1**
- **Oblast 2**
- **Oblast 3**
- **Oblast 4**

These labels must map to the same existing internal region answer codes used by English.

---

## T3a

The question is identical for all six T3 tasks:

- T3a01 — CZ P1
- T3a02 — CZ P2
- T3a03 — CZ P3
- T3a04 — FR P1
- T3a05 — FR P2
- T3a06 — FR P3

### Question

**Který popis nejlépe vystihuje celkový prostorový vztah mezi proměnnou A a proměnnou B?**

### Options

1. **Převážně pozitivní vztah**
2. **Převážně negativní vztah**
3. **Celkově podobný prostorový vzor s lokální anomálií**
4. **Žádný zřetelný prostorový vztah**

The displayed Czech labels must map to the same existing internal T3 answer codes as English.

---

# 8. Measured-trial generic controls and states

Translate all generic participant-facing measured-trial controls consistently.

At minimum:

- `Region 1` → **Oblast 1**
- `Region 2` → **Oblast 2**
- `Region 3` → **Oblast 3**
- `Region 4` → **Oblast 4**
- `Submit answer` → **Odeslat odpověď**
- `Next` / equivalent post-submit navigation → **Pokračovat**

If the current frontend contains additional participant-visible loading, retry, connection, preload, recovery, or error text, identify it during localisation audit and provide a faithful Czech translation consistent with the approved style. Do not alter the underlying behaviour.

---

# 9. Preference screen

## Screen 10 — Preference

### Title

**Téměř hotovo!**

### Supporting sentence

**Ještě poslední otázka týkající se vaší celkové preference.**

### Question

**Kterou vizualizační metodu jste celkově preferoval(a)?**

### Options

- **Preferoval(a) jsem bivariantní joyplot.**
- **Preferoval(a) jsem bivariantní kartogram.**
- **Neměl(a) jsem žádnou preferenci.**

### Button

**Odeslat odpověď**

Preference must be stored using the same existing internal values as in English.

---

# 10. Thank You screen

## Screen 11 — Completion

### Title

**Děkujeme!**

### Main text

**Děkujeme za účast ve studii. Vaše odpovědi byly úspěšně zaznamenány.**

### Links

Keep the existing destinations unchanged.

Displayed labels:

- **LinkedIn**
- **E-mail**
- **Článek o bivariantních joyplotech**

---

# 11. English version

## CR8-004 — Preserve canonical English copy

- **Status:** DONE
- **Priority:** P1

The existing approved English participant-facing copy must remain unchanged except for refactoring required to move strings into the localisation structure.

Acceptance requirement:

- when `ui_language = en`, the rendered English participant flow must be textually equivalent to the current approved production version;
- no accidental wording changes during localisation refactor.

---

# 12. Timing and experimental integrity

## CR8-005 — Preserve measurement behaviour

- **Status:** DONE
- **Priority:** P1

The localisation implementation must not alter:

- stimulus preload/decode logic;
- trial onset;
- `performance.now()` timing;
- `rt_selection_ms`;
- `rt_submit_ms`;
- `answer_changes`;
- zoom behaviour or zoom metrics;
- refresh/recovery logic;
- trial ordering;
- V1–V6 assignment;
- correctness evaluation;
- server-only answer key;
- training feedback logic.

The chosen language must be resolved before measured trials begin and must not trigger asynchronous translation/loading during a measured trial.

Prefer locale resources bundled with the frontend build so measured-trial onset is not dependent on an external translation request.

---

# 13. QA requirements

## CR8-006 — Bilingual QA

- **Status:** DONE
- **Priority:** P1

Before production deployment:

### Automated

Run:

- experiment config validator;
- all frontend tests;
- all backend tests;
- PostgreSQL concurrency test;
- production frontend build;
- `git diff --check`;
- security/dependency checks already used by the project.

Add tests for at least:

- default language is `en`;
- switching to Czech on screen 1 changes the copy;
- selected language persists after Continue and refresh;
- language selector disappears after screen 1;
- `ui_language` stores `en` and `cs` correctly;
- existing participant backfill to `en`;
- translated response labels submit the same internal answer values;
- T3 translated labels submit unchanged answer codes;
- CSV export contains `ui_language`.

### Manual staging QA — English

Complete one full English staging flow and verify:

- all screens render current approved English;
- task order/answers/timing behave unchanged;
- `ui_language = en`.

### Manual staging QA — Czech

Complete one full Czech staging flow and verify:

- no unintended English participant-facing UI remains outside the English text embedded in map PNGs;
- both method definitions correctly explain the English map labels;
- both practice screens use the existing marked T0 images;
- all measured questions use the approved Czech text;
- Region/Oblast labels map to correct internal codes;
- preference stores correctly;
- completion screen renders correctly;
- `ui_language = cs`.

Check layout at the minimum supported desktop viewport and at a typical 2560×1440 desktop viewport. Czech text must not cause clipping, overlap, hidden controls, or altered map sizing.

---

# 14. Production migration and release workflow

## CR8-007 — Safe production release

- **Status:** OPEN
- **Priority:** P1

Because production already contains pilot records, this must be a non-destructive migration.

Required workflow:

1. implement on `develop`;
2. complete staging EN + CS QA;
3. create a production DB backup before migration;
4. record pre-migration row counts and allocation state;
5. merge through the normal reviewed workflow to `main`;
6. create the next versioned pilot tag;
7. deploy only from that exact tag;
8. run the DB migration with the production migrator account;
9. backfill all existing production participants to `ui_language = 'en'`;
10. verify row counts and allocation state are unchanged;
11. verify CSV export includes `ui_language`;
12. perform a read-only public smoke check;
13. do **not** create a production QA participant session merely to test localisation; full flow QA belongs on staging.

Do not remove or modify existing production participant records as part of this request.

---

# 15. Acceptance criteria

CR8 is complete only when all of the following are true:

1. First screen shows `English | Čeština`.
2. English is default.
3. Language can be changed only on the first screen.
4. Language is locked after leaving the first screen.
5. Refresh/recovery preserves language.
6. `ui_language` exists and accepts only `en` / `cs` according to the implemented DB convention.
7. Existing production participant rows remain present and are backfilled to `en`.
8. Existing production trial rows remain unchanged.
9. Allocation state remains unchanged.
10. CSV export includes `ui_language`.
11. English participant flow remains textually equivalent to the approved current version.
12. Czech copy matches this document.
13. Required terminology is used consistently:
    - bivariantní joyplot
    - bivariantní kartogram
14. No Czech copies of measured PNG stimuli are created.
15. English text embedded in maps is explained on the Czech definition screens.
16. Internal task IDs, response codes, answer keys, filenames and V1–V6 configuration are unchanged.
17. Timing and interaction metrics are unchanged.
18. Both EN and CS full staging flows pass.
19. Frontend/backend/config/concurrency/build tests pass.
20. Production deployment is non-destructive and versioned.

---

# 16. Orchestrator report

After implementation, report:

- implementation commit;
- resulting pilot release tag;
- database migration revision;
- production backup path + SHA-256;
- pre/post production participant count;
- pre/post production trial response count;
- pre/post allocation state;
- count of existing rows backfilled to `ui_language = en`;
- EN staging QA result;
- CS staging QA result;
- frontend/backend/config/concurrency/build results;
- confirmation that measured stimuli/config/answer key/timing were unchanged;
- confirmation that no production participant data were deleted or reset;
- confirmation that the public production URL remains:
  - `https://joyplots.onmaps.cz`
