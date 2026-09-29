/* 여러 단원의 응용 실험실을 한꺼번에 검사한다.  /_tools/ 를 연 뒤:
     window.LR = ["integrated-science-1/1-1", ...];
     eval(await (await fetch('/_tools/labrun.js',{cache:'reload'})).text())  */
(async function () {
  var SRC = await (await fetch("/_tools/labcheck.js", { cache: "reload" })).text();
  var out = {};
  for (var i = 0; i < (window.LR || []).length; i++) {
    var u = window.LR[i], repo = u.split("/")[0];
    for (var f of ["/" + u + "/index.html", "/" + u + "/episodes.js", "/" + u + "/lab-cases.js", "/" + repo + "/assets/lab.js", "/" + repo + "/assets/story.css"]) {
      try { await fetch(f, { cache: "reload" }); } catch (e) {}
    }
    var fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;left:0;top:0;width:1000px;height:820px;border:0;opacity:0.01;z-index:-1";
    try { localStorage.clear(); } catch (e) {}
    fr.src = "/" + u + "/index.html?v=" + Date.now();
    document.body.appendChild(fr);
    try {
      await new Promise(function (r) { fr.onload = r; setTimeout(r, 12000); });
      await new Promise(function (r) { setTimeout(r, 400); });
      var r = JSON.parse(await fr.contentWindow.eval(SRC));
      var brief = {};
      Object.keys(r.cases || {}).forEach(function (k) { var c = r.cases[k]; brief[k] = c.합격 ? "✅ " + c.합격 + "/" + c.조합 + " 첫합격 " + JSON.stringify(c.처음합격) : "✗ 못 풂 (" + c.조합 + "조합)"; });
      if (r.errors && r.errors.length) brief.errors = r.errors;
      if (r.fatal) brief.fatal = r.fatal;
      out[u] = brief;
    } catch (e) { out[u] = { fatal: String(e) }; }
    fr.remove();
  }
  return JSON.stringify(out, null, 1);
})();
