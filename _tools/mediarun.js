/* 움직이는 그림을 브라우저에서 실제로 돌려 VISUAL_GUIDE 3단계를 확인한다. mediacheck.py(파일 검사)가 못 보는 것들.
   로컬 서버에서 아무 쪽이나 연 뒤 개발자 콘솔에서:
     window.MR = ["earth-science-2/1-1", ...];     // 빼면 ALL_UNITS.txt 전체
     window.MR_LOOP = false;                       // true 면 블록 모형만 골라 저절로 되돌아가는 반복을 본다(그림당 18초, 다른 검사는 건너뜀)
     eval(await (await fetch('/science-teacher-hub/_tools/mediarun.js',{cache:'reload'})).text())
   바로 돌아오고, 결과는 window.__MRO(window.__MRO.끝 이 true 면 끝)에 쌓인다.
     멈춤단추없음   저절로 계속 움직이는데 ⏸/▶ 단추가 없는 그림(몇 초 안에 멈추는 짧은 움직임은 뺀다)
     줄이기어김     '움직임 줄이기'를 켠 기기에서도 저절로 움직이는 그림
     크게보기없음   가로 500 이상인데 🔍 크게 보기가 없는 그림
     되돌아감       (MR_LOOP) 블록 모형이 저절로 처음으로 돌아가는 것 같은 그림 — 파도·공전처럼 원래 도는 현상이면 괜찮다. 사람이 본다
     오류           그 단원에서 난 스크립트 오류
     글자많음       그림 속 13px 이하 글자가 많은 장면 상위(휴대폰에서 줄이기 좋은 후보)
   브라우저 캐시 때문에 옛 스크립트로 잴 수 있어 먼저 새로 받는다. 탭을 가리면 타이머가 느려지니 앞에 두고 돌린다. */
(function () {
  var R = window.__MRO = { 단원: 0, 그림: 0, 움직임: 0, 멈춤단추없음: [], 줄이기어김: [], 크게보기없음: [], 되돌아감: [], 오류: [], 글자많음: [], 끝: false };
  var LOOP = !!window.MR_LOOP;
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function thumb(cv) {
    var W = 96, H = Math.max(8, Math.round(W * cv.height / cv.width)), c = document.createElement("canvas");
    c.width = W; c.height = H;
    var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(cv, 0, 0, W, H);
    return x.getImageData(0, 0, W, H).data;
  }
  function diff(a, b) {
    var ch = 0;
    for (var i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) ch++;
    return ch / (a.length / 4);
  }
  async function moving(cv, wait) { var a = thumb(cv); await sleep(wait || 350); return diff(a, thumb(cv)) > 0.002; }
  function load(fr, set) { return new Promise(function (ok) { fr.onload = function () { ok(); }; set(); setTimeout(ok, 12000); }); }
  /* 탭·장면을 차례로 열며 cb(그 장면, 제목) */
  async function walk(d, cb) {
    var tabs = [].slice.call(d.querySelectorAll(".tab-btn"));
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].click(); await sleep(40);
      var panel = d.querySelector(".tab-panel:not([hidden])"); if (!panel) continue;
      var num = (tabs[t].querySelector(".num") || { textContent: "" }).textContent.trim();
      var eps = [].slice.call(panel.querySelectorAll(".episode"));
      for (var e = 0; e < eps.length; e++) {
        var dots = [].slice.call(eps[e].querySelectorAll(":scope > .ep-bar .ep-dot")), scs = [].slice.call(eps[e].querySelectorAll(":scope > .scene"));
        for (var i = 0; i < scs.length; i++) { dots[i].click(); await sleep(25); await cb(scs[i], num + " 장면" + (i + 1) + " " + (scs[i].getAttribute("data-title") || "")); }
      }
      if (!eps.length) await cb(panel, num + " " + tabs[t].textContent.trim());
    }
  }
  function canvasesOf(sc) { return [].filter.call(sc.querySelectorAll("canvas"), function (c) { return c.offsetWidth; }); }

  (async function () {
    var units = window.MR;
    if (!units) units = (await (await fetch("/science-teacher-hub/_tools/ALL_UNITS.txt", { cache: "reload" })).text()).split(/\s+/).filter(Boolean);
    var fresh = {};
    var fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;left:0;top:0;width:1100px;height:800px;z-index:9999;background:#fff;border:0";
    document.body.appendChild(fr);
    for (var k = 0; k < units.length; k++) {
      var u = units[k], url = "/" + u + "/index.html";
      /* 옛 파일로 재지 않게 먼저 새로 받는다 */
      var html = await (await fetch(url, { cache: "reload" })).text();
      await load(fr, function () { fr.src = url + "?open=1"; });
      var srcs = [].map.call(fr.contentDocument.querySelectorAll("script[src],link[rel=stylesheet]"), function (e) { return e.src || e.href; })
        .filter(function (s) { return s.indexOf(location.origin) === 0 && !fresh[s]; });
      await Promise.all(srcs.map(function (s) { fresh[s] = 1; return fetch(s, { cache: "reload" }).catch(function () {}); }));
      await load(fr, function () { fr.src = url + "?open=1&v=" + Date.now(); }); await sleep(300);
      var d = fr.contentDocument, w = fr.contentWindow, moved = {};
      w.addEventListener("error", function (ev) { R.오류.push(u + ": " + ev.message); });
      /* 글자 재기 */
      var per = new Map(), P = w.CanvasRenderingContext2D.prototype, fill = P.fillText;
      P.fillText = function (t, x, y, m) {
        var mm = /(\d+(?:\.\d+)?)px/.exec(this.font), s = String(t);
        if (mm && s.trim()) { var cv = this.canvas, tr = this.getTransform(), ratio = cv.width / (cv._w || cv.width), size = +mm[1] * (Math.abs(tr.a) / ratio || 1), e = per.get(cv); if (!e) { e = {}; per.set(cv, e); } if (size <= 13.5) e[s] = 1; }
        return fill.call(this, t, x, y, m);
      };
      /* 1) 평소 */
      await walk(d, async function (sc, name) {
        var cs = canvasesOf(sc);
        for (var c = 0; c < cs.length; c++) {
          var cv = cs[c], lw = cv._w || cv.width; R.그림++;
          var isModel = cv.parentNode && /e4eaf1/.test(cv.parentNode.getAttribute("style") || "");
          if (LOOP && !isModel) continue;
          if (lw >= 500 && !((cv.closest(".stage-card") || cv.closest(".canvas-wrap") || {})._bigBtn)) R.크게보기없음.push(u + " " + name + " #" + cv.id);
          cv.scrollIntoView({ block: "center" }); await sleep(280);
          if (!(await moving(cv))) continue;
          R.움직임++; moved[name + "|" + c] = 1;
          var hasBtn = [].some.call(sc.querySelectorAll("button"), function (b) { return /⏸|▶|멈추|재생|일시/.test(b.textContent); });
          if (!hasBtn && !LOOP) { await sleep(6000); if (await moving(cv)) R.멈춤단추없음.push(u + " " + name + " #" + cv.id); }
          if (LOOP) {
            var f0 = thumb(cv), far = 0, back = 0;
            for (var q = 1; q <= 12; q++) { await sleep(1500); var dq = diff(f0, thumb(cv)); if (dq > far) far = dq; if (far > 0.03 && dq < far * 0.15) { back = q * 1.5; break; } }
            if (back) R.되돌아감.push(u + " " + name + " #" + cv.id + " 약 " + back + "초에 처음과 비슷해짐");
          }
        }
      });
      P.fillText = fill;
      per.forEach(function (e, cv) { var s = cv.closest(".scene"), n = Object.keys(e).join("").length; R.글자많음.push([n, u + " " + (s ? s.getAttribute("data-title") : "") + " #" + cv.id]); });
      /* 2) 움직임 줄이기를 켠 기기 — 스크립트보다 먼저 matchMedia 를 바꿔 넣고 연다. 평소에 움직인 그림만 다시 본다 */
      if (Object.keys(moved).length && !LOOP) {
        var hack = '<base href="' + location.origin + "/" + u + '/"><script>(function(){var o=window.matchMedia;window.matchMedia=function(q){if(/prefers-reduced-motion/.test(q))return {matches:true,media:q,addEventListener:function(){},removeEventListener:function(){},addListener:function(){},removeListener:function(){}};return o.call(window,q);};})();<\/script>';
        var doc = html.replace(/<head([^>]*)>/i, "<head$1>" + hack);
        var fr2 = document.createElement("iframe");
        fr2.style.cssText = fr.style.cssText; fr2.style.zIndex = "10000";
        await load(fr2, function () { fr2.srcdoc = doc; document.body.appendChild(fr2); }); await sleep(400);
        var d2 = fr2.contentDocument;
        /* 바꿔 넣기가 안 먹었으면 이 검사는 믿을 수 없다 */
        if (!fr2.contentWindow.sthKit || fr2.contentWindow.sthKit.REDUCE !== true) R.오류.push(u + ": 움직임 줄이기 흉내가 적용되지 않음");
        await walk(d2, async function (sc, name) {
          var cs = canvasesOf(sc);
          for (var c = 0; c < cs.length; c++) {
            if (!moved[name + "|" + c]) continue;
            cs[c].scrollIntoView({ block: "center" }); await sleep(280);
            if (await moving(cs[c])) { await sleep(5000); if (await moving(cs[c])) R.줄이기어김.push(u + " " + name + " #" + cs[c].id); }
          }
        });
        fr2.remove();
      }
      R.단원 = k + 1;
    }
    fr.remove();
    R.글자많음 = R.글자많음.sort(function (a, b) { return b[0] - a[0]; }).slice(0, 25).map(function (x) { return x[0] + "자 " + x[1]; });
    R.끝 = true;
  })().catch(function (e) { R.치명 = String(e && e.stack || e); });
  return "시작";
})()
