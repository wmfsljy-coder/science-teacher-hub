/* 단원 전체 점검 — 탭을 모두 눌러 보며 오류를 모으고, 수준별 문제·응용 실험실·정리하기 줄이 있는지 센다.
     window.AC = ["integrated-science-1/1-1", ...];
     window.__ac = null; eval(await (await fetch('/_tools/allcheck.js',{cache:'reload'})).text());
   끝나면 window.__ac 에 결과 JSON 문자열이 담긴다(오래 걸리므로 기다렸다가 읽는다). */
(async function () {
  var out = {};
  for (var i = 0; i < (window.AC || []).length; i++) {
    var u = window.AC[i];
    try { localStorage.clear(); } catch (e) {}
    var fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;left:0;top:0;width:1000px;height:820px;border:0;opacity:0.01;z-index:-1";
    fr.src = "/" + u + "/index.html?v=" + Date.now();
    document.body.appendChild(fr);
    var errs = [];
    try {
      await new Promise(function (r) { fr.onload = r; setTimeout(r, 12000); });
      var w = fr.contentWindow, d = fr.contentDocument;
      w.addEventListener("error", function (e) { errs.push(e.message); });
      await new Promise(function (r) { setTimeout(r, 300); });
      var btns = Array.prototype.slice.call(d.querySelectorAll(".tab-btn")), bad = [];
      for (var k = 0; k < btns.length; k++) {
        btns[k].click();
        await new Promise(function (r) { setTimeout(r, 120); });
        var p = d.querySelector('.tab-panel[data-panel="' + btns[k].getAttribute("data-tab") + '"]');
        if (!p || p.hidden || p.offsetHeight < 50) bad.push(btns[k].textContent.trim());
      }
      var names = btns.map(function (b) { return b.textContent.replace(/^\s*\d+\s*/, "").trim(); });
      var txt = d.body.innerText;
      out[u] = {
        탭: names.length,
        순서: names.slice(-4).join(" › "),
        문제: d.querySelectorAll(".qz-card").length,
        실험: d.querySelectorAll(".lab-case").length,
        정리줄: /수준별 문제/.test(txt) && /응용 실험실/.test(txt) ? "O" : "X",
        안보이는탭: bad.length ? bad : undefined,
        오류: errs.length ? errs.slice(0, 3) : undefined
      };
    } catch (e) { out[u] = { fatal: String(e) }; }
    fr.remove();
  }
  window.__ac = JSON.stringify(out, null, 1);
  return window.__ac;
})();
