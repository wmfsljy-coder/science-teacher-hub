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

  /* ---------- 유틸 ---------- */
  window.cssVar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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

  window.setupCanvas = function (canvas) {
    var ctx = canvas.getContext("2d");
    if (canvas._dprSet) return ctx;

    var W = canvas.width, H = canvas.height;          // 논리 좌표계 (지금까지의 900×H)
    var dpr = Math.min(window.devicePixelRatio || 1, 2);   // 저사양 태블릿 메모리 보호

    canvas.style.width = "100%";                      // 표시 크기는 컨테이너가 정한다
    canvas.style.height = "auto";
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);

    canvas._dprSet = true;
    canvas._w = W;
    canvas._h = H;
    canvases.push(canvas);
    return ctx;
  };

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
  window.sthState = function (k, v) {
    if (arguments.length === 1) return STATE[k];
    STATE[k] = v; store(); return v;
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
    opt.options.forEach(function (t, i) {
      var b = document.createElement("button");
      b.className = "opt"; b.type = "button"; b.textContent = t;
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(box.children, function (o) { o.classList.remove("picked"); });
        b.classList.add("picked");
        gate.classList.add("done");
        if (veil) veil.hidden = true;
        STATE[opt.key || "pred"] = t;
        store();
        if (typeof opt.onPick === "function") opt.onPick(i, t);
      });
      box.appendChild(b);
    });
    /* 이미 고른 적이 있으면 그대로 복원한다 */
    var prev = STATE[opt.key || "pred"];
    if (prev) {
      var idx = opt.options.indexOf(prev);
      if (idx >= 0) {
        box.children[idx].classList.add("picked");
        gate.classList.add("done");
        if (veil) veil.hidden = true;
        if (typeof opt.onPick === "function") opt.onPick(idx, prev);
      }
    }
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
})();
