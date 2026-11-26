# Mobile app screens

[mobile-app-ui.html](mobile-app-ui.html) is the source of truth for the app's screens: their layout, their wording and how each control behaves. Open it in a browser and use the left panel to jump to any screen or moment. This file is its written companion. It lists the screens and records what the prototype can't show: rules buried in its code, things it only fakes, and what's left out of version 1. If this file and the prototype disagree, the prototype wins and this file should be fixed.

Reminder content and tiers come from [sunnah-reminder-calendar.md](sunnah-reminder-calendar.md). The technical choices are in [mobile-app-architecture.md](mobile-app-architecture.md).

## Screens at a glance

| Screen | How you get there | What it's for |
|---|---|---|
| **Setup** | First launch only | Location, a Hijri date check, reminder choice and notification permission |
| **Today** | First tab. The app opens here. | What applies right now, and what's next |
| **Upcoming** | Second tab, or All upcoming on Today | The next 60 days, for planning fasts and checking dates |
| **Settings** | Third tab | Reminders, notifications, place and time, the uḍḥiyah answer, appearance |
| **Reminders** | Settings, or Let me choose in Setup | Push, In-app or Off for each item, presets and the fasting pause |
| **Sunnah detail** | Tap a card, a banner, a Coming up or Upcoming row, an item in Reminders, or a push | Full text, duʿāʾ, sources and grading notes, and the item's reminder choice |
| **About** | Settings | Sources, privacy, credits, source code and version |

The bottom bar holds the three tabs. Reminders, Sunnah detail and About open on top with a back arrow and no bottom bar. Back from Upcoming or Settings returns to Today. The other Settings rows open bottom sheets. A snackbar confirms changes, with Undo after every tick. The app has light and dark themes.

There is no account or sign-in. The server knows a phone only by an anonymous install ID, its push token, and the settings it needs for weather pushes.

## Setup

Setup runs once, on first launch, and takes under a minute. It has four steps with a progress bar, and a back arrow from step 2. Every choice can be changed later in Settings.

1. **Where are you?** The app's name and tagline, then three promises: no account and trackers that stay on the phone, only a rough area sent and only for weather, and about 4 reminders a week. "Use my location" asks for approximate location while using the app. "Pick a city" opens a city search, and so does refusing location. Prayer times and the weather area depend on the answer.
2. **Check your Hijri date.** For example: "Today is 9 Rajab 1448. Is that right where you live?" with −1, 0 and +1 buttons. The date and a strip of this week in both calendars update as the user shifts it. A note says when the Hijri day turns at Maghrib today, or after Maghrib, that the new Hijri day has begun. Another explains that Adwam calculates the date with Umm al-Qura and offers a correction when an announced date differs in the region.
3. **Choose your reminders.** Three choices, each showing its push count:
   - **Recommended:** each item at its default in the calendar. About 4 pushes a week.
   - **In-app only:** no notifications. Everything still shows on Today.
   - **Let me choose:** starts from Recommended and ends setup on the Reminders screen, with a Done button.
4. **Allow notifications?** A sample reminder, a promise of nothing during quiet hours, and when reminders come: fasts the evening before after ʿIshāʾ, Friday about 2 hours before Jumuʿah and near Maghrib, and weather only for the first rain after a dry week. Continue brings up the system permission request right after the user picks reminders, when the request makes sense. Not now skips it. If they picked In-app only, setup ends after step 3 and never asks.

Setup ends on Today with the snackbar "You're all set. Change anything in Settings." A one-time notice asks "Share anonymous usage statistics?" with Share and No thanks. Both options are unselected, including when the user chose In-app only.

## Today

Today is the screen the app opens on. From top to bottom:

1. **Date.** The Hijri date is the large title, so a wrong ±1 setting stands out. The Gregorian date and the city sit below it. After Maghrib the title moves to the next Hijri day and shows a "Since Maghrib" tag.
2. **Day line.** Fajr, Ẓuhr (Jumuʿah on Fridays), ʿAṣr, Maghrib and ʿIshāʾ on a line, with their times and a marker for now. Its caption counts down to Maghrib, "The Hijri day turns then", or after Maghrib says the new Hijri day has begun.
3. **Notices,** only when needed:
   - **Notifications are off.** Shown when notifications aren't allowed and at least one item is set to Push: "Push reminders can't reach you, so check here." Its Open settings button opens the phone's notification settings for the app.
   - **Date correction.** Shown when the server reports an announced Ramadan or Eid date that differs from the calculation, for example "Ramadan starts on Sunday in the United Kingdom. Your app says Monday." The user picks Use Sunday or Keep my dates. Both choices offer Undo.
   - **Uḍḥiyah question.** Shown from 10 Dhul-Qaʿdah until it's answered: "Are you offering an uḍḥiyah this year?" with Yes and No. Only Yes turns on the hair-and-nails reminders. The same answer is in Settings.
   - **Fasting reminders paused.** Shown during a pause, with its end date and a Resume now button.
4. **Season banner.** Only one shows at a time, and the most specific wins, in this order: the last ten nights, Ramadan, the best ten days (1–10 Dhul-Ḥijjah), the Days of Tashrīq, Muḥarram, Shaʿbān, then any other sacred month. Tapping it opens that item's detail screen. If the item is set to Off, there's no banner.
5. **Active now.** A card for every item whose in-app window is open, with the soonest to end first and a count of the open ones in the heading. Done items drop to the bottom, dimmed, until their window closes.
6. **Coming up.** The next three items that haven't started, from the next two weeks, then an All upcoming link to the Upcoming tab. A multi-day item appears once. Each row says when the item starts, such as "1:30 pm", "From ʿAṣr" or "Thursday from Maghrib". For a fast that sends a push, the row says when the reminder comes instead, such as "Reminder Sunday after ʿIshāʾ". A bell marks rows that will send a push.

**Empty state.** Often nothing applies. Tuesday, Saturday and most of Sunday and Wednesday have no weekly item, and many months have no banner. Then Active now shows "Nothing special right now" with a line naming what's next, such as "Next is the Thursday fast. You'll get a reminder tomorrow after ʿIshāʾ." With the day line and Coming up, the screen never looks blank.

The prototype's Moment list shows Today in each of these states, including a Friday morning, a quiet Tuesday, the White Days, the end of Shaʿbān, the last ten nights, Shawwāl and mid-Dhul-Qaʿdah.

### Cards

Each card has:

- **A title,** such as "Sūrat al-Kahf".
- **Time left,** after a bell if the item sends a push: "until Maghrib", "2 h to Jumuʿah", "40 min left" in its last hour, "today" for all-day cards, or "while it rains".
- **One line on what to do.**
- **Extras where they apply:** an "Also a Monday fast" line, the duʿāʾ transliteration on rain and Laylat al-Qadr cards so it needs no tap, a tracker, and on weather cards a rain icon and the credit "Weather data by Open-Meteo.com".
- **A tick** where it fits: Done for actions, and Fasting today on a fasting day. Ticking shows a snackbar with Undo. Banners, planning cards and cards such as Suḥūr and Ifṭār have no tick.

Tapping a card opens its detail screen.

The cards follow these rules:

- **One fasting card a day.** When fasts overlap, such as a White Day on a Thursday, the most specific one gets the card and the others become an "Also" line. The order is ʿArafah, ʿĀshūrāʾ, White Days, Shawwāl, then Monday and Thursday. One Fasting today tick logs the day for all of them.
- **Fasting cards before Fajr.** A fasting card appears at Maghrib the evening before. Until Fajr it says when to take suḥūr, such as "Plan suḥūr before Fajr at 6:12 am", and has no tick.
- **Planning cards** sit in Active now all day: "ʿĀshūrāʾ is coming" on 1–8 Muḥarram, "Plan your iʿtikāf" on 18–20 Ramadan, and "Leave hair and nails" on 1–10 Dhul-Ḥijjah for users offering an uḍḥiyah.
- **Pushes without a card.** The 1 Shaʿbān and 1 Dhul-Ḥijjah pushes have no card, because a banner covers the month or the ten days. The ʿArafah afternoon duʿāʾ push has none either, because the ʿArafah fast card covers the day.
- **The make-up card** works differently. See [Trackers](#trackers).

## Sunnah detail

The detail screen opens from a card, a banner, a Coming up or Upcoming row, an item in Reminders, or a push. Its title moves into the top bar on scroll. From top to bottom:

- **Header.** The group, the Hijri month for yearly items, and the tier, such as "Yearly · Shawwāl · Push". Then the title, a status line and when the item applies. The status says it's active now with the time left, when it's next with the Hijri date, or that it has ended. Banner items say they're on Today as a banner, or "Not this month". Weather items say they show when the forecast calls for it.
- **What to do.** The full text from the calendar. While the item is active, its tick and tracker sit under the text.
- **Quran.com,** a button on al-Kahf and al-Sajdah that opens the surah.
- **Duʿāʾ,** for items that have one: the Arabic, the transliteration and the English meaning, with a Copy button. The calendar has only the transliteration and meaning, so the Arabic text needs to be added to the shared JSON. The prototype already has the Arabic for all seven.
- **Sources.** Grading notes and differences of opinion come first, in full, as written in the calendar. Hadith and Qurʾan rows show the source label and any available grade. Expand a row for the Arabic excerpt, its English meaning, the narrator where applicable, translation credit and the link. Book and fatwa rows link to the source.
- **Your reminder.** The item's Push, In-app or Off control, with a line on what the choice means, such as "A push about 45 minutes before Maghrib." It can be changed here without going to Settings.
- **Report a problem with this item.** This opens a sheet with the item, its ID, the content version, the app version and a box to describe the problem. "Open the issue form" opens an issue form with all of these filled in. Over-the-air updates mean a fix can ship within days.
- **Weather credit** on weather items, the same as on their cards.
- **The item ID and content version** in small print at the end.

## Upcoming

Upcoming lists the next 60 days.

- **Filters:** All, Fasts (fasts and no-fasting days) and Notifies me (items set to Push).
- **Weeks, then days.** Weeks are headed "This week", "Next week" or "Week of 4 January", with their dates. Each day shows its weekday and date, and today is marked.
- **Rows** show the item, its Hijri date and when it starts, such as "9 Rajab · from Maghrib", and a bell if it will send a push. A multi-day item is one row with a range, such as "13–15 Rajab · to Thu 24 Dec". Tapping a row opens the detail screen.
- **Month starts** get their own row, such as "Rajab begins · a sacred month", with the Maghrib the month starts from.
- **No-fasting days** are tagged: both Eids and the Tashrīq days. This helps a user planning voluntary fasts. During a pause, fasts are tagged Paused and lose their bell.
- **Eclipses** visible from the user's area are listed, since they are known well in advance.
- **Left out:** weather, because it can't be forecast that far ahead, and items that would crowd the list: Friday's after-Jumuʿah card, Suḥūr and Ifṭār, planning cards and the make-up card. Friday's al-Sajdah and al-Insān card is listed on Thursday, "after ʿIshāʾ".
- **A legend and a count** close the list.
- **A month grid** can come later. A list is simpler and fits a phone screen.

## Trackers

Trackers sit on cards and detail screens, not in their own tab. Their data stays on the phone.

| Tracker | Where it shows | What a tick changes |
|---|---|---|
| **al-Kahf done** | The al-Kahf card, from Thursday Maghrib to Friday Maghrib | If it's ticked before the Friday push, the push leaves out the al-Kahf line. |
| **Fasting today** | The day's fasting card, from Fajr: the Monday and Thursday fasts, the White Days, ʿĀshūrāʾ, ʿArafah and the six Shawwāl fasts | It logs the day, which counts toward the White Days and Shawwāl. |
| **White Days, 0 of 3** | The White Days card and detail screen | It shows progress. Every fast logged that Hijri month counts, because any three days fulfill the practice. |
| **Six Shawwāl fasts, 0 of 6** | The Shawwāl card and detail screen, all month | At six it says "All six done", and the remaining Shawwāl cards and reminders stop. |
| **Ramadan days to make up** | Its own card, all through Shaʿbān and Shawwāl | The card first asks how many days, then offers "Log a make-up fast". At zero it leaves Today. |

Every tick offers Undo. A tick can change which notifications are due, so the app reschedules its local notifications after every tick, including a Done tap on a notification.

## Settings

The Settings tab says "Saved on this phone. No account needed." Its rows come in four groups. Reminders and About open screens, and the rest open sheets.

| Group | Setting | Choices | Notes |
|---|---|---|---|
| Reminders | **Reminders** | Opens the Reminders screen | The row shows the preset and the pushes a week. |
| | **Notifications** | Opens the phone's notification settings for the app | Six channels, including two for date corrections. |
| | **Quiet hours** | Start and end, 10 pm to 7 am by default. A switch lets eclipses notify in quiet hours, off by default. | Lunar eclipses often happen at night. See below. |
| | **Pause fasting reminders** | 3, 7 or 14 days, or until turned back on | Also on the Reminders screen. |
| Place and time | **Location** | Current location, or a city from a search | With current location, the area updates each time the app opens. Picking a city also picks its suggested prayer method. |
| | **Prayer times** | Calculation method. ʿAṣr: standard or Ḥanafī. | The sheet names the method suggested for the location and previews today's ʿAṣr and Maghrib. |
| | **Jumuʿah time** | At Ẓuhr, or a fixed time | Defaults to Ẓuhr. Many mosques hold Jumuʿah at a set time. The push 2 hours before and the after-Jumuʿah card use this time. |
| | **Hijri date** | Umm al-Qura by default, or tabular. Shift by −1, 0 or +1 days. | The sheet previews today's Hijri date, explains how offers work and lists accepted corrections, each with Remove. |
| This year | **Uḍḥiyah this year** | Yes, No or Not set | Not set means Today asks in mid-Dhul-Qaʿdah. It resets each year. |
| App | **Appearance** | Match the phone, Light or Dark | |
| | **Privacy** | Crash reports, anonymous usage statistics and Delete my data from the server | Deletion asks for confirmation. |
| | **About Adwam** | Opens the About screen | |

**Quiet hours and calendar pushes.** Some calendar pushes fall at night. The after-ʿIshāʾ fasting push can come near midnight in summer, and the Eid push after Fajr can come before 4 am at high latitudes. A push about something coming tonight or tomorrow moves earlier, to just before quiet hours start. A push about something already under way, like Eid after Fajr, moves later, to when quiet hours end. Weather pushes during quiet hours are dropped, as the calendar says, so quiet hours are also sent to the server.

### Reminders screen

Each item has up to three choices:

| Choice | What it means |
|---|---|
| **Push** | A notification at the push time, and a card on Today |
| **In-app** | A card on Today during its window, with no notification |
| **Off** | No notification and no card |

- **A live total** at the top adds up the pushes a week, a month and a year, plus weather. Under it, **Recommended** and **In-app only** set every item at once. Any other mix shows as custom choices, with a Reset button.
- **Defaults** follow the calendar's tiers. Push items offer all three choices. In-app items offer only In-app and Off, because the calendar gives them no push time. al-Sajdah and al-Insān offers all three but starts at In-app.
- **Pause fasting reminders** sits under the total. Its switch pauses for 7 days, with Undo, and chips change that to 3, 7 or 14 days or until turned back on. It gives no reason and asks for none, so it covers illness, travel and periods alike. Fasting cards, pushes and bells stop, and nothing else changes. Fasting items are tagged in the shared JSON so the pause can find them.
- **Groups** follow the calendar: Weekly, Monthly, Yearly, and Weather and eclipses. Each group expands to its items, shows how many of them push, and has a switch. Turning a group off and on again restores the choices made inside it, and picking a choice inside an off group turns the group back on. Yearly items appear in Hijri month order, under month headings, with the sacred months under "Through the year". Each item's name opens its detail screen.
- **Weather and eclipses.** When this whole group is off, the app stops sending its area to the server.
- **Hair and nails** has no choice until the uḍḥiyah answer is Yes, and links to that setting.
- **Disputed** sits at the bottom and holds the two disputed items from the calendar. They are off by default, have no group switch, and offer only In-app and Off. Each carries one line on why it's disputed.

## About

- **Header.** The app icon and name, the line "Sunnah practices, timed to your Hijri date and prayer times.", and the app version and content version, so a bug report shows which content update the phone has.
- **Sources.** A short note that the content comes from Sunni hadith and fiqh, that gradings and differences of opinion are shown, and that each item has a "Report a problem" link.
- **Privacy.** Adwam uses an anonymous install ID, a push token and the settings the server needs for reminders. It sends a rough area only for weather. Trackers stay on the phone. Sentry receives crash reports when enabled, and PostHog receives anonymous usage statistics after opt-in. The Privacy sheet controls both and offers server data deletion. A "Privacy notice" link opens the full notice on GitHub Pages.
- **Credits.** "Weather data by Open-Meteo.com", linking to open-meteo.com, with a link to the CC BY 4.0 licence. The app is free and non-commercial, so it can use Open-Meteo's free API. The free API still comes under the CC BY 4.0 data licence, which requires this credit. The licence also asks for the link next to any place its data appears, so weather cards carry it too. If MET Norway is added as a backup, credit it here as well.
- **Content and city credits.** GeoNames for city data, Sunnah.com and its translators for hadith, and Quran.com and Dr. Mustafa Khattab’s The Clear Quran for Qurʾan excerpts.
- **Source code.** Links to the Adwam repository and the noncommercial licence. [Repository](https://github.com/MSalman5230/adwam) · [Adwam Noncommercial Licence](../LICENSE)

## Notifications

- **Tapping** a push opens that item's detail screen. The combined Friday push opens Today instead, because it covers two items.
- **Later** is on every push. It sends the push once more an hour later, if its window is still open.
- **Done** ticks the item, like the tick on its card. Only pushes for items with a Done tick have it. Fasting pushes come the evening before, so they have only Later, and so does the combined Friday push.
- **Android channels:** Weekly, Monthly, Yearly, Weather and eclipses, Date corrections, and Date corrections (silent) for quiet hours.
- **Wording** is short: what's coming, then one line on what to do, such as "Tomorrow is Monday, a Sunnah fast". Weather wording stays soft, such as "Rain is likely starting in your area", because the data is a forecast.

## A week in the app

This follows one user who picked the Recommended reminders.

- **Sunday after ʿIshāʾ.** A push says "Tomorrow is Monday, a Sunnah fast." Tapping it opens the detail screen, with Tirmidhī 747 under Sources. The Monday fast card has been on Today since Maghrib. Until Fajr it says when to take suḥūr.
- **Monday.** From Fajr the card has a Fasting today tick. The user ticks it, and the White Days card later shows 1 of 3. The card leaves at Maghrib.
- **Tuesday.** Nothing applies. Today shows "Nothing special right now" and names the Thursday fast. Coming up lists Thursday's fast and al-Kahf from Thursday Maghrib.
- **Wednesday after ʿIshāʾ.** The Thursday fast push arrives, like Sunday's.
- **Thursday Maghrib.** The al-Kahf card appears. The user reads al-Kahf that night and ticks Done. After ʿIshāʾ, a card for al-Sajdah and al-Insān appears and stays until sunrise. It sends no push, because it starts at In-app.
- **Friday.** About 2 hours before the user's Jumuʿah time, a push arrives for Friday preparation, without the al-Kahf line because it's done. After Jumuʿah, a card for the four rakʿahs stays until ʿAṣr. From ʿAṣr, the last-hour card shows, and a push comes about 45 minutes before Maghrib.
- **Saturday.** Nothing is scheduled. Rain starts after a dry week, so a weather push and card arrive with the rain duʿāʾ and the Open-Meteo credit.

## Times the prototype settles

The calendar gives each item's window in words. The prototype turns these into times in `occsForDay()` in [mobile-app-ui.html](mobile-app-ui.html). Where the calendar left the exact time open, it uses these:

- **Evening-before fasting pushes:** 15 minutes after ʿIshāʾ.
- **Morning pushes** on 1 Shaʿbān, 2 Shawwāl, 29 Dhul-Qaʿdah and 1 Dhul-Ḥijjah: 3 hours after Fajr.
- **Eid pushes:** 20 minutes after Fajr. **Zakāt al-fiṭr push:** Ẓuhr on 27 Ramadan. **ʿArafah duʿāʾ push:** 2½ hours after Ẓuhr.
- **al-Sajdah and al-Insān card:** Thursday ʿIshāʾ to Friday sunrise. When set to Push, the push comes 15 minutes after ʿIshāʾ, moved before quiet hours if they have started.
- **Four rakʿahs after Jumuʿah:** until ʿAṣr, but for at least 90 minutes, because in winter ʿAṣr can come soon after Jumuʿah.
- **New crescent card:** from Maghrib to 45 minutes after ʿIshāʾ, on the 29th and the 30th.
- **Suḥūr card:** the 2 hours before Fajr. **Ifṭār card:** Maghrib to ʿIshāʾ.
- **Zakāt al-fiṭr and Eid takbīr cards:** until about 45 minutes after sunrise on Eid, standing in for the Eid prayer.
- **Eid cards:** Fajr to Ẓuhr.
- **Takbīr after prayers:** Fajr on 9 Dhul-Ḥijjah to 30 minutes after ʿAṣr on the 13th.

## What the prototype fakes

- **Prototype controls.** The left panel (Go to, Moment, Clock, Simulate, App theme and Reset) and the right panel (Review of the 24 mockups) are for testing and review, not part of the app. Tapping the status bar opens a stand-in for Android's notification shade.
- **Location.** "Use my location" always finds London, and the city list is a short sample.
- **Notifications.** Pushes are worked out from the clock, not scheduled. Later doesn't send again, and quiet hours are saved but not applied. Open settings and the Notifications row open a mock of Android's settings.
- **Server data.** The date correction and server data deletion are simulated. Use the Date correction offer Moment to try the example. Weather is a "Rain starting now" switch. Rain stopping, heavy rain, thunder, wind and eclipses aren't simulated, so Upcoming lists no eclipses yet.
- **Links.** Report a problem shows a snackbar instead of opening the issue form, and the GitHub link is a placeholder.
- **Uḍḥiyah.** The answer doesn't reset each year.
- **Starting values.** The prototype starts with demo values: Jumuʿah at a fixed 1:30 pm, so the Friday moment reads "2 h to Jumuʿah", and 3 make-up days. The app defaults Jumuʿah to Ẓuhr and starts the make-up count unset, so the card asks for it.

## Left out of version 1

- **Prayer-time and Qibla screens.** The app uses adhan-js to time reminders, but it isn't a prayer-time app. The day line on Today shows the five times for context only, with no prayer alerts.
- **A Qur'an reader.** Recitation items open quran.com instead.
- **Home-screen widgets.** They need native code, so they wait for a later version.
- **Accounts and sign-in.**
- **Location-based reminders,** such as leaving home and journeys. These are in the calendar's future-plan section.
- **A month-grid calendar.**
