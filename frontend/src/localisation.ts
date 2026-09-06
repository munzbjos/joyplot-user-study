import type { Option, SafeTrial, UiLanguage } from "./types";

const csQuestions: Record<string, string> = {
  T1a01: "Která ze čtyř označených oblastí má nejvyšší hodnotu proměnné A?",
  T1a02: "Která ze čtyř označených oblastí má nejvyšší hodnotu proměnné B?",
  T1a03: "Která ze čtyř označených oblastí má nejnižší hodnotu proměnné A?",
  T1b01: "Která označená oblast má nízkou hodnotu proměnné B?",
  T1b02: "Která označená oblast má vysokou hodnotu proměnné B?",
  T1b03: "Která označená oblast má nízkou hodnotu proměnné A?",
  T2a01:
    "Která označená oblast má vysokou hodnotu proměnné A a zároveň vysokou hodnotu proměnné B?",
  T2a02:
    "Která označená oblast má vysokou hodnotu proměnné A a zároveň nízkou hodnotu proměnné B?",
  T2a03:
    "Která označená oblast má nízkou hodnotu proměnné A a zároveň nízkou hodnotu proměnné B?",
  T2a04:
    "Která označená oblast má nízkou hodnotu proměnné A a zároveň vysokou hodnotu proměnné B?",
  T2a05:
    "Která označená oblast má vysokou hodnotu proměnné A a zároveň vysokou hodnotu proměnné B?",
  T2a06:
    "Která označená oblast má nízkou hodnotu proměnné A a zároveň vysokou hodnotu proměnné B?",
  T3a01:
    "Který popis nejlépe vystihuje celkový prostorový vztah mezi proměnnou A a proměnnou B?",
  T3a02:
    "Který popis nejlépe vystihuje celkový prostorový vztah mezi proměnnou A a proměnnou B?",
  T3a03:
    "Který popis nejlépe vystihuje celkový prostorový vztah mezi proměnnou A a proměnnou B?",
  T3a04:
    "Který popis nejlépe vystihuje celkový prostorový vztah mezi proměnnou A a proměnnou B?",
  T3a05:
    "Který popis nejlépe vystihuje celkový prostorový vztah mezi proměnnou A a proměnnou B?",
  T3a06:
    "Který popis nejlépe vystihuje celkový prostorový vztah mezi proměnnou A a proměnnou B?",
};

const csOptions: Record<string, string> = {
  region_1: "Oblast 1",
  region_2: "Oblast 2",
  region_3: "Oblast 3",
  region_4: "Oblast 4",
  positive: "Převážně pozitivní vztah",
  negative: "Převážně negativní vztah",
  local_anomaly: "Celkově podobný prostorový vzor s lokální anomálií",
  no_clear_relationship: "Žádný zřetelný prostorový vztah",
};

export function localiseTrial(
  trial: SafeTrial,
  language: UiLanguage,
): SafeTrial {
  if (language === "en") return trial;
  return {
    ...trial,
    question: csQuestions[trial.task_id] ?? trial.question,
    options: trial.options.map((option: Option) => ({
      ...option,
      label: csOptions[option.id] ?? option.label,
    })),
  };
}

export const copy = {
  en: {
    preparing: "Preparing study…",
    connectionError:
      "The study could not connect to the server. Please try again.",
    recoverError: "The assigned trials could not be recovered. Please retry.",
    stimuliError:
      "The stimuli could not be prepared. Check your connection and retry; timing has not started.",
    measuredStartError:
      "The measured test could not be started. No trial timing has begun.",
    savedRecoverError:
      "The saved session could not be recovered. Please retry.",
    gateTitle: "A larger screen is required",
    gateText:
      "This study requires a desktop or laptop computer with a larger screen.",
    gateSaved: "Your progress is saved. You may continue on a suitable device.",
    continue: "Continue",
    back: "Back",
    retry: "Retry",
    unableContinue: "Unable to continue",
  },
  cs: {
    preparing: "Příprava studie…",
    connectionError:
      "Ke studii se nepodařilo připojit. Zkuste to prosím znovu.",
    recoverError:
      "Přiřazené úlohy se nepodařilo obnovit. Zkuste to prosím znovu.",
    stimuliError:
      "Podněty se nepodařilo připravit. Zkontrolujte připojení a zkuste to znovu; měření času ještě nezačalo.",
    measuredStartError:
      "Měřenou část se nepodařilo spustit. Měření času žádné úlohy nezačalo.",
    savedRecoverError:
      "Uloženou relaci se nepodařilo obnovit. Zkuste to prosím znovu.",
    gateTitle: "Je vyžadována větší obrazovka",
    gateText:
      "Tato studie vyžaduje stolní počítač nebo notebook s větší obrazovkou.",
    gateSaved: "Váš postup je uložen. Můžete pokračovat na vhodném zařízení.",
    continue: "Pokračovat",
    back: "Zpět",
    retry: "Zkusit znovu",
    unableContinue: "Nelze pokračovat",
  },
} as const;
