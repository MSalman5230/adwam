# Milestone 0 risk tests

The Android test screen is on the [spike-m0-android branch](https://github.com/MSalman5230/adwam/tree/spike-m0-android). Install the [test APK](https://expo.dev/accounts/msalman5230/projects/adwam/builds/131f92ec-383b-485e-858e-3d4ffcc5d6c0) and open **Android risk tests**. Use the Pixel emulator for the smoke run and record the model and Android version for each real phone.

| Risk | Evidence | Decision |
|---|---|---|
| Done and Later with the app closed | On the Pixel 6 emulator, Done saved the test tick and scheduled a replacement after the app process was killed. Later scheduled a copy one hour ahead. The launcher stayed in front for both actions. | Keep Expo Notifications for the phone tests. Choose the local notification library after the physical-device results. |
| Approximate notification delay | One short emulator sample registered about 48 seconds late. The test app logs the Android posting time for 20 samples spanning 1–48 hours. Overnight phone runs are pending. | Compare delays with the 15-minute threshold before choosing the timing policy. |
| Restart and update | The emulator had 151 active Adwam alarms before reboot and none after boot and unlock. Installing the development APK over the existing app restored all 151 without opening it. This verified APK replacement at the same version code. | Keep launch resync. Verify boot restoration and delivery after a version upgrade on real phones. |
| 150 pending notifications | The Pixel 6 emulator accepted and listed all 150 over 60 days. | Keep the 150 cap for the phone tests. |
| Hermes and Intl | On the Pixel 6 emulator, date and time parts matched Node 24 across ten zones. Hermes had no `Intl.PluralRules` constructor. | Keep native date and time formatting. Test the FormatJS plural-rules polyfill when wiring app messages. Repeat the time zone check on real phones. |
| Background task | A forced Android WorkManager run on the emulator read the value `42` from MMKV into Zustand while Adwam was in the background. Expo rejected the update check in the development build. | Measure the 12-hour interval over three days and check background updates in the preview build. |
| Local Android build | JDK 21 and Android SDK 37 built and installed the development app on the Pixel 6 emulator. It signed in anonymously to local Supabase and JavaScript edits applied through Metro. The original workspace also compiled after switching to Ninja 1.12.1. | Keep JDK 21. Use Ninja with Windows long-path support. |

## Windows native build

The Ninja bundled with Android SDK CMake 3.22.1 hit the Windows path limit in Sentry and generated Gesture Handler code. The fix was to copy SDK CMake 3.22.1 to a scratch directory, replace `bin/ninja.exe` in the copy with Ninja 1.12.1, and set `cmake.dir` in the ignored `apps/mobile/android/local.properties` to that copy. [Ninja 1.12.1 release](https://github.com/ninja-build/ninja/releases/tag/v1.12.1)

## Phone procedure

For each test phone, note the model, Android version, battery settings and APK version code. Keep the log from **Inspect pending and posted notifications**.

1. Use **Schedule Done and Later tests** and allow notifications. Remove the app from Recents. When the first notification arrives, press Done. Press Later on the second. Observe whether the app opens, then reopen it and check the log for the saved Done and both replacement schedules.
2. Use **Schedule 20 overnight samples**. Leave the phone idle with the screen off overnight. Leave the test notifications in the shade until the log has recorded their posting times. Collect all 20 results, including any that did not arrive.
3. Schedule a fresh group of samples, reboot while they are still pending, and check whether they arrive without opening the app. Repeat with an APK update that preserves the app's data.
4. Use **Schedule 150 over 60 days** and check the reported pending count. Use **Compare Intl with Node** and record the result. The first APK can show a generic constructor error when Hermes lacks `Intl.PluralRules`.
5. Use **Register background task** once. Leave it registered for three days. Each day, record the timestamp and probe value from the background log. If an update check is recorded, include its result.
