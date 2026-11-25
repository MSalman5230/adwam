# Adwam

An Android-first app that reminds Muslims of Sunnah practices, timed to their Hijri date and prayer times. Expo (React Native, TypeScript) on the phone, Supabase on the server.

Start with [docs/plan.md](docs/plan.md). It lists the specs, the order of work and the check for each task. Local setup and secrets are in [docs/development-setup.md](docs/development-setup.md).

## Rules you can't guess

- **Never type Arabic, hadith or Qurʾan text yourself.** Scripts copy it from sunnah.com and Quran.com, and the content check compares every excerpt with the stored copy. See [docs/sunnah-content-format.md](docs/sunnah-content-format.md).
- **Adwam has permission to use all copied content it includes.** The owner confirmed the usage rights. Do not reopen permission checks or treat them as a blocker. Keep source attribution and excerpt verification intact.
- **Some IDs are permanent once released:** Sunnah IDs, tick keys, notification IDs and Android channel IDs. Phones keep users' data under them.
- **Staging only, until the owner sets up production.** Create and change nothing for production. Production changes go only through GitHub Actions, after the owner approves.
- **Check the account before every `eas` or `gh` command.** `eas whoami` and `gh auth status` must show msalman5230. If they don't, stop and tell the owner.
- **Don't log in the Supabase CLI.** Local Supabase needs no login, and the browser login grants full access to every project, production included. CI has its own scoped token.
- **Secrets never go in files, commits or chat.** The repository is public. If you need one, ask the owner through a secure secret prompt.
- **[docs/mobile-app-ui.html](docs/mobile-app-ui.html) is the design reference** for every screen: its layout, wording and behaviour.
- **The default branch is `master`.**

## Documentation

Expo, EAS and Supabase change often, and what you remember may be out of date. Check the docs for the versions in `package.json` before you use an API.

### Expo and EAS

- Docs for agents: [index](https://docs.expo.dev/llms.txt), [everything in one file](https://docs.expo.dev/llms-full.txt), [EAS only](https://docs.expo.dev/llms-eas.txt), [SDK only](https://docs.expo.dev/llms-sdk.txt)
- Project setup: [development builds](https://docs.expo.dev/develop/development-builds/introduction/), [Expo Router](https://docs.expo.dev/router/introduction/), [app config](https://docs.expo.dev/versions/latest/config/app/), [config plugins](https://docs.expo.dev/config-plugins/introduction/), [app variants](https://docs.expo.dev/build-reference/variants/) for the dev, preview and production app IDs
- Device features: [notifications](https://docs.expo.dev/versions/latest/sdk/notifications/), [background task](https://docs.expo.dev/versions/latest/sdk/background-task/), [location](https://docs.expo.dev/versions/latest/sdk/location/), [sending push notifications](https://docs.expo.dev/push-notifications/sending-notifications/)
- Builds and updates: [EAS Build](https://docs.expo.dev/build/introduction/), [EAS Update](https://docs.expo.dev/eas-update/introduction/), [runtime versions](https://docs.expo.dev/eas-update/runtime-versions/), [the Updates library](https://docs.expo.dev/versions/latest/sdk/updates/), [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)

### Supabase

- Docs for agents: [index](https://supabase.com/llms.txt), [CLI](https://supabase.com/llms/cli.txt), [JavaScript client](https://supabase.com/llms/js.txt)
- Local work: [local development](https://supabase.com/docs/guides/local-development), [CLI reference](https://supabase.com/docs/reference/cli/introduction), [database tests with pgTAP](https://supabase.com/docs/guides/local-development/testing/overview)
- Database and sign-in: [anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous), [row level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions)
- Server code: [Edge Functions](https://supabase.com/docs/guides/functions), [scheduling Edge Functions with pg_cron](https://supabase.com/docs/guides/functions/schedule-functions)
- [Scoped access tokens](https://supabase.com/docs/guides/platform/personal-access-tokens), for the permissions CI's token has

### Other libraries

[adhan-js](https://github.com/batoulapps/adhan-js) for prayer times, [astronomy-engine](https://github.com/cosinekitty/astronomy) for eclipses, the [Open-Meteo forecast API](https://open-meteo.com/en/docs), [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) and [Maestro](https://docs.maestro.dev/).
