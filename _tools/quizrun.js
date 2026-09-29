/* 여러 단원의 수준별 문제를 한꺼번에 검사한다.  /_tools/ 를 연 뒤:
     window.QR = ["integrated-science-2/1-1", ...];
     eval(await (await fetch('/_tools/quizrun.js',{cache:'reload'})).text())  */
(async function () {
  var SRC = await (await fetch("/_tools/quizcheck.js", { cache: "reload" })).text();
  var out = {};
  for (var i = 0; i < (window.QR || []).length; i++) {
    var u = window.QR[i], repo = u.split("/")[0];
    for (var f of ["/" + u + "/index.html", "/" + u + "/episodes.js", "/" + u + "/quiz-items.js", "/" + repo + "/assets/quiz.js", "/" + repo + "/assets/story.css"]) {
      try { await fetch(f, { cache: "reload" }); } catch (e) {}
    }
    try { localStorage.clear(); } catch (e) {}          /* 앞 검사가 남긴 상태가 채점을 흐리지 않도록 */
    var fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;left:0;top:0;width:1000px;height:820px;border:0;opacity:0.01;z-index:-1";
    fr.src = "/" + u + "/index.html?v=" + Date.now();
    document.body.appendChild(fr);
    try {
      await new Promise(function (r) { fr.onload = r; setTimeout(r, 12000); });
      await new Promise(function (r) { setTimeout(r, 400); });
      var r = JSON.parse(await fr.contentWindow.eval(SRC));
      if (r.문제점 && !r.문제점.length) delete r.문제점;
      if (r.errors && !r.errors.length) delete r.errors;
      delete r.형식; delete r.목표;
      out[u] = r;
    } catch (e) { out[u] = { fatal: String(e) }; }
    fr.remove();
  }
  return JSON.stringify(out, null, 1);
})();
