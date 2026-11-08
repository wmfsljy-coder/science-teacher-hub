#!/usr/bin/env node
/*
 * 단원 내용 모으기 (빌드 전에 한 번 실행)
 *
 * 이 사이트는 science-teacher-hub 저장소의 site/ 폴더이고, 빌드 결과가 https://wmfsljy-coder.github.io/science-teacher-hub/ 에 올라갑니다.
 * 단원 수업 화면은 각 과목 저장소 주소(https://wmfsljy-coder.github.io/<저장소>/<단원>/)가 정식이고, 이 사이트는 목록·지도안·QR·자료실만 만듭니다.
 *
 * - 과목 저장소 폴더: 환경 변수 CONTENT_DIR. 없으면 허브 저장소의 상위 폴더(과학허브)를 씁니다.
 * - 허브 자료(자료실 표·소단원 목록): 이 폴더의 상위(허브 저장소 뿌리). HUB_DIR 로 바꿀 수 있습니다.
 * - `--clone` 을 붙이면 공개 과목 저장소를 CONTENT_DIR 안에 얕게(--depth 1) 받아 옵니다. (GitHub Actions 에서 사용)
 * - 결과: content/generated.json (단원 정보 + 지도안 원문), content/resources.json (자료실), public/thumbs/*.webp (작은 대표 그림)
 *
 * 과목 저장소의 파일은 읽기만 하고 절대 고치지 않습니다.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildResources } from "./resources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER = "wmfsljy-coder";
const PAGES = `https://${OWNER}.github.io`;
const HUB_DIR = path.resolve(ROOT, process.env.HUB_DIR || "..");
const courses = JSON.parse(fs.readFileSync(path.join(ROOT, "lib", "courses.json"), "utf8"));

const contentDir = path.resolve(ROOT, process.env.CONTENT_DIR || path.join("..", ".."));
const doClone = process.argv.includes("--clone");

if (doClone) {
  fs.mkdirSync(contentDir, { recursive: true });
  for (const c of courses) {
    const dest = path.join(contentDir, c.repo);
    if (fs.existsSync(path.join(dest, "index.html"))) {
      /* 이 프로젝트 안(.content)에 받아 둔 사본만 새로 당김(사람이 작업하는 상위 폴더 clone 은 건드리지 않음) */
      if (dest.startsWith(ROOT + path.sep)) execFileSync("git", ["-C", dest, "pull", "--ff-only", "-q"], { stdio: "inherit" });
      continue;
    }
    console.log(`받는 중: ${c.repo}`);
    execFileSync("git", ["clone", "--depth", "1", `https://github.com/${OWNER}/${c.repo}.git`, dest], { stdio: "inherit" });
  }
}

/* ---------- 작은 도우미 ---------- */
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
const strip = (html) =>
  html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
const num = (s, re) => {
  const m = s.match(re);
  return m ? Number(m[1]) : null;
};

/* 과목 첫 화면(index.html)에서 단원 카드 읽기 */
function parseCourseIndex(html) {
  const desc = strip((html.match(/<div class="hero">[\s\S]*?<p>([\s\S]*?)<\/p>/) || [])[1] || "")
    .replace(/\s*아래에서 학습할 (?:대)?단원을 선택하세요\.?\s*$/, "")
    .trim();
  const marks = [];
  for (const m of html.matchAll(/<div class="part-(?:label|heading)">([\s\S]*?)<\/div>/g)) {
    marks.push({ at: m.index, part: strip(m[1]) });
  }
  const cards = {};
  for (const m of html.matchAll(/<a class="unit-card[^"]*" href="([^"]+)">([\s\S]*?)<\/a>/g)) {
    const slug = m[1].replace(/\/$/, "");
    const body = m[2];
    const part = marks.filter((x) => x.at < m.index).pop()?.part || "";
    cards[slug] = {
      chapter: strip((body.match(/<div class="chapter">([\s\S]*?)<\/div>/) || [])[1] || ""),
      title: strip((body.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || ""),
      summary: strip((body.match(/<p>([\s\S]*?)<\/p>/) || [])[1] || ""),
      topics: [...((body.match(/<div class="topics">([\s\S]*?)<\/div>/) || [])[1] || "").matchAll(/<span>([\s\S]*?)<\/span>/g)].map((t) => strip(t[1])),
      part,
    };
  }
  return { desc, cards };
}

/* 지도안(LESSON.md) 읽기 */
function parseLesson(md) {
  const lines = md.split(/\r?\n/);
  const h1 = (lines.find((l) => l.startsWith("# ")) || "").replace(/^#\s*/, "");
  const make = md.match(/- 구성:\s*(.+)/)?.[1] || "";
  const counts = {
    stories: num(make, /이야기\s*(\d+)\s*편/),
    quiz: num(make, /수준별 문제\s*(\d+)\s*문항/),
    labs: num(make, /응용 실험실\s*(\d+)\s*사례/),
    real: num(make, /실제 자료\s*(\d+)\s*사례/),
  };
  const standards = [];
  for (const m of md.matchAll(/^- \*\*\[([^\]]+)\]\*\*\s*(.+)$/gm)) {
    if (!standards.some((s) => s.code === m[1])) standards.push({ code: m[1], text: m[2].trim() });
  }
  const periods = [];
  const re = /^## (\d+)차시\s*[—-]\s*(.+?)\s*(?:\(([^)]*)\))?\s*$/gm;
  for (const m of md.matchAll(re)) {
    const after = md.slice(m.index, m.index + 600);
    const terms = (after.match(/- 핵심 용어:\s*(.+)/)?.[1] || "").split(/\s*,\s*/).filter(Boolean);
    periods.push({ n: Number(m[1]), title: m[2].trim(), topic: (m[3] || "").replace(/^\d+\s*·\s*/, "").trim(), terms });
  }
  /* 화면에 보일 본문: 맨 위 제목과 '이 파일은 … 만든 것입니다' 안내 줄은 뺍니다 */
  const body = lines
    .filter((l, i) => !(i < 5 && (l.startsWith("# ") || /^>\s*이 파일은/.test(l))))
    .join("\n")
    .trim();
  return { h1, counts, standards, periods, body };
}

/* 단원 화면의 탭 순서 → 수업 흐름 */
const FIXED = ["수준별 문제", "응용 실험실", "실제 자료", "정리하기", "우리 반", "교과서 실험"];
function parseFlow(html, hasPre, hasReal) {
  const tabs = [...html.matchAll(/<button class="tab-btn[^"]*"[^>]*>([\s\S]*?)<\/button>/g)]
    .map((m) => strip(m[1]).replace(/^\d+\s*/, ""))
    .filter(Boolean);
  const flow = tabs.map((label) => ({ label, kind: FIXED.includes(label) ? "step" : "story" }));
  if (hasReal && !tabs.includes("실제 자료")) {
    const i = flow.findIndex((f) => f.label === "응용 실험실");
    flow.splice(i >= 0 ? i + 1 : flow.length, 0, { label: "실제 자료", kind: "step" });
  }
  if (hasPre) flow.unshift({ label: "들어가기", kind: "intro" });
  return flow;
}

/* ---------- 모으기 ---------- */
let sharp = null;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn("sharp 를 불러오지 못해 대표 그림은 원래 주소로 연결합니다.");
}
const thumbDir = path.join(ROOT, "public", "thumbs");
fs.mkdirSync(thumbDir, { recursive: true });

/* 소단원 목록(QR 모음용) — science-teacher-hub/data/sections.js: { "저장소/단원": [["01","이름"], …] } */
let SECTIONS = {};
try {
  const s = read(path.join(HUB_DIR, "data", "sections.js"));
  SECTIONS = JSON.parse(s.slice(s.indexOf("{"), s.lastIndexOf("}") + 1));
} catch (e) {
  console.warn(`소단원 목록을 읽지 못했습니다: ${e.message}`);
}

const out = { generatedAt: new Date().toISOString(), courses: [] };
let unitTotal = 0;

for (const c of courses) {
  const dir = path.join(contentDir, c.repo);
  if (!fs.existsSync(dir)) {
    console.error(`과목 폴더가 없습니다: ${dir}  (CONTENT_DIR 을 확인하거나 --clone 을 붙이세요)`);
    process.exit(1);
  }
  const { desc, cards } = parseCourseIndex(read(path.join(dir, "index.html")));
  const slugs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d/.test(d.name) && fs.existsSync(path.join(dir, d.name, "index.html")))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));

  const units = [];
  for (const slug of slugs) {
    const ud = path.join(dir, slug);
    const html = read(path.join(ud, "index.html"));
    const lesson = parseLesson(read(path.join(ud, "LESSON.md")));
    const card = cards[slug] || {};
    const h1 = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "");
    const titleTag = strip((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "").replace(/\s*—.*$/, "");
    const title = card.title || h1 || titleTag;
    const chapter = card.chapter || (lesson.h1.match(/\s([ⅠⅡⅢⅣⅤ](?:-\d+)?)\s/) || [])[1] || slug;

    const pre = read(path.join(ud, "precheck-items.js"));
    /* 진도 열쇠: episodes.js 의 sthUnit("…") → localStorage "sth-<열쇠>" (옛 허브 진도 막대와 같은 값) */
    const key = (read(path.join(ud, "episodes.js")).match(/sthUnit\(\s*"([^"]+)"/) || [])[1] || "";
    if (!key) console.warn(`진도 열쇠(sthUnit)를 못 찾음: ${c.repo}/${slug}`);
    const hasReal = fs.existsSync(path.join(ud, "real-cases.js"));
    const flow = parseFlow(html, !!pre, hasReal);

    /* 대표 그림: 단원 화면에 처음 나오는 img/ 그림 */
    const im = html.match(/<img src="(img\/[^"]+)"[^>]*?alt="([^"]*)"/);
    const id = `${c.repo}--${slug}`;
    let thumb = null;
    let thumbAlt = "";
    if (im) {
      thumbAlt = strip(im[2]);
      const src = path.join(ud, im[1]);
      const liveSrc = `${PAGES}/${c.repo}/${slug}/${im[1]}`;
      thumb = liveSrc;
      if (sharp && fs.existsSync(src)) {
        const dest = path.join(thumbDir, `${id}.webp`);
        try {
          await sharp(src).resize(480, 480, { fit: "cover" }).webp({ quality: 68 }).toFile(dest);
          thumb = `/thumbs/${id}.webp`;
        } catch (e) {
          console.warn(`그림 줄이기 실패(${id}): ${e.message}`);
        }
      }
    }

    units.push({
      id,
      repo: c.repo,
      slug,
      chapter,
      title,
      part: card.part || "",
      summary: card.summary || "",
      topics: card.topics || [],
      /* 정식 단원 주소: 학생 QR 은 절대 주소, 링크는 같은 사이트 안이라 /<저장소>/<단원>/ */
      url: `${PAGES}/${c.repo}/${slug}/`,
      play: `/${c.repo}/${slug}/`,
      thumb,
      thumbAlt,
      key,
      sections: SECTIONS[`${c.repo}/${slug}`] || [],
      counts: { ...lesson.counts, precheck: (pre.match(/\{\s*id:\s*"p/g) || []).length || null },
      standards: lesson.standards,
      periods: lesson.periods,
      flow,
      lesson: lesson.body,
    });
  }
  unitTotal += units.length;
  /* 과목 주소(옛 과목 첫 화면)와 과목 전체 QR(?all=1: 학생은 그 과목 단원 목록만) */
  out.courses.push({ ...c, description: desc, url: `${PAGES}/${c.repo}/`, allUrl: `${PAGES}/${c.repo}/?all=1`, units });
  console.log(`${c.name}: ${units.length}개 단원`);
}

fs.mkdirSync(path.join(ROOT, "content"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "content", "generated.json"), JSON.stringify(out, null, 1));
console.log(`완료: 과목 ${out.courses.length}개, 단원 ${unitTotal}개 → content/generated.json`);

/* 단원 화면 옮겨 담기 */
/* 자료실 목록 */
buildResources({ root: ROOT, hubDir: HUB_DIR });

/* 예전 빌드(science-hub-next 시절)가 남긴 복사본이 있으면 지움 — 이제 단원·엔진은 복사하지 않음 */
for (const d of ["u", "engine", "hub-assets", "class", "records", "maps", "phet"]) fs.rmSync(path.join(ROOT, "public", d), { recursive: true, force: true });
