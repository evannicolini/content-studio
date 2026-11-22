"""Studio's legal pages: src/legal/terms.md and privacy.md -> terms/index.html and privacy/index.html.

Called by build.py. Plain Python 3, no packages: a small Markdown converter for the subset the two documents use
(headings, paragraphs, lists, bold/italic, links, tables, blockquotes, rules), dropped into src/legal/page.html.

    Headings get stable ids the app links to: "13. Copyright complaints (DMCA)" -> #13-copyright-complaints-dmca
    (lowercase, anything not a-z/0-9 becomes "-", repeats collapse). The SMS Terms heading is #sms-terms (its
    numbered slug still works as a second anchor).
    Placeholders such as [COMPANY LEGAL NAME] are kept word for word and marked (<mark class="ph">) so they're easy to spot.
    "Section 22" / "Section 22.8" in the text links to that section's heading.
"""
import html, os, re

PAGES = [  # (source, output folder, short name, description)
    ("terms.md", "terms", "Terms", "The terms for using Studio, the Mac app and askstudio.ai: plans, the trial, cancelling, your content and AI output."),
    ("privacy.md", "privacy", "Privacy", "How Studio handles personal information. Your workspace stays on your Mac; we don't sell your data."),
]
LINKS = {"terms.md": "../terms/", "privacy.md": "../privacy/"}
PRIMARY_IDS = {"sms terms": "sms-terms"}  # heading text (without its number) -> the id the app links to

PH = re.compile(r"\[([A-Z0-9][A-Z0-9 /.,&'-]*)\](?!\()")
LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
BOLD = re.compile(r"\*\*(.+?)\*\*")
ITAL = re.compile(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])")
SECREF = re.compile(r"\bSection (\d+)(\.\d+)?\b")
NUM = re.compile(r"^(\d+)\.\s+(.*)$")


def slug(t):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]", "-", t.lower())).strip("-")


def plain(t):  # heading text without markdown
    return LINK.sub(r"\1", t).replace("**", "").replace("*", "")


def inline(t, secs=None):
    t = html.escape(t, quote=False)
    t = PH.sub(lambda m: '<mark class="ph">[%s]</mark>' % m.group(1), t)

    def link(m):
        href = LINKS.get(m.group(2), m.group(2))
        ext = ' rel="noopener"' if href.startswith("http") else ""
        return '<a href="%s"%s>%s</a>' % (html.escape(href), ext, m.group(1))

    t = LINK.sub(link, t)
    t = BOLD.sub(r"<strong>\1</strong>", t)
    t = ITAL.sub(r"<em>\1</em>", t)
    if secs:  # "Section 22" -> a link to that section (never inside an existing link)
        parts = re.split(r"(<a\b.*?</a>)", t)
        for i in range(0, len(parts), 2):
            parts[i] = SECREF.sub(lambda m: xref(m, secs), parts[i])
        t = "".join(parts)
    return t


def xref(m, secs):
    key = m.group(1) + (m.group(2) or "")
    target = secs.get(key) or secs.get(m.group(1))
    return '<a class="xref" href="#%s">%s</a>' % (target, m.group(0)) if target else m.group(0)


def blocks(lines):
    """Markdown lines -> a list of (kind, data)."""
    out, i, n = [], 0, len(lines)
    while i < n:
        s = lines[i].rstrip()
        if not s.strip():
            i += 1
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", s)
        if m:
            out.append(("h", (len(m.group(1)), m.group(2).strip())))
            i += 1
        elif re.match(r"^\s*(-{3,}|\*{3,}|_{3,})\s*$", s):
            out.append(("hr", None))
            i += 1
        elif s.startswith(">"):
            q = []
            while i < n and lines[i].startswith(">"):
                q.append(re.sub(r"^>\s?", "", lines[i].rstrip()))
                i += 1
            out.append(("quote", blocks(q)))
        elif s.startswith("|") and i + 1 < n and re.match(r"^\|?\s*:?-{3,}", lines[i + 1].strip()):
            row = lambda l: [c.strip() for c in l.strip().strip("|").split("|")]
            head, body = row(s), []
            i += 2
            while i < n and lines[i].strip().startswith("|"):
                body.append(row(lines[i]))
                i += 1
            out.append(("table", (head, body)))
        elif re.match(r"^[-*+]\s+", s) or re.match(r"^\d+\.\s+", s):
            ordered = bool(re.match(r"^\d+\.", s))
            pat = r"^\d+\.\s+" if ordered else r"^[-*+]\s+"
            items, start = [], int(re.match(r"^(\d+)", s).group(1)) if ordered else 1
            while i < n and lines[i].strip():
                l = lines[i].rstrip()
                if re.match(pat, l):
                    items.append(re.sub(pat, "", l))
                elif items and lines[i].startswith((" ", "\t")):
                    items[-1] += " " + l.strip()
                else:
                    break
                i += 1
            out.append(("ol" if ordered else "ul", (items, start)))
        else:
            p = []
            while i < n and lines[i].strip() and not re.match(r"^(#{1,6}\s|>|\||[-*+]\s|\d+\.\s|-{3,}\s*$)", lines[i]):
                p.append(lines[i].strip())
                i += 1
            out.append(("p", p))
    return out


def render(bl, secs, ids, toc):
    h = []
    for kind, d in bl:
        if kind == "h":
            lvl, text = d
            raw = plain(text)
            sid = slug(raw)
            m = NUM.match(raw)
            words = m.group(2) if m else raw
            primary = PRIMARY_IDS.get(words.lower(), sid)
            alias = sid if primary != sid else None
            while primary in ids:
                primary += "-2"
            ids.add(primary)
            if lvl == 2:
                toc.append((primary, m.group(1) if m else "", words))
                num = '<span class="n">%s</span>' % m.group(1) if m else ""
                a = '<span class="alias" id="%s"></span>' % alias if alias else ""
                h.append('<h2 id="%s">%s%s<span class="t">%s</span></h2>' % (primary, a, num, inline(words)))
            else:
                h.append('<h%d id="%s">%s</h%d>' % (lvl, primary, inline(text), lvl))
        elif kind == "hr":
            h.append('<hr>')
        elif kind == "quote":
            h.append('<blockquote class="callout">%s</blockquote>' % render(d, secs, ids, toc))
        elif kind == "table":
            head, body = d
            th = "".join("<th scope=\"col\">%s</th>" % inline(c) for c in head)
            rows = "".join("<tr>%s</tr>" % "".join('<td data-th="%s">%s</td>' % (html.escape(plain(head[j]) if j < len(head) else ""), inline(c, secs)) for j, c in enumerate(r)) for r in body)
            h.append('<div class="tbl cols-%d"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (len(head), th, rows))
        elif kind in ("ul", "ol"):
            items, start = d
            st = ' start="%d"' % start if kind == "ol" and start != 1 else ""
            h.append("<%s%s>%s</%s>" % (kind, st, "".join("<li>%s</li>" % inline(x, secs) for x in items), kind))
        elif kind == "p":
            text = "\n".join(d)
            body = "<br>\n".join(inline(l, secs) for l in d)
            cls = []
            m = re.match(r"^\*\*(\d+\.\d+)\s+(.+?)\*\*$", text)
            if m and "\n" not in text and "*" not in m.group(2):  # "**2.1 Information you give us**" is a sub-heading
                sid = slug(m.group(1) + " " + m.group(2))
                ids.add(sid)
                h.append('<h3 id="%s"><span class="n">%s</span>%s</h3>' % (sid, m.group(1), inline(m.group(2))))
                continue
            letters = re.sub(r"[^A-Za-z]", "", re.sub(r"\[[A-Z /]+\]", "", text))
            if len(letters) > 30 and sum(c.isupper() for c in letters) / len(letters) > .85:
                cls.append("caps")
            m = re.match(r"^\*\*(\d+\.\d+)\s", text)
            pid = ""
            if m:  # "**5.4 How to cancel.** ..." gets an anchor of its own: #5-4
                pid = slug(m.group(1))
                if pid in ids:
                    pid = ""
                else:
                    ids.add(pid)
                    cls.append("clause")
            h.append("<p%s%s>%s</p>" % (' id="%s"' % pid if pid else "", ' class="%s"' % " ".join(cls) if cls else "", body))
    return "\n".join(h)


def convert(md):
    lines = md.replace("\r\n", "\n").split("\n")
    bl = blocks(lines)
    title, dates = "", []
    if bl and bl[0][0] == "h" and bl[0][1][0] == 1:
        title = plain(bl[0][1][1])
        bl = bl[1:]
    if bl and bl[0][0] == "p" and bl[0][1][0].startswith("**Effective date"):
        for l in bl[0][1]:
            m = re.match(r"^\*\*(.+?):\*\*\s*(.*)$", l)
            if m:
                dates.append((m.group(1), m.group(2)))
        bl = bl[1:]
    secs = {}
    for kind, d in bl:
        if kind == "h" and d[0] == 2:
            m = NUM.match(plain(d[1]))
            if m:
                w = m.group(2)
                secs[m.group(1)] = PRIMARY_IDS.get(w.lower(), slug(plain(d[1])))
    for l in lines:  # numbered clauses ("**22.8 30-day opt-out.**") are anchors too: #22-8
        m = re.match(r"^\*\*(\d+\.\d+)\s", l)
        if m and not re.match(r"^\*\*\d+\.\d+\s+[^*]+\*\*$", l.strip()):
            secs.setdefault(m.group(1), slug(m.group(1)))
    toc = []
    body = render(bl, secs, set(), toc)
    return title, dates, body, toc


def build(root):
    src = os.path.join(root, "src", "legal")
    shell = open(os.path.join(src, "page.html"), encoding="utf-8").read()
    css = open(os.path.join(src, "legal.css"), encoding="utf-8").read()
    js = open(os.path.join(root, "src", "click.js"), encoding="utf-8").read() + "\n" + open(os.path.join(src, "legal.js"), encoding="utf-8").read()   # the site's click sound first
    made = []
    for fn, folder, short, desc in PAGES:
        title, dates, body, toc = convert(open(os.path.join(src, fn), encoding="utf-8").read())
        title = re.sub(r"^Studio\s+", "", title)  # "Studio Terms of Service" -> "Terms of Service"
        tl = "\n".join('<li><a href="#%s">%s<span>%s</span></a></li>' % (i, '<b>%s</b>' % n if n else "<b>&middot;</b>", inline(w)) for i, n, w in toc)
        dl = "\n".join('<div><dt>%s</dt><dd>%s</dd></div>' % (html.escape(k), html.escape(v)) for k, v in dates)
        page = shell
        for k, v in {
            "{{TITLE}}": html.escape(title), "{{DESC}}": html.escape(desc), "{{PATH}}": folder,
            "{{DATES}}": dl, "{{TOC}}": tl, "{{BODY}}": body, "{{CSS}}": css, "{{JS}}": js,
            "{{CUR_TERMS}}": ' aria-current="page"' if folder == "terms" else "",
            "{{CUR_PRIVACY}}": ' aria-current="page"' if folder == "privacy" else "",
        }.items():
            page = page.replace(k, v)
        os.makedirs(os.path.join(root, folder), exist_ok=True)
        open(os.path.join(root, folder, "index.html"), "w", encoding="utf-8").write(page)
        made.append(folder)
    return made
