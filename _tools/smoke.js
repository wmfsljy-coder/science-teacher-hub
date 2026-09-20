/* 검수용 연기 시험 — 단원 페이지를 ?open=1 로 연 뒤 콘솔에서:
     eval(await (await fetch('/_tools/smoke.js', {cache:'reload'})).text())
   모든 탭·장면을 돌며 슬라이더를 양끝으로 밀고 버튼을 눌러, 오류와 캔버스 밖으로 나간 글자를 모은다. */
(async function () {
  var errs = [], clip = {};
  window.addEventListener("error", function (e) { errs.push(e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno); });
  window.confirm = function () { return false; };

  var proto = CanvasRenderingContext2D.prototype, orig = proto.fillText;
  proto.fillText = function (s, x, y) {
    try {
      var w = this.measureText(s).width, a = this.textAlign, m = this.getTransform();
      var L = a === "center" ? x - w / 2 : (a === "right" || a === "end" ? x - w : x), R = L + w;
      var W = this.canvas._w || 900, H = this.canvas._h || 9999;
      if (m.b === 0 && m.c === 0 && (L < -2 || R > W + 2 || y < 0 || y > H + 2)) {
        clip[this.canvas.id + " | " + String(s).slice(0, 24)] = Math.round(L) + "~" + Math.round(R) + " y" + Math.round(y);
      }
    } catch (e) {}
    return orig.apply(this, arguments);
  };

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab-btn"));
  var report = [];
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].click();
    var panel = document.querySelector('.tab-panel[data-panel="' + tabs[t].getAttribute("data-tab") + '"]');
    var dots = Array.prototype.slice.call(panel.querySelectorAll(".ep-dot"));
    var stops = dots.length ? dots : [null];
    for (var d = 0; d < stops.length; d++) {
      if (stops[d]) { if (stops[d].disabled) { report.push("잠긴 장면(open=1 확인): 탭" + t + " 장면" + (d + 1)); continue; } stops[d].click(); }
      var scope = stops[d] ? panel.querySelector(".scene:not([hidden])") : panel;
      if (!scope) { report.push("보이는 장면 없음: 탭" + t + " 장면" + (d + 1)); continue; }
      var ranges = scope.querySelectorAll("input[type=range]");
      for (var i = 0; i < ranges.length; i++) {
        var r = ranges[i], vals = [r.min, r.max, String((+r.min + +r.max) / 2)];
        for (var k = 0; k < vals.length; k++) { r.value = vals[k]; r.dispatchEvent(new Event("input", { bubbles: true })); r.dispatchEvent(new Event("change", { bubbles: true })); }
      }
      var sels = scope.querySelectorAll("select");
      for (var s2 = 0; s2 < sels.length; s2++) { for (var o = 0; o < sels[s2].options.length; o++) { sels[s2].selectedIndex = o; sels[s2].dispatchEvent(new Event("change", { bubbles: true })); } }
      var btns = Array.prototype.slice.call(scope.querySelectorAll("button")).filter(function (b) {
        return !/ep-dot|ep-reset|next|tab-btn/.test(b.className) && !/-copy$|-wipe$/.test(b.id) && !b.disabled;
      });
      for (var b = 0; b < btns.length && b < 60; b++) { try { if (btns[b].isConnected) btns[b].click(); } catch (e) { errs.push("click: " + e.message); } }
      var cvs = scope.querySelectorAll("canvas");
      for (var c = 0; c < cvs.length; c++) {
        var rect = cvs[c].getBoundingClientRect();
        [[.2, .3], [.5, .5], [.8, .6]].forEach(function (p) {
          ["mousedown", "mousemove", "mouseup", "click"].forEach(function (type) {
            cvs[c].dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: rect.left + rect.width * p[0], clientY: rect.top + rect.height * p[1] }));
          });
        });
      }
      await sleep(120);
    }
  }
  await sleep(1500);
  if (window.redrawCanvases) window.redrawCanvases();
  proto.fillText = orig;
  var blank = Array.prototype.slice.call(document.querySelectorAll("canvas")).filter(function (c) { return !c._dprSet; }).map(function (c) { return c.id; });
  return JSON.stringify({ errors: errs, clipped: clip, canvasesNeverSetUp: blank, notes: report,
    tabs: tabs.length, episodes: document.querySelectorAll(".episode").length, scenes: document.querySelectorAll(".scene").length }, null, 1);
})();
