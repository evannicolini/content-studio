"""Studio's prices on the site come from the app's published pricing.json, never from this repo.

Where the file comes from (first that exists):
    STUDIO_PRICING_URL      env: a URL to fetch the published pricing.json from
    STUDIO_RELEASES         env: the app's Releases folder (default: the Dropbox copy on this Mac)
The Releases folder's public link is not written here on purpose: it also serves the app downloads, which only an invite
code unlocks (assets/gate.json). The synced folder holds the same published file.

render(html) fills the {{pr:...}} holes of 160-pricing for the default period and repeats the <!--plan--> block once per plan.
view() is what the page needs to switch periods without doing any maths itself (window.SK_PRICES).
check(template, built) fails the build when a number on the site could differ from the file.
The card maths is the app's own (Studio_App web/product/locked.html, drawPlans), line for line.
"""
import html as H
import json, os, re, urllib.request

DEFAULT_RELEASES = "~/Library/CloudStorage/Dropbox/Studio Beta/Releases"
ENTRY_TOOLS = 20 + 15   # Claude Pro + Higgsfield's entry plan
DAILY_TOOLS = 200       # everything else in the bill, at the plans most people settle on
# Dollar amounts on the pricing section that are not Studio's: the four salaries and their total, the agency range and the
# outside tools' own monthly plans. Anything else written as $N in the section must come from pricing.json.
OUTSIDE = {12000, 6000, 5900, 5200, 29100, 5000, 15000, 20, 100, 15, 49, 0, 25, 6, 22, 10}


class PricingError(Exception):
    pass


def load():
    url = os.environ.get("STUDIO_PRICING_URL")
    if url:
        with urllib.request.urlopen(url, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
    else:
        f = os.path.join(os.path.expanduser(os.environ.get("STUDIO_RELEASES") or DEFAULT_RELEASES), "pricing.json")
        if not os.path.exists(f):
            raise PricingError("no published pricing.json (looked in %s; set STUDIO_PRICING_URL or STUDIO_RELEASES)" % f)
        data = json.load(open(f, encoding="utf-8"))
    plans = data.get("plans") or []
    if not plans or any(not isinstance((p.get("month") or {}).get("price"), int) or not isinstance((p.get("year") or {}).get("price"), int) for p in plans):
        raise PricingError("pricing.json: every plan needs whole-dollar month.price and year.price")
    if not any(p.get("id") == "creator" for p in plans) or not any(p.get("id") == "team" for p in plans):
        raise PricingError("pricing.json: the site's bill names Creator and Team; both plans must be in the file")
    return data


def jround(x):  # JavaScript's Math.round (halves go up), so the site rounds exactly as the app does
    return int((x + 0.5) // 1)


def usd(n):
    return "$" + format(jround(n), ",")


def round50(n):
    return jround(n / 50) * 50


def card(p, period):
    o = p.get(period) or p.get("month") or p.get("year")
    yearly = o is p.get("year")
    per = jround(o["price"] / 12) if yearly else o["price"]
    was = p["month"]["price"] if yearly and p.get("month") and p["month"]["price"] > per else 0
    saved = p["month"]["price"] * 12 - o["price"] if was else 0
    seat = "%d seats · %s each · " % (p["seats"], usd(jround(per / p["seats"]))) if p.get("seats") else ""
    bill = seat + (("Billed %s yearly" % usd(o["price"])) + (" · Save %s" % usd(saved) if saved > 0 else "") if yearly else "Billed monthly · Cancel anytime")
    return {"per": per, "was": was, "bill": bill, "url": o.get("url") or ""}


def period_view(data, period, team_cost):
    cards = {p["id"]: card(p, period) for p in data["plans"]}
    creator, team = cards["creator"]["per"], cards["team"]["per"]
    low = min(c["per"] for c in cards.values())
    v = {
        "from": "from " + usd(low),
        "bar": "%.2f%%" % max(0.2, low / team_cost * 100),
        "range": "%s or %s" % (usd(creator), usd(team)),
        "just": usd(creator + ENTRY_TOOLS),
        "pipe": "about " + usd(round50(creator + DAILY_TOOLS)),
        "pipeteam": usd(round50(team + DAILY_TOOLS)),
    }
    for pid, c in cards.items():
        v[pid + ".per"] = usd(c["per"])
        v[pid + ".was"] = usd(c["was"]) if c["was"] else ""
        v[pid + ".bill"] = c["bill"]
    return v


def view(data, team_cost):
    save = max([0] + [1 - p["year"]["price"] / (p["month"]["price"] * 12) for p in data["plans"]])
    return {"default": "month" if data.get("default_period") == "month" else "year", "save": jround(save * 100),
            "year": period_view(data, "year", team_cost), "month": period_view(data, "month", team_cost)}


def team_cost(template):
    costs = [int(c) for c in re.findall(r'data-cost="(\d+)"', template)]
    if not costs:
        raise PricingError("160-pricing: the anchor's rows lost their data-cost")
    return sum(costs)


CHECK = '<li><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.4 2.9 2.9 6.1-6.6"/></svg><span>%s</span></li>'
ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>'


def render(template):
    data = load()
    tc = team_cost(template)
    vw = view(data, tc)
    cur = vw[vw["default"]]
    m = re.search(r"<!--plan-->(.*?)<!--/plan-->", template, re.S)
    if not m:
        raise PricingError("160-pricing: no <!--plan--> block")
    blocks = []
    for i, p in enumerate(data["plans"]):
        c = card(p, vw["default"])
        best = bool(p.get("best"))
        if c["url"]:
            btn = '<a class="pr-btn go%s" href="%s"%s>Choose %s %s</a>' % (" sand" if best else "", H.escape(c["url"]), ' data-beam-auto="sm"' if best else "", H.escape(p["name"]), ARROW)
        else:
            btn = '<span class="pr-btn soon" aria-disabled="true">Opening soon</span>'
        fill = {
            "id": H.escape(p["id"]), "i": str(i), "name": H.escape(p["name"]), "note": H.escape(p.get("note", "")),
            "cls": " best" if best else "",
            "beam": '<span class="pr-beam" data-beam="cx" data-active aria-hidden="true"><span data-beam-bloom></span></span>' if best else "",
            "tag": '<span class="pr-tag on">%s</span>' % H.escape(p["tag"]) if p.get("tag") else "",
            "per": cur[p["id"] + ".per"], "was": cur[p["id"] + ".was"], "bill": H.escape(cur[p["id"] + ".bill"]),
            "features": "".join(CHECK % H.escape(f) for f in p.get("features", [])), "button": btn,
        }
        blocks.append(re.sub(r"\{\{pr:([\w.]+)\}\}", lambda k: fill[k.group(1)], m.group(1)))
    out = template[: m.start()] + "".join(blocks) + template[m.end():]
    out = out.replace("{{pr:save}}", str(vw["save"]))
    out = out.replace("{{pr:period}}", vw["default"])
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
