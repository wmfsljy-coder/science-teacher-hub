/* 각 단원의 첫 추리(sthGate)와 수준별 문제(quiz-items.js) 문장을 모아 선생님 화면용 파일 하나로 쓴다.
   이야기·문제를 고치면 다시 돌린다.
     node _tools/make_unit_items.js
   - assets/unit-items-all.js : 선생님 화면(class/)의 ‘반 한눈에’가 첫 추리 보기와 많이 틀린 문항을 문장으로 보여 줄 때 쓴다.
     window.STH_UNIT_ITEMS = { 단원 코드: { g: { 열쇠: { t: 제목, q: 질문, o: [보기…] } }, q: { 문항 id: [단계, 소단원, 문장] } } } */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = path.join(__dirname, "..", "..");
var UNITS = fs.readFileSync(path.join(__dirname, "ALL_UNITS.txt"), "utf8").split(/\r?\n/).filter(Boolean);
var QMAX = 90;
function short(s, n) { s = String(s == null ? "" : s).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

/* src[i] 가 '{' 일 때 짝이 맞는 '}' 까지 — 문자열·주석은 건너뛴다 */
function block(src, i) {
  var depth = 0, q = null;
  for (var j = i; j < src.length; j++) {
    var c = src[j];
    if (q) { if (c === "\\") j++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === "/" && src[j + 1] === "*") { j = src.indexOf("*/", j + 2) + 1; continue; }
    if (c === "/" && src[j + 1] === "/") { j = src.indexOf("\n", j); continue; }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return src.slice(i, j + 1);
  }
  return null;
}

var all = {}, nG = 0, nQ = 0, miss = [];
UNITS.forEach(function (u) {
  var dir = path.join(ROOT, u), ef = path.join(dir, "episodes.js");
  if (!fs.existsSync(ef)) return;
  var src = fs.readFileSync(ef, "utf8");
  var id = (/sthUnit\("([^"]+)"\)/.exec(src) || [])[1];
  if (!id) { console.error("단원 코드를 찾지 못함:", u); return; }
  var U = all[id] = { g: {}, q: {} };

  /* 첫 추리: window.sthGate({ … key, title, question, options … }) */
  var re = /sthGate\(\s*\{/g, m;
  while ((m = re.exec(src))) {
    var txt = block(src, m.index + m[0].length - 1), o = null;
    if (!txt) continue;
    /* 함수 몸통은 실행되지 않으니 대부분 그대로 읽힌다. 바깥 변수를 쓰는 보기는 문자열만 골라 읽는다. */
    try { o = vm.runInNewContext("(" + txt + ")", {}); } catch (e) {
      o = {};
      ["key", "title", "question"].forEach(function (k) { var x = new RegExp(k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(txt); if (x) o[k] = JSON.parse('"' + x[1] + '"'); });
      var oa = /options:\s*(\[[^\]]*\])/.exec(txt);
      if (oa) try { o.options = vm.runInNewContext(oa[1], {}); } catch (e2) {}
    }
    var key = o.key || "pred";
    if (!o.options || !o.options.length) { miss.push(u + " " + key); continue; }
    U.g[key] = { t: short(o.title, 40), q: short(o.question, 140), o: o.options.map(function (x) { return short(x, 80); }) };
    nG++;
  }

  /* 수준별 문제 */
  var qf = path.join(dir, "quiz-items.js"), got = null;
  if (fs.existsSync(qf)) {
    vm.runInNewContext(fs.readFileSync(qf, "utf8"), { window: { sthQuiz: function (x) { got = x; } } });
    (got && got.items || []).forEach(function (it) { U.q[it.id] = [it.lv, it.sec || "", short(it.q, QMAX)]; nQ++; });
  }
});
fs.writeFileSync(path.join(__dirname, "..", "assets", "unit-items-all.js"),
  "/* 첫 추리·수준별 문제 문장 — _tools/make_unit_items.js 가 만든 파일. 고치지 말고 다시 만든다.\n" +
  "   { 단원 코드: { g: { 열쇠: { t: 제목, q: 질문, o: [보기…] } }, q: { 문항 id: [단계, 소단원, 문장] } } } */\n" +
  "window.STH_UNIT_ITEMS = " + JSON.stringify(all) .replace(/\},"/g, '},\n"') + ";\n", "utf8");
console.log("단원", Object.keys(all).length, "첫 추리", nG, "문항", nQ);
if (miss.length) console.log("보기를 읽지 못한 첫 추리:", miss.join(" / "));
