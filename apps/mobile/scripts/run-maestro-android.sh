#!/usr/bin/env bash
set -euo pipefail

run_suite() {
  local results=$1
  mkdir -p "$results" || return
  maestro test -e APP_ID=com.msalman5230.adwam.dev --format junit \
    --output "$results/results.xml" --debug-output "$results" \
    --test-output-dir "$results" apps/mobile/.maestro
}

timeout 30s adb wait-for-device
if run_suite maestro-results/first; then
  exit 0
fi

# The driver reports an Android transport loss as an unknown error in JUnit.
# Keep the first run's evidence and retry only if that caused every failure.
python3 - maestro-results/first <<'PY'
import re
import sys
from pathlib import Path
from xml.etree import ElementTree

results = Path(sys.argv[1])
report = results / "results.xml"
if not report.is_file():
    sys.exit(1)

failures = [case for case in ElementTree.parse(report).iter("testcase") if case.find("failure") is not None]
logs = {log.parents[1].name: log for log in results.glob("*/*/logs/maestro.log")}
transport_loss = re.compile(
    r"\[Command execution\].*Command failed \(host:transport:[^)]+\): device (?:offline|'[^']+' not found)"
)
if not failures:
    sys.exit(1)
for case in failures:
    log = logs.get(case.attrib["name"])
    if case.findtext("failure") != "Unknown error" or not log or not transport_loss.search(log.read_text(encoding="utf-8")):
        sys.exit(1)
PY

echo 'Android emulator connection dropped. Retrying the suite once with a fresh driver.'
timeout 30s adb wait-for-device
run_suite maestro-results/retry
