// 과학허브 단원별·소단원별 활동 목록을 지금 코드에서 뽑아 TSV 로 쓴다 → 시트가 IMPORTDATA 로 읽는다.
//   node build.js <과목 저장소들이 들어 있는 폴더> <출력 폴더>
//   GitHub Actions(.github/workflows/activities.yml)가 20분마다 12과목 저장소를 받아 돌리고, 바뀐 것이 있을 때만 커밋한다.
//   출력: activities.tsv(소단원별 목록) · activity-summary.tsv(단원 요약) · activities-meta.tsv(만든 때)
const fs = require("fs"), vm = require("vm"), path = require("path");
const ROOT = path.resolve(process.argv[2] || "..") + "/", OUT = path.resolve(process.argv[3] || "data");
const SUBJ = { "integrated-science-1": "통합과학1", "integrated-science-2": "통합과학2", "earth-science-2": "지구과학", "earth-system-1": "지구시스템과학1", "earth-system-2": "지구시스템과학2", "planet-space-1": "행성우주과학1", "planet-space-2": "행성우주과학2", "climate-change-ecology": "기후변화와 환경생태", "convergence-science-inquiry": "융합과학 탐구", "science-history-culture": "과학의 역사와 문화", "science-inquiry-1": "과학탐구실험1", "science-inquiry-2": "과학탐구실험2" };
const NONSTORY = /들어가기|수준별 문제|응용 실험실|정리하기|우리 반/;
const strip = h => String(h || "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
const tight = h => String(h || "").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();   /* 브라우저 textContent 처럼 태그만 뺀다 */
const VK = { sky: "🔭 하늘 사진(알라딘)", star: "🔭 오늘 밤 하늘(스텔라리움)", eyes: "🪐 NASA Eyes 3D", exo: "🪐 외계 행성 3D", earth: "🌐 지금의 지구", mymap: "🗺 구글 내 지도", mol: "🧬 분자 구조 3D", phet: "🧪 본문 속 PhET", owid: "📈 실제 자료 그래프", ptable: "⚗️ 주기율표", commons: "📜 원본 자료 사진", hubble: "🔭 허블 사진", model: "🦴 박물관 3D 표본", web: "🔗 바깥 자료(쪽 안)", out: "🔗 바깥 자료(새 창)", sun: "☀️ 오늘의 태양" };
const SK = { scale: "📏 일상 크기 비교", myth: "💡 흔한 오해", ask: "❓ 궁금증" };
const PLATE = "15PN10J5cnnwi0bF_vb08MdVo26GHfA0";
function bg(s) { s = String(s || "").replace(/[^가-힣A-Za-z0-9]/g, ""); const m = {}; for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m[k] = (m[k] || 0) + 1; } return m; }
function best(text, secs) {
  const q = bg(text); const sc = secs.map(b => { let s = 0, n = 0; for (const k in q) { n += q[k]; if (b.bg[k]) s += Math.min(q[k], b.bg[k]) * (1 + Math.log(1 + b.bg[k])); } return { b, s: s / Math.max(1, n) }; }).sort((x, y) => y.s - x.s);
  if (!sc.length) return null; const m = sc[0].s - (sc[1] ? sc[1].s : 0);
  return { b: sc[0].b, conf: m >= 0.25 ? "높음" : (m >= 0.1 ? "보통" : "낮음") };
}
function loadCases(u, file) {
  const f = ROOT + u + "/" + file; if (!fs.existsSync(f)) return [];
  const html = fs.readFileSync(ROOT + u + "/index.html", "utf8");
  const ctx = { window: {}, document: { getElementById: () => null }, console }; ctx.window.window = ctx.window; vm.createContext(ctx);
  for (const m of html.matchAll(/<script src="(data\/[^"]+)"><\/script>/g)) { try { vm.runInContext(fs.readFileSync(ROOT + u + "/" + m[1], "utf8"), ctx); } catch (e) {} }
  let got = null; ctx.window.sthLab = o => got = o;
  try { vm.runInContext(fs.readFileSync(f, "utf8"), ctx); } catch (e) { console.error("읽기 실패", u, file, e.message); }
  return (got && got.cases) || [];
}
function load(u, file, fn) { const f = ROOT + u + "/" + file; if (!fs.existsSync(f)) return null; let g = null; const w = {}; w[fn] = x => g = x; try { vm.runInNewContext(fs.readFileSync(f, "utf8"), { window: w }); } catch (e) { console.error("읽기 실패", u, file, e.message); } return g; }
function placeDesc(v) { const a = v.split(","); const k = a[3] || "s"; return (k[0] === "r" ? "지도" : "위성") + " · " + (+a[0]).toFixed(2) + ", " + (+a[1]).toFixed(2) + " · 줌 " + (a[2] || 12); }
const clean = x => String(x == null ? "" : x).replace(/[\t\r\n]+/g, " ").trim();

// 단원: 과목 저장소 안의 "1-2", "3" 같은 폴더 가운데 index.html 이 있는 것
const UNITS = [];
for (const repo of Object.keys(SUBJ)) {
  if (!fs.existsSync(ROOT + repo)) { console.error("저장소 없음", repo); continue; }
  fs.readdirSync(ROOT + repo).filter(d => /^\d+(-\d+)?$/.test(d) && fs.existsSync(ROOT + repo + "/" + d + "/index.html"))
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true })).forEach(d => UNITS.push(repo + "/" + d));
}

const rows = [["과목", "단원", "소단원", "종류", "제목", "자리", "자세히", "비고"]];
const sum = [["과목", "단원", "소단원 수", "📘 교과서 실험", "📊 실제 자료", "🔗·🛰 진짜 자료 링크", "선택 활동", "🧪 PhET 더 해 보기", "📍 진해 상자", "📍 지도 단추", "🗺·🔭 등 바로 보기", "📇·📐 카드", "📝 수준별 문제(문항)", "🔧 응용 실험실", "📏·💡·❓ 상자", "목록 줄 수"]];
for (const u of UNITS) {
  const repo = u.split("/")[0], subj = SUBJ[repo], html = fs.readFileSync(ROOT + u + "/index.html", "utf8");
  const uname = ((/<title>([^<]*)<\/title>/.exec(html) || [])[1] || "").split(/\s+[—–-]\s+/)[0].replace(/^[ⅠⅡⅢⅣ]+\.\s*/, "");
  const unit = u.split("/").slice(1).join("/") + " " + uname;
  const tabs = [...html.matchAll(/<button class="tab-btn[^"]*" data-tab="([^"]+)"[^>]*>(?:<span class="num">([^<]*)<\/span>\s*)?([^<]+)<\/button>/g)].map(m => ({ tab: m[1], num: (m[2] || "").trim(), name: m[3].trim() }));
  const starts = [...html.matchAll(/<section class="tab-panel"[^>]*data-panel="([^"]+)"/g)].map(m => ({ tab: m[1], i: m.index }));
  starts.forEach((s, k) => { s.j = k + 1 < starts.length ? starts[k + 1].i : html.length; const t = tabs.find(b => b.tab === s.tab) || { num: "", name: s.tab }; s.num = t.num; s.name = t.name; s.html = html.slice(s.i, s.j); s.text = tight(s.html); s.story = !NONSTORY.test(t.name); s.plate = /^<section class="tab-panel"[^>]*data-plate/.test(s.html); s.label = (t.num ? t.num + " " : "") + t.name + (s.story ? "" : " (탭)"); });
  const secs = starts.filter(s => s.story); secs.forEach(b => b.bg = bg(b.name + " " + b.name + " " + strip(b.html)));
  const bySec = n => secs.find(b => b.num === n);
  const panelAt = i => starts.find(s => i >= s.i && i < s.j);
  const R = [];
  const add = (sec, kind, title, where, detail, note, o) => R.push({ o: o != null ? o : (sec ? starts.indexOf(sec) : 99), r: [subj, unit, sec ? sec.label : "단원 전체", kind, title, where, detail || "", note || ""] });
  // 📘 교과서 실험
  const inq = (load(u, "inquiry-items.js", "sthInquiry") || {}).items || [];
  inq.forEach(it => add(bySec(it.sec), "📘 교과서 실험", it.title, "소단원 끝 카드", it.book + " " + it.page + "쪽 · " + (it.sim && it.sim.kind === "model" ? "🧮 가상 실험 " : "🧪 ") + ((it.sim && it.sim.name) || "")));
  // 📊 실제 자료 + 그 안의 진짜 자료 링크(링크는 build 함수 안 api.info 문자열에 있다 → 함수 소스까지 훑는다)
  let nLink = 0;
  loadCases(u, "real-cases.js").forEach(c => {
    const js = JSON.stringify(c) + " " + Object.keys(c).filter(k => typeof c[k] === "function").map(k => c[k].toString()).join(" "), sub = [];
    for (const m of js.matchAll(/data-(link|map)='(\{.*?\})'/g)) {
      let nm = null;
      try { const o = JSON.parse(m[2].replace(/\\\\"/g, '"').replace(/\\"/g, '"')); nm = m[1] === "map" ? o.name : o.title; }
      catch (e) { const t = /\\*"(title|name)\\*"\s*:\s*\\*"(.*?)\\*"/.exec(m[2]); nm = t ? t[2] : "?"; }
      sub.push((m[1] === "map" ? "🛰 " : "🔗 ") + nm);
    }
    nLink += sub.length;
    add(bySec(c.sec), "📊 실제 자료", strip(c.title), "소단원 끝 카드", [c.tag || ""].concat(sub).filter(Boolean).join(" · "), "보기는 누구나 · 답하기는 로그인");
  });
  // 선택 활동
  for (const m of html.matchAll(/<div class="sec-more" data-tag="([^"]*)" data-title="([^"]*)"/g)) add(panelAt(m.index), "🙋 선택 활동", m[2], "소단원 끝 카드", m[1]);
  // 🧪 PhET 더 해 보기
  (load(u, "try-items.js", "sthTry") || []).forEach(t => { const s = secs.find(b => t.near && (b.html.indexOf(t.near) >= 0 || b.text.indexOf(t.near) >= 0 || strip(b.html).indexOf(t.near) >= 0)); add(s, "🧪 PhET 더 해 보기", t.ko || t.sim || "", s ? "문단 아래 상자" : "(본문 글귀를 못 찾음)", (t.src ? (t.src.site || "") : "PhET " + t.sim) + (t.why ? " · " + t.why : "")); });
  // 📏·💡·❓ 상자
  let nScale = 0;
  (load(u, "scale-items.js", "sthScale") || []).forEach(t => { const s = secs.find(b => t.near && b.text.indexOf(t.near) >= 0); nScale++; add(s, SK[t.kind || "scale"], strip(t.title), s ? "문단 아래 상자" : "(본문 글귀를 못 찾음)", strip(t.text), t.calc ? "어림 계산: " + strip(t.calc) : ""); });
  // 📍 진해 상자
  starts.forEach(b => { for (const m of b.html.matchAll(/<div class="info-card jinhae"[^>]*>📍 <b>우리 동네 진해에서는 — ([^<]+)<\/b>/g)) add(b, "📍 진해 상자", m[1], "이야기 속 상자"); });
  // 이야기 속 바로 보기: index.html 은 자리로, episodes.js 는 미션 번호로 소단원을 찾는다
  const spans = [];
  for (const m of html.matchAll(/<span data-(place|view)=(["']?)([^"'>]+)\2[^>]*>([\s\S]*?)<\/span>/g)) spans.push({ s: panelAt(m.index), a: m[1], v: m[3], t: strip(m[4]), late: false });
  const ep = ROOT + u + "/episodes.js";
  if (fs.existsSync(ep)) { const s = fs.readFileSync(ep, "utf8");
    for (const m of s.matchAll(/<span data-(place|view)=(\\?["']?)([^"'\\>]+)\2[^>]*>([\s\S]*?)<\/span>/g)) {
      const mi = [...s.slice(0, m.index).matchAll(/sthMission\(\s*["'](m\d+)-/g)].pop(); let sec = null;
      if (mi) { const k = html.search(new RegExp('id="' + mi[1] + '-')); if (k >= 0) sec = panelAt(k); }
      spans.push({ s: sec, a: m[1], v: m[3], t: strip(m[4]), late: true });
    } }
  const seen = {};
  spans.forEach(x => {
    const key = (x.s ? x.s.tab : "") + "|" + x.a + "|" + x.v; if (seen[key]) { seen[key].n++; return; }
    let kind, detail = "", note = "";
    if (x.a === "place") { kind = "📍 지도 단추"; detail = placeDesc(x.v); if (x.s && x.s.plate) note = "판 경계 지도로 먼저 열림(🧭 지우기)"; }
    else { const k = x.v.split(":")[0], rest = x.v.slice(k.length + 1);
      if (k === "who" || k === "law") { kind = k === "who" ? "📇 인물 카드" : "📐 법칙 카드"; detail = rest; }
      else { kind = k === "mymap" && rest.indexOf(PLATE) === 0 ? "🗺 판 경계 지도" : (VK[k] || "🔎 " + k); detail = k === "mymap" ? (rest.split("|")[3] || "") : (rest.split("|").slice(1).join(" · ") || rest.split("|")[0]); if (k === "mymap" && rest.indexOf(PLATE) === 0) note = "🧭 판 경계 지우기 단추"; } }
    add(x.s, kind, x.t, x.late ? "미션 완료 뒤 글 속 단추" : "글 속 단추", detail, note);
    seen[key] = { n: 1, row: R[R.length - 1] };
  });
  Object.values(seen).forEach(o => { if (o.n > 1) o.row.r[7] = (o.row.r[7] ? o.row.r[7] + " · " : "") + o.n + "번 나옴"; });
  // 📝 수준별 문제(소단원별 수)
  const qz = (load(u, "quiz-items.js", "sthQuiz") || {}).items || [];
  secs.forEach(b => { const its = qz.filter(it => it.sec === b.num); if (!its.length) return; const lv = {}; its.forEach(it => lv[it.lv || it.level || "?"] = (lv[it.lv || it.level || "?"] || 0) + 1);
    add(b, "📝 수준별 문제", its.length + "문항", "수준별 문제 탭 + 소단원 확인 문제", Object.keys(lv).sort().map(k => ({ 1: "기본", 2: "발전", 3: "심화" }[k] || k) + " " + lv[k]).join(" · "), "푸는 것은 로그인"); });
  // 🔧 응용 실험실(탭 그대로 — 관련 소단원은 글자 겹침 추정)
  const labs = loadCases(u, "lab-cases.js");
  labs.forEach(c => { const t = strip([c.title, c.title, c.tag, c.say, c.task, c.why].join(" ")); const b = best(t, secs) || {}; R.push({ o: 90, r: [subj, unit, "응용 실험실 (탭)", "🔧 응용 실험실", strip(c.title), "응용 실험실 탭(로그인)", c.tag || "", b.b ? "관련 소단원 추정: " + b.b.label + " · 확신 " + b.conf : ""] }); });
  // 단원 전체 탭
  starts.filter(s => /정리하기|우리 반/.test(s.name)).forEach(s => R.push({ o: 95, r: [subj, unit, s.label, /정리/.test(s.name) ? "🧩 정리하기" : "👥 우리 반", s.name, "탭", /정리/.test(s.name) ? strip((/<div class="eyebrow">([^<]*)/.exec(s.html) || [])[1]) : "투표 · 익명 돌려 읽기 · 궁금한 것 게시판", ""] }));
  R.sort((a, b) => a.o - b.o);   // 안정 정렬: 같은 소단원 안에서는 넣은 순서
  R.forEach(x => rows.push(x.r.map(clean)));
  const c = k => R.filter(x => x.r[3] === k).length, cs = re => R.filter(x => re.test(x.r[3])).length;
  sum.push([subj, unit, secs.length, c("📘 교과서 실험"), c("📊 실제 자료"), nLink, c("🙋 선택 활동"), c("🧪 PhET 더 해 보기"), c("📍 진해 상자"), c("📍 지도 단추"), cs(/^(🗺|🔭|🪐|🌐|🧬|🧪 본문|📈|⚗️|📜|🦴|🔗|☀️|🔎)/), cs(/^(📇|📐)/), qz.length, labs.length, nScale, R.length].map(clean));
}
const tot = ["전체", UNITS.length + "개 단원"]; for (let k = 2; k < sum[0].length; k++) tot.push(String(sum.slice(1).reduce((a, r) => a + (+r[k] || 0), 0)));
sum.push(tot);
const tsv = a => a.map(r => r.join("\t")).join("\n") + "\n";
fs.mkdirSync(OUT, { recursive: true });
const fA = path.join(OUT, "activities.tsv"), fS = path.join(OUT, "activity-summary.tsv"), fM = path.join(OUT, "activities-meta.tsv");
const newA = tsv(rows), newS = tsv(sum);
const same = fs.existsSync(fA) && fs.existsSync(fS) && fs.readFileSync(fA, "utf8") === newA && fs.readFileSync(fS, "utf8") === newS;
if (same) { console.log("바뀐 것 없음", rows.length - 1, "줄"); process.exit(0); }
fs.writeFileSync(fA, newA); fs.writeFileSync(fS, newS);
const now = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
fs.writeFileSync(fM, tsv([["자료 만든 때(한국 시각)", now], ["단원 수", String(UNITS.length)], ["활동 줄 수", String(rows.length - 1)]]));
console.log("새로 씀", UNITS.length, "단원", rows.length - 1, "줄", now);
