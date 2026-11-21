// Studio's emails, as { subject, html, text }. Four, and only four (Evan, 2026-11-20):
//
//   confirmEmail   "Confirm your spot"       designed: the 6-digit code and the one-tap button (sent by the Worker on sign-up)
//   youreInEmail   "You're in, {first}"      NOT designed: a plain note from Evan, Gmail-native, replies go to hello@
//   inviteEmail    "Your Studio invite is here"   designed: the access link and 14 days free (held for launch)
//   welcomeEmail   "Welcome to Studio"       designed: the download, right after an app sign-up
//
// Built for every inbox: tables and inline CSS, solid colours behind every translucent one, dark by design and the same in light
// and dark mode, readable with images off (each hero sits on a colour, with alt text), no scripts, no tracking of our own, one link
// to askstudio.ai, a plain-text part, well under Gmail's 102 KB clip. Images live on askstudio.ai/assets/email/.

const SITE = "https://askstudio.ai";
const FONT = "'Hanken Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'Studio Mono','IBM Plex Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace";
const C = { night: "#0B0F14", panel: "#171c24", top: "#1b2029", bot: "#14181f", rim: "#2b313b", ink: "#FFFFFF", body: "#d9dcdf", soft: "#b3b7bc", dim: "#868a90", sand: "#f5f3ee", jet: "#0B0F14", pill: "#222833", pillrim: "#3a414c" };

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const one = (v, max = 80) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// The designed frame, in the waitlist's look: the scene (one hosted image of the real glass on a Studio wallpaper, rendered at 2x
// from the site's own components, with alt text that carries the message), then live text on a deep glass panel, then the footer.
function designed({ title, preheader, hero, heroAlt, kicker, headline, intro, middle = "", button, fine, footer = "", site = SITE }) {
  const btn = button ? `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 0;"><tr><td align="center" bgcolor="${C.sand}" style="border-radius:999px;background:${C.sand};">
<a href="${esc(button.href)}" style="display:inline-block;padding:17px 34px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:600;letter-spacing:-0.1px;color:${C.jet};text-decoration:none;border-radius:999px;">${esc(button.label)}&nbsp;&nbsp;&rarr;</a>
</td></tr></table>
<table role="presentation" width="300" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;width:300px;"><tr><td width="300" height="21" background="${esc(site + "/assets/email/beam-glow.png")}" style="width:300px;height:21px;line-height:21px;font-size:0;background-image:url('${esc(site + "/assets/email/beam-glow.png")}');background-repeat:no-repeat;background-size:300px 21px;background-position:center top;">&nbsp;</td></tr></table>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;600&display=swap" rel="stylesheet">
<style>@font-face{font-family:'Studio Mono';font-weight:500;src:url(${site}/assets/fonts/IBMPlexMono-Medium.woff) format('woff')}@font-face{font-family:'Studio Mono';font-weight:400;src:url(${site}/assets/fonts/IBMPlexMono-Regular.woff) format('woff')}
:root{color-scheme:dark;supported-color-schemes:dark}body{margin:0;padding:0;background:${C.night}}a{color:${C.ink}}
@media (max-width:480px){.px{padding-left:26px!important;padding-right:26px!important;padding-top:32px!important}.h1{font-size:33px!important;line-height:37px!important}.code{font-size:28px!important;letter-spacing:6px!important;padding:16px 16px 16px 22px!important}}</style></head>
<body bgcolor="${C.night}" style="margin:0;padding:0;background:${C.night};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.night};">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.night}" style="background:${C.night};">
<tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td bgcolor="#1b2029" style="background:#1b2029;border-radius:24px;overflow:hidden;line-height:0;font-size:0;">
<img src="${esc(site + "/assets/email/" + hero)}" width="600" height="420" alt="${esc(heroAlt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:24px;font-family:${FONT};font-size:18px;line-height:26px;color:${C.ink};"></td></tr>
<tr><td height="12" style="height:12px;line-height:12px;font-size:12px;">&nbsp;</td></tr>
<tr><td bgcolor="${C.panel}" style="background:${C.panel};background-image:linear-gradient(180deg,${C.top},${C.bot});border:1px solid ${C.rim};border-radius:24px;box-shadow:inset 1px 1px 1px -1px rgba(255,255,255,.6),inset -1px -1px 1px -1px rgba(255,255,255,.5);">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="px" style="padding:40px 46px 38px;font-family:${FONT};color:${C.body};">
${kicker ? `<div style="font-family:${MONO};font-size:11px;line-height:14px;font-weight:500;letter-spacing:3px;text-transform:uppercase;color:${C.soft};margin:0 0 16px;">${esc(kicker)}</div>` : ""}
<h1 class="h1" style="margin:0 0 14px;font-family:${FONT};font-size:40px;line-height:44px;font-weight:300;letter-spacing:-1.2px;color:${C.ink};">${headline}</h1>
<p style="margin:0 0 30px;font-size:16px;line-height:26px;color:${C.body};">${intro}</p>
${middle}${btn}
${fine ? `<p style="margin:24px 0 0;font-size:13px;line-height:20px;color:${C.dim};">${fine}</p>` : ""}
</td></tr></table></td></tr>
<tr><td align="center" style="padding:30px 12px 0;"><img src="${esc(site + "/assets/email/studio-lockup.png")}" width="92" height="26" alt="Studio" style="display:block;margin:0 auto 14px;width:92px;height:26px;border:0;font-family:${FONT};font-size:16px;font-weight:600;color:${C.ink};">
<div style="font-family:${MONO};font-size:10px;line-height:17px;letter-spacing:2.4px;text-transform:uppercase;color:${C.dim};"><a href="${SITE}" style="color:${C.dim};text-decoration:none;">askstudio.ai</a> &middot; Nicolini Productions LLC${footer}</div></td></tr>
</table></td></tr></table></body></html>`;
}

// 1. Confirm your spot: the code, big, and the one-tap button.
export function confirmEmail(first, code, link) {
  const name = one(first), hi = name ? "Hi " + name + "," : "Hi,";
  const spaced = code.slice(0, 3) + " " + code.slice(3);
  const subject = "Confirm your spot";
  const text = [hi, "", "Your Studio code is " + spaced + ".", "", "Enter it on the page, or confirm here:", link, "",
    "The code works for 10 minutes and the link for 24 hours. Didn't sign up? Ignore this and nothing happens.", "", "Studio", "askstudio.ai"].join("\n");
  const middle = `<div style="font-family:${MONO};font-size:10px;line-height:14px;font-weight:500;letter-spacing:2.6px;text-transform:uppercase;color:${C.dim};text-align:center;margin:0 0 10px;">Your code</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 30px;"><tr>
<td class="code" align="center" bgcolor="${C.pill}" style="background:${C.pill};background-image:linear-gradient(180deg,#2a313c,#1f252e);border:1px solid ${C.pillrim};border-radius:999px;padding:18px 22px 18px 32px;font-family:${MONO};font-size:34px;line-height:38px;font-weight:500;letter-spacing:10px;color:${C.ink};box-shadow:inset 1px 1px 1px -1px rgba(255,255,255,.6),inset -1px -1px 1px -1px rgba(255,255,255,.5);">${spaced}</td></tr></table>`;
  const html = designed({
    title: subject, preheader: "Your code is " + spaced + ". It works for 10 minutes.", hero: "hero-confirm.jpg", heroAlt: "Studio. Confirm your spot: your code is " + spaced + ".",
    kicker: "Early access · Confirm", headline: "Confirm your spot.", intro: esc(hi) + " here's your code. Enter it on the page, or tap the button, to hold your place in line.",
    middle, button: { label: "Confirm my spot", href: link },
    fine: "The code works for 10 minutes and the button for 24 hours. Didn't sign up? Ignore this email and nothing happens.",
  });
  return { subject, html, text };
}

// 2. You're in: a plain note from Evan. No design, no images, no tracking; it should look like he typed it.
export function youreInEmail(first, place, refLink, passLink) {
  const name = one(first) || "there";
  const subject = "You're in, " + name;
  const lines = [
    `Hey ${name}, it's Evan from Studio.`,
    `You're #${Number(place).toLocaleString("en-US")} on the list. Quick favour: reply 'yes' so I know this landed (it also keeps us out of your spam).`,
    `Your link to move up: ${refLink}`,
  ];
  if (passLink) lines.push(`Your pass, to see friends join (just for you): ${passLink}`);
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>` +
    `<div>${esc(lines[0])}</div><div><br></div><div>${esc(lines[1])}</div><div><br></div><div>Your link to move up: <a href="${esc(refLink)}">${esc(refLink)}</a></div>` +
    (passLink ? `<div><br></div><div>Your pass, to see friends join (just for you): <a href="${esc(passLink)}">${esc(passLink)}</a></div>` : "") +
    `</body></html>`;
  return { subject, html, text: lines.join("\n\n"), sender: { name: "Evan from Studio", email: "hello@askstudio.ai" }, replyTo: { name: "Evan from Studio", email: "hello@askstudio.ai" } };
}

// 3. Your invite is here (held for launch): the access link, and 14 days free.
// It goes to the waitlist (a list), so its footer carries the unsubscribe link and the company's postal address (CAN-SPAM).
// unsubscribe defaults to Brevo's own tag; address is the company's mailing address (Evan, 2026-11-20).
export function inviteEmail(first, accessLink, { unsubscribe = "{{ unsubscribe }}", address = "4328 Del Mar Ave, San Diego, CA 92107" } = {}) {
  const name = one(first), subject = "Your Studio invite is here";
  const text = [(name ? name + ", your" : "Your") + " invite to Studio is here.", "", "Your 14 days of everything, free, start when you open it.", "",
    "Open your invite:", accessLink, "", "This link is just for you.", "", "Studio", "askstudio.ai", "Nicolini Productions LLC · " + address, "",
    "You're getting this because you joined the Studio waitlist. Unsubscribe: " + unsubscribe].join("\n");
  const pass = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 30px;"><tr>
<td width="50%" style="padding:16px 18px;border:1px solid ${C.rim};border-radius:16px 0 0 16px;background:#1a1f27;box-shadow:inset 1px 1px 1px -1px rgba(255,255,255,.6),inset -1px -1px 1px -1px rgba(255,255,255,.5);"><div style="font-family:${MONO};font-size:10px;line-height:14px;font-weight:500;letter-spacing:2.4px;text-transform:uppercase;color:${C.dim};">Trial</div><div style="margin-top:6px;font-family:${FONT};font-size:17px;line-height:22px;color:${C.ink};">14 days, free</div></td>
<td width="50%" style="padding:16px 18px;border:1px solid ${C.rim};border-left:0;border-radius:0 16px 16px 0;background:#1a1f27;box-shadow:inset 1px 1px 1px -1px rgba(255,255,255,.6),inset -1px -1px 1px -1px rgba(255,255,255,.5);"><div style="font-family:${MONO};font-size:10px;line-height:14px;font-weight:500;letter-spacing:2.4px;text-transform:uppercase;color:${C.dim};">For</div><div style="margin-top:6px;font-family:${FONT};font-size:17px;line-height:22px;color:${C.ink};">Your Mac</div></td>
</tr></table>`;
  const html = designed({
    title: subject, preheader: "Studio is ready for you. 14 days of everything, free.", hero: "hero-invite.jpg", heroAlt: "Studio. Your invite is here: 14 days of everything, free.",
    kicker: "Your invite", headline: name ? esc(name) + ", Studio is ready." : "Studio is ready.",
    intro: "Your invite is here. Open it to start your 14 days of everything, free. One prompt, and the idea in your head becomes a finished video.",
    middle: pass, button: { label: "Open my invite", href: accessLink },
    fine: "This link is just for you. Questions? Reply to this email.",
    footer: `<br>${esc(address)}<br><br>You joined the Studio waitlist &middot; <a href="${esc(unsubscribe)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>`,
  });
  return { subject, html, text };
}

// 4. Welcome to Studio: the download, right after an app sign-up.
export function welcomeEmail(first, downloadLink) {
  const name = one(first), subject = "Welcome to Studio";
  const steps = ["Open Studio and sign in with this email.", "Tell it what you want to make.", "Watch your first video come together."];
  const text = [(name ? "Welcome to Studio, " + name + "." : "Welcome to Studio."), "", "Your download:", downloadLink, "", ...steps.map((s, i) => (i + 1) + ". " + s), "",
    "Make your first video before you pay anything.", "", "Studio", "askstudio.ai"].join("\n");
  const list = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 30px;">` +
    steps.map((s, i) => `<tr><td width="40" valign="top" style="padding:12px 0;border-top:1px solid ${C.rim};font-family:${MONO};font-size:11px;line-height:24px;font-weight:500;letter-spacing:2px;color:${C.soft};">0${i + 1}</td>
<td valign="top" style="padding:12px 0;border-top:1px solid ${C.rim};font-family:${FONT};font-size:16px;line-height:24px;color:${C.body};">${esc(s)}</td></tr>`).join("") + `</table>`;
  const html = designed({
    title: subject, preheader: "Your download is ready. Make your first video before you pay.", hero: "hero-welcome.jpg", heroAlt: "Studio, on your Mac. Welcome to Studio.",
    kicker: "Welcome", headline: name ? "Welcome to Studio, " + esc(name) + "." : "Welcome to Studio.",
    intro: "Studio is yours to try. Download it, and make your first video before you pay anything.",
    middle: list, button: { label: "Download Studio for Mac", href: downloadLink },
    fine: "Questions? Just reply to this email.",
  });
  return { subject, html, text };
}
