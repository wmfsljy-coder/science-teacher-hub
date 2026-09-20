/* 막힌 장면 찾기 — 단원 페이지를 ?open=1 로 연 뒤 콘솔에서:
     eval(await (await fetch('/_tools/solve.js',{cache:'reload'})).text())
   장면마다 (1) 슬라이더를 하나씩 끝에서 끝까지 훑고 (2) 무작위 조합을 섞어 가며
   버튼·분류·보기를 눌러 본다. 애니메이션으로 버튼이 잠기면 풀릴 때까지 기다린다.
   끝내 통과되지 않는 장면 = 학생이 갇히는 장면. */
(async function () {
  var ROUNDS = window.SOLVE_ROUNDS || 6;      // (훑기 1바퀴 + 무작위 120회) × ROUNDS
  var RAND = window.SOLVE_RAND || 120;
  var errs = [];
  window.addEventListener("error", function (e) { errs.push(e.message); });
  window.confirm = function () { return false; };
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function list(el, sel) { return Array.prototype.slice.call(el.querySelectorAll(sel)); }

  function cleared(epKey, i) {
    var out = false;
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf("sth-") !== 0 || k === "sth-theme" || k === "sth-me") return;
      try {
        var s = (JSON.parse(localStorage.getItem(k)) || {}).s || {};
        if (s[epKey] && s[epKey].c && s[epKey].c[i]) out = true;
      } catch (e) {}
    });
    return out;
  }
  function setRange(r, v) {
    r.value = String(v);
    r.dispatchEvent(new Event("input", { bubbles: true }));
    r.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function steps(r) {
    var lo = +r.min, hi = +r.max, st = +r.step || 1, out = [];
    for (var v = lo; v <= hi + 1e-9; v += st) out.push(+v.toFixed(6));
    return out;
  }

  /* 버튼을 누르고, 그 버튼이 잠기면(애니메이션) 풀릴 때까지 기다린다 */
  async function press(b) {
    if (!b.isConnected || b.disabled) return;
    try { b.click(); } catch (e) { errs.push("click: " + e.message); return; }
    for (var w = 0; w < 24 && b.isConnected && b.disabled; w++) await sleep(100);
  }
  async function poke(scene) {
    var toks = list(scene, ".pool .tok"), buckets = list(scene, ".bucket");
    for (var i = 0; i < toks.length; i++) {
      if (!toks[i].isConnected) continue;
      toks[i].click();
      if (buckets.length) buckets[Math.floor(Math.random() * buckets.length)].click();
    }
    list(scene, ".pick .opt, .gate .opt").forEach(function (o) { try { o.click(); } catch (e) {} });
    var groups = list(scene, ".seg, [data-group]");                 // 묶음 선택은 하나만 무작위로
    groups.forEach(function (g) { var bs = list(g, "button"); if (bs.length) bs[Math.floor(Math.random() * bs.length)].click(); });
    var btns = list(scene, "button").filter(function (b) {
      if (/ep-dot|ep-reset|next|tab-btn/.test(b.className)) return false;
      if (/opt/.test(b.className) || /-copy$|-wipe$/.test(b.id)) return false;
      if (groups.some(function (g) { return g.contains(b); })) return false;
      return !/처음|초기화|다시|리셋|지우기/.test(b.textContent || "");              // 되돌리기 버튼은 누르지 않는다
    });
    for (var j = 0; j < btns.length; j++) await press(btns[j]);
  }

  var report = [], stuck = [], todo = [], tabs = list(document, ".tab-btn");
  var DEADLINE = Date.now() + (window.SOLVE_MS || 32000);          // 시간이 다 되면 남은 장면을 알려 주고 끝낸다
  function late() { return Date.now() > DEADLINE; }
  var only = (typeof window.SOLVE_TAB === "number") ? window.SOLVE_TAB : -1;   // 한 탭만 돌리기
  for (var t = 0; t < tabs.length; t++) {
    if (only >= 0 && t !== only) continue;
    tabs[t].click();
    var panel = document.querySelector('.tab-panel[data-panel="' + tabs[t].getAttribute("data-tab") + '"]');
    var epRoot = panel && panel.querySelector(".episode");
    if (!epRoot) continue;
    var epKey = epRoot.id;
    var dots = list(epRoot, ".ep-dot");
    for (var d = 0; d < dots.length; d++) {
      if (dots[d].disabled) { stuck.push(epKey + " 장면" + (d + 1) + ": 열 수 없음(?open=1 확인)"); continue; }
      dots[d].click();
      var scene = epRoot.querySelector(".scene:not([hidden])");
      if (!scene) { stuck.push(epKey + " 장면" + (d + 1) + ": 화면 없음"); continue; }
      var title = scene.getAttribute("data-title") || "";
      if (cleared(epKey, d)) continue;
      if (late()) { todo.push(epKey + " 장면" + (d + 1)); continue; }
      var ranges = list(scene, "input[type=range]"), tries = 0;

      outer:
      for (var round = 0; round < ROUNDS; round++) {
        /* (1) 슬라이더 하나씩 전 구간 훑기 — 나머지는 그대로 둔다 */
        for (var ri = 0; ri < ranges.length; ri++) {
          var vs = steps(ranges[ri]);
          for (var vi = 0; vi < vs.length; vi++) {
            setRange(ranges[ri], vs[vi]); tries++;
            await poke(scene);
            if (cleared(epKey, d) || late()) break outer;
            if (tries % 40 === 0) await sleep(0);
          }
        }
        /* (2) 무작위 조합 */
        for (var k = 0; k < RAND; k++) {
          ranges.forEach(function (r) { var vs2 = steps(r); setRange(r, vs2[Math.floor(Math.random() * vs2.length)]); });
          tries++;
          await poke(scene);
          if (cleared(epKey, d) || late()) break outer;
          if (tries % 40 === 0) await sleep(0);
        }
      }
      if (!cleared(epKey, d)) (late() ? todo : stuck).push(epKey + " 장면" + (d + 1) + " [" + title + "]: " + tries + "번 해 봄" + (late() ? " (시간 초과, 다시 부르면 이어서 함)" : ", 통과 못 함"));
      else if (tries > 0) report.push("· " + epKey + " 장면" + (d + 1) + ": " + tries + "번 만에 통과");
    }
  }
  return JSON.stringify({ 막힌곳: stuck, 남음: todo, 참고: report, errors: errs }, null, 1);
})();
