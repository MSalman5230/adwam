# Reminder and weather incidents

Identify the project and record the UTC interval, the last healthy run, links to logs, and the app or content version. Use counts and IDs that support the diagnosis. Keep credentials, push tokens and raw device data in their services.

## Weather job stopped

1. Open the **Staging weather health** workflow and check the newest completed `weather-tick` row in `job_runs`. If it is missing or more than 45 minutes old, the workflow also checks whether the two scheduler entries exist in Vault.
2. If an entry is missing, run the staging scheduler setup. Otherwise, check the scheduled job status, project status and Edge Function invocation errors in Supabase. Confirm that the Vault URL matches staging and that the job key in Vault matches the Edge Function secret. A 401 points to a missing or mismatched key. [Scheduler setup](../development-setup.md#server-secrets-supabase-edge-function-secrets-per-project)
3. After restoring the failing dependency, wait for the next quarter-hour. Verify a finished tick with a plausible fetch count. Simulate staging rain and confirm the weather card, and the push when Android messaging credentials are available.

## Open-Meteo budget spent

1. Compare the UTC day’s reserved calls with the configured cap. Review recent fetch counts, due areas and forecast failures before making another request.
2. The weather worker continues from stored forecasts when new fetches exceed the remaining budget. Let the next UTC day reset the allowance. If the area count exceeds the service limit, review the forecast schedule and provider limits before increasing the cap.
3. Confirm the first healthy tick after the reset and close the incident with the new counts.

## Pushes fail

1. Confirm notification permission, the correct package and build, and the relevant Android channel. Test a local scheduled reminder to check the phone’s delivery settings.
2. Check `push-send`, `push-receipts` and their `job_runs` counts. Inspect outbox statuses and Expo errors. Check the staging Expo access secret and Firebase messaging credentials for the Preview package.
3. A device that is no longer registered needs a refreshed token from the app. Delivery with an unknown outcome stays in that state so Adwam avoids sending a duplicate. Verify a fresh staging test with a known Preview install after the fix.

## Supabase project paused

1. Verify which project paused. Ask its owner to resume it from Supabase and confirm the API responds.
2. Verify the functions, Vault URL, job key, cron jobs, app configuration and the latest admin correction. Use the staging deploy workflow to reapply migrations and functions if needed.
3. Confirm a new app sync and a finished weather tick. Re-run the health check when the jobs are configured. Local reminders continue on the phone during the outage.
