/* 단원별 지도안(LESSON.md)과 성취기준 대응표(science-teacher-hub/STANDARDS.md)를 실제 페이지 내용에서 만든다.
     node _tools/make_lessons.js
   페이지(index.html·episodes.js·quiz-items.js·lab-cases.js·real-cases.js)를 고친 뒤 다시 돌리면 그대로 따라온다. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = __dirname;   /* 위로 올라가며 과목 저장소들이 모인 폴더를 찾는다(허브 _tools 에서도, 상위 _tools 에서도 돈다) */
while (!fs.existsSync(path.join(ROOT, "planet-space-2")) && path.dirname(ROOT) !== ROOT) ROOT = path.dirname(ROOT);
/* node _tools/make_lessons.js --check : 쓰지 않고, 페이지와 어긋난 LESSON.md 만 알려 준다(어긋나면 끝 코드 1) */
var CHECK = process.argv.indexOf("--check") >= 0, STALE = [];
var UNITS = fs.readFileSync(path.join(__dirname, "ALL_UNITS.txt"), "utf8").split(/\r?\n/).filter(Boolean);

function strip(s) { return String(s || "").replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
/* 단원 자료 파일을 돌려 sthQuiz/sthLab 에 넘기는 값을 잡는다. pre = 먼저 돌릴 파일(실제 자료의 data/*.js).
   예전에는 data 를 안 불러서 실제 자료 절이 빠지거나(기후변화와 환경생태 1) ‘초신성 0개’처럼 개수가 0 으로 나왔다. */
function load(file, fn, pre) {
  if (!fs.existsSync(file)) return null;
  var cap = null, ctx = { document: { getElementById: function () { return null; }, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, createElement: function () { return { style: {}, appendChild: function () {}, setAttribute: function () {} }; } },
    Math: Math, JSON: JSON, Date: Date, console: { log: function () {}, warn: function () {} }, setTimeout: function () {}, sthKit: {} };
  ctx.window = ctx; ctx[fn] = function (o) { cap = o; };
  vm.createContext(ctx);
  (pre || []).forEach(function (p) { try { vm.runInContext(fs.readFileSync(p, "utf8"), ctx); } catch (e) {} });
  try { vm.runInContext(fs.readFileSync(file, "utf8"), ctx); } catch (e) { return cap; }
  return cap;
}
function dataFiles(dir, html) {
  var out = [], re = /<script src="(data\/[^"]+\.js)"/g, m;
  while ((m = re.exec(html))) out.push(path.join(dir, m[1]));
  return out;
}
function gates(js) {
  var out = {}, re = /sthGate\(\{\s*gate:\s*"([^"]+)"[\s\S]*?question:\s*"((?:[^"\\]|\\.)*)"/g, m;
  while ((m = re.exec(js))) out[m[1]] = strip(m[2].replace(/\\"/g, '"'));
  return out;
}
var LV = { 1: "기본", 2: "발전", 3: "심화" };
var STD = {};                                              /* 코드 → { text, subj, units: [{unit, tab, title}], q: n } */

function unitLesson(u) {
  var dir = path.join(ROOT, u), html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  var ep = fs.existsSync(path.join(dir, "episodes.js")) ? fs.readFileSync(path.join(dir, "episodes.js"), "utf8") : "";
  var G = gates(ep);
  var title = strip((/<title>(.*?)<\/title>/.exec(html) || [])[1]).replace(/ — .*$/, "");
  var label = (/unitLabel: "\[([^\]]+)\]/.exec(ep) || [])[1] || u;
  var subj = label.replace(/\s+[ⅠⅡⅢⅣⅤ].*$/, "");
  var panels = [], re = /<section class="tab-panel" data-panel="(\d+)"[^>]*>([\s\S]*?)(?=<section class="tab-panel"|<\/main>|<script)/g, m;
  while ((m = re.exec(html))) {
    var p = m[2], h2 = strip((/<h2 class="display">([\s\S]*?)<\/h2>/.exec(p) || [])[1]);
    var eb = strip((/<div class="eyebrow">([\s\S]*?)<\/div>/.exec(p) || [])[1]);
    var stds = [], sr = /<b>\[([^\]]+)\]<\/b>\s*([\s\S]*?)(?=<br>|<\/div>)/g, s;
    while ((s = sr.exec(p))) stds.push([s[1], strip(s[2])]);
    var terms = []; var tm = /<div class="terms">([\s\S]*?)<\/div>/.exec(p);
    if (tm) { var tr = /<b>([\s\S]*?)<\/b>/g, t; while ((t = tr.exec(tm[1]))) terms.push(strip(t[1])); }
    var gq = []; var gr = /class="gate[^"]*" id="([^"]+)"/g, g; while ((g = gr.exec(p))) if (G[g[1]]) gq.push(G[g[1]]);
    var ms = []; var mr = /<div class="mission"[^>]*>([\s\S]*?)<\/div>/g, mm;
    while ((mm = mr.exec(p))) { mm[1] = mm[1].replace(/<span class="m-tag">[^<]*<\/span>/g, ""); var lis = mm[1].match(/<li[^>]*>([\s\S]*?)<\/li>/g); if (lis) lis.forEach(function (l) { ms.push(strip(l)); }); else ms.push(strip(mm[1])); }
    var mis = []; var cr = /class="miscon[^"]*"><span class="tag">[^<]*<\/span><br><b>([\s\S]*?)<\/b>/g, c; while ((c = cr.exec(p))) mis.push(strip(c[1]));
    var scenes = (p.match(/<section class="scene"/g) || []).length;
    panels.push({ n: +m[1], eb: eb, h2: h2, stds: stds, terms: terms, gq: gq, ms: ms, mis: mis, scenes: scenes });
  }
  var stories = panels.filter(function (x) { return x.stds.length && x.scenes; });
  var quiz = load(path.join(dir, "quiz-items.js"), "sthQuiz"), lab = load(path.join(dir, "lab-cases.js"), "sthLab"), real = load(path.join(dir, "real-cases.js"), "sthLab", dataFiles(dir, html));
  var items = (quiz && quiz.items) || [];
  stories.forEach(function (st) {
    st.stds.forEach(function (c) {
      var S = STD[c[0]] || (STD[c[0]] = { text: c[1], subj: subj, units: [], q: 0 });
      S.units.push({ unit: u, label: label, tab: st.eb.replace(/ · .*$/, ""), title: st.h2 });
    });
  });
  items.forEach(function (it) { if (it.std && STD[it.std]) STD[it.std].q++; else if (it.std) (STD[it.std] = STD[it.std] || { text: "", subj: subj, units: [], q: 0 }).q++; });

  var L = [];
  L.push("# 지도안 — " + label + " " + title, "");
  L.push("> 이 파일은 `_tools/make_lessons.js` 가 페이지 내용에서 만든 것입니다. 페이지를 고치면 다시 만들어 주세요. 차시·시간은 예시이니 반 상황에 맞게 바꾸세요.", "");
  L.push("- 주소: https://wmfsljy-coder.github.io/" + u + "/  (교사 미리 보기: 끝에 `?open=1`)");
  L.push("- 구성: 이야기 " + stories.length + "편 · 수준별 문제 " + items.length + "문항 · 응용 실험실 " + ((lab && lab.cases.length) || 0) + "사례" + (real ? " · 실제 자료 " + real.cases.length + "사례" : ""));
  L.push("- 권장: 이야기 1편 = 1차시(50분). 수준별 문제·실험실은 각 차시 뒤쪽이나 마지막 차시에 나눠 씁니다.", "");
  L.push("## 성취기준", "");
  var seen = {};
  stories.forEach(function (st) { st.stds.forEach(function (c) { if (seen[c[0]]) return; seen[c[0]] = 1; L.push("- **[" + c[0] + "]** " + c[1]); }); });
  L.push("");
  stories.forEach(function (st, i) {
    L.push("## " + (i + 1) + "차시 — " + st.h2 + " (" + st.eb.replace(/ · 이야기.*$/, "") + ")", "");
    if (st.terms.length) L.push("- 핵심 용어: " + st.terms.join(", "));
    L.push("- 장면 " + st.scenes + "개", "");
    L.push("| 단계 | 시간 | 학생 활동 | 교사 |", "| --- | --- | --- | --- |");
    L.push("| 도입 | 5분 | 첫 추리: " + (st.gq[0] ? st.gq[0].replace(/\|/g, "/") : "이야기 첫 장면의 질문") + " | 이유를 한 문장으로 말하게 하고, 답은 주지 않습니다. |");
    L.push("| 개인 탐구 | 15분 | " + (st.ms.slice(0, 4).map(function (x) { return x.replace(/\|/g, "/"); }).join(" → ") || "장면 미션 풀기") + " | 돌아다니며 질문만 합니다. |");
    L.push("| 올리기 | 1분 | 우리 반 탭에서 별명으로 한 번 올리기 | 반별 활동 → 모둠 편성(첫 추리가 다른 학생끼리). |");
    L.push("| 모둠 | 20분 | 남은 미션" + (st.ms.length > 4 ? "(" + st.ms.slice(4).map(function (x) { return x.replace(/\|/g, "/"); }).join(" → ") + ")" : "") + ", 처음 생각이 바뀐 까닭 나누기 | ‘먼저 가 볼 학생’부터 갑니다. |");
    L.push("| 전체 공유 | 4분 | 모둠마다 생각이 바뀐 까닭 한 가지 | 결말 장면의 개념으로 정리합니다. |");
    L.push("| 개인 정리 | 5분 | 정리하기 탭에 나만의 말로 쓰고 다시 올리기 | 수업 효과 표로 첫 추리 → 첫 시도 정답률을 봅니다. |", "");
    if (st.mis.length) L.push("- 짚어 줄 오개념: " + st.mis.join(" / "));
    if (st.gq.length > 1) L.push("- 이야기 안의 다른 추리 질문: " + st.gq.slice(1).join(" / "));
    L.push("");
  });
  L.push("## 평가", "");
  [1, 2, 3].forEach(function (lv) {
    var g = items.filter(function (x) { return x.lv === lv; });
    if (!g.length) return;
    var kinds = {}; g.forEach(function (x) { kinds[x.t] = (kinds[x.t] || 0) + 1; });
    L.push("- **" + LV[lv] + "** " + g.length + "문항 (" + Object.keys(kinds).map(function (k) { return ({ ox: "OX", mc: "선택", blank: "빈칸", num: "계산", bogi: "보기", match: "짝짓기", order: "순서", essay: "서술" }[k] || k) + " " + kinds[k]; }).join(", ") + ")");
  });
  var ess = items.filter(function (x) { return x.t === "essay"; });
  if (ess.length) { L.push("", "서술형(수행평가로 바로 쓸 수 있음):", ""); ess.forEach(function (x) { L.push("- " + strip(x.q) + (x.rubric ? "  \n  채점 기준: " + x.rubric.map(strip).join(" · ") : "")); }); }
  L.push("");
  if (lab && lab.cases.length) { L.push("## 응용 실험실 (처음 보는 상황에 적용)", ""); lab.cases.forEach(function (c) { L.push("- " + c.title + " — " + strip(c.task)); }); L.push(""); }
  if (real && real.cases.length) { L.push("## 실제 자료 (기관 관측값)", ""); real.cases.forEach(function (c) { L.push("- " + c.title + " — " + strip(c.task)); }); L.push(""); }
  L.push("## 학생 정보", "", "우리 반 공유를 켠 경우 별명·결과 요약·첫 추리·진행 기록만 선생님 시트에 갑니다. 자세한 것은 [GUIDE.md](https://github.com/wmfsljy-coder/science-teacher-hub/blob/main/GUIDE.md) 5.", "");
  var lp = path.join(dir, "LESSON.md"), next = L.join("\n");
  if (CHECK) { var cur = fs.existsSync(lp) ? fs.readFileSync(lp, "utf8").replace(/\r\n/g, "\n") : ""; if (cur !== next) { STALE.push(u); } }
  else fs.writeFileSync(lp, next, "utf8");
  return { u: u, label: label, title: title, stories: stories.length, q: items.length };
}

var done = UNITS.map(unitLesson);
/* 성취기준 대응표 */
var bySubj = {};
Object.keys(STD).sort().forEach(function (k) { var S = STD[k]; (bySubj[S.subj] = bySubj[S.subj] || []).push([k, S]); });
var O = ["# 성취기준 대응표", "", "> `_tools/make_lessons.js` 가 페이지에서 만든 표입니다. 성취기준마다 그것을 다루는 단원·이야기와 수준별 문항 수를 보여 줍니다. 단원별 수업 흐름은 각 단원 폴더의 `LESSON.md`(지도안)에 있습니다.", ""];
Object.keys(bySubj).forEach(function (sj) {
  O.push("## " + sj, "", "| 성취기준 | 내용 | 다루는 이야기 | 문항 |", "| --- | --- | --- | --- |");
  bySubj[sj].forEach(function (r) {
    var k = r[0], S = r[1];
    var where = S.units.map(function (x) { return "[" + x.label + " " + x.tab + " " + x.title + "](https://wmfsljy-coder.github.io/" + x.unit + "/)"; });
    O.push("| " + k + " | " + (S.text || "").replace(/\|/g, "/") + " | " + (where.join("<br>") || "–") + " | " + S.q + " |");
  });
  O.push("");
});
O.push("## 단원별 지도안", "");
done.forEach(function (d) { O.push("- [" + d.label + " " + d.title + "](https://github.com/wmfsljy-coder/" + d.u.split("/")[0] + "/blob/main/" + d.u.split("/")[1] + "/LESSON.md) — 이야기 " + d.stories + "편, 문항 " + d.q); });
if (!CHECK) fs.writeFileSync(path.join(ROOT, "science-teacher-hub", "STANDARDS.md"), O.join("\n") + "\n", "utf8");
if (CHECK) { console.log(STALE.length ? "페이지와 어긋난 LESSON.md " + STALE.length + "곳: " + STALE.join(", ") : "LESSON.md 44곳 모두 페이지와 같음"); if (STALE.length) process.exitCode = 1; }
console.log("지도안", done.length, "· 성취기준", Object.keys(STD).length, "· 이야기 없는 단원", done.filter(function (d) { return !d.stories; }).map(function (d) { return d.u; }).join(" "));
var orphan = Object.keys(STD).filter(function (k) { return !STD[k].units.length; });
console.log("문항에만 있는 성취기준", orphan.join(" ") || "없음");
