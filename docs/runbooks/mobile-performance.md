# Android performance measurements

## Bundled size

| Item | Bytes |
| --- | ---: |
| Signed Android Preview APK for build 1128f338 | 120,071,703 |
| Generated `content.json` for version 2026.11.21 | 92,485 |
| Bundled GeoNames city list | 2,100,727 |

The Preview APK contains four Android ABIs. Use a new measurement for the release bundle and the download served to the phone. [Preview build](https://expo.dev/accounts/msalman5230/projects/adwam/builds/1128f338-3ad3-445f-b8cc-b86bc4b8fd25).

## Emulator result

A bundled development APK on the Android 16 Pixel emulator used the London schedule and ran in airplane mode. The measurements used the elapsed time from an Android launch marker to Today’s layout, and the elapsed time from the start of notification reconciliation through the Android scheduling calls.

| Scenario | Today layout | Reconcile notifications |
| --- | ---: | ---: |
| First measured launch that added 35 notifications | 4,566 ms | 1,314 ms |
| Four subsequent process restarts with those 35 notifications already scheduled | 1,489–1,728 ms | 225–439 ms |

The calendar planner took 67–82 ms on these five launches. The first launch and full schedule rebuild exceeded the two-second and half-second targets. The Milestone 6.4 acceptance test still requires measurements on the low-end test phone.

For that phone, record the model, Android version, signed build ID, five launch measurements and the result of adding the full schedule. Use the same city, notification preset and airplane mode for repeat runs.

## Android startup fonts

Two local x86-64 development APKs used release builds on the same Android 16 emulator in airplane mode. Each APK was installed twice for three process launches at a time. The test kept the setup state and measured from an Android launch marker to Today’s layout.

| Font loading | Median startup (6 launches) | Startup range | APK bytes |
| --- | ---: | ---: | ---: |
| JavaScript at startup | 3,899 ms | 2,136–6,487 ms | 59,409,266 |
| Embedded in the Android build | 3,378 ms | 1,934–4,977 ms | 59,311,501 |

The emulator found all ten embedded font families at startup. The median improved by 521 ms in this run and still exceeded the two-second target. This comparison did not measure a full notification rebuild.
