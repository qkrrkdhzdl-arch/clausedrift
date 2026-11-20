#!/usr/bin/env python3
"""End-to-end smoke test against a running copy of the app.

    python3 tools/smoke.py                # serves docs/ itself
    python3 tools/smoke.py --url https://qkrrkdhzdl-arch.github.io/clausedrift/

What it checks, in a real browser:
  1. no off-site request is made after the document loads,
  2. the sample pair loads and the comparison renders the numbers the library
     computes (rent, deposit, risk cards),
  3. the JSON export and the printed report are produced,
  4. the page logs no console errors.
"""
from __future__ import annotations

import argparse
import json
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "docs"
PORT = 8773
CHROME = "/workspace/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome"

EXPECTED = ["12,000,000", "720,000", "Disputes move to arbitration", "Ask before you sign"]


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run(url: str) -> int:
    from playwright.sync_api import sync_playwright

    failures: list[str] = []
    requests: list[str] = []
    errors: list[str] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROME, args=["--no-sandbox"])
        page = browser.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.goto(url, wait_until="networkidle")
        page.on("request", lambda r: requests.append(r.url))

        page.click("text=Studio lease")
        page.click("#run")
        page.wait_for_selector("text=Ask before you sign", timeout=15000)

        body = page.inner_text("body")
        for needle in EXPECTED:
            if needle not in body:
                failures.append(f"missing on the page: {needle}")

        offsite = [u for u in requests if not u.startswith(url.rsplit("/", 1)[0])]
        if offsite:
            failures.append(f"off-site requests after load: {offsite}")

        with page.expect_download() as dl:
            page.click("text=Download JSON")
        path = dl.value.path()
        payload = json.loads(Path(path).read_text())
        if payload.get("schema") != "clausedrift/1":
            failures.append("JSON report has the wrong schema")
        if not payload.get("terms"):
            failures.append("JSON report carries no amounts")

        page.emulate_media(media="print")
        page.pdf(path=str(ROOT / "tools" / "out" / "report.pdf"))
        browser.close()

    for f in failures:
        print("FAIL", f)
    for e in errors[:5]:
        print("console:", e)
    print(f"{'OK' if not failures and not errors else 'FAILED'} — {len(requests)} requests, "
          f"{'no' if not offsite else len(offsite)} off-site")
    return 0 if not failures and not errors else 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url")
    args = ap.parse_args()

    if args.url:
        return run(args.url)

    handler = lambda *a, **k: Quiet(*a, directory=str(WEB), **k)  # noqa: E731
    server = ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        return run(f"http://127.0.0.1:{PORT}/")
    finally:
        server.shutdown()


if __name__ == "__main__":
    sys.exit(main())
