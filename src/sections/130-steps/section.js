var root = document.getElementById("start");
if (!root) return;

var s1 = root.querySelector(".gs-s1"), s2 = root.querySelector(".gs-s2"), s3 = root.querySelector(".gs-s3");
var bubbles = [].slice.call(s2.querySelectorAll(".gs-b")), kit = s2.querySelector(".gs-kit"), b3t = bubbles[2].querySelector(".gs-t");
var slots = [].slice.call(s3.querySelectorAll(".gs-film")), film = s3.querySelector("video"), tag = s3.querySelector(".gs-new");
var field = SK.promptField(document.getElementById("gs-field"), { placeholder: "What should we make?", scale: 0.82, auto: false });
var ASKS = ["Make my first launch video", "Now one about the founders retreat", "And a short one for the lobby"];
var TAGS = ["First cut", "2 cuts", "3 cuts"];
var READING = b3t.textContent, READY = "Your brand kit is ready.";

/* each scene starts clean … */
var resets = [
  function () { s1.classList.remove("a1", "a2", "a3", "a4"); },
  function () { bubbles.forEach(function (b) { b.classList.remove("on", "wait", "done"); }); b3t.textContent = READING; kit.classList.remove("on"); },
  function () { slots.forEach(function (f) { f.classList.remove("mk", "on", "old"); }); s3.classList.remove("on"); field.stop(); field.state("idle").clear(); }
];
/* … and plays in the order a person would do it, then starts over. No step waits longer than about a second.
   w() waits, and ends the run if the scene left the screen. */
var plays = [
  /* 1 · download and open */
  async function (w) {
    await w(450); s1.classList.add("a1");           /* the icon goes into Applications */
    await w(1300); s1.classList.add("a2");          /* the disk image closes, Studio lands in the Dock */
    await w(1050); s1.classList.add("a3");          /* it opens */
    await w(650); s1.classList.add("a4");           /* and fills in: the greeting, the shelves */
    await w(1900);
    s1.classList.add("rs"); resets[0]();            /* back to the disk image */
    await w(700); s1.classList.remove("rs");
  },
  /* 2 · Claude asks, the brand answers, the kit builds */
  async function (w, first) {
    if (first) bubbles[0].classList.add("on");              /* arriving: the question is already there, so this one is mid-story */
    else {
      await w(150); bubbles[0].classList.add("on", "wait"); /* Claude is writing */
      await w(750); bubbles[0].classList.remove("wait");    /* the question */
    }
    await w(first ? 700 : 1000); bubbles[1].classList.add("on");   /* the answer */
    await w(750); bubbles[2].classList.add("on");           /* "Reading your website" */
    await w(650); kit.classList.add("on");                  /* logo, name, colours, type: one piece at a time */
    await w(1900); b3t.textContent = READY; bubbles[2].classList.add("done");
    await w(1100);
    resets[1]();
    await w(380);
  },
  /* 3 · say what you want: a request, the cut lands, the next request */
  async function (w) {
    for (var i = 0; i < ASKS.length; i++) {
      await w(i ? 450 : 200);
      await field.type(ASKS[i], 34);
      await w(300); field.send();
      slots[i].classList.add("mk");                         /* Claude is making it */
      await w(1000);
      slots.forEach(function (f, k) { f.classList.toggle("old", k < i); });
      slots[i].classList.remove("mk"); slots[i].classList.add("on");
      tag.textContent = TAGS[i]; s3.classList.add("on");
      if (!i) { try { film.currentTime = 0; } catch (e) {} }
      field.state("idle").clear();
    }
    await w(1100);
    resets[2]();
    await w(450);
  }
];

function finish() {
  s1.classList.add("a1", "a2", "a3", "a4");
  bubbles.forEach(function (b) { b.classList.add("on"); }); b3t.textContent = READY; bubbles[2].classList.add("done"); kit.classList.add("on");
  slots.forEach(function (f, k) { f.classList.add("on"); f.classList.toggle("old", k < 2); }); tag.textContent = TAGS[2]; s3.classList.add("on");
  field.set(ASKS[0]);
}

if (SK.reduced) finish();
else {
  /* every scene loops by itself for as long as it is on screen, each from a different starting beat */
  var tok = [0, 0, 0], HEAD = [0, 0, 250];
  [s1, s2, s3].forEach(function (stage, i) {
    resets[i]();
    SK.onView(stage, async function () {
      var my = ++tok[i], w = function (ms) { return SK.sleep(ms).then(function () { if (tok[i] !== my) throw 0; }); };
      try { await w(HEAD[i]); for (var n = 0; ; n++) await plays[i](w, !n); } catch (e) {}
    }, function () { tok[i]++; s1.classList.remove("rs"); resets[i](); }, { ratio: 0.35, threshold: [0, 0.35, 0.7] });
  });
}
