"""Capture Android and prototype screenshots for the Milestone 3 review."""

import argparse
import html
import json
import re
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MESSAGES = json.loads((ROOT / "packages/content/messages/en.json").read_text(encoding="utf-8"))
PROTOTYPE = (ROOT / "docs/mobile-app-ui.html").read_text(encoding="utf-8")
MOMENTS = {
    "fri-am": "fridayMorning",
    "fri-pm": "fridayRain",
    "tue": "quietTuesday",
    "white": "whiteDays",
    "shaban": "endOfShaban",
    "correction": "correction",
    "qadr": "lastTen",
    "shawwal": "shawwal",
    "dq": "dhulQadah",
}
SHEETS = ("city", "prayer", "jumuah", "hijri", "quiet", "pause", "udhiyah", "theme", "privacy")
SETUP = (
    ("setup-location", "location", 1),
    ("setup-hijri", "hijri", 2),
    ("setup-reminders", "reminders", 3),
    ("setup-notifications", "notifications", 4),
)


def message(path):
    value = MESSAGES
    for key in path.split("."):
        value = value[key]
    return value


class AndroidReview:
    def __init__(self, args):
        self.command = [args.adb, "-P", str(args.adb_port), "-s", args.device]
        self.app = args.app
        self.output = args.output
        dimensions = re.findall(r"(\d+)x(\d+)", self.run("shell", "wm", "size").decode())
        self.width, self.height = map(int, dimensions[-1])

    def run(self, *args):
        return subprocess.run([*self.command, *args], capture_output=True, check=True, timeout=35).stdout

    def link(self, route):
        self.run("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW",
                 "-d", f"adwam://{route}", "-p", self.app)

    def nodes(self):
        self.run("shell", "uiautomator", "dump", "/sdcard/adwam-visual-review.xml")
        xml = self.run("shell", "cat", "/sdcard/adwam-visual-review.xml")
        return ET.fromstring(xml).iter("node")

    def find(self, label, scroll=False):
        for _ in range(5):
            for node in self.nodes():
                if any((node.get(key) or "").replace("\u2011", "-") == label for key in ("text", "content-desc")):
                    return node
            if scroll:
                x = str(self.width // 2)
                self.run("shell", "input", "swipe", x, str(self.height * 4 // 5), x, str(self.height // 3), "260")
        raise RuntimeError(f"Cannot find {label!r}")

    def tap(self, label, scroll=False):
        node = self.find(label, scroll)
        x1, y1, x2, y2 = map(int, re.findall(r"\d+", node.attrib["bounds"]))
        self.run("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))

    def press_back(self):
        self.run("shell", "input", "keyevent", "4")

    def enter(self, label, value):
        self.tap(label)
        self.run("shell", "input", "keyevent", "123", *(["67"] * 12))
        self.run("shell", "input", "text", value)
        self.press_back()

    def screenshot(self, name, theme):
        (self.output / f"{name}-{theme}-android.png").write_bytes(self.run("exec-out", "screencap", "-p"))
        print(f"Captured {name} ({theme})", flush=True)

    def moment(self, name):
        self.link("debug/clock")
        self.tap(message(f"developerTools.moment.{MOMENTS[name]}"), scroll=True)
        self.link("today")
        self.find(message("navigation.today"))

    def start_setup(self, theme):
        self.run("shell", "pm", "clear", self.app)
        permission = "android.permission.POST_NOTIFICATIONS"
        self.run("shell", "pm", "revoke", self.app, permission)
        self.run("shell", "pm", "clear-permission-flags", self.app, permission, "user-set", "user-fixed")
        self.run("shell", "cmd", "uimode", "night", "yes" if theme == "dark" else "no")
        self.link("debug/clock")
        self.enter(message("developerTools.clock.date"), "2026-12-18")
        self.enter(message("developerTools.clock.time"), "11:30")
        self.tap(message("developerTools.clock.apply"))
        self.link("setup")

    def capture_setup(self, theme):
        self.start_setup(theme)
        for name, step, number in SETUP:
            self.find(message(f"setup.{step}.title"))
            self.screenshot(name, theme)
            if number == 1:
                self.tap(message("setup.location.pickCity"))
                self.find(message("sheet.city.title"))
                self.screenshot("setup-city", theme)
                self.tap(message("sheet.city.search"))
                self.run("shell", "input", "text", "lon")
                self.tap("London")
            elif number < 4:
                self.tap(message("common.continue"))
        self.tap(message("common.continue"))
        self.find(message("common.allow"))
        self.screenshot("setup-notification-permission", theme)
        self.tap(message("common.allow"))
        self.find(message("navigation.today"))

    def capture(self, theme):
        self.capture_setup(theme)
        for moment in MOMENTS:
            self.moment(moment)
            self.screenshot(f"today-{moment}", theme)
        self.moment("fri-am")
        for route in ("upcoming", "settings", "reminders", "about"):
            self.link(route)
            label = "app.name" if route == "about" else f"{route}.title"
            self.find(message(label))
            self.screenshot(route, theme)
        for sheet in SHEETS:
            self.link("settings?sheet=" + sheet)
            self.find(message(f"sheet.{sheet}.title"))
            self.screenshot(f"settings-{sheet}", theme)
            if sheet == "privacy":
                self.tap(message("sheet.privacy.delete"))
                self.find(message("sheet.privacy.confirmTitle"))
                self.screenshot("settings-privacy-confirm", theme)
                self.press_back()
            self.press_back()
        self.link("item/kahf")
        self.find("Sūrat al-Kahf")
        self.screenshot("detail-kahf", theme)
        self.tap(message("detail.reportLink"), scroll=True)
        self.find(message("sheet.report.title"))
        self.screenshot("detail-report", theme)
        self.press_back()
        for moment, item, title in (
            ("white", "white-days", "White Days fast"),
            ("fri-pm", "rain-start", "Rain starts"),
        ):
            self.moment(moment)
            self.link("item/" + item)
            self.find(title)
            self.screenshot(f"detail-{item}", theme)


def reference_scenes():
    for name, _, number in SETUP:
        yield name, "fri-am", f"S.setupDone=false; S.step={number}; S.locMode='city';"
    yield "setup-city", "fri-am", "S.setupDone=false; S.step=1;", "openSheet('city');"
    yield "setup-notification-permission", "fri-am", "S.setupDone=false; S.step=4;", "openDialog('notif');"
    for moment in MOMENTS:
        yield f"today-{moment}", moment, ""
    for route in ("upcoming", "settings"):
        yield route, "fri-am", f"S.tab='{route}';"
    for route in ("reminders", "about"):
        yield route, "fri-am", f"S.stack=[{{s:'{route}'}}];"
    for sheet in SHEETS:
        yield f"settings-{sheet}", "fri-am", "S.tab='settings';", f"openSheet('{sheet}');"
    yield "settings-privacy-confirm", "fri-am", "S.tab='settings';", "openSheet('privacy-confirm');"
    for key, moment, item in (
        ("detail-kahf", "fri-am", "kahf"),
        ("detail-white-days", "white", "whiteDays"),
        ("detail-rain-start", "fri-pm", "rain"),
        ("detail-report", "fri-am", "kahf"),
    ):
        yield key, moment, f"S.stack=[{{s:'detail',item:'{item}',date:null}}];", (
            "const sc=$('#viewport .scroll'); sc.scrollTop=sc.scrollHeight; openSheet('report',{reportItem:'kahf'});"
            if key == "detail-report" else ""
        )


def capture_references(chrome, output, theme):
    with tempfile.TemporaryDirectory(prefix="adwam-prototype-") as directory:
        work = Path(directory)
        for name, moment, state, *after_render in reference_scenes():
            page = work / f"{name}.html"
            override = (
                "<style>.fab{display:none!important}"
                "body,.stage,.center,#phoneWrap,#phone,#screen{width:412px!important;height:915px!important}</style>"
                f"<script>S.theme='{theme}';applyMoment('{moment}');{state}UI.anim=null;render();fit();"
                f"{''.join(after_render)}</script>"
            )
            page.write_text(PROTOTYPE.replace("</body>", override + "</body>"), encoding="utf-8")
            png = output / f"{name}-{theme}-prototype.png"
            run = subprocess.run([
                chrome, "--headless", "--disable-gpu", "--no-first-run", f"--user-data-dir={work / 'chrome'}",
                "--window-size=412,915", "--force-device-scale-factor=1", "--virtual-time-budget=1200",
                f"--screenshot={png}", page.as_uri(),
            ], capture_output=True, timeout=45)
            if run.returncode or not png.exists():
                raise RuntimeError(f"Chrome did not capture {name} ({theme})")


def write_index(output, themes):
    sections = []
    for name, moment, *_ in reference_scenes():
        pairs = []
        for theme in themes:
            images = "".join(
                f'<figure><figcaption>{label} · {theme.title()}</figcaption>'
                f'<img loading="lazy" src="{name}-{theme}-{kind}.png" alt="{label}"></figure>'
                for kind, label in (("android", "Android"), ("prototype", "Prototype"))
            )
            pairs.append(f'<div class="pair">{images}</div>')
        sections.append(
            f'<section id="{name}"><h2>{html.escape(name.replace("-", " ").title())}</h2>'
            f'<p>{message(f"developerTools.moment.{MOMENTS[moment]}")}</p>{"".join(pairs)}</section>'
        )
    (output / "index.html").write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8"><title>Adwam visual review</title>'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><style>'
        'body{margin:2rem auto;max-width:880px;padding:0 1rem;font:16px system-ui;color:#1f2a24;background:#f6f1e7}'
        'section{margin-bottom:3rem}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem;margin:1rem 0}'
        'figure{margin:0}figcaption{margin-bottom:.5rem}img{width:100%;vertical-align:bottom}</style>'
        f'<h1>Adwam visual review</h1>{"".join(sections)}</html>',
        encoding="utf-8",
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--adb", default="adb")
    parser.add_argument("--adb-port", type=int, default=5037)
    parser.add_argument("--device", required=True, help="Disposable Android emulator")
    parser.add_argument("--app", choices=("com.msalman5230.adwam.dev", "com.msalman5230.adwam.preview"),
                        default="com.msalman5230.adwam.dev")
    parser.add_argument("--chrome", required=True, help="Chrome or Chromium executable")
    parser.add_argument("--output", type=Path, required=True, help="A new directory for the screenshots")
    parser.add_argument("--theme", choices=("light", "dark", "both"), default="both")
    args = parser.parse_args()
    args.output = args.output.resolve()
    device = AndroidReview(args)
    if device.run("shell", "getprop", "ro.kernel.qemu").strip() != b"1":
        parser.error("The visual review clears the test app. Select a disposable Android emulator.")

    themes = ("light", "dark") if args.theme == "both" else (args.theme,)
    args.output.mkdir()
    mode = device.run("shell", "cmd", "uimode", "night").decode().split()[-1]
    zone = device.run("shell", "getprop", "persist.sys.timezone").decode().strip()
    device.run("shell", "cmd", "alarm", "set-timezone", "Europe/London")
    try:
        time.sleep(0.5)
        with ThreadPoolExecutor(max_workers=2) as executor:
            browser_runs = [executor.submit(capture_references, args.chrome, args.output, theme) for theme in themes]
            for theme in themes:
                device.capture(theme)
            for run in browser_runs:
                run.result()
        write_index(args.output, themes)
        print(f"Visual review written to {args.output / 'index.html'}")
    finally:
        device.run("shell", "am", "force-stop", args.app)
        device.run("shell", "cmd", "uimode", "night", mode)
        if zone:
            device.run("shell", "cmd", "alarm", "set-timezone", zone)


if __name__ == "__main__":
    main()
