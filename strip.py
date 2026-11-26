"""Takes the comments out of what the build emits (build.py, legal.py): the JS, the CSS and the HTML served at askstudio.ai
ship with no comments. Nothing else changes: every string, template literal, regex literal and line break that code can
depend on is kept, byte for byte. Licence comments are kept (/*! ... */, or a comment that says @license or @preserve).

    js(text)     JavaScript: // and /* */ comments; strings, template literals (with ${...} inside), regex literals kept
    css(text)    CSS: /* */ comments; strings and url(...) kept
    html(text)   HTML: <!-- --> comments, and the comments inside <script> (JavaScript only) and <style>
    comments(kind, text) -> [the comments it would take out]   (tools/test_demo.js: the built output must have none)

    python3 strip.py --check <file>...      exit 1 if any file still has a comment (prints the first of each)
    python3 strip.py --comments <file>...   every comment in the files, one JSON line each
    ESBUILD=<esbuild binary> python3 build.py
                                            also proves every stripped JS and CSS file the same program as before: esbuild
                                            --minify of each, before and after, must be byte for byte the same

A comment that is the only thing on its line goes with its line; a block comment that held a line break leaves one
behind (so automatic semicolon insertion reads the code the same), any other leaves a space (so two tokens never join).
Plain Python 3, nothing to install.
"""
import os, re, subprocess, sys, tempfile

KEEP = re.compile(r"^/\*!|@license|@preserve")
# after these a "/" starts a regex literal; after anything else (a name, a number, ")" or "]") it divides
REGEX_AFTER_WORDS = {"return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await"}
ID = re.compile(r"[A-Za-z0-9_$\u0080-￿]")


class _Out:
    def __init__(self):
        self.parts, self.found = [], []

    def add(self, s):
        self.parts.append(s)

    def text(self):
        return "".join(self.parts)

    def line_blank(self):
        """True when everything written since the last line break is spaces or tabs: the comment stands on its own line."""
        for p in reversed(self.parts):
            k = p.rfind("\n")
            seg = p if k < 0 else p[k + 1:]
            if seg.strip(" \t"):
                return False
            if k >= 0:
                return True
        return True

    def trim_line(self):
        while self.parts:
            p = self.parts[-1]
            k = p.rfind("\n")
            if k >= 0:
                self.parts[-1] = p[:k + 1]
                return
            self.parts.pop()


def _drop(out, src, start, end, multiline_kept):
    """Take src[start:end] (a comment) out, tidily."""
    out.found.append(src[start:end])
    n = len(src)
    if out.line_blank():
        j = end
        while j < n and src[j] in " \t":
            j += 1
        if j >= n or src[j] in "\r\n":           # alone on its line: the line goes
            out.trim_line()
            if j < n and src[j] == "\r":
                j += 1
            if j < n and src[j] == "\n":
                j += 1
            return j
    out.add("\n" if multiline_kept else " ")
    return end


def js(src, collect=False):
    out, i, n = _Out(), 0, len(src)
    prev = ""            # the last significant token: "" (start), "word:<w>", "num", or the punctuator itself
    stack = []           # template literals we are inside the ${...} of: the brace depth at their start
    depth = 0
    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n and src[i + 1] == "/":
            j = src.find("\n", i)
            j = n if j < 0 else j
            i = _drop(out, src, i, j, False)
            continue
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            if j < 0:
                raise ValueError("an unclosed /* comment at %d" % i)
            j += 2
            if KEEP.search(src[i:j]):
                out.add(src[i:j]); i = j; continue
            i = _drop(out, src, i, j, "\n" in src[i:j])
            continue
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c:
                if src[j] == "\\":
                    j += 1
                elif src[j] == "\n":
                    raise ValueError("a line break inside a string at %d" % j)
                j += 1
            out.add(src[i:j + 1]); i = j + 1; prev = "str"; continue
        if c == "`" or (c == "}" and stack and depth == stack[-1]):
            if c == "}":
                stack.pop()
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2; continue
                if src[j] == "`":
                    j += 1; prev = "str"; break
                if src[j] == "$" and j + 1 < n and src[j + 1] == "{":
                    j += 2; stack.append(depth); prev = "{"; break
                j += 1
            else:
                raise ValueError("an unclosed template literal at %d" % i)
            out.add(src[i:j]); i = j; continue
        if c == "/":
            regex = prev == "" or (prev.startswith("word:") and prev[5:] in REGEX_AFTER_WORDS) or (not prev.startswith("word:") and prev not in ("num", "str", ")", "]"))
            if regex:
                j, cls = i + 1, False
                while j < n:
                    d = src[j]
                    if d == "\\":
                        j += 2; continue
                    if d == "\n":
                        raise ValueError("a line break inside a regex literal at %d" % i)
                    if d == "[":
                        cls = True
                    elif d == "]":
                        cls = False
                    elif d == "/" and not cls:
                        break
                    j += 1
                j += 1
                while j < n and ID.match(src[j]):
                    j += 1
                out.add(src[i:j]); i = j; prev = "str"; continue
            out.add(c); i += 1; prev = "/"; continue
        if c.isspace():
            j = i
            while j < n and src[j].isspace():
                j += 1
            out.add(src[i:j]); i = j; continue
        if ID.match(c):
            j = i
            while j < n and ID.match(src[j]):
                j += 1
            w = src[i:j]
            out.add(w); i = j
            prev = "num" if w[0].isdigit() else "word:" + w
            continue
        if c == ".":
            if prev == "num":     # 1.5, 2.e3: still the number
                out.add(c); i += 1; continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
        out.add(c); i += 1; prev = c
    if stack:
        raise ValueError("an unclosed ${ in a template literal")
    return (out.text(), out.found) if collect else out.text()


def css(src, collect=False):
    out, i, n = _Out(), 0, len(src)
    while i < n:
        c = src[i]
        if c == "/" and i + 1 < n and src[i + 1] == "*":
            j = src.find("*/", i + 2)
            if j < 0:
                raise ValueError("an unclosed /* comment at %d" % i)
            j += 2
            if KEEP.search(src[i:j]):
                out.add(src[i:j]); i = j; continue
            i = _drop(out, src, i, j, False)
            continue
        if c in "'\"":
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == "\\" else 1
            out.add(src[i:j + 1]); i = j + 1; continue
        if src.startswith("url(", i) and not re.match(r"url\(\s*['\"]", src[i:i + 10]):
            j = src.find(")", i)
            j = n if j < 0 else j + 1
            out.add(src[i:j]); i = j; continue
        out.add(c); i += 1
    return (out.text(), out.found) if collect else out.text()


SCRIPT_JS = re.compile(r"""\btype\s*=\s*["']?(?!(?:text/javascript|module|application/javascript)\b)""", re.I)


def html(src, collect=False):
    out, found, i, n = [], [], 0, len(src)
    low = src.lower()
    while i < n:
        j = src.find("<", i)
        if j < 0:
            out.append(src[i:]); break
        out.append(src[i:j]); i = j
        if src.startswith("<!--", i):
            k = src.find("-->", i + 4)
            if k < 0:
                raise ValueError("an unclosed <!-- at %d" % i)
            k += 3
            found.append(src[i:k])
            # alone on its line: the line goes
            line_start = "".join(out).rfind("\n") + 1
            before = "".join(out)[line_start:]
            m = re.match(r"[ \t]*\r?\n", src[k:])
            if not before.strip(" \t") and (m or k >= n):
                whole = "".join(out)
                out = [whole[:line_start]]
                k += m.end() if m else 0
            i = k
            continue
        m = re.match(r"<(script|style)\b[^>]*>", src[i:], re.I)
        if m:
            tag, opening = m.group(1).lower(), m.group(0)
            body_start = i + len(opening)
            end = low.find("</" + tag, body_start)
            if end < 0:
                raise ValueError("an unclosed <%s> at %d" % (tag, i))
            body = src[body_start:end]
            if tag == "style":
                body, f = css(body, True)
            elif not SCRIPT_JS.search(opening[:-1]) and not re.search(r"\bsrc\s*=", opening, re.I):
                body, f = js(body, True)
            else:
                f = []
            found += f
            out.append(opening + body); i = end
            continue
        m = re.match(r"<[A-Za-z/!][^>\"']*(?:(?:\"[^\"]*\"|'[^']*')[^>\"']*)*>", src[i:])
        if m:                                            # a tag, its attributes (quotes may hold "<" or "-->") kept as they are
            out.append(m.group(0)); i += len(m.group(0)); continue
        out.append("<"); i += 1
    text = "".join(out)
    return (text, found) if collect else text


def kind(path):
    return {".js": "js", ".mjs": "js", ".css": "css", ".html": "html"}.get(os.path.splitext(path)[1].lower())


def comments(k, text):
    return {"js": js, "css": css, "html": html}[k](text, True)[1]


def verify(path, before, after):
    """With ESBUILD set: esbuild --minify of the file before and after must be the same bytes (the same program)."""
    exe, k = os.environ.get("ESBUILD"), kind(path)
    if not exe or k not in ("js", "css"):
        return
    outs = []
    for text in (before, after):
        r = subprocess.run([exe, "--minify", "--legal-comments=none", "--loader=" + k, "--log-level=error"], input=text.encode("utf-8"), capture_output=True)
        if r.returncode:
            raise ValueError("esbuild could not read %s (%s): %s" % (path, "before" if not outs else "after", r.stderr.decode()[:300]))
        outs.append(r.stdout)
    if outs[0] != outs[1]:
        raise ValueError("stripping the comments changed %s as a program (esbuild --minify differs)" % path)


def file(path):
    """Strip one emitted file in place."""
    k = kind(path)
    if not k:
        return
    with open(path, encoding="utf-8") as f:
        before = f.read()
    after = {"js": js, "css": css, "html": html}[k](before)
    verify(path, before, after)
    if after != before:
        with open(path, "w", encoding="utf-8") as f:
            f.write(after)


if __name__ == "__main__":
    if sys.argv[1:2] == ["--comments"]:              # every comment in the files, one JSON line each (tools/test_demo.js)
        import json
        for p in sys.argv[2:]:
            k = kind(p)
            for c in (comments(k, open(p, encoding="utf-8").read()) if k else []):
                print(json.dumps({"file": p, "text": c}))
        sys.exit(0)
    if sys.argv[1:2] != ["--check"]:
        sys.exit(__doc__)
    bad = 0
    for p in sys.argv[2:]:
        k = kind(p)
        left = [c for c in comments(k, open(p, encoding="utf-8").read()) if not KEEP.search(c)] if k else []
        if left:
            bad += 1
            print("%s: %d comment(s), first: %s" % (p, len(left), left[0][:100].replace("\n", " ")))
    sys.exit(1 if bad else 0)
