/* =========================================================================
   학생 로그인(학번 · 이름 · PIN 6자리)과 학습 기록 동기화 — theme.js · share-config.js 다음에 불러온다.
   뒷단은 '우리 반' 공유와 같은 Apps Script(share-backend/accounts.gs).

   · 오른쪽 위 👤 칩: 로그인 / 로그아웃. 처음 로그인하면 PIN 6자리를 정하고, 그 기기에서는 로그인이 유지된다
     ('이 기기에서 로그인 유지'를 끄면 브라우저를 닫을 때 풀린다 — 학교 공용 기기용).
   · 로그인하면 이 단원의 기록(theme.js 의 sthState·답안)이 바뀔 때마다 서버로 간다. 다른 기기에서 로그인하면 이어 한다.
   · 로그인하지 않으면 이야기는 그대로 하되, 문제 풀이 탭(수준별 문제·응용 실험실·실제 자료·정리하기)은 잠긴다.
     선생님 기기(sth-teacher)·공유 주소가 없는 사본에서는 잠그지 않는다.
   · 미리보기: 주소에 ?mock=1 을 붙이면 진짜 시트 대신 이 브라우저 안의 연습용 명단으로 돈다(아무것도 보내지 않음).
   ========================================================================= */
(function () {
  "use strict";
  var KEY = "sth-acc", SYNC = "sth-accsync-", LOCK_TABS = /수준별 문제|응용 실험실|실제 자료|정리하기/;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function get(st, k) { try { return JSON.parse(st.getItem(k) || "null"); } catch (e) { return null; } }
  function put(st, k, v) { try { if (v == null) st.removeItem(k); else st.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var TEACHER = false; try { TEACHER = localStorage.getItem("sth-teacher") === "1"; } catch (e) {}

  /* ---- 미리보기용 가짜 뒷단 ---- */
  var MOCK = /[?&]mock=1\b/.test(location.search); try { if (MOCK) sessionStorage.setItem("sth-mock", "1"); else MOCK = sessionStorage.getItem("sth-mock") === "1"; } catch (e) {}
  var URL_ = String(window.STH_SHARE_URL || "").trim(), HOSTS = window.STH_SHARE_HOSTS;
  if (URL_ && HOSTS && HOSTS.length && HOSTS.indexOf(location.hostname) < 0 && location.protocol !== "file:") URL_ = "";
  var ON = MOCK || (!!URL_ && window.STH_LOGIN === true);   /* 뒷단(accounts.gs)·명단이 준비된 뒤 share-config.js 에 STH_LOGIN = true 를 넣어야 켜진다 */
  var Mock = (function () {
    var DB = "sth-mock-db";
    function db() { var d = get(localStorage, DB); if (!d) { d = { roster: [
      ["1101", "김하늘", "1", "1-1", "1-1"], ["1102", "이바다", "1", "1-1", "1-1"], ["1103", "박구름", "1", "1-1", "1-1"], ["1201", "최별", "1", "1-2", "1-2"],
      ["2101", "정지구", "2", "2-1", "2-지구과학A,2-과학사B"], ["2102", "한우주", "2", "2-1", "2-행성우주A,2-기후환경B"]].map(function (r) { return { sid: r[0], name: r[1], grade: r[2], cls: r[3], classes: r[4].split(","), pin: "", fails: 0, until: 0, last: 0 }; }),
      dev: {}, learn: {}, log: [] }; put(localStorage, DB, d); } return d; }
    function save(d) { put(localStorage, DB, d); }
    function prof(s) { return { sid: s.sid, name: s.name, grade: s.grade, cls: s.cls, classes: s.classes }; }
    function bad(p, sid) { if (!/^\d{6}$/.test(p)) return "PIN 은 숫자 6자리입니다"; if (/^(\d)\1{5}$/.test(p)) return "같은 숫자만 반복하는 PIN 은 쓸 수 없습니다"; if ("0123456789012".indexOf(p) >= 0 || "9876543210987".indexOf(p) >= 0) return "연속된 숫자는 쓸 수 없습니다"; if (p.indexOf(sid) >= 0) return "학번이 들어간 PIN 은 쓸 수 없습니다"; return ""; }
    function find(d, sid) { return d.roster.filter(function (s) { return s.sid === String(sid || "").replace(/\D/g, ""); })[0]; }
    function nm(s) { return String(s || "").replace(/\s+/g, ""); }
    function who(d, t) { var sid = d.dev[t]; return sid ? find(d, sid) : null; }
    return function (b) {
      var d = db(), a = b.action, now = Date.now(), s, w;
      if (a === "accCheck") { s = find(d, b.sid); if (!s || nm(s.name) !== nm(b.name)) return { ok: false, error: "명단에서 찾지 못했습니다. 학번과 이름을 확인하고, 그래도 안 되면 선생님께 말씀해 주세요." }; return { ok: true, need: s.pin ? "pin" : "newpin" }; }
      if (a === "accLogin") {
        s = find(d, b.sid); if (!s || nm(s.name) !== nm(b.name)) return { ok: false, error: "명단에서 찾지 못했습니다." };
        if (s.until > now) return { ok: false, error: "PIN 을 여러 번 틀려 잠겼습니다. " + Math.ceil((s.until - now) / 60000) + "분 뒤에 다시 하세요." };
        if (!s.pin) { if (!b.newPin) return { ok: false, need: "newpin" }; var why = bad(String(b.newPin), s.sid); if (why) return { ok: false, need: "newpin", error: why }; s.pin = "h" + b.newPin; s.fails = 0; }
        else if (!b.pin) return { ok: false, need: "pin" };
        else if (s.pin !== "h" + b.pin) { s.fails++; if (s.fails >= 10) s.until = now + 864e5; else if (s.fails % 5 === 0) s.until = now + 6e5; save(d); return { ok: false, need: "pin", error: "PIN 이 맞지 않습니다 (" + s.fails + "번째)" }; }
        s.fails = 0; s.last = now; var t = "m" + Math.random().toString(36).slice(2) + now.toString(36); d.dev[t] = s.sid; save(d); return { ok: true, t: t, me: prof(s) };
      }
      if (a === "accMe") { s = who(d, b.t); return s ? { ok: true, me: prof(s) } : { ok: false, relogin: 1, error: "다시 로그인해 주세요" }; }
      if (a === "accLogout") { delete d.dev[b.t]; save(d); return { ok: true }; }
      if (a === "accSync") { s = who(d, b.t); if (!s) return { ok: false, relogin: 1 }; var k = s.sid + "|" + b.unit, o = d.learn[k] || { n: 0 };
        d.learn[k] = { sid: s.sid, unit: b.unit, at: now, n: o.n + 1, d: { s: b.s || {}, w: b.w || {} } };
        (b.ch || []).forEach(function (c) { d.log.push([c[2] || now, s.sid, b.unit, c[0], JSON.stringify(c[1])]); }); if (d.log.length > 4000) d.log = d.log.slice(-4000); save(d); return { ok: true, at: now }; }
      if (a === "accPull") { s = who(d, b.t); if (!s) return { ok: false, relogin: 1 }; var out = {}; Object.keys(d.learn).forEach(function (k2) { var L = d.learn[k2]; if (L.sid === s.sid && (!b.units || !b.units.length || b.units.indexOf(L.unit) >= 0)) out[L.unit] = { at: L.at, d: L.d }; }); return { ok: true, me: prof(s), units: out }; }
      if (a !== "accClass" && b.key !== "mock") return { ok: false, error: "열쇠가 맞지 않습니다 (미리보기 열쇠는 mock)" };
      if (a === "accRoster") { var dv = {}; Object.keys(d.dev).forEach(function (t2) { dv[d.dev[t2]] = (dv[d.dev[t2]] || 0) + 1; }); return { ok: true, students: d.roster.map(function (x) { var p = prof(x); p.pin = !!x.pin; p.fails = x.fails; p.locked = x.until > now; p.last = x.last; p.devices = dv[x.sid] || 0; return p; }) }; }
      if (a === "accPinReset") { s = find(d, b.sid); if (!s) return { ok: false }; s.pin = ""; s.fails = 0; s.until = 0; Object.keys(d.dev).forEach(function (t3) { if (d.dev[t3] === s.sid) delete d.dev[t3]; }); save(d); return { ok: true }; }
      if (a === "accRecords") { var st = d.roster.filter(function (x) { return x.cls === b.cls || x.classes.indexOf(b.cls) >= 0; }), ids = st.map(function (x) { return x.sid; });
        return { ok: true, students: st.map(prof), records: Object.keys(d.learn).map(function (k4) { return d.learn[k4]; }).filter(function (L) { return ids.indexOf(L.sid) >= 0 && (!b.unit || L.unit === b.unit); }) }; }
      if (a === "accClass") { s = who(d, b.t); if (!s) return { ok: false, relogin: 1 }; var c3 = classOfUnit(s, b.unit); if (!c3) return { ok: false, error: "이 단원을 함께 듣는 반을 찾지 못했습니다" };
        var mem = d.roster.filter(function (x) { return x.cls === c3 || x.classes.indexOf(c3) >= 0; }).map(function (x) { return x.sid; }), A = { gates: {}, quiz: {}, eps: {}, labs: {}, wrote: 0, n: 0 };
        Object.keys(d.learn).forEach(function (k5) { var L = d.learn[k5]; if (L.unit === b.unit && mem.indexOf(L.sid) >= 0) classAdd(A, L.d.s || {}, L.d.w || {}); });
        return A.n < 3 ? { ok: true, cls: c3, total: mem.length, n: A.n, few: 1 } : { ok: true, cls: c3, total: mem.length, n: A.n, agg: A }; }
      if (a === "accLog") return { ok: true, rows: d.log.filter(function (r) { return r[1] === b.sid && (!b.unit || r[2] === b.unit); }).map(function (r) { return [r[0], r[2], r[3], r[4]]; }).sort(function (x, y) { return x[0] - y[0]; }) };
      return { ok: false, error: "모르는 요청" };
    };
  })();
  function call(body) {
    if (MOCK) return new Promise(function (ok) { setTimeout(function () { ok(Mock(JSON.parse(JSON.stringify(body)))); }, 250); });
    return fetch(URL_, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  window.sthAccCall = call;   /* 선생님 화면도 같은 길로 부른다 */
  window.sthAccMock = MOCK;

  /* ---- 내 로그인 ---- */
  function acc() { return get(localStorage, KEY) || get(sessionStorage, KEY); }
  function setAcc(o, remember) { put(localStorage, KEY, null); put(sessionStorage, KEY, null); if (o) put(remember ? localStorage : sessionStorage, KEY, o); paint(); }
  window.sthAccount = { me: function () { var a = acc(); return a && a.me; }, on: ON,
    /* 로그인한 학생을 반·이름으로 — 투표·돌려 읽기·질문 게시판이 쓴다. 이름은 '@학번', 서버는 토큰 t 로 확인한다 */
    ident: function (unit) { var a = acc(); if (!a || !a.me || !a.me.sid) return null; var c = classOfUnit(a.me, unit || unitId()); return c ? { cls: c, nick: "@" + a.me.sid, t: a.t } : null; } };

  var CSS = false;
  function css() {
    if (CSS) return; CSS = true;
    var s = document.createElement("style");
    s.textContent = ".acc-chip{position:fixed;top:12px;right:118px;z-index:60;border:2px solid var(--line);border-radius:999px;background:var(--card);color:var(--ink);font:inherit;font-size:13px;font-weight:800;padding:6px 12px;cursor:pointer;box-shadow:var(--shadow-card)}"
      + ".acc-chip.in{border-color:var(--teal);}.acc-chip small{color:var(--mist);font-weight:700;margin-left:4px}"
      + ".acc-menu{position:fixed;top:48px;right:118px;z-index:61;background:var(--panel);border:2px solid var(--line);border-radius:14px;padding:12px 14px;min-width:230px;box-shadow:var(--shadow-pop);font-size:13px;color:var(--ink)}"
      + ".acc-menu p{margin:0 0 8px;line-height:1.6}.acc-menu .btn{margin-top:4px}"
      + ".acc-veil{position:fixed;inset:0;z-index:70;background:rgba(10,20,40,.45);display:flex;align-items:center;justify-content:center;padding:16px}"
      + ".acc-dlg{background:var(--panel);border-radius:18px;padding:20px 22px;width:min(380px,100%);box-shadow:var(--shadow-pop);color:var(--ink)}"
      + ".acc-dlg h3{margin:0 0 6px;font-size:18px}.acc-dlg p{margin:0 0 10px;font-size:13.5px;color:var(--mist);line-height:1.6}"
      + ".acc-dlg label{display:block;font-size:12.5px;font-weight:800;color:var(--mist);margin:8px 0 3px}"
      + ".acc-dlg input[type=text],.acc-dlg input[type=password]{width:100%;box-sizing:border-box;border:2px solid var(--line);border-radius:10px;padding:9px 11px;font:inherit;font-size:16px;background:var(--card);color:var(--ink)}"
      + ".acc-dlg .chk{display:flex;gap:6px;align-items:center;font-weight:700;color:var(--ink);margin-top:10px}.acc-dlg .err{color:var(--rose);font-weight:800;font-size:13px;min-height:18px;margin:8px 0 0}"
      + ".acc-dlg .row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}"
      + ".acc-lock{border:2px dashed var(--brand);border-radius:16px;background:var(--brand-100);padding:16px 18px;margin:14px 0;color:var(--ink)}"
      + ".acc-lock h4{margin:0 0 6px;font-size:16px}.acc-lock p{margin:0 0 10px;font-size:13.5px;line-height:1.7}"
      + ".tab-panel.acc-locked>*:not(.stage-head):not(.acc-lock){display:none!important}"
      + ".acc-class{border:2px solid var(--line);border-radius:16px;background:var(--panel);padding:14px 16px;margin:14px 0;color:var(--ink)}.acc-class:empty{display:none}"
      + ".acc-class .ac-head{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:14px}.acc-class .ac-re{padding:2px 9px;font-size:12px;margin-left:auto}"
      + ".acc-class h4{margin:14px 0 6px;font-size:14.5px}.acc-class .msg{font-size:12.5px;color:var(--mist)}.acc-class .me{color:var(--brand-700)}"
      + ".ac-g{margin:6px 0 10px;padding:8px 10px;background:var(--card-2);border-radius:12px}.ac-q{font-size:13px;margin-bottom:4px;line-height:1.55}"
      + ".ac-o{display:grid;grid-template-columns:minmax(0,1fr) 160px 120px;gap:8px;align-items:center;font-size:12.5px;margin:3px 0}.ac-t{line-height:1.45}.ac-n{color:var(--mist);text-align:right}"
      + ".acb{display:flex;height:12px;background:var(--line);border-radius:6px;overflow:hidden}.acb i{display:block;height:100%;background:var(--brand)}.acb i.lt{background:var(--brand-100)}"
      + ".ac-sc{display:flex;gap:3px;justify-content:flex-end}.ac-sc span{position:relative;width:20px;height:26px;border:1px solid var(--line);border-radius:4px;font-size:10px;text-align:center;line-height:26px;overflow:hidden;color:var(--ink)}.ac-sc span i{position:absolute;left:0;right:0;bottom:0;background:var(--teal);opacity:.45}"
      + ".ac-more summary{cursor:pointer;font-size:12.5px;font-weight:800;color:var(--brand-700);margin:6px 0}"
      + "@media (max-width:640px){.ac-o{grid-template-columns:1fr 90px 64px}}"
      + ".acc-mock{position:fixed;left:12px;bottom:12px;z-index:60;background:var(--amber);color:#000;font-size:12px;font-weight:800;border-radius:10px;padding:5px 10px}"
      + "@media (max-width:760px){.acc-chip{top:auto;bottom:12px;right:12px}.acc-menu{top:auto;bottom:56px;right:12px}}";
    document.head.appendChild(s);
  }

  /* ---- 로그인 창 ---- */
  function dialog(then, preset) {
    css();
    var veil = el("div", "acc-veil"), d = el("div", "acc-dlg"); veil.appendChild(d); document.body.appendChild(veil);
    var step = "id", sid = "", name = "", need = "";
    if (preset) { step = "pin"; sid = preset.sid; name = preset.name; need = preset.need || "pin"; }
    function close() { veil.parentNode && veil.parentNode.removeChild(veil); }
    veil.addEventListener("click", function (e) { if (e.target === veil) close(); });
    function draw(err) {
      d.innerHTML = "";
      d.appendChild(el("h3", null, "👤 로그인"));
      if (step === "id") {
        d.appendChild(el("p", null, "학번과 이름을 적어 주세요. 로그인하면 문제 풀이 기록이 내 이름으로 남고, 다른 기기에서도 이어 할 수 있습니다."));
        d.appendChild(el("label", null, "학번 (예: 1101)")); var i1 = document.createElement("input"); i1.type = "text"; i1.inputMode = "numeric"; i1.maxLength = 6; i1.value = sid; i1.autocomplete = "off"; d.appendChild(i1);
        d.appendChild(el("label", null, "이름")); var i2 = document.createElement("input"); i2.type = "text"; i2.maxLength = 20; i2.value = name; i2.autocomplete = "off"; d.appendChild(i2);
        setTimeout(function () { i1.focus(); }, 30);
        var pre = null, preKey = "", preT = null;
        function prefetch() { var k = i1.value.replace(/\D/g, "") + "|" + i2.value.trim(); if (!/^\d{4,6}\|.+/.test(k) || k === preKey) return; preKey = k; pre = call({ action: "accCheck", sid: k.split("|")[0], name: k.split("|")[1] }); pre.catch(function () {}); }
        [i1, i2].forEach(function (x) { x.addEventListener("input", function () { clearTimeout(preT); preT = setTimeout(prefetch, 350); }); x.addEventListener("blur", prefetch); });
        var next = function () { sid = i1.value.replace(/\D/g, ""); name = i2.value.trim(); if (!sid || !name) return draw("학번과 이름을 모두 적어 주세요");
          var k = sid + "|" + name, p = pre && preKey === k ? pre : call({ action: "accCheck", sid: sid, name: name });
          busy(true, "확인 중…"); p.then(function (j) { busy(false); if (!j.ok) return draw(j.error); need = j.need; step = "pin"; draw(); }, function () { busy(false); draw("연결하지 못했습니다. 잠시 뒤 다시 해 보세요."); }); };
        [i1, i2].forEach(function (x) { x.addEventListener("keydown", function (e) { if (e.key === "Enter") next(); }); });
        buttons("다음", next);
      } else {
        var first = need === "newpin";
        d.appendChild(el("p", null, first ? name + " 학생, 처음이네요. 앞으로 쓸 PIN 숫자 6자리를 정하세요. 잊으면 선생님께 초기화를 부탁하면 됩니다." : name + " 학생, PIN 6자리를 넣어 주세요."));
        d.appendChild(el("label", null, first ? "새 PIN (숫자 6자리)" : "PIN")); var p1 = document.createElement("input"); p1.type = "password"; p1.inputMode = "numeric"; p1.maxLength = 6; p1.autocomplete = first ? "new-password" : "current-password"; d.appendChild(p1);
        var p2 = null; if (first) { d.appendChild(el("label", null, "한 번 더")); p2 = document.createElement("input"); p2.type = "password"; p2.inputMode = "numeric"; p2.maxLength = 6; p2.autocomplete = "new-password"; d.appendChild(p2); }
        var lab = el("label", "chk"); var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = true; lab.appendChild(cb); lab.appendChild(document.createTextNode(" 이 기기에서 로그인 유지 (함께 쓰는 기기라면 끄세요)")); d.appendChild(lab);
        setTimeout(function () { p1.focus(); }, 30);
        var go = function () {
          var v = p1.value.trim(); if (!/^\d{6}$/.test(v)) return draw("PIN 은 숫자 6자리입니다");
          if (p2 && p2.value.trim() !== v) return draw("두 PIN 이 서로 다릅니다");
          var body = { action: "accLogin", sid: sid, name: name, ua: (navigator.userAgent || "").replace(/^Mozilla\/5\.0 /, "").slice(0, 60) }; if (first) body.newPin = v; else body.pin = v;
          /* 기다리지 않게: 창을 바로 닫고 잠긴 탭을 연다. 서버 확인(PIN 검사, 2~4초)은 뒤에서 하고,
             틀렸으면 다시 잠그고 창을 연다 — 그사이 푼 기록은 이 기기에 남아 있다가 바르게 로그인하면 올라간다. */
          var keep = cb.checked, ns = sid, nn = name, nd = need;
          close(); unlock(); pendingChip(ns + " " + nn);
          call(body).then(function (j) {
            if (!j.ok) { pendingChip(null); lockAll(); return dialog(then, { sid: ns, name: nn, need: j.need || nd, err: j.error || "로그인하지 못했습니다" }); }
            setAcc({ t: j.t, me: j.me, at: Date.now() }, keep); pullNow(true); setTimeout(loadClass, 800); if (then) then();
          }, function () { pendingChip(null); lockAll(); dialog(then, { sid: ns, name: nn, need: nd, err: "연결하지 못했습니다. 잠시 뒤 다시 해 보세요." }); });
        };
        [p1, p2].forEach(function (x) { if (x) x.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); }); });
        /* 6자리를 다 넣으면 바로 로그인(처음이면 두 번째 칸까지 다 넣었을 때) */
        var auto = function () { if (/^\d{6}$/.test(p1.value) && (!p2 || /^\d{6}$/.test(p2.value))) go(); };
        (p2 || p1).addEventListener("input", auto); if (p2) p1.addEventListener("input", function () { if (/^\d{6}$/.test(p1.value)) p2.focus(); });
        buttons(first ? "PIN 정하고 로그인" : "로그인", go, function () { step = "id"; draw(); });
      }
      d.appendChild(el("p", "err", err || ""));
      if (MOCK) d.appendChild(el("p", null, "미리보기: 1101 김하늘 · 1102 이바다 · 2101 정지구 같은 연습용 명단입니다."));
    }
    function buttons(label, fn, back) {
      var row = el("div", "row");
      var c = el("button", "btn", back ? "← 뒤로" : "닫기"); c.type = "button"; c.addEventListener("click", back || close); row.appendChild(c);
      var b = el("button", "btn primary", label); b.type = "button"; b.addEventListener("click", fn); row.appendChild(b);
      d.appendChild(row);
    }
    function busy(on, label) {   /* 누르자마자 단추 글자가 바뀐다 — 서버 답(1~3초)을 기다리는 동안 눌린 줄 알 수 있게 */
      Array.prototype.forEach.call(d.querySelectorAll("button,input"), function (x) { x.disabled = on; });
      var b = d.querySelector(".btn.primary"); if (!b) return;
      if (on) { b.setAttribute("data-l", b.textContent); b.textContent = "⏳ " + (label || "잠시만요…"); } else if (b.getAttribute("data-l")) b.textContent = b.getAttribute("data-l");
    }
    draw(preset && preset.err);
  }

  /* ---- 오른쪽 위 칩 ---- */
  var chip = null, menu = null;
  function paint() {
    if (!ON || !document.body) return;
    css();
    if (!chip) { chip = el("button", "acc-chip"); chip.type = "button"; document.body.appendChild(chip); chip.addEventListener("click", toggleMenu); if (MOCK) document.body.appendChild(el("div", "acc-mock", "미리보기 — 연습용 명단(실제 기록 아님)")); }
    var a = acc();
    chip.classList.toggle("in", !!a);
    chip.innerHTML = a ? "👤 " + a.me.sid + " " + a.me.name : "👤 로그인";
  }
  function pendingChip(label) {   /* 서버 확인을 기다리는 동안 칩 */
    if (!chip) paint();
    if (label) { chip.classList.add("in"); chip.textContent = "⏳ " + label + " 확인 중"; } else paint();
  }
  function toggleMenu() {
    var a = acc();
    if (!a) return dialog();
    if (menu) { menu.parentNode.removeChild(menu); menu = null; return; }
    menu = el("div", "acc-menu");
    menu.appendChild(el("p", null, a.me.sid + " " + a.me.name + " · " + (a.me.classes || []).join(", ")));
    var sync = get(localStorage, SYNC + unitId()), pend = pending();
    menu.appendChild(el("p", null, pend ? "⏳ 아직 보내지 못한 기록이 있습니다 — 연결되면 저절로 보냅니다." : (sync && sync.at ? "✓ 이 단원 기록 저장됨 (" + new Date(sync.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) + ")" : "이 단원은 아직 기록이 없습니다.")));
    var b = el("button", "btn", "로그아웃"); b.type = "button";
    b.addEventListener("click", function () {
      var t = a.t; flushAll(true);
      /* 함께 쓰는 기기: 서버에 다 올라간 단원 기록은 이 기기에서 지운다(다음 사람이 이어받지 않게). 못 보낸 것은 남긴다 */
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(SYNC) !== 0) return; var u = k.slice(SYNC.length), q = get(localStorage, k); if (q && q.raw === localStorage.getItem("sth-" + u)) { localStorage.removeItem("sth-" + u); localStorage.removeItem(k); } }); } catch (e) {}
      call({ action: "accLogout", t: t }).catch(function () {}); setAcc(null); menu.parentNode.removeChild(menu); menu = null; location.reload();
    });
    menu.appendChild(b);
    document.body.appendChild(menu);
  }

  /* ---- 문제 풀이 탭 잠금 ---- */
  function tabsToLock() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll(".tab-btn[data-tab]"), function (b) {
      if (!LOCK_TABS.test(b.textContent)) return;
      var p = document.querySelector('.tab-panel[data-panel="' + b.getAttribute("data-tab") + '"]'); if (p) out.push(p);
    });
    return out;
  }
  function lockAll() {
    if (!ON || TEACHER || acc()) return;
    css();
    tabsToLock().forEach(function (p) {
      if (p.classList.contains("acc-locked")) return;
      p.classList.add("acc-locked");
      var box = el("div", "acc-lock");
      box.innerHTML = "<h4>🔒 로그인하면 열립니다</h4><p>문제 풀이와 정리 활동은 <b>내 이름으로 기록</b>이 남는 활동입니다. 학번·이름과 PIN 으로 로그인해 주세요. 이야기 탭은 로그인하지 않아도 할 수 있어요.</p>";
      var b = el("button", "btn primary", "👤 로그인"); b.type = "button"; b.addEventListener("click", function () { dialog(); }); box.appendChild(b);
      var head = p.querySelector(".stage-head"); if (head && head.nextSibling) p.insertBefore(box, head.nextSibling); else p.insertBefore(box, p.firstChild);
    });
  }
  function unlock() {
    Array.prototype.forEach.call(document.querySelectorAll(".tab-panel.acc-locked"), function (p) { p.classList.remove("acc-locked"); var b = p.querySelector(".acc-lock"); if (b) b.parentNode.removeChild(b); });
  }

  /* ---- 동기화: theme.js 가 저장할 때마다 sthOnStore(단원, 상태, 답안) 를 부른다 ---- */
  function unitId() { return window.sthUnitId ? window.sthUnitId() : ""; }
  var timer = null, last = null;
  /* 지금 단원 + 이 과목의 간격 복습 기록('rv-묶음', review.js) + 다른 부품이 맡긴 기록(window.STH_SYNC_EXTRA) */
  function syncUnits() { var a = [], u = unitId(); if (u) { a.push(u); var g = u.replace(/[0-9]*-.*$/, "").replace(/[0-9]+$/, ""); if (g && u !== "unit") a.push("rv-" + g); } (window.STH_SYNC_EXTRA || []).forEach(function (x) { if (/^[\w-]{2,24}$/.test(x) && a.indexOf(x) < 0) a.push(x); }); return a; }
  function pendingU(u) { var q = get(localStorage, SYNC + u); var cur = localStorage.getItem("sth-" + u); return !!(acc() && cur && (!q || q.raw !== cur)); }
  function pending() { return syncUnits().some(pendingU); }
  function flushAll(keep) { syncUnits().forEach(function (u) { flush(keep, u); }); }
  var lastSent = 0;   /* 한 반이 한꺼번에 풀 때 서버가 밀리지 않게 — 바뀐 뒤 2.5초, 그리고 앞 전송에서 15초가 지난 뒤 보낸다 */
  window.sthOnStore = function (unit) { if (!acc()) return; clearTimeout(timer); timer = setTimeout(flushAll, Math.max(2500, 15000 - (Date.now() - lastSent))); };
  function diff(a, b, pre, out, t) {   /* 바뀐 항목: [항목, 새 값, 시각] — s.키 / w.키, 객체는 한 단계 더 들어간다(문항별 기록 등) */
    a = a || {}; b = b || {};
    Object.keys(b).forEach(function (k) {
      var x = a[k], y = b[k];
      if (JSON.stringify(x) === JSON.stringify(y)) return;
      if (y && typeof y === "object" && !Array.isArray(y) && x && typeof x === "object" && pre.split(".").length < 3) diff(x, y, pre + k + ".", out, t);
      else out.push([pre + k, y, t]);
    });
    Object.keys(a).forEach(function (k) { if (!(k in b)) out.push([pre + k, null, t]); });
    return out;
  }
  function flush(keep, u) {
    clearTimeout(timer);
    var A = acc(); u = u || unitId(); if (!A || !u) return;
    var raw = null; try { raw = localStorage.getItem("sth-" + u); } catch (e) {}
    if (!raw) return;
    var prev = get(localStorage, SYNC + u) || {}; if (prev.raw === raw) return;
    var cur = {}; try { cur = JSON.parse(raw); } catch (e) { return; }
    var old = {}; try { old = prev.raw ? JSON.parse(prev.raw) : {}; } catch (e) {}
    var now = Date.now(), ch = diff(old.s, cur.s, "s.", [], now).concat(diff(old.w, cur.w, "w.", [], now));
    var body = { action: "accSync", t: A.t, unit: u, s: cur.s || {}, w: cur.w || {}, ch: ch }; lastSent = now;
    if (keep === true && !MOCK && navigator.sendBeacon) { try { navigator.sendBeacon(URL_, new Blob([JSON.stringify(body)], { type: "text/plain;charset=utf-8" })); put(localStorage, SYNC + u, { raw: raw, at: now }); } catch (e) {} return; }
    call(body).then(function (j) {
      if (j && j.ok) put(localStorage, SYNC + u, { raw: raw, at: j.at || now });
      else if (j && j.relogin) { setAcc(null); lockAll(); }
    }, function () { /* 연결 안 됨 — 다음 저장·30초 뒤·다시 연결될 때 보낸다 */ });
  }
  setInterval(function () { if (pending()) flushAll(); }, 30000);
  window.addEventListener("online", function () { if (pending()) flushAll(); });
  window.addEventListener("pagehide", function () { if (pending()) flushAll(true); });

  /* ---- 다른 기기에서 한 기록 불러오기: 이 기기에 없는 항목만 채운다(이 기기의 것이 먼저) ---- */
  function pullNow(fromLogin) {
    var A = acc(), u = unitId(); if (!A || !u) return;
    var flag = "sth-accpulled-" + u; try { if (!fromLogin && sessionStorage.getItem(flag)) return; sessionStorage.setItem(flag, "1"); } catch (e) {}
    var list = syncUnits();
    call({ action: "accPull", t: A.t, units: list }).then(function (j) {
      if (!j || !j.ok) { if (j && j.relogin) { setAcc(null); lockAll(); } return; }
      if (j.me) { A.me = j.me; setAcc(A, !!get(localStorage, KEY)); }
      var reload = false;
      list.forEach(function (uu) {
        var srv = (j.units || {})[uu]; if (!srv || !srv.d) return;
        var loc = {}; try { loc = JSON.parse(localStorage.getItem("sth-" + uu) || "{}"); } catch (e) {}
        var s = loc.s || {}, w = loc.w || {}, added = 0;
        Object.keys(srv.d.s || {}).forEach(function (k) { if (!(k in s)) { s[k] = srv.d.s[k]; added++; } });
        Object.keys(srv.d.w || {}).forEach(function (k) { if (!(k in w) || !String(w[k] || "").trim()) { if (String(srv.d.w[k] || "").trim()) { w[k] = srv.d.w[k]; added++; } } });
        if (!added) return;
        try { localStorage.setItem("sth-" + uu, JSON.stringify({ s: s, w: w })); } catch (e) {}
        if (uu === u) reload = true;
        else { try { window.dispatchEvent(new CustomEvent("sth-pulled", { detail: uu })); } catch (e) {} }
      });
      if (reload) { try { if (!sessionStorage.getItem("sth-accreload-" + u)) { sessionStorage.setItem("sth-accreload-" + u, "1"); location.reload(); return; } } catch (e) {} }
      flushAll();
    }, function () {});
  }

  /* ---- 서버 accounts.gs 의 classOfUnit_ · classAdd_ 와 같은 규칙(연습용 뒷단이 쓴다) ---- */
  var UNIT_CLASS = { eshs: "지구과학", esys: "지구시스템", psp: "행성우주", cce: "기후환경", cvg: "융합탐구", shc: "과학사" };
  function classOfUnit(who, unit) {
    var pre = String(unit || "").replace(/[0-9]*-.*$/, "").replace(/[0-9]+$/, "");
    if (/^(is|gt)$/.test(pre)) return who.cls || (who.classes || [])[0] || "";
    var code = UNIT_CLASS[pre]; if (!code) return "";
    return (who.classes || []).filter(function (c) { return c.indexOf("2-" + code) === 0; })[0] || "";
  }
  function classAdd(A, s, w) {
    A.n++;
    Object.keys(s).forEach(function (k) {
      var v = s[k];
      if (/I$/.test(k) && typeof v === "number" && !/_2I$/.test(k)) { var g = k.slice(0, -1), G = A.gates[g] || (A.gates[g] = { a: {}, b: {}, ok: 0, n: 0 }); G.n++; G.a[v] = (G.a[v] || 0) + 1; if (typeof s[g + "_2I"] === "number") G.b[s[g + "_2I"]] = (G.b[s[g + "_2I"]] || 0) + 1; if (s[g + "OK"] === "맞음") G.ok++; }
      else if (v && typeof v === "object" && v.c && v.c.length !== undefined) { var E = A.eps[k] || (A.eps[k] = { n: 0, done: 0, sc: [] }); E.n++; if (v.done) E.done++; v.c.forEach(function (x, i) { E.sc[i] = (E.sc[i] || 0) + (x ? 1 : 0); }); }
    });
    var Q = s.quiz || {}; Object.keys(Q).forEach(function (id) { var x = Q[id] || {}; if (!(x.r === 1 || x.n || x.sh)) return; var q = A.quiz[id] || (A.quiz[id] = { n: 0, first: 0, later: 0 }); q.n++; if (x.r === 1 && !x.n && !x.sh) q.first++; else if (x.r === 1) q.later++; });
    ["lab", "real"].forEach(function (lk) { var L = s[lk] || {}; Object.keys(L).forEach(function (c) { var x = L[c] || {}; if (x.p == null) return; var B = A.labs[lk + ":" + c] || (A.labs[lk + ":" + c] = { n: 0, ok: 0 }); B.n++; if (x.ok) B.ok++; }); });
    if (Object.keys(w).some(function (k) { return String(w[k] || "").trim(); })) A.wrote++;
  }

  /* ---- 우리 반 한눈에: '우리 반' 탭 맨 위. 로그인한 같은 반 친구들의 이 단원 기록을 이름 없이 모아 본다 ---- */
  var ITEMS = null;
  function items(cb) {   /* 첫 추리 질문·보기, 문항 글 — 교사용 허브의 unit-items-all.js 를 한 번 받는다 */
    if (ITEMS) return cb(ITEMS);
    var sc = document.createElement("script"); sc.src = "/science-teacher-hub/assets/unit-items-all.js";
    sc.onload = sc.onerror = function () { ITEMS = (window.STH_UNIT_ITEMS || {}); cb(ITEMS); }; document.head.appendChild(sc);
  }
  function classPanel() {
    var b = Array.prototype.filter.call(document.querySelectorAll(".tab-btn[data-tab]"), function (x) { return /우리 반/.test(x.textContent); })[0];
    if (!b) return null;
    var p = document.querySelector('.tab-panel[data-panel="' + b.getAttribute("data-tab") + '"]'); if (!p) return null;
    var box = p.querySelector(".acc-class");
    if (!box) { box = el("div", "acc-class"); var head = p.querySelector(".stage-head"); if (head && head.nextSibling) p.insertBefore(box, head.nextSibling); else p.insertBefore(box, p.firstChild);
      b.addEventListener("click", function () { if (acc()) loadClass(); }); }
    return box;
  }
  function bar(n, tot, cls) { var w = tot ? Math.round(n / tot * 100) : 0; return "<span class='acb'><i class='" + (cls || "") + "' style='width:" + w + "%'></i></span>"; }
  function loadClass() {
    var box = classPanel(), A = acc(), u = unitId(); if (!box) return;
    if (!A) { box.innerHTML = ""; return; }
    css();
    var CK = "sth-accclass-" + u, old = get(localStorage, CK);
    if (old && old.j) items(function (IT) { paintClass(box, old.j, (IT || {})[u] || {}, old.at); });
    else box.innerHTML = "<p class='msg'>📊 우리 반 기록을 모으는 중…</p>";
    flush();
    call({ action: "accClass", t: A.t, unit: u }).then(function (j) {
      if (!j || !j.ok) { if (!old) box.innerHTML = "<p class='msg'>📊 우리 반 한눈에: " + ((j && j.error) || "불러오지 못했습니다") + "</p>"; return; }
      put(localStorage, CK, { j: j, at: Date.now() });
      items(function (IT) { paintClass(box, j, (IT || {})[u] || {}); });
    }, function () { if (!old) box.innerHTML = "<p class='msg'>📊 지금은 우리 반 기록을 불러올 수 없습니다. 잠시 뒤 다시 열어 보세요.</p>"; });
  }
  function paintClass(box, j, it, staleAt) {
    var my = {}; try { my = (JSON.parse(localStorage.getItem("sth-" + unitId()) || "{}").s) || {}; } catch (e) {}
    var h = "<div class='ac-head'><b>📊 우리 반 한눈에</b> — " + j.cls + " · 로그인해서 이 단원을 한 친구 <b>" + j.n + "명</b> / " + j.total + "명 <span class='msg'>(이름 없이 센 것" + (staleAt ? " · " + new Date(staleAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) + " 결과, 새로 고치는 중…" : "") + ")</span> <button type='button' class='btn ac-re'>↻</button></div>";
    if (j.few) { box.innerHTML = h + "<p class='msg'>아직 이 단원을 한 친구가 3명보다 적어서 모아 보여 줄 수 없어요. 친구들이 더 하면 보입니다.</p>"; box.querySelector(".ac-re").onclick = loadClass; return; }
    var A = j.agg, G = it.g || {}, QT = it.q || {};
    var gk = Object.keys(A.gates).sort(function (a, b) { var ka = Object.keys(G), x = ka.indexOf(a), y = ka.indexOf(b); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
    if (gk.length) {
      h += "<h4>💡 첫 추리 — 우리 반은 처음에 무엇을 골랐나</h4>";
      gk.forEach(function (g) {
        var S = A.gates[g], q = G[g] || {}, opts = q.o || [], mine = my[g + "I"], seen = typeof mine === "number";
        h += "<div class='ac-g'><div class='ac-q'>" + (q.t ? "<b>" + q.t + "</b> " : "") + (q.q || g) + "</div>";
        var n = Math.max(opts.length, Object.keys(S.a).reduce(function (m, k) { return Math.max(m, +k + 1); }, 0));
        for (var i = 0; i < n; i++) {
          var a = S.a[i] || 0, b = S.b[i] || 0;
          h += "<div class='ac-o'><span class='ac-t'>" + (opts[i] || "보기 " + (i + 1)) + (mine === i ? " <b class='me'>◀ 나</b>" : "") + "</span>" + bar(a, S.n) + "<span class='ac-n'>" + a + "명" + (b ? " · 다시 고른 뒤 " + b + "명" : "") + "</span></div>";
        }
        h += seen ? "<div class='msg'>맞힌 친구 " + S.ok + "명 / " + S.n + "명</div>" : "<div class='msg'>나도 고르고 나면 맞힌 친구 수가 보여요.</div>";
        h += "</div>";
      });
    }
    var ek = Object.keys(A.eps);
    if (ek.length) {
      h += "<h4>🧩 이야기 장면 — 몇 명이 어디까지 풀었나</h4>";
      ek.forEach(function (k) { var E = A.eps[k]; h += "<div class='ac-o'><span class='ac-t'>" + k + " · 끝까지 " + E.done + "명</span><span class='ac-sc'>" + E.sc.map(function (x, i) { return "<span title='장면 " + (i + 1) + "'>" + (i + 1) + "<i style='height:" + Math.round((x || 0) / E.n * 100) + "%'></i></span>"; }).join("") + "</span></div>"; });
    }
    var qk = Object.keys(A.quiz);
    if (qk.length) {
      var mq = my.quiz || {};
      qk.sort(function (a, b) { var A1 = A.quiz[a], B1 = A.quiz[b]; return A1.first / A1.n - B1.first / B1.n; });
      h += "<h4>✏️ 수준별 문제 — 우리 반이 어려워한 순서</h4><div class='msg'>막대 = 한 번에 맞힌 친구 비율(진한 색), 나중에 맞힌 친구(옅은 색)</div>";
      qk.forEach(function (id, qi) {
        if (qi === 5) h += "<details class='ac-more'><summary>나머지 " + (qk.length - 5) + "문항도 보기</summary>";
        var Q = A.quiz[id], t = (QT[id] || [])[2] || id, x = mq[id] || {}, me = x.r === 1 && !x.n && !x.sh ? "✓ 나는 한 번에" : x.r === 1 ? "△ 나는 다시 풀어 맞힘" : (x.n || x.sh) ? "✗ 나는 아직" : "· 나는 아직 안 풂";
        h += "<div class='ac-o'><span class='ac-t'>" + (QT[id] ? "수준 " + QT[id][0] + " · " : "") + String(t).slice(0, 70) + (String(t).length > 70 ? "…" : "") + " <span class='msg'>" + me + "</span></span><span class='acb'><i style='width:" + Math.round(Q.first / Q.n * 100) + "%'></i><i class='lt' style='width:" + Math.round(Q.later / Q.n * 100) + "%'></i></span><span class='ac-n'>" + Math.round(Q.first / Q.n * 100) + "% · " + Q.n + "명</span></div>";
      });
      if (qk.length > 5) h += "</details>";
    }
    var lk = Object.keys(A.labs);
    if (lk.length) { h += "<h4>🔬 응용 실험실 · 실제 자료 — 해결한 친구</h4>"; lk.forEach(function (k) { var B = A.labs[k]; h += "<div class='ac-o'><span class='ac-t'>" + (k.indexOf("lab:") === 0 ? "응용 " : "실제 자료 ") + k.split(":")[1] + "</span>" + bar(B.ok, B.n) + "<span class='ac-n'>" + B.ok + "/" + B.n + "명</span></div>"; }); }
    h += "<p class='msg'>📝 정리하기 글을 쓴 친구 " + A.wrote + "명 · 글 내용은 모으지 않습니다.</p>";
    box.innerHTML = h; box.querySelector(".ac-re").onclick = function () { this.textContent = "⏳"; loadClass(); };
  }

  function boot() { if (!ON || window.STH_ACC_NOUI) return; paint(); lockAll(); setTimeout(function () { pullNow(false); var p = classPanel(); if (acc() && p && !p.closest(".tab-panel").hidden) loadClass(); }, 600); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
