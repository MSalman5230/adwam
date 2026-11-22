# Android app release

Production begins after the owner provisions its own Supabase project, scoped credentials, EAS settings, and the GitHub production environment. The owner approves production deploys in GitHub Actions. Use Preview for the release rehearsal.

## Before tagging

1. Confirm the owner approved the content, privacy notice, licensing and store listing. Confirm the data-protection review and physical notification tests are complete and the release-blocker list is empty. [Play listing and Data safety review](../release/android/store-review.html) · [Privacy policy draft](../release/android/privacy-policy.html)
2. Check out the intended release commit. Start local Supabase with `pnpm db:start`. Run `pnpm check`, `pnpm db:test`, `pnpm server:test`, and `pnpm --filter @adwam/content validate --release`. Run Android end-to-end tests on the same commit and retain the JUnit report and screenshots.
3. Install the signed Preview and repeat offline Setup through Today, notification delivery and tap, push receipt, and the date-correction flow. Check that Sentry shows app filenames and line numbers for a Preview test crash.
4. Confirm the Android target API against the [current Play requirement](https://support.google.com/googleplay/android-developer/answer/11926878). Compare the bundle manifest with the signed Preview and verify the package, version code, and required permissions. Confirm the native fingerprint and update channel.
5. Confirm the release note, migrations, the last known-good commit and update group, and the app version that can read the new backend schema.

## Publish and monitor

1. Use the release tag for the approved commit. The production Actions run applies migrations, deploys functions, and creates the signed AAB after the owner approves it.
2. For the first release, the owner uploads that bundle to Play internal testing and enables Play App Signing. Later uploads use the approved automation and the Play service account. [Play release steps](https://support.google.com/googleplay/android-developer/answer/9859348).
3. Verify the installed Play build on a phone. Check setup, debug tools disabled, Android notification channels, weather, corrective push routing, and source maps. Monitor staging and production as separate projects.
4. Collect closed-test feedback, address release blockers, and confirm the account meets the Play Console's testing requirement. After production access, roll out at 10%, 50% and 100% with owner approval at each step. Check crash-free sessions, the weather health workflow, and push receipts before increasing a rollout.
5. If the new binary is unsafe to serve, halt the Play rollout and prepare a fixed bundle with a newer version code. If the issue affects a JavaScript or content update, follow [content release and rollback](content-release.md).

Record the tag, build ID, Android version code, runtime fingerprint, Play track and date, source-map result, and links to the checks in the release record.
