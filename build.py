#!/usr/bin/env python3
"""Builds the Studio site: index.html, site.css, site.js from src/.

    python3 build.py            build once
    python3 build.py --serve    build, then serve on http://127.0.0.1:8760 (rebuilds on each page load of /)

Layout
    src/shell.html              the page frame; <!--SECTIONS--> is replaced by every section, in folder-name order
    src/base.css, src/kit.js    the shared look and the shared behaviour (window.SK)
    src/waitlist.json           where early access sign-ups go (Brevo form or webhook); empty = the site stays on Download
    src/sections/NN-name/       section.html (required), section.css, section.js (each optional)
    assets/media/manifest.json  inlined as window.SK_MEDIA so sections can read what media exists
    pricing.py                  Studio's prices, from the app's published pricing.json; the build fails if the site could differ

Each section.js is wrapped in its own function and only runs if its <section> is on the page.
Nothing here needs a package: plain Python 3.
"""
import hashlib, http.server, json, os, re, sys

import pricing

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, "src")


def read(*p):
    f = os.path.join(*p)
    return open(f, encoding="utf-8").read() if os.path.exists(f) else ""


def build():
    secdir = os.path.join(SRC, "sections")
    names = sorted(d for d in os.listdir(secdir) if os.path.isdir(os.path.join(secdir, d)) and not d.startswith("_"))
    html, css, js = [], [read(SRC, "base.css")], []
    manifest = read(ROOT, "assets", "media", "manifest.json") or "{}"
    try:
        json.loads(manifest)
    except ValueError:
        manifest = "{}"
    app = read(ROOT, "assets", "media", "app", "app.json")
    try:
        mj = json.loads(manifest)
        if app.strip():
            mj["app"] = json.loads(app)
        manifest = json.dumps(mj, separators=(",", ":"))
    except ValueError:
        pass
    js.append("window.SK_MEDIA = %s;" % manifest)
    try:  # early access sign-ups: where they go (src/waitlist.json, read by 900-early)
        wl = {k: v for k, v in json.loads(read(SRC, "waitlist.json") or "{}").items() if not k.startswith("_")}
    except ValueError:
        wl = {}
    js.append("window.SK_WAITLIST = %s;" % json.dumps(wl, separators=(",", ":")))
    prices_at = len(js)
    js.append(read(SRC, "kit.js"))
    for n in names:
        h = read(secdir, n, "section.html").strip()
        if not h:
            continue
        if "{{pr:" in h:  # Studio's prices: from the app's published pricing.json, checked (pricing.py)
            t = h
            h, vw = pricing.render(t)
            pricing.check(t, read(secdir, n, "section.js"), h, vw)
            js.insert(prices_at, "window.SK_PRICES = %s;" % json.dumps(vw, separators=(",", ":"), ensure_ascii=False))
        html.append("<!-- %s -->\n%s" % (n, h))
        c = read(secdir, n, "section.css")
        if c.strip():
            css.append("/* ===== %s ===== */\n%s" % (n, c))
        j = read(secdir, n, "section.js")
        if j.strip():
            js.append("/* ===== %s ===== */\n;(function () {\ntry {\n%s\n} catch (e) { console.error(%s, e); }\n})();" % (n, j, json.dumps("section " + n)))
    js.append("window.SK && SK.start && SK.start();")
    css_s, js_s = "\n\n".join(css), "\n\n".join(js)
    ver = hashlib.sha1((css_s + js_s).encode()).hexdigest()[:8]
    page = read(SRC, "shell.html").replace("<!--SECTIONS-->", "\n\n".join(html)).replace("{{V}}", ver)
    open(os.path.join(ROOT, "site.css"), "w", encoding="utf-8").write(css_s)
    open(os.path.join(ROOT, "site.js"), "w", encoding="utf-8").write(js_s)
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(page)
    return names, ver


class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/index.html"):
            try:
                build()
            except Exception as e:  # keep serving the last good build
                sys.stderr.write("build failed: %r\n" % (e,))
        return super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    names, ver = build()
    print("built", len(names), "sections,", ver)
    if "--serve" in sys.argv:
        os.chdir(ROOT)
        port = int(os.environ.get("PORT", "8760"))
        http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
