# Mobile app screens

The app has three tabs: **Today**, **Upcoming** and **Settings**. Each Sunnah also has a detail screen, and a short setup runs on first launch. Reminder content and tiers come from [sunnah-reminder-calendar.md](sunnah-reminder-calendar.md). The technical choices come from [mobile-app-stack.md](mobile-app-stack.md).

## Screens at a glance

| Screen | How you get there | What it's for |
|---|---|---|
| **Setup** | First launch only | Location, a Hijri date check, reminder choice and notification permission |
| **Today** | First tab. The app opens here. | What applies right now, and what's next |
| **Upcoming** | Second tab | The next 60 days, for planning fasts and checking dates |
| **Settings** | Third tab | Per-reminder choices, location, prayer and Hijri methods, quiet hours |
| **Sunnah detail** | Tap a card, an Upcoming row or a push | Full text, duʿāʾ, sources and grading notes |
| **About** | From Settings | Credits, how sources were chosen, version, repo link |

There is no account or sign-in. The server knows a phone only by an anonymous install ID, its push token, and the settings it needs for weather pushes.

## Setup

Setup runs once, on first launch, and takes under a minute. Every choice can be changed later in Settings.

1. **Location.** "Use my location", which asks for While Using permission, or "Pick a city". Prayer times and the weather area depend on it.
2. **Hijri date check.** For example: "Today is 9 Rajab 1448. Is that right where you live?" with −1, 0 and +1 buttons. After Maghrib the screen shows the new Hijri day and says why, because the Hijri day begins at Maghrib.
3. **Reminders.** Three choices:
   - **Recommended:** each item at its tier in the calendar.
   - **In-app only:** no notifications. Everything still shows on Today.
   - **Let me choose:** opens the reminder list from Settings.
4. **Notifications.** The app asks for permission here, right after the user picks reminders, when the request makes sense. It skips the request if they picked In-app only.

## Today

Today is the screen the app opens on. From top to bottom:

1. **Dates.** The Gregorian date and the Hijri date. The Hijri date is large enough that a wrong ±1 setting stands out. After Maghrib it moves to the next day.
2. **Notices,** only when needed:
   - **Date correction.** Shown when the server reports an announced Ramadan or Eid date that differs from the calculation, for example "Ramadan starts on Wednesday in your region, not Thursday."
   - **Notifications are off.** Shown if permission was denied: "Push reminders can't reach you, so check here." It has a button that opens the phone's settings.
   - **Uḍḥiyah question.** Shown in mid-Dhul-Qaʿdah: "Are you offering an uḍḥiyah this year?" with Yes and No. Only Yes turns on the hair-and-nails reminders.
3. **Season banner.** Sacred month, Muḥarram, Shaʿbān, Ramadan, the last ten nights, or Dhul-Ḥijjah 1–10. Only one banner shows at a time, and the most specific one wins. For example, the last-ten-nights banner replaces the Ramadan banner.
4. **Active now.** A card for every item whose in-app window is open, with the soonest to end first. Done items drop to the bottom, dimmed, until their window closes.
5. **Coming up.** The next three items, each with its start time. Planning cards stay here for their whole planning window, such as ʿĀshūrāʾ from 1 Muḥarram and iʿtikāf from 18 Ramadan.

**Empty state.** Often nothing applies. Tuesday, Saturday and most of Sunday and Wednesday have no weekly item, and many months have no banner. At those times Active now shrinks to one line, "Nothing special right now", and Coming up moves up. The screen should never look blank.

### Cards

Each card has:

- **A title,** such as "Sūrat al-Kahf".
- **Time left,** such as "until Maghrib" or "2 h to Jumuʿah".
- **One line on what to do.**
- **A checkbox** where it fits: Done for actions, and Fasting today on a fasting day. Banners have no checkbox.
- **A credit line** on weather cards: "Weather data by Open-Meteo.com".

Tapping a card opens its detail screen.

### Example: a Friday morning

```
Friday 27 November 2026
17 Jumādā al-Ākhirah 1448

ACTIVE NOW
[ ] Sūrat al-Kahf                  until Maghrib
    Read al-Kahf and send extra ṣalawāt.

[ ] Friday preparation          2 h to Jumuʿah
    Ghusl, siwāk, clean clothes, arrive early.

COMING UP
    Four rakʿahs after Jumuʿah          1:30 pm
    Last hour before Maghrib: duʿāʾ    from ʿAṣr
    Monday fast              Sunday after ʿIshāʾ
```

## Sunnah detail

The detail screen opens from a card, an Upcoming row or a push. It has these sections, from top to bottom:

- **When.** When the item applies, and whether it is active now or starts later.
- **What to do.** The full text from the calendar.
- **Duʿāʾ,** for items that have one: the Arabic, the transliteration and the English meaning, with a copy button. The calendar has only the transliteration and meaning, so the Arabic text needs to be added to the shared JSON.
- **Sources.** Each source is a link that opens sunnah.com or quran.com. Grading notes and differences of opinion appear in full, as written in the calendar.
- **Your reminder.** The item's Push, In-app only or Off control, so it can be changed here without going to Settings.
- **Tracker,** for items that have one.
- **Open in Quran.com,** for al-Kahf, al-Sajdah and al-Insān.
- **Report a problem with this item.** This opens an issue form filled in with the item ID and content version. Over-the-air updates mean a fix can ship within days.
- **Weather credit** on weather items, the same as on their cards.

## Upcoming

Upcoming lists the next 60 days, grouped by week. Each row shows the Hijri and Gregorian date, the item, and a bell if it will send a push. Tapping a row opens the detail screen.

- **No-fasting days** are marked: both Eids and the Tashrīq days. This helps a user planning voluntary fasts.
- **Eclipses** visible from the user's area are listed, since they are known well in advance. Weather items are not listed, because weather can't be predicted that far ahead.
- **A month grid** can come later. A list is simpler and fits a phone screen.

## Trackers

Trackers sit on cards and detail screens, not in their own tab. Their data stays on the phone.

| Tracker | Where it shows | What a tick changes |
|---|---|---|
| **al-Kahf done** | The al-Kahf card, from Thursday Maghrib to Friday Maghrib | If it's ticked before Friday morning, the Friday push leaves out the al-Kahf line. |
| **Fasting today** | Cards for the Monday and Thursday fasts, the White Days, ʿĀshūrāʾ, ʿArafah and the six Shawwāl fasts | It adds to the White Days and Shawwāl counts. |
| **White Days, 0 of 3** | The White Days card | It shows progress. Every fast logged that month counts toward it, because any three days fulfill the practice. |
| **Six Shawwāl fasts, 0 of 6** | The Shawwāl card, all month | At six, the remaining Shawwāl reminders stop. |
| **Ramadan days to make up** | Asked on the Shawwāl card, and shown all through Shaʿbān | The user enters the number and logs each make-up fast. At zero, the make-up line leaves the Shaʿbān card. |

A tick can change which notifications are due. The app reschedules its local notifications after every tick, including a Done tap on a notification.

## Settings

### Reminders

Each item has up to three choices:

| Choice | What it means |
|---|---|
| **Push** | A notification at the push time, and a card on Today |
| **In-app only** | A card on Today during its window, with no notification |
| **Off** | No notification and no card |

- **Defaults** follow the calendar's tiers. Push items offer all three choices. In-app items offer only In-app only and Off, because the calendar gives them no push time.
- **Groups** follow the calendar: Weekly, Monthly, Yearly, and Weather and eclipses. Each group has a switch. Turning a group off and on again restores the choices made inside it. Yearly items appear in Hijri month order, under month headings.
- **Weather and eclipses.** When this whole group is off, the app stops sending its area to the server.
- **Disputed** sits at the bottom and holds the two disputed items from the calendar. They are off by default and offer only In-app only and Off. Each carries one line on why it's disputed.
- **Pause fasting reminders** for 3, 7 or 14 days, or until turned back on. It gives no reason and asks for none, so it covers illness, travel and periods alike. Fasting items are tagged in the shared JSON so the pause can find them.

### Other settings

| Setting | Choices | Notes |
|---|---|---|
| **Location** | Current location, or a city | With current location, the area updates each time the app opens. |
| **Prayer times** | Calculation method. Asr school: standard or Ḥanafī. | The default method is suggested from the location. |
| **Jumuʿah time** | Dhuhr, or a fixed time | Defaults to Dhuhr. Many mosques hold Jumuʿah at a set time. The push 2 hours before and the after-Jumuʿah card use this time. |
| **Hijri date** | Calculation method, Umm al-Qura by default. Shift by −1, 0 or +1 days. | Dates announced for the user's region, sent by the server, take priority. |
| **Quiet hours** | Start and end, 22:00 to 07:00 by default | See below. |
| **Eclipses in quiet hours** | Allow or not, not allowed by default | Lunar eclipses often happen at night. |
| **Uḍḥiyah this year** | Yes, No or not set | Also asked on Today in mid-Dhul-Qaʿdah. It resets each year. |
| **About** | None | Opens the About screen. |

**Quiet hours and calendar pushes.** Some calendar pushes fall at night. The after-ʿIshāʾ fasting push can come near midnight in summer, and the Eid push after Fajr can come before 4 am at high latitudes. A push about something coming tonight or tomorrow moves earlier, to just before quiet hours start. A push about something already under way, like Eid after Fajr, moves later, to when quiet hours end. Weather pushes during quiet hours are dropped, as the calendar says, so quiet hours are also sent to the server.

## About

- **Credits.** "Weather data by Open-Meteo.com", linking to open-meteo.com, with a link to the CC BY 4.0 licence. The app is free and non-commercial, so it can use Open-Meteo's free API. The free API still comes under the CC BY 4.0 data licence, which requires this credit. The licence also asks for the link next to any place its data appears, so weather cards carry it too. If MET Norway is added as a backup, credit it here as well.
- **Sources.** A short note that the content comes from Sunni hadith and fiqh, that gradings and differences of opinion are shown, and that each item has a "Report a problem" link.
- **Open source.** A link to the repo and its licence.
- **Version.** The app version and the content version, so a bug report shows which content update the phone has.

## Notifications

- **Tapping** a push opens that item's detail screen. The combined Friday push opens Today instead, because it covers two items.
- **Action buttons:** Done and Later. Done ticks the item, like the checkbox on its card. Later sends the push once more an hour later, if its window is still open. The combined Friday push has only Later.
- **Android channels:** one per reminder group, so users can also silence a group in Android's settings.
- **Weather wording** stays soft, such as "Rain is likely starting in your area", because the data is a forecast.

## A week in the app

This follows one user who picked the Recommended reminders.

- **Sunday after ʿIshāʾ.** A push says "Tomorrow is Monday, a Sunnah fast." Tapping it opens the detail screen, with Tirmidhī 747 under Sources. A Monday fast card stays on Today until Monday's Maghrib.
- **Monday.** The card shows a Fasting today checkbox. The user ticks it, and the White Days card later shows 1 of 3.
- **Tuesday.** Nothing applies. Today shows "Nothing special right now". Coming up lists Thursday's fast and al-Kahf from Thursday Maghrib.
- **Wednesday after ʿIshāʾ.** The Thursday fast push arrives, like Sunday's.
- **Thursday Maghrib.** The al-Kahf card appears. The user reads al-Kahf that night and ticks Done.
- **Friday.** Before Fajr, a card shows al-Sajdah and al-Insān. About 2 hours before the user's Jumuʿah time, a push arrives for Friday preparation, without the al-Kahf line because it's done. After Jumuʿah, a card for the four rakʿahs stays until ʿAṣr. From ʿAṣr, the last-hour card shows, and a push comes about 45 minutes before Maghrib.
- **Saturday.** Today shows only Coming up. Rain starts after a dry week, so a weather push and card arrive with the rain duʿāʾ and the Open-Meteo credit.

## Left out of version 1

- **Prayer-time and Qibla screens.** The app uses adhan-js to time reminders, but it isn't a prayer-time app.
- **A Qur'an reader.** Recitation items open quran.com instead.
- **Home-screen widgets.** They need native code, so they wait for a later version.
- **Accounts and sign-in.**
- **Location-based reminders,** such as leaving home and journeys. These are in the calendar's future-plan section.
- **A month-grid calendar.**
