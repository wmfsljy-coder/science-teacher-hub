/* 공용 부품 맞추기 — planet-space-2/assets 를 기준 사본으로 모든 과목 저장소에 복사하고,
   이야기 단원 index.html 에 scope.js·kit.js 를 theme.js 바로 다음에 붙인다.
     node _tools/sync_assets.js            (실제로 바꿈)
     node _tools/sync_assets.js --dry      (무엇을 바꿀지만 보여 줌)
   허브(science-teacher-hub)에는 theme.js·theme.css 만 맞춘다. */
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "planet-space-2", "assets");
const FILES = ["theme.js", "theme.css", "story.css", "kit.js", "scope.js"];
const DRY = process.argv.includes("--dry");
const SKIP = new Set(["science-teacher-hub", "earth-system", "integrated-science", "planet-space", "science-inquiry", "_base_ps2"]);
const repos = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, ".git")) && !SKIP.has(d));
let changed = 0;
function copy(src, dst) {
  const a = fs.readFileSync(src);
  if (fs.existsSync(dst) && Buffer.compare(a, fs.readFileSync(dst)) === 0) return;
  changed++; console.log("복사", path.relative(ROOT, dst));
  if (!DRY) fs.writeFileSync(dst, a);
}
for (const r of repos) {
  if (r === "planet-space-2") continue;
  for (const f of FILES) copy(path.join(SRC, f), path.join(ROOT, r, "assets", f));
}
for (const f of ["theme.js", "theme.css"]) copy(path.join(SRC, f), path.join(ROOT, "science-teacher-hub", "assets", f));
const TAG = '<script src="../assets/scope.js"></script>\n<script src="../assets/kit.js"></script>';
for (const r of repos) {
  for (const u of fs.readdirSync(path.join(ROOT, r))) {
    const f = path.join(ROOT, r, u, "index.html");
    if (!fs.existsSync(f) || !fs.existsSync(path.join(ROOT, r, u, "episodes.js"))) continue;
    let h = fs.readFileSync(f, "utf8");
    if (h.includes("../assets/scope.js")) continue;
    const m = h.match(/<script src="\.\.\/assets\/theme\.js"><\/script>(\r?\n)/);
    if (!m) { console.log("!! theme.js 태그 없음", r + "/" + u); continue; }
    h = h.replace(m[0], m[0] + TAG.replace(/\n/g, m[1]) + m[1]);
    changed++; console.log("연결", r + "/" + u);
    if (!DRY) fs.writeFileSync(f, h);
  }
}
console.log(DRY ? "(미리보기) " : "", "바뀐 곳", changed);
