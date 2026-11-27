"""Studio's plans on the site come from the app's published pricing.json, never from this repo.

Where the file comes from:
    STUDIO_PRICING_URL      env: a URL to fetch it from. Default: the licence server's public copy, the one source that also
                            carries the sales switch ("sales", "mode") and the free trial ("trial_days").

render(html) fills the {{pr:...}} holes of 160-pricing (Pricing D) for the default period and writes the plan panel (desktop) and
the plan cards (narrow screens) from the file's plans and comparison rows. view() is what the page needs to switch periods without
doing any maths itself (window.SK_PRICES). check(template, script, built, view) fails the build when a number on the site could
differ from the file.

Buy buttons ("Try <Plan> free") show only when the file says "sales": true and "mode": "live". Otherwise every plan says
"Coming soon": while Stripe is in test mode the server already sells, but only to test cards.
The card maths is the app's own (Studio_App web/product/locked.html, drawPlans).
"""
import html as H
import json, os, re, urllib.request

DEFAULT_URL = "https://studio-licence.studio-licence.workers.dev/pricing.json"
CLAUDE_PRO = 20         # the least Claude plan Studio runs on; "the least you'll pay, all in" is Creator plus this
# Dollar amounts on the pricing section that are not Studio's: the five salaries and their total, the agency range, the outside
# tools' own monthly plans, and the founders' $0. Anything else written as $N in the section must come from pricing.json.
OUTSIDE = {12000, 6000, 5900, 5200, 5400, 34500, 5000, 15000, 20, 100, 15, 49, 0, 25, 6, 22, 10}
# row logos: file name in the pricing.json rows -> the site's file, and how it is drawn (w: white, g: grayscale)
LOGOS = {"meta": ("assets/logos/svg/meta.svg", "w"), "claude": ("assets/logos/svg/claude.svg", "w"),
         "higgsfield": ("assets/logos/svg/higgsfield.svg", "w"), "elevenlabs": ("assets/logos/svg/elevenlabs.svg", "g"),
         "metricool": ("assets/logos/metricool.png", "g"), "instagram": ("assets/logos/social/ig.svg", "w"),
         "ig": ("assets/logos/social/ig.svg", "w")}
# Rows of pricing.json the WEBSITE never shows (the app's own plan cards still do). Matched on the label's start, in lower case.
# "Creators: UGC and influencer finder": Evan, 2026-11-26, "We definitely do not need the creators line on the new website
# pricing." Dropped in load(), so the pricing panel, the plan cards, the checkout and window.SK_PRICES all leave it out.
SITE_SKIP_ROWS = ("creators:",)


class PricingError(Exception):
    pass


_cache = {"at": 0, "data": None}


def load():
    import time
    if _cache["data"] is not None and time.time() - _cache["at"] < 30:  # the dev server rebuilds on every page load
        return _cache["data"]
    url = os.environ.get("STUDIO_PRICING_URL") or DEFAULT_URL
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "studio-site-build", "Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        raise PricingError("could not read pricing.json from %s (%s)" % (url, e))
    plans = data.get("plans") or []
    if not plans or any(not isinstance((p.get("month") or {}).get("price"), int) or not isinstance((p.get("year") or {}).get("price"), int) for p in plans):
        raise PricingError("pricing.json: every plan needs whole-dollar month.price and year.price")
    data["rows"] = [r for r in data.get("rows") or [] if not str(r.get("label") or "").strip().lower().startswith(SITE_SKIP_ROWS)]
    for row in data["rows"]:
        missing = [p["id"] for p in plans if p["id"] not in (row.get("values") or {})]
        if missing:
            raise PricingError("pricing.json: row %r has no value for %s" % (row.get("label"), ", ".join(missing)))
    _cache.update(at=time.time(), data=data)
    return data


def jround(x):  # JavaScript's Math.round (halves go up), so the site rounds exactly as the app does
    return int((x + 0.5) // 1)


def usd(n):
    return "$" + format(jround(n), ",")


def live(data):
    return data.get("sales") is True and data.get("mode") == "live"


def card(p, period):
    o = p.get(period) or p.get("month") or p.get("year")
    yearly = o is p.get("year")
    per = jround(o["price"] / 12) if yearly else o["price"]
    was = p["month"]["price"] if yearly and p.get("month") and p["month"]["price"] > per else 0
    saved = p["month"]["price"] * 12 - o["price"] if was else 0
    bill = ("Billed %s yearly" % usd(o["price"])) if yearly else "Billed monthly · Cancel anytime"
    return {"per": per, "was": was, "bill": bill, "save": ("Save " + usd(saved)) if saved > 0 else "", "url": o.get("url") or ""}


def period_view(data, period, team_cost):
    cards = [(p, card(p, period)) for p in data["plans"]]
    low = min(c["per"] for _, c in cards)
    high = max(c["per"] for _, c in cards)
    v = {
        "from": usd(low),
        "bar": "%.2f%%" % max(0.8, low / team_cost * 100),
        "range": "%s to %s" % (usd(low), usd(high)),
        "allin": usd(low + CLAUDE_PRO),
        "founders": usd(high),
    }
    for p, c in cards:
        v[p["id"] + ".per"] = usd(c["per"])
        v[p["id"] + ".was"] = usd(c["was"]) if c["was"] else ""
        v[p["id"] + ".bill"] = c["bill"]
        v[p["id"] + ".save"] = c["save"]
        v[p["id"] + ".url"] = c["url"] if live(data) else ""
    return v


def view(data, team_cost):
    save = max([0] + [1 - p["year"]["price"] / (p["month"]["price"] * 12) for p in data["plans"]])
    return {"default": "month" if data.get("default_period") == "month" else "year", "save": jround(save * 100), "live": live(data),
            "year": period_view(data, "year", team_cost), "month": period_view(data, "month", team_cost)}


def team_cost(template):
    costs = [int(c) for c in re.findall(r'data-cost="(\d+)"', template)]
    if not costs:
        raise PricingError("160-pricing: the anchor's rows lost their data-cost")
    return sum(costs)


# ---------- markup ----------
CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.4 2.9 2.9 6.1-6.6"/></svg>'
DASH = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 8h8"/></svg>'
ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9M8.5 4l4 4-4 4"/></svg>'
MARK = '<svg class="pd-mk" aria-hidden="true"><use href="#studio-mark"/></svg>'


def logos(row):
    out = []
    for name in row.get("logos") or []:
        f = LOGOS.get(name)
        if f:
            out.append('<img class="lg%s" src="%s" alt="" width="16" height="16" loading="lazy">' % (" g" if f[1] == "g" else "", f[0]))
    return "".join(out)


def cell(v):
    """(class, inner html) for one plan's value in a comparison row"""
    if v is True:
        return "", CHECK
    if v is False or v is None:
        return " n", DASH
    if isinstance(v, str) and v.lower() in ("coming soon", "soon"):
        return " s", '<span class="pd-soon">Soon</span>'
    return " big", "<span>%s</span>" % H.escape(str(v))


def head(p, c, vw):
    pid = H.escape(p["id"])
    tag = ('<span class="pd-tag" data-beam-auto="sm" data-beam-boost="1.6" data-beam-radius="13"><span class="tx">%s</span></span>' % H.escape(p["tag"])) if p.get("tag") else ""
    if vw["live"] and c["url"]:
        btn = '<a class="pd-btn%s" href="%s" data-pv-href="%s.url">Try %s free %s</a>' % (" go" if p.get("best") else "", H.escape(c["url"]), pid, H.escape(p["name"]), ARROW)
    else:
        btn = '<span class="pd-btn soon%s" aria-disabled="true" data-plan="%s">Coming soon</span>' % (" best" if p.get("best") else "", pid)  # early access turns it into a button (900-early)
    clip = "assets/audio/kayla-why-%s.mp3" % pid
    kayla = ('<button type="button" class="pd-k" data-clip="%s" hidden aria-label="Kayla: why %s?"><img src="assets/kayla.jpg" alt="" width="72" height="72" loading="lazy">'
             '<span class="t"><b>Why %s?</b><svg class="wv" viewBox="0 0 222 16" preserveAspectRatio="none" aria-hidden="true"></svg></span>'
             '<span class="pl"><svg class="p1" viewBox="0 0 11 12" aria-hidden="true"><path d="M2 1.6 9.4 6 2 10.4Z"/></svg><svg class="p2" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.5h2.4v9H2.5zM7.1 1.5h2.4v9H7.1z"/></svg></span></button>'
             % (clip, H.escape(p["name"]), H.escape(p["name"])))
    return ('<div class="pd-nm"><span class="nmx">%s%s</span>%s</div>'
            '<p class="pd-pr"><span class="was pd-num" data-pv="%s.was">%s</span><span class="pd-num" data-pv="%s.per">%s</span><small>/ month</small></p>'
            '<p class="pd-billed"><span class="pd-num" data-pv="%s.bill">%s</span><span class="pd-save pd-num" data-pv="%s.save">%s</span></p>'
            '%s%s') % (MARK, H.escape(p["name"]), tag, pid, usd(c["was"]) if c["was"] else "", pid, usd(c["per"]), pid, H.escape(c["bill"]), pid, H.escape(c["save"]), kayla, btn)


def plans_html(data, vw):
    plans, rows = data["plans"], data.get("rows") or []
    period = vw["default"]
    n = len(plans)
    best = [i for i, p in enumerate(plans) if p.get("best")]
    # desktop: one panel, rows read straight across; the best plan is one dark beamed column from its price to its last row
    g = ['<div class="pd-panel pd-glass" style="--n:%d; --rows:%d">' % (n, len(rows))]
    if best:
        g.append('<div class="pd-pro" style="grid-column:%d; grid-row:1 / %d"><span class="pd-pbeam" data-beam="cx" data-active aria-hidden="true"><span data-beam-bloom></span></span></div>' % (best[0] + 2, len(rows) + 2))
    g.append('<div class="pd-h lead" style="grid-column:1; grid-row:1"><span class="pd-brand"><svg aria-hidden="true"><use href="#studio-mark"/></svg>Studio</span>'
             '<span class="pd-mono">Same rows, read across</span><p>Every plan does the work. <span>Pick by how many brands you run.</span></p></div>')
    for i, p in enumerate(plans):
        g.append('<div class="pd-h" style="grid-column:%d; grid-row:1">%s</div>' % (i + 2, head(p, card(p, period), vw)))
    for r, row in enumerate(rows):
        z = " z" if r % 2 == 0 else ""
        g.append('<div class="pd-c lab%s%s" style="grid-column:1; grid-row:%d"><span>%s</span>%s</div>' % (z, " first" if z else "", r + 2, H.escape(row["label"]), logos(row)))
        for i, p in enumerate(plans):
            cls, inner = cell(row["values"][p["id"]])
            g.append('<div class="pd-c%s%s%s" style="grid-column:%d; grid-row:%d">%s</div>' % (cls, z, " last" if z and i == n - 1 else "", i + 2, r + 2, inner))
    g.append("</div>")
    # narrow screens: a card per plan, every row in the same place on every card
    c = ['<div class="pd-cards">']
    for p in plans:
        b = bool(p.get("best"))
        c.append('<article class="pd-card pd-glass%s">' % (" best" if b else ""))
        if b:
            c.append('<span class="pd-pbeam" data-beam="cx" data-active aria-hidden="true"><span data-beam-bloom></span></span>')
        c.append('<div class="pd-ch">%s</div><ul class="pd-clist">' % head(p, card(p, period), vw))
        for row in rows:
            cls, inner = cell(row["values"][p["id"]])
            if cls == " big":
                c.append('<li class="pd-cr big">%s</li>' % inner)
            else:
                label = '<span>%s</span>%s' % (H.escape(row["label"]), logos(row))
                c.append('<li class="pd-cr%s">%s%s</li>' % (cls, inner if cls != " s" else "", label + (inner if cls == " s" else "")))
        c.append("</ul></article>")
    c.append("</div>")
    return "".join(g) + "".join(c)


def trial_html(data):
    d = data.get("trial_days")
    if not isinstance(d, int) or d <= 0:
        return ""
    return ('<p class="pd-trial" data-pd-group="2">Every plan starts with %d days of everything, free. Card required. You won\'t be charged for %d days. '
            'On a smaller plan, extra brands are locked, never deleted.</p>' % (d, d))


def render(template):
    data = load()
    tc = team_cost(template)
    vw = view(data, tc)
    cur = vw[vw["default"]]
    out = template.replace("{{pr:plans}}", plans_html(data, vw)).replace("{{pr:trial}}", trial_html(data))
    out = out.replace("{{pr:save}}", str(vw["save"])).replace("{{pr:period}}", vw["default"])
    out = re.sub(r"\{\{pr:([\w.]+)\}\}", lambda k: H.escape(cur[k.group(1)]), out)
    return out, vw


def amounts(s):
    return [int(a.replace(",", "")) for a in re.findall(r"\$\s?(\d[\d,]*)", s)]


def check(template, script, built, vw):
    """Fail when a price could drift from pricing.json: no Studio price may be typed into the section or its script,
    no hole may be left, and every amount on the built section must be one the file gives (or an outside one)."""
    typed = [a for a in amounts(re.sub(r"<!--.*?-->", "", template, flags=re.S)) if a not in OUTSIDE]
    if typed:
        raise PricingError("160-pricing/section.html types a price by hand (%s); it must come from pricing.json" % ", ".join("$%d" % a for a in typed))
    if amounts(script):
        raise PricingError("160-pricing/section.js types a price by hand; it must read window.SK_PRICES")
    if "{{pr:" in built:
        raise PricingError("160-pricing: a {{pr:...}} hole was left unfilled")
    derived = set()
    for per in ("year", "month"):
        for v in vw[per].values():
            derived.update(amounts(v))
    stray = [a for a in amounts(built) if a not in derived and a not in OUTSIDE]
    if stray:
        raise PricingError("160-pricing shows %s, which pricing.json does not give" % ", ".join("$%d" % a for a in stray))
