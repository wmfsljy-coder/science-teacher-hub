/* 검수용 연기 시험 — 단원 페이지를 ?open=1 로 연 뒤 콘솔에서:
     eval(await (await fetch('/_tools/smoke.js', {cache:'reload'})).text())
   모든 탭·장면을 돌며 슬라이더를 양끝으로 밀고 버튼을 눌러, 오류와 캔버스 밖으로 나간 글자를 모은다. */
(async function () {
  var errs = [], clip = {};
  window.addEventListener("error", function (e) { errs.push(e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno); });
  window.confirm = function () { return false; };

  var boxes = {}, overlap = {};
  var proto = CanvasRenderingContext2D.prototype, orig = proto.fillText;
  proto.fillText = function (s, x, y) {
    try {
      var w = this.measureText(s).width, a = this.textAlign, m = this.getTransform();
      var L = a === "center" ? x - w / 2 : (a === "right" || a === "end" ? x - w : x), R = L + w;
      var W = this.canvas._w || 900, H = this.canvas._h || 9999;
      var flat = (m.b === 0 && m.c === 0);
      if (flat && (L < -2 || R > W + 2 || y < 0 || y > H + 2)) {
        clip[this.canvas.id + " | " + String(s).slice(0, 24)] = Math.round(L) + "~" + Math.round(R) + " y" + Math.round(y);
      }
      /* 글자끼리 겹치는 곳 찾기 — 한 번 그리는 동안(같은 프레임) 쌓인 상자끼리만 견준다 */
      if (flat && String(s).trim()) {
        var size = parseFloat((this.font.match(/(\d+(?:\.\d+)?)px/) || [0, 12])[1]) || 12;
        var id = this.canvas.id || "(이름없음)";
        var key = id + "|" + Math.round(x) + "," + Math.round(y);
        if (!boxes[id]) boxes[id] = [];
        var box = { L: L, R: R, T: y - size * 0.8, B: y + size * 0.25, s: String(s).slice(0, 18), k: key };
        for (var q = 0; q < boxes[id].length; q++) {
          var o = boxes[id][q];
          if (o.k === key) continue;
          var ix = Math.min(R, o.R) - Math.max(L, o.L), iy = Math.min(box.B, o.B) - Math.max(box.T, o.T);
          if (ix > 3 && iy > 3 && ix * iy > 40 && o.s !== box.s) {   /* 같은 글자끼리는 다시 그린 것이라 뺀다 */
            overlap[id + " : “" + o.s + "” ↔ “" + box.s + "”"] = Math.round(ix) + "×" + Math.round(iy) + "px";
          }
        }
        boxes[id].push(box);
        if (boxes[id].length > 400) boxes[id].shift();
      }
    } catch (e) {}
    return orig.apply(this, arguments);
  };
  /* 화면을 다시 그리기 시작하면(clearRect) 그 캔버스의 상자를 비운다 — 한 프레임 안에서만 견주기 위해 */
  var origClear = proto.clearRect;
  proto.clearRect = function (x, y, w, h) {
    try { if (x <= 1 && y <= 1 && w >= (this.canvas._w || this.canvas.width) - 2) boxes[this.canvas.id || "(이름없음)"] = []; } catch (e) {}
    return origClear.apply(this, arguments);
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
  proto.fillText = orig; proto.clearRect = origClear;
  var blank = Array.prototype.slice.call(document.querySelectorAll("canvas")).filter(function (c) { return !c._dprSet; }).map(function (c) { return c.id; });
  return JSON.stringify({ errors: errs, clipped: clip, 글자겹침: overlap, canvasesNeverSetUp: blank, notes: report,
    tabs: tabs.length, episodes: document.querySelectorAll(".episode").length, scenes: document.querySelectorAll(".scene").length }, null, 1);
})();
