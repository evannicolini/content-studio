// Studio's emails, as { subject, html, text }. Four, and only four (Evan, 2026-11-20):
//
//   confirmEmail   "Confirm your spot"       designed: the 6-digit code and the one-tap button (sent by the Worker on sign-up)
//   youreInEmail   "You're in, {first}"      NOT designed: a plain note from Evan, Gmail-native, replies go to hello@
//   inviteEmail    "{first}, your Studio invite is here"   designed: the access link and 14 days free, in Evan's voice (held for launch)
//   inviteText     the invite-ready SMS (not an email): Evan's voice, their first name
//   welcomeEmail   "Welcome to Studio"       designed: the download, right after an app sign-up
//
// Built for every inbox: tables and inline CSS, solid colours only (no borders, no glows), black by design, a VML button for
// Outlook, readable with images off (each hero sits on a colour, with alt text), no scripts, no tracking of our own, one link
// to askstudio.ai, a plain-text part, well under Gmail's 102 KB clip. Images live on askstudio.ai/assets/email/.

const SITE = "https://askstudio.ai";
const FONT = "'Hanken Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'Studio Mono','IBM Plex Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace";
// Black, like Studio in dark mode. Neutral greys only: no blue, no teal, no borders, no glow.
const C = { night: "#000000", ink: "#FFFFFF", body: "#d4d4d4", soft: "#9a9a9a", dim: "#6f6f6f", sand: "#f5f3ee", jet: "#000000", well: "#161616" };

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const one = (v, max = 80) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
// a link as a person would type it: no https://, no #section
const shown = (u) => String(u).replace(/^https?:\/\//, "").replace(/#.*$/, "").replace(/\/$/, "");

// The sand button, bulletproof: a padded link on a coloured cell for every client, and a VML pill for Outlook on Windows.
function button({ label, href }) {
  const w = Math.max(200, Math.round(label.length * 9.4 + 84));
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;"><tr><td align="center" bgcolor="${C.sand}" style="border-radius:999px;background:${C.sand};">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(href)}" style="height:52px;v-text-anchor:middle;width:${w}px;" arcsize="50%" stroke="f" fillcolor="${C.sand}"><w:anchorlock/><center style="color:${C.jet};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${esc(label)} &rarr;</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${esc(href)}" style="display:inline-block;padding:16px 30px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:600;color:${C.jet};text-decoration:none;border-radius:999px;mso-hide:all;">${esc(label)}&nbsp;&nbsp;&rarr;</a><!--<![endif]-->
</td></tr></table>`;
}
const label = (t, extra = "") => `<div style="font-family:${MONO};font-size:10.5px;line-height:14px;font-weight:500;letter-spacing:2.6px;text-transform:uppercase;color:${C.soft};${extra}">${esc(t)}</div>`;

// The designed frame: the scene (one hosted image of the real pass or the real Studio Home on a Studio wallpaper, rendered at 2x,
// with alt text that carries the message), then live text straight on black, then a quiet footer. Solid colours only, so a client
// that inverts colours (Gmail on iPhone) turns it into a clean light email instead of breaking it.
function designed({ title, preheader, hero, heroAlt, kicker, headline, intro, middle = "", button: b, fine, footer = "", site = SITE }) {
  return `<!doctype html><html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;600&display=swap" rel="stylesheet">
<style>@font-face{font-family:'Studio Mono';font-weight:500;src:url(${site}/assets/fonts/IBMPlexMono-Medium.woff) format('woff')}@font-face{font-family:'Studio Mono';font-weight:400;src:url(${site}/assets/fonts/IBMPlexMono-Regular.woff) format('woff')}
:root{color-scheme:dark;supported-color-schemes:dark}body{margin:0;padding:0;background:${C.night}}a{color:${C.ink}}
@media (max-width:480px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:32px!important;line-height:36px!important}.code{font-size:28px!important;letter-spacing:6px!important}.ft{letter-spacing:1.2px!important;font-size:9.5px!important}}</style>
<!--[if mso]><style>body,table,td,a,h1,p,div{font-family:Arial,sans-serif!important}</style><![endif]--></head>
<body bgcolor="${C.night}" style="margin:0;padding:0;background:${C.night};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.night};mso-hide:all;">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.night}" style="background:${C.night};">
<tr><td align="center" style="padding:24px 12px 40px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td bgcolor="${C.night}" style="background:${C.night};border-radius:22px;overflow:hidden;line-height:0;font-size:0;">
<img src="${esc(site + "/assets/email/" + hero)}" width="600" height="420" alt="${esc(heroAlt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:22px;font-family:${FONT};font-size:18px;line-height:26px;color:${C.ink};"></td></tr>
<tr><td class="px" style="padding:40px 36px 8px;font-family:${FONT};color:${C.body};">
${kicker ? label(kicker, "margin:0 0 18px;") : ""}
<h1 class="h1" style="margin:0 0 16px;font-family:${FONT};font-size:40px;line-height:44px;font-weight:300;letter-spacing:-1.2px;color:${C.ink};">${headline}</h1>
<p style="margin:0 0 32px;font-size:17px;line-height:27px;color:${C.body};">${intro}</p>
${middle}${b ? button(b) : ""}
${fine ? `<p style="margin:32px 0 0;font-size:13.5px;line-height:21px;color:${C.soft};">${fine}</p>` : ""}
</td></tr>
<tr><td class="px" style="padding:48px 36px 0;"><img src="${esc(site + "/assets/email/studio-lockup.png")}" width="84" height="24" alt="Studio" style="display:block;margin:0 0 14px;width:84px;height:24px;border:0;font-family:${FONT};font-size:16px;font-weight:600;color:${C.ink};">
<div class="ft" style="font-family:${MONO};font-size:10px;line-height:17px;letter-spacing:2.2px;text-transform:uppercase;color:${C.dim};"><a href="${SITE}" style="color:${C.dim};text-decoration:none;">askstudio.ai</a> &middot; Nicolini Productions LLC${footer}</div></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

// 1. Confirm your spot: the code, big, and the one-tap button.
export function confirmEmail(first, code, link) {
  const name = one(first), hi = name ? "Hi " + name + "," : "Hi,";
  const spaced = code.slice(0, 3) + " " + code.slice(3);
  const subject = "Confirm your spot";
  const text = [hi, "", "Your Studio code is " + spaced + ".", "", "Enter it on the page, or confirm here:", link, "",
    "The code works for 10 minutes and the link for 24 hours. Didn't sign up? Ignore this and nothing happens.", "", "Studio", "askstudio.ai"].join("\n");
  const middle = label("Your code", "margin:0 0 12px;") + `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;"><tr>
<td class="code" bgcolor="${C.well}" style="background:${C.well};border-radius:16px;padding:18px 26px 18px 30px;font-family:${MONO};font-size:34px;line-height:38px;font-weight:500;letter-spacing:10px;color:${C.ink};">${spaced}</td></tr></table>`;
  const html = designed({
    title: subject, preheader: "Your code is " + spaced + ". It works for 10 minutes.", hero: "hero-confirm.jpg", heroAlt: "Studio. Confirm your spot: your code is " + spaced + ".",
    kicker: "Early access", headline: "Confirm your spot.", intro: esc(hi) + " here's your code. Enter it on the page, or tap the button, to hold your place in line.",
    middle, button: { label: "Confirm my spot", href: link },
    fine: "The code works for 10 minutes and the button for 24 hours. Didn't sign up? Ignore this email and nothing happens.",
  });
  return { subject, html, text };
}

// 2. You're in: a plain note from Evan that looks like he wrote it in Gmail. No design, no images, no tracking, links written
// the way a person types them. Gmail's own markup (dir="ltr" divs) in Gmail's font, so no client falls back to a serif.
export function youreInEmail(first, place, refLink, passLink) {
  const name = one(first) || "there";
  const subject = "You're in, " + name;
  const n = Number(place).toLocaleString("en-US");
  const text = [`Hey ${name}, it's Evan from Studio.`,
    `You're #${n} on the list. Quick favour: reply "yes" so I know this landed (it also keeps us out of your spam).`,
    `Want to move up? Send a friend your link: ${refLink}`,
    ...(passLink ? [`You can watch them join on your pass: ${passLink}`] : []), "Evan"].join("\n\n");
  const a = (href, t) => `<a href="${esc(href)}">${esc(t)}</a>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"></head><body>` +
    `<div dir="ltr" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">` +
    `<div>Hey ${esc(name)}, it's Evan from Studio.</div><div><br></div>` +
    `<div>You're #${n} on the list. Quick favour: reply "yes" so I know this landed (it also keeps us out of your spam).</div><div><br></div>` +
    `<div>Want to move up? Send a friend your link: ${a(refLink, shown(refLink))}</div>` +
    (passLink ? `<div><br></div><div>You can watch them join on ${a(passLink, "your pass")}.</div>` : "") +
    `<div><br></div><div>Evan</div></div></body></html>`;
  return { subject, html, text, sender: { name: "Evan from Studio", email: "hello@askstudio.ai" }, replyTo: { name: "Evan from Studio", email: "hello@askstudio.ai" } };
}

// 3. Your invite is here (held for launch): the access link, and 14 days free, in Evan's voice.
// It goes to the waitlist (a list), so its footer carries the unsubscribe link and the company's postal address (CAN-SPAM).
// unsubscribe defaults to Brevo's own tag; address is the company's mailing address (Evan, 2026-11-20).
export function inviteEmail(first, accessLink, { unsubscribe = "{{ unsubscribe }}", address = "4328 Del Mar Ave, San Diego, CA 92107" } = {}) {
  const name = one(first), subject = name ? name + ", your Studio invite is here" : "Your Studio invite is here";
  const text = [(name ? `Hey ${name}, it's Evan.` : "Hey, it's Evan."), "", "Your spot came up, so Studio's all yours: 14 days of everything, free.", "",
    "Open your invite on your Mac:", accessLink, "", "This link is just for you. Questions? Just reply, it comes straight to me.", "",
    "Studio", "askstudio.ai", "Nicolini Productions LLC · " + address, "", "You're getting this because you joined the Studio waitlist. Unsubscribe: " + unsubscribe].join("\n");
  const cols = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 34px;"><tr>
<td valign="top" style="padding:0 44px 0 0;">${label("Trial")}<div style="margin-top:7px;font-family:${FONT};font-size:18px;line-height:23px;color:${C.ink};">14 days, free</div></td>
<td valign="top">${label("For")}<div style="margin-top:7px;font-family:${FONT};font-size:18px;line-height:23px;color:${C.ink};">Your Mac</div></td>
</tr></table>`;
  const html = designed({
    title: subject, preheader: "It's Evan. Your spot came up: 14 days of Studio, free.", hero: "hero-invite.jpg", heroAlt: "Studio. Your invite is here: 14 days of everything, free.",
    kicker: "Your invite", headline: name ? esc(name) + ", you're in." : "You're in.",
    intro: "It's Evan. Your spot came up, so Studio's all yours: 14 days of everything, free. Open it on your Mac, tell it what you want to make, and watch it come together.",
    middle: cols, button: { label: "Open my invite", href: accessLink },
    fine: "This link is just for you. Questions? Just reply, it comes straight to me.",
    footer: `<br>${esc(address)}<br><br>You joined the Studio waitlist &middot; <a href="${esc(unsubscribe)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>`,
  });
  return { subject, html, text };
}

// The invite-ready text (Brevo SMS, toll-free; only to people who ticked "text me when my invite is ready"). Evan's voice, their
// first name, the brand first and the opt-out last, as the carrier needs.
export function inviteText(first, link = "askstudio.ai/start") {
  const name = one(first, 40);
  return `Studio: Hey${name ? " " + name : ""}, it's Evan. Your Studio invite is ready! Open it on your Mac: ${shown(link)} Reply STOP to opt out.`;
}

// 4. Welcome to Studio: the download, right after an app sign-up.
export function welcomeEmail(first, downloadLink) {
  const name = one(first), subject = "Welcome to Studio";
  const steps = ["Open Studio and sign in with this email.", "Tell it what you want to make.", "Watch your first video come together."];
  const text = [(name ? "Welcome to Studio, " + name + "." : "Welcome to Studio."), "", "Your download:", downloadLink, "", ...steps.map((s, i) => (i + 1) + ". " + s), "",
    "Make your first video before you pay anything.", "", "Studio", "askstudio.ai"].join("\n");
  const list = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 34px;">` +
    steps.map((s, i) => `<tr><td width="40" valign="top" style="padding:0 0 14px;font-family:${MONO};font-size:11px;line-height:25px;font-weight:500;letter-spacing:2px;color:${C.soft};">0${i + 1}</td>
<td valign="top" style="padding:0 0 14px;font-family:${FONT};font-size:17px;line-height:25px;color:${C.body};">${esc(s)}</td></tr>`).join("") + `</table>`;
  const html = designed({
    title: subject, preheader: "Your download is ready. Make your first video before you pay.", hero: "hero-welcome.jpg", heroAlt: "Studio, on your Mac. Welcome to Studio.",
    kicker: "Welcome", headline: name ? "Welcome to Studio, " + esc(name) + "." : "Welcome to Studio.",
    intro: "Studio is yours to try. Download it, and make your first video before you pay anything.",
    middle: list, button: { label: "Download Studio for Mac", href: downloadLink },
    fine: "Questions? Just reply to this email.",
  });
  return { subject, html, text };
}
