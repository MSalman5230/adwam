# Staging acceptance

Use the signed Adwam Preview APK and the Supabase staging project. Record the EAS build ID, version code, update ID if applicable, and device. Follow the [Android reminder test](notification-test.md) separately for the physical-device week.

1. Install Preview afresh, pick a city, choose Recommended, and allow notifications. Check that Today opens and the app syncs. For the push test, pick a city that is outside quiet hours now.
2. In Settings → Developer tools, choose **Rain starting now** without setting a debug time or Moment. Check Today for the rain card. Background the app, then check that the next push-sender run delivers the notification, that tapping it opens the rain detail, and that Expo returns a receipt. Repeating the simulation should not add a second event or push for that install.
3. Follow the [correction runbook](publish-correction.md) using a staging test region and test install. Verify the emailed sign-in link, publish and withdraw, then check **Use**, **Keep my dates** and **Undo** in Preview. Do not send a simulated correction to unrelated testers.
4. With a local tracker already populated, open Settings → Privacy → **Delete my data from the server**. Confirm, check that the app reports success and the rain is cleared, and recheck the tracker. Also confirm that the disposable anonymous Auth user is gone.
5. Run **Weather health** after a quarter-hour boundary. A passing result requires a completed `weather-tick` and forecast calls below budget. Manual runs also log aggregate staging push outcomes and successful Expo receipts for the last hour, without identifiers. Receipts become eligible for checking 15 minutes after sending, then wait for the next scheduled `push-receipts` run. [Incident runbook](incidents.md)

## 25 November 2026 verification

Signed Android Preview `0.1.0`, version code `15`, on the Pixel 6 emulator. The APK and the latest listed Preview update group `1f6ddc70-6377-4c66-9b58-f987245e1aec` have the same native fingerprint, `cf9f1d596527b5f7019958cf7cc1a5a18e4a2411`. Update and rollback on a device are still to be verified. [EAS build](https://expo.dev/accounts/msalman5230/projects/adwam/builds/18d7dc7c-1dca-470f-b4c2-ecbaa08dc766)

- Staging accepted a fresh anonymous sign-in and install sync. The app could read the config and corrections. The staging rain RPC returned a card and reused the same event on repeat. `forget_me_v1` removed the disposable test account from Auth.
- The signed APK completed setup with London and notifications allowed. **Rain starting now** showed the rain on Today with Open-Meteo credit. No remote push was observed during this run.
- On the signed APK, Privacy reported that server data was deleted. The previously logged Thursday fast stayed checked afterward.
- Fresh In-app only setup reached Today in airplane mode. Today, the prayer anchors, the consent notice and the tab bar were readable in dark mode at Android font scale 2.0. This was a spot check, not the full accessibility pass.
- The post-setup diagnostic found both Vault entries and successful cron invocations, but all six recent HTTP responses were 401. After the owner corrected `ADWAM_JOB_KEY`, staging weather health passed on both the diagnostic branch and `master`. [401 diagnostic](https://github.com/MSalman5230/adwam/actions/runs/45652654067) · [Passing master run](https://github.com/MSalman5230/adwam/actions/runs/45660404476)
- A fresh Preview install choosing Stanley, Falkland Islands, with notifications allowed showed simulated rain and queued one weather push. The push stayed queued through the next sender cycle. No sender run completed and `EXPO_ACCESS_TOKEN` was missing from staging Edge Function secrets. Retry delivery and receipts once the Expo access token is configured. [Push diagnostic](https://github.com/MSalman5230/adwam/actions/runs/45662265949)
- After the owner saved `EXPO_ACCESS_TOKEN`, Expo accepted one weather push and one correction push. Both appeared in Android's notification shade. The weather notification opened the rain detail and the correction notification opened Today with the offer. Expo receipts were not yet due at the time of that check. [Delivery run](https://github.com/MSalman5230/adwam/actions/runs/45667562535)
- The approved admin redeemed a fresh staging sign-in link for the test. The session access token alone passed the admin check and published a disposable correction for exactly one Preview install in the Falkland Islands. **Keep my dates**, **Use**, and **Undo** worked. The accepted correction appeared in the Hijri date sheet and was removed after the admin withdrew it. The hosted page's normal same-browser link callback still needs a post-deploy check. [Correction admin setup](../development-setup.md#correction-admin-sign-in)

## 26 November 2026 verification

### Signed Preview

| Field | Value |
| --- | --- |
| Test device | Pixel 6 emulator, Android 16 |
| APK | [EAS build `83b69357-401c-4ae2-a191-72841439c9fd`](https://expo.dev/accounts/msalman5230/projects/adwam/builds/83b69357-401c-4ae2-a191-72841439c9fd) |
| App version and Android version code | `0.1.0`, `16` |
| Native fingerprint | `c4aa73fd72724cd49141a9d85b68bf783af44f42` |
| Content version | `2026.11.22` |
| Tested update commit | `6f3872f01e924542f97f8ac7bc6e0b591b536432` |
| Android update ID | `01a214da-22b4-7a44-bfa0-829c3d7f3ccb` ([restored update group](https://expo.dev/accounts/msalman5230/projects/adwam/updates/c7c52e42-e502-4cbc-968f-37a74467f63f)) |

The fingerprint changed after build 15. The manual build workflow checked the APK's permissions and reused build 16, which matched `master`. The APK was signed and installed successfully. Only workflow and documentation changes separate its build commit from the tested update commit. [Android Preview build run](https://github.com/MSalman5230/adwam/actions/runs/45712807188)

### Confirmed by the owner

- The physical-phone reminder week passed. This covers [#58](https://github.com/MSalman5230/adwam/issues/58) and [#10](https://github.com/MSalman5230/adwam/issues/10).
- The emailed admin link returned to the hosted admin page and signed the admin in. The owner tested the page at `/adwam/`. The staging page now lives at `/adwam/staging/`. [Admin sign-in setup](../development-setup.md#correction-admin-sign-in)
- On the owner's phone, Arabic letters join correctly, vowel marks render, and text is not clipped. [#78](https://github.com/MSalman5230/adwam/issues/78)
- Startup speed on the signed Preview was accepted. [#76](https://github.com/MSalman5230/adwam/issues/76)
- The privacy notice was published. [Privacy notice](https://msalman5230.github.io/adwam/privacy/) · [PR #187](https://github.com/MSalman5230/adwam/pull/187)

### Agent checks

- **Preview update and rollback passed.** The emulator first ran the bundled app offline. It saved Stanley, a +1-day Hijri offset, dark appearance, Yes for this year's Uḍḥiyah, and a Thursday fast tick. After reconnecting and restarting, the Android update cache recorded a successful launch of update `01a214d3-1dfa-7666-a396-1e38317498cf`. The emulator then launched rollback update `01a214d9-d945-77d7-a914-14bffe555c2e`. The `preview` channel was restored to the latest `master` bundle and the emulator launched it. The settings and both trackers stayed. [GitHub staging deploy](https://github.com/MSalman5230/adwam/actions/runs/45713175032) · [First update group](https://expo.dev/accounts/msalman5230/projects/adwam/updates/c235018b-284a-47d4-bbf6-0fd6bcd180dc) · [Rollback group](https://expo.dev/accounts/msalman5230/projects/adwam/updates/84bafc18-fdf7-478c-8644-c08fa133580f) · [Restored group](https://expo.dev/accounts/msalman5230/projects/adwam/updates/c7c52e42-e502-4cbc-968f-37a74467f63f)
- **Privacy passed.** About's **Privacy notice** link loaded the published page in Android Chrome on retry. On a fresh install, neither consent choice was selected and usage statistics was off. Both switches changed and survived a restart. Turning off crash reports also disabled the Sentry test control. Usage statistics was switched off again. Preview does not send PostHog events. [Published notice](https://msalman5230.github.io/adwam/privacy/)
- **Weather and push passed.** The first manual check found a recent weather tick and calls below budget. Its one-hour window contained no pushes. A fresh rain simulation sent a weather notification to build 16, and tapping it opened the rain detail. The next check showed one weather push sent and no receipt yet. The 23:08 UTC check after the scheduled receipt worker showed two weather pushes sent and two successful Expo receipts. Weather was still current and within budget. [First health check](https://github.com/MSalman5230/adwam/actions/runs/45712749452) · [Send check](https://github.com/MSalman5230/adwam/actions/runs/45714970317) · [Receipt check](https://github.com/MSalman5230/adwam/actions/runs/45718915757)
- **Correction push.** Weather and correction pushes use the same push-sender and push-receipts workers. Expo accepted a real correction push on 25 November. The owner accepted the weather receipt as evidence for the shared receipt path. No fresh correction was sent and no correction receipt was claimed. [25 November delivery run](https://github.com/MSalman5230/adwam/actions/runs/45667562535)
- **Content passed.** `pnpm content:check --release` validated 32 entries. `pnpm --filter @adwam/content calendar --check` found the generated calendar current. No source-link issue was open. [Latest completed Source links run](https://github.com/MSalman5230/adwam/actions/runs/45195973407)
- **Light and dark comparison.** Compared Setup and the Friday morning Moment with the prototype. Checked Today, Upcoming, Settings, Reminders, a Sunnah detail, Privacy and About. The unchecked checkbox outline was much fainter on Today and on the detail screen in both themes. The fix uses the same ink token as the prototype, with a test for each theme. A Reminders title also appeared clipped in one light-mode capture and in the failing workflow screenshot. It appeared in full on a manual retry. Recheck the title and the checkbox on signed Preview after the fixes deploy. [Design reference](../mobile-app-ui.html) · [Checkbox fix](https://github.com/MSalman5230/adwam/pull/207) · [Workflow screenshots](https://github.com/MSalman5230/adwam/actions/runs/45713972869/artifacts/15071222200)
- **TalkBack and 200% font size.** TalkBack moved focus on the Reminders and detail screens. The accessibility focus outline and Android's active accessibility window confirmed it was in the app. At 200% font size, the first setup screen, main navigation, Today and prayer times, Upcoming, a detail, Settings, Reminders, Privacy, and About stayed readable and usable.
- **Offline paths passed.** Fresh setup reached Today in airplane mode. A later offline cold start kept the installed update and local data. Today, prayer times, the Fasts filter in Upcoming, a Sunnah detail, Settings, and About opened offline. The test Friday reminder also appeared in Android's notification shade with the app in the background. A server-data deletion attempt stayed on the confirmation sheet and showed a connection error instead of reporting success.
- **Android end-to-end failed one of five flows on the tested commit.** Maestro stopped scrolling with only the edge of the fasting-pause switch visible. It could not find the label it used to locate the switch. The same kind of selector failed for the Monthly switch in an earlier run. The pause switch, 3-day choice and unpause worked by hand on signed Preview. The fix gives both switches stable test IDs and scrolls them away from the header before tapping. The new component test passed. The fixed flow still needs a passing Android run. [Tested commit run](https://github.com/MSalman5230/adwam/actions/runs/45713972869) · [Earlier selector failure](https://github.com/MSalman5230/adwam/actions/runs/45381697853) · [Passing preceding run](https://github.com/MSalman5230/adwam/actions/runs/45712807200) · [Selector fix](https://github.com/MSalman5230/adwam/pull/209) · [Fix workflow run](https://github.com/MSalman5230/adwam/actions/runs/45720422559)
- **Sentry stack check pending owner confirmation.** Developer tools triggered `Adwam preview test crash` on 25 November 2026 at 22:38:18 UTC. The Android log showed the expected error. The staging deploy uploaded the source maps successfully. The owner will confirm whether the stack is readable and provide the event link. [Passing source-map upload](https://github.com/MSalman5230/adwam/actions/runs/45713175032)
- **Windows native tests.** The default Jest glob silently skipped the native suites in this Windows worktree. The discovery fix includes a regression test. All 22 native tests passed with the fix. [Windows test discovery fix](https://github.com/MSalman5230/adwam/pull/206)

### Owner approval

**D7. Suggested prayer methods.** These are suggestions, not requirements. The user can choose any available method. [Country mapping](../../packages/core/src/places.ts)

| Country | Suggested method |
| --- | --- |
| Afghanistan, Bangladesh, India, Pakistan | University of Islamic Sciences, Karachi |
| Canada, United States | Islamic Society of North America |
| Egypt | Egyptian General Authority of Survey |
| Indonesia, Malaysia, Singapore | Singapore |
| Kuwait | Kuwait |
| Qatar | Qatar |
| Saudi Arabia | Umm al-Qura |
| Türkiye | Diyanet |
| United Arab Emirates | Dubai |
| All other countries | Muslim World League |

Moonsighting Committee is also available as a manual choice.

**D9. Eclipse note.** Some scholars tie the prayer to seeing the eclipse. The phone calculates the visible window for your location. It does not check cloud cover. Version 1 includes local solar eclipses and partial or total lunar eclipses. It leaves out penumbral lunar eclipses. [Eclipse content](../../packages/content/sunnah/weather.yaml)
