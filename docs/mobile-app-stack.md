# Mobile app stack

**Decision: the app is built with React Native and Expo, in TypeScript, with weather data from Open-Meteo.** For the backend, a small Supabase project is recommended.

The app's screens are simple: lists, cards and settings. The hard parts are scheduled notifications, server-sent weather pushes, and prayer-time and Hijri date calculations. Expo covers the phone side of these with modules it maintains itself. TypeScript also runs on the backend, so the app and the server can share code and data.

The YAML files described in [sunnah-content-format.md](sunnah-content-format.md) are the source for reminder content. They generate the app and server's shared JSON and the tables in [sunnah-reminder-calendar.md](sunnah-reminder-calendar.md).

## Version 1 stack

| Need | Pick | Why |
|---|---|---|
| App framework | Expo (React Native + TypeScript) | One codebase for Android and iOS. Cloud builds and store submission mean you don't need a Mac for every build. |
| Content fixes | Expo's over-the-air updates | You can correct a hadith grading or citation without waiting for app store review. That matters for a religious app. |
| Reminders | `expo-notifications` | One module handles both scheduled local notifications and server-sent pushes. |
| Prayer times | `adhan-js` | A well-tested library that supports the main calculation methods and each school's Asr rule. You need it for timings like "45 minutes before Maghrib" and "after Jumuʿah". |
| Hijri dates | Umm al-Qura or tabular calculation plus the user's ±1 day setting | The server can offer a correction when Ramadan or Eid is announced. The user chooses whether to apply it. |
| Location | Approximate location while the app is open, or a city the user picks | Enough for prayer times and the weather area. |
| Backend | Supabase: Postgres, scheduled jobs and Edge Functions | Stores push tokens, preferences and each user's coarse weather area. It checks forecasts for areas that are due and sends weather pushes. |
| Eclipses | Astronomy Engine on the phone | Computes local visibility and schedules reminders offline. |
| Date correction admin | A static Vite and TypeScript page on GitHub Pages | Admins sign in by email code to publish or withdraw corrections in Supabase. |
| Weather | Open-Meteo | Adwam uses the free API for noncommercial apps. It combines forecasts from national weather agencies such as ECMWF, NOAA, DWD and Météo-France. |
| Shared content | One JSON file generated from the YAML content | The app and the server read the same reminder list. |

## Location and privacy in version 1

- The app reads approximate location only while it is open, or uses the city the user picked. It updates the user's area each time they open the app.
- The server receives a coarse area, about 10 km across, while weather reminders are enabled. Grouping users by area keeps weather API costs tied to the number of areas, not the number of users.
- If a user travels without opening the app, their weather pushes use the last saved area.

## Weather with Open-Meteo

- **It stays free only while the app is non-commercial.** Open-Meteo's free terms rule out ads, subscriptions and commercial products. Adding any of these later means moving to a paid plan.
- **Credit Open-Meteo in the app,** for example on the About screen. Its data is licensed CC BY 4.0, which requires attribution.
- **The limit is 10,000 calls a day for the whole server.** Checking each area hourly covers about 400 areas. Only check areas where at least one user lives, and check more often only when rain is forecast.
- **There are no official weather warnings.** The heavy-rain and strong-wind reminders use forecast thresholds instead, such as rain above about 7.6 mm an hour or gusts above about 75 km/h.
- **It is a forecast, not live radar,** so it can miss exactly when a local shower starts. Word alerts softly, such as "Rain is likely starting in your area."
- **The free API has no uptime guarantee.** MET Norway's free API makes a good backup. It also needs attribution, and each request must identify the app.
- **If the app outgrows the free limit,** Open-Meteo's code is open-source, so running your own copy is a possible path.

## Things to plan for

1. **Local scheduling looks 60 days ahead.** Keep the soonest 150 notifications on Android and 60 on iOS. Refresh the schedule when the app opens and during background refreshes.
2. **Weather pushes must come from the server.** iOS won't let an app check the weather reliably in the background.
3. **Both platforms ask the user before showing notifications.** Ask at a moment that shows the value, such as right after the user picks their reminders.
4. **Android's exact alarms are restricted** for apps that aren't calendars or alarm clocks. A few minutes of delay is fine for these reminders, so use inexact scheduling and skip that permission.
5. **Some Android phones delay or drop background work,** notably Xiaomi, Samsung and Huawei. Test scheduled notifications on real devices from these brands early.

## Future plan: location-based reminders

These are not in version 1. They need Google Play's approval for background location, which the app can't get yet.

- **Reminders:** leaving home, coming home, the travel duʿāʾ when starting a journey, and the return duʿāʾ and two rakʿahs after a journey. The content and trigger rules are in the calendar file's future-plan section.
- **What they will need:**
  - Background ("Always") location permission. On iOS, ask for "While Using" first, then "Always".
  - Google Play's background location declaration, an in-app notice explaining the use, and a feature where location is central. Make these reminders opt-in.
  - Geofencing through `expo-location` and `expo-task-manager`, which use the phone's built-in geofencing instead of checking GPS constantly.
  - The home location stored on the phone only, never sent to the server.
  - Testing on Android brands that kill background tasks.
