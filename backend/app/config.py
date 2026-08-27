import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ExperimentConfig:
    tasks: dict
    option_sets: dict
    versions: dict
    answers: dict

    @classmethod
    def load(cls, directory: Path) -> "ExperimentConfig":
        tasks_doc = json.loads((directory / "tasks.public.json").read_text())
        versions_doc = json.loads((directory / "versions.json").read_text())
        answers_doc = json.loads((directory / "answer_key.server.json").read_text())
        return cls(
            tasks={item["id"]: item for item in tasks_doc["tasks"]},
            option_sets=tasks_doc["option_sets"],
            versions=versions_doc["versions"],
            answers=answers_doc["answers"],
        )

    def trial(self, version: str, position: int) -> dict:
        assignment = next(x for x in self.versions[version] if x["position"] == position)
        task = self.tasks[assignment["task_id"]]
        method = assignment["method"]
        return {
            "position": position,
            "task_id": task["id"],
            "task_family": task["family"],
            "geography": task["geography"],
            "pair": task["pair"],
            "method": method,
            "question": task["question"],
            "stimulus_filename": task["assets"][method],
            "options": task["option_set_id"],
        }
