/* 반 통계(우리 반 한눈에) 저장형 XSS 시험 — 로컬 정적 서버에서 /_tools/ 를 연 뒤 콘솔에서:
     window.XC = ["integrated-science-1/1-1", "science-inquiry-1/1-2"];   // is·gt 단원(1학년 반으로 모으는 단원)
     eval(await (await fetch('/_tools/xsscheck.js',{cache:'reload'})).text())
   미리보기 가짜 뒷단(?mock=1, 이 브라우저 안 localStorage)에 같은 반 학생 3명의 학습 기록을 넣는데,
   기록의 열쇠(첫 추리·장면·문항·실험 이름)와 반 이름에 <img onerror>·<svg onload> 를 섞는다.
   로그인한 학생으로 '우리 반' 탭을 열어, 스크립트가 하나도 실행되지 않고 위험한 요소가 생기지 않았는지 본다.
   진짜 시트에는 아무것도 가지 않는다(가짜 뒷단). localStorage 를 지우므로 실서비스 주소에서는 돌리지 말 것. */
(async function () {
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var BAD = function (n) { return '<img src=x onerror="window.top.__xss=(window.top.__xss||[]).concat(' + n + ')">'; };
  var out = {};
  for (var i = 0; i < (window.XC || []).length; i++) {
    var u = window.XC[i];
    window.__xss = [];
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    var fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;left:0;top:0;width:1000px;height:820px;border:0;opacity:0.01;z-index:-1";
    fr.src = "/" + u + "/index.html?mock=1&v=" + Date.now();
    document.body.appendChild(fr);
    try {
      await new Promise(function (r) { fr.onload = r; setTimeout(r, 12000); });
      await sleep(400);
      var w = fr.contentWindow;
      if (!w.sthAccCall || !w.sthAccMock) { out[u] = { fatal: "가짜 뒷단이 켜지지 않음" }; fr.remove(); continue; }
      await w.sthAccCall({ action: "accCheck", sid: "1101", name: "김하늘" });     /* 가짜 명단 만들기 */
      var unit = w.sthUnitId(), d = JSON.parse(localStorage.getItem("sth-mock-db"));
      var s = {};
      s["x" + BAD(1) + "I"] = 0; s.g1I = 0; s.g1OK = "맞음";
      s["ep" + BAD(2)] = { c: [1, 1], done: 1 };
      s.quiz = {}; s.quiz["q" + BAD(3)] = { r: 1 }; s.quiz.a1 = { r: 1 };
      s.lab = {}; s.lab["c1" + BAD(4)] = { p: 0, ok: 1 }; s.lab.c1 = { p: 0, ok: 1 };
      s.real = {}; s.real['r"><svg onload="window.top.__xss=(window.top.__xss||[]).concat(5)">'] = { p: 0 };
      ["1101", "1102", "1103"].forEach(function (sid) { d.learn[sid + "|" + unit] = { sid: sid, unit: unit, at: Date.now(), n: 1, d: { s: s, w: { x: "글" } } }; });
      d.roster.forEach(function (r) { if (r.sid === "1101") r.cls = "1-1" + BAD(6); });   /* 반 이름에도 */
      d.roster.forEach(function (r) { if (/^110[23]$/.test(r.sid)) r.cls = "1-1" + BAD(6); });
      d.dev.tokxsscheck000000000000 = "1101";
      localStorage.setItem("sth-" + unit, JSON.stringify({ s: s, w: { x: "글" } }));   /* 이어받기(accPull) 때문에 화면이 새로 고쳐지지 않게 같은 기록을 둔다 */
      try { sessionStorage.setItem("sth-accreload-" + unit, "1"); } catch (e) {}
      localStorage.setItem("sth-mock-db", JSON.stringify(d));
      localStorage.setItem("sth-acc", JSON.stringify({ t: "tokxsscheck000000000000", me: { sid: "1101", name: "김하늘", grade: "1", cls: "1-1" + BAD(6), classes: [] }, at: Date.now() }));
      fr.src = "/" + u + "/index.html?v=" + Date.now();
      await new Promise(function (r) { fr.onload = r; setTimeout(r, 12000); });
      await sleep(900);
      w = fr.contentWindow; var doc = fr.contentDocument;
      var tab = Array.prototype.filter.call(doc.querySelectorAll(".tab-btn"), function (b) { return /우리 반/.test(b.textContent); })[0];
      if (tab) tab.click();
      await sleep(1800);
      var box = doc.querySelector(".acc-class");
      out[u] = {
        실행된_스크립트: (window.__xss || []).slice(),
        위험요소: box ? box.querySelectorAll("img, svg, script, iframe, [onerror], [onload]").length : "반 통계 칸 없음",
        보인_열쇠: box ? Array.prototype.map.call(box.querySelectorAll(".ac-t"), function (e) { return e.textContent.slice(0, 40); }) : [],
        통계칸_있음: !!box && box.textContent.length > 0
      };
    } catch (e) { out[u] = { fatal: String(e) }; }
    fr.remove();
  }
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  return JSON.stringify(out, null, 1);
})();
