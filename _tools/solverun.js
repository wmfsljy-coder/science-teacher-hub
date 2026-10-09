/* 여러 단원의 막힌 장면 찾기를 뒤에서 차례로 돌린다.  /_tools/ 를 연 뒤:
     window.SR = ["earth-science-2/1-1", ...];
     eval(await (await fetch('/_tools/solverun.js',{cache:'reload'})).text())
   바로 돌아오고, 결과는 window.__SRO 에 단원마다 쌓인다(window.__SRdone 이 true 면 끝). */
(function () {
  window.__SRO = {}; window.__SRdone = false;
  (async function () {
    var SRC = await (await fetch("/_tools/solve.js", { cache: "reload" })).text();
    for (var i = 0; i < (window.SR || []).length; i++) {
      var u = window.SR[i];
      try { localStorage.clear(); } catch (e) {}
      var fr = document.createElement("iframe");
      fr.style.cssText = "position:fixed;left:0;top:0;width:1000px;height:820px;border:0;opacity:0.01;z-index:-1";
      fr.src = "/" + u + "/index.html?open=1&v=" + Date.now();
      document.body.appendChild(fr);
      try {
        await new Promise(function (r) { fr.onload = r; setTimeout(r, 12000); });
        await new Promise(function (r) { setTimeout(r, 500); });
        fr.contentWindow.SOLVE_ROUNDS = window.SOLVE_ROUNDS || 6;
        var r = JSON.parse(await fr.contentWindow.eval(SRC));
        /* 시간 초과로 남은 장면은 한 번 더 부른다 */
        for (var again = 0; again < 2 && r.남음 && r.남음.length; again++) r = JSON.parse(await fr.contentWindow.eval(SRC));
        window.__SRO[u] = { 막힌곳: r.막힌곳, 남음: r.남음, errors: r.errors };
      } catch (e) { window.__SRO[u] = { fatal: String(e) }; }
      fr.remove();
    }
    window.__SRdone = true;
  })();
  return (window.SR || []).length;
})();
