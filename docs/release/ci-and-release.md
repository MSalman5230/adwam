# CI and releases

How a change travels from a pull request to staging testers and to Google Play users. The owner approved this design on 26 November 2026. The tasks that build it are in [plan.md](../plan.md#production-ci-and-google-play).

**Setting up production?** Follow [Production setup](production-setup.md). This page explains how the pipeline works once it's set up.

## The short version

- **Staging follows `master` by itself.** Every merge deploys the staging server and sends an over-the-air update to every Adwam Preview phone.
- **Preview APKs are built only when the owner presses a button.** EAS's free plan allows 15 Android builds a month, and merges can be frequent.
- **Production moves only when the owner says so, twice.** The owner starts a release by merging the Release PR or by pressing **Ship update**. The run then stops until the owner approves it in GitHub.
- **CI never reaches the public on its own.** Play builds go to internal testing only. The owner promotes them in Play Console. Production over-the-air updates start at 10% of phones.

```
feature PRs ──merge──▶ master ──automatic──▶ STAGING: staging server + Preview update
                          │
          release-please keeps the "Release x.y.z" PR up to date
                          │
      ┌───────────────────┴────────────────────┐
      │ owner merges the Release PR             │ owner presses Ship update
      ▼                                         ▼
  tag vx.y.z, GitHub Release, changelog     checks: a Play build matches, staging ran it
      │                                         │
      ⏸ owner approves in GitHub                ⏸ owner approves in GitHub
      ▼                                         ▼
  production server, Play build,            production server, over-the-air update
  upload to Play internal testing           to 10% of phones
      │                                         │
  owner promotes in Play Console:           owner raises it to 50% or 100%,
  closed testing → production 10% → 100%    or undoes it, with Production rollout
```

## Who does what

| | Agents | Owner |
|---|---|---|
| Day to day | Open PRs with typed titles, merge when checks pass | Tests on the Preview app |
| Preview APK | Can press **Android preview build** when asked | Presses it when the reminder issue appears |
| Play release | Keep the Release PR accurate | Merges the Release PR, approves the run, promotes in Play Console, pastes the release notes |
| Over-the-air update | Can press **Ship update** or **Production rollout** when asked | Approves every production run |
| Rollback | Prepare the fix or revert PR | Approves it, or halts the rollout in Play Console |

An agent can press a button but never approves a production run. Agents use the owner's GitHub login, so the AGENTS.md rule is what forbids it.

## GitHub environments

Each environment holds its own secrets. Only `master` can deploy to any of them.

| Environment | What it holds | Rule |
|---|---|---|
| `staging` | Staging deploy token and database password, `EXPO_TOKEN`, the Sentry upload token | `master` only |
| `production` | Production deploy token and database password, `EXPO_TOKEN`, the Sentry upload token | `master` only. The owner must approve every run. Administrators can't bypass it. |
| `production-monitor` | A read-only Supabase token and an Expo token with the Viewer role | `master` only, no approval. It's for checks and plans that change nothing. |
| `github-pages` | Nothing | GitHub Pages deploys |

Every job that names `production` waits for its own approval. So each production workflow does all its production work in one job, and you approve once.

[Production setup, part 1](production-setup.md#part-1-github-environment-rules) shows how to set these rules.

## Staging

### On every merge to `master`

The **Deploy staging** workflow:

1. Applies migrations, deploys Edge Functions and checks the Auth settings on the staging Supabase project.
2. Publishes an over-the-air update to the `preview` channel from GitHub's runner, and uploads its source maps to Sentry. It doesn't use Expo Workflows: their free queue once held an update for 42 minutes, and the free plan includes only 60 workflow minutes a month.
3. Compares the app's native fingerprint with the latest Preview build. If no Preview build matches, it opens one issue, **Preview needs a new build**. Once a matching build exists, it closes the issue.

Phones check for updates when the app opens, and the background task checks too. A downloaded update takes effect the next time the app starts. An update only reaches Preview builds with the same native fingerprint.

### Preview APK builds

The **Android preview build** button in the Actions tab builds a signed Preview APK from `master`.

- If a finished Preview build already matches the current native fingerprint, it reuses that build and costs nothing.
- Otherwise it builds the APK, checks its permissions and posts the install link in the run summary.
- Testers install the new APK over the old one. Settings and trackers stay.

Nothing else starts a Preview build.

## Version numbers

| Number | Example | Set by | Seen in |
|---|---|---|---|
| Version name | `1.1.0` | release-please, through the Release PR | Google Play and About ("App 1.1.0") |
| Version code | `17` | EAS, which adds one on every build. Preview and production count separately. | Nowhere. Play rejects an upload whose code isn't higher. |
| Content version | `2026-12-10` | The content package | About ("Content 2026-12-10") |
| Native fingerprint | a 40-character hash | Worked out from the native code | Nowhere. It decides which over-the-air updates a build accepts. |

**The fingerprint ignores Sentry's upload settings.** GitHub, EAS and the PC set them differently, and they don't change native code. [fingerprint.config.cjs](../../apps/mobile/fingerprint.config.cjs) leaves them out, so every machine works out the same runtime.

**The version name changes only with a Play build.** An over-the-air update can't change it, because Android reads it from the installed app. Changing it doesn't change the native fingerprint. Checked on 26 November 2026 with Expo SDK 58.

The Preview app shows the same version name as the last release. Its own build number tells test builds apart.

### Pull request titles

The repository uses squash merges, so each PR becomes one commit named after its title. A check on every PR requires one of these types:

| Title starts with | Release effect |
|---|---|
| `feat:` | New features: `1.0.0` → `1.1.0` |
| `fix:`, `perf:`, `content:`, `revert:` | Fixes: `1.0.0` → `1.0.1` |
| `feat!:` or `fix!:` | A breaking change: `1.0.0` → `2.0.0` |
| `refactor:`, `test:`, `docs:`, `ci:`, `build:`, `chore:` | No release |

The task ID goes at the end, for example `feat: speed and size (M6.4)`.

### release-please

[release-please](https://github.com/googleapis/release-please) reads the commits on `master` and keeps one open PR, **Release x.y.z**. That PR raises the version in `package.json`, `apps/mobile/package.json` and `apps/mobile/app.config.ts`, and adds the changes to `CHANGELOG.md`.

- **What counts.** The whole repository counts, because shared code and content change the app. Changes only under `supabase/`, `apps/admin/`, `docs/`, `.github/` or the server scripts don't create a release. They reach production through **Ship update**.
- **Changing the number.** To use a different version, an agent adds a `Release-As: x.y.z` line to a commit, as release-please documents.
- **The first release is `1.0.0`.** The changelog starts at the commit that adds release-please.
- **Merging the Release PR** creates the `vx.y.z` tag and the GitHub Release, then starts the production run.
- **The token.** release-please uses GitHub's built-in workflow token, so there's no app or key to look after. PRs opened with that token don't start other workflows. So the Release workflow starts CI and the PR title check on the Release PR's branch itself, and `master`'s required checks still run. The repository allows GitHub Actions to create pull requests for this.

## Production

### Play release: merging the Release PR

The **Release** workflow runs on every push to `master`. Usually it only updates the Release PR. When a merge creates a release, it continues:

1. **Plan,** with no approval needed. It works out the native fingerprint and lists the migrations that will run. It confirms that staging deployed the same commit. It runs the Android end-to-end tests. It writes all of this to the run summary.
2. **Production,** which waits for the owner's approval. It applies migrations, deploys Edge Functions and checks Auth on the production project. It sets the app's public Supabase values in EAS's `production` environment. It builds the signed app bundle with the `production` profile, which uploads its source maps to Sentry. It submits the bundle to Play's internal testing track.
3. **The owner** tests the internal build, then promotes it in Play Console: closed testing, then production at 10%, 50% and 100%. Play's release notes are pasted by hand from the GitHub Release, because EAS Submit can't send them.

Play's first production release can't use a percentage rollout. The closed test is the safety net for that one.

### Over-the-air update: Ship update

The **Ship update** button in the Actions tab ships `master` to production without a Play build. Use it for content and code fixes between releases, and for server-only fixes.

1. **Plan,** in `production-monitor`. It works out the native fingerprint, finds the production Play build it will reach, and confirms that staging deployed this commit. It stops if no production build matches, which means the native code changed and a Release PR is needed instead. It stops if another rollout is still in progress.
2. **Production,** which waits for the owner's approval. It deploys the production server. Unless **server only** was chosen, it then publishes the update to the `production` channel for 10% of phones and uploads its source maps.

### Production rollout

The **Production rollout** button raises the active production update to 50% or 100%, or undoes it. Like the others, it shows its plan and waits for approval. Undo publishes the previous update again. Phones that already have the new update switch back after their next check and restart.

### Production health

The daily **Weather health** workflow runs the same weather and budget check on both projects. The production check uses `production-monitor`, and it opens its own issue when something's wrong.

### Correction admin page

GitHub Pages serves both admin pages from one deploy: production at `https://msalman5230.github.io/adwam/` and staging at `https://msalman5230.github.io/adwam/staging/`. The privacy notice stays at `/adwam/privacy/`. Until production exists, the root page says so and links to the privacy notice.

## Rules the workflows enforce

- Only commits that already deployed to staging can reach production.
- An over-the-air update can't go to a fingerprint with no production Play build.
- A Play build needs a version name above the last release. release-please makes sure of that.
- Production runs use `master` only and wait for the owner.
- Every EAS command runs after `scripts/verify-eas-account.sh`.

## Migrations and rollback

**Migrations must keep the live app working.** Production users may run the previous version for weeks. Add columns and functions first, and remove old ones only after no supported app uses them. `app_config.min_app_version` can make old apps ask for an update. The free Supabase plan has no backups, so a bad migration is fixed by a new migration.

| Problem | What to do |
|---|---|
| A bad over-the-air update during a rollout | **Production rollout** → undo |
| A bad update already at 100% | Merge a revert PR, then **Ship update** |
| A bad Play build | Halt the rollout in Play Console. Fix it with an update if the fingerprint allows, otherwise with a new Release PR. Play can't take a version back from phones that already have it. |
| A bad Edge Function | Merge the fix, then **Ship update** with **server only** |

## One-time production setup

The owner does this once, before merging the first Release PR: the production Supabase project, the environment rules, every token and key, the upload key, the first server deploy, the scheduler and the admin user. [Production setup](production-setup.md) gives every click, and names the exact place each value goes.

## Costs to watch

| Service | Free limit | Next step |
|---|---|---|
| Expo builds | 15 Android builds a month, shared by Preview and production | Starter, $19 a month |
| Expo updates | 1,000 monthly users of over-the-air updates | Starter, $19 a month, then usage pricing |
| Expo workflows | 60 minutes a month. Adwam's CI doesn't use them. | — |
| Supabase | Two free projects, no backups | Pro when backups are needed |
| GitHub Actions | Free for public repositories | — |
