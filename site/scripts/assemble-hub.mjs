#!/usr/bin/env node
/*
 * 허브 결과물 조립 — `npm run build` 다음에 실행합니다.
 *
 * out/ (새 허브: 첫 화면·과목·지도안/QR·자료실·QR 모음·판 구조 지도) 에 science-teacher-hub 저장소의 기존 파일을
 * **그대로** 더합니다. 단원 페이지들이 /science-teacher-hub-qtrqwc/assets/(review-*.js·account.js·unit-items-all.js·precheck-all.js …)를
 * 절대 주소로 부르고, 교사 화면 class/·records/, data/*.tsv(시트가 IMPORTDATA 로 읽음), maps/plates.kml, phet/ 도 같은 주소에서 열려야 하기 때문입니다.
 *
 *   새 화면으로 바뀌는 파일(같은 주소): index.html(첫 화면), qr/index.html(QR 모음), resources/index.html(자료실)
 *   빼는 것(예전 Pages 에서도 안 보였거나 공개할 필요 없음): site/, .github/, _tools/(Jekyll 이 숨기던 것), share-backend/, .gitignore
 *
 * 끝나면 기존 파일 목록과 out/ 을 하나씩 비교해(같은 바이트) 빠진 것이 있으면 실패합니다.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HUB = path.resolve(ROOT, process.env.HUB_DIR || "..");
const OUT = path.join(ROOT, "out");
const REPLACED = new Set(["index.html", "qr/index.html", "resources/index.html"]);
const EXCLUDE = (f) => /^(site|\.github|_tools|share-backend)\//.test(f) || f.startsWith("_tools") || f === ".gitignore";

if (!fs.existsSync(path.join(OUT, "index.html"))) {
  console.error("out/ 이 없습니다. 먼저 npm run build");
  process.exit(1);
}

const all = execFileSync("git", ["-C", HUB, "ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const files = all.filter((f) => !EXCLUDE(f));
const errors = [];
let copied = 0;
for (const f of files) {
  if (REPLACED.has(f)) {
    if (!fs.existsSync(path.join(OUT, f))) errors.push(`새 화면이 없습니다: ${f}`);
    continue;
  }
  const dest = path.join(OUT, f);
  if (fs.existsSync(dest)) {
    errors.push(`새 허브 결과물과 겹치는 파일: ${f}`);
    continue;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(HUB, f), dest);
  copied++;
}

/* 목록 비교: 기존 파일이 모두 같은 바이트로 들어 있는지 */
let same = 0;
for (const f of files) {
  if (REPLACED.has(f)) continue;
  const a = path.join(HUB, f);
  const b = path.join(OUT, f);
  if (!fs.existsSync(b)) errors.push(`빠짐: ${f}`);
  else if (!fs.readFileSync(a).equals(fs.readFileSync(b))) errors.push(`내용 다름: ${f}`);
  else same++;
}
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

const skipped = all.filter(EXCLUDE);
console.log(`조립: 기존 허브 파일 ${files.length}개 중 ${copied}개 복사·${same}개 같은 바이트 확인, ${REPLACED.size}개는 새 화면(${[...REPLACED].join(", ")}), 뺀 것 ${skipped.length}개(site·.github·_tools·share-backend·.gitignore)`);
if (errors.length) {
  for (const e of errors) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("  ✓ 기존 허브 주소의 파일이 모두 들어 있음");
