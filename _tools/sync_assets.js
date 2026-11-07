/* 공용 부품 맞추기 — planet-space-2/assets 를 기준 사본(정본)으로 모든 과목 저장소에 복사하고,
   이야기 단원 index.html 에 scope.js·kit.js 를 theme.js 바로 다음에 붙인다.
     node _tools/sync_assets.js            (실제로 바꿈)
     node _tools/sync_assets.js --dry      (무엇을 바꿀지만 보여 줌)

   무엇을 복사하나 (2026-11-08부터: 예전에는 6개만 맞춰서 저장소마다 엔진이 어긋났다)
     · 정본 폴더의 모든 공용 파일(.js .css) — 저장소마다 내용이 다른 파일만 뺀다(PER_REPO).
     · 일부 과목만 쓰는 부품(OPTIONAL)은 그 파일이 이미 있는 저장소에만, 지정한 정본에서 복사한다.
     · 줄바꿈은 LF 로 통일해서 쓴다. 비교도 줄바꿈을 무시하고 하므로, Windows 에서 CRLF 로 풀려도 다시 쓰지 않는다.
   허브(science-teacher-hub/assets)에는 허브 화면이 쓰는 HUB 목록만 맞춘다.
   절대 건드리지 않는 것: share-config.js(반 목록·공유 주소, 저장소마다 다름), people-data.js(과목별 인물),
   share.css(옛 단원용, 일부 과목만 — 각자 관리). */
const fs = require("fs"), path = require("path");
let ROOT = __dirname;   /* 위로 올라가며 과목 저장소들이 모인 폴더를 찾는다(허브 _tools 에서도, 상위 _tools 에서도 돈다) */
while (!fs.existsSync(path.join(ROOT, "planet-space-2", "assets")) && path.dirname(ROOT) !== ROOT) ROOT = path.dirname(ROOT);
const SRC_REPO = "planet-space-2";
const SRC = path.join(ROOT, SRC_REPO, "assets");
const PER_REPO = new Set(["share-config.js", "people-data.js", "share.css"]);
const OPTIONAL = { "life-kit.js": "integrated-science-2", "climate-life.js": "integrated-science-2" };
const HUB = ["theme.js", "theme.css", "account.js", "qrcode.js"];
const DRY = process.argv.includes("--dry");
const SKIP = new Set(["science-teacher-hub", "science-hub-next", "earth-system", "integrated-science", "planet-space", "science-inquiry", "_base_ps2"]);
const repos = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, ".git")) && fs.existsSync(path.join(ROOT, d, "assets")) && !SKIP.has(d));
const FILES = fs.readdirSync(SRC).filter(f => /\.(js|css)$/.test(f) && !PER_REPO.has(f) && !OPTIONAL[f]);
const lf = b => b.toString("utf8").replace(/\r\n/g, "\n");
let changed = 0;
function copy(src, dst) {
  const a = lf(fs.readFileSync(src));
  if (fs.existsSync(dst) && lf(fs.readFileSync(dst)) === a && !fs.readFileSync(dst, "utf8").includes("\r\n")) return;
  changed++; console.log("복사", path.relative(ROOT, dst));
  if (!DRY) fs.writeFileSync(dst, a);
}
/* 정본 자신도 LF 로 */
for (const f of FILES) { const p = path.join(SRC, f); const b = fs.readFileSync(p, "utf8"); if (b.includes("\r\n")) { changed++; console.log("줄바꿈 LF", path.relative(ROOT, p)); if (!DRY) fs.writeFileSync(p, b.replace(/\r\n/g, "\n")); } }
for (const r of repos) {
  if (r !== SRC_REPO) for (const f of FILES) copy(path.join(SRC, f), path.join(ROOT, r, "assets", f));
  for (const f of Object.keys(OPTIONAL)) {
    const dst = path.join(ROOT, r, "assets", f), src = path.join(ROOT, OPTIONAL[f], "assets", f);
    if (fs.existsSync(dst) && fs.existsSync(src)) copy(src, dst);
  }
}
for (const f of HUB) copy(path.join(SRC, f), path.join(ROOT, "science-teacher-hub", "assets", f));
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
/* 캐시 버스팅: 단원 index.html(과 과목 첫 화면)의 엔진 주소 끝에 ?v=<내용 해시 8자리> 를 붙인다.
   엔진이 바뀌면 주소가 바뀌어 학생 기기의 옛 사본이 바로 새로 받아진다(해시는 줄바꿈을 LF 로 맞춘 내용으로). */
const crypto = require("crypto");
const verCache = {};
function ver(file) {
  if (!(file in verCache)) verCache[file] = fs.existsSync(file) ? crypto.createHash("md5").update(lf(fs.readFileSync(file))).digest("hex").slice(0, 8) : null;
  return verCache[file];
}
function stamp(htmlFile, assetsDir, prefix) {
  const raw = fs.readFileSync(htmlFile, "utf8");
  const esc = prefix.replace(/[.\/]/g, "\\$&");
  const re = new RegExp('(<(?:script|link)\\b[^>]*?\\b(?:src|href)=")' + esc + '([\\w.-]+\\.(?:js|css))(?:\\?v=[0-9a-f]*)?"', "g");
  const out = raw.replace(re, (all, pre, name) => { const v = ver(path.join(assetsDir, name)); return v ? pre + prefix + name + "?v=" + v + '"' : all; });
  if (out !== raw) { changed++; console.log("주소 ?v=", path.relative(ROOT, htmlFile)); if (!DRY) fs.writeFileSync(htmlFile, out); }
}
for (const r of repos) {
  const ad = path.join(ROOT, r, "assets");
  for (const u of fs.readdirSync(path.join(ROOT, r))) {
    const f = path.join(ROOT, r, u, "index.html");
    if (fs.existsSync(f)) stamp(f, ad, "../assets/");
  }
  const top = path.join(ROOT, r, "index.html");
  if (fs.existsSync(top)) stamp(top, ad, "assets/");
}
console.log(DRY ? "(미리보기) " : "", "바뀐 곳", changed, "· 공용 파일", FILES.length + "개:", FILES.join(" "));
