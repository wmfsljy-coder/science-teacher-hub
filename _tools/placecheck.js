/* 이야기 속 지명 📍 검사 — /_tools/ 를 연 뒤:
     window.PC = ["earth-system-1/1-2", ...];
     eval(await (await fetch('/_tools/placecheck.js',{cache:'reload'})).text())
   지명마다 그 탭을 열고 눌러, 지도가 지명 바로 아래(가까이)에 보이게 펼쳐지는지, 다시 누르면 닫히는지 본다. */
(async function () {
  var out = {};
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  for (var i = 0; i < (window.PC || []).length; i++) {
    var u = window.PC[i], repo = u.split("/")[0];
    for (var f of ["/" + u + "/index.html", "/" + u + "/episodes.js", "/" + repo + "/assets/link.js"]) { try { await fetch(f, { cache: "reload" }); } catch (e) {} }
    var fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;left:0;top:0;width:1100px;height:820px;border:0;opacity:0.01;z-index:-1";
    fr.src = "/" + u + "/index.html?open=1&v=" + Date.now();
    document.body.appendChild(fr);
    var res = [];
    try {
      await new Promise(function (r) { fr.onload = r; setTimeout(r, 12000); });
      await sleep(500);
      var d = fr.contentDocument, W = fr.contentWindow, errs = [];
      W.addEventListener("error", function (e) { errs.push(e.message); });
      var P = Array.prototype.slice.call(d.querySelectorAll("[data-place],[data-view]"));
      for (var k = 0; k < P.length; k++) {
        var n = P[k], pn = n.closest("[data-panel]");
        if (pn) { var tb = d.querySelector('.tab-btn[data-tab="' + pn.getAttribute("data-panel") + '"]'); if (tb) tb.click(); await sleep(150); }
        /* 아직 안 연 장면 안의 지명은 검사할 때만 잠깐 보이게 한다 */
        var hid = []; for (var a = n; a && a !== d.body; a = a.parentElement) if (a.hidden) { a.hidden = false; hid.push(a); }
        n.scrollIntoView({ block: "start" }); await sleep(50);
        /* 새 창으로만 여는 단추(out:)는 window.open 이 불렸는지만 본다 */
        if (/^out:/.test(n.getAttribute("data-view") || "")) {
          var opened = null, wo = W.open; W.open = function (u) { opened = u; return null; };
          n.click(); await sleep(50); W.open = wo; hid.forEach(function (h) { h.hidden = true; });
          res.push((opened ? "✅ " : "✗ ") + n.textContent + (opened ? " (새 창)" : " (새 창이 안 열림)")); continue;
        }
        n.click(); await sleep(150);
        var pop = n._pop, r1 = n.getBoundingClientRect();
        if (!pop) { res.push(n.textContent + ": 안 펼쳐짐"); continue; }
        var r2 = pop.getBoundingClientRect(), gap = Math.round(r2.top - r1.bottom);
        var ok = pop.offsetParent && r2.width > 260 && gap > -5 && gap < 500;
        var role = n.getAttribute("role") === "button" && n.getAttribute("tabindex") === "0";
        n.click(); await sleep(80);
        var closed = !n._pop && !d.querySelector(".sth-place-pop");
        hid.forEach(function (h) { h.hidden = true; });
        res.push((ok && role && closed ? "✅ " : "✗ ") + n.textContent + " (아래 " + gap + "px, 폭 " + Math.round(r2.width) + (role ? "" : ", 역할 없음") + (closed ? "" : ", 안 닫힘") + ")");
      }
      if (errs.length) res.push("오류: " + errs.join(" / "));
    } catch (e) { res.push("fatal " + e); }
    out[u] = res;
    fr.remove();
  }
  return JSON.stringify(out);
})();
