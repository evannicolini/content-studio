var root = document.getElementById("connect");
if (!root) return;
var map = document.getElementById("con-map"), svg = document.getElementById("con-wires"), hub = document.getElementById("con-hub");
var tiles = [].slice.call(map.querySelectorAll(".con-t")), NS = "http://www.w3.org/2000/svg", wires = [];

/* wires from the Studio mark to every tile, drawn from where things really are */
function draw() {
  var m = map.getBoundingClientRect(), h = hub.getBoundingClientRect();
  if (!m.width) return;
  svg.setAttribute("viewBox", "0 0 " + m.width + " " + m.height);
  svg.innerHTML = "";
  wires = [];
  var stacked = SK.mobile(), hx = h.left + h.width / 2 - m.left;
  tiles.forEach(function (t, i) {
    var r = t.getBoundingClientRect(), d;
    if (stacked) {
      /* phone: a spine down the gap between the two columns, a short branch to each tile */
      var sy = h.bottom - m.top, ty = r.top + r.height / 2 - m.top, left = r.left + r.width / 2 < m.left + m.width / 2;
      var ex = (left ? r.right : r.left) - m.left, q = 9;
      d = "M" + hx + " " + sy + "L" + hx + " " + (ty - q) + "Q" + hx + " " + ty + " " + (hx + (left ? -q : q)) + " " + ty + "L" + ex + " " + ty;
    } else {
      /* desktop: a fan up to the top row and down to the bottom row */
      var up = r.top < h.top, col = i % 4, sx = hx + (col - 1.5) * 18, sy2 = (up ? h.top : h.bottom) - m.top;
      var ex2 = r.left + r.width / 2 - m.left, ey = (up ? r.bottom : r.top) - m.top, k = (ey - sy2) * .55;
      d = "M" + sx.toFixed(1) + " " + sy2.toFixed(1) + "C" + sx.toFixed(1) + " " + (sy2 + k).toFixed(1) + " " + ex2.toFixed(1) + " " + (ey - k).toFixed(1) + " " + ex2.toFixed(1) + " " + ey.toFixed(1);
    }
    var base = document.createElementNS(NS, "path"), pulse = document.createElementNS(NS, "path");
    base.setAttribute("d", d); pulse.setAttribute("d", d); pulse.setAttribute("class", "p");
    svg.appendChild(base); svg.appendChild(pulse);
    var len = pulse.getTotalLength();
    wires.push({ tile: t, pulse: pulse, len: len });
  });
}

var ORDER = [0, 5, 2, 7, 1, 4, 3, 6], step = 0, timer = 0, live = false;
function ping() {
  var w = wires[ORDER[step % ORDER.length]];
  step++;
  if (!w) return;
  var seg = Math.min(64, w.len * .45), dur = Math.max(620, Math.min(1100, w.len * 3.4));
  w.pulse.style.strokeDasharray = seg + " " + (w.len + seg);
  w.pulse.animate([{ strokeDashoffset: seg, opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .8 }, { strokeDashoffset: -w.len, opacity: 0 }], { duration: dur, easing: "cubic-bezier(.45, 0, .25, 1)" });
  setTimeout(function () {
    if (!live) return;
    w.tile.classList.add("on");
    setTimeout(function () { w.tile.classList.remove("on"); }, 1500);
  }, dur * .78);
}
function start() { if (live) return; live = true; draw(); ping(); timer = setInterval(ping, 1700); }
function stop() { live = false; clearInterval(timer); tiles.forEach(function (t) { t.classList.remove("on"); }); }

draw();
window.addEventListener("load", draw);
var rz = 0;
window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(draw, 150); });
if (!SK.reduced) SK.onView(map, start, stop, { ratio: .3, threshold: [0, .3, .6] });
