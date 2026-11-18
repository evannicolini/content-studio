var root = document.getElementById("chat");
if (!root) return;

/* the footage drifts a little against the scroll (only while on screen) */
(function (el) {
  /* on a phone the wide poster would show the wrong part of the scene: let the phone clip fade in instead */
  if (el && !SK.reduced && SK.mobile() && el.getAttribute("data-src-m")) {
    el.removeAttribute("poster"); el.style.opacity = "0";
    el.addEventListener("playing", function () { el.style.opacity = ""; }, { once: true });
  }
  if (!el || SK.reduced) return;
  var y = 0, raf = 0, on = false;
  function step() {
    raf = 0;
    if (!on) return;
    var r = root.getBoundingClientRect(), vh = window.innerHeight || 1;
    var p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
    var t = -p * r.height * 0.045;
    y += (t - y) * 0.12;
    if (Math.abs(t - y) < 0.05) y = t;
    el.style.transform = "translate3d(0," + y.toFixed(2) + "px,0)";
    raf = requestAnimationFrame(step);
  }
  SK.onView(root, function () { on = true; if (!raf) raf = requestAnimationFrame(step); }, function () { on = false; });
})(root.querySelector("video.bg"));

/* one conversation, drawn on both screens so they stay in step */
var film = ((SK.media.films || []).filter(function (f) { return f.slug === "ces-sea-cliffs"; })[0] || (SK.media.films || [])[0] || {}).poster || "";
var IMG = function (w, h) { return '<img src="' + film + '" alt="" width="' + w + '" height="' + h + '" loading="lazy" decoding="async">'; };
var SCRIPT = [
  { who: "claude", text: "Your launch film is ready.", card:
    '<div class="ch-card ch-ad"><div class="ch-thumbs"><figure class="v">' + IMG(54, 96) + '<span class="ch-chip">v01</span></figure></div><p class="ch-foot"><span>Full edits</span><b class="still">Ready to watch</b></p></div>' },
  { who: "you", text: "The new film is great. Make a square version for the feed and schedule both for Thursday." },
  { who: "claude", doing: ["Making the square version", "Scheduling both"], text: "Done. Both are on Thursday at 10.", card:
    '<div class="ch-card"><div class="ch-thumbs"><figure class="v">' + IMG(54, 96) + '<span class="ch-chip">9:16</span></figure><figure class="s">' + IMG(96, 96) + '<span class="ch-chip">1:1</span></figure></div><p class="ch-foot dot">Thursday · 10:00</p></div>' },
  { who: "you", text: "And run the first one as an ad." },
  { who: "claude", doing: ["Setting up the ad"], text: "It's live.", card:
    '<div class="ch-card ch-ad"><div class="ch-thumbs"><figure class="v">' + IMG(54, 96) + '<span class="ch-chip">Ad</span></figure></div><p class="ch-foot"><span><img src="assets/logos/social/meta.svg" alt="" width="24" height="24" loading="lazy" decoding="async">Facebook · Instagram</span><b>Live</b></p></div>' }
];
var SPARK = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#claude"/></svg>';
var lists = [].slice.call(root.querySelectorAll(".ch-list")), rows = [];
lists.forEach(function (list) {
  SCRIPT.forEach(function (s, i) {
    var m = document.createElement("div");
    m.className = "ch-m " + s.who;
    if (s.who === "you") m.textContent = s.text;
    else {
      m.innerHTML = '<span class="ch-think">' + SPARK + "<span></span><u><i></i><i></i><i></i></u></span>" + '<div class="ch-body"><p class="ch-who">' + SPARK + 'Claude</p><p class="ch-say"></p>' + (s.card || "") + "</div>";
      m.querySelector(".ch-say").textContent = s.text;
    }
    list.appendChild(m);
    (rows[i] = rows[i] || []).push(m);
  });
});

var macC = root.querySelector(".ch-mac .ch-comp"), phone = root.querySelector(".ch-phone .ch-comp");
var comps = [macC, phone], token = 0, cur = 0;
comps.forEach(function (c) { c._ph = c.querySelector(".ch-ask-t").textContent; });
/* the border beam runs round both composers the whole time the section is on screen (SK.beam stops it out of view) */
SK.beam(macC, { size: "md", variant: "mirra", radius: 18, boost: 2.2 });
SK.beam(phone, { size: "md", variant: "mirra", radius: 30, boost: 2.2 });

/* the panels slide in once; their glass and contents fade (never the panel itself, or the glass would stop blurring) */
if (!SK.reduced) {
  root.classList.add("ch-arm");
  SK.onView(root.querySelector(".ch-in"), function () { root.classList.remove("ch-arm"); }, null, { once: true, ratio: 0.12, threshold: [0, 0.12, 0.3] });
}

/* keep the newest message in view, like a real thread */
function fit(i) {
  cur = i;
  lists.forEach(function (list, v) {
    var m = rows[i][v], box = list.parentNode;
    if (!box.clientHeight) return;
    var h = m.classList.contains("think") ? 44 : m.offsetHeight;
    list.style.transform = "translate3d(0," + -Math.max(0, m.offsetTop + h + 8 - box.clientHeight) + "px,0)";
  });
}
function show(i) { rows[i].forEach(function (m) { m.classList.remove("think"); m.classList.add("on"); }); fit(i); }
function think(i, text) { rows[i].forEach(function (m) { m.querySelector(".ch-think span").textContent = text; m.classList.add("think"); }); fit(i); }
function working(on) { comps.forEach(function (c) { c.classList.toggle("working", on); }); }
function setAsk(c, t, typing) {
  var box = c.querySelector(".ch-ask"), h = box.offsetHeight;
  c.querySelector(".ch-ask-t").textContent = t || c._ph;
  box.classList.toggle("ph", !t);
  c.classList.toggle("typing", !!typing);
  box.scrollTop = box.scrollHeight;               /* past two lines, the newest words stay in view */
  if (box.offsetHeight !== h) fit(cur);           /* the field grew or shrank a line: keep the thread pinned to its newest message */
}
function reset() {
  rows.forEach(function (r) { r.forEach(function (m) { m.classList.remove("on", "think"); }); });
  lists.forEach(function (l) { l.style.transform = ""; });
  phone.classList.remove("talk");
  working(false);
  comps.forEach(function (c) { setAsk(c, "", false); });
  root.classList.remove("ch-out");
  show(0);                                        /* the thread always opens on the film Claude just delivered */
}

async function run() {
  var my = ++token;
  var w = function (ms) { return SK.sleep(ms).then(function () { if (my !== token) throw 0; }); };
  reset();
  if (SK.reduced) { SCRIPT.forEach(function (s, i) { show(i); }); return; }
  async function answer(i) {
    working(true);
    var d = SCRIPT[i].doing;
    for (var k = 0; k < d.length; k++) { think(i, d[k]); await w(1250); }
    working(false);
    show(i);
  }
  try {
    for (;;) {
      await w(900);
      /* the first request is typed: on the Mac when the Mac window is showing, otherwise on the phone */
      var c = macC.offsetParent ? macC : phone, send = c.querySelector(".ch-send"), t = SCRIPT[1].text;
      for (var i = 1; i <= t.length; i++) { setAsk(c, t.slice(0, i), true); await w(t[i - 1] === "." ? 190 : 18 + Math.random() * 24); }
      await w(380);
      send.classList.add("tap"); await w(160); send.classList.remove("tap");
      setAsk(c, "", false); show(1);
      await w(600);
      await answer(2);
      /* the second one is said out loud, on the phone */
      await w(2300);
      phone.classList.add("talk");
      await w(1900);
      phone.classList.remove("talk"); show(3);
      await w(600);
      await answer(4);
      await w(4200);
      root.classList.add("ch-out");
      await w(550);
      reset();
    }
  } catch (e) {}
}
SK.onView(root.querySelector(".ch-phone"), run, function () { token++; reset(); }, { ratio: 0.3, threshold: [0, 0.3, 0.6] });
