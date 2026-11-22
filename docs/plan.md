# Implementation plan

This is the plan for building Adwam version 1, from an empty workspace to Google Play, then the App Store. It breaks [mobile-app-architecture.md](mobile-app-architecture.md) into tasks an agent can pick up one at a time: what to build, in what order, which files each task produces, and how to check it's done.

It doesn't repeat the architecture's reasoning. Read the architecture for what each part is and why. Read this for the order, the tasks and the checks.

Written on 21 November 2026. The owner approved the three specs below that were drafts the same day. This plan, the specs and the prototype all live in `docs/`, so the repository root holds only code and the files tools expect there.

## Inputs

| File | What this plan takes from it | State |
|---|---|---|
| [mobile-app-ui.html](mobile-app-ui.html) | Screens, wording and behaviour. Its engine code (lines 615–1184) is the reference that `packages/core` must match. | Committed |
| [mobile-app-screen-story.md](mobile-app-screen-story.md) | Rules the prototype can't show, what it fakes, and what's left out of version 1 | Committed |
| [sunnah-reminder-calendar.md](sunnah-reminder-calendar.md) | The Sunnahs, their tiers, timings and sources | Committed. Its tables become generated in milestone 1. |
| [mobile-app-stack.md](mobile-app-stack.md) | The stack | Committed |
| [mobile-app-architecture.md](mobile-app-architecture.md) | Structure, decisions, milestones, risks | Approved and committed |
| [sunnah-content-format.md](sunnah-content-format.md) | The content files | Approved and committed |
| [development-setup.md](development-setup.md) | Accounts, secrets, local tools, who does what | Approved and committed |

**When files disagree,** the owner's decisions in the architecture come first, then the prototype for screens and behaviour, then the other specs. The disagreements found while writing this plan are settled under [Conflicts the plan settles](#conflicts-the-plan-settles). Whoever changes behaviour fixes the losing file in the same pull request, so the specs never drift apart.

**Line numbers** in this plan refer to `mobile-app-ui.html` at commit `c55c11a`. M0.2 edits the prototype, which shifts them. After that, search for the function by name, or read the old file with `git show c55c11a:mobile-app-ui.html`. That commit predates the move to `docs/`, so the file sat at the root.

## Version 1 in one paragraph

An Android app, English only but ready for translation, with no account. Setup, Today, Upcoming, Settings, Reminders, the Sunnah detail screen and About, in light and dark, matching the prototype. Every calendar reminder and eclipse is computed and scheduled on the phone and works offline. A small Supabase server detects weather, sends weather pushes, and offers Hijri date corrections that an admin publishes from a one-page site. Content is built into the app and fixed through over-the-air updates. Crash reports go to Sentry, and usage statistics to PostHog with consent. Left out: prayer-time and Qibla screens, a Qurʾan reader, widgets, a month grid, accounts and location-based reminders, as the screen story's "Left out of version 1" says.

## How agents use this plan

- **Go milestone by milestone.** Inside a milestone, tasks on different tracks can run in parallel in separate branches or worktrees. A task starts only when the tasks under "Needs", where given, are merged.
- **One task, one pull request,** unless the task says to split it. Name the branch after the task, such as `m1-hijri`, and start the PR title with the task ID, such as "M1.3 Hijri calendar".
- **Track progress in GitHub,** not here: a GitHub milestone per plan milestone and an issue per task (task M0.8). Change this file only when the plan itself changes.
- **Before opening a PR,** run `pnpm check` and meet the [definition of done](#definition-of-done).
- **Ask the owner** when a step needs an account, a payment, a secret, a legal judgement or a judgement about religious content. Secrets go through a secure secret prompt, never the chat.
- **Never** type Arabic, hadith or Qurʾan text from memory, change a released Sunnah ID, run a production command, or commit a secret.
- **Staging only until milestone 6.** The owner sets up production once everything works on staging (M6.9). Until then, create nothing for production: no Supabase project, secrets, builds or store uploads. The production build profile and update channel can exist in config, unused.

Task sizes: **S** is one small PR, **M** one or two PRs, **L** several PRs.

## Tracks and the critical path

```
         +- Core engine M1.1-M1.15 ---+- App shell and Today M2 -- Screens M3 --+
         |                            +- Local notifications M4 ----------------+
   M0 ---+- Content M1.16-M1.20 -- owner reads it before production ------------+- Hardening M6 -- Android release M7 -- iOS M8
         |                            +- Server M5: server side after M1, ------+
         |                               app side after M2                      |
         +- Owner: accounts, Play Console, testers -----------------------------+
```

Three chains decide the release date. Each depends more on people and outside services than on the agents:

1. **Content review.** During development nothing waits for review: test builds show all content. Before production, the owner reads every Sunnah, duʿāʾ and source once (D5, M6.6), and only then is it published. Scripts copy the texts from sunnah.com and Quran.com (M1.17), so it's reading, not typing. Start once M1.17 is done, so it's finished before milestone 6 ends.
2. **Google Play.** A personal account's identity check takes days. Then a closed test needs at least 12 testers opted in for 14 days in a row, and the production-access review takes more days. Open the account in milestone 4, recruit testers in milestone 5, and start the closed test when milestone 6 is nearly done.
3. **Notifications on real phones.** The milestone 0 tests can change the notification library, which changes milestone 4.

## Conflicts the plan settles

| # | Topic | The conflict | Resolution | Fixed in |
|---|---|---|---|---|
| C1 | Date corrections | The prototype and screen story say dates announced for the region "take priority" and apply on their own. | The owner's decision wins: a correction is offered, and the user picks "Use Sunday" or "Keep my dates". | M0.2 |
| C2 | Eclipses | The calendar and the stack file have the server detect eclipses and send their pushes. | The phone computes them and schedules their pushes. | M0.1 |
| C3 | Content source | The stack file generates JSON from the calendar Markdown. | YAML content files are the source, and the calendar's tables are generated from them. | M0.1 |
| C4 | How far ahead to schedule | The stack file says 2–3 weeks. | 60 days on Android, at most about 150 notifications. At most 60 pending on iOS. | M0.1 |
| C5 | Fasting on Friday | The calendar's Friday line names ʿĀshūrāʾ, ʿArafah and a White Day. | It also names Shawwāl and make-up fasts. | M0.1 |
| C6 | Voluntary fasts in Ramadan | The prototype's `fastingAllowed` suggests no Monday, Thursday or White Days fast in Ramadan, but no spec says so. | Keep it, because the Ramadan fast itself is obligatory, and add the rule to the calendar's fasting rules. | M0.1, M1.8 |
| C7 | The last days of Shaʿbān | The calendar has the rule. The prototype doesn't apply it. | Core applies it as a safeguard. Nothing in version 1 is affected: Monday and Thursday are a regular habit, and White Days never fall then. | M1.8 |
| C8 | al-Kahf without Friday preparation | The prototype only ever sends al-Kahf inside the Friday preparation push. With al-Kahf on Push and Friday preparation on In-app or Off, no al-Kahf push comes, yet the push estimate counts one. | When Friday preparation won't push, al-Kahf gets its own push at the same time, opening its detail screen. The content needs wording for it. | M1.12, M1.16 |
| C9 | Setup's first promise | "Your settings and trackers stay on this phone", but some settings now go to the server. | "Your trackers stay on this phone." | M0.2 |
| C10 | Evidence on the detail screen | The prototype shows source links only. | Rows that expand to the Arabic excerpt and its meaning, as the content format describes. | M0.2 |
| C11 | Android channels | The prototype's notification settings show four group channels. | Six: Weekly, Monthly, Yearly, Weather and eclipses, Date corrections, and a silent Date corrections channel for quiet hours. | M0.2 |
| C12 | Fields the content format lacks | The prototype relies on things the timing vocabulary can't say: a tick that counts once per Hijri month (crescent) or year (zakāt al-fiṭr); multi-day items shown as one row (White Days, ʿĀshūrāʾ, last ten nights, takbīr); a different title for that row; marker days that tag Upcoming without a card (Tashrīq); wording for window ends ("until Maghrib", "the prayer", "all day"); the countdown to Jumuʿah; a winning fast borrowing the push of a lower-priority fast; the make-up card's level following Shaʿbān and Shawwāl. | Extend the schema and document each field in sunnah-content-format.md in the same PR. | M1.6 |
| C13 | Sunnah IDs | The prototype uses camelCase IDs, such as `fridayPrep`. | Content IDs are lowercase with hyphens, such as `friday-prep`, fixed for good at the first release. The prototype-match tool maps between the two. | M1.16 |
| C14 | Starting values | The prototype starts with Jumuʿah at 1:30 pm, 3 make-up days and notifications allowed. | Jumuʿah at Ẓuhr, the make-up count unset, notifications not yet asked, as the screen story says. | M2.4 |
| C15 | The uḍḥiyah answer | The prototype keeps one answer forever. | One answer per Hijri year. | M2.4 |
| C16 | Hadith and Qurʾan text | The content format said not to copy the English translations shown on sunnah.com and Quran.com, and to take the Qurʾan's Arabic from Tanzil. | The owner decided on 21 November 2026 to quote the Arabic and the English as sunnah.com and Quran.com show them, with credit, and to drop Tanzil. For version 1, a script copies the sunnah.com pages once. The sunnah.com API replaces that later. | The drafts, on 21 November 2026. M0.2 for About's credits. |
| C17 | Tatweel in copied Arabic | The content format banned the tatweel (ـ), but Quran.com's Uthmani text uses it, for example in verse 2:185. | Copied Arabic is kept exactly as the site gives it, apart from NFC normalisation, and the check never corrects it. | The content format, on 21 November 2026 |

## Decisions for the owner

On 21 November 2026 the owner approved the drafts (D1), chose the app IDs (D2) and took on the content review (D5). For the development phase, the owner accepted every other default below. Each one is confirmed or changed before the production release, in milestone 6.

| # | Question | Needed by | Answer, or the accepted default |
|---|---|---|---|
| D1 | Approve the architecture, content format and development setup | M0 | Approved on 21 November 2026 |
| D2 | App IDs and domain (architecture, open question 1) | M0.4 | `com.msalman5230.adwam` for production, `com.msalman5230.adwam.preview` and `com.msalman5230.adwam.dev` for test builds. No domain for now: the privacy policy and admin page use GitHub Pages. |
| D3 | Licences for the code and the content (open question 2) | M6 | The owner chose noncommercial use with credit to MSalman5230 for Adwam's original app, code, text and artwork. Third-party material keeps its own terms. [Adwam Noncommercial Licence](../LICENSE) |
| D4 | Analytics consent (open question 3) | M6 | Off until the user agrees |
| D5 | Content reviewer (open question 4) | M6.6 | The owner. During development, content isn't held for review: entries stay in `review`, and test builds show them all. Before production, the owner reads every entry once, and only then is it marked published. |
| D6 | Where the usage-statistics question goes | M0.2 | A one-time notice on Today right after setup, "Share anonymous usage statistics?", with Share and No thanks and neither preselected. Setup stays under a minute, and users who pick In-app only, who skip step 4, still see it. |
| D7 | Prayer methods offered, and the method suggested for each country | M1.4 | The prototype's five, plus adhan-js's Turkey (Diyanet), Singapore (also suggested for Malaysia and Indonesia), Dubai, Kuwait, Qatar and Moonsighting Committee. The prototype suggests Muslim World League for Türkiye, Malaysia and Indonesia, which local users would likely find wrong. The owner checks the country table before production. |
| D8 | The rule for high latitudes | M1.4 | Angle-based, as in the prototype |
| D9 | The eclipse cloud-cover flag | M1.16 | Leave it out of version 1, because the phone has no cloud forecast for an eclipse it computed itself. Reword the eclipse note, and the owner checks the new wording before production. |
| D10 | Penumbral lunar eclipses (architecture, gap 1) | M1.13 | Leave them out |
| D11 | Eclipse pushes and the one-weather-push-a-day limit (gap 2) | M1.12 | The limit counts weather only |
| D12 | Report a problem without a GitHub account (gap 3) | M2.10 | An "Email instead" link once the owner sets up an address. GitHub only until then. |
| D13 | Where "Delete my data from the server" sits | M0.2 | In a Privacy sheet in Settings, with a confirmation |
| D14 | Where the admin page is hosted | M5.13 | GitHub Pages, from this repository |
| D15 | 12- or 24-hour times | M1.10 | Follow the phone's setting, with the prototype's "1:30 pm" style for 12-hour |
| D16 | Which English translation of the Qurʾan to quote | M1.17 | Quran.com's default English, Dr. Mustafa Khattab's The Clear Quran |

## Repository additions

These sit next to the layout in the architecture:

```
adwam/
  docs/
    plan.md                         this file
    *.md, mobile-app-ui.html        the specs and the prototype
    spikes.md                       milestone 0 test results and the paths chosen
    runbooks/                       release, content release, rollback, corrections, incidents, phone tests
  packages/content/
    sources/                        the sunnah.com and Quran.com texts the content quotes, copied once (M1.17)
  tools/
    prototype-match/                runs the prototype's engine in Node next to core
    cities/                         builds the city list from GeoNames
    icons/                          builds icon components from Material Symbols
  .github/
    workflows/                      see CI workflows
    ISSUE_TEMPLATE/content-problem.yml
    CODEOWNERS                      the owner owns content changes
    pull_request_template.md
  .env.example
```

## Conventions

### Code

- **TypeScript, strict, ES modules,** on Node 24, with pnpm pinned in `packageManager`. One ESLint and Prettier setup at the root.
- **Lint keeps core pure.** `packages/core` can't import React, React Native, Expo or Supabase, and can't use `fetch`, storage, `Date.now()`, `new Date()` without arguments, or `Math.random()`.
- **No English in components.** App text comes from `messages/en.json` keys, enforced by the i18next lint rule.
- **Time** in core is an instant in milliseconds, plus ISO dates such as `2026-12-18` for civil days in the place's time zone. The app formats times in the place's time zone, not the phone's.
- **Text** follows the content format's rules everywhere: NFC, ʿ as U+02BF, ʾ as U+02BE, and ﷺ through one shared component that keeps it with the word before it and draws it in Amiri.

### Contracts

These outlive app versions, so snapshot tests guard them, and changing one after release needs a migration:

- **Sunnah IDs.**
- **Tick keys:** `<sunnah id>[.<occurrence key>]:<scope>`. The scope is the ISO date for a daily tick, a Hijri year and month such as `1448-6` for a tick once per Hijri month, or a Hijri year such as `1448` for a tick once per year. Fasts are logged by ISO date instead.
- **Notification IDs:** `<tick key>|<push key>`, with `|later` added for a Later copy.
- **Android channel IDs:** `weekly`, `monthly`, `yearly`, `weather`, `corrections` and `corrections-silent`. Their names can change later; their IDs can't.
- **RPC names** end in `_v1`.
- **Saved stores** carry a version number and migrations.

### Definition of done

A PR is done when:

- typecheck, lint and tests pass in CI
- new behaviour has tests: unit tests in core, component tests in the app, database or function tests on the server
- screen changes include screenshots next to the prototype at the same Moment, in light and dark
- every new string is in `messages/en.json`
- any spec that no longer matches is fixed in the same PR
- no secret, `.env` file or production command is involved

## Milestone 0: Foundations

**Goal:** a workspace, a development build on the emulator talking to local Supabase, checks on every pull request, and an answer for every risk.

**Owner:**

- Log in the command-line tools on this PC, once, all as **MSalman5230**. GitHub's `gh` already is. Expo's `eas` is logged in as another account, so run `eas logout`, then `eas login`. Don't log in the Supabase CLI: local Supabase needs no login, and CI uses a scoped token (development-setup.md, "CI secrets").
- Create the Supabase staging project on the free tier.
- In GitHub, create the `staging` environment and add its secrets from development-setup.md, "CI secrets". The `production` environment stays empty until milestone 6. Turn on branch protection for `master` once CI exists.
- Have Docker Desktop running when the agent needs local Supabase.
- For the risk tests, find a Samsung and a Xiaomi phone, your own or a tester's.

### M0.1 Approve and align the specs · S

- **Needs:** D1.
- **Do:** commit any spec edits still uncommitted. Make the edits the architecture lists under "Changes to existing specs" for the stack file and the calendar, and fix conflicts C2–C6. Link this plan from the architecture's build order.
- **Done when:** the Markdown specs agree with each other on every row of the conflicts table, apart from the rows M0.2 handles.

### M0.2 Update the prototype · M

The prototype stays the single design reference, so new screens and wording go into it before they're built.

- **Do:** in `mobile-app-ui.html` and the screen story:
  - The Date correction notice says "Ramadan starts on Sunday in the United Kingdom. Your app says Monday." with "Use Sunday", "Keep my dates" and Undo. Setup step 2 and the Hijri date sheet say corrections are offered. The sheet lists accepted corrections, each with Remove. A new Moment shows the offer.
  - The detail screen's Sources rows show the label and grade, and hadith and Qurʾan rows expand to the excerpt, its meaning, the narrator, the translator's credit and the link (C10). Use a visible placeholder such as "[Arabic excerpt copied from sunnah.com]" until M1.17 has copied the real text. Never type Arabic from memory.
  - The usage-statistics question (D6). A Privacy row in Settings opening a sheet with the crash-report switch, the usage-statistics switch and "Delete my data from the server" (D13).
  - Setup's first promise (C9). About's new privacy text, covering the server, Sentry and PostHog, credits for GeoNames, sunnah.com, Quran.com and the translators they show, and the real GitHub link.
  - The notification settings mock with six channels (C11).
- **Done when:** the owner has clicked through it in a browser and approved it.

### M0.3 Workspace · M

- **Do:**
  - Root `package.json` and `pnpm-workspace.yaml`, `tsconfig.base.json`, ESLint and Prettier, `.editorconfig`, `.gitattributes` (LF line ends, UTF-8 text), `.nvmrc`, and a `.gitignore` covering env files, build output and generated server files.
  - Empty `packages/core` and `packages/content` packages with Vitest.
  - Root scripts: `check` (everything that needs no Docker or emulator), `test`, `lint`, `typecheck`, `content:check`, `content:build`, `android`, `db:start`, `db:reset`, `db:test`, `server:prepare`, `server:test`, `server:tick` and `server:simulate-rain`. Stubs are fine until their milestone.
- **Done when:** `pnpm check` passes on a fresh clone, on this PC and in CI.

### M0.4 Expo app skeleton · M

- **Do:**
  - Create `apps/mobile` with the latest stable Expo SDK, TypeScript, Expo Router and the New Architecture.
  - `app.config.ts` reads `APP_VARIANT` for the name ("Adwam", "Adwam Preview", "Adwam Dev"), the Android package (`com.msalman5230.adwam`, with `.preview` or `.dev` added, as in D2) and the `adwam` link scheme. The runtime version uses the fingerprint policy. Updates are checked at launch without delaying it. `android.blockedPermissions` removes `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `SCHEDULE_EXACT_ALARM` and `USE_EXACT_ALARM`.
  - `eas.json` with `development`, `preview` and `production` profiles, the `preview` and `production` update channels, and version codes kept by EAS that increase on their own. Run `eas init`.
  - A config plugin that allows plain HTTP only in development builds.
  - Install the native modules now, so there's one early rebuild: expo-dev-client, expo-notifications, expo-background-task, expo-location, expo-updates, expo-font, expo-localization, expo-intent-launcher, react-native-mmkv, react-native-svg, @gorhom/bottom-sheet with its gesture and animation libraries, and @sentry/react-native, which stays off until M2.11.
  - `.env.example` listing every variable in development-setup.md.
- **Done when:** `pnpm android` installs the development build on the `Pixel_6` emulator and edits hot-reload, and a cloud `preview` build installs on a real phone.

### M0.5 Local Supabase · S

- **Do:** run `supabase init`, with anonymous sign-in and email sign-in turned on in `config.toml`. Add a first migration that enables `pg_cron` and `pg_net`, and an empty seed. Add the Supabase CLI as a root development dependency.
- **Done when:** the development build signs in anonymously at `http://10.0.2.2:54321`, and a first database test passes with `pnpm db:test`.

### M0.6 Checks on pull requests · S

- **Do:** `.github/workflows/ci.yml` installs with caching and runs `pnpm check`. A second job starts local Supabase and runs the database tests. Add the PR template, and a `CODEOWNERS` file naming the owner for `packages/content`.
- **Done when:** a PR shows green checks, and `master` requires them.

### M0.7 Risk tests · L

Throwaway code on `spike-*` branches. Each result and the chosen path go into `docs/spikes.md`.

| Test | How | Passes when | If it fails |
|---|---|---|---|
| Done and Later with the app closed | A local notification with both buttons. Close the app fully and press each, on a Pixel, a Samsung and a Xiaomi. | Done saves the tick and reschedules without opening the app. Later schedules a copy an hour later. | Notifee for local notifications |
| How late approximate notifications arrive | Schedule 20 notifications from 1 to 48 hours ahead. Leave the phone idle, screen off, overnight. Log when each arrives. | Nearly all arrive within 15 minutes | Revisit with the owner. On recent Android versions an approximate alarm can arrive up to about an hour late, which would push the last-hour-of-Friday reminder past Maghrib. Options: an opt-in exact-alarm setting, or earlier push times for short windows. |
| Restarts and app updates | Schedule, restart the phone, install an update | Everything still fires | Reschedule at boot, or at the first launch after an update |
| 150 pending notifications | Schedule 150 over 60 days | All accepted and listed | Lower the cap |
| Hermes and `Intl` | `formatToParts` with `timeZone` for ten zones, including daylight-saving edges, compared with Node. Also `Intl.PluralRules`. | Same results as Node | FormatJS polyfills, with time zone data |
| Background task | expo-background-task reading MMKV and Zustand outside React, logging each run for three days | Runs at least once a day on each phone | Reschedule at launch only, rely on the 60-day horizon, and write the "Not getting reminders?" help pages |
| Local Android build | `expo run:android` with JDK 21 | It builds | JDK 17, or cloud development builds |

- **Done when:** every row has a result and a chosen path. This is the architecture's exit check for milestone 0.

### M0.8 Tracking · S

- **Do:** GitHub milestones M0 to M8, one issue per task named with its ID, and labels such as `core`, `content`, `app`, `server`, `owner`, `needs-new-build` and `release-blocker`. Issue forms: `content-problem.yml`, with fields for the item, its ID, the content version, the app version and a description, all fillable from the URL, and a general bug form.
- **Done when:** every task in this plan has an issue.

**Exit check:** the development build signs in to local Supabase, CI is green on `master`, every risk has a chosen path, and the owner has approved the updated prototype.

## Milestone 1: Engine and content

**Goal:** core reproduces the prototype's behaviour from content files, and the content files hold every Sunnah.

**Owner:** nothing to decide, because D7–D11 and D16 use their accepted defaults. The sunnah.com API key can wait until after version 1, unless sunnah.com blocks the one-time copy in M1.17.

### Core track

#### M1.1 Core package · S

- **Do:** build with tsup to ES modules with types, test with Vitest, and add the purity lint rules. The only runtime dependencies are adhan and astronomy-engine. Define the `Msg` type, a message key with parameters, which every label returns.

#### M1.2 Dates and time zones · M

- **Needs:** M1.1, and the `Intl` result from M0.7.
- **Do:** port `isoAdd`, `wdOf` and `dayDiff` (prototype lines 639–644) and `tzParts`, `tzOffset`, `localToMs` and `civil` (lines 700–706), with one cached formatter per zone.
- **Done when:** tests pass for the start and end of daylight saving in London and Toronto, a local time that's skipped and one that repeats, a half-hour zone (Asia/Kolkata), and the southern hemisphere.

#### M1.3 Hijri calendar · L

- **Needs:** M1.2.
- **Do:**
  - `scripts/gen-umalqura.ts` reads Node's Umm al-Qura calendar and writes the month lengths for 1400–1500 AH as compact, committed data. Tabular dates are pure arithmetic.
  - `hijriOf(date, settings)` applies the method, the ±1 shift (by moving the Gregorian date, as the prototype does) and the accepted corrections.
  - A correction pins day 1 of its month to a Gregorian date. Neighbouring month starts move outward, one month at a time, until every month is 29 or 30 days. A withdrawn correction unpins.
- **Done when:** every day in the table's range matches Node for both methods, and the correction tests cover a start one day earlier, one day later, a move that pushes a neighbour past 30 days, two corrections in a row, and a withdrawal. CI keeps the Node comparison running.

#### M1.4 Prayer times and the day · M

- **Needs:** M1.2, M1.3, D7, D8.
- **Do:** `prayer` wraps adhan-js: the methods from D7, the standard or Ḥanafī ʿAṣr, the high-latitude rule from D8, times rounded to the minute, and Jumuʿah at Ẓuhr or a fixed local time. `day` returns the times and Hijri date for a civil date in a place, cached by a settings key like the prototype's `cfgKey`. `effectiveHijri(now)` turns at Maghrib.
- **Done when:** times differ from the prototype's by at most 2 minutes for five cities over a year, apart from high-latitude days, which are listed and explained.

#### M1.5 Places · S

- **Do:** the weather area, which is the position rounded to a 0.1° grid with a stable area ID; the suggested method for each country (D7); and the city record type that the app's city list uses.

#### M1.6 Content schema, check and build · M

- **Needs:** M1.1.
- **Do:**
  - `packages/content/schema/` in Zod. It produces `dist/schema.json` and the TypeScript types that core imports, type-only, so the two packages never import each other's code. It includes the fields from C12.
  - The schema lists the named rules, and a core test checks that every listed rule is implemented.
  - `scripts/check.ts` fails on everything the content format lists, including any excerpt or duʿāʾ whose Arabic or English isn't an exact part of its stored source copy (M1.17), comparing both after NFC normalisation. Copied text is never corrected (C17). With `--release`, it also fails if any entry that would ship isn't `published`.
  - `scripts/build.ts` writes `dist/content.json` with the content version (`YYYY.MM.DD`, from the content package's version). Test builds pass `--include-review`, so content waiting for review appears in development and preview builds but never in production.
  - A `yaml-language-server` schema line at the top of each YAML file, so editors check as you type.
- **Done when:** the check catches a fixture of each kind of failure.

#### M1.7 Occurrences · L

- **Needs:** M1.4, M1.6.
- **Do:** read the timing vocabulary (`on`, time points, `latest` and `earliest`, the window presets, `push`, `check`, `card`, `upcoming`, `banner`) and the named rules into the list of occurrences for a date, as `occsForDay()` does (prototype lines 1008–1069). The named rules:
  - one fasting card a day by priority, with the Also line and the borrowed push
  - no fasting on the Eids and the Tashrīq days, and the Ramadan rule (C6)
  - the Friday and end-of-Shaʿbān safeguards (C7)
  - `requires-udhiyah`, the three trackers and `stop-after-six`
  - `combine-into-friday-push`, with the al-Kahf fallback (C8)
- **Done when:** core makes every occurrence the prototype makes for London over two Hijri years (M1.15).

#### M1.8 Rules · M

- **Needs:** M1.7.
- **Do:** `level()`, covering the user's choice, the tier, the default, group switches, disputed items, the uḍḥiyah answer for that Hijri year, and the make-up card following Shaʿbān and Shawwāl. Then `paused()`, `pushAllowed()` and `visible()`.
- **Done when:** tests cover every branch of the prototype's `level` (lines 995–1005).

#### M1.9 Screen data · M

- **Needs:** M1.8.
- **Do:** plain data, with `Msg` labels, for:
  - **Today:** the title and "Since Maghrib"; the day line's marks, position and caption; the notices (notifications off, the correction offer, the uḍḥiyah question from 10 to 28 Dhul-Qaʿdah, the pause, the usage question); the one banner, by rank; Active now, sorted with done cards last; Coming up, the next three from 16 days with one row per multi-day item; and the empty-state sentence.
  - **Upcoming:** 60 days, with month-start rows, ranges, No fasting and Paused tags, the items it leaves out, eclipses and the count, for each filter.
  - **Detail:** the status line, whether the tick shows, the tracker and the reminder caption.

#### M1.10 Labels · M

- **Needs:** M1.9, D15.
- **Do:** port `activeMeta`, `comingLabel`, `nextSentence`, `relDay` and `fmtDur` (lines 1106–1147) so they return message keys. Add the English messages, with plural forms wherever counts appear, such as "1 open" and "3 fasts left to make up".

#### M1.11 Presets and push estimate · S

- **Do:** port `pushEstimate`, `presetOf` and `applyPreset` (lines 1150–1184).

#### M1.12 Notification plan · L

- **Needs:** M1.8, M1.10, D11.
- **Do:** `planNotifications(now, state)` returns every notification for the next 60 days, soonest first, capped at 150 on Android and 60 on iOS. Each has an ID (see [Contracts](#contracts)), a time, a channel, a title and body, buttons, a link and a hash of its content.
  - The wording comes from the content. The combined Friday push leaves out al-Kahf once it's ticked, and C8's fallback applies.
  - Done appears only on items with a Done tick. Fasting pushes and the combined Friday push get Later only.
  - Quiet hours: a push about tonight or tomorrow moves to just before they start, and a push about something under way moves to when they end. Eclipse pushes in quiet hours are dropped unless the user allows them.
  - `laterFor(id, now)` returns a time an hour later, if the item's window is still open then.
- **Done when:** tests cover the screen story's "A week in the app", ʿIshāʾ after 10 pm in a London summer, Eid after Fajr at 3 am in Oslo, a tick removing a push, the pause removing fasting pushes, and the cap keeping the soonest.

#### M1.13 Eclipses · M

- **Needs:** M1.2, D10.
- **Do:** with astronomy-engine, find partial and total lunar eclipses and local solar eclipses, keep only those where the moon or sun is above the place's horizon, and give the start and end of the visible part. They become occurrences for Today, Upcoming and pushes.
- **Done when:** times for known eclipses from 2026 to 2030 match NASA's eclipse catalogue within 2 minutes at London, Jakarta, Toronto and Cape Town.

#### M1.14 Weather · M

- **Needs:** M1.2.
- **Do:**
  - `detectEvents(forecast, area, thresholds)` returns rain starting (marked when it's the first after 7 dry days), rain stopping, heavy rain above 7.6 mm an hour, thunder (WMO codes 95–99), and wind: in-app above 60 km/h and a push above 75 km/h. Each event has a dedupe key. The thresholds are arguments, read from `app_config`.
  - `decidePushes(events, installs, now)` allows at most one weather push per install per local day, only for items set to Push, never in quiet hours, and only when notifications are allowed.
- **Done when:** tests pass on recorded Open-Meteo responses, including a forecast that keeps flickering between rain and dry.

#### M1.15 Prototype match, Moments and sweeps · M

- **Needs:** M1.9, M1.12, M1.16.
- **Do:**
  - `tools/prototype-match` loads the prototype's engine from `docs/mobile-app-ui.html`, its script from "Basics" to "Rendering helpers", into a Node sandbox, sets its state, and compares `todayState`, `upcomingRows` and the pushes with core's. It covers two Hijri years in London, and a sample of Fridays, Ramadan and Dhul-Ḥijjah in the other cities. It prints every difference. Each accepted difference is explained in `tools/prototype-match/explained.md`.
  - The prototype's eight Moments become fixed tests of Today.
  - Sweeps from 2026 to 2036 over London, Oslo, Jakarta, Toronto and Cape Town check that no fast falls on the Eids or Tashrīq days, the Ramadan and Friday rules hold, tick keys match their snapshots, and every day has its times in order, including on daylight-saving days.
- **Done when:** this is milestone 1's exit check, below.

### Content track

#### M1.16 Convert the Sunnahs · L

- **Needs:** M1.6, D9.
- **Do:** write `sunnah/weekly.yaml`, `monthly.yaml`, `yearly.yaml`, `weather.yaml`, `disputed.yaml`, `future.yaml` and `excluded.yaml`.
  - Text comes from the prototype's `ITEMS` (lines 713–922), which is newer than the calendar, and from the calendar where the prototype has none.
  - Push wording comes from `notifFor` (lines 1582–1600) and setup's sample reminder. Wording that doesn't exist yet, such as the al-Kahf-only push and the eclipse, heavy rain and wind pushes, is written new and marked for review.
  - Timing comes from `occsForDay` and the screen story's "Times the prototype settles".
  - IDs are final (C13).
- **Done when:** the content builds, and core's occurrences from it match the prototype's (M1.15).

#### M1.17 Duʿāʾ and evidence · L

Scripts copy every hadith and verse from sunnah.com and Quran.com (C16), so nobody types Arabic. The owner reads the result before production (D5).

- **Needs:** M1.6, D16.
- **Do:**
  - `scripts/fetch-sunnah.ts` copies, once, the sunnah.com page of every hadith the content cites, about 65 pages for version 1. It waits a few seconds between pages and sends a plain "Adwam content fetch" user agent. For each hadith it saves the Arabic, the English, the translator's credit, the gradings, the references, the URL and the date to `packages/content/sources/sunnah.com/<id>.json`. The copies are committed, so the pages aren't fetched again. Once the owner has an API key, the same script reads the API instead.
  - `scripts/fetch-quran.ts` does the same for each cited verse on Quran.com: the Uthmani Arabic and the English translation from D16, saved to `sources/quran.com/`.
  - `collections.yaml` and the evidence files hold an entry for every source: its label, link, collection and number, and the narrator and gradings as sunnah.com shows them. The excerpt is the relevant words, cut from the stored copy in Arabic and English, with `partial: true` when it isn't the whole text.
  - `duas.yaml` holds the seven duʿāʾ. Each one's Arabic is cut from the stored copy of the hadith it comes from, replacing the prototype's Arabic wherever the two differ. Its meaning comes from sunnah.com's English of those words. The transliteration stays Adwam's.
  - Where sunnah.com has no English for a hadith, the agent drafts one from the copied Arabic and marks it for the owner's read-through.
  - Sources on neither site, al-Bayhaqī on hadithweb.com and al-Shāfiʿī's *al-Umm*, become book entries with a reference, a link and a one-sentence summary, like the fatwas. Every fatwa and book gets an archived copy of its link.
- **Done when:** the check passes outside release mode, every excerpt matches its stored copy exactly, and the owner has a list for the read-through: the words each excerpt quotes, the gradings, and any English the agent drafted.
- **If sunnah.com blocks the script,** the owner requests the API key now instead of later.

#### M1.18 UI messages · M

- **Do:** `messages/en.json` holds every string from the prototype's screens, sheets, notices, snackbars and dialogs, keyed by screen, plus the M0.2 additions.
- **Done when:** a test proves that every key the app and core use exists.

#### M1.19 Generated calendar · M

- **Needs:** M1.16, M1.17.
- **Do:** `scripts/generate-calendar.ts` rewrites the tables in `docs/sunnah-reminder-calendar.md`, between marker comments, from the content files. CI fails if the committed file is out of date.
- **Done when:** the regenerated calendar lists the same Sunnahs, tiers, timings and sources as today's, and the owner has approved each difference in wording.

#### M1.20 Link check · S

- **Do:** `scripts/check-links.ts` opens every source link, slowly, with a plain "Adwam link check" user agent. A weekly workflow files an issue for each broken link.

**Exit check (architecture):** the Moment tests pass, every difference from the prototype is explained, and the regenerated calendar matches today's.

## Milestone 2: App shell and Today

**Goal:** Setup through Today works on a phone, offline.

**Owner:** create the Sentry organisation with EU data storage, and a project. Put its DSN in EAS as `EXPO_PUBLIC_SENTRY_DSN` for preview and production, and `SENTRY_AUTH_TOKEN` as an EAS secret. Install the preview build on your own phone and send feedback.

### M2.1 Theme, type and language · M

- **Do:**
  - `src/theme/tokens.ts` holds every colour from the prototype's `.screen` variables, light and dark (lines 106–124). Appearance follows the phone, or is set to Light or Dark. The system bars follow the theme.
  - Bundled fonts: Source Serif 4 (400, 600, 700 and italic), Source Sans 3 (400, 500, 600, 700 and italic) and Amiri (400 and 700). The prototype's weight 650 maps to 600.
  - Text styles from the prototype's CSS, in sp, so they follow the phone's font size.
  - `Prose` keeps ﷺ with its word, in Amiri, and keeps hyphenated names such as al-Ākhirah on one line. `ArabicText` draws right to left in Amiri at the prototype's size.
  - i18next loads `messages/en.json`, and one helper turns a core `Msg` into text, formatting times in the place's time zone.
- **Done when:** a gallery screen in test builds shows every colour and text style in both themes.

### M2.2 Icons · S

- **Do:** `tools/icons` turns the Material Symbols Rounded icons the prototype loads (line 11) into SVG components, with filled versions where the prototype fills them, plus the crescent mark.

### M2.3 Components · L

- **Do:** Card, ListRow, Segmented, Switch, Chip, Tag, Button (filled, outlined, tonal, text and small), Notice, Banner, DayLine, Snackbar, Stepper, Checkbox, Sheet (a handle, a rounded top, a dimmed background, at most 88% of the screen height), RadioCard, OptionRow, SectionHeader with its rule, Hero, PageTitle, an AppBar whose title appears on scroll, and the tracker dots. Each carries the role, label and state that the prototype's ARIA attributes give it.
- **Done when:** each has component tests and appears in the gallery.

### M2.4 Saved state · M

- **Do:**
  - Zustand stores for the settings, the trackers, the server cache (empty until M5) and the clock. The first three are saved in MMKV, with versions and migrations.
  - The Supabase session sits in its own MMKV store, left out of Android's backup by backup rules. Settings and trackers are backed up.
  - Defaults from the screen story, C14 and C15.
  - Selectors call core with the time, settings, trackers, content and server cache, and cache their results.
- **Done when:** the stores load synchronously at startup, and a migration test passes from a saved version-1 fixture.

### M2.5 Clock and debug clock · S

- **Do:** a clock that ticks on each minute while the app is open and refreshes when the app returns to the screen. In test builds, a debug override for the date and time with the eight Moments, which M3.6 grows into the debug screen.

### M2.6 Navigation · M

- **Do:** Expo Router with `setup/`, the `(tabs)` group (Today, Upcoming, Settings), `item/[id]` with an optional `date`, `reminders`, `about` and `debug`.
  - Android's back closes a sheet, then leaves a pushed screen, then returns to Today from another tab, then leaves the app.
  - Transitions as in the prototype: push, pop and fade. Detail titles move into the app bar on scroll.
  - Links: `adwam://item/<id>?date=` and `adwam://today`.
  - Setup shows until it's finished.

### M2.7 Cities and location · M

- **Do:**
  - `tools/cities` downloads GeoNames' cities of more than 15,000 people and its country list, and writes a compact file with the name, ASCII name, country, coordinates, time zone and population. The app loads it only to search or locate, because Today reads the saved city.
  - Search ignores case and accent marks and ranks by population, offline.
  - "Use my location" asks for approximate location while the app is in use, then picks the nearest city for its name, country and time zone.
- **Done when:** "lon" finds London, "montreal" finds Montréal, and locating works offline.

### M2.8 Setup · M

- **Needs:** M2.3, M2.7.
- **Do:** the four steps as in the prototype (lines 1523–1574) and M0.2. Refusing location opens the city search. In-app only finishes after step 3. Let me choose ends on Reminders, a placeholder until M3.4. Step 4's Continue asks for Android's notification permission.
- **Done when:** an end-to-end test passes for each path.

### M2.9 Today · L

- **Needs:** M2.3, M2.4, M2.5, M1.9.
- **Do:** the title, the day line, the notices, the banner, and Active now with every card type: a fast before Fajr, Fasting today, Done with the dim-and-drop animation, trackers, the make-up card's stepper and then "Log a make-up fast", planning cards, the inline duʿāʾ and the weather layout. Then the empty state, Coming up with its bells, and All upcoming. Every tick shows a snackbar with Undo and calls the notification resync, which M4 fills in.
- **Done when:** the eight Moments match the prototype in screenshots.

### M2.10 Detail · M

- **Needs:** M2.9, M1.17, D12.
- **Do:** the header and status, What to do, the tick and tracker, the Quran.com button, the duʿāʾ with Copy, Sources with its notes and the expandable evidence, each translation credited to its translator and site, Your reminder, the weather credit, and the item ID and content version. Report a problem opens a sheet, then the GitHub issue form in the browser with the fields filled in.
- **Done when:** every Sunnah's detail screen shows without missing fields, and only links need the network.

### M2.11 Sentry · S

- **Do:** the React Native library with its Expo plugin and the EU DSN. No personal data, typed text dropped from breadcrumbs, and settings values removed from events. The environment, release and update ID on every event. Source maps uploaded for every build and update. The on/off switch lives in the settings store, and its control comes in M3.3.
- **Done when:** a test crash in a preview build shows in Sentry with a readable stack trace.

### M2.12 App test setup · S

- **Do:** jest-expo with Testing Library and a fixed-clock helper. Install Maestro, and write a first flow: Setup to Today in airplane mode.

**Exit check:** in airplane mode, a phone goes from Setup to Today, and the owner has the preview build on their phone.

## Milestone 3: Remaining screens

**Goal:** every screen and sheet matches the prototype, in light and dark.

**Owner:** review the screens next to the prototype and approve them.

### M3.1 Upcoming · M

- Filters, week headings with their dates, days with today marked, month-start rows, ranges, tags, bells, eclipse rows, the legend, the count, and the empty filter state.

### M3.2 Settings · S

- The four groups plus the Privacy row, with the subtitles the prototype shows.

### M3.3 Settings sheets · L

- Location; Prayer times, with the suggested method and today's preview; Jumuʿah time; Hijri date, with the accepted corrections list that M5 fills; Quiet hours, with the eclipse switch; Pause; Uḍḥiyah this year; Appearance; and Privacy. The Notifications row opens Android's notification settings for the app. Any change that affects reminders resyncs the notifications (M4) and the server (M5).

### M3.4 Reminders · M

- The push estimate, the presets, Custom with Reset, and the pause card with its chips. The groups: expanding, switching off and on with the choices inside restored, a choice inside an off group turning it back on, and yearly items under Hijri month headings with "Through the year". The hair-and-nails link to the uḍḥiyah setting, the weather area note, the Disputed group, and Done when arriving from setup.

### M3.5 About · S

- The header with the app and content versions, Sources, Privacy, Credits and Source code. The source section links to the repository and the licence from D3.

### M3.6 Debug screen · M

- **Do:** in development and preview builds only: the date and time, the Moments, a jump to the next push, simulated weather (on the phone for now, through the server in M5), a simulated correction offer, the planned and scheduled notifications, "fire the next notification in 10 seconds", a full reset, and the theme gallery.
- **Done when:** a build check proves the production bundle has no debug route.

### M3.7 Visual review · M

- **Do:** end-to-end tests take screenshots of every screen and sheet, in both themes, at the matching Moments. Put them next to the prototype's. The owner reviews them, and the agent works through the list of fixes.

**Exit check (architecture):** each screen matches the prototype, in light and dark.

## Milestone 4: Local notifications

**Goal:** a week of reminders arrives correctly on every test phone.

**Owner:** open the Google Play Console personal account now, because the identity check takes days. Arrange the test phones: a Pixel, a Samsung, a Xiaomi and a low-end phone.

### M4.1 Channels and buttons · S

- The six channels (C11), named from the messages, and the two button sets: Done and Later, and Later alone.

### M4.2 Scheduling · M

- `syncSchedule()` compares core's plan with what Android has scheduled, by ID and content hash. It cancels what's no longer wanted and adds what's missing. Only one run happens at a time. It records counts, never content, as Sentry breadcrumbs.

### M4.3 When scheduling runs · S

- At launch, on returning to the screen, after any setting change or tick, after a notification button, after a correction is accepted, after a content update, when the time zone or location changes, and in the background task.

### M4.4 Taps and buttons · M

- A tap opens the item's detail screen, or Today for the combined Friday push, from a cold start too. Done ticks and reschedules in the background, in the way M0.7 chose. Later schedules one copy an hour later, if the window is still open.

### M4.5 Background task · S

- Registered at the interval M0.7 chose. It reschedules, and checks for an update if M0.7 showed that works in the background. From M5 it also refreshes server data and syncs once a day.

### M4.6 Permission state · S

- The permission is read each time the app returns to the screen, so the Notifications are off notice and the Settings row stay right.

### M4.7 Permission check · S

- The preview build workflow reads the built APK's permissions and fails if it finds exact alarms, precise location or background location.

### M4.8 A week on real phones · M

- A preview build on each test phone, following `docs/runbooks/notification-test.md`: a week on Recommended, a restart, battery saver, Done and Later with the app closed, a time-zone change, a daylight-saving change, and a night of idling. Results go in the runbook.

**Exit check (architecture):** a week of reminders arrives correctly on every test phone.

## Milestone 5: Server

**Goal:** simulated rain reaches a phone, and a correction is offered and applied.

**Owner:**

- Create a Firebase project with an Android app for each app ID in D2. Upload its service account key to EAS's credentials, and store `google-services.json` as an EAS file variable.
- Create an Expo access token and turn on Expo's enhanced push security. Add it to Supabase's secrets as `EXPO_ACCESS_TOKEN`, along with the functions' `SENTRY_DSN`.
- Name the admins, the owner and the helper, with their email addresses. Supabase's built-in email only reaches members of the Supabase organisation, so invite the helper or set up an email service on its free tier.
- Start recruiting 15–20 testers, including Samsung and Xiaomi owners.

### M5.1 Tables and access · M

- Migrations for the architecture's tables. Each area, kind and start time appears once in `weather_events`, and each install and event once in `push_outbox`. Row-level security is on everywhere, and the app's database roles get no direct table access. The RPC functions run with definer rights, check `auth.uid()` and fix their search path.

### M5.2 App RPCs · M

- `sync_install_v1`, `my_weather_v1`, `corrections_v1`, `config_v1` and `forget_me_v1`, each validating its input. `debug_weather_event_v1` works only when `app_config` allows debug tools: on locally and in staging, off in production.

### M5.3 Admin RPCs · S

- Draft, publish, withdraw and list corrections, and estimate how many installs would see a different date. Only members of `admins` can call them.

### M5.4 Database tests · M

- One install can't read or change another's row. The app's roles can't read tables. Bad input is refused. Only admins reach the admin functions. Duplicate events and pushes are impossible.

### M5.5 Shared code for functions · S

- `pnpm server:prepare` bundles core with its libraries, `content.json` and `messages/en.json` into `supabase/functions/_shared/`, which Git ignores. CI runs it before tests and deploys.

### M5.6 weather-tick · L

- Fetches the areas that are due, within the day's Open-Meteo budget: precipitation by the hour and by 15 minutes, weather codes and gusts, with cloud cover stored for later. It sets each area's next fetch: every 3 hours when calm, every 30–60 minutes when rain or strong wind is likely within 3 hours. It detects events with core, stores each once, queues pushes from core's decisions, and records its counts in `job_runs`. Errors go to Sentry.

### M5.7 push-send · M

- Sends queued pushes through Expo, 100 at a time, with the access token, the right channel and high priority. It retries with back-off when Expo is busy, and never sends a push twice.

### M5.8 push-receipts · S

- Reads delivery receipts and deletes installs whose push token no longer works.

### M5.9 publish-correction · M

- Checks the admin, the month and the date, and warns if the date is more than 2 days from Umm al-Qura. It publishes the correction, then queues a push to the installs in that country whose own day 1, with their method and shift, differs. During an install's quiet hours, the push uses the silent channel. Withdrawing marks the correction withdrawn, and phones unpin it at their next fetch.

### M5.10 Cleanup and schedules · S

- The daily cleanup. `pg_cron` starts every job through `pg_net`, with a key from Supabase Vault that a short SQL script sets once per project. The owner runs it on staging now, and on production in M6.9.

### M5.11 Function tests · M

- Deno tests replay recorded Open-Meteo and Expo responses. `pnpm server:test`, `pnpm server:tick` and `pnpm server:simulate-rain` run against local Supabase.

### M5.12 The app's server connection · L

- **Do:**
  - supabase-js with its session in the separate MMKV store. Anonymous sign-in at first launch, retried until the phone is online.
  - The Expo push token, and `sync_install_v1` whenever a value it sends changes and once a day. The area is sent only while Weather and eclipses is on.
  - Weather cards on Today for rain starting, rain stopping, heavy rain, thunder and wind, with the Open-Meteo credit.
  - The correction notice, with Use, Keep my dates and Undo. Accepted corrections in the Hijri date sheet. A withdrawn correction unpins. Notifications resync whenever corrections change.
  - `config_v1`: below the minimum version, Today shows an update notice and the server features stop, while local reminders keep working.
  - "Delete my data from the server" calls `forget_me_v1`, then signs out and clears the server cache.
  - A tap on a server push opens the right screen.
- **Done when:** the whole path works against local Supabase and against staging.

### M5.13 Admin page · M

- **Needs:** M5.3, D14.
- **Do:** `apps/admin`, a static page built with Vite and TypeScript. Sign-in with a code sent by email, for existing admins only. The form takes the country, the Hijri month and year, the announced day 1 and a source link. It shows the Umm al-Qura date, warns beyond 2 days, estimates the affected installs, publishes and withdraws, and lists past corrections. A workflow deploys it to GitHub Pages, and its address goes into Supabase's allowed redirects.

### M5.14 Staging deploys and health check · S

- On merge to `master`, deploy migrations and functions to staging and publish an update to the preview channel. A daily workflow reads the last weather-tick run and the day's Open-Meteo calls on staging, and on production once it exists, and opens an issue if either is wrong. This also stops the free projects from pausing.

**Exit check (architecture):** simulated rain on staging reaches a phone as a push and a card, and a correction published on the admin page is offered on a phone and applied. One install can't read another's data.

## Milestone 6: Hardening

**Goal:** no release blockers.

**Owner:** set up production, now that everything works on staging: the Supabase production project, a second Supabase token scoped to it, and the `production` environment's secrets in GitHub, with yourself as a required reviewer. Create PostHog on its EU host, with the project key in EAS for production only. Confirm or change the accepted defaults, D3 and D4 especially. Arrange a check of the consent approach with someone who knows data-protection law. Approve the privacy policy and the store listing. Read through all the content (M6.6).

### M6.1 Accessibility · M

- A TalkBack pass on every screen. Touch targets of at least 48 dp. Layouts that hold at 130% and 200% font size. A contrast check of every text colour against WCAG AA, with any colour change approved by the owner. Animations follow the phone's reduce-motion setting.

### M6.2 PostHog · M

- The React Native library on the EU host, off until the user agrees (D4). No IP addresses, location lookup, session replay or touch capture. A typed `track()` function that accepts only the architecture's events and properties, with a test proving the forbidden ones can't get through. The app version, content version, platform and country on every event. Screen views from the router. The question from D6, and the switch in Privacy.

### M6.3 End-to-end tests · M

- Maestro flows for every setup path, ticking with Undo, logging fasts and the trackers, make-up days, reminder choices, presets and groups, the pause, every sheet, the detail and report sheets, Upcoming's filters, the theme, and the Moments through the debug screen. They run every night on an emulator in CI, and before every release.

### M6.4 Speed and size · S

- Today shows within 2 seconds of launch on the low-end phone, and scheduling takes under half a second. Record the app's size and the sizes of `content.json` and the city list.

### M6.5 Robustness · S

- An error screen that reports to Sentry. Every screen works offline. Damaged storage falls back to defaults, keeping trackers where it can.

### M6.6 Content ready to ship · M

- The owner reads every entry. The agent then marks each one published, with the owner as reviewer, so `content:check --release` passes. The calendar regenerated, and the link check clean. The Arabic checked on real phones: Amiri's letter joins and vowel marks intact and not clipped. Quran.com's Uthmani text uses marks that ordinary Amiri may draw badly; if it does, verses use Amiri Quran instead.

### M6.7 Privacy and store material · M

- The privacy policy page, on GitHub Pages or the domain, and About's final text. The Data safety answers: approximate location, device IDs, crash logs and app interactions. The store listing, screenshots taken by the end-to-end tests, a feature graphic, an adaptive icon from the crescent mark, the content-rating answers, and the target API level Google Play requires at the time.

### M6.8 Licences · S

- Licence files per D3, and credits in About and the README.

### M6.9 Production pipeline · M

- The release workflow deploys migrations and functions to production after the owner's approval. Cron jobs and the Vault key on production. EAS's production variables. Production's `app_config`, with debug tools off. The runbooks in `docs/runbooks/`: app release, content release and rollback, publishing a correction, and incidents (the weather job stopped, the Open-Meteo budget spent, pushes failing, a project paused).

**Exit check:** no release blockers: every earlier exit check still holds, no issue labelled `release-blocker` is open, all content is published, and the data-protection check is done.

## Milestone 7: Android release

**Goal:** live on Google Play.

### M7.1 First upload · S

- A release tag builds production. The owner uploads the first build to internal testing by hand and sets up Play App Signing. Later uploads go through `eas submit` with the Play service account.

### M7.2 Closed test · M

- The owner invites 15–20 testers, so that at least 12 stay opted in for 14 days in a row. Agents sort feedback into issues and ship fixes as over-the-air updates where they can.

### M7.3 Production · S

- The owner applies for production access. The rollout goes to 10%, then 50%, then 100%, watching crash-free sessions in Sentry, the health check and push receipts.

### M7.4 Content releases · S

- A content tag publishes an over-the-air update to 10%, then 100%. If something's wrong, the previous update is republished, as the runbook describes.

## Milestone 8: iOS

**Goal:** live on the App Store.

**Owner:** an Apple Developer account ($99 a year, or a nonprofit waiver), App Store Connect, and an APNs key and an App Store Connect API key in EAS.

- iOS settings: the bundle ID, permission texts, approximate location and the notification buttons.
- The 60-pending limit checked on a device, and the background task on iOS's scheduler.
- An iOS pass on the screens: safe areas, swipe back, sheets and Dynamic Type.
- Sentry and PostHog on iOS, TestFlight testing, App privacy labels, and review submission.

## CI workflows

| Workflow | Trigger | What it runs |
|---|---|---|
| `ci.yml` | Pull request | `pnpm check`, database tests, function tests, the calendar up-to-date check, the prototype match when core or content changes, and Expo's fingerprint check, which labels the PR `needs-new-build` |
| `deploy-staging.yml` | Merge to `master` | `server:prepare`, staging migrations and functions, and an update to the preview channel |
| `preview-build.yml` | By hand, and weekly | A preview APK, with the permission check from M4.7 |
| `release.yml` | Tag `v*` | After approval: production migrations and functions, a production build, and an upload to internal testing |
| `content-release.yml` | Tag `content-*` | If the fingerprint is unchanged, an update to production at 10% |
| `e2e-nightly.yml` | Nightly | The Maestro suite on an emulator, against local Supabase |
| `daily-health.yml` | Daily | The weather job and the Open-Meteo budget, on staging, and on production from M6.9 |
| `weekly-links.yml` | Weekly | The source link check |
| `admin-pages.yml` | Changes in `apps/admin` | Builds and deploys the admin page |

## Tests

| What | Tool | When |
|---|---|---|
| Core | Vitest | Every PR |
| Content | The check script and Vitest | Every PR |
| Core against the prototype | `tools/prototype-match` | PRs that touch core or content |
| App components and screens | jest-expo and Testing Library, with a fixed clock | Every PR |
| Database access | pgTAP through `supabase test db` | Every PR |
| Edge Functions | Deno tests with recorded responses | Every PR |
| End to end | Maestro on an emulator | Nightly, and before each release |
| Notifications on real phones | The runbook's checklist | M0, M4 and before release |

## Risks

The architecture's milestone 0 risks are covered by M0.7. These are the plan's own:

| Risk | Effect | Response |
|---|---|---|
| The owner's read-through comes late | Content that isn't published can't ship to production | Start once M1.17 is done, one section at a time. Scripts copy the texts, so it's reading, not typing. Development never waits for it. |
| sunnah.com blocks the one-time copy | Evidence stays empty | The script runs once, slowly, and its copies are committed. If it's blocked, the owner requests the API key early. |
| A translator or publisher objects to their text being quoted | That text has to come out | Every excerpt records its translator and site, and About credits them. Swapping a text for Adwam's own rendering is a content update. |
| Approximate notifications arrive late | Short-window reminders miss their window | Measured in M0.7, with options for the owner |
| Supabase's anonymous sign-in is abused | Fake installs and wasted pushes | Supabase's sign-in rate limits, the cleanup job, install counts in the health check, and CAPTCHA later if needed |
| A content or app update meets older saved data | Settings or ticks lost or broken | Versioned stores with migrations, fingerprint runtime versions, and snapshot tests of tick keys |
| A mistake in religious content | Users lose trust | Review before publishing, Report a problem on every item, and fixes within days through updates |
| The closed test slips | The launch slips | Recruit early, with more testers than needed |
| Consent or Data safety is wrong | Store or legal trouble | Opt-in by default, a legal check, and an allowlist in code |

## Owner checklist

| When | What | How long it takes |
|---|---|---|
| Before M0 | Done: drafts approved, app IDs chosen, defaults accepted | — |
| M0 | Switching `eas` to MSalman5230, Supabase staging, the GitHub environments and staging secrets, branch protection on `master`, Docker, two phones for the risk tests | About an hour, plus finding phones |
| M1 | Nothing | — |
| M2 | Sentry, with its DSN and token in EAS. Try the preview build. | Half an hour |
| M3 | Approve the screens | — |
| M4 | Google Play Console account, and the four test phones | Days for the identity check |
| M5 | Firebase, the FCM key and `google-services.json` in EAS, the Expo access token, Supabase secrets on staging, the admins, testers | Recruiting takes days |
| M6 | The production project and its secrets, PostHog, confirming the defaults, the legal check, the privacy policy, the store listing, the content read-through | The legal check may take weeks |
| M7 | First upload, closed test, production access, rollout approvals | At least 14 days, plus Google's review |
| M8 | Apple account, APNs and App Store Connect keys | Days |

## After version 1

- A sunnah.com API key from the owner. The fetch script then reads new hadith from the API, and compares the API's text with the stored copies.
- Translations as overlay files, then an Arabic interface written right to left.
- A month grid on Upcoming.
- Location-based reminders, which need background location and Google Play's approval.
- MET Norway as a weather backup, or a private copy of Open-Meteo.
- The eclipse cloud-cover flag.
