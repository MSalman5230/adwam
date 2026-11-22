#!/usr/bin/env bash
set -euo pipefail

identity=$(FORCE_COLOR=0 NO_COLOR=1 eas whoami)
if grep -Fqx -e 'msalman5230' -e 'msalman5230 (authenticated using EXPO_TOKEN)' <<< "$identity"; then
  echo 'Verified the msalman5230 EAS account.'
elif grep -Eq '(^robot| \(robot\)) \(authenticated using EXPO_TOKEN\)$' <<< "$identity" &&
  [[ $(grep -c '^• ' <<< "$identity") == 1 ]] &&
  grep -Eq '^• msalman5230 \(Role: .+\)$' <<< "$identity"; then
  echo 'Verified the Expo robot is scoped to the msalman5230 account.'
else
  echo 'EAS did not confirm the msalman5230 account for the staging build credential.' >&2
  exit 1
fi
