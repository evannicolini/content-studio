// Studio's emails, as { subject, html, text }. Four, and only four (Evan, 2026-11-20), plus the Mac link (macEmail) and the
// "a friend joined" note (friendJoinedEmail, Evan 2026-11-21: "where do I go to come back to see if my friends sign up"):
//
//   (the designed three take { theme: "light" } as their last argument; dark is the default)
//   confirmEmail   "Confirm your spot"       designed: the 6-digit code and the one-tap button (sent by the Worker on sign-up)
//   youreInEmail   "You're in, {first}"      NOT designed: a plain note from Evan, Gmail-native, replies go to hello@
//   inviteEmail    "{first}, your Studio invite is here"   designed: the access link and 14 days free, in Evan's voice (held for launch)
//   inviteText     the invite-ready SMS (not an email): Evan's voice, their first name
//   welcomeEmail   "Welcome to Studio"       designed: the download, right after an app sign-up
//   friendJoinedEmail "{friend} just joined Studio with your link"   designed, no hero: to the inviter, n of 3, the pass link
//
// Built for every inbox: tables and inline CSS, solid colours only (no borders, no glows), black by design, a VML button for
// Outlook, readable with images off (each hero sits on a colour, with alt text), no scripts, no tracking of our own, one link
// to askstudio.ai, a plain-text part, well under Gmail's 102 KB clip. Images live on askstudio.ai/assets/email/.

const SITE = "https://askstudio.ai";
const FONT = "'Hanken Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'Studio Mono','IBM Plex Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace";
// Two themes (Evan, v4): dark (black, like Studio in dark mode) and light (the sand page, near-black ink). Neutral greys only: no blue,
// no teal, no borders, no glow. Each designed email takes { theme: "light" }; dark is the default. C is the palette of the email being
// built (set at the start of each one, synchronously, and put back after).
const DARK = { name: "dark", night: "#000000", ink: "#FFFFFF", body: "#d4d4d4", soft: "#9a9a9a", dim: "#6f6f6f", sand: "#f5f3ee", jet: "#000000", well: "#161616", lockup: "studio-lockup.png", lw: 110, lh: 31, apple: "apple-black.png" };
const LIGHT = { name: "light", night: "#f5f3ee", ink: "#111111", body: "#333333", soft: "#6b6b6b", dim: "#8a8a8a", sand: "#111111", jet: "#f5f3ee", well: "#e7e3da", lockup: "studio-lockup-ink.png", lw: 106, lh: 30, apple: "apple-white.png" };
let C = DARK;
const themed = (o, make) => { C = o && o.theme === "light" ? LIGHT : DARK; try { return make(); } finally { C = DARK; } };

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const one = (v, max = 80) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
// a link as a person would type it: no https://, no #section
const shown = (u) => String(u).replace(/^https?:\/\//, "").replace(/#.*$/, "").replace(/\/$/, "");

// The sand button, bulletproof: a padded link on a coloured cell for every client, and a VML pill for Outlook on Windows.
function button({ label, href, apple = false }, site = SITE) {
  const w = Math.max(200, Math.round(label.length * 9.4 + 84 + (apple ? 26 : 0)));
  const mark = apple ? `<img src="${esc(site + "/assets/email/" + C.apple)}" width="17" height="16" alt="" style="display:inline-block;width:17px;height:16px;border:0;vertical-align:-2px;margin-right:9px;">` : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0;"><tr><td align="center" bgcolor="${C.sand}" style="border-radius:999px;background:${C.sand};">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(href)}" style="height:52px;v-text-anchor:middle;width:${w}px;" arcsize="50%" stroke="f" fillcolor="${C.sand}"><w:anchorlock/><center style="color:${C.jet};font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${esc(label)} &rarr;</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${esc(href)}" style="display:inline-block;padding:16px 30px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:600;color:${C.jet};text-decoration:none;border-radius:999px;mso-hide:all;">${mark}${esc(label)}&nbsp;&nbsp;&rarr;</a><!--<![endif]-->
</td></tr></table>`;
}
const label = (t, extra = "") => `<div style="font-family:${MONO};font-size:10.5px;line-height:14px;font-weight:500;letter-spacing:2.6px;text-transform:uppercase;color:${C.soft};${extra}">${esc(t)}</div>`;

// The designed frame: the scene (one hosted image of the real pass or the real Studio Home on a Studio wallpaper, rendered at 2x,
// with alt text that carries the message), then live text straight on black, then a quiet footer. Solid colours only, so a client
// that inverts colours (Gmail on iPhone) turns it into a clean light email instead of breaking it.
function designed({ title, preheader, hero, heroAlt, kicker, headline, intro, middle = "", button: b, fine, footer = "", site = SITE }) {
  return `<!doctype html><html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="${C.name}"><meta name="supported-color-schemes" content="${C.name}"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@300;400;600&display=swap" rel="stylesheet">
<style>@font-face{font-family:'Studio Mono';font-weight:500;src:url(${site}/assets/fonts/IBMPlexMono-Medium.woff) format('woff')}@font-face{font-family:'Studio Mono';font-weight:400;src:url(${site}/assets/fonts/IBMPlexMono-Regular.woff) format('woff')}
:root{color-scheme:${C.name};supported-color-schemes:${C.name}}body{margin:0;padding:0;background:${C.night}}a{color:${C.ink}}
@media (max-width:480px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:32px!important;line-height:36px!important}.code{font-size:28px!important;letter-spacing:6px!important}.ft{letter-spacing:1.2px!important;font-size:9.5px!important}}</style>
<!--[if mso]><style>body,table,td,a,h1,p,div{font-family:Arial,sans-serif!important}</style><![endif]--></head>
<body bgcolor="${C.night}" style="margin:0;padding:0;background:${C.night};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.night};mso-hide:all;">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.night}" style="background:${C.night};">
<tr><td align="center" style="padding:48px 12px 48px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td class="px" style="padding:0 36px 30px;line-height:0;font-size:0;"><img src="${esc(site + "/assets/email/" + C.lockup)}" width="${C.lw}" height="${C.lh}" alt="Studio" style="display:block;width:${C.lw}px;height:${C.lh}px;border:0;font-family:${FONT};font-size:20px;line-height:${C.lh}px;font-weight:600;color:${C.ink};"></td></tr>
${hero ? `<tr><td bgcolor="${C.night}" style="background:${C.night};border-radius:22px;overflow:hidden;line-height:0;font-size:0;">
<img src="${esc(site + "/assets/email/" + hero)}" width="600" height="257" alt="${esc(heroAlt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:22px;font-family:${FONT};font-size:18px;line-height:26px;color:${C.ink};"></td></tr>` : ""}
<tr><td class="px" style="padding:${hero ? 40 : 12}px 36px 8px;font-family:${FONT};color:${C.body};">
${kicker ? label(kicker, "margin:0 0 18px;") : ""}
<h1 class="h1" style="margin:0 0 16px;font-family:${FONT};font-size:40px;line-height:44px;font-weight:300;letter-spacing:-1.2px;color:${C.ink};">${headline}</h1>
<p style="margin:0 0 32px;font-size:17px;line-height:27px;color:${C.body};">${intro}</p>
${middle}${b ? button(b, site) : ""}
${fine ? `<p style="margin:32px 0 0;font-size:13.5px;line-height:21px;color:${C.soft};">${fine}</p>` : ""}
</td></tr>
<tr><td class="px" style="padding:48px 36px 0;">
<div class="ft" style="font-family:${MONO};font-size:10px;line-height:17px;letter-spacing:2.2px;text-transform:uppercase;color:${C.dim};"><a href="${SITE}" style="color:${C.dim};text-decoration:none;">askstudio.ai</a> &middot; Nicolini Productions LLC${footer}</div></td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}

// 1. Confirm your spot: the code, big, and the one-tap button.
export function confirmEmail(first, code, link, opts = {}) { return themed(opts, () => confirmOne(first, code, link)); }
function confirmOne(first, code, link) {
  const name = one(first), hi = name ? "Hi " + name + "," : "Hi,";
  const spaced = code.slice(0, 3) + " " + code.slice(3);
  const subject = "Confirm your spot";
  const text = [hi, "", "Your Studio code is " + spaced + ".", "", "Enter it on the page, or confirm here:", link, "",
    "The code works for 10 minutes and the link for 24 hours. Didn't sign up? Ignore this and nothing happens.", "", "Studio", "askstudio.ai"].join("\n");
  const middle = label("Your code", "margin:0 0 12px;") + `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;"><tr>
<td class="code" bgcolor="${C.well}" style="background:${C.well};border-radius:16px;padding:18px 26px 18px 30px;font-family:${MONO};font-size:34px;line-height:38px;font-weight:500;letter-spacing:10px;color:${C.ink};">${spaced}</td></tr></table>`;
  const html = designed({
    title: subject, preheader: "Your code is " + spaced + ". It works for 10 minutes.", hero: "hero21-confirm.jpg", heroAlt: "Studio. Confirm your spot: your code is " + spaced + ".",
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
export function inviteEmail(first, accessLink, opts = {}) { return themed(opts, () => inviteOne(first, accessLink, opts)); }
function inviteOne(first, accessLink, { unsubscribe = "{{ unsubscribe }}", address = "4328 Del Mar Ave, San Diego, CA 92107" } = {}) {
  const name = one(first), subject = name ? name + ", your Studio invite is here" : "Your Studio invite is here";
  const text = [(name ? `Hey ${name}, it's Evan.` : "Hey, it's Evan."), "", "Your spot came up, so Studio's all yours: 14 days of everything, free.", "",
    "Open your invite on your Mac:", accessLink, "", "This link is just for you. Questions? Just reply, it comes straight to me.", "",
    "Studio", "askstudio.ai", "Nicolini Productions LLC · " + address, "", "You're getting this because you joined the Studio waitlist. Unsubscribe: " + unsubscribe].join("\n");
  const cols = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 34px;"><tr>
<td valign="top" style="padding:0 44px 0 0;">${label("Trial")}<div style="margin-top:7px;font-family:${FONT};font-size:18px;line-height:23px;color:${C.ink};">14 days, free</div></td>
<td valign="top">${label("For")}<div style="margin-top:7px;font-family:${FONT};font-size:18px;line-height:23px;color:${C.ink};">Your Mac</div></td>
</tr></table>`;
  const html = designed({
    title: subject, preheader: "It's Evan. Your spot came up: 14 days of Studio, free.", hero: "hero21-invite.jpg", heroAlt: "Studio. Your invite is here: 14 days of everything, free.",
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
export function welcomeEmail(first, downloadLink, opts = {}) { return themed(opts, () => welcomeOne(first, downloadLink)); }
function welcomeOne(first, downloadLink) {
  const name = one(first), subject = "Welcome to Studio";
  const steps = ["Open Studio and sign in with this email.", "Tell it what you want to make.", "Watch your first video come together."];
  const text = [(name ? "Welcome to Studio, " + name + "." : "Welcome to Studio."), "", "Your download:", downloadLink, "", ...steps.map((s, i) => (i + 1) + ". " + s), "",
    "Make your first video before you pay anything.", "", "Studio", "askstudio.ai"].join("\n");
  const list = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 34px;">` +
    steps.map((s, i) => `<tr><td width="40" valign="top" style="padding:0 0 14px;font-family:${MONO};font-size:11px;line-height:25px;font-weight:500;letter-spacing:2px;color:${C.soft};">0${i + 1}</td>
<td valign="top" style="padding:0 0 14px;font-family:${FONT};font-size:17px;line-height:25px;color:${C.body};">${esc(s)}</td></tr>`).join("") + `</table>`;
  const html = designed({
    title: subject, preheader: "Your download is ready. Make your first video before you pay.", hero: "hero21-welcome.jpg", heroAlt: "Studio, on your Mac. Welcome to Studio.",
    kicker: "Welcome", headline: name ? "Welcome to Studio, " + esc(name) + "." : "Welcome to Studio.",
    intro: "Studio is yours to try. Download it, and make your first video before you pay anything.",
    middle: list, button: { label: "Download Studio for Mac", href: downloadLink, apple: true },
    fine: "Questions? Just reply to this email.",
  });
  return { subject, html, text };
}

// 5. Get Studio on your Mac: sent when someone signs up on a phone (askstudio.ai/start/ on a phone has no download). The button opens
// the sign-up on their Mac: they sign in with the same email and Studio downloads, signed in.
export function macEmail(first, link, opts = {}) { return themed(opts, () => macOne(first, link)); }
function macOne(first, link) {
  const name = one(first), subject = name ? name + ", get Studio on your Mac" : "Get Studio on your Mac";
  const steps = ["Open this email on your Mac.", "Tap the button and sign in with this email.", "Studio downloads. Open it, and you're already signed in."];
  const text = [(name ? `Hey ${name}, it's Evan.` : "Hey, it's Evan."), "", "Studio is for Mac, so here's your link for when you're at yours:", link, "",
    ...steps.map((s, i) => (i + 1) + ". " + s), "", "Questions? Just reply to this email.", "", "Studio", "askstudio.ai"].join("\n");
  const list = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 34px;">` +
    steps.map((s, i) => `<tr><td width="40" valign="top" style="padding:0 0 14px;font-family:${MONO};font-size:11px;line-height:25px;font-weight:500;letter-spacing:2px;color:${C.soft};">0${i + 1}</td>
<td valign="top" style="padding:0 0 14px;font-family:${FONT};font-size:17px;line-height:25px;color:${C.body};">${esc(s)}</td></tr>`).join("") + `</table>`;
  const html = designed({
    title: subject, preheader: "Studio is for Mac. Here's your link for when you're at yours.", hero: "hero21-welcome.jpg", heroAlt: "Studio, on your Mac. Get Studio on your Mac.",
    kicker: "Studio for Mac", headline: name ? esc(name) + ", Studio is waiting on your Mac." : "Studio is waiting on your Mac.",
    intro: "It's Evan. You signed up on your phone, and Studio is for Mac, so here's your link for when you're at yours.",
    middle: list, button: { label: "Get Studio on your Mac", href: link, apple: true },
    fine: "Questions? Just reply to this email.",
  });
  return { subject, html, text };
}

// 6. A friend joined: to the inviter, the moment a friend who used their link confirms. No hero (it is a short note, often several in a
// row): their friend's first name, how many of the 3, what happens at 3, and the private pass link where they watch the rest.
export function friendJoinedEmail(first, friend, joined, goal, front, passLink, opts = {}) { return themed(opts, () => friendOne(first, friend, joined, goal, front, passLink)); }
function friendOne(first, friend, joined, goal, front, passLink) {
  const name = one(first, 40), who = one(friend, 20) || "A friend", n = Math.max(1, Number(joined) || 1), g = Math.max(1, Number(goal) || 3);
  const left = Math.max(0, g - n), hi = name ? "Hi " + name + "," : "Hi,";
  const subject = front && n >= g ? (n === g ? who + " joined. You're all at the front." : who + " just joined Studio with your link") : who + " just joined Studio with your link";
  const where = n >= g
    ? (n === g ? `That's ${g} of ${g}, so you and every friend from your link just moved to the front of the line.` : `That's ${n} friends. You and every friend from your link are at the front of the line.`)
    : `That's ${n} of ${g}. ${left === 1 ? "One more" : left === 2 ? "Two more" : left + " more"} and you all skip to the front of the line.`;
  const fine = "Your pass shows each friend go from invited to joined. It's just for you, so keep this email to check in anytime.";
  const text = [hi, "", who + " just joined the Studio waitlist with your link. " + where, "", "See your pass:", passLink, "", fine, "", "Studio", "askstudio.ai"].join("\n");
  const dots = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;"><tr>` +
    Array.from({ length: g }, (_, i) => `<td bgcolor="${i < n ? C.ink : C.well}" style="width:44px;height:6px;line-height:6px;font-size:0;border-radius:3px;background:${i < n ? C.ink : C.well};">&nbsp;</td>${i < g - 1 ? '<td style="width:8px;font-size:0;">&nbsp;</td>' : ""}`).join("") +
    `<td style="padding-left:14px;font-family:${MONO};font-size:11px;line-height:14px;font-weight:500;letter-spacing:2px;color:${C.soft};">${Math.min(n, g)}/${g}</td></tr></table>`;
  const html = designed({
    title: subject, preheader: where, kicker: "Your friends", headline: esc(who) + " is in.",
    intro: esc(hi) + " " + esc(who) + " just joined the Studio waitlist with your link. " + esc(where),
    middle: dots, button: { label: "See your pass", href: passLink }, fine,
  });
  return { subject, html, text };
}
