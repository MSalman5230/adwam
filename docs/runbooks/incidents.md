# Reminder and weather incidents

Identify the project and record the UTC interval, the last healthy run, links to logs, and the app or content version. Use counts and IDs that support the diagnosis. Keep credentials, push tokens and raw device data in their services.

## Weather job stopped

1. Open the **Weather health** workflow and check the newest completed `weather-tick` row in `job_runs`. If it is missing or more than 45 minutes old, the workflow checks the two Vault entries and, when present, reports the latest Adwam cron runs and recent staging-wide HTTP status counts.
2. If an entry is missing, run the staging scheduler setup. A successful cron run only means it queued the HTTP request. Check the function's invocation logs in Supabase to identify its response. If it returns 401, confirm that the Vault URL is for staging and set the staging Edge Function secret `ADWAM_JOB_KEY` to the actual value of `adwam_job_key` in Vault. Don't use the Vault item's name or ID, surrounding quotes, or a `Bearer` prefix. [Scheduler setup](../development-setup.md#server-secrets-supabase-edge-function-secrets-per-project)
3. After restoring the failing dependency, wait for the next quarter-hour. Verify a finished tick with a plausible fetch count. Simulate staging rain and confirm the weather card, and the push when Android messaging credentials are available.

## Open-Meteo budget spent

1. Compare the UTC day’s reserved calls with the configured cap. Review recent fetch counts, due areas and forecast failures before making another request.
2. The weather worker continues from stored forecasts when new fetches exceed the remaining budget. Let the next UTC day reset the allowance. If the area count exceeds the service limit, review the forecast schedule and provider limits before increasing the cap.
3. Confirm the first healthy tick after the reset and close the incident with the new counts.

## Pushes fail

1. Confirm notification permission, the correct package and build, and the relevant Android channel. Test a local scheduled reminder to check the phone’s delivery settings.
2. Run **Weather health** by hand for aggregate queue, delivery and receipt counts. Check `push-send`, `push-receipts` and their `job_runs` counts. If `EXPO_ACCESS_TOKEN` is missing, create an [Expo access token](https://expo.dev/settings/access-tokens) and save it under that name in the staging Edge Function secrets. It does not require an APK rebuild. Check Firebase messaging credentials for the Preview package if Expo returns an FCM credential error.
3. A device that is no longer registered needs a refreshed token from the app. Delivery with an unknown outcome stays in that state so Adwam avoids sending a duplicate. Verify a fresh staging test with a known Preview install after the fix.

## Supabase project paused

1. Verify which project paused. Ask its owner to resume it from Supabase and confirm the API responds.
2. Verify the functions, Vault URL, job key, cron jobs, app configuration and the latest admin correction. Use the staging deploy workflow to reapply migrations and functions if needed.
3. Confirm a new app sync and a finished weather tick. Re-run the health check when the jobs are configured. Local reminders continue on the phone during the outage.

## Preview update slow or missing

1. Each merge to `master` publishes a Preview update from GitHub's runner, a few minutes after the staging backend deploys. Open the **Deploy staging** run. Its summary links the update group and shows its runtime.
2. If the run failed, read the **Publish the Android Preview update** step and rerun the workflow once the cause is fixed.
3. If the run shows a runtime that no installed APK has, the native code changed. The open **Preview needs a new build** issue says so. Press **Android preview build**, and install the new APK.
4. A phone applies a downloaded update the next time the app starts, so close the app fully and open it again before deciding an update is missing.
