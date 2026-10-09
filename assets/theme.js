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
  /* 과목 첫 화면(단원 카드 목록)은 교사용: 학생에게는 안내만 남긴다 */
  (function () {
    function gate() {
      if (TEACHER || !document.querySelector("a.unit-card") || document.querySelector(".gate-note")) return;
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
    var K = opt.key || "pred", again = false;
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
      var url = String(window.STH_SHARE_URL || "").trim(), hosts = window.STH_SHARE_HOSTS;
      if (url && hosts && hosts.length && hosts.indexOf(location.hostname) < 0 && location.protocol !== "file:") url = "";
      if (url && !again) h += me.cls && me.nick ? "<button type='button' class='btn rv-send'>📣 우리 반 투표에 보내기</button><span class='rv-st'></span>"
                                             : "<span class='rv-st'>‘우리 반’ 탭에서 반과 별명을 저장하면 투표를 보낼 수 있어요.</span>";
      rv.innerHTML = h;
      var b1 = rv.querySelector(".rv-again"), b2 = rv.querySelector(".rv-done"), b3 = rv.querySelector(".rv-send");
      if (b1) b1.addEventListener("click", function () { again = true; paintRv(); });
      if (b2) b2.addEventListener("click", function () { again = false; paintRv(); });
      if (b3) b3.addEventListener("click", function () {
        var stx = rv.querySelector(".rv-st"); b3.disabled = true; stx.textContent = "보내는 중…";
        fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "vote", cls: me.cls, nick: me.nick, unit: String(UNIT || "").replace(/^sth-/, ""), key: K,
                                 a: STATE[K + "I"], b: typeof STATE[K + "_2I"] === "number" ? STATE[K + "_2I"] : "" }) })
          .then(function (r) { return r.json(); })
          .then(function (j) { if (!j.ok) throw new Error(j.error || "오류"); stx.textContent = "✓ 보냈습니다"; })
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
    var PROSE = "p, li, dd, .say, .info-card, .detail-panel, .why, .hint, .q, .msg, .lab-task-t, .lab-hint, .pc-ans, .pc-s, .std-note, .miscon, .stage-head p, .qz-q, .qz-fb, .qz-ans";
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
      if (!n || skip(n.parentNode)) return;
      var t = n.nodeValue, m = /(\S+)(\s+)(\S+)(\s*)$/.exec(t);
      if (!m || m[3].replace(/[^가-힣A-Za-z0-9]/g, "").length > 4 || (m[1] + m[3]).length > 20 || !/[가-힣]/.test(m[1] + m[3])) return;
      var s = document.createElement("span"); s.className = "nw"; s.textContent = m[1] + m[2] + m[3];
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
    function clean(u) { var a = document.createElement("a"); a.href = u; return a.protocol + "//" + a.host + a.pathname.replace(/index\.html$/, ""); }
    function esc(s) { return String(s || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    window.sthQR = function (url, title, sub) {
      url = clean(url || location.href);
      load(function () {
        var qr = window.qrcode(0, "M"); qr.addData(url); qr.make();
        var o = document.createElement("div"); o.className = "qr-full"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "학생 입장 QR");
        o.innerHTML = "<div class='qf-box'><div class='qf-sub'>" + esc(sub) + "</div><div class='qf-title'>" + esc(title) + "</div>"
          + "<div class='qf-code'>" + qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true, alt: "학생 입장 QR" }) + "</div>"
          + "<div class='qf-url'>" + esc(url.replace(/^https?:\/\//, "")) + "</div>"
          + "<p class='qf-hint'>휴대폰 카메라로 찍으면 이 단원으로 바로 들어갑니다. 학생 화면에는 이 단원만 보입니다.</p>"
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
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
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
