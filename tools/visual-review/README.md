# Milestone 3 visual review

Install a bundled Android development or preview APK on a disposable, English-language emulator. Use a phone-size viewport and set the Android font size to the default. The capture clears the selected test app before each theme.

From the repository root, run:

```sh
python tools/visual-review/capture.py --device emulator-5556 --chrome chromium --output visual-review
```

Use `--app com.msalman5230.adwam.preview` for the preview APK. The `--adb` and `--adb-port` flags select the SDK executable and server when they differ from the defaults.

Open `index.html` in the output directory to compare Android and the prototype. Keep the HTML and PNG files together when sharing the review.
