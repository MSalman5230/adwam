# Mobile app architecture

This is the build plan for Adwam. It covers how the app, the shared code and the server fit together, where each piece of code lives and why, and the steps to a production release. It builds on [mobile-app-stack.md](mobile-app-stack.md), [mobile-app-screen-story.md](mobile-app-screen-story.md), [sunnah-reminder-calendar.md](sunnah-reminder-calendar.md) and the prototype [mobile-app-ui.html](mobile-app-ui.html). The prototype stays the source of truth for screens and behaviour.

## Decisions

The owner made these decisions on 21 November 2026:

| Question | Decision |
|---|---|
| Platforms | Android first. The code stays cross-platform, and iOS follows once Android is stable. |
| Languages | English only in version 1, built so translations can be added without restructuring. |
| Hijri dates | The user's ±1 day shift is the default. An admin, the owner or a helper, can publish a correction for a country. Each user chooses to use it or keep their own dates. |
| Budget | Free tiers at launch. Upgrade when one of the triggers under [Costs](#costs-and-upgrade-triggers) is reached. |
| Eclipses | Computed on the phone. |
| Fasting on Fridays | A fast with its own reason may fall on a Friday: ʿĀshūrāʾ, ʿArafah, a White Day, a Shawwāl fast or a make-up fast. |
| Crash reports and analytics | Sentry and PostHog. See [Crash reports and analytics](#crash-reports-and-analytics). |
| Code | The current repository, [MSalman5230/adwam](https://github.com/MSalman5230/adwam), which is public. One developer for now. |
| Hadith and Qurʾan text | The Arabic and the English are quoted as sunnah.com and Quran.com show them, with credit to each site and translator. For version 1, a script copies the sunnah.com pages once. The sunnah.com API replaces that later. |

This plan makes these architecture decisions:

1. **One pure TypeScript engine runs in three places.** Hijri dates, prayer times, the reminder rules, the data behind each screen and the notification plan live in one package, with no React Native and no network or storage code. The app, the server and the tests all run it.
2. **The phone schedules calendar reminders.** They work offline, need no server, and keep trackers private.
3. **The server does only what the phone can't:** detect weather, send weather pushes, and publish date corrections.
4. **Eclipses move to the phone.** They are known years ahead, so the phone computes them and schedules them like calendar reminders. This changes the calendar's note that the server detects them.
5. **Structured content files are the source of truth** for every Sunnah: its text, timing, duʿāʾ and evidence, including the Arabic. The calendar Markdown's tables are generated from them. [sunnah-content-format.md](sunnah-content-format.md) describes the format. Most new Sunnahs will need no code. This reverses the stack file's "JSON generated from the calendar Markdown", because the app needs fields the Markdown can't hold.
6. **The app has no accounts, but each install gets a real anonymous identity.** Supabase's anonymous sign-in gives each install a random ID, and database rules limit each install to its own row.

## The system at a glance

```
PHONE: Expo app
  Screens (Expo Router)     Stores (Zustand + MMKV)     Debug clock (test builds only)
        |                          |
        +------ packages/core <---- packages/content
                Hijri, prayer times, occurrences, rules,
                screen data, labels, notification plan, eclipses
  Local notifications: calendar items, eclipses, Later
  Background task: reschedule, refresh corrections and weather
        |                                                  ^
        | sync_install: push token, country, time zone,    | Expo push:
        | quiet hours, weather choices, ~10 km area        | weather, date corrections
        v                                                  |
SUPABASE
  Anonymous sign-in, Postgres, RPC functions, Cron
  Edge Functions:  weather-tick  <-> Open-Meteo
                   push-send      -> Expo Push -> FCM (Android), APNs (iOS)
                   push-receipts
                   publish-correction <- apps/admin (owner and helper)
```

## What runs where, and why

| Job | Runs on | Why |
|---|---|---|
| Hijri date, prayer times, which items are active | Phone, through core | Needed offline, whenever the app is open. |
| Calendar notifications: fasts, Friday, Ramadan, Eid and the rest | Phone, as local notifications | They fire without the network or the server. They depend on ticks, such as al-Kahf done removing a line from the Friday push, and ticks stay on the phone. |
| Eclipses: Upcoming rows and the push | Phone, through core | Fully predictable, so no server or weather data is needed. |
| Trackers, done ticks, make-up count, uḍḥiyah answer | Phone only | The privacy promise: trackers stay on the phone. |
| Weather detection and weather pushes | Server, through core | iOS can't check weather reliably in the background. Grouping users by area ties Open-Meteo calls to the number of areas, not users. |
| In-app weather cards: rain stopping, thunder, wind | Server detects, phone shows | One detection, so the push and the card always agree. |
| Date corrections | An admin publishes on the server, and each user decides on the phone | The user's answer in the decisions above. |
| Reminder text, sources, duʿāʾ | Content package, bundled in the app | Works offline. Fixes ship as over-the-air updates. |

## Repository layout

The repository becomes a pnpm workspace. The spec files, the plan and the prototype live in `docs/`.

```
adwam/
  apps/
    mobile/              Expo app
    admin/               Small web page for publishing date corrections
  packages/
    core/                Pure TypeScript engine: no React, no network, no storage
    content/             Reminder content, UI wording, schema and build script
  supabase/
    migrations/          Tables, access rules, RPC functions, cron schedules
    functions/           Edge Functions (Deno)
    tests/               Database tests for the access rules
  .github/workflows/     Checks, deploys, release builds
  docs/                  The specs, plan.md and the prototype, mobile-app-ui.html
```

**Why a workspace and not a single app folder.** The engine must run in Hermes on the phone, in Deno on Supabase and in Node for tests. As its own package with no React Native dependency, it can't import phone-only code by accident. The server can then bundle it without the app.

## packages/core: the engine

Rules for this package:

- **Pure functions only.** Every function receives the current time, the settings, the trackers and the content as arguments. Nothing reads the clock, storage or the network. This lets the real app keep the prototype's Moment and Clock testing, and lets the server reuse the same code.
- **No `Intl` calendars.** The prototype gets Hijri dates from `Intl` with `islamic-umalqura`, which Hermes on phones doesn't reliably support. Core ships its own Umm al-Qura table of month starts, and CI checks it against Node's built-in calendar data.
- **Stable keys.** Ticks are saved under occurrence keys such as `kahf:2026-12-17`. The key format is a contract with snapshot tests, because changing it would lose users' ticks.
- **Labels return message keys, not English.** For example, `comingLabel()` returns a message key such as `coming.reminderTonight` with its parameters, and the app turns it into text in the user's language.

| Module | What it does | Prototype code it replaces |
|---|---|---|
| `prayer` | The five prayers and sunrise, for each calculation method and ʿAṣr rule, with high-latitude rules | `PT.compute`, replaced by adhan-js |
| `hijri` | Umm al-Qura and tabular months, the ±1 shift, accepted corrections, the day turning at Maghrib | `hijriRaw`, `hijriOf`, `effHijri` |
| `day` | Prayer times and the Hijri date for a calendar date in a time zone | `dayInfo` |
| `rules` | Each item's level, the pause, whether a push is allowed, the fasting rules | `level`, `paused`, `pushAllowed`, `visibleOcc`, `fastingAllowed` |
| `occurrences` | Each item's window and push time on a date, read from the timing fields in the content files, plus the named rules that are too specific for them | `occsForDay` |
| `views` | The data behind Today, Upcoming and the detail screen, including banners and notices | `todayState`, `bannerData`, `notices`, `upcomingRows`, `nextOccurrence` |
| `labels` | Phrases such as "until Maghrib" and "Reminder tomorrow after ʿIshāʾ" | `activeMeta`, `comingLabel`, `nextSentence`, `relDay` |
| `presets` | The Recommended and In-app only presets, and the push estimate | `pushEstimate`, `presetOf`, `applyPreset` |
| `notifications` | The list of local notifications to schedule: time, channel, text, actions, quiet hours, limits, the combined Friday push | `notifFor`, `pushesBetween`, plus the quiet-hours rules the prototype only fakes |
| `eclipses` | Eclipses visible from a place, with start times | New, built on astronomy-engine |
| `weather` | Turns a forecast into events, and decides each install's push | New, used by the server |
| `places` | The weather area from coordinates, and the suggested prayer method for each country | New |

**How an accepted correction works.** It pins day 1 of that month. The months on either side get longer or shorter so that each stays 29 or 30 days long. This needs its own tests.

## packages/content: Sunnahs, duʿāʾ and evidence

[sunnah-content-format.md](sunnah-content-format.md) is the full specification. In short:

- **One YAML file per calendar section** (weekly, monthly, yearly, weather, disputed) lists its Sunnahs. Each entry holds the text, the timing and the notification wording, and refers to duʿāʾ and evidence by ID.
- **`duas.yaml`** holds every duʿāʾ: the Arabic with full vowel marks, the transliteration and the meaning.
- **The evidence files** hold every source's reference, link and gradings. Hadith and Qurʾan sources also hold the relevant Arabic words and their English, copied from sunnah.com and Quran.com, so the detail screen can show the evidence offline.
- **A check runs on every pull request.** It fails on missing Arabic, unknown IDs, unreviewed content and wrong transliteration marks.
- **The build produces `content.json`** and regenerates the calendar Markdown's tables.
- **The content is built into the app, not fetched from the server.** A new install has everything offline from its first launch, and fixes arrive as over-the-air updates. The server's Edge Functions get the same file when they're deployed.
- **UI wording** lives separately in `messages/en.json`, which the app and the server's push wording share.
- **A weekly link check** opens every source URL and files an issue for each broken one.

## apps/mobile: the Expo app

### Libraries

| Need | Pick | Why |
|---|---|---|
| Navigation | Expo Router | Screens are files, and a notification can open a link such as `/item/kahf?date=2026-12-17`. |
| State | Zustand | Small, and works outside React, which the background task and notification buttons need. |
| Storage | MMKV | Reads are instant, so Today draws from saved state without a loading flash. It also works in background tasks. |
| Notifications | expo-notifications | Scheduled local notifications, Android channels, notification buttons and Expo push tokens. |
| Background work | expo-background-task | Regular rescheduling and refreshing, using Android's WorkManager. |
| Location | expo-location, approximate only | Prayer times need only city precision, and approximate location is easier to justify for privacy. |
| Bottom sheets | @gorhom/bottom-sheet | Matches the prototype's sheets: a handle, a rounded top, a dimmed background, at most 88% of the screen height. |
| Fonts | Source Serif 4, Source Sans 3 and Amiri, bundled | Same as the prototype, with nothing to download at startup. |
| Icons | Material Symbols Rounded, as SVG | The prototype's icon set. |
| Server connection | supabase-js | Anonymous sign-in and RPC calls. |
| Crash reports | Sentry | Crashes and errors, with source maps for each build and update. See [Crash reports and analytics](#crash-reports-and-analytics). |
| Analytics | PostHog | Which screens and reminders are used, and whether notifications get opened. Same section. |
| Translations | i18next, English only | Ready for more languages. |

There is no library for caching server data, such as React Query. The server data is tiny, and the background task needs it outside React.

### Folders

```
apps/mobile/
  app/                     screens only, kept thin
    _layout.tsx            fonts, theme, snackbar and sheets, notification taps
    setup/                 location, hijri, reminders, notifications
    (tabs)/                index (Today), upcoming, settings
    item/[id].tsx          Sunnah detail
    reminders.tsx, about.tsx, debug.tsx
  src/
    theme/                 colours and type from the prototype's CSS variables, light and dark
    components/            Card, ListRow, Segmented, Switch, Chip, Tag, Button, Notice,
                           Banner, DayLine, Snackbar, Stepper, Checkbox, Sheet
    features/              today, upcoming, detail, settings, reminders, setup, about
    state/                 settings, trackers and server-cache stores, and their migrations
    services/              notifications, location, backend, background, clock
    data/                  the bundled city list
```

### State on the phone

| Store | What it holds | Saved on the phone |
|---|---|---|
| settings | Place, prayer method, ʿAṣr rule, Jumuʿah time, Hijri method and shift, accepted corrections, quiet hours, theme, reminder choices, group switches, pause, the uḍḥiyah answer for each Hijri year | Yes |
| trackers | Done ticks, fasting log, make-up count, dismissed notices | Yes |
| server | Offered corrections and the user's answers, current weather events, last sync time | Yes, as a cache |
| clock | The current minute. In test builds, the debug screen can change it. | No |

- **Saved stores have a version number and migrations,** because an over-the-air update can change their shape on phones that already hold data.
- **The uḍḥiyah answer is saved for each Hijri year.** That gives the yearly reset the prototype skips.
- **Android's backup restores trackers on a new phone.** The sign-in session is excluded from the backup, so each phone gets its own install ID.

### Notifications

One function does all the scheduling, and it runs often:

1. Core's `planNotifications()` turns the settings, trackers and content into the notifications for the coming weeks.
2. `syncSchedule()` compares that list with what Android already has scheduled, matching on stable IDs. It cancels what's no longer wanted and adds what's missing.
3. It runs at launch, when the app returns to the screen, after any setting change or tick, after a notification button, after a correction is accepted, and in the background task.

Details:

- **How far ahead:** 60 days on Android, at most about 150 notifications. On iOS, at most 60 waiting at once, leaving room for Later. This goes further than the stack file's 2–3 weeks, so a user who doesn't open the app for a month still gets reminders.
- **Approximate timing,** with no exact-alarm permission. A build check fails if `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM` gets into the app's permissions.
- **Android channels:** Weekly, Monthly, Yearly, Weather and eclipses, and Date corrections.
- **Buttons:** Done ticks the item and reschedules. Later sends the push once more an hour later, if its window is still open.
- **Quiet hours** follow the screen story. A push about something tonight or tomorrow moves earlier. A push about something already under way moves later. Weather pushes are dropped. Eclipses notify only if the user allows it.
- **Tapping** a push opens the item's detail screen. The combined Friday push opens Today.

### Location and places

- **Use my location** asks for approximate location while the app is in use, and reads it again at each launch.
- **The app includes a city list** from GeoNames, with every city of more than 15,000 people. That's about 1–2 MB. It powers the city search, and the nearest city gives Today its city name, the country and the time zone. Search works offline and sends nothing anywhere. GeoNames data is licensed CC BY 4.0, so About credits it.
- **The weather area** is the position rounded to a 0.1° grid, about 10 km across, computed on the phone. Exact coordinates never leave the phone.

### Debug screen

Test builds turn the prototype's left panel into a hidden screen. It can set the clock, jump to a Moment, simulate rain and fire the next notification in 10 seconds. Production builds leave it out.

## Supabase: the server

### Identity and access

- **The app signs in anonymously on first launch.** The user never sees an account. The anonymous user ID is the install ID. Reinstalling the app creates a new ID, and the cleanup job removes the old row.
- **The app never reads or writes tables directly.** It calls a few RPC functions with a version in their names. Old app versions stay in use for years, so the tables can change while the functions keep their shape.

| RPC function | Called by the app | What it does |
|---|---|---|
| `sync_install_v1` | When a value it sends changes, and once a day from the background task | Saves this install's row: push token, platform, app and content versions, country, time zone, quiet hours, weather choices, the area or none, Hijri method and shift, and whether notifications are allowed |
| `my_weather_v1` | At launch and in the background | Current weather events for this install's area only |
| `corrections_v1` | At launch and in the background | Published corrections for the install's country |
| `config_v1` | At launch | The minimum supported app version and feature switches |
| `forget_me_v1` | When the user asks | Deletes the install's row |

### Tables

| Table | What it holds |
|---|---|
| `installs` | One row per anonymous install, with the values above |
| `areas` | Each 0.1° area with at least one install: its center, time zone, latest forecast, when it last rained, and when to fetch next |
| `weather_events` | Events detected for each area: rain starting, rain stopping, heavy rain, thunder and wind, with their times and whether they may push. Each area, kind and start time appears once, so a job that runs twice never duplicates an event. |
| `push_outbox` | Every push to send, with its status and Expo's receipt ID. Each install and event appears once, which keeps "never the same event twice". |
| `hijri_corrections` | Country, Hijri month and year, announced day 1, source link, status (draft, published or withdrawn) and author |
| `admins` | The people allowed to publish corrections |
| `app_config` | Thresholds (7.6 mm an hour, gusts of 60 and 75 km/h, 7 dry days), the minimum supported app version and a weather on/off switch, all changeable without a release |
| `job_runs` | Each job run, its counts, and the day's Open-Meteo calls |

### Jobs

Supabase Cron starts the Edge Functions on a schedule. All weather logic comes from core.

| Function | When | What it does |
|---|---|---|
| `weather-tick` | Every 15 minutes | Fetches the areas that are due, within the day's Open-Meteo budget. Detects events, then queues pushes for installs that chose Push, applying the one-a-day limit and quiet hours. |
| `push-send` | After `weather-tick`, after a correction is published, and every 5 minutes as a backup | Sends queued pushes through Expo's push service, 100 at a time |
| `push-receipts` | Every 30 minutes | Reads delivery receipts and deletes installs whose push token no longer works |
| `publish-correction` | From the admin page | Checks the date, publishes the correction, and queues pushes to the installs it affects |
| `cleanup` | Daily | Removes installs not seen for 120 days and areas with no installs left |

**Weather budget.** Open-Meteo's free limit is 10,000 calls a day for the whole server.

- Fetch each area every 3 hours while its forecast is calm.
- Fetch every 30–60 minutes while rain or strong wind is likely within 3 hours.
- Between fetches, use the stored forecast to send each push at the forecast start time.

That covers roughly 1,000 areas. If the app outgrows that, the stack file's options apply: run a private copy of Open-Meteo, or add MET Norway as a backup.

### Date corrections

1. **The owner or a helper signs in** to `apps/admin` with a code sent by email. It's a one-page site on a free static host.
2. **They enter the correction:** the country, the Hijri month and the announced day 1, with a source link. The page shows the Umm al-Qura date, warns if the two differ by more than 2 days, and estimates how many installs would see a different date.
3. **Publishing pushes to the installs it affects:** those in that country whose dates differ. For example, "Ramadan starts on Sunday in the United Kingdom. Your app says Monday."
4. **Today's Date correction notice offers two buttons:** "Use Sunday" and "Keep my dates". Using it pins that month's start on the phone, with Undo. Settings, Hijri date lists the accepted corrections, and each one can be removed.
5. **A withdrawn correction unpins itself** on phones that accepted it.

**Corrections ignore quiet hours.** They can be urgent: Eid can be announced late on the night of the 29th. During quiet hours they arrive without sound, on a separate silent channel.

## What the server knows

| Stays on the phone | Sent to the server |
|---|---|
| Exact location and chosen city | An area about 10 km across, only while Weather and eclipses is on |
| Prayer method, Jumuʿah time, theme | Country and time zone |
| Choices for reminders that aren't about weather | Weather reminder choices and quiet hours |
| All trackers and ticks, the make-up count | Hijri method and shift, to decide who gets a correction |
| The uḍḥiyah answer and accepted corrections | Anonymous install ID, push token, app and content versions |

About's privacy text needs updating to mention the country, the time zone and the Hijri settings.

## Crash reports and analytics

| | Sentry | PostHog |
|---|---|---|
| Purpose | Crashes and errors in the app and the Edge Functions | Setup completion, which screens get opened, which reminders users turn off, whether notifications get opened, how many users come back |
| Data stored in | The EU | The EU |
| Identity | None. Not linked to the Supabase install ID. | A random anonymous ID, not linked to the install ID, with no person profiles |
| Never sent | IP addresses, location, settings values, the text of a problem report | IP addresses, location, ticks, fasts, the make-up count, the pause, the uḍḥiyah answer |
| Default | On, with a switch to turn it off | Off until the user agrees |

**Why the limits are strict:**

- **Using a Sunnah app reveals religious belief.** Under the EU and UK GDPR, data that reveals religious belief is a special category that needs explicit consent. That's why PostHog waits for a yes.
- **The pause could reveal health.** Repeated 7-day pauses can point to periods or illness, so pause events are never sent.
- **Trackers stay on the phone.** Leaving ticks and fasts out of both services keeps Setup's promise true.

Before launch, check this approach with someone who knows data-protection law.

- **Asking:** setup asks once whether to share usage statistics, with no answer preselected. Settings gets a Privacy row with both switches.
- **Events in version 1:**
  - `setup_completed`, with the preset, location mode and notification answer
  - `reminder_level_changed`, with the item and level
  - `preset_applied`
  - `notification_opened`, with the item and button
  - `correction_answered`, saying whether the correction was used or kept
  - `report_opened`, with the item
  - screen views

  Each event carries the app version, content version, platform and country.
- **PostHog setup:** the React Native library on PostHog's EU host. Location lookup from IP addresses is off, and the project discards IP addresses. Session replay and touch capture are off.
- **Sentry setup:**
  - The React Native library with its Expo plugin, and Sentry's Deno library in the Edge Functions.
  - Default personal data is off, the project doesn't store IP addresses, and breadcrumbs that contain typed text are dropped.
  - Every build and every over-the-air update uploads its source maps, so each error points to the code that actually ran.
- **Google Play's Data safety form** must list approximate location, device IDs, crash logs and app interactions.

## Environments and deployment

| | Development | Preview | Production |
|---|---|---|---|
| Supabase | On the developer's machine, with the Supabase CLI | Staging project | Production project |
| App build | Development build | Test APK, with the debug screen | Play Store release, without the debug screen |
| How it reaches a phone | Built on this PC, on the emulator or over USB | A download link from EAS | Google Play: internal testing, then closed testing, then production |
| App ID | `com.msalman5230.adwam.dev` | `com.msalman5230.adwam.preview` | `com.msalman5230.adwam` |
| Over-the-air update channel | None | `preview` | `production` |

- **Over-the-air updates.** Each build's runtime version comes from a fingerprint of its native code, so an update only reaches builds it is compatible with. Content and JavaScript fixes ship as updates to 10% of users, then 100%. Native changes need a new store build.
- **Push credentials.** Firebase Cloud Messaging credentials go into EAS for Android, and an APNs key follows in the iOS phase. Expo's push access token is turned on, so only Adwam's server can send to Adwam's push tokens.
- **Secrets.** Each build profile's public Supabase URL and key, PostHog key and Sentry address live in EAS environment variables, along with the Sentry token for uploading source maps. The Expo access token, the server keys and the server's Sentry address live in Supabase's secrets.

GitHub Actions:

| Trigger | What runs |
|---|---|
| Pull request | Type checks, linting, core tests, content checks, app tests, database access tests and Edge Function checks. A native fingerprint check labels the pull request if it needs a new store build. |
| Merge to master | Migrations and functions deploy to staging. An update goes to the preview channel. |
| Release tag | Migrations and functions deploy to production. A production build uploads to Play's internal testing track. |
| Content tag | If the native code hasn't changed, an over-the-air update goes to production. |
| Daily | Checks that the weather job ran and that Open-Meteo usage is within budget. This also keeps the free Supabase project from pausing. |
| Weekly | The source link check. |

## Testing

- **Core:**
  - Unit tests, plus the prototype's eight Moments as fixed test cases.
  - Ten-year sweeps over London, Oslo, Jakarta, Toronto and Cape Town. They check that no fast is suggested on the Eids or the Tashrīq days, that the Friday rule holds, that keys stay stable, and that daylight-saving changes and far-north cities don't break the times.
- **Match with the prototype:** run the prototype's engine code in Node next to core for two Hijri years, and list every difference. Each one must be explained or fixed.
- **App:** component and screen tests with a fixed clock. Maestro tests on an Android emulator walk through setup, ticking with Undo, reminder choices and the settings sheets.
- **Server:** database tests prove that one install can't read another's row. Function tests replay recorded Open-Meteo and Expo responses.
- **Real phones,** as the stack file asks: a Pixel, a Samsung, a Xiaomi and one low-end phone. Test restarts, battery saving, Done and Later while the app is closed, and changes of time zone and daylight saving.
- **Content review:** the owner reads all content before it ships to production. During development, content isn't held for review.

## Costs and upgrade triggers

| Service | At launch | Upgrade when |
|---|---|---|
| Supabase | Free, with a staging project and a production project | Production pauses even once, monthly anonymous users near the free limit, or backups are needed |
| Expo EAS | Free | Builds wait too long, or update users pass the free limit. Then move to a paid plan or host updates privately. |
| Open-Meteo | Free for non-commercial apps | Areas need more than 10,000 calls a day. Then run a private copy. |
| Sentry | Free | Errors pass the free monthly limit |
| PostHog | Free | Events pass the free monthly limit |
| Google Play | $25 once | — |
| Apple | — | $99 a year, from the iOS phase |

Free-tier limits change, so check each one when signing up. The server holds nothing that can't be rebuilt. Every install re-syncs at its next launch, and corrections can be entered again. That's why a free database without backups is acceptable at launch.

## Build order

| Milestone | What it delivers | Done when |
|---|---|---|
| 0. Foundations | The workspace, local Supabase, a development build on the emulator and real phones, Supabase projects, CI, and tests of the risks below. [development-setup.md](development-setup.md) lists the accounts, secrets and local tools. | Each risk has a result and a chosen fallback. |
| 1. Engine and content | Core, with adhan-js, the Umm al-Qura table and eclipses. The calendar and the prototype's text and Arabic converted into content files. | The Moment tests pass, and every difference from the prototype is explained. The regenerated calendar matches today's. |
| 2. App shell and Today | Theme, components, navigation, Setup, Today, the detail screen, saved state, Sentry | Setup through Today works on a phone, offline. |
| 3. Remaining screens | Upcoming, Settings and its sheets, Reminders, About, the debug screen | Each screen matches the prototype, in light and dark. |
| 4. Local notifications | The plan, scheduling, channels, buttons, quiet hours, the background task | A week of reminders arrives correctly on every test phone. |
| 5. Server | Install sync, weather detection, push sending, corrections, the admin page | Simulated rain reaches a phone, and a correction is offered and applied. |
| 6. Hardening | Accessibility and large text, PostHog with the consent question, end-to-end tests, privacy policy, store listing, Data safety form, review of the Arabic and evidence | No release blockers remain. |
| 7. Android release | Closed testing, then production with a staged rollout | Live on Google Play. |
| 8. iOS | Apple account, APNs, iOS testing, App Store review | Live on the App Store. |

## Google Play account

**Recommendation: a personal account now.** You're a solo developer with no organization to publish under. A personal account opens quickly. Its one real cost is the closed test, and Adwam needs that testing anyway: two weeks on real phones of several brands, used by people who will actually use the app.

| | Personal | Organization |
|---|---|---|
| Who it's for | An individual | A registered company, charity or other legal entity |
| What you need | Government ID, a developer email, and a real Android phone with the Play Console app to verify it | A D-U-N-S number, a verified organization website, a public organization phone number and a contact name |
| How long it takes | Usually days | Up to 30 days for the D-U-N-S number, then up to 5 days of verification |
| Before the first release | A closed test with at least 12 testers opted in for 14 days in a row, then an application for production access | No closed test needed |
| Shown on Google Play | Your chosen developer name and your developer email. Google's help pages differ on whether your legal name, country or address also appear, so check the sign-up form. | The organization's name and contact details |
| Fee | $25, once | $25, once |

**To open an organization account later:**

1. Register a legal entity, such as a company or a charity.
2. Request a free D-U-N-S number from Dun & Bradstreet. Use the legal name and address exactly as you will enter them in Play Console.
3. Set up an organization website and verify it.
4. Prepare an organization phone number and email that people can find publicly, and name a contact person.
5. Create the account as an organization, with an organizational payments profile, and wait for verification.

**Starting personal doesn't lock you in.** The account owner can convert a personal account into an organization account in Play Console. The app and its reviews stay. Converting needs an organizational payments profile and a verified website, and it can't be undone. Moving the app to a separate organization account through a transfer request is also possible.

**A nonprofit would also help with iOS.** Apple waives its $99 yearly fee for nonprofits in eligible countries that publish only free apps. Individuals and single-person businesses don't qualify, and Apple also asks for a D-U-N-S number.

**Running the closed test:**

- **Recruit 15–20 testers,** so the count never drops below 12 if a few leave.
- **Include Samsung and Xiaomi owners,** because those brands are where scheduled notifications are most likely to fail.
- **Start once milestone 6 is nearly done.** The 14 days then overlap the last fixes instead of delaying the launch.

## Risks to settle in milestone 0

| Risk | Test | Fallback |
|---|---|---|
| Done and Later on a notification may not work while the app is closed | Try it on a Pixel, a Samsung and a Xiaomi | Notifee for local notifications |
| Hermes may not format times in another time zone | Format a city's times in a zone that isn't the phone's | FormatJS's `Intl` add-ons |
| Some phone brands drop scheduled notifications | The 60-day schedule, plus real-phone tests | A "Not getting reminders?" help page for each brand |
| Huawei phones without Google services can't receive server pushes | None | Accept it, because local reminders still work |
| The free Supabase project pauses | The daily check | Upgrade to Pro |

## Changes to the existing specs

Once this plan is approved, update these files:

- **mobile-app-stack.md:** the content source of truth, eclipses on the phone, how far ahead notifications are scheduled, approximate location only, the admin page.
- **sunnah-reminder-calendar.md:**
  - Eclipses are computed on the phone, not detected by the server.
  - The Friday line names the Shawwāl and make-up fasts among the fasts allowed on a Friday.
  - Its tables become generated from the content files.
- **mobile-app-screen-story.md and mobile-app-ui.html:**
  - The Date correction notice gets "Use" and "Keep my dates" buttons.
  - Setup step 2 and the Hijri date sheet say that corrections are offered, not applied automatically. The sheet also lists accepted corrections.
  - The detail screen's Sources rows expand to show the Arabic evidence and its meaning, as [sunnah-content-format.md](sunnah-content-format.md#how-the-detail-screen-shows-evidence) describes.
  - Setup asks once about usage statistics, and Settings gets a Privacy row with the crash report and usage statistics switches.
  - Setup's promise becomes "Your trackers stay on this phone", because some settings now go to the server.
  - About gets the new privacy text, covering the server, Sentry and PostHog, and credits for GeoNames, sunnah.com, Quran.com and the translators they show.

## Gaps in the specs

1. **Penumbral lunar eclipses** are hard to see. Suggestion: leave them out and list only partial and total eclipses.
2. **Eclipse pushes and the one-weather-push-a-day limit.** Suggestion: the limit counts weather only.
3. **Report a problem needs a GitHub account.** Suggestion: add an email address as a fallback.

## Open questions

On 21 November 2026 the owner answered some of these and accepted defaults for the rest during development. [plan.md](plan.md) tracks them as decisions D2–D5. The defaults are confirmed or changed before the production release.

1. **App ID and domain.** Decided: `com.msalman5230.adwam`, with `.preview` and `.dev` for test builds. No domain for now. The privacy policy and the admin page use GitHub Pages.
2. **Licences.** Default for development: Apache-2.0 for the code and CC BY-SA 4.0 for Adwam's own text. Quoted sunnah.com and Quran.com text keeps its own terms.
3. **Analytics consent.** Default for development: PostHog stays off until the user agrees.
4. **Content reviewer.** Decided: the owner. Content isn't held for review during development, and the owner reads all of it before the production release.
