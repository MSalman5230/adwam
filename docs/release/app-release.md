# Android app release

How a new version reaches Google Play. The design is in [CI and releases](ci-and-release.md). Over-the-air updates between releases are in [content-release.md](content-release.md).

## Before merging the Release PR

1. **Check the Release PR.** release-please keeps **chore: release x.y.z** open on GitHub. Check that the version and the changelog are right. If the number is wrong, an agent adds a `Release-As: x.y.z` footer to a commit.
2. **Content.** The owner has approved any new or changed content, and `pnpm --filter @adwam/content validate --release` passes on `master`.
3. **Staging.** Testers have used this code on the Preview app. If the reminder issue **Preview needs a new build** is open, press **Android preview build** first and test the new APK.
4. **Play's target API.** Compare the app's target API with the [current Play requirement](https://support.google.com/googleplay/android-developer/answer/11926878).
5. **Migrations.** Read the new migrations. Each one must keep the current Play version working, because some users will stay on it for weeks.

## Release

1. **Merge the Release PR.** The **Release** workflow tags `vx.y.z`, creates the GitHub Release, and starts the plan.
2. **Read the plan.** It confirms staging ran this code, shows the Android runtime, and lists the migrations that will run. The Android end-to-end tests also run before the production job.
3. **Approve.** On the run page, click **Review deployments**, tick `production` and approve. The job:
   1. deploys the production server
   2. builds the signed app bundle, which uploads its source maps to Sentry
   3. submits the bundle to Play's internal testing track
4. **Release to internal testers.** Releases are uploaded as drafts. In Play Console → Test and release → Internal testing, open the draft and roll it out. Paste the GitHub Release's notes into "What's new".
5. **Check the installed build.** Install it from the internal testing link and check:
   - setup works, and Developer tools are absent
   - the Android notification channels are right
   - a weather push and a correction push arrive and open the right screens
   - a Sentry test crash shows a readable stack
6. **Promote it** in Play Console: to closed testing, then to production.
   - Later releases start at 10% and rise to 50% and 100%. Before each increase, check crash-free sessions in the `adwam-production` Sentry project, the **Weather health** workflow and push receipts.
   - The first production release can't use a percentage rollout.

Record in the GitHub Release: the build ID, version code, runtime, Play track and date, and the source map result.

## If the new version is unsafe

1. **Halt the rollout** in Play Console. Phones that already have the version keep it.
2. **Fix it.** If the problem is in JavaScript or content and the runtime hasn't changed, ship a fix with **Ship update**. Otherwise merge the fix and release a new version through the next Release PR.
3. **Record it** in a GitHub issue: what happened, the halted version and the fix.

## First release only

- **Play Console.** The app, store listing, Data safety answers and content rating are complete. [Store listing review](android/store-review.html)
- **The upload key.** The first production build can't create it unattended, so the owner creates it with `eas credentials` during [production setup](production-setup.md#part-6-the-upload-key). EAS stores it, and a downloaded backup is optional. Play App Signing keeps the key that signs what users install.
- **Draft releases.** The submit profile in `apps/mobile/eas.json` uploads drafts, because Play accepts only drafts until the app's first release.
- **Remove `release-as` after 1.0.0.** Once `v1.0.0` exists, remove `"release-as": "1.0.0"` from `release-please-config.json`. The Release workflow fails until it's gone.
- **The closed test.** A personal account needs at least 12 testers opted in for 14 days in a row, then an application for production access. [Account advice](google-play-account.md)
