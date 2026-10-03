/* 시트 '바로가기' 탭에 넣을 링크 목록(share-backend/links.gs)을 만든다. 단원·과목이 바뀌면 다시 돌리고 clasp push.
     node _tools/make_links_gs.js */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, ".."), BASE = "https://wmfsljy-coder.github.io/";
function title(p) { var h = fs.readFileSync(path.join(ROOT, p, "index.html"), "utf8"); return ((/<title>([^<]*)/.exec(h) || [])[1] || p).replace(/ — .*$/, "").replace(/^[ⅠⅡⅢⅣ]\.\s*/, ""); }
/* [학년, 과목 허브 저장소(없으면 null), 과목 저장소들] */
var SUBJ = [
  ["1학년", "integrated-science", ["integrated-science-1", "integrated-science-2"]],
  ["1학년", "science-inquiry", ["science-inquiry-1", "science-inquiry-2"]],
  ["2학년", null, ["earth-science-2"]],
  ["2학년", "earth-system", ["earth-system-1", "earth-system-2"]],
  ["2학년", "planet-space", ["planet-space-1", "planet-space-2"]],
  ["2학년", null, ["climate-change-ecology"]],
  ["2학년", null, ["convergence-science-inquiry"]],
  ["2학년", null, ["science-history-culture"]]
];
var UNITS = fs.readFileSync(path.join(__dirname, "ALL_UNITS.txt"), "utf8").split(/\r?\n/).filter(Boolean);
var rows = [["교사", "", "교사용 허브(전 과목)", "", BASE + "science-teacher-hub/"], ["교사", "", "반별 활동 · 수업 효과 · 모둠 편성", "", BASE + "science-teacher-hub/class/"]];
SUBJ.forEach(function (s) {
  if (s[1]) rows.push(["과목", s[0], title(s[1]), "(과목 첫 화면)", BASE + s[1] + "/"]);
  s[2].forEach(function (r) {
    rows.push(["과목", s[0], title(r), "(단원 목록)", BASE + r + "/"]);
    UNITS.filter(function (u) { return u.split("/")[0] === r; }).forEach(function (u) { rows.push(["단원", s[0], title(r), u.split("/")[1] + " " + title(u), BASE + u + "/"]); });
  });
});
var out = "/** '바로가기' 탭 — _tools/make_links_gs.js 가 만든 파일. 고치지 말고 다시 만든다. */\n"
  + "var LINKS_VER = '" + new Date().toISOString().slice(0, 10) + "-" + rows.length + "';\n"
  + "var LINKS = " + JSON.stringify(rows, null, 0).replace(/\],\[/g, "],\n  [") + ";\n";
fs.writeFileSync(path.join(ROOT, "science-teacher-hub", "share-backend", "links.gs"), out, "utf8");
console.log("링크", rows.length);
