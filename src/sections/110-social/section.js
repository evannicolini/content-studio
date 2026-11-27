var root = document.getElementById("social");
if (!root) return;
var M = SK.media || {};
var THUMBS = (M.thumbs || []).map(function (t) { return t.file || t; });
var POSTERS = (M.films || []).map(function (f) { return f.poster; });
var NETS = ["ig", "tiktok", "youtube", "x", "linkedin", "facebook", "threads"];
var TIMES = ["10a", "4p", "12p", "8a", "6p", "2p", "9a", "7p", "11a", "5p"];
var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/* posts per day across the 30 days, desktop (the counter shows whatever this really adds up to) */
var PER_DAY = [3, 2, 4, 2, 3, 1, 2, 2, 3, 4, 2, 3, 2, 1, 4, 2, 3, 2, 2, 3, 1, 2, 3, 4, 2, 2, 3, 1, 2, 3];
var BRAND = {};
/* each film's badge on the calendar: a made-up demo brand (Northwind, Lowtide Coffee), never the film's real one */
(M.films || []).forEach(function (f, i) { BRAND[f.slug] = i % 2 ? "lowtide" : "northwind"; BRAND[f.poster] = BRAND[f.slug]; });
(M.thumbs || []).forEach(function (t) { BRAND[t.file] = BRAND[t.from_slug] || "northwind"; });
function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ================= the calendar ================= */
var stage = document.getElementById("soc-stage"), tray = document.getElementById("soc-tray"), grid = document.getElementById("soc-grid");
var elPosts = document.getElementById("soc-posts"), elAccts = document.getElementById("soc-accts"), elLeft = document.getElementById("soc-left"), elSay = document.getElementById("soc-say");
var netEls = {};
root.querySelectorAll("#soc-nets li").forEach(function (li) { netEls[li.getAttribute("data-net")] = li; });
var posts = [], anims = [], token = 0, state = "pile", phone = SK.mobile();

/* the calendar's cards load as the calendar comes near (loading=lazy): 70 to 170 of them were fetched and decoded with the page */
function cardHTML(src) { return '<span class="soc-fx"><span class="soc-fy"><span class="soc-card"><img src="' + src + '" alt="" width="180" height="320" loading="lazy" decoding="async"><img class="br" src="assets/media/social/brand-' + (BRAND[src] || "northwind") + '.svg" alt="" width="12" height="12" loading="lazy" decoding="async"></span></span></span>'; }

function build() {
  grid.innerHTML = "";
  posts = [];
  /* every picture once before any repeat: the 28 frames first, then the film posters */
  var pool = THUMBS.concat(POSTERS);
  if (!pool.length) return;
  var now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var off = (today.getDay() + 6) % 7, first = new Date(today); first.setDate(today.getDate() - off);
  var last = new Date(first); last.setDate(first.getDate() + 34);
  document.getElementById("soc-month").textContent = first.getMonth() === last.getMonth() ? MONTHS[first.getMonth()] + " " + first.getFullYear() : MONTHS[first.getMonth()].slice(0, 3) + " · " + MONTHS[last.getMonth()].slice(0, 3) + " " + last.getFullYear();
  var pi = 0, n = 0;
  for (var c = 0; c < 35; c++) {
    var d = new Date(first); d.setDate(first.getDate() + c);
    var rel = c - off, cell = document.createElement("div");
    cell.className = "soc-day" + (rel < 0 ? " past" : rel === 0 ? " today" : rel >= 30 ? " out" : "");
    var lab = (d.getDate() === 1 && c > 0 ? MONTHS[d.getMonth()].slice(0, 3) + " " : "") + d.getDate();
    cell.innerHTML = '<span class="soc-d">' + lab + "</span>";
    var box = cell, count = rel < 0 ? (phone ? 1 : 2 + (c % 2)) : rel < 30 ? (phone ? 1 : PER_DAY[rel]) : 0;
    for (var j = 0; j < count; j++) {
      var p = document.createElement("div"), was = rel < 0;
      p.className = "soc-post " + (was ? "was" : "sched pile");
      p.innerHTML = cardHTML(pool[pi % pool.length]) + '<i class="soc-dot"></i><span class="soc-time">' + TIMES[(pi * 3 + j) % TIMES.length] + "</span>";
      pi++;
      box.appendChild(p);
      if (!was) { posts.push({ el: p, fx: p.querySelector(".soc-fx"), fy: p.querySelector(".soc-fy"), card: p.querySelector(".soc-card"), net: null, i: n }); n++; }
    }
    grid.appendChild(cell);
  }
  /* accounts join in over the whole run, not all in the first second */
  var joined = 1;
  posts.forEach(function (p, i) {
    if (joined < NETS.length && i >= Math.round((joined * joined * posts.length * .62) / (NETS.length * NETS.length) + joined)) joined++;
    p.net = NETS[i < 1 ? 0 : joined > 1 && (i % 3 !== 0) ? (i * 5 + 1) % joined : joined - 1];
  });
}

/* where each card rests in the tray: a loose stack, the first post to leave on top */
function pile() {
  if (!posts.length) return;
  var tr = tray.getBoundingClientRect(), n = posts.length;
  var w0 = posts[0].el.getBoundingClientRect().width || 28;
  var tall = tr.height > tr.width * 1.4;
  var s = tall ? 1.62 : phone ? 1.22 : 1.5, pw = w0 * s, ph = (pw * 16) / 9;
  var padX = tall ? 18 : phone ? 14 : 20, top = tall ? 50 : phone ? 36 : 42;
  var rects = posts.map(function (p) { return p.el.getBoundingClientRect(); });
  posts.forEach(function (p, i) {
    var slot = n - 1 - i, r = rects[i], x, y;
    if (tall) {
      var cols = 3, rows = Math.ceil(n / cols), row = Math.floor(slot / cols), col = slot % cols;
      var uw = tr.width - padX * 2 - pw, uh = tr.height - top - 20 - ph;
      x = tr.left + padX + pw / 2 + (uw * col) / (cols - 1) + (rnd(i) - .5) * 8;
      y = tr.top + top + ph / 2 + (rows > 1 ? (uh * row) / (rows - 1) : 0) + (rnd(i + 50) - .5) * 8;
    } else {
      var uw2 = tr.width - padX * 2 - pw;
      x = tr.left + padX + pw / 2 + (n > 1 ? (uw2 * slot) / (n - 1) : 0);
      y = tr.top + top + ph / 2 + (rnd(i + 50) - .5) * 6;
    }
    p.dx = x - (r.left + r.width / 2);
    p.dy = y - (r.top + (r.width * 16) / 18);
    p.rot = (rnd(i + 9) - .5) * (tall ? 10 : 8);
    p.s = pw / (r.width || 28);
    p.el.style.zIndex = String(10 + slot);
    p.el.classList.add("pile");
    p.el.classList.remove("in");
    p.fx.style.transform = "translateX(" + p.dx.toFixed(1) + "px)";
    p.fy.style.transform = "translateY(" + p.dy.toFixed(1) + "px) rotate(" + p.rot.toFixed(2) + "deg) scale(" + p.s.toFixed(3) + ")";
    p.card.style.transform = "";
  });
  state = "pile";
}

function counters(np, nets) {
  elPosts.textContent = String(np);
  elAccts.textContent = String(nets);
  elLeft.textContent = String(posts.length - np);
}
function resetBoard() {
  anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
  anims = [];
  NETS.forEach(function (k) { netEls[k] && netEls[k].classList.remove("on", "pop"); });
  tray.classList.remove("done");
  grid.classList.remove("clearing");
  counters(0, 0);
  elSay.textContent = "Ready";
  pile();
}
function place(p) {
  p.fx.style.transform = ""; p.fy.style.transform = ""; p.card.style.transform = "";
  p.el.classList.remove("pile"); p.el.classList.add("in"); p.el.style.zIndex = "";
}
function finalBoard() {
  posts.forEach(place);
  NETS.forEach(function (k) { netEls[k] && netEls[k].classList.add("on"); });
  counters(posts.length, Math.min(NETS.length, posts.length));
  tray.classList.add("done");
  elSay.textContent = "Scheduled";
  state = "full";
}

var FLY = 860;
function fly(my) {
  state = "flying";
  var landed = 0, lit = {}, gap = phone ? 100 : 58;
  posts.forEach(function (p, i) {
    var delay = i * gap;
    p.fx.style.transform = ""; p.fy.style.transform = "";
    anims.push(p.fx.animate([{ transform: "translateX(" + p.dx.toFixed(1) + "px)" }, { transform: "translateX(0)" }], { duration: FLY, delay: delay, easing: "cubic-bezier(.5, 0, .2, 1)", fill: "backwards" }));
    anims.push(p.fy.animate([{ transform: "translateY(" + p.dy.toFixed(1) + "px) rotate(" + p.rot.toFixed(2) + "deg) scale(" + p.s.toFixed(3) + ")" }, { transform: "translateY(0) rotate(0deg) scale(1)" }], { duration: FLY, delay: delay, easing: "cubic-bezier(.3, 1.22, .42, 1)", fill: "backwards" }));
    anims.push(p.card.animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(-30px) scale(1.16)", offset: .42 }, { transform: "translateY(0) scale(1)" }], { duration: FLY, delay: delay, easing: "cubic-bezier(.4, 0, .4, 1)", fill: "backwards" }));
    setTimeout(function () {
      if (my !== token) return;
      p.el.classList.remove("pile"); p.el.classList.add("in"); p.el.style.zIndex = "";
      landed++;
      var li = netEls[p.net];
      if (li) { lit[p.net] = 1; li.classList.add("on", "pop"); setTimeout(function () { li.classList.remove("pop"); }, 240); }
      counters(landed, Object.keys(lit).length);
    }, delay + FLY * .8);
  });
  return SK.sleep((posts.length - 1) * gap + FLY + 120);
}

async function schedule(ctl) {
  var my = ++token;
  elSay.textContent = "Scheduling";
  await SK.sleep(620);
  if (my !== token) return;
  pile(); /* measure again right before take-off, the page may have moved */
  await fly(my);
  if (my !== token) return;
  anims = [];
  tray.classList.add("done");
  elSay.textContent = "Scheduled";
  ctl.state("idle");
  state = "full";
  await SK.sleep(4200);
  if (my !== token) return;
  grid.classList.add("clearing");
  await SK.sleep(520);
  if (my !== token) return;
  resetBoard();
  await SK.sleep(700);
}

build();
var field = SK.promptField(document.getElementById("soc-field"), {
  placeholder: "What should we post?",
  scale: phone ? 1.06 : 1.25,
  auto: false,
  prompts: ["Schedule the next 30 days for all my brands"],
  onSend: function (p, ctl) { return schedule(ctl); }
});
if (SK.reduced) {
  finalBoard();
  field.set("Schedule the next 30 days for all my brands");
} else {
  requestAnimationFrame(function () { resetBoard(); });
  SK.onView(stage, function () { resetBoard(); field.run(); }, function () { token++; field.stop(); field.state("idle").clear(); resetBoard(); }, { ratio: .5, threshold: [0, .25, .5, .75] });
  var rz = 0;
  window.addEventListener("resize", function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      var ph = SK.mobile();
      if (ph !== phone) { phone = ph; token++; field.stop(); field.state("idle").clear(); build(); resetBoard(); field.run(); return; }
      if (state === "pile") pile();
    }, 180);
  });
  window.addEventListener("load", function () { if (state === "pile") pile(); });
}

/* ================= any post can be an ad =================
   One loop: a post in this week is picked, the request is typed, the post becomes the ad preview, a paused ad lands in the Ads tab,
   it is switched on, and its numbers run. All figures are examples (the panel says so) and add up: cost per result = spent / results. */
var adStage = document.getElementById("soc-ad");
var FILMS = {};
(M.films || []).forEach(function (f) { FILMS[f.slug] = f; });
var forest = FILMS["ces-forest"];
if (!adStage || !forest) return;
var A = function (id) { return document.getElementById(id); };
var days = A("sad-days"), prev = adStage.querySelector(".sad-prev"), pc = A("sad-pc"), pcV = pc.querySelector("video"), say = A("sad-say");
var rowNew = A("sad-new"), tg = A("sad-tg"), nSub = A("sad-n-sub"), nSpark = A("sad-n-sp").querySelector("polyline"), live = A("sad-live");
var cSp = rowNew.querySelector(".sp b"), cRe = rowNew.querySelector(".re b"), cCp = rowNew.querySelector(".cp b");
var kSp = A("sad-k-sp"), kRe = A("sad-k-re"), kCp = A("sad-k-cp"), kLv = A("sad-k-lv"), kBd = A("sad-k-bd");
var ASK = "Run this as an ad, $40 a day", DAILY = 40, BASE_SP = 384, BASE_RE = 32, END_SP = 112, END_RE = 10, END_DAY = 3;
var WEEK = [["Mon", "10a", "ces-sea-cliffs", "Sea cliffs", 1], ["Tue", "4p", "mirra-multivitamin", "Multivitamin", 1], ["Wed", "12p", "ces-company-becoming", "Launch film", 1], ["Thu", "9a", "ces-forest", "Forest", 1],
  ["Fri", "6p", "founders-retreat", "Founders retreat", 0], ["Sat", "11a", "ces-agent-kitchen", "Agent kitchen", 0], ["Sun", "5p", "lobby-hero-window", "Hotel window", 0]];
var pickEl;
WEEK.forEach(function (d) {
  var f = FILMS[d[2]] || forest, li = document.createElement("li");
  li.className = "sad-day" + (d[4] ? " was" : "");
  li.innerHTML = '<span class="sad-dt"><img src="' + f.poster + '" alt="" width="180" height="320" loading="lazy" decoding="async"></span><span class="sad-dn"><b>' + d[3] + "</b><small>" + d[0] + "<i> · " + d[1] + '</i></small></span><i class="sad-ck"></i>';
  days.appendChild(li);
  if (d[2] === "ces-forest") pickEl = li;
});
pcV.poster = forest.poster;
pcV.setAttribute("data-src", forest.loop);
pc.style.backgroundImage = "url(" + forest.poster + ")";
rowNew.querySelector(".sad-th img").src = forest.poster;
A("sad-n-name").textContent = forest.title || "Forest";

var usd = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); }, usd2 = function (n) { return "$" + n.toFixed(2); };
/* paint the Ads tab for a point in the new ad's run: p = 0 (just switched on) .. 1 (day three) */
function paint(p, on) {
  var sp = Math.round(END_SP * p), re = Math.floor(END_RE * p + 1e-6), day = Math.max(1, Math.min(END_DAY, Math.ceil(sp / DAILY)));
  cSp.textContent = usd(sp); cRe.textContent = String(re); cCp.textContent = re ? usd2(sp / re) : "—";
  kSp.textContent = usd(BASE_SP + sp); kRe.textContent = String(BASE_RE + re); kCp.textContent = usd2((BASE_SP + sp) / (BASE_RE + re));
  kLv.textContent = on ? "3" : "2"; kBd.textContent = usd(DAILY * (on ? 3 : 2)) + " a day";
  live.querySelector("b").textContent = on ? "3" : "2";
  nSub.textContent = on ? "Day " + day + " · Instagram and Facebook" : "Paused until you say go";
  nSpark.style.strokeDashoffset = String(100 - 100 * p);
}
var adTok = 0, adAnim = null, adRaf = 0;
function adReset() {
  if (adAnim) { try { adAnim.cancel(); } catch (e) {} adAnim = null; }
  cancelAnimationFrame(adRaf);
  pc.style.opacity = "0";
  prev.classList.remove("has", "ad");
  pickEl.classList.remove("pick");
  rowNew.classList.remove("in", "go");
  tg.classList.remove("on", "tap");
  live.classList.remove("bump");
  say.textContent = "Ready";
  paint(0, false);
}
/* the finished picture: reduced motion, and what the stage rests on when it is scrolled away mid-loop */
function adDone() {
  if (adAnim) { try { adAnim.cancel(); } catch (e) {} adAnim = null; }
  cancelAnimationFrame(adRaf);
  pc.style.opacity = "1";
  prev.classList.add("has", "ad");
  pickEl.classList.add("pick");
  rowNew.classList.add("in", "go");
  tg.classList.remove("tap"); tg.classList.add("on");
  live.classList.remove("bump");
  say.textContent = "Live on Meta";
  paint(1, true);
}
function adFrom() {
  var a = pickEl.querySelector(".sad-dt").getBoundingClientRect(), b = pc.getBoundingClientRect(), s = a.width / (b.width || 1);
  return "translate(" + (a.left + a.width / 2 - (b.left + b.width / 2)).toFixed(1) + "px," + (a.top + a.height / 2 - (b.top + b.height / 2)).toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
}
function runNumbers(my, ms) {
  return new Promise(function (done) {
    var t0 = performance.now();
    (function step(now) {
      if (my !== adTok) return done(false);
      var p = Math.min(1, (now - t0) / ms);
      paint(1 - Math.pow(1 - p, 1.6), true);
      if (p >= 1) return done(true);
      adRaf = requestAnimationFrame(step);
    })(t0);
  });
}
async function runAd(ctl) {
  var my = adTok, ok = function () { return my === adTok; }, wait = function (ms) { return SK.sleep(ms).then(ok); };
  say.textContent = "Building the ad";
  if (!(await wait(650))) return;
  pc.style.opacity = "1"; prev.classList.add("has");                      /* the post becomes the ad */
  try { pcV.currentTime = 0; } catch (e) {}
  var pl = pcV.play(); pl && pl.catch(function () {});
  adAnim = pc.animate([{ transform: adFrom(), borderRadius: "40px" }, { transform: "translate(0,0) scale(1)", borderRadius: "18px" }], { duration: 950, easing: "cubic-bezier(.3, 1.16, .4, 1)", fill: "backwards" });
  if (!(await wait(900))) return;
  prev.classList.add("ad");                                               /* as people will see it: Sponsored, Learn more */
  if (!(await wait(900))) return;
  rowNew.classList.add("in");                                             /* it lands in the Ads tab, paused */
  say.textContent = "Paused until you say go";
  ctl.state("idle");
  if (!(await wait(1500))) return;
  tg.classList.add("tap");                                                /* you say go */
  if (!(await wait(200))) return;
  tg.classList.add("on"); rowNew.classList.add("go"); live.classList.add("bump");
  say.textContent = "Live on Meta";
  paint(0, true);
  if (!(await wait(420))) return;
  tg.classList.remove("tap"); live.classList.remove("bump");
  if (!(await runNumbers(my, 4200))) return;                              /* three days of results */
  if (!(await wait(4200))) return;                                        /* rest on the finished picture */
  adReset();
  if (!(await wait(600))) return;
  pick();                                                                 /* next pass: the post is picked again before the request is typed */
}
function pick() { pickEl.classList.add("pick"); say.textContent = "1 post picked"; }
var adField = SK.promptField(document.getElementById("sad-field"), {
  placeholder: "Which post?",
  scale: phone ? 1.06 : 1.25,
  auto: false,
  prompts: [ASK],
  onSend: function (p, ctl) { return runAd(ctl); }
});
/* the post is picked first, then the request is typed about it */
async function adLoop() {
  var my = ++adTok;
  adReset();
  adField.state("idle").clear();
  await SK.sleep(500);
  if (my !== adTok) return;
  pick();
  adField.run();
}
if (SK.reduced) {
  adField.set(ASK);
  adDone();
} else {
  adReset();
  SK.onView(adStage, adLoop, function () { adTok++; adField.stop(); adField.state("idle").set(ASK); adDone(); }, { ratio: phone ? .3 : .45, threshold: [0, .3, .45, .7] });
}
