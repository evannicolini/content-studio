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
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Switzer','Inter','Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'SF Mono',ui-monospace,Menlo,Consolas,monospace";
const C = { night: "#0E191E", card: "#16252C", rim: "#2C3C44", well: "#0B1418", ink: "#FFFFFF", body: "#E5E4E2", soft: "#BBC9C7", dim: "#8FA1A8", pearl: "#E5E4E2", jet: "#0A0A0A" };

const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const one = (v, max = 80) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// The designed frame: hero, then the glass card (a solid colour, so no client turns it white), then the footer.
function designed({ title, preheader, hero, heroAlt, kicker, headline, intro, middle = "", button, fine, footer = "", site = SITE }) {
  const btn = button ? `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 4px;"><tr><td align="center" bgcolor="${C.pearl}" style="border-radius:999px;background:${C.pearl};">
<a href="${esc(button.href)}" style="display:block;padding:17px 24px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:600;color:${C.jet};text-decoration:none;border-radius:999px;">${esc(button.label)}</a>
</td></tr></table>` : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title>
<style>:root{color-scheme:dark;supported-color-schemes:dark}body{margin:0;padding:0;background:${C.night}}a{color:${C.ink}}
@media (max-width:480px){.px{padding-left:24px!important;padding-right:24px!important}.h1{font-size:30px!important;line-height:34px!important}.hero{height:auto!important}}</style></head>
<body bgcolor="${C.night}" style="margin:0;padding:0;background:${C.night};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.night};">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.night}" style="background:${C.night};">
<tr><td align="center" style="padding:32px 12px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 4px 20px;"><img src="${esc(site + "/assets/email/studio-lockup.png")}" width="120" height="34" alt="Studio" style="display:block;width:120px;height:34px;border:0;font-family:${FONT};font-size:22px;line-height:34px;font-weight:600;color:${C.ink};"></td></tr>
<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.rim};border-radius:28px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${hero ? `<tr><td bgcolor="#2A3E48" style="background:#2A3E48;border-radius:27px 27px 0 0;overflow:hidden;line-height:0;font-size:0;">
<img class="hero" src="${esc(site + "/assets/email/" + hero)}" width="600" height="280" alt="${esc(heroAlt)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:27px 27px 0 0;font-family:${FONT};font-size:14px;line-height:20px;color:${C.soft};"></td></tr>` : ""}
<tr><td class="px" style="padding:36px 44px 40px;font-family:${FONT};color:${C.body};">
${kicker ? `<div style="font-family:${MONO};font-size:11px;line-height:14px;letter-spacing:3px;text-transform:uppercase;color:${C.soft};margin:0 0 14px;">${esc(kicker)}</div>` : ""}
<h1 class="h1" style="margin:0 0 14px;font-family:${FONT};font-size:34px;line-height:38px;font-weight:600;letter-spacing:-0.5px;color:${C.ink};">${headline}</h1>
<p style="margin:0 0 28px;font-size:16px;line-height:25px;color:${C.body};">${intro}</p>
${middle}${btn}
${fine ? `<p style="margin:26px 0 0;font-size:13px;line-height:20px;color:${C.dim};">${fine}</p>` : ""}
</td></tr></table></td></tr>
<tr><td align="center" style="padding:22px 12px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.dim};">Studio &middot; <a href="${SITE}" style="color:${C.dim};text-decoration:none;">askstudio.ai</a><br>Nicolini Productions LLC${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

// 1. Confirm your spot: the code, big, and the one-tap button.
export function confirmEmail(first, code, link) {
  const name = one(first), hi = name ? "Hi " + name + "," : "Hi,";
  const spaced = code.slice(0, 3) + " " + code.slice(3);
  const subject = "Confirm your spot";
  const text = [hi, "", "Your Studio code is " + spaced + ".", "", "Enter it on the page, or confirm here:", link, "",
    "The code works for 10 minutes and the link for 24 hours. Didn't sign up? Ignore this and nothing happens.", "", "Studio", "askstudio.ai"].join("\n");
  const middle = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;"><tr>
<td align="center" bgcolor="${C.well}" style="background:${C.well};border:1px solid ${C.rim};border-radius:18px;padding:22px 0;font-family:${MONO};font-size:40px;line-height:44px;font-weight:600;letter-spacing:10px;color:${C.ink};">${spaced}</td></tr></table>`;
  const html = designed({
    title: subject, preheader: "Your code is " + spaced + ". It works for 10 minutes.", hero: "hero-confirm.jpg", heroAlt: "Big Sur at dusk",
    kicker: "Early access", headline: "Confirm your spot", intro: esc(hi) + " here's your code. Enter it on the page to hold your place in line.",
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
  const pass = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr>
<td bgcolor="${C.well}" style="background:${C.well};border:1px solid ${C.rim};border-radius:20px;padding:20px 22px;font-family:${FONT};">
<div style="font-family:${MONO};font-size:10px;line-height:14px;letter-spacing:3px;text-transform:uppercase;color:${C.soft};">Early access &middot; Invite</div>
<div style="margin:10px 0 16px;font-size:26px;line-height:30px;font-weight:300;color:${C.ink};">${esc(name || "Your invite")}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
<td style="font-family:${MONO};font-size:10px;line-height:14px;letter-spacing:2px;text-transform:uppercase;color:${C.dim};">Trial<br><span style="font-family:${FONT};font-size:15px;line-height:22px;letter-spacing:0;text-transform:none;color:${C.ink};">14 days, free</span></td>
<td align="right" style="font-family:${MONO};font-size:10px;line-height:14px;letter-spacing:2px;text-transform:uppercase;color:${C.dim};">For<br><span style="font-family:${FONT};font-size:15px;line-height:22px;letter-spacing:0;text-transform:none;color:${C.ink};">Mac</span></td>
</tr></table></td></tr></table>`;
  const html = designed({
    title: subject, preheader: "Studio is ready for you. 14 days of everything, free.", hero: "hero-invite.jpg", heroAlt: "Peach dawn over the hills",
    kicker: "Your invite", headline: name ? esc(name) + ", Studio is ready." : "Studio is ready.",
    intro: "Your invite is here. Open it to start your 14 days of everything, free. One prompt, and the idea in your head becomes a finished video.",
    middle: pass, button: { label: "Open my invite", href: accessLink },
    fine: "This link is just for you. Questions? Reply to this email.",
    footer: ` &middot; ${esc(address)}<br><br>You're getting this because you joined the Studio waitlist.<br><a href="${esc(unsubscribe)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>`,
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
    steps.map((s, i) => `<tr><td width="34" valign="top" style="padding:0 0 12px;font-family:${MONO};font-size:12px;line-height:24px;color:${C.soft};">0${i + 1}</td>
<td valign="top" style="padding:0 0 12px;font-family:${FONT};font-size:16px;line-height:24px;color:${C.body};">${esc(s)}</td></tr>`).join("") + `</table>`;
  const html = designed({
    title: subject, preheader: "Your download is ready. Make your first video before you pay.", hero: "hero-welcome.jpg", heroAlt: "An alpine lake at first light",
    kicker: "Welcome", headline: name ? "Welcome to Studio, " + esc(name) + "." : "Welcome to Studio.",
    intro: "Studio is yours to try. Download it, and make your first video before you pay anything.",
    middle: list, button: { label: "Download Studio for Mac", href: downloadLink },
    fine: "Questions? Just reply to this email.",
  });
  return { subject, html, text };
}
