/* 각 단원의 내 생각 점검 문장(precheck-items.js)을 모아 두 곳에 쓴다. 문장을 고치거나 단원에 새로 넣으면 다시 돌린다.
     node _tools/make_precheck_gs.js
   - share-backend/precheck.gs   : 시트 메뉴 ‘생각 점검 표’가 문장을, ‘과목별 보기’가 단원 목록(UNIT_LIST)을 읽는다(고친 뒤 clasp push / 새 버전 배포).
   - assets/precheck-all.js      : 선생님 화면(class/)이 문장을 보여 줄 때 쓴다. */
"use strict";
var fs = require("fs"), path = require("path"), vm = require("vm");
var ROOT = path.join(__dirname, "..", "..");
var UNITS = fs.readFileSync(path.join(__dirname, "ALL_UNITS.txt"), "utf8").split(/\r?\n/).filter(Boolean);
var all = {}, n = 0, list = [];
/* 과목·단원 이름은 바로가기 목록(links.gs)에서 — 시트의 과목별 보기가 단원 순서와 이름을 여기서 읽는다 */
var LK = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "share-backend", "links.gs"), "utf8").replace(/^var /mg, "this."), LK);
var byUrl = {}; LK.LINKS.forEach(function (r) { if (r[0] === "단원") byUrl[r[4].replace(/^https:\/\/[^/]+\//, "").replace(/\/$/, "")] = r; });
UNITS.forEach(function (u) {
  var dir = path.join(ROOT, u), f = path.join(dir, "precheck-items.js");
  if (!fs.existsSync(f)) return;
  var id = (/sthUnit\("([^"]+)"\)/.exec(fs.readFileSync(path.join(dir, "episodes.js"), "utf8")) || [])[1];
  if (!id) { console.error("단원 코드를 찾지 못함:", u); return; }
  var lr = byUrl[u]; if (!lr) console.error("바로가기에 없는 단원:", u);
  var eps = (fs.readFileSync(path.join(dir, "index.html"), "utf8").match(/class="episode[\s"]/g) || []).length;
  list.push([id, lr ? lr[2] : u.split("/")[0], lr ? lr[3] : u, lr ? lr[1] : "", eps, u]);
  var got = null;
  vm.runInNewContext(fs.readFileSync(f, "utf8"), { window: { sthPrecheck: function (o) { got = o; } } });
  if (!got) { console.error("문장을 읽지 못함:", u); return; }
  all[id] = {};
  got.items.forEach(function (it) { all[id][it.id] = { sec: it.sec, a: !!it.a, s: it.s }; n++; });
});
var json = JSON.stringify(all, null, 1);
fs.writeFileSync(path.join(__dirname, "..", "share-backend", "precheck.gs"),
  "/** 내 생각 점검 문장 — _tools/make_precheck_gs.js 가 만든 파일. 고치지 말고 다시 만든다. */\nvar PC_ITEMS = " + json + ";\n" +
  "/** 단원 목록 [단원 코드, 과목, 단원 이름, 학년, 이야기 수, 주소 경로] — 시트의 과목별 보기가 단원 순서·이름을 여기서 읽는다. */\nvar UNIT_LIST = " +
  JSON.stringify(list).replace(/\],\[/g, "],\n [") + ";\n", "utf8");
fs.writeFileSync(path.join(__dirname, "..", "assets", "precheck-all.js"),
  "/* 내 생각 점검 문장 — _tools/make_precheck_gs.js 가 만든 파일. 고치지 말고 다시 만든다. */\nwindow.STH_PC_ITEMS = " + json + ";\n" +
  "/* 단원 목록 [단원 코드, 과목, 단원 이름, 학년, 이야기 수, 주소 경로] — 선생님 화면의 과목별 보기가 쓴다. */\nwindow.STH_UNITS = " +
  JSON.stringify(list).replace(/\],\[/g, "],\n [") + ";\n", "utf8");
console.log("단원", Object.keys(all).length, "문장", n);
