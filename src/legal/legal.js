/* Studio legal pages: the contents list follows the reader (current section highlighted), and on phones it folds into a pill. */
(function () {
  var toc = document.querySelector(".toc"), pill = toc && toc.querySelector(".toc-pill"), cur = toc && toc.querySelector("[data-cur]");
  if (!toc) return;
  var links = [].slice.call(toc.querySelectorAll(".toc-list a")), list = toc.querySelector(".toc-list");
  var heads = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  var on = -1, ticking = false;

  function setOpen(v) {
    toc.classList.toggle("open", v);
    pill.setAttribute("aria-expanded", v ? "true" : "false");
    if (v && on >= 0) { var a = links[on]; list.scrollTop = a.offsetTop - list.clientHeight / 2 + a.offsetHeight / 2; }
  }
  pill.addEventListener("click", function (e) { e.stopPropagation(); setOpen(!toc.classList.contains("open")); });
  document.addEventListener("click", function (e) { if (!toc.contains(e.target)) setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && toc.classList.contains("open")) { setOpen(false); pill.focus(); } });
  links.forEach(function (a) { a.addEventListener("click", function () { setOpen(false); }); });
  addEventListener("hashchange", function () { setOpen(false); });

  function update() {
    ticking = false;
    var line = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 100) + 40, idx = -1;
    for (var i = 0; i < heads.length; i++) { if (heads[i] && heads[i].getBoundingClientRect().top <= line) idx = i; else break; }
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) idx = heads.length - 1;
    if (idx === on) return;
    if (on >= 0) { links[on].classList.remove("on"); links[on].removeAttribute("aria-current"); }
    on = idx;
    if (cur) cur.textContent = on >= 0 ? links[on].querySelector("span").textContent : "";
    if (on < 0) return;
    var a = links[on];
    a.classList.add("on");
    a.setAttribute("aria-current", "location");
    /* keep the highlighted entry in view inside the sticky list (desktop), without moving the page */
    var box = getComputedStyle(toc).overflowY === "auto" ? toc : null;
    if (box) {
      var t = a.offsetTop, b = t + a.offsetHeight;
      if (t < box.scrollTop + 40) box.scrollTop = t - 40;
      else if (b > box.scrollTop + box.clientHeight - 40) box.scrollTop = b - box.clientHeight + 40;
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  update();
})();
