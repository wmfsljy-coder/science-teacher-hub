/* 글자 겹침만 따로 훑는 검사기.  /_tools/ 를 연 뒤 콘솔에서:
     window.OV = ["integrated-science-1/1-1", ...];
     eval(await (await fetch('/_tools/overlap.js',{cache:'reload'})).text())
   각 단원을 숨은 틀(iframe)에 띄워 smoke.js 를 돌리고, 겹친 글자에 좌표를 붙여 돌려준다. */
(async function () {
  var SRC = await (await fetch("/_tools/smoke.js", { cache: "reload" })).text();
  SRC = SRC
    .replace('overlap[id + " : “" + o.s + "” ↔ “" + box.s + "”"] = Math.round(ix) + "×" + Math.round(iy) + "px";',
             'overlap[id + " : “" + o.s + "” ↔ “" + box.s + "”"] = Math.round(ix)+"×"+Math.round(iy)+"px  A(x"+Math.round(o.x)+",y"+Math.round(o.y)+" "+o.a+") B(x"+Math.round(box.x)+",y"+Math.round(box.y)+" "+box.a+")";')
    .replace('var box = { L: L, R: R, T: y - size * 0.8, B: y + size * 0.25, s: String(s).slice(0, 18), k: key };',
             'var box = { L: L, R: R, T: y - size * 0.8, B: y + size * 0.25, s: String(s).slice(0, 18), k: key, x: x, y: y, a: a || "left" };');

  var list = window.OV || [], out = {};
  for (var i = 0; i < list.length; i++) {
    var u = list[i];
    /* 고친 파일이 바로 반영되도록 먼저 새로 받아 둔다 */
    try { await fetch("/" + u + "/index.html", { cache: "reload" }); } catch (e) {}
    try { await fetch("/" + u + "/episodes.js", { cache: "reload" }); } catch (e) {}
    var f = document.createElement("iframe");
    f.style.cssText = "position:fixed;left:0;top:0;width:1000px;height:820px;border:0;opacity:0.01;z-index:-1";
    f.src = "/" + u + "/index.html?open=1&v=" + Date.now();
    document.body.appendChild(f);
    try {
      await new Promise(function (res) { f.onload = res; setTimeout(res, 15000); });
      await new Promise(function (r) { setTimeout(r, 600); });
      var r = JSON.parse(await f.contentWindow.eval(SRC));
      var p = { overlap: r["글자겹침"] };
      if (r.errors.length) p.errors = r.errors;
      if (Object.keys(r.clipped).length) p.clipped = r.clipped;
      if (r.notes.length) p.notes = r.notes;
      out[u] = Object.keys(p.overlap).length || p.errors || p.clipped || p.notes ? p : "깨끗함";
    } catch (e) { out[u] = { fatal: String(e) }; }
    f.remove();
  }
  return JSON.stringify(out, null, 1);
})();
