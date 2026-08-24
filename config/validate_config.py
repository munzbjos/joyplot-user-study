#!/usr/bin/env python3
from pathlib import Path
import json
from collections import Counter, defaultdict

BASE = Path(__file__).resolve().parent
tasks_cfg = json.loads((BASE / "tasks.public.json").read_text(encoding="utf-8"))
versions_cfg = json.loads((BASE / "versions.json").read_text(encoding="utf-8"))
answers_cfg = json.loads((BASE / "answer_key.server.json").read_text(encoding="utf-8"))

tasks = tasks_cfg["tasks"]
versions = versions_cfg["versions"]
answers = answers_cfg["answers"]
task_by_id = {t["id"]: t for t in tasks}
errors = []

expected_geo_pairs = {
    ("CZ", "P1"), ("CZ", "P2"), ("CZ", "P3"),
    ("FR", "P1"), ("FR", "P2"), ("FR", "P3"),
}

task_method_counts = Counter()
position_method_counts = defaultdict(Counter)

for version, trials in versions.items():
    if len(trials) != 6:
        errors.append(f"{version}: expected 6 trials")
        continue
    if Counter(x["method"] for x in trials) != Counter({"J": 3, "CH": 3}):
        errors.append(f"{version}: not 3 J + 3 CH")
    meta = [task_by_id[x["task_id"]] for x in trials]
    if Counter(x["geography"] for x in meta) != Counter({"CZ": 3, "FR": 3}):
        errors.append(f"{version}: not 3 CZ + 3 FR")
    if Counter(x["family"] for x in meta) != Counter({"T1": 2, "T2": 2, "T3": 2}):
        errors.append(f"{version}: not 2 T1 + 2 T2 + 2 T3")
    if {(x["geography"], x["pair"]) for x in meta} != expected_geo_pairs:
        errors.append(f"{version}: missing/duplicated geography-pair")
    for x in trials:
        task_method_counts[(x["task_id"], x["method"])] += 1
        position_method_counts[x["position"]][x["method"]] += 1

for t in tasks:
    for method in ("J", "CH"):
        if task_method_counts[(t["id"], method)] != 1:
            errors.append(f"{t['id']} {method}: occurrence count != 1")

for pos in range(1, 7):
    if position_method_counts[pos] != Counter({"J": 3, "CH": 3}):
        errors.append(f"position {pos}: not 3 J + 3 CH")

for a, b in versions_cfg["complementary_pairs"]:
    for xa, xb in zip(versions[a], versions[b]):
        if xa["task_id"] != xb["task_id"] or xa["position"] != xb["position"]:
            errors.append(f"{a}/{b}: task/position mismatch")
        if xa["method"] == xb["method"]:
            errors.append(f"{a}/{b}: methods not opposite")

if set(answers) != set(task_by_id):
    errors.append("answer key IDs != task IDs")

# Optional asset directory check:
stimulus_dir = BASE / "stimuli"
if stimulus_dir.exists():
    expected_files = {
        filename
        for task in tasks
        for filename in task["assets"].values()
    }
    actual_files = {p.name for p in stimulus_dir.glob("*.png")}
    missing = expected_files - actual_files
    extra = actual_files - expected_files
    if missing:
        errors.append(f"missing PNGs: {sorted(missing)}")
    if extra:
        print(f"WARNING: extra PNGs: {sorted(extra)}")

if errors:
    print("EXPERIMENT CONFIGURATION: FAIL")
    for e in errors:
        print(" -", e)
    raise SystemExit(1)

print("EXPERIMENT CONFIGURATION: PASS")
print(f" - {len(tasks)} tasks")
print(" - 6 versions × 6 trials")
print(" - 3 J + 3 CH per version")
print(" - 3 CZ + 3 FR per version")
print(" - 2 T1 + 2 T2 + 2 T3 per version")
print(" - each task appears once as J and once as CH")
print(" - complementary pairs validated")
