/* 모든 단원의 '우리 반' 탭이 오류 없이 뜨는지 훑는다.  /_tools/ 를 연 뒤:
     window.TC = ["climate-change-ecology/1", …];
     eval(await (await fetch('/_tools/tabcheck.js',{cache:'reload'})).text())  */
(async function () {
  var list = window.TC || [], out = {};
  for (var i = 0; i < list.length; i++) {
    var u = list[i];
    try { await fetch("/" + u + "/index.html", { cache: "reload" }); } catch (e) {}
    var f = document.createElement("iframe");
    f.style.cssText = "position:fixed;left:0;top:0;width:1000px;height:820px;border:0;opacity:0.01;z-index:-1";
    f.src = "/" + u + "/index.html?v=" + Date.now();
    document.body.appendChild(f);
    try {
      await new Promise(function (r) { f.onload = r; setTimeout(r, 12000); });
      var w = f.contentWindow, errs = [];
      w.addEventListener("error", function (e) { errs.push(e.message); });
      var tabs = Array.prototype.slice.call(w.document.querySelectorAll(".tab-btn"));
      var last = tabs[tabs.length - 1];
      var name = last ? last.textContent.trim() : "(탭 없음)";
      if (last) last.click();
      await new Promise(function (r) { setTimeout(r, 350); });
      var sh = w.document.getElementById("share");
      out[u] = {
        마지막탭: name,
        공유칸: sh ? (sh.querySelector(".share-id") ? "그려짐" : "비어 있음") : "없음",
        보임: sh ? !sh.closest("[hidden]") : false,
        errors: errs
      };
    } catch (e) { out[u] = { fatal: String(e) }; }
    f.remove();
  }
  return JSON.stringify(out, null, 1);
})();
