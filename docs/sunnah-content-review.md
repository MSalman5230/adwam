# Sunnah content read-through

The seven duʿāʾ are in [duas.yaml](../packages/content/duas.yaml), with their corresponding excerpts and source gradings in [hadith.yaml](../packages/content/evidence/hadith.yaml). The validator matches their Arabic and English against the same copies in [sources/sunnah.com](../packages/content/sources/sunnah.com). The owner approved the first catalogue on 22 November 2026.

| In Adwam | Source | Source note |
|---|---|---|
| New crescent | [Tirmidhī 3451](https://sunnah.com/tirmidhi:3451) | Da’if (Darussalam) |
| Laylat al-Qadr | [Tirmidhī 3513](https://sunnah.com/tirmidhi:3513) | Sahih (Darussalam) |
| Rain starts | [Bukhārī 1032](https://sunnah.com/bukhari:1032) | In Ṣaḥīḥ al-Bukhārī |
| Rain stops | [Bukhārī 846](https://sunnah.com/bukhari:846) | In Ṣaḥīḥ al-Bukhārī |
| Heavy rain | [Bukhārī 1014](https://sunnah.com/bukhari:1014) | In Ṣaḥīḥ al-Bukhārī |
| Thunder | [Al-Adab al-Mufrad 723](https://sunnah.com/adab:723) | Practice of ʿAbdullāh ibn al-Zubayr |
| Strong wind | [Muslim 899b](https://sunnah.com/muslim:899b) | In Ṣaḥīḥ Muslim |

- Compare the Laylat al-Qadr Arabic and transliteration. The Sunnah.com page includes *Karīm*, which the English marks in brackets. The prototype's transliteration omits it.
- Compare the rain-start Arabic and transliteration. Bukhārī 1032's Arabic gives the request without an opening *Allāhumma*. Its English renders it as an invocation and the prototype's transliteration starts with *Allāhumma*.
- The English for rain stopping appears within a longer sentence. The excerpt uses the published words about what the rain was due to.
- Sunnah.com allows individual hadith or selections to be reproduced for teaching. The source copies keep the page attribution where an individual translator was absent. [Sunnah.com reproduction guidance](https://sunnah.com/about)

## Remaining hadith

[Hadith evidence](../packages/content/evidence/hadith.yaml) now lists all 70 browser records with the Arabic and English shown on the source page, its attribution, and any displayed grade. The reminder YAML files use the evidence IDs. Material cited for the calendar rules and future reminders stays available for review alongside the current catalog.

- The two number aliases use the reference displayed by Sunnah.com. Book 13, Hadith 18 is Bukhārī 969, and Book 14, Hadith 125 is Abū Dāwūd 2437. The original browser URLs remain on the evidence entries.
- Muwaṭṭaʾ Mālik 56/26 records the practice of ʿĀmir ibn ʿAbdullāh ibn al-Zubayr, a Successor. Al-Adab al-Mufrad 723 records the practice of ʿAbdullāh ibn al-Zubayr.
- Muslim 1141b gives additional wording for the preceding narration. Check its placement and context before using it as a standalone excerpt.
- Read each Arabic and English excerpt together. Some browser pages render a shorter Arabic body while the English includes surrounding narration. Select corresponding portions from the saved copies before approving those pairs.

## Qurʾan and other sources

The owner confirmed written permission for the Quran.com text and The Clear Quran translation on 22 November 2026. The four verse entries contain the Uthmani Arabic, Dr. Mustafa Khattab's English translation, the translation credit and the direct verse link. The validator checks the text against the script-copied files. [Qurʾan evidence](../packages/content/evidence/quran.yaml) · [Quran.com source copies](../packages/content/sources/quran.com)

The owner approved the copied text for 2:185, 2:203 and 9:36 in the current reminders. The copy of 24:61 is kept for a future reminder. The chapter reading links go directly to Quran.com.

[Fatwa and book references](../packages/content/evidence/other.yaml) include seven existing Wayback links and four browser copies. The archive filenames in the YAML point to the four private copies. The Bin Bāz reference about ʿĀshūrāʾ uses the full source URL, which opens the relevant fatwa.
