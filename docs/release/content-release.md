# Over-the-air updates and rollback

How content, JavaScript and server fixes reach production between Play releases. The design is in [CI and releases](ci-and-release.md). New Play versions are in [app-release.md](app-release.md).

## Ship an update

1. **Merge the fix to `master`.** Staging deploys it, and Preview phones get it within minutes.
   - The owner reviews content changes before they're marked `published`.
   - Keep released Sunnah IDs, tick keys, notification IDs and Android channel IDs unchanged.
2. **Check it on a Preview phone.** Close the app fully and open it twice: the first start downloads the update, and the second runs it.
3. **Press Ship update.** In the Actions tab, open **Ship update** and click **Run workflow** on `master`. Tick **server only** for a server fix with no app change.
4. **Read the plan.** It stops in these cases:
   - **No production Play build has this runtime.** The native code changed since the last Play release, so the fix has to go out through the Release PR.
   - **Another update is still rolling out.** Finish it or undo it first.
   - **Staging didn't deploy this commit.**
5. **Approve.** The job deploys the production server and publishes the update for 10% of phones on that runtime.
6. **Raise it.** Check Sentry after a day or so. Then press **Production rollout** → **Raise to 50%**, and later **Raise to 100%**. Each one needs approval.

The plan and the job summary give the update group ID and runtime. Record them with the content version when content changed.

## Roll back

| Situation | What to do |
|---|---|
| The update is still rolling out | **Production rollout** → **Undo**. The previous update is published again for everyone. |
| The update is already at 100% | Merge a revert PR, check it on staging, then **Ship update**. |
| Phones need the version inside the Play build | An agent runs `eas update:roll-back-to-embedded --branch production` from an approved workflow change, not from a PC. |

After a rollback:
1. Check that a test phone downloads and starts the restored update, keeps its ticks, and rebuilds its notification schedule.
2. Reopen the change, and record the reason and the restored update group in the incident.

[Expo rollouts](https://docs.expo.dev/eas-update/rollouts/) · [Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
