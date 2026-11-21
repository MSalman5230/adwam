# Development setup

This covers the accounts and secrets Adwam needs, how to run everything on one Windows PC, and how the work splits between the owner and the AI agents that build the app. It goes with [mobile-app-architecture.md](mobile-app-architecture.md).

## Who does what

AI agents write the code, run it, test it and open pull requests. Some steps need a person, a login or a payment, so the owner does them.

| The owner | The building agent |
|---|---|
| Creates the accounts below and pays the fees | Writes and tests the code, the database migrations and the content files |
| Types secrets into each service's secret store | Uses local development keys, which aren't secret |
| Logs in the command-line tools on this PC once | Runs builds, the emulator and the tests |
| Approves production deploys in GitHub | Deploys to staging through CI |
| Reviews content, or names a reviewer | Never types Arabic text from memory |
| Handles Google Play: identity check, first upload, closed test | Prepares store text, screenshots and the Data safety answers |

## Accounts to create

| Service | Create by | Used for |
|---|---|---|
| Expo (expo.dev) | Milestone 0 | Cloud builds, over-the-air updates, push delivery |
| Supabase | Milestone 0 for staging, milestone 5 for production | The server. The free tier allows both projects. |
| Firebase, under a Google account | Milestone 5 | Android push delivery through Firebase Cloud Messaging |
| Sentry, with EU data storage | Milestone 2 | Crash reports |
| PostHog, on the EU host | Milestone 6 | Usage statistics |
| Google Play Console | Milestone 4 | Publishing. Identity checks take days, and the closed test takes 14 more. |
| GitHub | Already set up | The repository and CI |
| Apple Developer | The iOS phase | — |

Open-Meteo needs no account for the free API. The GeoNames city list is a free download.

## Variables and secrets

**Public values** are built into the app, so anyone can read them from it. They are safe to ship because the database's access rules decide what each key can do. **Secrets** never go into the app or the repository.

### Inside the app (public)

| Variable | Local | Preview | Production | Where to find it |
|---|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `http://10.0.2.2:54321` | Staging project URL | Production project URL | Supabase project settings, or `supabase status` locally |
| `EXPO_PUBLIC_SUPABASE_KEY` | The local publishable key | Staging publishable key | Production publishable key | The same places. Older projects call it the anon key. |
| `EXPO_PUBLIC_SENTRY_DSN` | Empty, so Sentry is off | Sentry DSN | Sentry DSN | Sentry project settings. One project, tagged by environment. |
| `EXPO_PUBLIC_POSTHOG_KEY` | Empty | Empty | PostHog project key | PostHog project settings |
| `EXPO_PUBLIC_POSTHOG_HOST` | — | — | `https://eu.i.posthog.com` | — |
| `APP_VARIANT` | `development` | `preview` | `production` | Set by each build profile. It picks the app ID and name, so all three can sit on one phone. |

The Expo project ID also goes into the app config. `eas init` writes it, and it isn't secret.

### Build secrets (EAS environment variables, marked secret)

| Variable | Used for | Where to get it |
|---|---|---|
| `SENTRY_AUTH_TOKEN` | Uploading source maps so crash reports point to the right code | Sentry, organization auth tokens |
| `GOOGLE_SERVICES_JSON` | Firebase settings for the Android app. Stored as an EAS file variable, because the repository is public. | Firebase console, project settings, the Android app's `google-services.json` |

`SENTRY_ORG` and `SENTRY_PROJECT` sit next to them as plain variables.

### Credentials EAS keeps

These are uploaded once in expo.dev. They aren't environment variables.

| Credential | Used for | How |
|---|---|---|
| Android upload key | Signing builds for Google Play | EAS creates it at the first build. Download a backup and keep it somewhere safe. |
| Firebase service account key | Lets Expo's push service deliver to Android phones | Firebase, project settings, service accounts. Generate a key and upload it under the project's credentials. |
| Google Play service account key | Lets `eas submit` upload builds | Play Console and Google Cloud. The first upload to Google Play has to be done by hand. |
| APNs key and App Store Connect key | iOS, later | — |

### Server secrets (Supabase, Edge Function secrets, per project)

| Secret | Used for |
|---|---|
| `EXPO_ACCESS_TOKEN` | Sending pushes. Turn on Expo's enhanced push security, so only this token can send to Adwam's phones. |
| `SENTRY_DSN` | Error reports from the Edge Functions |

Supabase gives each Edge Function its own project URL and keys automatically. The scheduled jobs call the functions with a key stored in Supabase Vault, set once per project with a short SQL script that the agent writes.

### CI secrets (GitHub, repository settings)

Use two GitHub environments, `staging` and `production`. The production environment requires the owner's approval, so nothing reaches production without it.

| Secret | Environment | Used for |
|---|---|---|
| `EXPO_TOKEN` | Both | Builds, updates and store uploads. Create a robot user in Expo for this. |
| `SUPABASE_ACCESS_TOKEN` | Both | Deploying migrations and functions |
| `SUPABASE_DB_PASSWORD` | Each its own | Running migrations |
| `SENTRY_AUTH_TOKEN` | Both | Source maps for updates published from CI |

Each environment also holds its Supabase project ID as a plain variable.

### Local files

- `apps/mobile/.env.local` holds only the local values from the first table. The local Supabase keys are the same on every machine and aren't secret.
- `supabase/functions/.env` holds `EXPO_ACCESS_TOKEN`, and only when testing real pushes from the PC.
- Both files are ignored by Git. A committed `.env.example` lists every variable with a comment.

### Giving secrets to an agent

- **Type secrets into the services' own secret stores** (EAS, Supabase, GitHub) yourself. Builds and CI read them from there, so the agent rarely needs to see one.
- **Never paste a secret into a chat.** If an agent needs one, it asks through a secure secret prompt.
- **Log the command-line tools in once on this PC** with `eas login` and `supabase login`. GitHub's `gh` is already logged in. The tokens stay in each tool's own settings.
- **Production deploys run only from GitHub Actions,** after your approval. The agent's instructions forbid production commands.

## This PC

Checked on 21 November 2026:

| Tool | Status |
|---|---|
| Node 24, pnpm, Git, GitHub CLI, EAS CLI | Installed |
| Docker Desktop with WSL 2 | Installed. It must be running before local Supabase starts. |
| Android SDK, platforms 35 and 36 | Installed at `%LOCALAPPDATA%\Android\Sdk` |
| Emulator `Pixel_6` | Android 16 with Google APIs. It includes Google Play services, so server pushes can reach it. |
| `adb` and `emulator` | In the SDK but not on the PATH. Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator`. |
| Java | JDK 21. React Native has recommended JDK 17, so if the first Android build fails over Java, install JDK 17 and point `JAVA_HOME` at it. |
| Supabase CLI | Not installed. Add it to the repository as a development dependency, so this PC and CI use the same version. |
| Maestro | Not installed. Needed for end-to-end tests from milestone 6. |

## How local development works

```
This PC
  Docker Desktop
    Local Supabase (supabase start)
      API and sign-in  localhost:54321     Studio (dashboard)  localhost:54323
      Postgres         localhost:54322     Test email inbox    localhost:54324
      Edge Functions
  Metro, the app's development server, on localhost:8081
  Android emulator, which reaches this PC at 10.0.2.2
  A phone on USB, which reaches this PC through adb reverse
```

### Supabase on your PC

Use the Supabase CLI's local stack, not a plain Postgres.

- **It's the whole service, not just a database.** `supabase start` runs everything the hosted service runs, in Docker: Postgres, sign-in (including anonymous sign-in), the API, Edge Functions, the Studio dashboard, and an inbox that catches the admin page's sign-in emails. A plain Postgres would have no sign-in, no API and no Edge Functions.
- **The migrations build the database.** `supabase db reset` rebuilds it from scratch and loads seed data: test installs, areas and a sample correction.
- **The database tests run against it,** with `supabase test db`.
- **Jobs start by command, not on a schedule,** for example `pnpm server:tick`. A test can then control exactly when the weather job runs.
- **Weather calls reach the real Open-Meteo,** which needs no key. Automated tests use recorded responses instead. The debug screen's "simulate rain" writes a fake rain event into the local database, so the whole path can be tested on a dry day.
- **The free staging project is the shared test server** in the cloud, and preview builds use it. Supabase's per-branch preview databases are a paid feature and aren't needed.

### The app on the emulator

Expo Go can't run Adwam, because Adwam needs native modules such as MMKV and full notification support. Instead, the agent builds a **development build**: a debug version of Adwam itself.

1. Start Docker Desktop, then local Supabase.
2. Start the `Pixel_6` emulator from Android Studio.
3. **First run:** `expo run:android` compiles the app with Android Studio's SDK and installs it. This takes several minutes.
4. **After that,** code changes appear on the emulator within seconds through Metro. A rebuild is needed only when a native library is added.
5. **On a real phone over USB,** run `adb reverse tcp:8081 tcp:8081` and `adb reverse tcp:54321 tcp:54321`. The phone then reaches the PC as if it were local.

Details:

- **Plain HTTP is allowed only in development builds,** for local Supabase. Android blocks it by default, and production builds keep it blocked.
- **The debug screen sets the clock,** so Friday, Ramadan or the last ten nights can be tested on any day.
- **Local reminders work on the emulator as they are.** Server pushes also need the Firebase setup.
- **Brand-specific notification problems** only show on real Samsung and Xiaomi phones.
- **If a local build gets stuck on Java or Gradle,** `eas build --profile development` builds the same APK in the cloud instead.

### Checks on this PC

| Check | Command | Needs |
|---|---|---|
| Engine and content tests | `pnpm test` | Nothing else running |
| Content check | `pnpm content:check` | Nothing else running |
| Database access tests | `supabase test db` | Local Supabase |
| Edge Function tests | `pnpm server:test` | Local Supabase |
| App screens on the emulator | `pnpm android` | Local Supabase and the emulator |
| End-to-end flows | `maestro test` | The app on the emulator |

The agent sets up these commands in milestone 0. Then on real phones, test a preview build that uses the staging server.

## Instructions for the building agent

Milestone 0 adds an `AGENTS.md` at the repository root. Coding agents read it before they start. It lists:

- **The specs to follow:** the prototype for screens, [sunnah-content-format.md](sunnah-content-format.md) for content, and the architecture plan for structure.
- **The commands above.**
- **The rules:**
  - Never type Arabic, hadith or Qurʾan text from memory.
  - Never change a released Sunnah ID.
  - Never commit secrets or `.env` files.
  - Run the checks before opening a pull request.
  - Change production only through CI.
  - Ask the owner when a step needs an account, a payment or a secret.
