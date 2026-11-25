# Android reminder test

Use the latest signed **Adwam Preview** APK from the staging project. Record the Expo build ID and app version code with each result. [Preview builds](https://expo.dev/accounts/msalman5230/projects/adwam/builds)

## Check delivery and tap routing

Open Settings → Developer tools, scroll to Scheduled notifications, and tap **Fire the next notification in 10 seconds**. Press Home and then open Android’s notification shade. Record whether the reminder appeared and which screen opens when you tap it. If the button is unavailable, enable Android notifications for Adwam Preview and choose Recommended in Reminders.

## Run the week

1. Complete Setup, allow Android notifications, and choose Recommended in Reminders. Leave the phone on its usual battery settings for the first part of the week.
2. Open Settings → Developer tools. Compare Planned notifications with Scheduled notifications and record each reminder’s planned time. During the week, record the Android posting time and any reminders that did not arrive.
3. Restart the phone while reminders are pending. Check whether the next reminder arrives after unlocking, before reopening Adwam. Then open Adwam and check the scheduled list again.
4. Use Battery Saver and leave the phone idle with the screen off for one night. Record the phone’s battery settings and any delay or missed reminder.
5. Dismiss Adwam from Recents before a reminder with Done arrives. Press Done from the shade and check that the app stays closed and the tick is saved when you next open it. Do the same with Later on a different reminder whose window will stay open for another hour. Check that there is one copy and record when it arrives.
6. Change the phone’s time zone and check the next planned time. The schedule should still follow the city selected in Adwam. Select a different city and check that the plan uses the new city’s prayer times.
7. Test a daylight-saving transition with a city that observes it, using a disposable test phone if changing the system date. Check the reminders before and after the change against the local time for the selected city.
8. While reminders are pending, install a newer signed Preview APK over the app. Check that the next reminder arrives before you reopen Adwam.

Use Android’s posted time and the planned time for the same reminder when recording a delay. Record missed reminders as well as late ones. The risk check uses 15 minutes as its delay threshold. This week also closes the milestone 0 risk tests for real phones: Done and Later with the app closed, delivery delay, restarts and updates.

## Results

Emulator checks confirmed notification registration, Done and Later after killing the app process, a cold tap to the item detail, permission changes and a forced WorkManager reschedule. Later was observed in the pending list. The week on physical phones covers delivery at the scheduled time and behaviour under each vendor’s battery settings.

| Phone | Android and battery settings | Preview build and week | Outcome |
| --- | --- | --- | --- |
| Pixel | | | Pending |
| Samsung | | | Pending |
| Xiaomi | | | Pending |
| Low-end Android phone | | | Pending |

| Phone and scenario | Reminder | Local time zone | Planned time | Posted time | Delay or result |
| --- | --- | --- | --- | --- | --- |
| Nothing Phone (2), 10-second test | Monday fasting | | About 10 seconds after starting the test | Arrived | Tap opened the Sunnah detail with What to do and sources |

Reported by the owner on 22 November 2026. Android version, battery settings, and exact delivery time were not recorded. [Signed Preview used for this check](https://expo.dev/accounts/msalman5230/projects/adwam/builds/5057e7d1-bae2-4791-8284-23d42c996915)
