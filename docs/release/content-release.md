# Content release and rollback

> This draft predates the approved release flow in [CI and releases](ci-and-release.md), which replaces its tags with the Release PR and the **Ship update** button. Task M6.9 rewrites it.

This is for production, which doesn't exist yet. Until then, content fixes reach testers as a Preview update when they merge to `master`.

## Publish a content update

1. Have the owner review wording, evidence, grading, attribution and notification copy. Mark only approved entries published and record the owner as reviewer.
2. Copy sources using the existing import workflow. Keep released Sunnah IDs, tick keys, notification IDs and Android channel IDs stable.
3. Regenerate the calendar with `pnpm --filter @adwam/content calendar`. Run `pnpm --filter @adwam/content validate --release`, `pnpm --filter @adwam/content check-links` and `pnpm check`. Open any unverified links and save the check results.
4. Compare the native runtime fingerprint with the installed release. If it changed, build a new Android app release. Confirm the update against a signed Preview on the same runtime and retain the source-map result.
5. Tag the approved commit with a `content-*` tag. The approved production workflow publishes the update at 10% to the matching runtime. Record the previous and new update group IDs, content versions and runtime fingerprint. Broaden the rollout when Sentry and the Preview and release checks are clear.

## Roll back content

1. Confirm the affected channel, platform, and runtime. Record the bad group ID and the last known-good group on that runtime.
2. During a partial rollout, use the approved rollback path to revert the rollout to its control update. For a fully served update, republish the compatible known-good group. Use rollback to the embedded bundle when it is the verified known-good version. [Expo rollout and rollback options](https://docs.expo.dev/eas-update/rollouts/) · [Expo runtime compatibility](https://docs.expo.dev/eas-update/runtime-versions/).
3. Production rollback goes through the approved Actions path. Check the account before EAS CLI commands. Verify that a test phone downloads and starts the restored content, retains ticks, and rebuilds its notification schedule.
4. Reopen the content change and record the reason, the restored group or embedded build, and the verification in the incident.
