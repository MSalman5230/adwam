# Sunnah content format

This is how Adwam stores each Sunnah, its timing, its duʿāʾ and the evidence behind it, and how that content reaches phones. The app, the server and the published calendar all read from these files. To add a Sunnah later, you add an entry here. Code changes are needed only when its timing needs something new.

[sunnah-reminder-calendar.md](sunnah-reminder-calendar.md) holds the first set of Sunnahs. In milestone 1 its content, plus the Arabic and wording from [mobile-app-ui.html](mobile-app-ui.html), moves into these files. From then on, the calendar's tables are generated from the files, so edits go to the files, not the Markdown.

## Why a few YAML files

| Option | Verdict |
|---|---|
| Markdown tables, as now | Fine to read, but a table cell can't hold Arabic text, several sources with gradings, timing rules and notification wording without becoming unreadable. Parsing them would be fragile. |
| JSON | Strict, and it's what the app reads. But it's hard to write by hand: Arabic and long text need escaped quotes and newlines, and JSON allows no comments. The build turns the YAML into JSON for the app. |
| One YAML file for everything | Simple, but with the Arabic evidence it starts at about 2,000 lines and grows with every Sunnah, which makes it hard to find things and to review changes. |
| One YAML file per Sunnah | Scales to hundreds of Sunnahs and many editors, but means hundreds of small files. More than one developer needs. |
| A database or content management system | Easy to edit, but changes skip code review, lose their history and can ship apart from the code that reads them. |
| **A few YAML files: one per calendar section, plus duʿāʾ and evidence** | **Chosen.** They mirror the calendar's sections, each stays a few hundred lines, and every change goes through a pull request with full history. Splitting or merging files later changes nothing in the app, because the build combines them into one JSON file. |

## Folder layout

```
packages/content/
  sunnah/
    weekly.yaml
    monthly.yaml
    yearly.yaml
    weather.yaml        rain, wind, thunder and eclipses
    disputed.yaml
    future.yaml         not shipped yet, such as leaving home
    excluded.yaml       kept to record why each one is left out
  duas.yaml             every duʿāʾ, shared by any Sunnah that uses it
  evidence/             every source, shared
    hadith.yaml
    quran.yaml
    other.yaml          fatwas and books
  collections.yaml      hadith collections: names and link patterns
  sources/              the sunnah.com and Quran.com texts the evidence quotes, copied by script
  messages/en.json      UI wording, separate from Sunnah content
  schema/               the rules each file must follow
  scripts/              check, build and generate
```

**Why duʿāʾ and evidence are kept apart from the Sunnahs.** The same source often supports several Sunnahs. Muslim 1162b backs both ʿĀshūrāʾ and ʿArafah. Keeping each source in one place means its Arabic text, grading and link are entered, checked and corrected once.

## A Sunnah entry

Each section file is a list of entries. This is the ʿArafah fast in `sunnah/yearly.yaml`:

```yaml
- id: arafah                  # permanent; ticks are saved under it
  status: published           # draft, review, published, retired, future or excluded
  month: dhul-hijjah          # orders it on the Reminders screen
  tier: push                  # push or inapp, from the calendar

  title: ʿArafah fast
  short: Fast, and make long duʿāʾ in the afternoon.
  what:
    - Fast. It is reported to expiate the previous and coming year.
    - Make long duʿāʾ, especially in the afternoon. Pilgrims at ʿArafah do not fast.
  when: 9 Dhul-Ḥijjah.
  pushNote: A push on the evening of the 8th for the fast, and mid-afternoon on the 9th for duʿāʾ.

  notes: []                   # grading notes and differences of opinion, shown first under Sources
  evidence: [muslim-1162b, tirmidhi-3585, bukhari-1988]
  duas: []

  occurrences:
    - key: fast
      on: { hijri: { month: dhul-hijjah, day: 9 } }
      window: fast
      fast: { priority: 6, also: the ʿArafah fast }
      push:
        at: { prayer: isha, plus: 15m, day: -1 }
        title: Tomorrow is the day of ʿArafah
        body: Fast it if you can. Takbīr after each prayer starts at Fajr.
    - key: dua
      title: ʿArafah afternoon
      short: Make long duʿāʾ this afternoon.
      on: { hijri: { month: dhul-hijjah, day: 9 } }
      window: { from: { prayer: dhuhr, plus: 2h }, to: { prayer: maghrib } }
      card: false             # the fast card already covers the day
      push:
        at: { prayer: dhuhr, plus: 150m }
        title: ʿArafah afternoon
        body: Make long duʿāʾ until Maghrib.

  reviewed: { by: <reviewer's name>, on: <date> }
```

| Field | What it holds |
|---|---|
| `id` | A short, lowercase ID. It never changes once released, and it is never reused, because users' ticks and choices are saved under it. |
| `status` | Only `published` Sunnahs ship in the app. `future` and `excluded` entries fill the calendar's future-plan and left-out sections. |
| `month`, `tier` | Where the Sunnah sits on the Reminders screen, and its default level. Its group comes from the file it's in. |
| `title`, `short`, `what`, `when`, `pushNote` | The text on cards and the detail screen. |
| `notes` | Grading notes and differences of opinion, in full. |
| `evidence`, `duas` | IDs from the evidence and duʿāʾ files, in the order the detail screen shows them. |
| `occurrences` | When it shows and when it pushes. See [Timing](#timing). |
| `reviewed` | Who approved this version, and when. Required to publish. |

## Timing

Each occurrence says which days it falls on, when its card shows, and when it pushes, using a fixed vocabulary that the engine understands. The prototype's `occsForDay()` code becomes data.

| Field | Values | Example |
|---|---|---|
| `on` | Which days: a weekday, a Hijri date or range, the last day of a month, a weather event or an eclipse | `{ weekday: [mon, thu] }`, `{ hijri: { month: ramadan, day: 20-last } }`, `{ weather: rain-start }` |
| A time point | A prayer (`fajr`, `sunrise`, `dhuhr`, `jumuah`, `asr`, `maghrib`, `isha`), moved by `plus` or `minus` and by `day` | `{ prayer: isha, plus: 15m, day: -1 }` |
| `latest`, `earliest` | The later or earlier of two time points | `{ latest: [{ prayer: asr }, { prayer: jumuah, plus: 90m }] }` |
| `window` | When the card shows. Either `from` and `to` time points, or a preset. | `fast`, `hijri-day`, `night` |
| `push` | When to notify, and its title, body and buttons | as in the example |
| `check` | The tick: `done`, `fast`, or none | `done` |
| `card`, `upcoming` | Set to `false` to leave the occurrence off Today or Upcoming | `card: false` |
| `banner` | A season banner, with a rank so the most specific one wins | `{ title: The last ten nights, rank: 1 }` |
| `rules` | Named behaviours the engine implements | `requires-udhiyah` |
| `tickScope` | A Done tick can count once per civil date, Hijri month or Hijri year. The default is the civil date. | `hijri-month` for the crescent |
| `upcomingGroup` | Combines occurrences in the same calendar period into a single Coming up and Upcoming row. An optional title names the row. | `{ key: white-days, title: White Days }` |
| `marker` | Marks a day in Upcoming. Set `card: false` to show the marker without a Today card. | `no-fasting` |
| `startAnchor`, `endAnchor`, `countdown` | Wording for a start, an end, or the time left until Jumuʿah. | `startAnchor: all-day`, `endAnchor: maghrib`, `countdown: jumuah` |
| `coming` | Set to `false` to leave an occurrence out of Coming up. | The make-up tracker |
| `fast.reason` | `specific`, `habit`, or `makeup`. Leaving it blank means a voluntary fast with no separate reason. | `habit` for Monday and Thursday |
| `fast.borrowPush` | Allows a winning fast without its own push to borrow one from a lower-priority fast. Defaults to allowed. | White Days |

A Hijri selector can cover several months and exclude others with `excludeMonths`. Use `nextHijri` for an evening leading into a matching date. A push may have its own `on` selector, for example to notify only on the first day of a range. It can set `quiet` to `advance`, `delay` or `drop`. For weather and eclipses, a time point can name the event's `start` or `end`. Use `if`, `then` and `otherwise` to choose a time point from a calendar selector, such as ending at Eid prayer only on the last day of Ramadan.

Friday preparation has `combined` title and body wording for its joint reminder with al-Kahf.

Window presets:

| Preset | From | To |
|---|---|---|
| `hijri-day` | Maghrib the evening before | Maghrib |
| `fast` | Maghrib the evening before | Maghrib. Until Fajr the card says when to take suḥūr and has no tick. |
| `night` | Maghrib | The next Fajr |
| `daytime` | Fajr | Maghrib |

Some behaviour is too specific for the vocabulary, so the engine implements it in code, with tests, and a Sunnah opts in by name:

| Rule | Used by |
|---|---|
| One fasting card a day, the highest `priority` wins, the others become an "Also" line | Every fast |
| No fasting on forbidden days: occurrences on the Eids and the Tashrīq days are skipped | Every fast |
| Fasts with their own reason are allowed on a Friday | Every fast in version 1. See [below](#the-friday-rule). |
| `requires-udhiyah` | Hair and nails |
| `tracker-white-days`, `tracker-shawwal`, `tracker-makeup` | White Days, six Shawwāl fasts, make-up fasts |
| `stop-after-six` | Six Shawwāl fasts |
| `combine-into-friday-push` | al-Kahf, which joins the Friday preparation push unless ticked first |
| `follow-makeup-season` | The make-up tracker's visibility follows the Shaʿbān and Shawwāl reminder choices |

A new Sunnah needs code only when its timing needs a new rule or a new kind of `on`. That code goes in `packages/core`, with tests, in the same pull request as the content.

### The Friday rule

The owner confirmed on 21 November 2026 that a fast with its own reason may fall on a Friday: ʿĀshūrāʾ, ʿArafah, a White Day, a Shawwāl fast or a make-up fast. The rule against fasting only because it is Friday applies to a voluntary fast with no other reason. No version 1 Sunnah prompts one, so the engine keeps the rule as a safeguard for Sunnahs added later. The calendar's Friday line should name the Shawwāl and make-up fasts too.

## Duʿāʾ

Each entry in `duas.yaml` looks like this:

```yaml
- id: rain-beneficial
  ar: اللَّهُمَّ صَيِّبًا نَافِعًا
  tr: Allāhumma ṣayyiban nāfiʿan
  en: O Allah, make it beneficial rain.
  evidence: [bukhari-1032]
  source: bukhari-1032        # the Arabic is cut from this hadith's stored sunnah.com text
  reviewed: { by: <reviewer's name>, on: <date> }
```

- `ar` is the Arabic with full vowel marks (tashkīl). `tr` is the transliteration. `en` is the meaning.
- A Sunnah shows its duʿāʾ on the detail screen. An occurrence can also show the transliteration on its card, as rain and Laylat al-Qadr do, with `inlineDua: rain-beneficial`.
- `ar` is cut from the stored copy of the hadith named in `source`, and `en` from sunnah.com's English of the same words. The check fails if either isn't an exact part of that copy. The prototype's Arabic for the seven duʿāʾ was entered during design, so the copied text replaces it wherever the two differ.

## Evidence

Every source a Sunnah cites gets an entry. Hadith and Qurʾan entries hold the relevant words in Arabic and English, as sunnah.com and Quran.com show them, so the detail screen can show the evidence itself, not only a link.

**Where the text comes from.** Source copies keep the Arabic and English, the URL, the date and the translator's name when the page credits one. For the initial Sunnah.com collection, the owner requested a one-time browser capture. Run `node packages/content/scripts/fetch-sunnah.ts <capture-directory>` from the repository root to import those saved JSON records. It validates the input before writing and preserves the captured words in NFC. When a page omits an individual translator, use “English translation via Sunnah.com” as attribution to the source. The excerpts and duʿāʾ are cut from these copies. An API key will allow later updates through the Sunnah.com API.

### Hadith

An entry in `evidence/hadith.yaml`:

```yaml
- id: muslim-1162b
  collection: muslim          # from collections.yaml, giving the label "Muslim 1162b"
  number: 1162b
  url: https://sunnah.com/muslim:1162b
  from: prophet               # prophet, or companion for a Companion's own practice
  narrator: Abū Qatādah al-Anṣārī
  grading:
    - { by: Muslim, grade: ṣaḥīḥ, note: In his Ṣaḥīḥ }
  excerpt:
    ar: <the relevant words in Arabic, cut from the stored sunnah.com copy>
    en: <the same words in sunnah.com's English>
    partial: true             # true when only part of the hadith is quoted
  textSource:
    site: sunnah.com
    fetched: <date the copy was made>
    translator: <the English translation's credit, as sunnah.com gives it>
  reviewed: { by: <reviewer's name>, on: <date> }
```

`grading` is a list, because scholars can differ. The new-crescent hadith shows why:

```yaml
  grading:
    - { by: al-Tirmidhī, grade: ḥasan gharīb }
    - { by: Darussalam edition, grade: ḍaʿīf, note: Its chain is weak. }
```

The thunder duʿāʾ's source uses `from: companion`, because it records ʿAbdullāh ibn al-Zubayr's practice, not a saying of the Prophet ﷺ.

### Qurʾan

An entry in `evidence/quran.yaml`:

```yaml
- id: quran-2-185
  surah: 2
  ayah: 185                   # or a range, such as 185-186
  url: https://quran.com/2/185
  excerpt:
    ar: <the verse in Uthmani script, cut from the stored Quran.com copy>
    en: <the same verse in the chosen English translation on Quran.com>
    partial: true
  textSource:
    site: quran.com
    fetched: <date the copy was made>
    translator: <the translation's name, such as The Clear Quran by Dr. Mustafa Khattab>
  reviewed: { by: <reviewer's name>, on: <date> }
```

### Fatwas and books

Entries in `evidence/other.yaml` have no excerpt. They carry a summary in Adwam's own words and an archived copy of the link, because fatwa sites move pages.

```yaml
- id: dar-al-ifta-en-22447
  type: fatwa
  publisher: Dār al-Iftāʾ al-Miṣriyyah
  title: Observing voluntary fasts solely in Rajab and Shaʿbān
  language: en
  url: https://www.dar-alifta.org/en/fatwa/details/22447/observing-voluntary-fasts-solely-in-rajab-and-sha%E2%80%98ban
  archive: <Wayback Machine copy of the page>
  summary: <one sentence on what it rules, in Adwam's words>
  reviewed: { by: <reviewer's name>, on: <date> }
```

A `book` entry names the author, the title, a volume and page locator, and a link if one exists. al-Shāfiʿī's *al-Umm*, cited for al-Kahf, is a book.

### Collections

```yaml
# packages/content/collections.yaml
bukhari:  { name: Ṣaḥīḥ al-Bukhārī, short: Bukhārī, url: "https://sunnah.com/bukhari:{number}" }
muslim:   { name: Ṣaḥīḥ Muslim, short: Muslim, url: "https://sunnah.com/muslim:{number}" }
tirmidhi: { name: Jāmiʿ al-Tirmidhī, short: Tirmidhī, url: "https://sunnah.com/tirmidhi:{number}" }
```

A hadith entry's label and link come from its collection. An entry can set its own `url` when sunnah.com uses a different address, as it does for Bukhārī 969.

## How the detail screen shows evidence

The prototype shows expandable evidence rows with placeholder text. The app fills those rows from the validated content.

1. **Notes come first,** as now: grading notes and differences of opinion, in full.
2. **Each source is a row** with its label and its grade, such as "Muslim 1162b · ṣaḥīḥ".
3. **Tapping a hadith or Qurʾan row expands it** to show the Arabic excerpt in Amiri, right to left, then the English with its translator's credit, the narrator, and "Open on sunnah.com" or "Open on Quran.com".
4. **Fatwa and book rows** show the publisher or author, the summary and the link.
5. **Evidence works offline.** Only the links need a connection.

## How content reaches phones

**The content is built into the app. Phones don't fetch it from the server.**

1. **The build combines** every YAML file into one `content.json`, about 100–200 KB including the Arabic.
2. **It ships inside the app's JavaScript bundle.** A freshly installed app has every Sunnah, duʿāʾ and source from its first launch, with no network.
3. **Content fixes ship as over-the-air updates.** A content release publishes a new JavaScript bundle through Expo's update service, with no store review.
   - The phone checks for an update at launch and in its background task.
   - It downloads the update quietly, and uses it from the next launch.
   - The app then reschedules its notifications, so their wording updates too.
4. **The server gets the same file** when its Edge Functions are deployed. It needs it for the weather push wording. The database holds no content.
5. **The user's own data is kept apart from the content.** Content is read-only inside the bundle. Reminder choices, ticks and trackers live in the phone's storage under each Sunnah's ID. An update never overwrites them, which is also why IDs never change.

Why build it in instead of fetching it live:

| | Built in, updated over the air (chosen) | Fetched from the server |
|---|---|---|
| Offline and first launch | Works | Needs the network the first time, so a built-in copy is needed anyway |
| Content and engine match | Always, because they ship in the same bundle | An old app could receive a timing field its engine can't read, so every fetch needs version checks |
| Which content a phone has | One known version, shown in About and in problem reports | Could change at any moment |
| How fast a fix arrives | Minutes to publish, then the phone's next launch after it downloads | At the next fetch |
| Mistakes | Every change is reviewed first, and a bad update can be rolled back | A wrong database edit reaches everyone at once |
| Cost | Expo's free update allowance, then a paid plan or self-hosted updates | Supabase reads and storage |

Code fixes need over-the-air updates anyway, so content uses the same path instead of adding a second update system.

## Text rules

The check script enforces these, so mistakes fail the build instead of reaching users.

- **Unicode.** Files are UTF-8, normalised to NFC.
- **Transliteration.** ʿayn is `ʿ` (U+02BF) and hamzah is `ʾ` (U+02BE), with macrons for long vowels. Straight or curly apostrophes inside transliterated words fail the check.
- **ﷺ** is stored as the single character U+FDFA, after a space. The app keeps it with the word before it and draws it in Amiri.
- **Arabic** is kept exactly as sunnah.com or Quran.com gives it, apart from NFC normalisation, and the check never corrects it. Quran.com's Uthmani text keeps its own marks, including the tatweel (ـ) it uses, as in verse 2:185.
- **Never from memory.** The Arabic of a hadith, verse or duʿāʾ is copied by script from sunnah.com or Quran.com, never typed from memory or produced by an AI. The check confirms each excerpt is an exact part of its stored copy, and a reviewer checks it before publishing.

## Rights and credit

The repository is public, so everything in it is published.

- **Hadith and Qurʾan text, Arabic and English, is quoted from sunnah.com and Quran.com.** The owner decided this on 21 November 2026. `textSource` records the site, the date and the translator for every excerpt.
- **Credit.** The detail screen shows each translation's credit under its English, and About credits sunnah.com, Quran.com and the translators.
- **If a rights holder objects.** Most English translations belong to their translators or publishers. If one objects, the affected entries switch to Adwam's own rendering, reviewed, in a content update.
- **Fatwa sites** are linked, not copied. A fatwa's own text isn't stored, only a summary in Adwam's words. Sources on neither sunnah.com nor Quran.com, such as al-Bayhaqī on hadithweb.com and al-Shāfiʿī's *al-Umm*, are book entries treated the same way.

## Review and versions

- **Every published entry names its reviewer and date.** The owner is the reviewer. During development, content changes merge without waiting for review: entries stay in `review`, and test builds show them. Before the production release, the owner reads every entry and the agent marks it published.
- **The content version** is the release date, such as `2026.11.21`. About and Report a problem show it.
- **Retired Sunnahs keep their entries** with `status: retired`, so their IDs are never reused.

## What the build produces

The check runs on every pull request. It fails on:

- an unknown evidence or duʿāʾ ID, or a duplicate ID
- a published entry with no reviewer
- a duʿāʾ, or hadith or Qurʾan evidence, with no Arabic
- a Push Sunnah with no push wording
- a timing field or rule the engine doesn't know
- any break of the text rules above

The build then writes:

| Output | Used by |
|---|---|
| `dist/content.json`: published Sunnahs, duʿāʾ, evidence and collections, with the version | Built into the app, and into the server's Edge Functions for weather push wording |
| `dist/schema.json` | Code editors, which check the YAML as you type. Each file points to its shape, such as `../dist/schema.json#/properties/sunnahs`. |
| The tables in [sunnah-reminder-calendar.md](sunnah-reminder-calendar.md) | People reading the calendar on GitHub. CI fails if the committed file is out of date. |

## Adding a Sunnah

1. **Copy the closest existing entry** into the right section file, with `status: draft` and a new ID.
2. **Add or reuse evidence and duʿāʾ entries.** Run the fetch scripts for any new hadith or verse, then cut the excerpt from the stored copy.
3. **Run the check** and fix what it reports.
4. **If its timing doesn't fit** the vocabulary, add a rule in `packages/core` with tests.
5. **Open a pull request.** The reviewer checks the text, the Arabic and the gradings, then sets `status: published` and `reviewed`.
6. **Merge and tag a content release.** It reaches phones as an over-the-air update.

## Translations, later

Translations will sit in overlay files, such as `i18n/ar/sunnah/yearly.yaml`, holding only the text fields of each entry. Arabic excerpts and duʿāʾ are the same in every language. The build fails if a translation is missing a field that English has.
