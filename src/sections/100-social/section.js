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
(M.films || []).forEach(function (f) { BRAND[f.slug] = /esignature/i.test(f.brand || "") ? "ces" : "mirra"; BRAND[f.poster] = BRAND[f.slug]; });
(M.thumbs || []).forEach(function (t) { BRAND[t.file] = BRAND[t.from_slug] || "mirra"; });
function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ================= the calendar ================= */
var stage = document.getElementById("soc-stage"), tray = document.getElementById("soc-tray"), grid = document.getElementById("soc-grid");
var elPosts = document.getElementById("soc-posts"), elAccts = document.getElementById("soc-accts"), elLeft = document.getElementById("soc-left"), elSay = document.getElementById("soc-say");
var netEls = {};
root.querySelectorAll("#soc-nets li").forEach(function (li) { netEls[li.getAttribute("data-net")] = li; });
var posts = [], anims = [], token = 0, state = "pile", phone = SK.mobile();

function cardHTML(src) { return '<span class="soc-fx"><span class="soc-fy"><span class="soc-card"><img src="' + src + '" alt="" width="180" height="320" decoding="async"><img class="br" src="assets/media/social/brand-' + (BRAND[src] || "mirra") + '.png" alt="" width="12" height="12" decoding="async"></span></span></span>'; }

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

/* ================= any post can be an ad ================= */
var adStage = document.getElementById("soc-ad"), week = document.getElementById("soc-week"), big = document.getElementById("soc-big"), chip = document.getElementById("soc-chip"), res = document.getElementById("soc-res");
var forest = (M.films || []).filter(function (f) { return f.slug === "ces-forest"; })[0] || (M.films || [])[0];
if (!adStage || !forest) return;
var bigV = big.querySelector("video");
bigV.poster = forest.poster;
bigV.setAttribute("data-src", forest.loop);
big.style.backgroundImage = "url(" + forest.poster + ")";
big.querySelector(".soc-big-tag").textContent = forest.title || "";
var WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], PICK = 3, wkT = ["t05", "t12", "t18", null, "t09", "t22", "t14"], pickCell;
WD.forEach(function (d, i) {
  var src = i === PICK ? forest.poster : "assets/media/thumbs/" + wkT[i] + ".jpg";
  var c = document.createElement("div");
  c.className = "soc-wd";
  c.innerHTML = "<b>" + d + '</b><span><span class="soc-card"><img src="' + src + '" alt="" width="180" height="320" loading="lazy" decoding="async"></span><i class="soc-dot"></i></span>';
  week.appendChild(c);
  if (i === PICK) pickCell = c;
});
var adTok = 0, adAnim = null;
function adReset() {
  if (adAnim) { try { adAnim.cancel(); } catch (e) {} adAnim = null; }
  big.style.opacity = "0"; big.classList.remove("up");
  chip.classList.remove("on", "tap", "ran"); res.classList.remove("on");
  pickCell.classList.remove("pick", "gone");
}
function adFrom() {
  var a = pickCell.querySelector(".soc-card").getBoundingClientRect(), b = big.getBoundingClientRect();
  var s = a.width / (b.width || 1);
  return "translate(" + (a.left + a.width / 2 - (b.left + b.width / 2)).toFixed(1) + "px," + (a.top + a.height / 2 - (b.top + b.height / 2)).toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
}
async function runAd(ctl) {
  var my = ++adTok;
  await SK.sleep(500);
  if (my !== adTok) return;
  pickCell.classList.add("pick");
  await SK.sleep(650);
  if (my !== adTok) return;
  var from = adFrom();
  big.style.opacity = "1";
  pickCell.classList.add("gone");
  adAnim = big.animate([{ transform: from }, { transform: "translate(0,0) scale(1)" }], { duration: 950, easing: "cubic-bezier(.3, 1.16, .4, 1)", fill: "backwards" });
  await SK.sleep(820);
  if (my !== adTok) return;
  big.classList.add("up");
  ctl.state("idle");
  await SK.sleep(350);
  if (my !== adTok) return;
  chip.classList.add("on");
  await SK.sleep(1050);
  if (my !== adTok) return;
  chip.classList.add("tap");
  await SK.sleep(190);
  if (my !== adTok) return;
  chip.classList.remove("tap"); chip.classList.add("ran");
  await SK.sleep(420);
  if (my !== adTok) return;
  res.classList.add("on");
  await SK.sleep(3800);
  if (my !== adTok) return;
  chip.classList.remove("on"); res.classList.remove("on"); big.classList.remove("up");
  await SK.sleep(300);
  if (my !== adTok) return;
  adAnim = big.animate([{ transform: "translate(0,0) scale(1)" }, { transform: adFrom() }], { duration: 700, easing: "cubic-bezier(.5, 0, .2, 1)", fill: "forwards" });
  await SK.sleep(690);
  if (my !== adTok) return;
  adReset();
  await SK.sleep(500);
}
var adField = SK.promptField(document.getElementById("soc-ad-field"), {
  placeholder: "Which post?",
  scale: 1,
  auto: false,
  prompts: ["Run the forest film as an ad"],
  onSend: function (p, ctl) { return runAd(ctl); }
});
if (SK.reduced) {
  adField.set("Run the forest film as an ad");
  big.style.opacity = "1"; big.classList.add("up"); chip.classList.add("on", "ran"); res.classList.add("on"); pickCell.classList.add("pick", "gone");
} else {
  adReset();
  SK.onView(adStage, function () { adReset(); adField.run(); }, function () { adTok++; adField.stop(); adField.state("idle").clear(); adReset(); }, { ratio: .55, threshold: [0, .3, .55, .8] });
}
