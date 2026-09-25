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

  /* 이 단원의 기록만 본다. 저장소 전체를 훑으면 다른 단원의 epA·ep1 기록이 섞여
     통과하지도 않은 장면을 통과한 것으로 잘못 읽는다. */
  function cleared(epKey, i) {
    try { var s = window.sthState(epKey); return !!(s && s.c && s.c[i]); } catch (e) { return false; }
  }
  function setRange(r, v) {
    r.value = String(v);
    r.dispatchEvent(new Event("input", { bubbles: true }));
    r.dispatchEvent(new Event("change", { bubbles: true }));
  }
  /* 슬라이더가 가질 수 있는 값들. 끝·가운데·0 처럼 미션이 노리기 쉬운 값을 앞에 둔다 —
     끝에서부터 차례로만 훑으면 시간이 다 되도록 반대쪽 끝에 닿지 못한다. */
  function steps(r) {
    var lo = +r.min, hi = +r.max, st = +r.step || 1, all = [];
    for (var v = lo; v <= hi + 1e-9; v += st) all.push(+v.toFixed(6));
    var first = [lo, hi, all[Math.floor(all.length / 2)]];
    if (lo < 0 && hi > 0) {                              /* 0 이 범위 안에 있으면 먼저 넣는다 */
      for (var z = 0; z < all.length; z++) if (Math.abs(all[z]) < st / 2 + 1e-9) { first.push(all[z]); break; }
    }
    /* 먼저 40칸쯤으로 성기게 훑고, 그다음에 한 칸씩 촘촘히 훑는다.
       성긴 칸은 순서를 섞는다 — 애니메이션이 있는 장면은 한 번에 다 못 돌므로,
       늘 같은 순서로 시작하면 다시 불러도 같은 자리에서 멈춘다. */
    var stride = Math.max(1, Math.round(all.length / 40)), coarse = [];
    for (var i = 0; i < all.length; i += stride) coarse.push(all[i]);
    for (var q = coarse.length - 1; q > 0; q--) { var w2 = Math.floor(Math.random() * (q + 1)), tmp = coarse[q]; coarse[q] = coarse[w2]; coarse[w2] = tmp; }
    var seen = {}, out = [];
    first.concat(coarse, all).forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  /* 버튼을 누르고, 그 버튼이 잠기면(애니메이션) 풀릴 때까지 기다린다.
     다만 한 장면에서 기다리는 시간의 총량을 정해 둔다 — 그러지 않으면 재생 버튼 하나가
     슬라이더 훑기 전체를 잡아먹어, 멀쩡한 장면이 ‘시간 초과’로 보고된다. */
  var waitLeft = 0;
  async function press(b) {
    if (!b.isConnected || b.disabled) return;
    try { b.click(); } catch (e) { errs.push("click: " + e.message); return; }
    for (var w = 0; w < 24 && waitLeft > 0 && b.isConnected && b.disabled; w++) { await sleep(100); waitLeft -= 100; }
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
    /* 캔버스 위의 점을 누르게 하는 장면도 있다 — 격자로 훑어 누른다 */
    var cvs = list(scene, "canvas");
    for (var ci = 0; ci < cvs.length; ci++) {
      var rc = cvs[ci].getBoundingClientRect();
      if (!rc.width || !rc.height) continue;
      for (var gx = 1; gx < 12; gx++) for (var gy = 1; gy < 8; gy++) {
        var ev = { bubbles: true, clientX: rc.left + rc.width * gx / 12, clientY: rc.top + rc.height * gy / 8 };
        ["mousedown", "mouseup", "click"].forEach(function (t) { cvs[ci].dispatchEvent(new MouseEvent(t, ev)); });
      }
    }
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
      if (scene.querySelector(".ending") && d === dots.length - 1) continue;   /* 마지막 결말 장면은 통과 표시가 없다 */
      if (cleared(epKey, d)) continue;
      if (late()) { todo.push(epKey + " 장면" + (d + 1)); continue; }
      var ranges = list(scene, "input[type=range]"), tries = 0;
      waitLeft = window.SOLVE_WAIT || 20000;             /* 이 장면에서 애니메이션을 기다릴 총 시간 */
      /* 캔버스 위의 좁은 점(암맥·포획암처럼)을 놓치지 않도록 장면마다 한 번 촘촘히 훑는다 */
      var fine = list(scene, "canvas");
      for (var fi = 0; fi < fine.length; fi++) {
        var fr = fine[fi].getBoundingClientRect();
        if (!fr.width || !fr.height) continue;
        for (var fx = 0; fx < 60; fx++) {
          for (var fy = 0; fy < 40; fy++) {
            fine[fi].dispatchEvent(new MouseEvent("click", { bubbles: true,
              clientX: fr.left + fr.width * (fx + 0.5) / 60, clientY: fr.top + fr.height * (fy + 0.5) / 40 }));
          }
        }
        await sleep(0);
      }
      if (cleared(epKey, d)) { report.push("· " + epKey + " 장면" + (d + 1) + ": 그림 훑기로 통과"); continue; }

      outer:
      for (var round = 0; round < ROUNDS; round++) {
        waitLeft = window.SOLVE_WAIT || 20000;           /* 바퀴마다 기다릴 시간을 새로 준다 */
        /* (1) 슬라이더 하나씩 전 구간 훑기 — 나머지는 그대로 둔다 */
        for (var ri = 0; ri < ranges.length; ri++) {
          var vs = steps(ranges[ri]);
          for (var vi = 0; vi < vs.length; vi++) {
            setRange(ranges[ri], vs[vi]); tries++;
            if (cleared(epKey, d)) break outer;
            await poke(scene);
            if (cleared(epKey, d) || late()) break outer;
            if (tries % 40 === 0) await sleep(0);
          }
        }
        /* (2) 무작위 조합 */
        for (var k = 0; k < RAND; k++) {
          ranges.forEach(function (r) { var vs2 = steps(r); setRange(r, vs2[Math.floor(Math.random() * vs2.length)]); });
          tries++;
          if (cleared(epKey, d)) break outer;
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
