/* 칠판 강의 화면 ↔ 개념정리 학습지 빈칸 맞추기 검사
     node _tools/boardcheck.js            (허브 폴더 아래 모든 <저장소>/<단원>/board-0N.html)
   확인하는 것
     1. board-0N.html 마다 같은 번호의 sheet-0N.html 이 있다.
     2. 두 파일의 빈칸(class="blank" data-n="번호")이 번호·답 모두 같다.
     3. 번호가 1부터 빠짐없이 이어진다.
     4. 칠판 화면에서 번호가 열리는 순서(장면 순서 → 단계 순서)가 1, 2, 3 … 순서다.
   문제가 없으면 「문제 없음」을 찍는다. */
const fs = require("fs"), path = require("path");
let ROOT = path.resolve(__dirname, "..");
while (!fs.existsSync(path.join(ROOT, "integrated-science-2")) && path.dirname(ROOT) !== ROOT) ROOT = path.dirname(ROOT);   /* 허브 _tools 에서 돌려도 과목 저장소들이 모인 폴더를 찾는다 */
const files = [];
for (const r of fs.readdirSync(ROOT)) {
  const rp = path.join(ROOT, r); if (!fs.statSync(rp).isDirectory() || r.startsWith(".") || r === "_tools") continue;
  for (const u of fs.readdirSync(rp)) {
    const up = path.join(rp, u); if (!fs.statSync(up).isDirectory()) continue;
    for (const f of fs.readdirSync(up)) if (/^board-\d+\.html$/.test(f)) files.push(path.join(up, f));
  }
}
const strip = s => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
function blanks(html) {
  const out = [], re = /<b class="blank"([^>]*)>([\s\S]*?)<\/b>/g; let m;
  while ((m = re.exec(html))) {
    const n = (m[1].match(/data-n="(\d+)"/) || [])[1]; if (!n) continue;
    const st = +((m[1].match(/data-step="(\d+)"/) || [])[1] || 0);
    out.push({ n: +n, a: strip(m[2]), st, at: m.index });
  }
  return out;
}
let bad = 0;
function fail(f, msg) { bad++; console.log("✗", path.relative(ROOT, f), "—", msg); }
for (const f of files) {
  const html = fs.readFileSync(f, "utf8"), sf = f.replace(/board-(\d+)\.html$/, "sheet-$1.html");
  const B = blanks(html);
  if (!B.length) { fail(f, "빈칸이 없습니다"); continue; }
  /* 장면 경계 → 장면 번호 */
  const starts = []; const sre = /<section class="slide/g; let m; while ((m = sre.exec(html))) starts.push(m.index);
  B.forEach(b => { b.slide = starts.filter(s => s < b.at).length; });
  const order = B.slice().sort((x, y) => x.slide - y.slide || x.st - y.st || x.at - y.at).map(b => b.n);
  order.forEach((n, i) => { if (n !== i + 1) fail(f, "열리는 순서가 " + (i + 1) + "번째에 " + n + "번입니다"); });
  const seen = {}; B.forEach(b => { if (seen[b.n]) fail(f, b.n + "번 빈칸이 두 번 있습니다"); seen[b.n] = b.a; });
  if (!fs.existsSync(sf)) { fail(f, path.basename(sf) + " 학습지가 없습니다"); continue; }
  const S = blanks(fs.readFileSync(sf, "utf8")), ss = {};
  S.forEach(b => { if (ss[b.n]) fail(sf, b.n + "번 빈칸이 두 번 있습니다"); ss[b.n] = b.a; });
  const all = new Set(Object.keys(seen).concat(Object.keys(ss)));
  all.forEach(n => {
    if (!(n in seen)) fail(f, n + "번이 학습지에만 있습니다");
    else if (!(n in ss)) fail(sf, n + "번이 칠판 화면에만 있습니다");
    else if (seen[n] !== ss[n]) fail(f, n + "번 답이 다릅니다: 칠판 「" + seen[n] + "」 / 학습지 「" + ss[n] + "」");
  });
  console.log("·", path.relative(ROOT, f), "빈칸", B.length + "개", "학습지", S.length + "개");
}
console.log(bad ? "문제 " + bad + "건" : "문제 없음");
process.exit(bad ? 1 : 0);
