/* 응용 실험실 검사기 — 단원 페이지에서:
     window.LC_ONLY = null;   // 또는 "c2"
     eval(await (await fetch('/_tools/labcheck.js',{cache:'reload'})).text())
   사례마다 예측을 고른 뒤 조작판(슬라이더·버튼 묶음)의 모든 조합을 훑어 판정이 합격하는 조합을 찾는다.
   오류, 합격 조합 수, 처음 합격한 값을 돌려준다. 조합이 너무 많으면 슬라이더를 성기게 훑는다. */
(async function () {
  var errs = [];
  window.addEventListener("error", function (e) { errs.push(e.message + " @" + e.lineno); });
  var tab = Array.prototype.slice.call(document.querySelectorAll(".tab-btn")).filter(function (b) { return /응용/.test(b.textContent); })[0];
  if (!tab) return JSON.stringify({ fatal: "응용 실험실 탭 없음" });
  tab.click();
  await new Promise(function (r) { setTimeout(r, 200); });
  var out = {}, LIMIT = 4000;
  var cards = Array.prototype.slice.call(document.querySelectorAll(".lab-case"));
  for (var ci = 0; ci < cards.length; ci++) {
    var card = cards[ci], id = card.id.replace("lab-", "");
    if (window.LC_ONLY && id !== window.LC_ONLY) continue;
    var pick = card.querySelector(".lab-pred .opt"); if (pick) pick.click();
    var ranges = Array.prototype.slice.call(card.querySelectorAll("input[type=range]"));
    var segs = Array.prototype.slice.call(card.querySelectorAll(".seg")).map(function (s) { return Array.prototype.slice.call(s.querySelectorAll("button")); });
    var dims = [];
    ranges.forEach(function (r) {
      var lo = +r.min, hi = +r.max, st = +r.step || 1, vals = [];
      for (var x = lo; x <= hi + 1e-9; x += st) vals.push(+x.toFixed(6));
      dims.push({ kind: "r", el: r, vals: vals });
    });
    segs.forEach(function (bs) { dims.push({ kind: "s", btns: bs, vals: bs.map(function (_, i) { return i; }) }); });
    var total = dims.reduce(function (a, d) { return a * d.vals.length; }, 1);
    /* 너무 많으면 슬라이더부터 성기게 */
    while (total > LIMIT) {
      var big = dims.filter(function (d) { return d.kind === "r"; }).sort(function (a, b) { return b.vals.length - a.vals.length; })[0];
      if (!big || big.vals.length < 4) break;
      big.vals = big.vals.filter(function (_, i) { return i % 2 === 0; });
      total = dims.reduce(function (a, d) { return a * d.vals.length; }, 1);
    }
    function setDim(d, k) {
      if (d.kind === "r") { d.el.value = String(d.vals[k]); d.el.dispatchEvent(new Event("input", { bubbles: true })); }
      else d.btns[d.vals[k]].click();
    }
    var passN = 0, first = null, idx = dims.map(function () { return 0; }), n = 0, t0 = Date.now();
    dims.forEach(function (d) { setDim(d, 0); });
    while (true) {
      var r = null;
      try { r = card._judge ? card._judge() : null; } catch (e) { errs.push(id + " judge: " + e.message); break; }
      if (r && r.ok) { passN++; if (!first) first = dims.map(function (d, i) { return d.kind === "r" ? d.vals[idx[i]] : d.btns[d.vals[idx[i]]].textContent; }); }
      n++;
      /* 다음 조합 */
      var k = dims.length - 1;
      while (k >= 0) { idx[k]++; if (idx[k] < dims[k].vals.length) { setDim(dims[k], idx[k]); break; } idx[k] = 0; setDim(dims[k], 0); k--; }
      if (k < 0 || !dims.length) break;
      if (n % 200 === 0) await new Promise(function (res) { setTimeout(res, 0); });
    }
    out[id] = { 조합: n, 합격: passN, 처음합격: first, 초: ((Date.now() - t0) / 1000).toFixed(1) };
  }
  return JSON.stringify({ cases: out, errors: errs }, null, 1);
})();
