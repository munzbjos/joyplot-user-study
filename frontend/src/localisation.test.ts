import { describe, expect, it } from "vitest";
import { localiseTrial } from "./localisation";
import type { SafeTrial } from "./types";

const relationship: SafeTrial = {
  position: 1,
  task_id: "T3a01",
  method: "J",
  question: "Which description?",
  stimulus_url: "/stimuli/example.png",
  completed: false,
  options: [
    { id: "positive", label: "Predominantly positive relationship" },
    { id: "negative", label: "Predominantly negative relationship" },
    {
      id: "local_anomaly",
      label: "Similar overall pattern with a local anomaly",
    },
    { id: "no_clear_relationship", label: "No clear spatial relationship" },
  ],
};

describe("measured-task localisation", () => {
  it("preserves canonical English trial objects", () =>
    expect(localiseTrial(relationship, "en")).toBe(relationship));
  it("translates labels without changing task or response codes", () => {
    const translated = localiseTrial(relationship, "cs");
    expect(translated.question).toBe(
      "Který popis nejlépe vystihuje celkový prostorový vztah mezi proměnnou A a proměnnou B?",
    );
    expect(translated.options.map((option) => option.id)).toEqual(
      relationship.options.map((option) => option.id),
    );
    expect(translated.options.map((option) => option.label)).toEqual([
      "Převážně pozitivní vztah",
      "Převážně negativní vztah",
      "Celkově podobný prostorový vzor s lokální anomálií",
      "Žádný zřetelný prostorový vztah",
    ]);
  });
});
