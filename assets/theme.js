/* =========================================================================
   science-teacher-hub 공용 스크립트 — 정본 (v2)
   저장소 12곳에 흩어져 있던 theme.js 두 버전을 하나로 합침.

   바뀐 것 하나: setupCanvas 가 캔버스를 900px에 고정하지 않고
   컨테이너 폭에 맞춰 줄어들게 한다. 그리기 좌표계는 그대로 900 기준이라
   44개 단원의 그리기 코드는 한 줄도 고치지 않아도 된다.
   ========================================================================= */
(function () {
  "use strict";
  var root = document.documentElement;

  /* ---------- 학생 화면은 이 단원만 ----------
     학생에게는 단원 밖으로 나가는 길(‘← 과목’ 링크, 과목의 단원 목록, 허브, 교사용 안내)을 보이지 않는다.
     교사 허브를 한 번 연 기기(sth-teacher=1)와 교사 미리 보기 주소(?open=1)에서만 보인다.
     CSS 가 기본으로 숨겨 두고, 교사 기기이면 <html class="sth-teacher"> 로 다시 보이게 한다. */
  var TEACHER = false;
  try { TEACHER = localStorage.getItem("sth-teacher") === "1"; } catch (e) {}
  if (/[?&]open=1/.test(location.search)) TEACHER = true;
  window.STH_TEACHER = TEACHER;
  if (TEACHER) root.classList.add("sth-teacher");
  /* 과목 전체 QR(주소 끝 ?all=1)로 들어온 학생: 그 과목의 단원 목록을 보고, 단원 안에서 ‘← 과목’ 으로 목록에 돌아올 수 있다.
     같은 탭(sessionStorage) 동안만. 단원 QR·소단원 QR 로 들어온 학생은 지금처럼 그 단원만 본다. */
  var SUBJ = (/^\/[^\/]+\//.exec(location.pathname) || ["/"])[0], ALL = /[?&]all=1/.test(location.search);
  try { if (ALL) sessionStorage.setItem("sth-all", SUBJ); ALL = sessionStorage.getItem("sth-all") === SUBJ; } catch (e) {}
  window.STH_ALL = ALL;
  if (ALL && !TEACHER) root.classList.add("sth-all");
  /* 과목 전체 QR 학생은 그 과목 밖으로 나가지 못한다: 과목 밖(다른 과목·상위 과목 모음·허브)으로 가는 링크는 숨기고,
     단원의 ‘← 과목’ 은 이 과목 단원 목록으로 돌린다. 바깥 누리집(자료·시뮬레이션) 링크는 그대로 둔다. */
  if (ALL && !TEACHER) {
    var fence = function () {
      Array.prototype.forEach.call(document.querySelectorAll("a[href]"), function (a) {
        var u; try { u = new URL(a.getAttribute("href"), location.href); } catch (e) { return; }
        var ours = u.host === location.host || u.host === "wmfsljy-coder.github.io";
        if (!ours || u.pathname.indexOf(SUBJ) === 0) return;
        if (a.classList.contains("home") && !a.classList.contains("hub")) { a.href = SUBJ; a.textContent = "← 단원 목록"; return; }
        a.style.display = "none"; a.setAttribute("aria-hidden", "true");
        var box = a.closest(".back-link"); if (box) box.style.display = "none";
      });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fence); else fence();
    window.addEventListener("load", fence);
  }
  /* 과목 첫 화면(단원 카드 목록)은 교사용: 학생에게는 안내만 남긴다 */
  (function () {
    function gate() {
      if (TEACHER || ALL || !document.querySelector("a.unit-card") || document.querySelector(".gate-note")) return;
      Array.prototype.forEach.call(document.body.children, function (c) { if (!c.classList.contains("theme-toggle") && c.tagName !== "SCRIPT") c.style.display = "none"; });
      var n = document.createElement("div"); n.className = "gate-note";
      n.innerHTML = "<div class='gate-card'><div class='eyebrow'>학생 안내</div><h1 class='display'>선생님이 알려 준 단원 주소로 들어가세요</h1>"
        + "<p>이 화면은 선생님이 수업할 단원을 고르는 곳이에요. 수업 시간에 받은 단원 주소(링크)로 들어가면 바로 시작할 수 있어요.</p></div>";
      document.body.insertBefore(n, document.body.firstChild);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", gate); else gate();
  })();

  /* ---------- 테마 ---------- */
  var STORE = "sth-theme";
  function saved() {
    try { return localStorage.getItem(STORE); } catch (e) { return null; }
  }
  function persist(v) {
    try { localStorage.setItem(STORE, v); } catch (e) { /* 시크릿 모드 등 */ }
  }
  function current() {
    var attr = root.getAttribute("data-theme");
    if (attr) return attr;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  function label(mode) { return mode === "dark" ? "라이트 모드" : "다크 모드"; }

  var pref = saved();
  if (pref === "dark" || pref === "light") root.setAttribute("data-theme", pref);

  var themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.textContent = label(current());
    themeBtn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      persist(next);
      themeBtn.textContent = label(next);
      redrawAll();
      window.dispatchEvent(new Event("theme-changed"));
    });
  }
  if (window.matchMedia) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var onScheme = function () {
      if (root.getAttribute("data-theme")) return;   // 사용자가 직접 고른 값은 건드리지 않는다
      if (themeBtn) themeBtn.textContent = label(current());
      redrawAll();
      window.dispatchEvent(new Event("theme-changed"));
    };
    if (mq.addEventListener) mq.addEventListener("change", onScheme);
    else if (mq.addListener) mq.addListener(onScheme);
  }

  /* ---------- 허브로 돌아가는 길 ----------
     단원 페이지의 .brand 안 '← 과목' 링크 앞에 허브 링크를 하나 넣는다.
     44개 단원이 각자 마크업을 고칠 필요 없이 여기서 한 번에 붙는다. */
  (function () {
    var brand = document.querySelector(".rail .brand");
    if (!brand || brand.querySelector("a.hub")) return;
    /* 학생 기기에서는 과목 밖으로 나가는 길을 만들지 않는다. 교사 허브를 연 적이 있는 기기에서만 보인다. */
    if (!TEACHER) return;
    var a = document.createElement("a");
    a.className = "home hub";
    a.href = "https://wmfsljy-coder.github.io/science-teacher-hub/";
    a.textContent = "← 허브";
    a.style.marginRight = "10px";
    var home = brand.querySelector("a.home");
    if (home) brand.insertBefore(a, home);
    else brand.insertBefore(a, brand.firstChild);
  })();

  /* ---------- 탭 ---------- */
  var tabBtns = document.querySelectorAll(".tab-btn");
  var panels = document.querySelectorAll(".tab-panel");
  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var idx = btn.getAttribute("data-tab");
      tabBtns.forEach(function (b) { b.classList.toggle("active", b === btn); });
      panels.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== idx; });
      window.dispatchEvent(new CustomEvent("tab-shown", { detail: idx }));
    });
  });

  /* ---------- 탭 접근성 · 휴대폰 탭 줄 (sth-a11y-v1) ----------
     탭 단추를 .tab-strip(role=tablist) 하나로 묶는다. 넓은 화면에서는 예전처럼 세로로 쌓이고,
     휴대폰(780px 이하)에서는 과목·단원 이름 줄 아래에 탭만 가로로 밀린다(제목·‘← 과목’이 밀려 사라지지 않게).
     role=tab/tabpanel, aria-selected 를 늘 맞추고, 화살표·Home·End 로 탭을 옮길 수 있다.
     다른 부품(precheck·scope·quiz)이 탭을 더하거나 active 를 바꿔도 지켜보다가 다시 맞춘다. */
  (function () {
    var rail = document.querySelector(".rail");
    var first = rail && rail.querySelector(":scope > .tab-btn");
    if (!rail || !first) return;
    var strip = document.createElement("div");
    strip.className = "tab-strip"; strip.setAttribute("role", "tablist"); strip.setAttribute("aria-label", "단원 차례");
    rail.insertBefore(strip, first);
    Array.prototype.forEach.call(rail.querySelectorAll(":scope > .tab-btn"), function (b) { strip.appendChild(b); });
    var mq = window.matchMedia ? window.matchMedia("(max-width: 780px)") : null;
    function orient() { strip.setAttribute("aria-orientation", mq && mq.matches ? "horizontal" : "vertical"); }
    orient(); if (mq) { if (mq.addEventListener) mq.addEventListener("change", orient); else if (mq.addListener) mq.addListener(orient); }
    function reveal(b) {
      if (strip.scrollWidth <= strip.clientWidth + 2) return;
      var sr = strip.getBoundingClientRect(), br = b.getBoundingClientRect();
      if (br.left < sr.left) strip.scrollLeft -= sr.left - br.left + 16;
      else if (br.right > sr.right) strip.scrollLeft += br.right - sr.right + 16;
    }
    var last = null, queued = false;
    function sync() {
      queued = false;
      var btns = strip.querySelectorAll(".tab-btn"), on1 = null;
      Array.prototype.forEach.call(btns, function (b) {
        var k = b.getAttribute("data-tab");
        b.setAttribute("role", "tab");
        if (!b.id && k != null) b.id = "sth-tab-" + k;
        var p = k == null ? null : document.querySelector('.tab-panel[data-panel="' + k + '"]');
        if (p) {
          if (!p.id) p.id = "sth-panel-" + k;
          p.setAttribute("role", "tabpanel"); p.setAttribute("aria-labelledby", b.id);
          b.setAttribute("aria-controls", p.id);
        }
        var on = b.classList.contains("active");
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        if (on && !on1) on1 = b;
      });
      if (!on1 && btns[0]) btns[0].tabIndex = 0;
      if (on1 && on1 !== last) { last = on1; reveal(on1); }
    }
    function later() { if (!queued) { queued = true; Promise.resolve().then(sync); } }
    sync();
    if (window.MutationObserver) new MutationObserver(later).observe(strip, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    strip.addEventListener("keydown", function (e) {
      var b = e.target.closest ? e.target.closest(".tab-btn") : null;
      if (!b || e.altKey || e.ctrlKey || e.metaKey) return;
      var list = Array.prototype.filter.call(strip.querySelectorAll(".tab-btn"), function (x) { return x === b || x.offsetParent !== null; });
      var i = list.indexOf(b), j = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % list.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + list.length) % list.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = list.length - 1;
      if (j < 0) return;
      e.preventDefault();
      list[j].focus();
      if (!list[j].classList.contains("scope-off")) list[j].click();   /* 범위 밖 탭은 초점만(누르면 범위를 풀고 그쪽으로 간다) */
    });
  })();

  /* ---------- 슬라이더 이름표 ----------
     단원 페이지의 <div class="ctrl-label">이름<span class="val">값</span></div> 바로 다음 슬라이더를
     aria-labelledby 로 잇고(이름만), 값 글(.val)은 aria-valuetext 로 읽어 준다. 버튼 묶음(.seg)은 role=group 으로 이름을 붙이고
     켜진 단추에 aria-pressed 를 맞춘다. 나중에 생기는 실험실·탐구 슬라이더도 따라 붙인다. */
  (function () {
    var seq = 0;
    function labelEl(r) {
      var p = r.previousElementSibling;
      if (p && p.classList.contains("ctrl-label")) return p;
      var g = r.parentNode;
      if (g && g.querySelector) { var c = g.querySelector(":scope > .ctrl-label"); if (c) return c; }
      return null;
    }
    function nameOf(lab) {
      var val = lab.querySelector(":scope > .val");
      if (!val) { if (!lab.id) lab.id = "sth-lbl-" + (++seq); return { id: lab.id, val: null }; }
      var n = lab.querySelector(":scope > .sth-lbl");
      if (!n) {
        n = document.createElement("span"); n.className = "sth-lbl"; n.id = "sth-lbl-" + (++seq);
        Array.prototype.slice.call(lab.childNodes).forEach(function (x) { if (x !== val) n.appendChild(x); });
        lab.insertBefore(n, val);
      }
      return { id: n.id, val: val };
    }
    function vt(r, val) { var s = (val.textContent || "").trim(); if (s) r.setAttribute("aria-valuetext", s); else r.removeAttribute("aria-valuetext"); }
    function scan() {
      Array.prototype.forEach.call(document.querySelectorAll("input[type=range]:not([data-sth-l])"), function (r) {
        r.setAttribute("data-sth-l", "1");
        if (r.hasAttribute("aria-label") || r.hasAttribute("aria-labelledby") || (r.labels && r.labels.length)) return;
        var lab = labelEl(r);
        if (lab) {
          var nm = nameOf(lab);
          r.setAttribute("aria-labelledby", nm.id);
          if (nm.val) {
            var val = nm.val; vt(r, val);
            r.addEventListener("input", function () { setTimeout(function () { vt(r, val); }, 0); });
            r.addEventListener("change", function () { setTimeout(function () { vt(r, val); }, 0); });
          }
        } else if (r.id) {
          var l2 = document.querySelector('label[for="' + r.id + '"]');
          if (!l2 && r.previousElementSibling && r.previousElementSibling.tagName === "LABEL") { l2 = r.previousElementSibling; }
          if (l2) { if (!l2.id) l2.id = "sth-lbl-" + (++seq); r.setAttribute("aria-labelledby", l2.id); }
        }
      });
      Array.prototype.forEach.call(document.querySelectorAll(".seg:not([data-sth-l])"), function (g) {
        g.setAttribute("data-sth-l", "1");
        if (!g.hasAttribute("role")) g.setAttribute("role", "group");
        var lab = g.previousElementSibling;
        if (lab && lab.classList.contains("ctrl-label") && !g.hasAttribute("aria-labelledby")) { var nm = nameOf(lab); g.setAttribute("aria-labelledby", nm.id); }
        function press() { Array.prototype.forEach.call(g.querySelectorAll("button"), function (b) { b.setAttribute("aria-pressed", b.classList.contains("on") ? "true" : "false"); }); }
        press();
        if (window.MutationObserver) new MutationObserver(press).observe(g, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
      });
    }
    var timer = 0;
    function later() { if (!timer) timer = setTimeout(function () { timer = 0; scan(); }, 150); }
    function start() {
      scan();
      if (window.MutationObserver && document.body) new MutationObserver(function (ms) {
        for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { later(); return; }
      }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
    window.addEventListener("load", later);
  })();

  /* ---------- 유틸 ---------- */
  /* 그림 색: 이야기 단원(.episode 가 있는 쪽)의 캔버스는 어두운 '무대' 색(theme.css 의 .sth-stage)으로 그린다.
     화면 글자 색이 필요하면 cssVarPage 를 쓴다. 무대를 끄려면 <html data-stage="off"> */
  var stageEl = null;
  window.cssVarPage = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };
  var studioEl = null;
  window.cssVarStudio = function (name) {
    if (!studioEl && document.body) { studioEl = document.createElement("div"); studioEl.className = "sth-studio"; studioEl.hidden = true; document.body.appendChild(studioEl); }
    var v = studioEl ? getComputedStyle(studioEl).getPropertyValue(name).trim() : "";
    return v || window.cssVarPage(name);
  };
  window.cssVar = function (name) {
    if (stageEl === null) {
      stageEl = false;
      if (document.body && document.querySelector(".episode") && document.documentElement.getAttribute("data-stage") !== "off") {
        stageEl = document.createElement("div"); stageEl.className = "sth-stage"; stageEl.hidden = true;
        document.body.appendChild(stageEl);
      }
    }
    var v = stageEl ? getComputedStyle(stageEl).getPropertyValue(name).trim() : "";
    return v || window.cssVarPage(name);
  };

  /* ---------- 캔버스 ----------------------------------------------------
     예전 방식은 canvas.style.width 를 900px 로 못박아, 폰에서 그림의 3분의 2가
     화면 밖으로 나갔다. 이제는 표시 크기를 CSS(100%)에 맡기고,
     내부 픽셀 버퍼만 900×H(×화면배율)로 유지한다.
       · 그리기 코드는 계속 가로 900 좌표계를 쓰면 된다
       · 창 크기가 바뀌어도 다시 그릴 필요가 없다 (브라우저가 축소해 준다)
       · 마우스/터치 좌표 변환에 쓰는 canvas._w, canvas._h 도 그대로 유지
     한 번만 그리는 화면에서 테마 전환에도 색을 따라가게 하려면
     canvas._redraw = 그리기함수  로 등록해 두면 된다. --------------------- */
  var canvases = [];

  /* 그림에 쓴 글자를 적어 둔다(휴대폰의 ‘그림 속 글자 크게 읽기’ 칸이 읽는다). 한 번 그릴 때 쓴 글자를 한 묶음으로 본다 */
  function hookText(canvas, ctx) {
    var orig = ctx.fillText, batch = null;
    ctx.fillText = function (t, x, y, m) {
      var s = String(t).trim();
      if (s) {
        if (!batch) { batch = []; var b = batch; Promise.resolve().then(function () { batch = null; canvas._texts = b; if (canvas._onText) canvas._onText(); }); }
        var tr = ctx.getTransform(), k = canvas.width / canvas._w;
        batch.push({ s: s, x: (tr.a * x + tr.c * y + tr.e) / k, y: (tr.b * x + tr.d * y + tr.f) / k });
      }
      return m === undefined ? orig.call(ctx, t, x, y) : orig.call(ctx, t, x, y, m);
    };
  }

  /* 휴대폰 글자 키우기 — 가로 900 좌표 그림이 338px 쯤으로 줄면 12px 글자가 4.5px 가 된다.
     그림이 실제로 보이는 폭(CSS 폭)을 보고, 16px 보다 작은 글자를 최대 1.35배까지 키워 그린다(넓은 화면·크게 보기에서는 그대로).
     그림 좌표는 그대로라 그리기 코드는 고치지 않는다. 글자 폭을 measureText 로 재는 코드는 키운 크기로 잰다.
     끄려면 <html data-cvtext="off"> */
  var FONT_D = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "font");
  var TEXT_MAX = 1.35, TEXT_MIN_CSS = 7.5, TEXT_UNDER = 16;
  function cssWidthOf(canvas) {
    var w = canvas.getBoundingClientRect ? canvas.getBoundingClientRect().width : 0;
    if (!w) { var m = document.querySelector("main"); w = m ? m.clientWidth - 36 : 0; }
    if (!w) w = (window.innerWidth || 900) - 40;
    return w;
  }
  function textK(canvas) {
    if (root.getAttribute("data-cvtext") === "off" || /[?&]cvtext=off/.test(location.search) || !canvas._w) return 1;
    var s = Math.min(1, cssWidthOf(canvas) / canvas._w);        /* 화면에 보이는 배율 */
    if (s >= 0.66) return 1;
    return s;
  }
  function boostText(canvas, ctx) {
    if (!FONT_D || !FONT_D.set || !FONT_D.get) return;
    canvas._tk = textK(canvas);
    try {
      Object.defineProperty(ctx, "font", {
        configurable: true,
        get: function () { return FONT_D.get.call(ctx); },
        set: function (v) {
          var s = canvas._tk || 1;
          if (s < 1) v = String(v).replace(/(\d+(?:\.\d+)?)px/, function (m0, n) {
            n = +n; if (!(n > 0) || n >= TEXT_UNDER) return m0;
            var want = Math.max(n, Math.min(TEXT_MIN_CSS / s, n * TEXT_MAX, TEXT_UNDER + 2));
            return (Math.round(want * 10) / 10) + "px";
          });
          FONT_D.set.call(ctx, v);
        }
      });
    } catch (e) {}
  }
  var tkTimer = 0;
  function retext() {
    tkTimer = 0;
    var any = false;
    for (var i = 0; i < canvases.length; i++) { var c = canvases[i], k = textK(c); if (c.getBoundingClientRect().width && Math.abs(k - (c._tk || 1)) > 0.02) { c._tk = k; any = true; } }
    if (any) redrawAll();
  }
  window.addEventListener("resize", function () { if (!tkTimer) tkTimer = setTimeout(retext, 250); });
  window.addEventListener("tab-shown", function () { setTimeout(retext, 60); });
  window.sthRetext = retext;

  window.setupCanvas = function (canvas) {
    var ctx = canvas.getContext("2d");
    if (canvas._dprSet) return ctx;

    var W = canvas.width, H = canvas.height;          // 논리 좌표계 (지금까지의 900×H)
    var dpr = 2;   // 늘 2배로 그린다 — 크게 보기(교실 화면 1배율 포함)에서도 선명하게. 3배율 휴대폰도 2배로 묶어 메모리를 아낀다

    canvas.style.width = "100%";                      // 표시 크기는 컨테이너가 정한다
    canvas.style.height = "auto";
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);

    canvas._dprSet = true;
    /* 화면 읽기 프로그램용: 그림이라는 것과 무엇의 그림인지, 수치는 아래 글에도 나온다는 것을 알린다 */
    if (!canvas.hasAttribute("role")) {
      canvas.setAttribute("role", "img");
      if (!canvas.hasAttribute("aria-label")) {
        var sc = canvas.closest ? canvas.closest("[data-title], .lab-case, .tab-panel") : null, nm = "";
        if (sc) nm = sc.getAttribute("data-title") || ((sc.querySelector("h3, h2") || {}).textContent || "");
        canvas.setAttribute("aria-label", (nm ? nm + " — " : "") + "조작에 따라 바뀌는 그림. 수치와 판정은 그림 아래 글로도 나옵니다.");
      }
    }
    canvas._w = W;
    canvas._h = H;
    canvases.push(canvas);
    boostText(canvas, ctx);
    hookText(canvas, ctx);
    if (window.sthAddBig) setTimeout(function () { window.sthAddBig(canvas); }, 0);
    return ctx;
  };

  /* 판정·안내 칸이 바뀌면 읽어 주도록 */
  function liveRegions() {
    Array.prototype.forEach.call(document.querySelectorAll("[id$='-info'], .mission, .lab-verdict, .why"), function (e) {
      if (!e.hasAttribute("aria-live")) e.setAttribute("aria-live", "polite");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(liveRegions, 0); });
  else setTimeout(liveRegions, 0);
  window.addEventListener("load", function () { setTimeout(liveRegions, 300); });

  function redrawAll() {
    for (var i = 0; i < canvases.length; i++) {
      if (typeof canvases[i]._redraw === "function") canvases[i]._redraw();
    }
  }
  window.redrawCanvases = redrawAll;

  /* ---------- 그리기 도우미 ---------- */
  window.drawArrow = function (ctx, x1, y1, x2, y2, head) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    var ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(ang - 0.45), y2 - head * Math.sin(ang - 0.45));
    ctx.lineTo(x2 - head * Math.cos(ang + 0.45), y2 - head * Math.sin(ang + 0.45));
    ctx.closePath();
    ctx.fill();
  };

  window.roundRect = function (ctx, x, y, w, h, r) {
    if (typeof r === "undefined") r = 6;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /* =========================================================================
     학습 설계 부품 — 예측 잠금 · 산출물 · 진행 기록
     단원 페이지는 sthUnit() 으로 이름을 정하고 sthGate() / sthWork() 만 부르면 된다.
     ========================================================================= */
  var UNIT = "sth-unit", STATE = {}, FIELDS = {};

  function store() {
    try { localStorage.setItem(UNIT, JSON.stringify({ s: STATE, w: FIELDS })); }
    catch (e) { /* 시크릿 모드 등에서는 저장이 막힌다 */ }
    if (window.sthOnStore) { try { window.sthOnStore(UNIT); } catch (e) {} }   /* account.js — 로그인했으면 서버로 */
    paintRecap();
  }
  function restore() {
    try {
      var o = JSON.parse(localStorage.getItem(UNIT) || "{}");
      if (o.s) STATE = o.s;
      if (o.w) FIELDS = o.w;
    } catch (e) { STATE = {}; FIELDS = {}; }
  }

  /* 단원 이름 정하기. 이걸 불러야 저장이 단원별로 나뉜다. */
  window.sthUnit = function (name) {
    UNIT = "sth-" + name;
    restore();
    return { state: STATE, fields: FIELDS };
  };
  window.sthUnitId = function () { return String(UNIT || "").replace(/^sth-/, ""); };
  window.sthState = function (k, v) {
    if (arguments.length === 1) return STATE[k];
    STATE[k] = v; store(); return v;
  };

  /* ---- 보기 섞기 ----
     정답이 늘 같은 자리에 있지 않도록, 질문 글자로 정한 순서로 보기를 늘어놓는다(다시 열어도 같은 순서).
     보기 앞의 ㉠㉡㉢ 은 보이는 자리대로 다시 붙인다. keep 이 참이면(해설이 번호를 가리키는 문항) 섞지 않는다.
     돌려주는 값: order[보이는 자리] = 원래 번호, text[원래 번호] = 화면에 보이는 글 */
  var MARK_ = "㉠㉡㉢㉣㉤";
  window.sthStripMark = function (t) { return String(t == null ? "" : t).replace(/^[㉠㉡㉢㉣㉤]\s*/, ""); };
  window.sthHasRef = function (x) { return /[①②③④⑤㉠㉡㉢㉣㉤]/.test(Array.isArray(x) ? x.join(" ") : String(x || "")); };
  window.sthShuffle = function (opts, seed, keep, fixMarks) {
    var n = opts.length, ord = [], i, h = 2166136261;
    for (i = 0; i < n; i++) ord.push(i);
    if (!keep && n >= 2) {
      seed = String(seed || "");
      for (i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul ? Math.imul(h, 16777619) >>> 0 : (h * 16777619) >>> 0; }
      for (i = n - 1; i > 0; i--) { h = (Math.imul ? Math.imul(h, 1103515245) : h * 1103515245) + 12345 >>> 0; var j = (h >>> 8) % (i + 1), x = ord[i]; ord[i] = ord[j]; ord[j] = x; }
    }
    var marked = n > 0 && opts.every(function (t) { return /^[㉠㉡㉢㉣㉤]/.test(String(t)); }), text = [];
    ord.forEach(function (o, pos) { text[o] = marked && !fixMarks ? MARK_.charAt(pos) + " " + window.sthStripMark(opts[o]) : opts[o]; });
    return { order: ord, text: text };
  };

  /* ---- 예측 잠금 ----
     opt = { gate:'게이트 요소 id', veil:'덮개 요소 id', key:'저장 이름',
             question:'질문', options:['㉠ …','㉡ …'], onPick:function(i, text){} }   */
  window.sthGate = function (opt) {
    var gate = document.getElementById(opt.gate);
    var veil = opt.veil ? document.getElementById(opt.veil) : null;
    if (!gate) return;
    var html = '<h4>' + (opt.title || "먼저 예상해 봅시다") + '</h4>'
             + '<p>' + opt.question + '</p><div class="opts"></div>';
    gate.innerHTML = html;
    var box = gate.querySelector(".opts");
    var mix = window.sthShuffle(opt.options, opt.key + "|" + opt.question, opt.keepOrder, true), btn = [];   /* 기호는 원래 것 그대로(결말 판정이 원래 기호를 본다) */
    opt.options.forEach(function (t0, i) {
      var t = mix.text[i];
      var b = document.createElement("button");
      b.className = "opt"; b.type = "button"; b.textContent = t; b.setAttribute("data-i", i);
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(box.children, function (o) { o.classList.remove("picked"); });
        b.classList.add("picked");
        gate.classList.add("done");
        if (veil) veil.hidden = true;
        STATE[opt.key || "pred"] = t; STATE[(opt.key || "pred") + "I"] = i;
        store();
        if (typeof opt.onPick === "function") opt.onPick(i, t);
      });
      btn[i] = b;
    });
    mix.order.forEach(function (o) { box.appendChild(btn[o]); });
    /* ---- 짝과 이야기한 뒤 다시 고르기 · 우리 반 투표 ----
       처음 고른 보기(첫 추리 기록·결말 판정에 쓰임)는 그대로 두고, 다시 고른 보기는 따로 적어 둔다(키 + "_2I"). */
    var K = opt.key || "pred", again = false, VSENT = "sth-vsent-" + String(UNIT || "") + "-" + (opt.key || "pred");
    var rv = document.createElement("div"); rv.className = "gate-rv"; gate.appendChild(rv);
    function mark(i) { var t = mix.text[i] || ""; return t.length > 30 ? t.slice(0, 29) + "…" : t; }
    function paintRv() {
      var first = STATE[K + "I"], second = STATE[K + "_2I"];
      Array.prototype.forEach.call(box.children, function (o) {
        var i = +o.getAttribute("data-i");
        o.classList.toggle("picked", !again && i === first);
        o.classList.toggle("again", again && i === second);
        o.classList.toggle("first-ghost", again && i === first);
      });
      if (typeof first !== "number") { rv.hidden = true; return; }
      rv.hidden = false;
      var h = again
        ? "<span class='rv-msg'>💬 짝과 이야기했나요? 지금 생각하는 보기를 다시 고르세요. <b>처음 고른 것(흐린 테두리)은 기록에 그대로 남습니다.</b></span>"
          + "<button type='button' class='btn rv-done'>다 골랐어요</button>"
        : "<span class='rv-msg'>" + (typeof second === "number" ? "처음 <b>" + mark(first) + "</b> → 다시 <b>" + mark(second) + "</b>" : "고른 보기: <b>" + mark(first) + "</b>") + "</span>"
          + "<button type='button' class='btn rv-again'>💬 짝과 이야기한 뒤 다시 고르기</button>";
      var me = {}; try { me = JSON.parse(localStorage.getItem("sth-me") || "{}"); } catch (e) {}
      /* 로그인한 학생은 반·별명을 따로 저장하지 않아도 로그인으로 투표한다 */
      if (!(me.cls && me.nick) && window.sthAccount && window.sthAccount.ident) { var li = window.sthAccount.ident(String(UNIT || "").replace(/^sth-/, "")); if (li) me = li; }
      if (!me.t && me.nick && window.sthAccount && window.sthAccount.tokFor) me.t = window.sthAccount.tokFor(me.nick);   /* 저장한 별명이 '@학번' 이면 로그인 토큰 */
      var url = String(window.STH_SHARE_URL || "").trim(), hosts = window.STH_SHARE_HOSTS;
      if (url && hosts && hosts.length && hosts.indexOf(location.hostname) < 0) url = "";
      if (url && !again) h += me.cls && me.nick ? "<button type='button' class='btn rv-send'>📣 우리 반 투표에 보내기</button><span class='rv-st'></span>"
                                             : "<span class='rv-st'>‘우리 반’ 탭에서 반과 별명을 저장하면 투표를 보낼 수 있어요.</span>";
      rv.innerHTML = h;
      var b1 = rv.querySelector(".rv-again"), b2 = rv.querySelector(".rv-done"), b3 = rv.querySelector(".rv-send");
      if (b1) b1.addEventListener("click", function () { again = true; paintRv(); });
      if (b2) b2.addEventListener("click", function () {
        again = false; paintRv();
        /* 처음 투표를 보냈던 학생은 다시 고른 것도 저절로 보낸다 */
        var sent = false; try { sent = sessionStorage.getItem(VSENT) === "1"; } catch (e) {}
        var b4 = rv.querySelector(".rv-send"); if (sent && b4) b4.click();
      });
      if (b3) b3.addEventListener("click", function () {
        var stx = rv.querySelector(".rv-st"); if (!url) { stx.textContent = "공유가 꺼져 있습니다."; return; }
        b3.disabled = true; stx.textContent = "보내는 중…";
        fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "vote", cls: me.cls, nick: me.nick, t: me.t || "", unit: String(UNIT || "").replace(/^sth-/, ""), key: K,
                                 a: STATE[K + "I"], b: typeof STATE[K + "_2I"] === "number" ? STATE[K + "_2I"] : "" }) })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (!j.ok) throw new Error(j.error || "오류"); stx.textContent = "✓ 보냈습니다"; try { sessionStorage.setItem(VSENT, "1"); } catch (e) {} })
          .catch(function (e) { stx.textContent = "보내지 못했습니다 (" + e.message + "). 잠시 뒤 다시 눌러 보세요."; })
          .then(function () { b3.disabled = false; });
      });
    }
    /* 다시 고르는 동안에는 처음 고른 보기를 바꾸지 않는다 — 단추의 원래 동작보다 먼저 가로챈다 */
    box.addEventListener("click", function (e) {
      if (!again) return;
      var o = e.target.closest ? e.target.closest(".opt") : null; if (!o) return;
      e.stopPropagation(); e.preventDefault();
      STATE[K + "_2I"] = +o.getAttribute("data-i"); store(); paintRv();
    }, true);
    box.addEventListener("click", function () { if (!again) setTimeout(paintRv, 0); });
    /* 이미 고른 적이 있으면 그대로 복원한다 */
    var prev = STATE[opt.key || "pred"];
    if (prev) {
      var idx = -1;
      opt.options.forEach(function (t, i) { if (idx < 0 && window.sthStripMark(t) === window.sthStripMark(prev)) idx = i; });
      if (idx >= 0) {
        btn[idx].classList.add("picked"); STATE[(opt.key || "pred")] = opt.options[idx]; STATE[(opt.key || "pred") + "I"] = idx; store();
        gate.classList.add("done");
        if (veil) veil.hidden = true;
        if (typeof opt.onPick === "function") opt.onPick(idx, prev);
      }
    }
    paintRv();
  };

  /* ---- 산출물 ----
     opt = { mount:'붙일 요소 id', unitLabel:'제목줄에 넣을 단원 이름',
             items:[{ id, label, hint, ph }] , recap:[{key,label}] }   */
  var RECAP = null;
  window.sthWork = function (opt) {
    var mount = document.getElementById(opt.mount);
    if (!mount) return;
    var h = "";
    if (opt.recap && opt.recap.length) {
      h += '<div class="recap" id="' + opt.mount + '-recap"></div>';
      RECAP = { id: opt.mount + "-recap", rows: opt.recap };
    }
    h += '<div class="work">';
    opt.items.forEach(function (it, i) {
      h += '<label for="' + it.id + '">' + (i + 1) + ". " + it.label
         + ' <span class="saved" id="' + it.id + '-s"></span></label>';
      if (it.hint) h += '<p class="hint" style="margin:0 0 6px">' + it.hint + '</p>';
      h += '<textarea id="' + it.id + '" placeholder="' + (it.ph || "") + '"></textarea>';
      if (it.after) h += '<p class="hint">' + it.after + '</p>';
    });
    h += '<div class="btn-row" style="margin-top:18px">'
       + '<button class="btn primary" type="button" id="' + opt.mount + '-copy">답안 복사</button>'
       + '<button class="btn" type="button" id="' + opt.mount + '-wipe">모두 지우기</button>'
       + '<span class="saved" id="' + opt.mount + '-msg"></span></div></div>';
    mount.innerHTML = h;

    opt.items.forEach(function (it) {
      var el = document.getElementById(it.id);
      if (FIELDS[it.id]) el.value = FIELDS[it.id];
      var tag = document.getElementById(it.id + "-s"), timer = null;
      el.addEventListener("input", function () {
        FIELDS[it.id] = el.value;
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          store();
          if (tag) { tag.textContent = "저장됨"; setTimeout(function () { tag.textContent = ""; }, 1200); }
        }, 400);
      });
    });

    var msg = document.getElementById(opt.mount + "-msg");
    document.getElementById(opt.mount + "-copy").addEventListener("click", function () {
      var lines = [opt.unitLabel || document.title, "이름: ______________", ""];
      (opt.recap || []).forEach(function (r) {
        lines.push("· " + r.label + ": " + (STATE[r.key] || "-"));
      });
      if (opt.recap && opt.recap.length) lines.push("");
      opt.items.forEach(function (it, i) {
        lines.push((i + 1) + ") " + it.label.replace(/<[^>]+>/g, ""));
        lines.push(document.getElementById(it.id).value || "-");
        lines.push("");
      });
      var txt = lines.join("\n");
      function ok() { msg.textContent = "복사했습니다. 붙여넣어 제출하세요."; setTimeout(function () { msg.textContent = ""; }, 2600); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); ok(); }
        catch (e) { msg.textContent = "복사가 막혀 있습니다. 직접 선택해 복사해 주세요."; }
        document.body.removeChild(ta);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(ok, fallback);
      } else fallback();
    });
    document.getElementById(opt.mount + "-wipe").addEventListener("click", function () {
      opt.items.forEach(function (it) { var e = document.getElementById(it.id); if (e) e.value = ""; FIELDS[it.id] = ""; });
      store();
    });
    paintRecap();
  };

  function paintRecap() {
    if (!RECAP) return;
    var el = document.getElementById(RECAP.id);
    if (!el) return;
    el.innerHTML = RECAP.rows.map(function (r) {
      var v = STATE[r.key];
      return "<div>" + r.label + " : "
        + (v ? "<b>" + v + "</b>" : "<span class='none'>아직 하지 않음</span>") + "</div>";
    }).join("");
  }

  /* 구형 기기(크롬 98 이하 등)에는 ctx.roundRect 가 없다 */
  if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      if (typeof r === "undefined") r = 6;
      if (Array.isArray(r)) r = r.length ? r[0] : 6;
      window.roundRect(this, x, y, w, h, r);
      return this;
    };
  }
  /* ---------- 한글 줄바꿈 ----------
     word-break: keep-all 은 어절 가운데를 끊지 않지만, 괄호·가운뎃점·빗금 앞뒤에서는 줄을 바꿀 수 있어
     ‘궤도선(Mars’ ‘수온·염분·밀도가’ 같은 한 덩어리가 두 줄로 갈린다. 이런 짧은 어절을 <span class="nw"> 로
     묶어 한 줄에 둔다. 나중에 바뀌는 글(설명 칸·판정 글)도 따라가며 묶는다. 글자 내용(textContent)은 그대로다. */
  (function () {
    if (!window.MutationObserver || !document.createTreeWalker) return;
    var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION|CANVAS|SVG|CODE|PRE|TITLE)$/i;
    var WORD = /\S*[가-힣]\S*/g, MARK = /[()（）·∙\/℃°%‰–\-~…]/;
    var PROSE = "p, li, dd, .say, .info-card, .detail-panel, .why, .hint, .q, .msg, .lab-task-t, .lab-hint, .pc-ans, .pc-s, .std-note, .miscon, .stage-head p, .qz-q, .qz-fb, .qz-ans, .case-file";
    function skip(p) {
      for (var a = p; a && a !== document.body; a = a.parentNode) {
        if (a.nodeType !== 1) continue;
        if (SKIP.test(a.tagName) || a.isContentEditable) return true;
        if (a.classList && (a.classList.contains("nw") || a.classList.contains("tok"))) return true;
      }
      return false;
    }
    function wrap(n) {
      var t = n.nodeValue, p = n.parentNode;
      if (!t || !p || p.nodeType !== 1 || !MARK.test(t) || !/[가-힣]/.test(t) || skip(p)) return;
      var out = [], last = 0, m, any = false, lim = p.closest && p.closest("td, th") && !p.closest(".pc-tbl") ? 10 : 18;   /* 표 칸은 좁아 짧은 것만 */
      WORD.lastIndex = 0;
      while ((m = WORD.exec(t))) {
        if (!MARK.test(m[0]) || m[0].length > lim) continue;
        if (m[0].length > 12 && !/[()（）\/℃°%‰–\-~…]/.test(m[0])) continue;   /* 가운뎃점만 있는 긴 덩어리는 · 뒤에서 줄을 바꿔도 자연스럽다(좁은 칸에서 넘치지 않게) */
        any = true; out.push(t.slice(last, m.index), [m[0]]); last = m.index + m[0].length;
      }
      if (!any) return;
      out.push(t.slice(last));
      var f = document.createDocumentFragment();
      out.forEach(function (x) {
        if (typeof x === "string") { if (x) f.appendChild(document.createTextNode(x)); return; }
        var s = document.createElement("span"); s.className = "nw"; s.textContent = x[0]; f.appendChild(s);
      });
      p.replaceChild(f, n);
    }
    function scan(root) {
      if (!root) return;
      if (root.nodeType === 3) { wrap(root); return; }
      if (root.nodeType !== 1 || skip(root)) return;
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [], x;
      while ((x = w.nextNode())) list.push(x);
      list.forEach(wrap);
      /* 문단 끝 외톨이 줄 막기: 마지막 낱말이 짧으면 그 앞 낱말과 묶는다(책에서 끝줄에 한 낱말만 남기지 않는 것처럼) */
      var blocks = root.matches && root.matches(PROSE) ? [root] : [];
      if (root.querySelectorAll) blocks = blocks.concat(Array.prototype.slice.call(root.querySelectorAll(PROSE)));
      blocks.forEach(tail);
      glue(root);
    }
    /* 강조 태그와 뒤에 붙은 조사가 다른 마디에 있을 때(<b>45°</b>로 · <b>감람석·운모·석영</b>은): 둘을 함께 묶는다 */
    function glue(root) {
      if (!root.querySelectorAll) return;
      Array.prototype.forEach.call(root.querySelectorAll("b, strong, em, i, sub, sup"), function (e) {
        var nx = e.nextSibling, tx = e.textContent;
        if (!nx || nx.nodeType !== 3 || !tx || /\s$/.test(tx) || !MARK.test(tx) || skip(e)) return;
        var m = /^[^\s]+/.exec(nx.nodeValue); if (!m || !/[가-힣]/.test(m[0] + tx) || tx.length + m[0].length > 20) return;
        var s = document.createElement("span"); s.className = "nw";
        e.parentNode.insertBefore(s, e); s.appendChild(e);
        s.appendChild(document.createTextNode(m[0])); nx.nodeValue = nx.nodeValue.slice(m[0].length);
      });
    }
    function tail(el) {
      if (skip(el) || el.closest && el.closest("td, th") && !el.closest(".pc-tbl")) return;
      var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n = null, x;
      while ((x = w.nextNode())) if (x.nodeValue.trim()) n = x;
      if (!n) return;
      var p = n.parentNode, t = n.nodeValue, m;
      function short(a, b) { return b.replace(/[^가-힣A-Za-z0-9]/g, "").length <= 4 && (a + b).length <= 20 && /[가-힣0-9]/.test(a + b); }
      /* 끝 낱말이 이미 묶음(.nw) 안이면 그 앞 낱말을 묶음 안으로 들인다 — ‘일까요? (정수로)’ */
      if (p.nodeType === 1 && p.classList.contains("nw")) {
        var pv = p.previousSibling, pe = pv && pv.previousSibling;
        if (p.classList.contains("nwt") || p.lastChild !== n || !pv || pv.nodeType !== 3 || !p.parentNode || skip(p.parentNode)) return;
        /* 앞 낱말도 묶음이면(‘(지수만 쓰세요)’) 두 묶음을 하나로 */
        if (!pv.nodeValue.trim() && pe && pe.nodeType === 1 && /^(SPAN|B|STRONG|EM|I|SUB|SUP)$/.test(pe.tagName) && !/\s/.test(pe.textContent) && short(pe.textContent, p.textContent)) {
          var g2 = document.createElement("span"); g2.className = "nw nwt"; p.parentNode.insertBefore(g2, pe); g2.appendChild(pe); g2.appendChild(pv); g2.appendChild(p);
          return;
        }
        m = /(\S+)(\s+)$/.exec(pv.nodeValue); if (!m || !short(m[1], p.textContent)) return;
        pv.nodeValue = pv.nodeValue.slice(0, m.index); p.insertBefore(document.createTextNode(m[1] + m[2]), p.firstChild); p.classList.add("nwt");
        return;
      }
      if (skip(p)) return;
      m = /(\S+)(\s+)(\S+)(\s*)$/.exec(t);
      if (!m) {
        /* 끝 낱말만 글자 마디에 남고 앞 낱말이 강조·묶음 태그 안이면 둘을 함께 묶는다 — ‘<b>(이)라고</b> 한다.’ */
        var e = n.previousSibling, mm = /^(\s+)(\S+)(\s*)$/.exec(t);
        if (!mm || !e || e.nodeType !== 1 || !/^(SPAN|B|STRONG|EM|I|SUB|SUP)$/.test(e.tagName) || /\s/.test(e.textContent) || !short(e.textContent, mm[2])) return;
        var g = document.createElement("span"); g.className = "nw nwt"; p.insertBefore(g, e); g.appendChild(e); g.appendChild(document.createTextNode(mm[1] + mm[2]));
        if (mm[3]) n.nodeValue = mm[3]; else p.removeChild(n);
        return;
      }
      if (!short(m[1], m[3])) return;
      var s = document.createElement("span"); s.className = "nw nwt"; s.textContent = m[1] + m[2] + m[3];
      var f = document.createDocumentFragment(), head = t.slice(0, m.index);
      if (head) f.appendChild(document.createTextNode(head));
      f.appendChild(s); if (m[4]) f.appendChild(document.createTextNode(m[4]));
      n.parentNode.replaceChild(f, n);
    }
    var queue = [], busy = false;
    function flush() { busy = false; var q = queue; queue = []; q.forEach(scan); }
    function start() {
      scan(document.body);
      new MutationObserver(function (ms) {
        ms.forEach(function (m) {
          if (m.type === "characterData") queue.push(m.target);
          else for (var i = 0; i < m.addedNodes.length; i++) queue.push(m.addedNodes[i]);
        });
        if (!busy && queue.length) { busy = true; (window.requestAnimationFrame || setTimeout)(flush); }
      }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  })();
  /* ---------- 학생 입장 QR (교사 기기에서만) ----------
     window.sthQR(주소, 제목, 작은 제목) — 화면 가득 QR 을 띄운다. 학생은 휴대폰 카메라로 찍어 그 단원에 바로 들어간다.
     QR 도구(qrcode.js)는 이 파일과 같은 폴더에서 처음 누를 때만 불러온다.
     · 단원 페이지: 왼쪽 메뉴에 ‘📱 학생 입장 QR’ 버튼(precheck.js 는 00 들어가기 탭에도 하나 둔다)
     · 소단원: 이야기 탭 머리에 ‘📱 이 소단원 QR’ 버튼(scope.js) — 주소 끝이 ?sec=02
     · 과목 첫 화면: 단원 카드마다 ‘📱 QR’ 버튼 */
  (function () {
    var SELF = (document.currentScript && document.currentScript.src) || "";
    function load(cb) {
      if (window.qrcode) { cb(); return; }
      var s = document.createElement("script");
      s.src = SELF ? SELF.replace(/theme\.js(\?.*)?$/, "qrcode.js") : "assets/qrcode.js";
      s.onload = cb; s.onerror = function () { window.alert("QR 도구를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요."); };
      document.head.appendChild(s);
    }
    function clean(u) { var a = document.createElement("a"); a.href = u; var m = /[?&]sec=([0-9,]+)/.exec(a.search); return a.protocol + "//" + a.host + a.pathname.replace(/index\.html$/, "") + (m ? "?sec=" + m[1] : (/[?&]all=1/.test(a.search) ? "?all=1" : "")); }
    function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    window.sthQR = function (url, title, sub) {
      url = clean(url || location.href);
      load(function () {
        var qr = window.qrcode(0, "M"); qr.addData(url); qr.make();
        var o = document.createElement("div"); o.className = "qr-full"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "학생 입장 QR");
        o.innerHTML = "<div class='qf-box'><div class='qf-sub'>" + esc(sub) + "</div><div class='qf-title'>" + esc(title) + "</div>"
          + "<div class='qf-code'>" + qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true, alt: "학생 입장 QR" }) + "</div>"
          + "<div class='qf-url'>" + esc(url.replace(/^https?:\/\//, "")) + "</div>"
          + "<p class='qf-hint'>" + (/[?&]all=1/.test(url) ? "휴대폰 카메라로 찍으면 이 과목의 단원 목록이 열립니다. 학생은 목록에서 단원을 골라 들어가고, 단원 안의 ‘← 과목’으로 목록에 돌아옵니다." : /[?&]sec=/.test(url) ? "휴대폰 카메라로 찍으면 이 소단원이 바로 열립니다. 다른 소단원으로도 옮겨 갈 수 있습니다." : "휴대폰 카메라로 찍으면 이 단원으로 바로 들어갑니다. 학생 화면에는 이 단원만 보입니다.") + "</p>"
          + "<button type='button' class='btn qf-close'>닫기 (Esc)</button></div>";
        function close() { o.remove(); document.removeEventListener("keydown", key); }
        function key(e) { if (e.key === "Escape") close(); }
        o.addEventListener("click", function (e) { if (e.target === o || e.target.classList.contains("qf-close")) close(); });
        document.addEventListener("keydown", key);
        document.body.appendChild(o);
        o.querySelector(".qf-close").focus();
      });
    };
    function unitTitle() {
      var b = document.querySelector(".rail .brand"); if (!b) return ["", document.title];
      var h = b.querySelector("h1"), ey = b.querySelector(".eyebrow"), home = b.querySelector("a.home:not(.hub)");
      var subj = home ? home.textContent.replace(/^←\s*/, "") : "";
      return [subj + (ey ? " · " + ey.textContent.trim() : ""), h ? (h.innerText || h.textContent).replace(/\s+/g, " ").trim() : document.title];
    }
    window.sthUnitQR = function () { var t = unitTitle(); window.sthQR(location.href, t[1], t[0]); };
    /* 소단원 QR — sec 은 "02" 또는 "01,03", 이름은 큰 제목. 찍으면 scope.js 가 그 소단원을 바로 연다 */
    window.sthSecQR = function (sec, name) { var t = unitTitle(); window.sthQR(location.origin + location.pathname + "?sec=" + sec, name, (t[0] ? t[0] + " · " : "") + t[1]); };
    function start() {
      if (!TEACHER) return;
      var brand = document.querySelector(".rail .brand");
      if (brand && !brand.querySelector(".qr-btn")) {
        var b = document.createElement("button"); b.type = "button"; b.className = "qr-btn"; b.textContent = "📱 학생 입장 QR";
        b.addEventListener("click", window.sthUnitQR); brand.appendChild(b);
      }
      Array.prototype.forEach.call(document.querySelectorAll("a.unit-card"), function (c) {
        if (c.querySelector(".qr-btn")) return;
        var b = document.createElement("button"); b.type = "button"; b.className = "qr-btn"; b.textContent = "📱 QR";
        var h = c.querySelector("h3");
        b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); window.sthQR(c.href, h ? h.textContent.trim() : c.textContent.trim().slice(0, 40), document.title.split("—")[0].trim()); });
        c.appendChild(b);
      });
      /* 과목 첫 화면: 과목 전체 QR 을 머리에 늘 보이게 둔다(교사 기기) */
      var hero = document.querySelector(".hero");
      if (hero && document.querySelector("a.unit-card") && !hero.querySelector(".subj-qr")) {
        var subj = document.title.split("—")[0].trim(), surl = location.protocol + "//" + location.host + SUBJ + "?all=1";
        var box = document.createElement("div"); box.className = "subj-qr";
        box.innerHTML = "<div class='sq-code'></div><div class='sq-txt'><b>📱 " + esc(subj) + " 전체 QR</b>"
          + "<span>학생이 찍으면 " + esc(subj) + "의 모든 단원 목록이 열리고, 골라서 들어갑니다. 한 단원만 열려면 단원 카드의 ‘📱 QR’을 쓰세요.</span>"
          + "<div class='sq-row'><button type='button' class='btn primary sq-big'>크게 띄우기</button>"
          + "<a class='btn' href='https://wmfsljy-coder.github.io/science-teacher-hub/qr/?s=" + encodeURIComponent(subj) + "'>🖨 과목 QR 모음·인쇄</a></div>"
          + "<div class='sq-url'>" + esc(surl.replace(/^https?:\/\//, "")) + "</div></div>";
        hero.appendChild(box);
        box.querySelector(".sq-big").addEventListener("click", function () { window.sthQR(surl, subj + " 전체", "과목 전체 · 단원 목록"); });
        load(function () { var q = window.qrcode(0, "M"); q.addData(surl); q.make(); box.querySelector(".sq-code").innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true, alt: subj + " 전체 QR" }); });
      }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  })();
  /* ---------- 크게 보기 ----------
     휴대폰에서는 가로 900 기준 그림이 3분의 1로 줄어 그림 속 글자를 읽기 어렵다.
     · 그림 칸마다 ‘🔍 크게 보기’: 그림과 조작 칸을 그 자리에서 화면 가득 펼친다(요소를 옮기지 않아 조작·움직임이 그대로 이어진다).
       휴대폰에서는 되는 기기면 가로로 돌리고, 안 되면 돌리라고 알린다. 넓은 화면에서는 세로에 맞춘다.
     · 대표 그림(.hero-art): 누르면 그림과 설명을 크게.
     · 휴대폰에서는 그림 아래에 ‘그림 속 글자 크게 읽기’(그림에 그려진 글자를 글로 다시 보여 준다).
     닫기: ✕ · Esc · 휴대폰 뒤로 가기. */
  (function () {
    var cur = null, skipPop = false;
    function make(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function backAware(close) {          /* 뒤로 가기는 단원을 떠나지 않고 닫기만 */
      var pushed = false;
      try { history.pushState({ sthBig: 1 }, ""); pushed = true; } catch (e) {}
      cur = { close: close, pushed: pushed, y: window.pageYOffset };
      root.classList.add("sth-big-on");
      document.addEventListener("keydown", onKey);
    }
    function finish(fromPop) {
      if (!cur) return;
      var c = cur; cur = null;
      document.removeEventListener("keydown", onKey);
      root.classList.remove("sth-big-on");
      c.close();
      window.scrollTo(0, c.y);
      if (c.pushed && !fromPop) { skipPop = true; try { history.back(); } catch (e) { skipPop = false; } }
    }
    function onKey(e) { if (e.key === "Escape") finish(false); }
    window.addEventListener("popstate", function () { if (skipPop) { skipPop = false; return; } finish(true); });

    function goFull() {
      var fs = root.requestFullscreen;
      if (!fs) return;
      try {
        var p = fs.call(root);
        if (p && p.then) p.then(function () {
          if (window.innerWidth < window.innerHeight && screen.orientation && screen.orientation.lock) { var q = screen.orientation.lock("landscape"); if (q && q.catch) q.catch(function () {}); }
        }).catch(function () {});
      } catch (e) {}
    }
    function leaveFull() {
      try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
      if (document.fullscreenElement && document.exitFullscreen) { var p = document.exitFullscreen(); if (p && p.catch) p.catch(function () {}); }
    }
    function openBig(host) {
      if (cur) return;
      var bar = make("div", "big-bar"), hint = make("span", "big-hint"), x = make("button", "btn big-close", "✕ 닫기");
      x.type = "button"; bar.appendChild(hint); bar.appendChild(x);
      function fit() {
        var w = window.innerWidth, h = window.innerHeight;
        hint.textContent = w < 600 && w < h ? "휴대폰을 가로로 돌리면 글자가 더 커집니다. 두 손가락으로 확대해도 됩니다." : "";
        Array.prototype.forEach.call(host.querySelectorAll(".canvas-wrap"), function (wrap) {
          var c = wrap.querySelector("canvas");
          /* 넓은 화면은 그림이 한눈에 들어오게 세로에 맞추고, 낮은 화면(가로 휴대폰)은 폭을 다 쓴다 */
          wrap.style.maxWidth = c && c._w && h >= 600 ? Math.floor((h - 64) * c._w / c._h) + "px" : "";
        });
      }
      function onFs() { if (!document.fullscreenElement && cur) finish(false); }
      host.classList.add("sth-big");
      host.insertBefore(bar, host.firstChild);
      backAware(function () {
        host.classList.remove("sth-big");
        Array.prototype.forEach.call(host.querySelectorAll(".canvas-wrap"), function (wrap) { wrap.style.maxWidth = ""; });
        bar.remove();
        window.removeEventListener("resize", fit);
        document.removeEventListener("fullscreenchange", onFs);
        leaveFull();
        setTimeout(function () { if (window.sthRetext) window.sthRetext(); }, 120);
        if (host._bigBtn) host._bigBtn.focus();
      });
      x.addEventListener("click", function () { finish(false); });
      fit();
      setTimeout(function () { if (window.sthRetext) window.sthRetext(); }, 120);
      window.addEventListener("resize", fit);
      goFull();
      setTimeout(function () { if (cur) document.addEventListener("fullscreenchange", onFs); }, 400);
      host.scrollTop = 0;
      x.focus();
    }
    /* 그림 칸에 단추 붙이기 — setupCanvas 가 부른다. 조그만 그림은 뺀다 */
    window.sthAddBig = function (canvas) {
      if (!canvas.closest || canvas._w < 500) return;
      var wrap = canvas.closest(".canvas-wrap"), host = canvas.closest(".stage-card") || wrap;
      if (!host || !wrap) return;
      if (host._bigBtn) { if (host._readAdd) host._readAdd(canvas); return; }
      var row = make("div", "cv-big-row"), b = make("button", "cv-big-btn", "🔍 크게 보기");
      b.type = "button"; b.addEventListener("click", function () { openBig(host); });
      row.appendChild(make("span", "cv-big-tip", "글자가 작으면 크게 보기 → 휴대폰을 가로로"));
      row.appendChild(b);
      host._bigBtn = b;
      if (wrap === host) host.parentNode.insertBefore(row, host.nextSibling);
      else wrap.parentNode.insertBefore(row, wrap.nextSibling);
      addReader(host, row, canvas);
    };
    /* 휴대폰(세로)에서는 그림 속 글자가 너무 작다 — 같은 글자를 그림 아래에 큰 글씨로. 펼쳤을 때만 따라 바뀐다 */
    function addReader(host, row, first) {
      var list = [first], d = make("details", "cv-read"), sum = make("summary", null, "🔤 그림 속 글자 크게 읽기"), body = make("div", "cv-read-body"), timer = 0;
      d.appendChild(sum); d.appendChild(body);
      row.parentNode.insertBefore(d, row.nextSibling);
      function paint() {
        timer = 0;
        if (!d.open) return;
        var seen = {}, lines = [];
        list.forEach(function (c) {
          var rows = [];
          (c._texts || []).forEach(function (t) {
            if (seen[t.s] || /^[-−+]?[\d.,]+$/.test(t.s)) return;   /* 눈금 숫자만 있는 것은 뺀다 */
            seen[t.s] = 1;
            for (var i = 0; i < rows.length; i++) if (Math.abs(rows[i].y - t.y) < 9) { rows[i].a.push(t); return; }
            rows.push({ y: t.y, a: [t] });
          });
          rows.sort(function (p, q) { return p.y - q.y; }).forEach(function (r) { lines.push(r.a.sort(function (p, q) { return p.x - q.x; }).map(function (t) { return t.s; }).join("  ·  ")); });
        });
        var next = lines.join("|");
        if (body._last !== next) { body._last = next; body.textContent = ""; lines.forEach(function (l) { body.appendChild(make("p", null, l)); }); }
      }
      function later() { if (d.open && !timer) timer = setTimeout(paint, 300); }
      function watch(c) { c._onText = later; }
      watch(first);
      host._readAdd = function (c) { if (c._w >= 500 && list.indexOf(c) < 0) { list.push(c); watch(c); } };
      d.addEventListener("toggle", paint);
    }

    function openArt(fig) {
      if (cur) return;
      var img = fig.querySelector("img"), cap = fig.querySelector("figcaption");
      var o = make("div", "art-full"), bar = make("div", "art-bar"), x = make("button", "btn", "✕ 닫기"), big = document.createElement("img");
      o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "그림 크게 보기");
      x.type = "button"; bar.appendChild(x); o.appendChild(bar);
      big.src = img.getAttribute("src"); big.alt = img.alt; o.appendChild(big);
      if (cap) { var c = make("div", "art-cap"); c.innerHTML = cap.innerHTML; o.appendChild(c); }
      document.body.appendChild(o);
      backAware(function () { o.remove(); if (fig._zoom) fig._zoom.focus(); });
      x.addEventListener("click", function () { finish(false); });
      o.addEventListener("click", function (e) { if (e.target === o) finish(false); });
      x.focus();
    }
    function addArt() {
      Array.prototype.forEach.call(document.querySelectorAll(".hero-art"), function (fig) {
        var img = fig.querySelector("img");
        if (!img || fig._zoom) return;
        var b = make("button", "hero-zoom", "🔍 크게");
        b.type = "button"; b.setAttribute("aria-label", "그림 크게 보기");
        b.addEventListener("click", function () { openArt(fig); });
        img.addEventListener("click", function () { openArt(fig); });
        fig.appendChild(b); fig._zoom = b;
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addArt); else addArt();
  })();
  /* ---------- 움직이는 그림 ----------
     window.sthAnimate(canvas, frame) — 캔버스가 화면에 보이는 동안만 frame(초) 을 계속 부른다.
     탭을 옮기거나 화면 밖으로 나가면 멈추고(배터리), ‘동작 줄이기’를 켠 기기에서는 처음 한 장만 그린다.
     판의 이동·맨틀 대류처럼 ‘흐르는’ 현상을 정지 그림 대신 움직임으로 보여 줄 때 쓴다. */
  window.sthAnimate = function (canvas, frame) {
    var raf = 0, vis = !("IntersectionObserver" in window), last = 0, t = 0;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function loop(now) {
      raf = 0;
      if (!vis || document.hidden) { last = 0; return; }
      if (last) t += Math.min(0.1, (now - last) / 1000);
      last = now; frame(t);
      raf = window.requestAnimationFrame(loop);
    }
    function kick() { if (!raf && vis && !reduce && !document.hidden) raf = window.requestAnimationFrame(loop); }
    if (!vis) new IntersectionObserver(function (es) { vis = es[es.length - 1].isIntersecting; kick(); }).observe(canvas);
    document.addEventListener("visibilitychange", kick);
    kick();
    return { now: function () { return t; } };
  };
})();

/* ---------- 짧게 보기(data-compact) — 2026-11-08 ----------
   <html data-compact> 인 단원에서만 켠다(과목별로 차례로 켬). 페이지가 너무 길어지지 않게:
   ① 이야기 탭: 장면 아래 늘 붙던 '처음 생각 다시 보기·궁금한 것·소단원 확인 문제'를 접이식 한 줄로 모으고,
      결말(마지막) 장면에 오면 '지금 풀어 보세요'로 눈에 띄게 한다(펼치는 것은 학생이).
   ② 응용 실험실: 사례를 한 번에 하나만 보이고, 위쪽 번호 단추와 아래 '이전·다음 사례'로 바꾼다.
   ③ 수준별 문제: 고른 단계 안에서 4문제씩 쪽으로 나눈다.
   ④ 글자 크기 가가가가(본문만, 기본 0.92배).
   숨기기만 하므로 문제·사례 카드 수, 판정, 저장은 그대로다(검사 도구가 세는 수도 같다). */
(function () {
  var R = document.documentElement;
  if (!R.hasAttribute("data-compact")) return;
  var PER = 4, timer = 0;
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function arr(x) { return Array.prototype.slice.call(x || []); }
  if (!document.getElementById("cp-css")) {
    var s = el("style"); s.id = "cp-css";
    s.textContent = ".cp-hide{display:none!important}" +
      ".cp-after{margin:18px 0 10px;border:2px solid var(--line);border-radius:18px;background:var(--card,#fff)}" +
      ".cp-after>summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;padding:14px 18px;font-size:15px}" +
      ".cp-after>summary::-webkit-details-marker{display:none}" +
      ".cp-after>summary b{font-family:'Jua',sans-serif;font-weight:400;font-size:17px;color:var(--ink)}" +
      ".cp-after>summary .cp-sum{color:var(--mist);font-weight:700;font-size:13.5px}" +
      ".cp-after>summary::after{content:'펼치기 ▾';margin-left:auto;font-weight:800;font-size:13px;color:var(--brand-700,#0369a1)}" +
      ".cp-after[open]>summary::after{content:'접기 ▴'}" +
      ".cp-after.cp-ready{border-color:var(--brand,#0ea5e9);box-shadow:0 0 0 4px rgba(14,165,233,.15)}.cp-after.cp-ready>summary b::after{content:'지금 풀어 보세요';font-family:inherit;font-size:12px;font-weight:800;color:#fff;background:var(--brand,#0ea5e9);border-radius:999px;padding:2px 9px;margin-left:8px;vertical-align:2px}" +
      ".cp-after>.cp-in{padding:0 14px 14px}.cp-after>.cp-in>*:first-child{margin-top:0}" +
      ".cp-nav{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:12px 0 18px;font-size:13px;color:var(--mist)}" +
      ".cp-nav button{font:inherit;font-size:13.5px;font-weight:800;border:1px solid var(--line);border-radius:999px;background:var(--panel,#fff);color:var(--ink);padding:6px 14px;cursor:pointer;min-height:36px}" +
      ".cp-nav button.on{background:var(--brand,#0ea5e9);border-color:var(--brand,#0ea5e9);color:#fff}" +
      ".cp-nav button:disabled{opacity:.45;cursor:default}.cp-nav .cp-gap{flex:1}" +
      ".lab-chip.cp-cur{outline:3px solid var(--brand,#0ea5e9);outline-offset:1px}" +
      ".cp-fs{position:fixed;top:20px;right:150px;z-index:60;display:flex;gap:2px;padding:3px;border:1px solid var(--line);border-radius:999px;background:var(--panel,#fff);box-shadow:var(--shadow-card,0 2px 8px rgba(0,0,0,.08))}" +
      ".cp-fs button{font-family:inherit;font-weight:800;line-height:1;min-width:34px;height:34px;border:0;border-radius:999px;background:transparent;color:var(--mist);cursor:pointer;padding:0 6px}" +
      ".cp-fs button.on{background:var(--brand,#0ea5e9);color:#fff}" +
      "@media print{.cp-fs{display:none}}" +
      "@media(max-width:780px){html[data-compact] .acc-chip{right:auto!important;left:12px}}" +
      "html[data-compact] figure.hero-art{grid-template-columns:minmax(0,300px) minmax(0,1fr)!important}html[data-compact] figure.hero-art img{max-width:300px;max-height:300px;object-fit:cover}" +
      "@media(max-width:760px){html[data-compact] figure.hero-art{grid-template-columns:1fr!important}html[data-compact] figure.hero-art img{max-width:260px;max-height:260px;margin:12px auto 0;border-radius:14px}}" +
      ".cp-try{margin:10px 0 14px;border:2px dashed var(--teal-dim,#99f6e4);border-radius:16px;background:var(--card,#fff)}" +
      ".cp-try>summary{cursor:pointer;list-style:none;padding:10px 16px;font-weight:800;font-size:14px;display:flex;gap:8px;align-items:center}.cp-try>summary::-webkit-details-marker{display:none}" +
      ".cp-try>summary::after{content:'펼치기 ▾';margin-left:auto;font-size:12.5px;color:var(--brand-700,#0369a1)}.cp-try[open]>summary::after{content:'접기 ▴'}" +
      ".cp-try>.try-box{margin:0 10px 10px;border:0}";
    document.head.appendChild(s);
  }
  /* ① 이야기 탭 */
  function story() {
    arr(document.querySelectorAll(".tab-panel")).forEach(function (p) {
      var eps = p.querySelectorAll(".episode"); if (!eps.length) return;
      var box = null;
      arr(p.children).forEach(function (c) { if (c.classList.contains("cp-after") && !c.classList.contains("cp-more")) box = c; });
      var move = arr(p.children).filter(function (c) { return c.matches && c.matches(".pc-card.re, .qb, .sec-quiz"); });
      if (!box) {
        if (!move.length) return;
        box = el("details", "cp-after", "<summary><b>이야기를 마친 뒤</b><span class='cp-sum'></span></summary><div class='cp-in'></div>");
        var last = eps[eps.length - 1]; last.parentNode.insertBefore(box, last.nextSibling);
      }
      var inn = box.querySelector(".cp-in");
      move.forEach(function (c) { inn.appendChild(c); });
      var parts = [], nq = inn.querySelectorAll(".sec-quiz .qz-card").length;
      if (nq) parts.push("📝 소단원 확인 문제 " + nq);
      if (inn.querySelector(".pc-card.re")) parts.push("🔁 처음 생각 다시 보기");
      if (inn.querySelector(".qb")) parts.push("❓ 궁금한 것");
      var sum = box.querySelector(".cp-sum"), txt = parts.join(" · ");
      if (sum.textContent !== txt) sum.textContent = txt;
      more(p, eps[eps.length - 1]);
      arr(p.querySelectorAll(".try-box")).forEach(function (tb) {
        if (tb.classList.contains("mini") || (tb.parentNode && tb.parentNode.classList.contains("cp-try"))) return;
        var hd = tb.querySelector("b, strong, h4, .try-h"), name = (hd ? hd.textContent : tb.textContent).replace(/\s+/g, " ").trim().slice(0, 48);
        var d = el("details", "cp-try"), sm = el("summary"); sm.textContent = "🧪 더 해 보기 — " + name.replace(/^🧪\s*(더 해 보기\s*·?\s*)?/, "");
        d.appendChild(sm); tb.parentNode.insertBefore(d, tb); d.appendChild(tb);
      });      var dots = p.querySelectorAll(".ep-dot"), atEnd = dots.length && dots[dots.length - 1].classList.contains("now");
      box.classList.toggle("cp-ready", !!atEnd);
    });
  }
  /* ①-2 이야기 뒤에 붙는 덧붙임(우리 동네·궁금했다면·교과서 실험·실제 자료·한평생 살아 보기)을 '더 알아보기' 한 줄로 */
  var MORE = [[".real-sec", "📊 실제 자료"], [".inq-sec", "📘 교과서 실험"], [".info-card", "📍 우리 동네"], [".scale-box", "❓ 이런 게 궁금했다면"], ["#lifesim", "🌍 한평생 살아 보기"]];
  function more(p, lastEp) {
    var box = null, after = false, move = [];
    arr(p.children).forEach(function (c) {
      if (c === lastEp) { after = true; return; }
      if (c.classList.contains("cp-more")) { box = c; return; }
      if (!after || c.classList.contains("cp-after")) return;
      for (var i = 0; i < MORE.length; i++) if (c.matches(MORE[i][0])) { move.push(c); break; }
    });
    if (!box) {
      if (!move.length) return;
      box = el("details", "cp-after cp-more", "<summary><b>더 알아보기</b><span class='cp-sum'></span></summary><div class='cp-in'></div>");
      var ref = arr(p.children).filter(function (c) { return c.classList.contains("cp-after") && !c.classList.contains("cp-more"); })[0] || lastEp;
      ref.parentNode.insertBefore(box, ref.nextSibling);
    }
    var inn = box.querySelector(".cp-in");
    move.forEach(function (c) { inn.appendChild(c); });
    var parts = [];
    MORE.forEach(function (m) { if (inn.querySelector(":scope > " + m[0])) parts.push(m[1]); });
    var sum = box.querySelector(".cp-sum"), txt = parts.join(" · ");
    if (sum.textContent !== txt) sum.textContent = txt;
  }
  /* ② 응용 실험실 */  function lab() {
    var L = document.getElementById("lab"); if (!L) return;
    var cases = arr(L.querySelectorAll(".lab-case")).filter(function (c) { return !c.closest(".real-one"); });
    if (cases.length < 2) return;
    var chips = arr(L.querySelectorAll(".lab-chip"));
    if (L._cp == null) {
      L._cp = 0;
      for (var i = 0; i < chips.length; i++) if (!chips[i].classList.contains("ok")) { L._cp = i; break; }
      L.addEventListener("click", function (e) {
        var ch = e.target.closest && e.target.closest(".lab-chip"); if (!ch) return;
        var k = arr(L.querySelectorAll(".lab-chip")).indexOf(ch); if (k < 0) return;
        e.preventDefault(); e.stopPropagation(); go(k);
      }, true);
    }
    if (L._cp >= cases.length) L._cp = cases.length - 1;
    cases.forEach(function (c, i) { c.classList.toggle("cp-hide", i !== L._cp); });
    chips.forEach(function (c, i) { c.classList.toggle("cp-cur", i === L._cp); });
    var nav = L.querySelector(":scope > .cp-nav");
    if (!nav) {
      nav = el("div", "cp-nav");
      nav.innerHTML = "<button type='button' class='cp-prev'>← 이전 사례</button><span class='cp-gap'></span><span class='cp-at'></span><span class='cp-gap'></span><button type='button' class='cp-next'>다음 사례 →</button>";
      nav.querySelector(".cp-prev").addEventListener("click", function () { go(L._cp - 1); });
      nav.querySelector(".cp-next").addEventListener("click", function () { go(L._cp + 1); });
      L.appendChild(nav);
    }
    nav.querySelector(".cp-prev").disabled = L._cp <= 0;
    nav.querySelector(".cp-next").disabled = L._cp >= cases.length - 1;
    var at = "사례 " + (L._cp + 1) + " / " + cases.length;
    if (nav.querySelector(".cp-at").textContent !== at) nav.querySelector(".cp-at").textContent = at;
    function go(k) {
      if (k < 0 || k >= cases.length) return;
      L._cp = k; lab();
      var top = L.getBoundingClientRect().top + window.pageYOffset - 70;
      if (window.pageYOffset > top) window.scrollTo(0, top);
    }
  }
  /* ③ 수준별 문제 */
  function quiz() {
    var Q = document.getElementById("quiz"); if (!Q) return;
    var list = Q.querySelector(".qz-list"); if (!list) return;
    var vis = arr(list.children).filter(function (c) { return c.classList.contains("qz-card") && !c.hidden; });
    var key = vis.map(function (c) { return c.id; }).join(",");
    if (Q._cpKey !== key) { Q._cpKey = key; Q._cpPage = 0; }
    var pages = Math.ceil(vis.length / PER);
    arr(list.children).forEach(function (c) { if (c.classList.contains("qz-card") && c.hidden) c.classList.remove("cp-hide"); });
    vis.forEach(function (c, i) { c.classList.toggle("cp-hide", Math.floor(i / PER) !== Q._cpPage); });
    var nav = Q.querySelector(".cp-nav");
    if (!nav) { nav = el("div", "cp-nav cp-qnav"); list.parentNode.insertBefore(nav, list.nextSibling); }
    if (pages < 2) { nav.hidden = true; return; }
    nav.hidden = false;
    if (nav._pages !== pages || nav._page !== Q._cpPage) {
      nav._pages = pages; nav._page = Q._cpPage; nav.innerHTML = "";
      var lab0 = el("span", "", "문제 쪽"); nav.appendChild(lab0);
      for (var i = 0; i < pages; i++) (function (k) {
        var a = Math.min(vis.length, k * PER + 1), b = Math.min(vis.length, (k + 1) * PER);
        var bt = el("button", k === Q._cpPage ? "on" : "", a === b ? String(a) : a + "–" + b); bt.type = "button";
        bt.addEventListener("click", function () { page(k); }); nav.appendChild(bt);
      })(i);
      nav.appendChild(el("span", "cp-gap"));
      var nx = el("button", "", "다음 문제 →"); nx.type = "button"; nx.disabled = Q._cpPage >= pages - 1;
      nx.addEventListener("click", function () { page(Q._cpPage + 1); }); nav.appendChild(nx);
    }
    function page(k) {
      if (k < 0 || k >= pages) return;
      Q._cpPage = k; quiz();
      var top = list.getBoundingClientRect().top + window.pageYOffset - 90;
      window.scrollTo(0, Math.max(0, top));
    }
  }
  /* ④ 글자 크기 가가가가 — 본문(main)만 확대·축소, 기본은 조금 작게(0.92). 기기마다 기억(localStorage). */
  var FS = [0.85, 0.92, 1, 1.12], FSK = "sth-fs";
  function fsGet() { var v = 0.92; try { var s = parseFloat(localStorage.getItem(FSK)); if (FS.indexOf(s) >= 0) v = s; } catch (e) {} return v; }
  function fsSet(v) { try { localStorage.setItem(FSK, String(v)); } catch (e) {} fsApply(); }
  function fsApply() {
    var m = document.querySelector("main"); if (!m) return;
    var v = fsGet(); m.style.zoom = v === 1 ? "" : String(v);
    var g = document.getElementById("cp-fs"); if (!g) return;
    arr(g.querySelectorAll("button")).forEach(function (b) { var on = parseFloat(b.getAttribute("data-v")) === v; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    /* 오른쪽 위(휴대폰은 오른쪽 아래)에 고정된 단추들(다크 모드·로그인 등) 가운데 가장 왼쪽 것 바로 왼쪽에 놓는다 */
    var tg = document.querySelector(".theme-toggle");
    if (tg) {
      var cs = getComputedStyle(tg), tr = tg.getBoundingClientRect(), minL = tr.left;
      arr(document.body.children).forEach(function (e) {
        if (e === g) return;
        var ps = getComputedStyle(e).position; if (ps !== "fixed" && ps !== "sticky") return;
        var r = e.getBoundingClientRect(); if (!r.width || r.width > 260) return;
        if (r.bottom < tr.top - 4 || r.top > tr.bottom + 4) return;
        if (r.left > window.innerWidth / 2 && r.left < minL) minL = r.left;
      });
      g.style.top = cs.top === "auto" ? "auto" : cs.top; g.style.bottom = cs.bottom === "auto" ? "auto" : cs.bottom;
      g.style.right = (window.innerWidth - minL + 8) + "px";
    }
  }
  function fsBuild() {
    if (document.getElementById("cp-fs")) return;
    var g = el("div", "cp-fs"); g.id = "cp-fs"; g.setAttribute("role", "group"); g.setAttribute("aria-label", "글자 크기");
    FS.forEach(function (v, i) {
      var b = el("button", "", "가"); b.type = "button"; b.setAttribute("data-v", v); b.title = ["아주 작게", "작게(기본)", "보통", "크게"][i];
      b.style.fontSize = [12, 14, 16, 18][i] + "px";
      b.addEventListener("click", function () { fsSet(v); }); g.appendChild(b);
    });
    document.body.appendChild(g);
    window.addEventListener("resize", fsApply);
  }
  function apply() { timer = 0; try { story(); lab(); quiz(); fsBuild(); fsApply(); } catch (e) { if (window.console) console.warn("compact", e); } }
  function soon() { if (!timer) timer = setTimeout(apply, 80); }
  function start() {
    apply();
    new MutationObserver(soon).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    document.addEventListener("click", function () { setTimeout(apply, 60); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();