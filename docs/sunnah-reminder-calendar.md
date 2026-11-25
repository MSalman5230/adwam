# Sunnah reminders for the app

This list keeps Sunnah practices tied to a **specific day, date or time of year**, plus events the app can **detect**, such as rain, wind and eclipses. Reminders for leaving and coming home and for journeys are a future plan. Hajj and ʿUmrah rites and most everyday habits are left out. Sources are Sunni hadith and fiqh.

The tables come from the YAML source files described in [sunnah-content-format.md](sunnah-content-format.md). After editing the YAML, run `pnpm --filter @adwam/content calendar` to update them.

## Two tiers

- **Push.** Important and easy to forget. The app sends a push notification and also shows the item in the app.
- **In-app.** Shown only when the user opens the app during the item's time window. No push.

The app's home screen shows everything active right now: Push items and In-app items together.

**Push budget:** about 4 a week, 1 a month and 12 a year from the calendar. Detected events add up to one weather push a day. Per-item on/off toggles will help users who find this too much.

**Dates:** a Hijri day begins at the **previous Maghrib**, so the "night of the 21st" starts at Maghrib on the 20th. Hijri dates differ by country and moon sighting, so let the user pick a calculation method and shift dates by ±1 day. [Bukhārī 1909](https://sunnah.com/bukhari:1909), [Muslim 1087](https://sunnah.com/muslim:1087)

## Weekly

<!-- calendar:weekly:start -->
| Reminder | Tier | Sunnah | Timing | Sources |
| --- | --- | --- | --- | --- |
| **Monday and Thursday fast** | **Push** | Voluntary fast. Deeds are presented on Mondays and Thursdays, and the Prophet ﷺ liked to be fasting when his were presented. | Every Monday and Thursday, Fajr to Maghrib. The card appears the evening before. A push the evening before, after ʿIshāʾ. | [Tirmidhī 747](https://sunnah.com/tirmidhi:747) |
| **Sūrat al-Kahf** | **Push** | Read Sūrat al-Kahf and send extra ṣalawāt on the Prophet ﷺ. Al-Shāfiʿī placed al-Kahf on Friday night or day. Scholars differ on the strength of the al-Kahf reports. | Thursday Maghrib to Friday Maghrib. A push on Friday morning with Friday preparation, or on its own when Friday preparation will not push. | [Sūrat al-Kahf](https://quran.com/18), [Sunan al-Kubrā](https://hadithweb.com/bayhaqi:5996), [Al-Umm](https://islamweb.net/ar/library/content/31/442/), [Abū Dāwūd 1047](https://sunnah.com/abudawud:1047) |
| **Friday Fajr: al-Sajdah and al-Insān** | In-app | Recite al-Sajdah and al-Insān in Fajr if you lead the prayer or pray it yourself. | Friday, before Fajr. | [Muslim 879a](https://sunnah.com/muslim:879a) |
| **Friday preparation** | **Push** | Ghusl, siwāk, clean clothes and, for men, fragrance. Walk if able, arrive early, and pray voluntary rakʿahs before the khuṭbah. Most jurists treat the ghusl as an emphasized Sunnah, and some consider it obligatory. | Friday morning until Jumuʿah. A push about 2 hours before Jumuʿah, combined with al-Kahf. | [Bukhārī 880](https://sunnah.com/bukhari:880), [Bukhārī 883](https://sunnah.com/bukhari:883), [Abū Dāwūd 345](https://sunnah.com/abudawud:345), [Tirmidhī 497](https://sunnah.com/tirmidhi:497) |
| **Four rakʿahs after Jumuʿah** | In-app | Pray four rakʿahs, or two at home as the Prophet ﷺ did. | From Jumuʿah until ʿAṣr. | [Muslim 881a](https://sunnah.com/muslim:881a), [Bukhārī 937](https://sunnah.com/bukhari:937) |
| **Last hour of Friday** | **Push** | Spend the last hour before Maghrib on Friday in duʿāʾ. Another report places the special hour between the imam sitting down and the end of the prayer. | Friday, from ʿAṣr to Maghrib. A push about 45 minutes before Maghrib. | [Abū Dāwūd 1048](https://sunnah.com/abudawud:1048), [Muslim 853](https://sunnah.com/muslim:853) |
<!-- calendar:weekly:end -->

## Monthly (Hijri)

<!-- calendar:monthly:start -->
| Reminder | Tier | Sunnah | Timing | Sources |
| --- | --- | --- | --- | --- |
| **Look for the new crescent** | In-app | Look for the new crescent after Maghrib and say the duʿāʾ when you see it. *Allāhumma ahlilhu ʿalaynā bil-yumni wal-īmān, was-salāmati wal-islām. Rabbī wa rabbuka Allāh.* Al-Tirmidhī called the report ḥasan gharīb. The Darussalam edition grades its chain weak. | From Maghrib on the 29th, and the 30th if the month continues. | [Tirmidhī 3451](https://sunnah.com/tirmidhi:3451) |
| **White Days fast** | **Push** | Fast three days. Any three days in the month also fulfill the practice, and a Monday or Thursday fast counts toward them. | The 13th, 14th and 15th of each Hijri month. In Dhul-Ḥijjah the 13th is a Tashrīq day, so the 14th, the 15th and one other day. A push on the evening of the 12th. | [Nasāʾī 2424](https://sunnah.com/nasai:2424), [Muslim 1160](https://sunnah.com/muslim:1160) |
<!-- calendar:monthly:end -->

## Yearly

<!-- calendar:yearly:start -->
| Reminder | Tier | Sunnah | Timing | Sources |
| --- | --- | --- | --- | --- |
| **Sacred months** | In-app | Increase good deeds and guard against wrongdoing in Muḥarram, Rajab, Dhul-Qaʿdah and Dhul-Ḥijjah. Some jurists encourage extra voluntary fasts in these months. The report that specifically calls for it is graded weak. | All of Muḥarram, Rajab, Dhul-Qaʿdah and Dhul-Ḥijjah, as a banner on Today. | [Qurʾan 9:36](https://quran.com/9/36), [Abū Dāwūd 2428](https://sunnah.com/abudawud:2428), [Observing voluntary fasts solely in Rajab and Shaʿbān](https://www.dar-alifta.org/en/fatwa/details/22447/observing-voluntary-fasts-solely-in-rajab-and-sha%E2%80%98ban) |
| **Muḥarram** | In-app | Fast often. It is the best month for voluntary fasting after Ramadan. | All of Muḥarram. | [Muslim 1163a](https://sunnah.com/muslim:1163a) |
| **ʿĀshūrāʾ fast** | **Push** | Fast both the 9th and 10th of Muḥarram. The ʿĀshūrāʾ fast is reported to expiate the previous year. If the 9th is missed, some jurists accept pairing the 10th with the 11th. | 9 and 10 Muḥarram. A planning card shows from 1 Muḥarram. Pushes on the evenings of the 8th and 9th. | [Muslim 1162b](https://sunnah.com/muslim:1162b), [Muslim 1134a](https://sunnah.com/muslim:1134a), [Fasting before or after ʿĀshūrāʾ](https://binbaz.org.sa/fatwas/22819/%D9%85%D8%A7-%D8%A7%D9%84%D8%A7%D9%81%D8%B6%D9%84-%D9%81%D9%8A-%D8%A7%D9%84%D8%B5%D9%88%D9%85-%D9%82%D8%A8%D9%84-%D8%B9%D8%A7%D8%B4%D9%88%D8%B1%D8%A7%D8%A1-%D9%88%D8%A8%D8%B9%D8%AF%D9%87) |
| **Shaʿbān** | **Push** | Fast often. It was the month the Prophet ﷺ fasted most outside Ramadan. It is also the last chance to make up missed Ramadan fasts, as ʿĀʾishah did. The make-up fasts are obligatory. | All of Shaʿbān, with a make-up tracker. A push on 1 Shaʿbān. | [Bukhārī 1969](https://sunnah.com/bukhari:1969), [Bukhārī 1950](https://sunnah.com/bukhari:1950) |
| **Ramadan, daily** | In-app | Take suḥūr shortly before Fajr. Break the fast promptly with fresh dates, then dried dates, then water. Offer ifṭār to someone fasting. Read more Qurʾan and give more charity. | Every day of Ramadan: a suḥūr card before Fajr and an ifṭār card at Maghrib. | [Bukhārī 1923](https://sunnah.com/bukhari:1923), [Bukhārī 1957](https://sunnah.com/bukhari:1957), [Abū Dāwūd 2356](https://sunnah.com/abudawud:2356), [Tirmidhī 807](https://sunnah.com/tirmidhi:807), [Bukhārī 6](https://sunnah.com/bukhari:6) |
| **Last ten nights** | **Push** | Laylat al-Qadr has started. Seek it every night until Ramadan ends. Increase night prayer, wake your household, and observe iʿtikāf if able. *Allāhumma innaka ʿafuwwun tuḥibbu al-ʿafwa faʿfu ʿannī*. The odd nights depend on when Ramadan began locally and how the nights are counted, so the app treats all ten the same. | From Maghrib on 20 Ramadan until Ramadan ends. An iʿtikāf planning card shows from the 18th. A push at Maghrib on the 20th. | [Tirmidhī 3513](https://sunnah.com/tirmidhi:3513), [Bukhārī 2017](https://sunnah.com/bukhari:2017), [Bukhārī 2021](https://sunnah.com/bukhari:2021), [Bukhārī 2024](https://sunnah.com/bukhari:2024), [Bukhārī 2026](https://sunnah.com/bukhari:2026) |
| **Zakāt al-fiṭr** | **Push** | Pay zakāt al-fiṭr before the Eid prayer. It is obligatory for those who qualify. | From 27 Ramadan until the Eid prayer. A push around 27 Ramadan. | [Bukhārī 1503](https://sunnah.com/bukhari:1503) |
| **Eid takbīr** | In-app | Say the Eid takbīr from sunset until the prayer, following your school’s timing. | From the Eid announcement until the prayer. | [Qurʾan 2:185](https://quran.com/2/185) |
| **Eid al-Fiṭr** | **Push** | Ghusl and best clothes. Eat an odd number of dates before leaving. Walk if practical and return by a different route. No fasting today. | 1 Shawwāl, Eid morning. A push after Fajr. | [Muwaṭṭaʾ Mālik 10/2](https://sunnah.com/urn/504320), [Bukhārī 953](https://sunnah.com/bukhari:953), [Tirmidhī 530](https://sunnah.com/tirmidhi:530), [Bukhārī 986](https://sunnah.com/bukhari:986) |
| **Six Shawwāl fasts** | **Push** | Fast six days in Shawwāl, together or spread out. Scholars differ on whether Ramadan make-up fasts must come first. | 2 to 30 Shawwāl, with a progress tracker. A push on 2 Shawwāl. Reminders stop once you log six. | [Muslim 1164a](https://sunnah.com/muslim:1164a), [Fasting six days of Shawwāl](https://www.dar-alifta.org/en/fatwa/details/6186/fasting-six-days-of-the-month-of-shawwal), [Making up Ramadan fasts before the six of Shawwāl](https://binbaz.org.sa/fatwas/12670/%D8%A7%D9%84%D9%85%D8%B4%D8%B1%D9%88%D8%B9-%D8%AA%D9%82%D8%AF%D9%8A%D9%85-%D8%A7%D9%84%D9%82%D8%B6%D8%A7%D8%A1-%D8%B9%D9%84%D9%89-%D8%B5%D9%88%D9%85-%D8%A7%D9%84%D8%B3%D8%AA) |
| **Hair and nails, if offering uḍḥiyah** | **Push** | If you are offering an uḍḥiyah, trim hair and nails before the month changes, then leave them until your sacrifice. Schools differ on whether this is binding or recommended. | 29 Dhul-Qaʿdah, then a reminder from 1 Dhul-Ḥijjah until the sacrifice. A push on the morning of the 29th, only if you answered Yes to the uḍḥiyah question. | [Muslim 1977g](https://sunnah.com/muslim:1977g), [Rulings of the uḍḥiyah in Islamic jurisprudence](https://aliftaa.jo/article-en/5972/Article.aspx?ArticleId=5997) |
| **First ten days of Dhul-Ḥijjah** | **Push** | The best days of the year for good deeds. Increase dhikr, takbīr and charity. Days 1 to 9 are open for voluntary fasting. | 1 to 10 Dhul-Ḥijjah, as a banner. A push on 1 Dhul-Ḥijjah. | [Bukhārī 969](https://sunnah.com/bukhari/13/18), [Abū Dāwūd 2437](https://sunnah.com/abudawud/14/125) |
| **ʿArafah fast** | **Push** | Fast. It is reported to expiate the previous and coming year. Make long duʿāʾ, especially in the afternoon. Pilgrims at ʿArafah do not fast. | 9 Dhul-Ḥijjah. A push on the evening of the 8th for the fast, and mid-afternoon on the 9th for duʿāʾ. | [Muslim 1162b](https://sunnah.com/muslim:1162b), [Tirmidhī 3585](https://sunnah.com/tirmidhi:3585), [Bukhārī 1988](https://sunnah.com/bukhari:1988) |
| **Eid al-Aḍḥā** | **Push** | Ghusl and best clothes. Eat nothing until after the prayer. Return by a different route. Offer the uḍḥiyah after the prayer, then eat from it and share it. | 10 Dhul-Ḥijjah, Eid morning. A push after Fajr. | [Tirmidhī 542](https://sunnah.com/tirmidhi:542), [Bukhārī 5546](https://sunnah.com/bukhari:5546), [Bukhārī 5569](https://sunnah.com/bukhari:5569) |
| **Takbīr after prayers** | In-app | Say takbīr after every obligatory prayer from Fajr on 9 Dhul-Ḥijjah to ʿAṣr on the 13th. Timings vary by school. 11 to 13 Dhul-Ḥijjah are the Tashrīq days of eating, drinking and remembering Allah. | Fajr 9 Dhul-Ḥijjah to ʿAṣr 13 Dhul-Ḥijjah. | [Qurʾan 2:203](https://quran.com/2/203), [Muslim 1141b](https://sunnah.com/muslim:1141b), [Questions about the takbīr of the two Eids](https://www.dar-alifta.org/ar/fatwa/details/14998/%D8%A3%D8%B3%D8%A6%D9%84%D8%A9-%D9%85%D8%AA%D9%86%D9%88%D8%B9%D8%A9-%D8%AD%D9%88%D9%84-%D8%A7%D9%84%D8%AA%D9%83%D8%A8%D9%8A%D8%B1-%D9%81%D9%8A-%D8%A7%D9%84%D8%B9%D9%8A%D8%AF%D9%8A%D9%86) |
| **Ramadan days to make up** | In-app | Missed Ramadan fasts are obligatory to make up. ʿĀʾishah made hers up in Shaʿbān. Log each one here. At zero, this card leaves Today. | All through Shaʿbān, and on the Shawwāl card. | [Bukhārī 1950](https://sunnah.com/bukhari:1950) |
<!-- calendar:yearly:end -->

## Detected events

The server detects weather events from forecasts. The phone calculates local eclipse visibility and timings offline.

<!-- calendar:weather:start -->
| Trigger | Tier | Sunnah | Detection and timing | Sources |
| --- | --- | --- | --- | --- |
| **Rain starts** | **Push** | Say the duʿāʾ for beneficial rain. The Prophet ﷺ also let some rain touch his skin. *Allāhumma ṣayyiban nāfiʿan*. | While it rains. A push only for the first rain after about 7 dry days. | [Bukhārī 1032](https://sunnah.com/bukhari:1032), [Muslim 898](https://sunnah.com/muslim:898) |
| **Rain stops** | In-app | Credit the rain to Allah rather than to the stars. *Muṭirnā bi-faḍlillāhi wa raḥmatih*. | For a few hours after the rain ends. | [Bukhārī 846](https://sunnah.com/bukhari:846) |
| **Heavy rain** | **Push** | Say the duʿāʾ for heavy rain. *Allāhumma ḥawālaynā wa lā ʿalaynā*. | When forecast rain is above about 7.6 mm an hour. A push when it starts. | [Bukhārī 1014](https://sunnah.com/bukhari:1014) |
| **Thunder** | In-app | Pause and say the words of ʿAbdullāh ibn al-Zubayr when you hear thunder. *Subḥāna alladhī yusabbiḥu al-raʿdu bi-ḥamdihi wal-malāʾikatu min khīfatih*. This is the practice of the Companion ʿAbdullāh ibn al-Zubayr, not a saying of the Prophet ﷺ. | During a thunderstorm. | [Al-Adab al-Mufrad 723](https://sunnah.com/adab:723), [Muwaṭṭaʾ Mālik 56/26](https://sunnah.com/malik/56/26) |
| **Strong wind or a storm** | **Push** | Don’t curse the wind. Ask for its good and seek refuge from its harm. When a storm cloud approached, the Prophet ﷺ would stop what he was doing and seek refuge from its harm. *Allāhumma innī asʾaluka khayrahā wa khayra mā fīhā wa khayra mā ursilat bih, wa aʿūdhu bika min sharrihā wa sharri mā fīhā wa sharri mā ursilat bih*. | When forecast gusts pass about 60 km/h. A push for gusts above about 75 km/h. | [Muslim 899b](https://sunnah.com/muslim:899b), [Abū Dāwūd 5097](https://sunnah.com/abudawud:5097), [Abū Dāwūd 5099](https://sunnah.com/abudawud:5099) |
| **Solar or lunar eclipse** | **Push** | Pray the eclipse prayer, make duʿāʾ, say takbīr and give charity. Some scholars tie the prayer to seeing the eclipse. The phone calculates the visible window for your location. | While an eclipse is visible from your area. A push at the start. | [Bukhārī 1044](https://sunnah.com/bukhari:1044) |
<!-- calendar:weather:end -->

**Detection notes**

- **Weather data.** The server uses Open-Meteo forecasts for rain, thunderstorm codes (WMO 95–99), wind gusts and cloud cover. Open-Meteo doesn’t provide official weather warnings, so heavy rain and strong wind use forecast thresholds. The server checks the approximate area the app saved the last time the user opened it, so no background location is needed.
- **Limits.** Send at most one weather push a day, never the same event twice, and nothing during the user’s quiet hours. Lunar eclipses often happen at night, so let the user choose whether eclipses override quiet hours.

## Future plan: location-based reminders

These need background location, which requires Google Play approval the app can’t get yet. The location notes below the table list what they need.

<!-- calendar:future:start -->
| Trigger | Tier | Sunnah | Detection and timing | Sources |
| --- | --- | --- | --- | --- |
| **Leaving home** | **Push** | Say *Bismillāh, tawakkaltu ʿalā Allāh, lā ḥawla wa lā quwwata illā billāh*. The hadith says whoever says it is told, “You are guided, defended and protected.” The Prophet ﷺ also said, on leaving his house, *Allāhumma innī aʿūdhu bika an aḍilla aw uḍalla, aw azilla aw uzalla, aw aẓlima aw uẓlama, aw ajhala aw yujhala ʿalayya*, seeking refuge from going astray, slipping, wronging or being wronged, and acting foolishly. | **Detect:** the user leaves the home radius. **Push:** on exit, with a “Starting a journey?” button that opens the travel duʿāʾ. | [Abū Dāwūd 5095](https://sunnah.com/abudawud:5095), [Abū Dāwūd 5094](https://sunnah.com/abudawud:5094), [Muslim 1342](https://sunnah.com/muslim:1342) |
| **Coming home** | **Push** | Say *Bismillāh* as you enter, greet your household with salām, and start with siwāk as the Prophet ﷺ did. A specific entering duʿāʾ, *Allāhumma innī asʾaluka khayra al-mawlaji wa khayra al-makhraj, bismillāhi walajnā wa bismillāhi kharajnā wa ʿalā Allāhi rabbinā tawakkalnā*, has a disputed chain. Al-Albānī graded it weak, and Ibn Bāz graded it ḥasan. | **Detect:** the user enters the home radius. **Push:** on entry, which happens just before they reach the door. | [Muslim 2018a](https://sunnah.com/muslim:2018a), [Qurʾan 24:61](https://quran.com/24/61), [Muslim 253b](https://sunnah.com/muslim:253b), [Abū Dāwūd 5096](https://sunnah.com/abudawud:5096), [Duʿāʾ for entering the house](https://islamqa.info/en/answers/222875) |
| **Starting a journey** | In-app | Say the travel duʿāʾ. | **Detect:** the user goes beyond a travel distance they set, defaulting to 80 km. Schools differ on what distance counts as travel. **In-app:** a journey card. The leaving-home push already offers the duʿāʾ at the door. | [Muslim 1342](https://sunnah.com/muslim:1342) |
| **Returning from a journey** | **Push** | Say *āyibūna tāʾibūna ʿābidūna li-rabbinā ḥāmidūn*, “returning, repenting, worshipping and praising our Lord.” Go first to the mosque and pray two rakʿahs. | **Detect:** after a journey, the user comes back within about 10 km of home. **Push:** at that point, before they reach home. The coming-home push follows on arrival. | [Muslim 1342](https://sunnah.com/muslim:1342), [Bukhārī 3088](https://sunnah.com/bukhari:3088) |
<!-- calendar:future:end -->

**Location notes**

- **Home location.** The user sets it on first launch, from their current position or a map pin, and can change it later.
- **Geofencing.** Use the phone’s built-in geofencing, region monitoring on iOS and the Geofencing API on Android, instead of polling GPS. It runs in the background with little battery cost but needs “Always” location permission.
- **Radius.** Use 150–200 m. Android’s guidance recommends at least 100–150 m, and indoor location is imprecise, so a smaller radius causes false alerts.
- **Cooldown.** Ignore a home crossing within about 30 minutes of the previous one, so GPS drift at the boundary or a quick step outside doesn’t send repeat pushes.
- **Permission.** On iOS, ask for “While Using” first, then “Always”. Google Play also requires its background location declaration, an in-app notice explaining the use, and a feature where location is central. Make these reminders opt-in.
- **Privacy.** The home location stays on the phone and is never sent to the server.
- **Building and testing.** Geofencing through `expo-location` and `expo-task-manager`. Test on the Android brands that stop background work.

## Fasting rules the app should respect

- **No fasting** on 1 Shawwāl, 10 Dhul-Ḥijjah, or 11–13 Dhul-Ḥijjah. [Bukhārī 1990](https://sunnah.com/bukhari:1990), [Muslim 1141b](https://sunnah.com/muslim:1141b)
- **White Days in Dhul-Ḥijjah.** The 13th is a Tashrīq day. Prompt the 14th, the 15th and one other day.
- **Friday.** Don’t prompt a voluntary fast chosen only because it is Friday. Pair it with Thursday or Saturday. An ʿĀshūrāʾ, ʿArafah, White Day, Shawwāl or make-up fast that falls on Friday is fine. [Bukhārī 1985](https://sunnah.com/bukhari:1985), [Muslim 1144b](https://sunnah.com/muslim:1144b)
- **Ramadan.** Skip Monday, Thursday and White Days reminders during Ramadan, when the Ramadan fast itself is obligatory.
- **Last day or two of Shaʿbān.** Don’t prompt a new voluntary fast unless it is a regular habit, such as Monday, or a make-up fast. [Bukhārī 1914](https://sunnah.com/bukhari:1914)

## Disputed, so off by default

If a user turns these on, show them In-app only.

<!-- calendar:disputed:start -->
- **Night of 15 Shaʿbān.** Scholars differ on the forgiveness reports for this night. The narration prescribing a special night prayer and daytime fast is graded fabricated. The daytime fast already falls under the White Days. [Ibn Mājah 1388](https://sunnah.com/ibnmajah:1388), [Ibn Mājah 1390](https://sunnah.com/ibnmajah:1390), [Observing the night of mid-Shaʿbān](https://www.dar-alifta.org/en/fatwa/details/663/celebrating-the-night-of-mid-shaban-and-other-religious-occasions)
- **Spending more on family on ʿĀshūrāʾ.** Spend more generously on your family on ʿĀshūrāʾ. The evidence is disputed. [Spending more on the family on ʿĀshūrāʾ](https://dar-alifta.org/ar/fatwa/details/21973/%D8%AD%D9%83%D9%85-%D8%A7%D9%84%D8%AA%D9%88%D8%B3%D8%B9%D8%A9-%D8%B9%D9%84%D9%89-%D8%A7%D9%84%D8%A3%D9%87%D9%84-%D9%8A%D9%88%D9%85-%D8%B9%D8%A7%D8%B4%D9%88%D8%B1%D8%A7%D8%A1)
<!-- calendar:disputed:end -->

## Left out of the app list

- **Events the app can’t detect reliably:** drought and the rain prayer (istisqāʾ), which a community holds together, the first fruit of the season, and choosing Thursday to set out on a journey.
- **Hajj, ʿUmrah and Madinah:** pilgrim rites at Minā and the Jamarāt, ʿUmrah in Ramadan or Dhul-Qaʿdah, and Saturday visits to Masjid Qubāʾ.
- **Not suited to a reminder:** Dāwūd’s alternate-day fasting, making up iʿtikāf in Shawwāl, Shawwāl marriages, Ṣalāt al-Tasbīḥ, the imam’s Jumuʿah recitations and the Eid-on-Friday concession.
- **Commemorations without an established Sunnah practice:** the Mawlid (12 Rabīʿ al-Awwal) and Isrāʾ and Miʿrāj (27 Rajab).

---

Research merged from four reviews by GPT‑6.2 Sol (max), Claude Opus 5.5 (xhigh), DeepSeek V4.1 Flash (max) and Muse Spark 1.3 Contributor (xhigh). [Weekly and monthly](t3-thread://v2/b3db411d-4b2d-410d-9999-0bb1f1175d75/thread:delegated-task:command%3Amcp%3A94716574-16ac-4af3-b577-96ed5c52dff4%3Adelegate-task%3Afad43186-7282-4003-bb3f-bb0f3ef0a5c6), [Ramadan and Hajj season](t3-thread://v2/b3db411d-4b2d-410d-9999-0bb1f1175d75/thread:delegated-task:command%3Amcp%3A94716574-16ac-4af3-b577-96ed5c52dff4%3Adelegate-task%3A6e0224ff-b721-4c53-a35e-813e1eab3624), [Overlooked seasonal Sunnah](t3-thread://v2/b3db411d-4b2d-410d-9999-0bb1f1175d75/thread:delegated-task:command%3Amcp%3A94716574-16ac-4af3-b577-96ed5c52dff4%3Adelegate-task%3A56d6a658-f6e3-454f-898a-201b2965f6e4), [Cross-check](t3-thread://v2/b3db411d-4b2d-410d-9999-0bb1f1175d75/thread:delegated-task:command%3Amcp%3A94716574-16ac-4af3-b577-96ed5c52dff4%3Adelegate-task%3A68812155-7a82-46f1-8533-72d4d5e25674)
