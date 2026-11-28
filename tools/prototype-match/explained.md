# Differences from the prototype

## Prayer times

The tests compare 2026 prayer times in London, Oslo, Jakarta, Toronto and Cape Town, with the same calculation method on both sides. D7's Singapore suggestion for Jakarta applies when the app chooses a default method.

Adhan calculates standard ʿAṣr three minutes later than the prototype in Oslo on 15, 18, 22, 28 and 29 January and 10 February. The prototype uses one pass of a compact solar calculation. Adhan interpolates the Sun's position while solving for the afternoon shadow length, which affects the result when the winter Sun is low. All other comparisons fall within two minutes.

The angle-based rule applies to the standard calculation methods. Adhan's Moonsighting Committee method retains its seasonal adjustments. If the Sun fails to rise or set, Adhan estimates the anchors using its nearest-latitude fallback.

## Calendar and screen data

`pnpm --filter @adwam/core test test/prototype-match.test.ts --reporter=verbose --disableConsoleIntercept` compares the dated occurrence windows, Today cards, Coming up membership, Upcoming ranges and scheduled calendar pushes across 1448 and 1449 AH in London. It also samples Fridays, Ramadan and Dhul-Ḥijjah in the four other test cities. Set `ADWAM_PROTOTYPE_VERBOSE=1` to print each explained difference. Unexplained differences fail the test and always print.

- **Eclipses.** The prototype does not calculate eclipses. Core lists visible eclipses on Today and Upcoming and schedules pushes when allowed. An eclipse can take one of the three Coming up slots. The comparison rechecks Coming up without eclipse data before it accepts the displaced row. The underlying eclipse windows have separate NASA contact checks.
- **Prayer times.** The app builds the prayer-time reminder in code rather than reading it from the content catalogue, while the prototype lists it among its items. The comparison adds core's `prayerReminder` entry, with the English copy, to core's catalogue and sets it to Push on both sides, so each prayer's window, Today card and push are compared too.
- **Stable IDs.** The comparison maps the prototype's camelCase Sunnah IDs to the released lowercase IDs. Tick and push keys have separate contract tests. The plan uses calendar choices and times shared by both engines. Tests for quiet hours, the al-Kahf fallback and yearly uḍḥiyah choices cover those changes separately.
