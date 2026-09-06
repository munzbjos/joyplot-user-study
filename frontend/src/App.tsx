import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "./api";
import { uiConfig } from "./config";
import { participantCopy } from "./participantCopy";
import { copy, localiseTrial } from "./localisation";
import { ImageViewer } from "./ImageViewer";
import { storage } from "./storage";
import { afterVisiblePaint, preloadAndDecode } from "./timing";
import type {
  ParticipantInformation,
  SafeTrial,
  StudySession,
  TrialMetrics,
  UiLanguage,
} from "./types";

type View =
  | "loading"
  | "welcome"
  | "demographics"
  | "instructions-intro"
  | "instructions-joy"
  | "instructions-ch"
  | "map-interaction"
  | "practice-intro"
  | "training"
  | "ready"
  | "preloading"
  | "countdown"
  | "trial"
  | "preference"
  | "thank-you"
  | "resume"
  | "error";

function initialView(session: StudySession): View {
  if (session.status === "completed") return "thank-you";
  if (
    session.assigned_version ||
    session.status === "in_progress" ||
    session.status === "preference_recorded"
  )
    return "resume";
  if (session.participant_information_complete || session.status === "ready")
    return "instructions-intro";
  if (session.consent_recorded || session.status === "consent_recorded")
    return "demographics";
  return "welcome";
}

function DesktopGate({
  children,
  language,
}: {
  children: React.ReactNode;
  language: UiLanguage;
}) {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  if (width < uiConfig.minimumViewportWidth)
    return (
      <main className="shell gate" role="alert">
        <h1>{copy[language].gateTitle}</h1>
        <p>{copy[language].gateText}</p>
        <p>{copy[language].gateSaved}</p>
      </main>
    );
  return <>{children}</>;
}

export function App() {
  const [view, setView] = useState<View>("loading");
  const [session, setSession] = useState<StudySession | null>(null);
  const [message, setMessage] = useState("");
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [recoveredTrial, setRecoveredTrial] = useState(0);
  const [language, setLanguage] = useState<UiLanguage>("en");

  useEffect(() => {
    let active = true;
    const initialise = async () => {
      try {
        const token = storage.getSessionToken();
        let result: StudySession;
        if (token) {
          try {
            result = await api.recoverSession(token);
            const locallySelected = storage.getLanguage();
            if (
              result.status === "created" &&
              result.ui_language !== locallySelected
            ) {
              const updated = await api.setLanguage(token, locallySelected);
              result = { ...result, ...updated };
            }
          } catch (error) {
            if (!(error instanceof ApiError && error.status === 401))
              throw error;
            storage.clearSessionToken();
            storage.clearLanguage();
            result = await api.createSession(undefined, "en");
          }
        } else {
          storage.clearLanguage();
          result = await api.createSession(undefined, "en");
        }
        if (!active) return;
        storage.setSessionToken(result.session_token);
        storage.setLanguage(result.ui_language);
        setLanguage(result.ui_language);
        setSession(result);
        setView(initialView(result));
      } catch {
        if (active) {
          setMessage(copy[storage.getLanguage()].connectionError);
          setView("error");
        }
      }
    };
    void initialise();
    return () => {
      active = false;
    };
  }, []);

  const startLoadedSession = useCallback(
    async (source: StudySession, interrupted: boolean) => {
      if (
        source.status === "preference_recorded" ||
        source.completed_trials >= 6
      ) {
        setView("preference");
        return;
      }
      if (!source.trials?.length) {
        setMessage(copy[source.ui_language].recoverError);
        setView("error");
        return;
      }
      const nextPosition =
        source.current_trial_position ?? source.completed_trials + 1;
      const active = storage.getActive();
      const restartCount = interrupted
        ? active?.token === source.session_token &&
          active.position === nextPosition
          ? active.restartCount + 1
          : 1
        : 0;
      setRecoveredTrial(restartCount);
      setView("preloading");
      try {
        await preloadAndDecode(
          source.trials.map((trial) => trial.stimulus_url),
        );
        const pending = storage.getPending();
        if (pending?.token === source.session_token) {
          const acknowledged = await api.submitTrial(
            pending.token,
            pending.position,
            pending.metrics,
          );
          storage.clearPending();
          storage.clearActive();
          setSession(acknowledged);
          if (acknowledged.completed_trials >= 6) {
            setView("preference");
            return;
          }
        }
        if (source.completed_trials === 0 && !interrupted) {
          setCountdown(3);
          setView("countdown");
        } else setView("trial");
      } catch {
        setMessage(copy[source.ui_language].stimuliError);
        setView("error");
      }
    },
    [],
  );

  const beginMeasured = async () => {
    if (!session) return;
    setView("preloading");
    try {
      const started = await api.startMeasuredTest(session.session_token);
      setSession(started);
      await startLoadedSession(started, false);
    } catch {
      setMessage(copy[language].measuredStartError);
      setView("error");
    }
  };

  useEffect(() => {
    if (view !== "countdown") return;
    const timer = window.setTimeout(() => {
      if (countdown === 1) setView("trial");
      else setCountdown((value) => value - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, view]);

  if (!session && view !== "error")
    return (
      <main className="shell">
        <p>{copy[language].preparing}</p>
      </main>
    );

  const usesMapCanvas =
    view === "instructions-joy" ||
    view === "instructions-ch" ||
    view === "training" ||
    view === "trial";
  return (
    <DesktopGate language={language}>
      <main
        className={`shell ${usesMapCanvas ? "map-shell" : ""} ${view === "trial" ? "trial-shell" : ""}`}
        lang={language}
      >
        {view === "loading" && <p>{copy[language].preparing}</p>}
        {view === "welcome" && (
          <Welcome
            language={language}
            onLanguageChange={async (selected) => {
              const previous = language;
              setLanguage(selected);
              storage.setLanguage(selected);
              try {
                const updated = await api.setLanguage(
                  session!.session_token,
                  selected,
                );
                setSession((current) =>
                  current ? { ...current, ...updated } : current,
                );
              } catch (error) {
                setLanguage(previous);
                storage.setLanguage(previous);
                throw error;
              }
            }}
            onContinue={async () => {
              const updated = await api.recordConsent(
                session!.session_token,
                uiConfig.consentTextVersion,
              );
              setSession((current) =>
                current ? { ...current, ...updated } : current,
              );
              setView("demographics");
            }}
          />
        )}
        {view === "demographics" && (
          <Demographics
            language={language}
            onSave={async (information) => {
              const updated = await api.saveParticipantInformation(
                session!.session_token,
                information,
              );
              setSession((current) =>
                current ? { ...current, ...updated } : current,
              );
              setView("instructions-intro");
            }}
          />
        )}
        {view === "instructions-intro" && (
          <InstructionsIntro
            language={language}
            onContinue={() => setView("instructions-joy")}
          />
        )}
        {view === "instructions-joy" && (
          <JoyInstructions
            language={language}
            onBack={() => setView("instructions-intro")}
            onContinue={() => setView("instructions-ch")}
          />
        )}
        {view === "instructions-ch" && (
          <ChoroplethInstructions
            language={language}
            onBack={() => setView("instructions-joy")}
            onContinue={() => setView(language === "cs" ? "map-interaction" : "practice-intro")}
          />
        )}
        {view === "map-interaction" && (
          <MapInteraction
            language={language}
            onContinue={() => setView("practice-intro")}
          />
        )}
        {view === "practice-intro" && (
          <PracticeIntro
            language={language}
            onContinue={() => {
              setTrainingIndex(0);
              setView("training");
            }}
          />
        )}
        {view === "training" && (
          <Training
            language={language}
            key={trainingIndex}
            index={trainingIndex}
            onContinue={() => {
              if (trainingIndex === uiConfig.training.length - 1)
                setView("ready");
              else setTrainingIndex((value) => value + 1);
            }}
          />
        )}
        {view === "ready" && (
          <Ready language={language} onStart={() => void beginMeasured()} />
        )}
        {view === "preloading" && (
          <Status
            title={language === "cs" ? "Příprava testu…" : "Preparing test…"}
            text={
              language === "cs"
                ? "Stahování a dekódování všech šesti podnětů. Měření času ještě nezačalo."
                : "Downloading and decoding all six stimuli. Timing has not started."
            }
          />
        )}
        {view === "countdown" && (
          <section className="countdown" aria-live="assertive">
            <span>{countdown}</span>
          </section>
        )}
        {view === "trial" && session && (
          <TrialScreen
            key={`${session.session_token}-${session.current_trial_position ?? session.completed_trials + 1}`}
            session={session}
            language={language}
            recovered={recoveredTrial}
            onAcknowledged={(updated) => {
              setRecoveredTrial(0);
              setSession(updated);
              setView(updated.completed_trials >= 6 ? "preference" : "trial");
            }}
          />
        )}
        {view === "preference" && session && (
          <Preference
            language={language}
            onSubmit={async (preference) => {
              const saved = await api.submitPreference(
                session.session_token,
                preference,
              );
              const completed = await api.complete(session.session_token);
              setSession({ ...session, ...saved, ...completed });
              setView("thank-you");
            }}
          />
        )}
        {view === "thank-you" && <ThankYou language={language} />}
        {view === "resume" && session && (
          <Resume
            language={language}
            session={session}
            onResume={() =>
              void (async () => {
                try {
                  if (session.status === "preference_recorded") {
                    const completed = await api.complete(session.session_token);
                    setSession({ ...session, ...completed });
                    setView("thank-you");
                    return;
                  }
                  const recovered = await api.startMeasuredTest(
                    session.session_token,
                  );
                  setSession(recovered);
                  await startLoadedSession(
                    recovered,
                    session.status === "in_progress" &&
                      session.completed_trials < 6,
                  );
                } catch {
                  setMessage(copy[language].savedRecoverError);
                  setView("error");
                }
              })()
            }
          />
        )}
        {view === "error" && (
          <section>
            <h1>{copy[language].unableContinue}</h1>
            <p role="alert">{message}</p>
            <button onClick={() => location.reload()}>
              {copy[language].retry}
            </button>
          </section>
        )}
      </main>
    </DesktopGate>
  );
}

export function Welcome({
  language,
  onLanguageChange,
  onContinue,
}: {
  language: UiLanguage;
  onLanguageChange: (language: UiLanguage) => Promise<void>;
  onContinue: () => Promise<void>;
}) {
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [error, setError] = useState("");
  const changeLanguage = async (selected: UiLanguage) => {
    if (selected === language || languageSaving) return;
    setLanguageSaving(true);
    setError("");
    try {
      await onLanguageChange(selected);
    } catch {
      setError(
        language === "cs"
          ? "Jazyk se nepodařilo uložit. Zkontrolujte prosím připojení a zkuste to znovu."
          : "The language could not be saved. Please check your connection and retry.",
      );
    } finally {
      setLanguageSaving(false);
    }
  };
  const continueAfterConsent = async () => {
    if (!consent || saving) return;
    setSaving(true);
    setError("");
    try {
      await onContinue();
    } catch {
      setError(
        language === "cs"
          ? "Souhlas se nepodařilo zaznamenat. Zkontrolujte prosím připojení k internetu a zkuste to znovu."
          : "Your consent could not be recorded. Please check your connection and retry.",
      );
      setSaving(false);
    }
  };
  const cs = language === "cs";
  return (
    <section>
      <nav className="language-switcher" aria-label="Language / Jazyk">
        <button
          type="button"
          className={cs ? "language-option" : "language-option active"}
          aria-pressed={!cs}
          disabled={languageSaving}
          onClick={() => void changeLanguage("en")}
        >
          English
        </button>
        <span aria-hidden="true">|</span>
        <button
          type="button"
          className={cs ? "language-option active" : "language-option"}
          aria-pressed={cs}
          disabled={languageSaving}
          onClick={() => void changeLanguage("cs")}
        >
          Čeština
        </button>
      </nav>
      <h1>
        {cs
          ? "Vizualizace prostorových dat: uživatelská studie"
          : participantCopy.welcome.title}
      </h1>
      {(cs
        ? [
            "Studie zkoumá, jak lidé čtou a interpretují různé způsoby zobrazení prostorových dat. Nejprve se krátce seznámíte s použitými vizualizacemi a vyzkoušíte si dvě cvičné úlohy. Poté vás čeká šest otázek zaměřených na čtení map.",
            "Studie zabere přibližně 5–10 minut a měla by být absolvována na stolním počítači nebo notebooku.",
          ]
        : participantCopy.welcome.introduction
      ).map((text, index) => (
        <p className={index === 0 ? "lead" : undefined} key={text}>
          {text}
        </p>
      ))}
      <h2>{cs ? "Požadavky pro účast" : "Participation requirements"}</h2>
      <ul>
        {cs ? (
          <>
            <li>
              Musí vám být <strong>alespoň 18 let</strong>.
            </li>
            <li>
              Studii prosím absolvujte na{" "}
              <strong>stolním počítači nebo notebooku</strong>.
            </li>
            <li>Pokud je to možné, absolvujte studii najednou.</li>
          </>
        ) : (
          <>
            <li>
              You must be <strong>18 years of age or older</strong>.
            </li>
            <li>
              Please complete the study on a{" "}
              <strong>desktop or laptop computer</strong>.
            </li>
            <li>Please complete the study in one sitting if possible.</li>
          </>
        )}
      </ul>
      <h2>{cs ? "Účast a data" : "Participation and data"}</h2>
      {cs ? (
        <>
          <p>
            Účast ve studii je dobrovolná. Studii můžete kdykoli ukončit
            zavřením okna prohlížeče.
          </p>
          <p>
            Nezjišťujeme vaše jméno, e-mailovou adresu ani jiné údaje, které by
            vás přímo identifikovaly. Studie zaznamenává vaše odpovědi, reakční
            časy, základní demografické údaje uvedené v dotazníku a omezené
            technické informace o zařízení a prohlížeči použitém k absolvování
            studie.
          </p>
          <p>
            Shromážděná data budou použita pro akademický výzkum a mohou být v
            agregované nebo anonymizované podobě publikována ve vědeckých
            publikacích a souvisejících výstupech výzkumu.
          </p>
        </>
      ) : (
        <>
          <p>
            Participation is voluntary. You may stop the study at any time by
            closing the browser window.
          </p>
          <p>
            We do not ask for your name, email address, or other directly
            identifying information. The study records your responses, response
            times, basic demographic information provided in the questionnaire,
            and limited technical information about the device and browser used
            to complete the study.
          </p>
          <p>
            The collected data will be used for academic research and may be
            reported in aggregated or anonymised form in scientific publications
            and related research outputs.
          </p>
        </>
      )}
      <h2>{cs ? "Kontakt na výzkumníka" : "Research contact"}</h2>
      <p>
        {cs ? (
          <>
            Studii provádí <strong>Josef Münzberger, ČVUT v Praze</strong>.
          </>
        ) : (
          <>
            This study is conducted by <strong>Josef Münzberger</strong>,{" "}
            <strong>CTU Prague</strong>.
          </>
        )}
      </p>
      <p>
        {cs
          ? "V případě dotazů ke studii mě můžete kontaktovat na:"
          : "If you have questions about the study, please contact:"}
      </p>
      <p>
        <strong>josef.munzberger@fsv.cvut.cz</strong>
      </p>
      <h2>{cs ? "Souhlas" : "Consent"}</h2>
      <label className="consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />{" "}
        <strong>
          {cs
            ? "Potvrzuji, že mi je alespoň 18 let, že jsem si přečetl(a) výše uvedené informace a že dobrovolně souhlasím s účastí v této studii."
            : participantCopy.welcome.consent}
        </strong>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        disabled={!consent || saving || languageSaving}
        onClick={() => void continueAfterConsent()}
      >
        {saving
          ? cs
            ? "Ukládání souhlasu…"
            : "Saving consent…"
          : cs
            ? "Pokračovat"
            : "Continue"}
      </button>
    </section>
  );
}

function Demographics({
  language,
  onSave,
}: {
  language: UiLanguage;
  onSave: (value: ParticipantInformation) => Promise<void>;
}) {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<ParticipantInformation["gender"] | "">(
    "",
  );
  const [background, setBackground] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const parsedAge = Number(age);
  const ageIsEligible =
    age !== "" &&
    Number.isInteger(parsedAge) &&
    parsedAge >= uiConfig.minimumParticipantAge &&
    parsedAge <= 120;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const parsed = Number(age);
    if (age === "") {
      setError(
        language === "cs"
          ? "Zadejte prosím svůj věk."
          : "Please enter your age.",
      );
      return;
    }
    if (!Number.isInteger(parsed) || parsed < uiConfig.minimumParticipantAge) {
      setError(
        language === "cs"
          ? "Studie je určena pouze osobám ve věku 18 let a více."
          : `Age must be between ${uiConfig.minimumParticipantAge} and 120.`,
      );
      return;
    }
    if (parsed > 120 || !gender || background === null) {
      setError(
        language === "cs"
          ? "Vyplňte prosím všechna pole. Věk musí být nejvýše 120 let."
          : `Please complete all fields. Age must be between ${uiConfig.minimumParticipantAge} and 120.`,
      );
      return;
    }
    setSaving(true);
    try {
      await onSave({
        age: parsed,
        gender,
        cartographic_background: background,
      });
    } catch {
      setError(
        language === "cs"
          ? "Vaše údaje se nepodařilo uložit. Zkuste to prosím znovu."
          : "Your information could not be saved. Please retry.",
      );
      setSaving(false);
    }
  };
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "O vás" : "About You"}</h1>
      <p>
        {cs
          ? "Než začneme, uveďte prosím několik základních informací o sobě."
          : "Before we begin, please answer three short questions about yourself."}
      </p>
      <form onSubmit={submit}>
        <label>
          {cs ? "Věk" : "What is your age?"}
          <input
            aria-label={cs ? "Věk" : "Age"}
            placeholder={cs ? "Věk" : "Age"}
            inputMode="numeric"
            type="number"
            min={uiConfig.minimumParticipantAge}
            max="120"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
          />
        </label>
        <fieldset>
          <legend>{cs ? "Pohlaví" : "How do you describe your gender?"}</legend>
          {[
            ["man", cs ? "Muž" : "Man"],
            ["woman", cs ? "Žena" : "Woman"],
            ["another_gender", cs ? "Jiné" : "Another gender"],
            ["prefer_not_to_say", cs ? "Nechci uvést" : "Prefer not to say"],
          ].map(([value, label]) => (
            <label className="choice" key={value}>
              <input
                type="radio"
                name="gender"
                value={value}
                checked={gender === value}
                onChange={() =>
                  setGender(value as ParticipantInformation["gender"])
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>
            {cs
              ? "Máte vzdělání nebo profesní zkušenosti v oblasti kartografie či GIS?"
              : "Do you have an educational or professional background in cartography or GIS?"}
          </legend>
          <label className="choice">
            <input
              type="radio"
              name="background"
              checked={background === true}
              onChange={() => setBackground(true)}
            />
            {cs ? "Ano" : "Yes"}
          </label>
          <label className="choice">
            <input
              type="radio"
              name="background"
              checked={background === false}
              onChange={() => setBackground(false)}
            />
            {cs ? "Ne" : "No"}
          </label>
        </fieldset>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button disabled={saving || !ageIsEligible}>
          {saving
            ? cs
              ? "Ukládání…"
              : "Saving…"
            : cs
              ? "Pokračovat"
              : "Continue"}
        </button>
      </form>
    </section>
  );
}

function InstructionsIntro({
  language,
  onContinue,
}: {
  language: UiLanguage;
  onContinue: () => void;
}) {
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "Jak číst vizualizace" : "How to Read the Visualisations"}</h1>
      {cs ? (
        <>
          <p>
            V této studii budete pracovat se dvěma různými metodami vizualizace
            dvou prostorových proměnných: <strong>proměnné A</strong> a{" "}
            <strong>proměnné B</strong>. V mapách jsou tyto proměnné označeny
            anglicky jako Variable A a Variable B.
          </p>
          <p>
            Na následujících obrazovkách se stručně seznámíte s tím, jak
            jednotlivé vizualizace číst. Poté si před zahájením měřené části
            studie vyzkoušíte dvě cvičné úlohy.
          </p>
        </>
      ) : (
        <>
          <p>
            In this study, you will work with two different methods for
            visualising two spatial variables: <strong>Variable A</strong> and{" "}
            <strong>Variable B</strong>.
          </p>
          <p>
            The following screens briefly explain how to read each
            visualisation. You will then complete two practice questions before
            starting the measured part of the study.
          </p>
          <h2>How to interact with maps</h2>
          <p>
            Move the pointer over an image and use the mouse wheel to zoom
            smoothly up to 250%. When zoomed, click and drag to pan. You can try
            these controls during practice.
          </p>
        </>
      )}
      <button onClick={onContinue}>{copy[language].continue}</button>
    </section>
  );
}

function JoyInstructions({
  language,
  onBack,
  onContinue,
}: {
  language: UiLanguage;
  onBack: () => void;
  onContinue: () => void;
}) {
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "Bivariantní joyplot" : "Bivariate Joy Plot"}</h1>
      {cs ? (
        <>
          <p>
            Bivariantní joyplot znázorňuje prostorové hodnoty pomocí série
            profilů.
          </p>
          <p>
            <strong>Proměnná A</strong> a <strong>proměnná B</strong> jsou
            zobrazeny jako dvě překrývající se sady profilů.{" "}
            <strong>
              Legenda rozlišuje proměnné pomocí barev: proměnná A je modrá a
              proměnná B červená.
            </strong>
          </p>
          <p>
            <strong>
              Výška profilu vyjadřuje hodnotu proměnné v daném místě:
            </strong>
          </p>
          <p>
            <strong>Vyšší profil = vyšší hodnota.</strong>
          </p>
          <p>
            Při porovnávání hodnot sledujte relativní výšku odpovídajících
            profilů v místě, které vás zajímá.
          </p>
          <p>
            V mapě jsou proměnné označeny jako Variable A a Variable B; anglické
            „Higher ridge = higher value“ znamená „Vyšší profil = vyšší hodnota“.
          </p>
        </>
      ) : (
        <>
          <p>
            A bivariate joy plot represents spatial values using a series of
            profiles.
          </p>
          <p>
            <strong>Variable A</strong> and <strong>Variable B</strong> are
            shown as two overlaid sets of ridges.{" "}
            <strong>
              The legend identifies the variables by colour: Variable A is blue
              and Variable B is red.
            </strong>
          </p>
          <p>
            The{" "}
            <strong>
              height of a ridge represents the value of the variable at that
              location:
            </strong>
          </p>
          <p>
            <strong>Higher ridge = higher value.</strong>
          </p>
          <p>
            To compare values, look at the relative heights of the corresponding
            ridges at the location of interest.
          </p>
        </>
      )}
      <ImageViewer
        className="instruction-viewer"
        src="/training/T0_J.png"
        alt={
          cs
            ? "Výuková mapa bivariantního joyplotu s legendou"
            : "Bivariate Joy Plot training map with legend"
        }
      />
      <div className="button-row">
        <button className="secondary" onClick={onBack}>
          {copy[language].back}
        </button>
        <button onClick={onContinue}>{copy[language].continue}</button>
      </div>
    </section>
  );
}

function ChoroplethInstructions({
  language,
  onBack,
  onContinue,
}: {
  language: UiLanguage;
  onBack: () => void;
  onContinue: () => void;
}) {
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "Bivariantní kartogram" : "Bivariate Choropleth Map"}</h1>
      {cs ? (
        <>
          <p>
            Bivariantní kartogram znázorňuje dvě prostorové proměnné pomocí
            kombinace barev.
          </p>
          <p>
            <strong>Proměnná A</strong> a <strong>proměnná B</strong> jsou
            klasifikovány do tří úrovní. Jejich kombinace vytváří matici{" "}
            <strong>3 × 3</strong>, podle které lze určit hodnoty obou
            proměnných v jednotlivých místech mapy.
          </p>
          <p>
            <strong>
              Legenda ukazuje, jaké kombinaci hodnot proměnné A a proměnné B
              jednotlivé barvy odpovídají.
            </strong>
          </p>
          <p>
            Při čtení mapy porovnejte barvu v místě, které vás zajímá, s
            odpovídající pozicí v legendě.
          </p>
          <p>
            V mapě jsou proměnné označeny jako Variable A a Variable B; anglické
            „Low“ znamená „nízká hodnota“ a „High“ znamená „vysoká hodnota“.
          </p>
        </>
      ) : (
        <>
          <p>
            A bivariate choropleth map represents <strong>Variable A</strong>{" "}
            and <strong>Variable B</strong> simultaneously using colour.
          </p>
          <p>
            Each map cell belongs to one of nine colour classes representing a
            combination of values of the two variables.
          </p>
          <p>
            Use the <strong>3 × 3 legend</strong> to interpret the colour of a
            cell:
          </p>
          <ul>
            <li>
              one direction of the legend represents <strong>Variable A</strong>
              , from low to high;
            </li>
            <li>
              the other direction represents <strong>Variable B</strong>, from
              low to high.
            </li>
          </ul>
          <p>
            To identify the values at a location, match the colour of the
            corresponding map cell to the legend.
          </p>
        </>
      )}
      <ImageViewer
        cropChoroplethFrame
        className="instruction-viewer"
        src="/training/T0_CH.png"
        alt={
          cs
            ? "Výuková mapa bivariantního kartogramu s legendou 3 × 3"
            : "Bivariate choropleth training map with 3 × 3 legend"
        }
      />
      <div className="button-row">
        <button className="secondary" onClick={onBack}>
          {copy[language].back}
        </button>
        <button onClick={onContinue}>{copy[language].continue}</button>
      </div>
    </section>
  );
}

function MapInteraction({
  language,
  onContinue,
}: {
  language: UiLanguage;
  onContinue: () => void;
}) {
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "Jak pracovat s mapou" : "How to interact with maps"}</h1>
      {cs ? (
        <>
          <p>
            <strong>Mapu můžete podle potřeby přiblížit a posouvat.</strong>
          </p>
          <p>
            Umístěte kurzor myši nad mapu a pomocí{" "}
            <strong>kolečka myši přibližujte nebo oddalujte</strong>.
          </p>
          <p>
            Pro posun mapy <strong>klikněte a táhněte myší</strong>.
          </p>
          <p>
            Maximální přiblížení je <strong>250 %</strong>.
          </p>
          <p>
            Tyto ovládací prvky si můžete vyzkoušet v následujících cvičných
            úlohách.
          </p>
        </>
      ) : (
        <p>
          Move the pointer over an image and use the mouse wheel to zoom
          smoothly up to 250%. When zoomed, click and drag to pan. You can try
          these controls during practice.
        </p>
      )}
      <button onClick={onContinue}>{copy[language].continue}</button>
    </section>
  );
}

function PracticeIntro({
  language,
  onContinue,
}: {
  language: UiLanguage;
  onContinue: () => void;
}) {
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "Cvičení" : "Practice"}</h1>
      {cs ? (
        <>
          <p>Nyní si vyzkoušíte dvě cvičné úlohy:</p>
          <ul>
            <li>
              jednu s <strong>bivariantním joyplotem</strong>;
            </li>
            <li>
              jednu s <strong>bivariantním kartogramem</strong>.
            </li>
          </ul>
          <p>
            Tyto cvičné úlohy <strong>nejsou součástí měřeného testu</strong> a
            váš reakční čas nebude analyzován.
          </p>
          <p>Po odeslání každé odpovědi se zobrazí správná odpověď.</p>
          <p>
            Očíslované kruhy označují{" "}
            <strong>oblasti, které máte porovnat</strong>. Zaměřte se na
            vizuální vzor uvnitř označeného kruhu, nikoli na jediný přesný pixel
            nebo bod.
          </p>
        </>
      ) : (
        <>
          <p>You will now complete two practice questions:</p>
          <ul>
            <li>
              one using a <strong>bivariate joy plot</strong>;
            </li>
            <li>
              one using a <strong>bivariate choropleth map</strong>.
            </li>
          </ul>
          <p>
            These practice questions are{" "}
            <strong>not part of the measured test</strong>, and your response
            time will not be analysed.
          </p>
          <p>
            After submitting each answer, you will see the correct response.
          </p>
          <p>
            The numbered circles indicate the{" "}
            <strong>regions to be compared</strong>. Consider the visual pattern
            within the marked circle rather than trying to identify a single
            exact pixel or point.
          </p>
        </>
      )}
      <button onClick={onContinue}>
        {cs ? "Začít cvičení" : "Start Practice"}
      </button>
    </section>
  );
}

export function Training({
  language = "en",
  index,
  onContinue,
}: {
  language?: UiLanguage;
  index: number;
  onContinue: () => void;
}) {
  const item = uiConfig.training[index];
  const [selected, setSelected] = useState("");
  const [checked, setChecked] = useState(false);
  const correct = selected === item.correctAnswer;
  const cs = language === "cs";
  const methodLabel = cs
    ? item.method === "J"
      ? "Bivariantní joyplot"
      : "Bivariantní kartogram"
    : item.methodLabel;
  const question = cs
    ? item.method === "J"
      ? "Ve které označené oblasti je hodnota proměnné B vyšší než hodnota proměnné A?"
      : "Která označená oblast má nízkou hodnotu proměnné A a vysokou hodnotu proměnné B?"
    : item.question;
  const csFeedback =
    item.method === "J"
      ? correct
        ? "Správně. V oblasti 3 je hodnota proměnné B vyšší než hodnota proměnné A. U bivariantního joyplotu porovnávejte výšky profilů uvnitř označené oblasti. Vyšší profil = vyšší hodnota."
        : "Ne tak docela. Správná odpověď je oblast 3. V oblasti 3 je hodnota proměnné B vyšší než hodnota proměnné A. U bivariantního joyplotu porovnávejte výšky profilů uvnitř označené oblasti. Vyšší profil = vyšší hodnota."
      : correct
        ? "Správně. Oblast 2 představuje kombinaci nízké hodnoty proměnné A a vysoké hodnoty proměnné B. U bivariantního kartogramu porovnejte barvu buněk uvnitř označené oblasti s odpovídající pozicí v matici legendy 3 × 3."
        : "Ne tak docela. Správná odpověď je oblast 2. Oblast 2 představuje kombinaci nízké hodnoty proměnné A a vysoké hodnoty proměnné B. U bivariantního kartogramu porovnejte barvu buněk uvnitř označené oblasti s odpovídající pozicí v matici legendy 3 × 3.";
  return (
    <section>
      <h1 className="practice-heading">
        <span>{cs ? `Cvičení ${index + 1} ze 2:` : item.headingPrefix}</span>{" "}
        <strong>{methodLabel}</strong>
      </h1>
      {cs && (
        <p>
          <strong>
            Očíslované kruhy označují oblasti, které máte porovnat. Zaměřte se
            na vizuální vzor uvnitř označeného kruhu, nikoli na jediný přesný
            pixel nebo bod.
          </strong>
        </p>
      )}
      <ImageViewer
        cropChoroplethFrame={item.method === "CH"}
        className="practice-viewer"
        src={item.assetUrl}
        alt={
          cs
            ? `Cvičný podnět – ${methodLabel}`
            : `${item.methodLabel} training stimulus`
        }
      />
      <h2>{question}</h2>
      <fieldset className="answers">
        <legend className="sr-only">
          {cs ? "Vyberte jednu odpověď" : "Choose one response"}
        </legend>
        {[1, 2, 3, 4].map((region) => {
          const id = `region_${region}`;
          return (
            <label
              className={`answer ${selected === id ? "selected" : ""}`}
              key={id}
            >
              <input
                disabled={checked}
                type="radio"
                name="training-answer"
                checked={selected === id}
                onChange={() => setSelected(id)}
              />
              {cs ? "Oblast" : "Region"} {region}
            </label>
          );
        })}
      </fieldset>
      {!checked ? (
        <button disabled={!selected} onClick={() => setChecked(true)}>
          {cs ? "Odeslat odpověď" : "Check answer"}
        </button>
      ) : (
        <div className="training-feedback" role="status">
          {cs ? (
            <p>
              <strong>{csFeedback}</strong>
            </p>
          ) : (
            <>
              <p>
                <strong>
                  {correct
                    ? "Correct."
                    : `Not quite. The correct answer is ${item.correctLabel}.`}
                </strong>
              </p>
              {item.method === "J" ? (
                <>
                  <p>
                    At <strong>Region 3</strong>, Variable B is higher than
                    Variable A.
                  </p>
                  <p>
                    In a bivariate joy plot, compare the ridge heights within
                    the marked region. Remember:
                  </p>
                  <p>
                    <strong>Higher ridge = higher value.</strong>
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Region 2</strong> represents a low value of Variable
                    A and a high value of Variable B.
                  </p>
                  <p>
                    To interpret a bivariate choropleth map, match the colour of
                    the cells within the marked region to the corresponding
                    position in the <strong>3 × 3 legend</strong>.
                  </p>
                </>
              )}
            </>
          )}
          <button onClick={onContinue}>{cs ? "Pokračovat" : item.next}</button>
        </div>
      )}
    </section>
  );
}

function Ready({
  language,
  onStart,
}: {
  language: UiLanguage;
  onStart: () => void;
}) {
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "Můžeme začít" : "Ready to Begin"}</h1>
      {cs ? (
        <>
          <p>
            <strong>Cvičná část je u konce.</strong>
          </p>
          <p>
            Měřená část studie obsahuje <strong>šest otázek</strong>.
          </p>
          <p>
            Na každou otázku odpovězte{" "}
            <strong>co nejpřesněji a bez zbytečného prodlení</strong>.
          </p>
          <p>
            Doba odpovědi se měří od okamžiku, kdy se zobrazí otázka a
            vizualizace, až do odeslání odpovědi.
          </p>
          <p>Vizualizaci můžete podle potřeby přiblížit.</p>
          <p>Po odeslání odpovědi se k předchozí otázce nelze vrátit.</p>
          <p>Pokud je to možné, vyplňte všech šest otázek najednou.</p>
          <p>
            <strong>Test začne po krátkém odpočtu 3–2–1.</strong>
          </p>
        </>
      ) : (
        <>
          <p>The practice is complete.</p>
          <p>
            The measured part of the study contains{" "}
            <strong>six questions</strong>.
          </p>
          <p>
            Please answer each question as{" "}
            <strong>accurately and efficiently as you can</strong>.
          </p>
          <p>
            Your response time will be measured from the moment each question
            and visualisation appear until you submit your answer.
          </p>
          <p>You may enlarge the visualisation if needed.</p>
          <p>
            Once you submit an answer, you cannot return to the previous
            question.
          </p>
          <p>Please complete all six questions in one sitting if possible.</p>
          <p>
            <strong>The test will begin after a short 3–2–1 countdown.</strong>
          </p>
        </>
      )}
      <button onClick={onStart}>{cs ? "Spustit test" : "Start Test"}</button>
    </section>
  );
}

function TrialScreen({
  session,
  language,
  recovered,
  onAcknowledged,
}: {
  session: StudySession;
  language: UiLanguage;
  recovered: number;
  onAcknowledged: (s: StudySession) => void;
}) {
  const position =
    session.current_trial_position ?? session.completed_trials + 1;
  const trial =
    session.trials?.find(
      (item) => item.position === position && !item.completed,
    ) ?? session.trials?.find((item) => item.position === position);
  const [selected, setSelected] = useState("");
  const [onset, setOnset] = useState<number | null>(null);
  const [firstSelection, setFirstSelection] = useState<number | null>(null);
  const [changes, setChanges] = useState(0);
  const [zoomCount, setZoomCount] = useState(0);
  const [zoomDuration, setZoomDuration] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [stimulusError, setStimulusError] = useState(false);
  const zoomStarted = useRef<number | null>(null);
  const maxZoomPct = useRef(100);
  const stimulusImage = useRef<HTMLImageElement | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());
  const startedAt = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!trial) return;
    storage.setActive({
      token: session.session_token,
      position: trial.position,
      restartCount: recovered,
    });
    void api.markTrialStarted(
      session.session_token,
      trial.position,
      recovered > 0,
    );
    let cancelled = false;
    let cancelPaint: (() => void) | undefined;
    const armTimer = async () => {
      const image = stimulusImage.current;
      if (!image) return;
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener(
            "error",
            () => reject(new Error("Displayed stimulus failed to load")),
            { once: true },
          );
        });
      }
      if (typeof image.decode === "function") await image.decode();
      if (!cancelled)
        cancelPaint = afterVisiblePaint((time) => {
          startedAt.current = new Date().toISOString();
          setOnset(time);
        });
    };
    void armTimer().catch(() => setStimulusError(true));
    return () => {
      cancelled = true;
      cancelPaint?.();
    };
  }, [recovered, session.session_token, trial]);
  if (!trial)
    return (
      <Status
        title={
          language === "cs"
            ? "Příprava další otázky…"
            : "Preparing next question…"
        }
        text={language === "cs" ? "Čekejte prosím." : "Please wait."}
      />
    );
  const displayTrial = localiseTrial(trial, language);
  const cs = language === "cs";
  if (stimulusError)
    return (
      <section>
        <h1>{cs ? "Podnět nelze zobrazit" : "Unable to display stimulus"}</h1>
        <p role="alert">
          {cs
            ? "Měření času ještě nezačalo. Obnovte prosím stránku a zkuste tuto otázku znovu."
            : "Timing has not started. Please reload to retry this question."}
        </p>
        <button onClick={() => location.reload()}>
          {copy[language].retry}
        </button>
      </section>
    );

  const choose = (answer: string) => {
    if (submitting || retrying || onset === null) return;
    if (!selected) setFirstSelection(performance.now());
    else if (selected !== answer) setChanges((value) => value + 1);
    setSelected(answer);
  };
  const finishZoom = () => {
    if (zoomStarted.current !== null)
      setZoomDuration(
        (value) => value + performance.now() - zoomStarted.current!,
      );
    zoomStarted.current = null;
  };
  const submit = async () => {
    if (!selected || onset === null || firstSelection === null) return;
    setSubmitting(true);
    setRetrying(false);
    const alreadyPending = storage.getPending();
    const now = performance.now();
    const openZoomDuration =
      zoomStarted.current === null ? 0 : now - zoomStarted.current;
    const metrics: TrialMetrics =
      alreadyPending?.token === session.session_token &&
      alreadyPending.position === trial.position
        ? {
            ...alreadyPending.metrics,
            max_zoom_pct: alreadyPending.metrics.max_zoom_pct ?? 100,
          }
        : {
            selected_answer: selected,
            rt_selection_ms: Math.round((firstSelection - onset) * 1000) / 1000,
            rt_submit_ms: Math.round((now - onset) * 1000) / 1000,
            answer_changes: changes,
            zoom_used: zoomCount > 0,
            zoom_count: zoomCount,
            zoom_duration_ms:
              Math.round((zoomDuration + openZoomDuration) * 1000) / 1000,
            max_zoom_pct: maxZoomPct.current,
            trial_restarted: recovered > 0 || (trial.restart_count ?? 0) > 0,
            restart_count: Math.max(recovered, trial.restart_count ?? 0),
            idempotency_key: idempotencyKey.current,
            trial_started_at: startedAt.current,
          };
    const pending =
      alreadyPending?.token === session.session_token &&
      alreadyPending.position === trial.position
        ? alreadyPending
        : { token: session.session_token, position: trial.position, metrics };
    storage.setPending(pending);
    try {
      const updated = await api.submitTrial(
        pending.token,
        pending.position,
        pending.metrics,
      );
      storage.clearPending();
      storage.clearActive();
      onAcknowledged(updated);
    } catch {
      setRetrying(true);
      setSubmitting(false);
    }
  };
  return (
    <section className="trial" aria-busy={onset === null}>
      <header>
        <p className="eyebrow">
          {cs
            ? `Otázka ${trial.position} ze 6`
            : `Question ${trial.position} of 6`}
        </p>
        <progress value={trial.position} max="6">
          {cs ? `${trial.position} ze 6` : `${trial.position} of 6`}
        </progress>
      </header>
      <h1>{displayTrial.question}</h1>
      <ImageViewer
        cropChoroplethFrame={trial.method === "CH"}
        className="measured-viewer"
        imageRef={stimulusImage}
        interactive={onset !== null}
        src={trial.stimulus_url}
        alt={cs ? "Experimentální mapový podnět" : "Experimental map stimulus"}
        onZoomGesture={() => setZoomCount((value) => value + 1)}
        onZoomStart={() => {
          zoomStarted.current = performance.now();
        }}
        onZoomEnd={finishZoom}
        onZoomChange={(zoomPct) => {
          maxZoomPct.current = Math.max(maxZoomPct.current, zoomPct);
        }}
      />
      <fieldset className="answers">
        <legend className="sr-only">
          {cs ? "Vyberte jednu odpověď" : "Choose one response"}
        </legend>
        {displayTrial.options.map((option) => (
          <label
            className={`answer ${selected === option.id ? "selected" : ""}`}
            key={option.id}
          >
            <input
              type="radio"
              name="answer"
              checked={selected === option.id}
              onChange={() => choose(option.id)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {retrying && (
        <div className="retry" role="alert">
          <p>
            {cs
              ? "Vaše odpověď nebyla potvrzena. Je uložena v tomto zařízení."
              : "Your response has not been confirmed. It is saved on this device."}
          </p>
          <button onClick={() => void submit()}>
            {cs ? "Znovu odeslat" : "Retry submission"}
          </button>
        </div>
      )}
      {!retrying && (
        <button
          disabled={!selected || onset === null || submitting}
          onClick={() => void submit()}
        >
          {submitting
            ? cs
              ? "Ukládání odpovědi…"
              : "Saving response…"
            : cs
              ? "Pokračovat"
              : "Next"}
        </button>
      )}
    </section>
  );
}

export function Preference({
  language = "en",
  onSubmit,
}: {
  language?: UiLanguage;
  onSubmit: (preference: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "Téměř hotovo!" : "Almost done!"}</h1>
      <p>
        {cs
          ? "Ještě poslední otázka týkající se vaší celkové preference."
          : "One last question about your overall preference."}
      </p>
      <h2>
        {cs
          ? "Kterou vizualizační metodu jste celkově preferoval(a)?"
          : "Which visualisation method did you prefer overall?"}
      </h2>
      <fieldset>
        <legend className="sr-only">
          {cs ? "Preference metody" : "Method preference"}
        </legend>
        {[
          [
            "joy_plot",
            cs
              ? "Preferoval(a) jsem bivariantní joyplot."
              : "I preferred the bivariate joy plot.",
          ],
          [
            "bivariate_choropleth",
            cs
              ? "Preferoval(a) jsem bivariantní kartogram."
              : "I preferred the bivariate choropleth map.",
          ],
          [
            "no_preference",
            cs ? "Neměl(a) jsem žádnou preferenci." : "I had no preference.",
          ],
        ].map(([id, label]) => (
          <label className="choice" key={id}>
            <input
              type="radio"
              name="preference"
              checked={value === id}
              onChange={() => setValue(id)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button
        disabled={!value || saving}
        onClick={async () => {
          setSaving(true);
          try {
            await onSubmit(value);
          } catch {
            setError(
              cs
                ? "Vaši preferenci se nepodařilo uložit. Zkuste to prosím znovu."
                : "Your preference could not be saved. Please retry.",
            );
            setSaving(false);
          }
        }}
      >
        {saving
          ? cs
            ? "Ukládání…"
            : "Saving…"
          : cs
            ? "Odeslat odpověď"
            : "Submit"}
      </button>
    </section>
  );
}

function Resume({
  session,
  language,
  onResume,
}: {
  session: StudySession;
  language: UiLanguage;
  onResume: () => void;
}) {
  const cs = language === "cs";
  return (
    <section>
      <h1>{cs ? "Pokračovat ve studii" : "Continue your study"}</h1>
      <p>
        {cs
          ? `Našli jsme vaši uloženou relaci. Dokončili jste ${session.completed_trials} ze 6 měřených otázek.`
          : `We found your saved session. You have completed ${session.completed_trials} of 6 measured questions.`}
      </p>
      <p>
        {cs
          ? "Pokud byla otázka přerušena, její měření času začne znovu a přerušení bude zaznamenáno."
          : "If a question was interrupted, its timing will restart and the interruption will be recorded."}
      </p>
      <button onClick={onResume}>
        {session.status === "preference_recorded"
          ? cs
            ? "Dokončit studii"
            : "Finish study"
          : cs
            ? "Pokračovat"
            : "Resume"}
      </button>
    </section>
  );
}

function ThankYou({ language }: { language: UiLanguage }) {
  const cs = language === "cs";
  return (
    <section className="status">
      <h1>{cs ? "Děkujeme!" : "Thank You!"}</h1>
      {cs ? (
        <p>
          Děkujeme za účast ve studii. Vaše odpovědi byly úspěšně zaznamenány.
        </p>
      ) : (
        <>
          <p>Thank you for taking part in this study.</p>
          <p>Your responses have been recorded successfully.</p>
        </>
      )}
      <nav
        className="contact-links"
        aria-label={
          cs
            ? "Kontakt na výzkumníka a publikace"
            : "Researcher contact and publication"
        }
      >
        <a
          href="https://www.linkedin.com/in/josef-m%C3%BCnzberger-a71a29204/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Josef Münzberger on LinkedIn"
        >
          <ContactIcon kind="linkedin" />
          LinkedIn
        </a>
        <a
          href="mailto:josef.munzberger@fsv.cvut.cz"
          aria-label={
            cs ? "E-mail Josefovi Münzbergerovi" : "Email Josef Münzberger"
          }
        >
          <ContactIcon kind="mail" />
          {cs ? "E-mail" : "josef.munzberger@fsv.cvut.cz"}
        </a>
        <a
          href="https://doi.org/10.1080/00087041.2026.2715285"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            cs
              ? "Článek o bivariantních joyplotech"
              : "Bivariate Joy Plot article"
          }
        >
          <ContactIcon kind="article" />
          {cs
            ? "Článek o bivariantních joyplotech"
            : "Bivariate Joy Plot article"}
        </a>
      </nav>
    </section>
  );
}

function Status({ title, text }: { title: string; text: string }) {
  return (
    <section className="status">
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function ContactIcon({ kind }: { kind: "linkedin" | "mail" | "article" }) {
  if (kind === "linkedin")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6.5 8.3H3.2V21h3.3V8.3ZM4.8 3A1.9 1.9 0 1 0 4.8 6.8 1.9 1.9 0 0 0 4.8 3ZM21 13.7c0-3.8-2-5.6-4.8-5.6a4.2 4.2 0 0 0-3.8 2.1V8.3H9.1V21h3.3v-6.3c0-1.7.3-3.3 2.4-3.3 2 0 2.1 1.9 2.1 3.4V21H21v-7.3Z" />
      </svg>
    );
  if (kind === "mail")
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3 5h18v14H3V5Zm2 2v.5l7 5 7-5V7H5Zm14 10V10l-7 5-7-5v7h14Z" />
      </svg>
    );
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 3h10l4 4v14H5V3Zm2 2v14h10V9h-4V5H7Zm2 7h6v2H9v-2Zm0 4h6v2H9v-2Z" />
    </svg>
  );
}
