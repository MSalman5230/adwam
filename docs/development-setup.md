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
| Supabase | Milestone 0 for staging, milestone 6 for production, once everything works on staging | The server. The free tier allows both projects. |
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
| `EXPO_PUBLIC_SENTRY_DSN` | Empty, so Sentry is off | The `adwam-staging` DSN | The `adwam-production` DSN | Sentry, the project's **Client Keys (DSN)** settings. Each environment has its own project. |
| `EXPO_PUBLIC_POSTHOG_KEY` | Empty | Empty | PostHog project key | PostHog project settings |
| `APP_VARIANT` | `development` | `preview` | `production` | Set by each build profile. It picks the app ID (`com.msalman5230.adwam.dev`, `com.msalman5230.adwam.preview` or `com.msalman5230.adwam`) and the name, so all three can sit on one phone. |

The Expo project ID also goes into the app config. `eas init` writes it, and it isn't secret.

### Build secrets (EAS environment variables, marked secret)

| Variable | Used for | Where to get it |
|---|---|---|
| `SENTRY_AUTH_TOKEN` | Uploading source maps so crash reports point to the right code | Sentry, organization auth tokens |
| `GOOGLE_SERVICES_JSON` | Firebase settings for the Android app. Stored as an EAS file variable, because the repository is public. | Firebase console, project settings, the Android app's `google-services.json`. Preview and Production have separate Firebase projects. Production's is `adwam-production`. |

`SENTRY_ORG` and `SENTRY_PROJECT` sit next to them as plain variables. `SENTRY_PROJECT` is `adwam-staging` for Preview and `adwam-production` for Production.

For the preview crash check, use the client key from the EU `adwam-staging` project. Its ingest host ends in `ingest.de.sentry.io`. The EAS build uploads the JavaScript source map when `SENTRY_AUTH_TOKEN` is set. Open Developer tools → Trigger Sentry test crash on the preview APK and look for **Adwam preview test crash** in the project's issues. Check the decoded stack, `preview` environment, release, and `expo-update-id` tag. JavaScript crash reports carry stack coordinates and build metadata. Crash reports follow the saved privacy preference.

For a staging EAS Update, upload the matching source maps from `apps/mobile` with `pnpm exec sentry-expo-upload-sourcemaps dist` after publishing. Run the upload in the staging runner environment with `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT` supplied by its secret store.

### Credentials EAS keeps

These are uploaded once in expo.dev. They aren't environment variables.

| Credential | Used for | How |
|---|---|---|
| Android upload key | Signing builds for Google Play | The owner creates it once with `eas credentials`, and EAS stores it. A downloaded backup is optional. See [Production setup, Part 6](release/production-setup.md#part-6-the-upload-key). |
| Firebase service account key | Lets Expo's push service deliver to Android phones | Firebase, project settings, **Service accounts**. Generate a private key, a `firebase-adminsdk` file, not `google-services.json`, and upload it under the app's credentials. Each app's key comes from its own Firebase project. |
| Google Play service account key | Lets `eas submit` upload builds | Play Console and Google Cloud. `eas submit` can make the app's first upload too, as a draft on the internal testing track. |
| APNs key and App Store Connect key | iOS, later | — |

### Server secrets (Supabase, Edge Function secrets, per project)

| Secret | Used for |
|---|---|
| `EXPO_ACCESS_TOKEN` | Sending pushes. Turn on Expo's enhanced push security, so only this token can send to Adwam's phones. |
| `SENTRY_DSN` | Error reports from the Edge Functions. Staging uses the `adwam-staging` DSN, production the `adwam-production` DSN. |
| `ADWAM_JOB_KEY` | Authorizes scheduled jobs. Copy the value of `adwam_job_key` from this project’s Vault into Edge Function secrets. |

Supabase gives each Edge Function its own project URL and keys automatically. After a project's first deploy of the functions, run [the scheduler setup SQL](../supabase/setup-jobs.sql) in that project's SQL Editor with its URL. Set `debug_tools_enabled` to `true` on staging only. The SQL generates a key in Vault. Copy the key directly from the Vault dashboard into the `ADWAM_JOB_KEY` Edge Function secret. Check that `weather-tick` records a finished run on the next quarter-hour.

### Correction admin sign-in

Each deployment enables anonymous app sign-in and configures its admin page as the Auth Site URL and an allowed Redirect URL: `https://msalman5230.github.io/adwam/staging/` for staging and `https://msalman5230.github.io/adwam/` for production. It tries this with the scoped token's Auth Config permission, but Supabase refused the change on the first production deploy even with Read-write. If the deployment reports that it cannot update Auth, set the options in that project's dashboard: **Authentication** → **URL Configuration** for the Site URL and Redirect URL, and **Authentication** → **Sign In / Providers** → **Allow anonymous sign-ins**. [Production setup, 9.3](release/production-setup.md#93-set-the-sign-in-settings) gives the clicks. A link that still returns to `localhost:3000` needs the staging URL configuration corrected before the browser test.

Staging uses Supabase’s default Magic Link email with no custom SMTP. An approved admin needs an existing, confirmed email user in `auth.users`, a matching ID in `public.admins`, and an inbox eligible for Supabase’s built-in team email. The admin requests a link on the Date corrections page and opens it in the same browser, which exchanges the link for a session. No token is pasted into the page. Default email is restricted to team inboxes and rate-limited. [Supabase email limits](https://supabase.com/docs/guides/auth/auth-smtp)

To test the admin page locally, run `pnpm db:start`, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` from the local stack, then run `pnpm --filter @adwam/admin dev`. Open `http://127.0.0.1:5173/adwam/`. Open the local inbox at `http://127.0.0.1:54324` in that browser to follow the sign-in link.

### CI secrets (GitHub, repository settings)

Use the GitHub environments in [CI and releases](release/ci-and-release.md#github-environments): `staging`, `production` and `production-monitor`. The production environment requires the owner's approval, so nothing reaches production without it. The full production list, with every step, is in [Production setup](release/production-setup.md).

| Secret | Environment | Used for |
|---|---|---|
| `EXPO_TOKEN` | Both | Builds, updates and store uploads. Create a robot user in Expo for this. |
| `SUPABASE_ACCESS_TOKEN` | Each its own | Deploying migrations and functions. A scoped token for that environment's project only, with Project Settings, API Keys, API Key Secrets, Migrations, Database and Connection Pooling on Read, and Edge Functions and Auth Config on Read-write. Without Connection Pooling, migrations fail on GitHub with "IPv6 is not supported", because the CLI can't find the pooler's IPv4 address. It expires within a year, so renew it before then. |
| `SUPABASE_DB_PASSWORD` | Each its own | Running migrations when the scoped token cannot create a temporary database login |
| `SENTRY_AUTH_TOKEN` | `staging` and `production` | Uploading the source maps of over-the-air updates. A Sentry organization token. |

Each environment also holds its Supabase project ID as a plain variable.

Staging updates are published from GitHub's runner, not Expo Workflows, so they don't wait in Expo's free queue. The `staging` environment therefore also holds the secret `SENTRY_AUTH_TOKEN`, and the variables `SENTRY_ORG` and `SENTRY_PROJECT`, for the update's source maps. Staging deploys set the app’s two public Supabase variables in EAS Preview from the staging project configuration.

### Optional usage statistics

The production-only EAS project variable is `EXPO_PUBLIC_POSTHOG_KEY`. Use a project on PostHog's EU host. In the project settings, enable **Discard client IP data**, turn off the GeoIP enrichment transformation, and leave session replay off. Confirm these settings before adding the key. The Preview and development apps keep the consent controls available while usage-statistics delivery stays off. The phone sends the country code from the selected city or `unknown` before a city is selected.

The app records notification body taps. The Done action updates the tracker on the phone and stays out of analytics. Raw URLs, report text, and the Supabase install ID stay out of all events. Turning off the Privacy switch drops the pending queue and clears the analytics ID.

### Local files

- `apps/mobile/.env.local` holds only the local values from the first table. The local Supabase keys are the same on every machine and aren't secret.
- `supabase/functions/.env` holds `EXPO_ACCESS_TOKEN`, and only when testing real pushes from the PC.
- Both files are ignored by Git. A committed `.env.example` lists every variable with a comment.

### Giving secrets to an agent

- **Type secrets into the services' own secret stores** (EAS, Supabase, GitHub) yourself. Builds and CI read them from there, so the agent rarely needs to see one.
- **Never paste a secret into a chat.** If an agent needs one, it asks through a secure secret prompt.
- **Log the command-line tools in once on this PC,** both as **MSalman5230:** `gh` and `eas login`. The tokens stay in each tool's own settings. The agent checks `eas whoami` and `gh auth status` before using them, and stops if either shows another account.
- **Don't log in the Supabase CLI on this PC.** Local Supabase needs no login, and the CLI's browser login creates a token with full access to every project, production included. CI deploys with its own token, scoped to one project.
- **Add GitHub secrets from a terminal** with `gh secret set NAME --env staging`. It asks for the value without showing it, so it never lands in a file or a chat.
- **The local env file holds no secrets.** The root `.env.example` lists the local values. Builds and CI run in the cloud and read their own secret stores, never a file on this PC.
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
| Supabase CLI | A development dependency of the repository, so this PC and CI use the same version. Run it through the `pnpm db:*` scripts. |
| Maestro | The Setup suite ran on this PC with Maestro 2.12.1 and the dedicated Android test emulator. |

**Windows native builds.** The Ninja bundled with Android SDK CMake 3.22.1 hits the Windows path limit in Sentry and the generated Gesture Handler code. Copy SDK CMake 3.22.1 to a scratch directory, replace `bin/ninja.exe` in the copy with [Ninja 1.12.1](https://github.com/ninja-build/ninja/releases/tag/v1.12.1), and set `cmake.dir` in the ignored `apps/mobile/android/local.properties` to that copy. Keep Windows long-path support turned on.

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

- **Start the local stack with `pnpm db:start`.** This prepares the shared engine and starts Postgres, sign-in, the API, Edge Functions, Studio and the local inbox in Docker.
- **The migrations build the database.** `pnpm db:reset` rebuilds it and loads the local seed, which enables debug tools. Tests create their own installs and events.
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
| Edge Function tests | `pnpm server:test` | Deno 2 and local Supabase started with `pnpm db:start` |
| App screens on the emulator | `pnpm android` | Local Supabase and the emulator |
| Native component tests | `pnpm --filter @adwam/mobile test:native` | Jest Expo and React Native Testing Library |
| End-to-end flows | `maestro test` | The app on the emulator |

The agent sets up these commands in milestone 0. Then on real phones, test a preview build that uses the staging server.

Native component tests can set the app's clock to an instant with `setFixedClock` from `apps/mobile/test/fixed-clock.ts`. `pnpm check` runs that suite alongside the existing unit tests.

### Android setup flow

Install a bundled preview APK on a disposable English-language Android emulator. Each path starts by clearing the test app’s data and runtime permissions.

```sh
maestro --device emulator-5556 test -e APP_ID=com.msalman5230.adwam.preview apps/mobile/.maestro/setup.yaml
```

For a locally bundled development APK, use `-e APP_ID=com.msalman5230.adwam.dev`. The bundled build can run the setup flow in airplane mode.

Run all Android flows with `maestro test -e APP_ID=com.msalman5230.adwam.dev apps/mobile/.maestro` when the emulator has a bundled development APK. The nightly workflow builds this APK, starts local Supabase, and uploads the JUnit report and screenshots. Before a release, run **Android end-to-end tests** on the release commit and check its results.

## Instructions for the building agent

`AGENTS.md` at the repository root holds the few rules an agent can't work out from the code or [plan.md](plan.md), and links to the Expo and Supabase documentation. Keep it short: anything an agent would do anyway doesn't belong there.
