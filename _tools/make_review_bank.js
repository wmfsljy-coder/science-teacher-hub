/* 간격 복습(assets/review.js)이 쓰는 문제 은행 — 과목 묶음마다 한 파일.
     node _tools/make_review_bank.js
   - assets/review-<묶음>.js : window.STH_REVIEW_BANK["is"] = { units: { 단원 코드: 단원 이름 }, items: [ { u: 단원 코드, … 문항 } ] }
   묶음은 단원 코드 앞글자(is · gt · eshs · esys · psp · cce · cvg · shc). 통합과학1·2처럼 두 저장소가 한 묶음이다.
   스스로 채점되는 1·2단계 문항만(서술형 빼고), 다른 단원 화면에서도 보이도록 그림 경로·소단원·성취기준은 뺀다.
   수준별 문제를 고치면 다시 돌린다. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = path.join(__dirname, "..", "..");
var UNITS = fs.readFileSync(path.join(__dirname, "ALL_UNITS.txt"), "utf8").split(/\r?\n/).filter(Boolean);
var OK_T = { ox: 1, mc: 1, bogi: 1, blank: 1, num: 1, order: 1, match: 1 };
var KEEP = ["id", "lv", "t", "q", "a", "options", "items", "pairs", "tol", "unit", "hint", "why", "fig", "keepOrder"];

var banks = {}, skipped = 0, n = 0;
UNITS.forEach(function (u) {
  var dir = path.join(ROOT, u), ef = path.join(dir, "episodes.js"), qf = path.join(dir, "quiz-items.js");
  if (!fs.existsSync(ef) || !fs.existsSync(qf)) return;
  var id = (/sthUnit\("([^"]+)"\)/.exec(fs.readFileSync(ef, "utf8")) || [])[1];
  if (!id) return;
  var grp = id.replace(/[0-9]*-.*$/, "").replace(/[0-9]+$/, "");
  var html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  var name = ((/<title>([^<]*)<\/title>/.exec(html) || [])[1] || id).split(/\s+[—–-]\s+/)[0].replace(/^[ⅠⅡⅢⅣ]+\.\s*/, "").trim();
  var got = null;
  vm.runInNewContext(fs.readFileSync(qf, "utf8"), { window: { sthQuiz: function (x) { got = x; } } });
  var B = banks[grp] || (banks[grp] = { units: {}, items: [] });
  B.units[id] = name;
  (got && got.items || []).forEach(function (it) {
    if (!OK_T[it.t] || !(it.lv === 1 || it.lv === 2)) return;
    if (it.fig && /\b(src|href)\s*=\s*["'](?!https?:|data:)/i.test(it.fig)) { skipped++; return; }   /* 그 단원 폴더 안 그림은 다른 단원에서 깨진다 */
    if (it.fig && /<canvas|<script/i.test(it.fig)) { skipped++; return; }
    var o = { u: id };
    KEEP.forEach(function (k) { if (it[k] !== undefined) o[k] = it[k]; });
    B.items.push(o); n++;
  });
});
Object.keys(banks).forEach(function (g) {
  var out = path.join(__dirname, "..", "assets", "review-" + g + ".js");
  fs.writeFileSync(out, "/* 간격 복습 문제 은행(" + g + ") — _tools/make_review_bank.js 가 만든 파일. 고치지 말고 다시 만든다. */\n"
    + "window.STH_REVIEW_BANK = window.STH_REVIEW_BANK || {};\nwindow.STH_REVIEW_BANK[" + JSON.stringify(g) + "] = " + JSON.stringify(banks[g]) + ";\n");
  console.log(g, Object.keys(banks[g].units).length + "단원", banks[g].items.length + "문항", Math.round(fs.statSync(out).size / 1024) + " KB");
});
console.log("모두", n, "문항 · 그림 때문에 뺀 문항", skipped);
