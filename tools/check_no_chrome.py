#!/usr/bin/env python3
"""Fails (exit 1) if any tool could start the owner's Google Chrome instead of Playwright's own headless shell.

Every page test and capture launches through tools/browser.js (chrome-headless-shell, audio muted). Anything else here that
names the installed Chrome (channel "chrome"/"msedge", the app's path) or launches Chromium itself is refused.
Run: python3 tools/check_no_chrome.py   (python3 build.py runs it first and stops on a failure)
"""
import os, re, sys

TOOLS = os.path.dirname(os.path.abspath(__file__))
EXT = (".js", ".mjs", ".cjs", ".ts", ".py", ".sh")
BAD = [
    (re.compile(r"""channel\s*[:=]\s*["'](chrome|msedge)[^"']*["']"""), 'channel "chrome": the installed Chrome'),
    (re.compile(r"Google Chrome\.app|/Applications/Google Chrome"), "the installed Chrome's path"),
    (re.compile(r"\b(chromium|firefox|webkit)\.(launch|launchPersistentContext|launchServer)\s*\("), "a launch outside tools/browser.js"),
    (re.compile(r"""require\(\s*["']playwright(-core)?["']\s*\)|from\s+["']playwright(-core)?["']"""), "playwright loaded directly; use require(\"./browser\")"),
]
ALLOWED = {"browser.js", "check_no_chrome.py"}   # browser.js is the one launcher; this file names the patterns

def problems():
    out = []
    for d, dirs, files in os.walk(TOOLS):
        dirs[:] = [x for x in dirs if x not in ("node_modules", ".git")]
        for f in files:
            if not f.endswith(EXT) or f in ALLOWED:
                continue
            p = os.path.join(d, f)
            try:
                lines = open(p, encoding="utf-8", errors="replace").read().splitlines()
            except OSError:
                continue
            for i, line in enumerate(lines, 1):
                for rx, why in BAD:
                    if rx.search(line):
                        out.append(f"{os.path.relpath(p, os.path.dirname(TOOLS))}:{i}: {why}")
    return out

if __name__ == "__main__":
    bad = problems()
    if bad:
        print("Refused: these could start the owner's Google Chrome. Launch through tools/browser.js instead.", file=sys.stderr)
        print("\n".join("  " + b for b in bad), file=sys.stderr)
        sys.exit(1)
    print("no-chrome check: ok")
