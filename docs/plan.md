# Plan

Adwam version 1 for Android is built. This file lists what is left before it is complete on staging, and the rules that still apply. The deliverable is a signed Adwam Preview APK, installed directly from EAS, backed by Supabase staging and the staging correction admin page. The production pipeline and the Google Play release are being built alongside, in [Production CI and Google Play](#production-ci-and-google-play). iOS comes after that.

Read [mobile-app-architecture.md](mobile-app-architecture.md) for how the system works, and [mobile-app-ui.html](mobile-app-ui.html) for every screen. The original task-by-task build plan for milestones 0–6 is in Git history: `git show 5bc5a46:docs/plan.md`.

## Where things stand

Checked on 26 November 2026. Every version 1 feature is built and merged, and 70 of the 77 staging tasks are closed. The rest is proving the app on real phones and on staging. The owner accepted startup speed, and the privacy notice is published.

| Milestone | Built | Still open |
|---|---|---|
| M0 Foundations | Workspace, CI, local Supabase, Expo app, issue tracking | M0.7 risk tests on real phones ([#10](https://github.com/MSalman5230/adwam/issues/10)) |
| M1 Engine and content | Hijri calendar, prayer times, reminder rules, eclipses, weather detection, notification plan, content files and evidence | — |
| M2 App shell and Today | Theme, components, saved state, navigation, Setup, Today, Sunnah detail, Sentry | — |
| M3 Remaining screens | Upcoming, Settings and its sheets, Reminders, About, Developer tools | — |
| M4 Local notifications | Channels, scheduling, Done and Later, background task, permission check | M4.8 a week on real phones ([#58](https://github.com/MSalman5230/adwam/issues/58)) |
| M5 Server | Tables and access rules, app and admin RPCs, weather and push functions, corrections, admin page, staging deploys and health check | Staging checks for M5.12–M5.14 ([#70](https://github.com/MSalman5230/adwam/issues/70), [#71](https://github.com/MSalman5230/adwam/issues/71), [#72](https://github.com/MSalman5230/adwam/issues/72)) |
| M6 Hardening | Accessibility, PostHog with consent, end-to-end tests, offline recovery, licence, privacy notice | M6.4 speed, accepted by the owner ([#76](https://github.com/MSalman5230/adwam/issues/76)), M6.6 content on phones ([#78](https://github.com/MSalman5230/adwam/issues/78)) |

Already verified on 25 November 2026 with signed Preview `0.1.0` (version code `15`) against staging. Details are in the [staging acceptance runbook](runbooks/staging-acceptance.md).

- Anonymous sign-in, install sync, and server-data deletion, which kept the local trackers.
- Simulated rain on Today. A real weather push and a real correction push arrived and opened the right screens.
- The admin's emailed sign-in link, then publishing and withdrawing a correction, with **Use**, **Keep my dates** and **Undo** on the phone.
- Setup through Today in airplane mode. All 32 shipped content entries are approved and pass the release check.

[CI](https://github.com/MSalman5230/adwam/actions/runs/45045021999) · [Staging deploy](https://github.com/MSalman5230/adwam/actions/runs/45045021992) · [Admin Pages](https://github.com/MSalman5230/adwam/actions/runs/45045021916) · [Emulator end-to-end run](https://github.com/MSalman5230/adwam/actions/runs/45590303685) · [Weather health](https://github.com/MSalman5230/adwam/actions/runs/45660404476) · [Signed Preview APK](https://expo.dev/accounts/msalman5230/projects/adwam/builds/18d7dc7c-1dca-470f-b4c2-ecbaa08dc766)

## What's left

### 1. A week on real phones

[#58](https://github.com/MSalman5230/adwam/issues/58) and [#10](https://github.com/MSalman5230/adwam/issues/10). This is the longest item, so start it first.

- **Owner:** make a Pixel, a Samsung, a Xiaomi and a low-end Android phone available for a week, each with the signed Preview APK. So far only a quick check on a Nothing Phone (2) has passed.
- **Testers and agent:** follow the [Android reminder test](runbooks/notification-test.md): delivery and delay, Done and Later with the app closed, restart, app update, battery saver, and time-zone and daylight-saving changes.
- **Done when:** each phone's results are in the runbook, and reminders arrive within 15 minutes or the owner has chosen a fix. This also closes the milestone 0 risk tests.

### 2. Startup speed

[#76](https://github.com/MSalman5230/adwam/issues/76).

- **Accepted by the owner on 26 November 2026.** Startup was fast on the owner's phone with the signed Preview, so no speed work is planned. The emulator's slower times are in the [performance runbook](runbooks/mobile-performance.md) for reference.

### 3. Staging checks still to record

[#70](https://github.com/MSalman5230/adwam/issues/70), [#71](https://github.com/MSalman5230/adwam/issues/71) and [#72](https://github.com/MSalman5230/adwam/issues/72).

- **Agent:** check that the emailed sign-in link returns to the hosted admin page and signs the admin in. [Correction admin sign-in](development-setup.md#correction-admin-sign-in)
- **Agent:** record Expo's delivery receipts for the weather and correction pushes, using a manual run of **Weather health**.
- **Agent:** check that an over-the-air Preview update reaches an installed Preview without losing settings or trackers, and that rolling back on the `preview` channel works.
- **Done when:** each check is recorded in the [staging acceptance runbook](runbooks/staging-acceptance.md).

### 4. Content on real phones

[#78](https://github.com/MSalman5230/adwam/issues/78).

- **Agent:** on real phones, check that the Arabic keeps its letter joins and vowel marks and isn't clipped. Quran.com's Uthmani text uses marks that ordinary Amiri may draw badly. If it does, use Amiri Quran for those verses. Check that every source link opens.
- **Done when:** `pnpm content:check --release` is green, the calendar is regenerated, the link check has no open issue, and the phone check is recorded.

### 5. Privacy notice

[#79](https://github.com/MSalman5230/adwam/issues/79) and [PR #187](https://github.com/MSalman5230/adwam/pull/187).

- **Published on 26 November 2026 (PR #187):** the [notice](../apps/admin/public/privacy/index.html) names Masood as the operator, with msalman5230@gmail.com for privacy requests. It's served at https://msalman5230.github.io/adwam/privacy/, and About links to it.
- **Agent:** once the update reaches Preview, check that About opens the notice and that the crash-report and usage-statistics switches work.
- **Done when:** About opens the published notice.

### 6. Final acceptance pass

- **Agent:** on the final signed Preview, check the light and dark screens against the prototype, TalkBack and 200% text, the offline paths, and a Sentry test crash with a readable stack. Run **Android end-to-end tests** on the same commit and fix any failure that repeats.
- **Owner:** approve the results, including the suggested prayer method for each country (D7) and the eclipse note (D9).
- **Done when:** the build ID, Android version code, native fingerprint, content version and update ID are recorded in the staging acceptance runbook.

**Version 1 is complete on staging** when all six are recorded for one signed Preview build and no staging or app issue is open. No production or store work is needed.

## Production CI and Google Play

The owner approved the CI and release design on 26 November 2026. It's described in [CI and releases](release/ci-and-release.md). This work runs alongside the staging items above:

- **Agents** build the workflows.
- **The owner** creates the production accounts and secrets.
- **Production jobs stop at their plan step** until those secrets exist. Nothing reaches production without the owner's approval in GitHub.

Do the tasks in this order.

### M6.10 Staging pipeline

[#191](https://github.com/MSalman5230/adwam/issues/191)

- **Agent:**
  - Publish Preview updates from GitHub's runner with Sentry source maps, and remove the Expo workflow.
  - Open and close the **Preview needs a new build** issue from the native fingerprint.
  - Make **Android preview build** reuse a matching Preview build and post its install link.
- **Owner:** add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` to the `staging` environment.
- **Done when:**
  - A merge publishes a Preview update within minutes.
  - A test crash on that update shows a readable stack in Sentry.
  - The reminder issue opens after a native change and closes after the matching build.
  - The `staging` environment accepts only `master`.

### M6.11 Versioning

[#192](https://github.com/MSalman5230/adwam/issues/192)

- **Agent:**
  - Add release-please with `1.0.0` as the first release, the PR title check and the new PR rules below.
  - Run release-please with GitHub's built-in token, and start the required checks on its PR.
  - Allow GitHub Actions to create pull requests.
  - Allow only squash merges, using the PR title and description.
  - Make the PR title check required on `master`.
- **Owner:** don't merge the Release PR until production is set up (M6.12). Merging it tags the release and starts the production run.
- **Done when:** a Release PR opens, runs CI and shows `1.0.0`.

### M6.9 Production workflows

[#81](https://github.com/MSalman5230/adwam/issues/81)

- **Agent:**
  - Release's plan and production jobs, **Ship update**, **Production rollout** and the daily production health check.
  - Both admin pages on GitHub Pages.
  - The `production` submit profile for Play's internal track, starting with draft releases.
  - The production scheduler SQL, with debug tools off.
  - Rewrite the [app release](release/app-release.md) and [update release](release/content-release.md) runbooks.
- **Done when:**
  - Without production secrets, every production workflow stops cleanly at its plan.
  - Staging still deploys.

### M6.12 Production setup

[#193](https://github.com/MSalman5230/adwam/issues/193)

- **Owner:** everything in [One-time production setup](release/ci-and-release.md#one-time-production-setup), and the rules for the `production` and `production-monitor` environments.
- **Owner and agent:**
  - The first production build, which creates the upload key.
  - The production scheduler SQL.
  - The production admin user.
- **Done when:**
  - The plan jobs pass against production.
  - The weather job runs on production.
  - The production admin page signs in.

### M6.13 Agent account

[#194](https://github.com/MSalman5230/adwam/issues/194)

- **Owner:** create a GitHub machine account for agents with the Write role, and an Expo token with the Viewer role for the agents' PC.
- **Agent:** change AGENTS.md's account rule to name the machine account.
- **Done when:** the agents' `gh` login can't approve a `production` run.

### M7 Google Play

- **M7.1 First upload** ([#82](https://github.com/MSalman5230/adwam/issues/82)):
  - Merging the first Release PR builds `1.0.0` and sends it to internal testing as a draft.
  - The owner completes the store listing, Data safety and content rating from the [store review](release/android/store-review.html), then rolls the draft out to internal testers.
  - Later releases go to internal testing directly.
- **M7.2 Closed test** ([#83](https://github.com/MSalman5230/adwam/issues/83)):
  - Invite 15–20 testers so that at least 12 stay opted in for 14 days in a row. Include Samsung and Xiaomi owners.
  - The closed test can double as the week on real phones.
  - Agents ship fixes with **Ship update**.
  - Advice on the account is in [google-play-account.md](release/google-play-account.md).
- **M7.3 Production** ([#84](https://github.com/MSalman5230/adwam/issues/84)):
  - The owner applies for production access and promotes the build. Google's review usually takes up to 7 days.
  - The first production release reaches 100% at once. Later ones go to 10%, 50% and 100%, while the owner watches Sentry, the health check and push receipts.
- **M7.4 Updates after launch** ([#85](https://github.com/MSalman5230/adwam/issues/85)):
  - **Ship update** sends an update to 10% of phones, and **Production rollout** raises it to 100%.
  - If something's wrong, **Production rollout** undoes it, as the update runbook describes.

### M8 iOS

iOS, TestFlight and the App Store. [#86](https://github.com/MSalman5230/adwam/issues/86)

## After version 1

- A sunnah.com API key from the owner. The fetch script then reads new hadith from the API, and compares the API's text with the stored copies.
- Translations as overlay files, then an Arabic interface written right to left.
- A month grid on Upcoming.
- Location-based reminders, which need background location and a separate permissions review.
- MET Norway as a weather backup, or a private copy of Open-Meteo.
- The eclipse cloud-cover flag.

## Working rules

- **One task, one pull request.** Name the branch after the task, such as `m6-speed`. Start the PR title with its type and end it with the task ID, such as `feat: speed and size (M6.4)`. The types, and which ones make a release, are in [CI and releases](release/ci-and-release.md#pull-request-titles). PRs are squash-merged, so the title becomes the commit on `master` and the changelog line. Track progress in the GitHub issues, not in this file.
- **Before opening a PR,** run `pnpm check` and meet the definition of done.
- **Ask the owner** when a step needs an account, a payment, a secret, a legal judgement or a judgement about religious content.
- **Production only through CI.** Create or change nothing in production by hand. Production changes run only from GitHub Actions, after the owner approves them. Distribute signed Preview APKs directly from EAS.

### Definition of done

A PR is done when:

- typecheck, lint and tests pass in CI
- new behaviour has tests: unit tests in core, component tests in the app, database or function tests on the server
- screen changes include screenshots next to the prototype at the same Moment, in light and dark
- every new string is in `messages/en.json`
- any spec that no longer matches is fixed in the same PR
- no secret, `.env` file or production command is involved

### Code

- **TypeScript, strict, ES modules,** on Node 24, with pnpm pinned in `packageManager`. One ESLint and Prettier setup at the root.
- **Lint keeps core pure.** `packages/core` can't import React, React Native, Expo or Supabase, and can't use `fetch`, storage, `Date.now()`, `new Date()` without arguments, or `Math.random()`.
- **No English in components.** App text comes from `messages/en.json` keys, enforced by the i18next lint rule.
- **Time** in core is an instant in milliseconds, plus ISO dates such as `2026-12-18` for civil days in the place's time zone. The app formats times in the place's time zone, not the phone's.
- **Text** follows the content format's rules everywhere: NFC, ʿ as U+02BF, ʾ as U+02BE, and ﷺ through one shared component that keeps it with the word before it and draws it in Amiri.

### IDs that can't change

Phones keep users' data under these, so snapshot tests guard them, and changing one needs a migration:

- **Sunnah IDs,** lowercase with hyphens, such as `friday-prep`.
- **Tick keys:** `<sunnah id>[.<occurrence key>]:<scope>`. The scope is the ISO date for a daily tick, a Hijri year and month such as `1448-6` for a tick once per Hijri month, or a Hijri year such as `1448` for a tick once per year. Fasts are logged by ISO date instead.
- **Notification IDs:** `<tick key>|<push key>`, with `|later` added for a Later copy.
- **Android channel IDs:** `weekly`, `monthly`, `yearly`, `weather`, `corrections` and `corrections-silent`. Their names can change; their IDs can't.
- **RPC names** end in `_v1`.
- **Saved stores** carry a version number and migrations.

### Where the app differs from the prototype on purpose

The prototype is the design reference, but the app keeps these settled choices where the two differ. [explained.md](../tools/prototype-match/explained.md) lists every other accepted difference.

- **IDs:** the prototype uses camelCase, such as `fridayPrep`. Content uses `friday-prep`, and the prototype-match tool maps between them.
- **Starting values:** Jumuʿah at Ẓuhr, the make-up count unset, and notifications not yet asked. The prototype starts with 1:30 pm, 3 make-up days and notifications allowed.
- **Uḍḥiyah:** one answer per Hijri year, not one forever.
- **al-Kahf:** when the Friday preparation won't push, al-Kahf gets its own push at the same time, opening its detail screen.
- **The last days of Shaʿbān:** core applies the calendar's rule as a safeguard, though nothing in version 1 is affected.

### Product decisions in force

| Topic | Decision |
|---|---|
| App IDs | `com.msalman5230.adwam` for production, `.preview` and `.dev` for test builds. No domain: the privacy notice and admin page use GitHub Pages. |
| Licence | Noncommercial use with credit to MSalman5230 for Adwam's own app, code, text and artwork. Third-party material keeps its own terms. [Adwam Noncommercial Licence](../LICENSE) |
| Analytics | Off until the user agrees. The question is a one-time notice on Today after setup, "Share anonymous usage statistics?", with neither answer preselected. |
| Content review | The owner reviews content before it is marked `published`. |
| Prayer methods | The prototype's five, plus adhan-js's Turkey (Diyanet), Singapore (also suggested for Malaysia and Indonesia), Dubai, Kuwait, Qatar and Moonsighting Committee. Angle-based rule for high latitudes. |
| Eclipses | Partial and total lunar eclipses and local solar eclipses, computed on the phone. No penumbral eclipses and no cloud-cover flag. |
| Weather push limit | One weather push per install per local day. Eclipse pushes don't count. |
| Report a problem | GitHub issue form only, until the owner sets up an email address. |
| Delete my data | In a Privacy sheet in Settings, with a confirmation. |
| Times | Follow the phone's 12- or 24-hour setting, with "1:30 pm" style for 12-hour. |
| Qurʾan translation | Quran.com's default English, Dr. Mustafa Khattab's The Clear Quran. |

## CI workflows

These are the workflows today. [CI and releases](release/ci-and-release.md) describes what replaces them, and each task above updates this table.

| Workflow | When | What it runs |
|---|---|---|
| `ci.yml` | Pull requests and merges to `master` | `pnpm check`, the calendar and route checks, database and function tests, and the Android fingerprint check, which labels the PR `needs-new-build` |
| `deploy-staging.yml` | Merges to `master` | Staging migrations and functions, then an update to the `preview` channel published from GitHub's runner with Sentry source maps. Opens or closes the **Preview needs a new build** issue. |
| `preview-build.yml` | By hand, from `master` | A signed Preview APK, or the existing build when one matches the native fingerprint. Fails on exact-alarm or precise-location permissions, posts the install link and closes the reminder. |
| `e2e-nightly.yml` | Nightly, by hand, and PRs that change the flows | The Maestro suite on an emulator, against local Supabase |
| `daily-health.yml` | Daily, and by hand | **Weather health**: the weather job and the Open-Meteo budget on staging, and on production once it exists. Manual runs also summarise push outcomes. |
| `weekly-links.yml` | Weekly | The source link check |
| `admin-pages.yml` | Admin page changes on `master`, and by hand | Builds both correction pages for GitHub Pages: production at `/adwam/`, or a waiting page until production exists, and staging at `/adwam/staging/` |
| `release.yml` | Merges to `master` | release-please updates the **Release x.y.z** PR and starts CI and the PR title check on it. Merging that PR tags the release, runs the plan and the end-to-end tests, and after the owner's approval deploys the production server and sends the app bundle to Play internal testing. |
| `ship-update.yml` | By hand, from `master` | **Ship update**: after the owner's approval, deploys the production server and publishes an over-the-air update to 10% of phones, or deploys the server only |
| `production-rollout.yml` | By hand, from `master` | **Production rollout**: after the owner's approval, raises the rolling update to 50% or 100%, or undoes it |
| `pr-title.yml` | Pull requests | Requires a type at the start of the PR title |

## Documents

| File | What it's for |
|---|---|
| [mobile-app-ui.html](mobile-app-ui.html) | The design reference for every screen |
| [mobile-app-screen-story.md](mobile-app-screen-story.md) | Rules the prototype can't show, and what's left out of version 1 |
| [mobile-app-architecture.md](mobile-app-architecture.md) | How the app, core, content and server fit together |
| [sunnah-content-format.md](sunnah-content-format.md) | The content files, and how to add a Sunnah |
| [sunnah-reminder-calendar.md](sunnah-reminder-calendar.md) | The Sunnahs, with tables generated from the content files |
| [development-setup.md](development-setup.md) | Accounts, secrets and local setup |
| [runbooks/](runbooks/) | Staging acceptance, the phone test, performance, publishing a correction, and incidents |
| [release/ci-and-release.md](release/ci-and-release.md) | How changes reach staging and Google Play: environments, buttons, version numbers and production setup |
| [release/](release/) | Release runbooks, the Google Play account advice, and the store listing review |
