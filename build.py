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
    src/page.html               the frame of the pages of their own (PAGES): askstudio.ai/early-access/ and /start/
    src/legal/                  terms.md + privacy.md -> terms/index.html + privacy/index.html (legal.py: page.html, legal.css, legal.js)

Each section.js is wrapped in its own function and only runs if its <section> is on the page.
Every file the build writes (index.html, site.css, site.js, the PAGES, terms/ and privacy/) ships with no comments: strip.py takes
them out once it is written, keeping every string, regex and licence comment (ESBUILD=<esbuild binary> also proves each JS and CSS
file the same program as before). The comments stay in src/, for the people who build the site.
Nothing here needs a package: plain Python 3.
"""
import hashlib, http.server, json, os, re, subprocess, sys

import legal, pricing, strip

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
    js.append(read(SRC, "click.js"))
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
    pages(secdir, [x for x in js if x.startswith("window.SK_")])
    made = legal.build(ROOT)  # askstudio.ai/terms and /privacy
    # what askstudio.ai serves carries no comments (strip.py): the main page, every page of its own, the legal pages
    for f in ["index.html", "site.css", "site.js"] + [os.path.join(pg[0], n) for pg in PAGES for n in ("index.html", "page.css", "page.js")] + \
             [os.path.join(d, "index.html") for d in made]:
        strip.file(os.path.join(ROOT, f))
    return names, ver


# The waitlist and the sign-up are pages of their own (askstudio.ai/early-access/, askstudio.ai/start/): only their section, the
# shared look (base.css, kit.js) and the CSS they share, so the main site (its intro, films and voice) never loads behind them.
# The main page sends #early-access and #signup / #paywall links here (src/shell.html), keeping ?ref=, ?confirm= and the rest.
PAGES = [
    # slug, title, description, the sections whose CSS it needs, the section it shows, its hash, its wallpaper,
    # then the link preview: og:title, og:description, image (assets/, one only), its width and height, its alt text (tools/og.js)
    ("early-access", "Get early access to Studio", "One prompt, and the idea in your head becomes a finished video. 14 days of everything, free, when your invite lands.", ["900-early"], "900-early", "#early-access", "assets/wl/name",
     "You’re invited to Studio", "One sentence in. A finished video out. 14 days of everything, free, when your invite lands.", "og-invite.jpg", 1200, 630,
     "You’re invited to Studio: a glass Studio invite pass, Your spot, 14 days free, over a lone tree and a mountain at sunrise. One sentence in. A finished video out."),
    ("start", "Start free · Studio, on your Mac", "Sign in, and Studio is ready for your Mac. Make your first video before you pay a thing.", ["900-early", "910-start"], "910-start", "#signup", "assets/su/done",
     "Start free · Studio, on your Mac", "Sign in, and Studio is ready for your Mac. Make your first video before you pay a thing.", "og-start.jpg", 2400, 1260,
     "The Studio app on the orange dune: Good evening, and a launch commercial being asked for. Start free."),
]


def pages(secdir, head_js):
    shell = read(SRC, "shell.html")
    defs = shell[shell.index("<!-- the Studio mark"):shell.index("</svg>", shell.index("<!-- the Studio mark")) + 6]
    tpl = read(SRC, "page.html")
    for slug, title, desc, css_from, sec, hash_, sky, ogtitle, ogdesc, og, ogw, ogh, ogalt in PAGES:
        css = [read(SRC, "base.css")] + ["/* ===== %s ===== */\n%s" % (n, read(secdir, n, "section.css")) for n in css_from]
        js = list(head_js) + [read(SRC, "click.js"), read(SRC, "kit.js")]
        j = read(secdir, sec, "section.js")
        js.append("/* ===== %s ===== */\n;(function () {\ntry {\n%s\n} catch (e) { console.error(%s, e); }\n})();" % (sec, j, json.dumps("section " + sec)))
        js.append("window.SK && SK.start && SK.start();")
        css_s, js_s = "\n\n".join(css), "\n\n".join(js)
        ver = hashlib.sha1((css_s + js_s).encode()).hexdigest()[:8]
        out = os.path.join(ROOT, slug)
        os.makedirs(out, exist_ok=True)
        page = (tpl.replace("{{TITLE}}", title).replace("{{DESC}}", desc).replace("{{SLUG}}", slug).replace("{{HASH}}", hash_)
                .replace("{{DEFS}}", defs).replace("{{SKY}}", sky).replace("{{OGTITLE}}", ogtitle).replace("{{OGDESC}}", ogdesc).replace("{{OGW}}", str(ogw)).replace("{{OGH}}", str(ogh)).replace("{{OGALT}}", ogalt).replace("{{OG}}", og).replace("<!--SECTION-->", read(secdir, sec, "section.html").strip()).replace("{{V}}", ver))
        open(os.path.join(out, "page.css"), "w", encoding="utf-8").write(css_s)
        open(os.path.join(out, "page.js"), "w", encoding="utf-8").write(js_s)
        open(os.path.join(out, "index.html"), "w", encoding="utf-8").write(page)


class H(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] in ("/", "/index.html", "/terms/", "/privacy/", "/early-access/", "/start/"):
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
    # Page tests and captures never start the owner's Google Chrome (tools/browser.js only): refuse to build if one could.
    if subprocess.call([sys.executable, os.path.join(ROOT, "tools", "check_no_chrome.py")]) != 0:
        sys.exit(1)
    names, ver = build()
    print("built", len(names), "sections,", ver)
    if "--serve" in sys.argv:
        os.chdir(ROOT)
        port = int(os.environ.get("PORT", "8760"))
        http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
