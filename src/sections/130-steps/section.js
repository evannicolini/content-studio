var root = document.getElementById("start");
if (!root) return;

var s1 = root.querySelector(".gs-s1"), s2 = root.querySelector(".gs-s2"), s3 = root.querySelector(".gs-s3");
var bubbles = [].slice.call(s2.querySelectorAll(".gs-b")), kit = s2.querySelector(".gs-kit"), film = s3.querySelector("video");
var field = SK.promptField(document.getElementById("gs-field"), { placeholder: "What should we make?", scale: 0.82, auto: false });

var resets = [
  function () { s1.classList.remove("a1", "a2", "a3"); },
  function () { bubbles.forEach(function (b) { b.classList.remove("on"); }); kit.classList.remove("on"); },
  function () { s3.classList.remove("on"); field.stop(); field.state("idle").clear(); }
];
/* each step plays in the order a person would do it; w() waits and stops the run if the step left the screen */
var plays = [
  async function (w) {
    resets[0]();
    await w(800); s1.classList.add("a1");           /* the icon goes into Applications */
    await w(1500); s1.classList.add("a2");          /* it lands in the Dock */
    await w(1150); s1.classList.add("a3");          /* and opens */
    await w(2000);
  },
  async function (w) {
    resets[1]();
    await w(450); bubbles[0].classList.add("on");
    await w(1500); bubbles[1].classList.add("on");
    await w(950); kit.classList.add("on");
    await w(2700);
  },
  async function (w) {
    resets[2]();
    await w(500);
    await field.type("Make my first launch video");
    await w(380); field.send();
    await w(1300);
    s3.classList.add("on"); field.state("idle");
    try { film.currentTime = 0; } catch (e) {}
    await w(2900);
  }
];

var tok = [0, 0, 0, 0];
function waiter(i, my) { return function (ms) { return SK.sleep(ms).then(function () { if (tok[i] !== my) throw 0; }); }; }
function stacked() { return matchMedia("(max-width: 1020px)").matches; }
function finish() { s1.classList.add("a1", "a2", "a3"); bubbles.forEach(function (b) { b.classList.add("on"); }); kit.classList.add("on"); field.set("Make my first launch video"); s3.classList.add("on"); }

/* side by side: one, two, three, rest, again. Finished steps stay finished while the next one plays. */
async function chain() {
  var my = ++tok[3], w = waiter(3, my);
  try {
    for (;;) {
      for (var i = 0; i < 3; i++) await plays[i](w);
      await w(2600);
    }
  } catch (e) {}
}
/* stacked on a phone: each step loops by itself while it is on screen */
async function solo(i) {
  var my = ++tok[i], w = waiter(i, my);
  try { for (;;) { await plays[i](w); await w(1400); } } catch (e) {}
}

if (SK.reduced) finish();
else {
  resets.forEach(function (r) { r(); });
  bubbles[0].classList.add("on");
  SK.onView(root.querySelector(".gs-grid"), function () { if (!stacked()) chain(); }, function () { tok[3]++; }, { ratio: 0.3, threshold: [0, 0.3, 0.6] });
  [s1, s2, s3].forEach(function (s, i) {
    SK.onView(s, function () { if (stacked()) solo(i); }, function () { tok[i]++; }, { ratio: 0.5, threshold: [0, 0.5, 0.8] });
  });
}
