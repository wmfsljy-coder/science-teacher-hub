#!/usr/bin/env node
/*
 * 배포 전 자동 점검 (Playwright) — 조립한 out/(새 허브 + 옛 허브 파일)을 /science-teacher-hub/ 로, 과목 저장소 사본(CONTENT_DIR)을
 * /<저장소>/ 로 같은 로컬 서버(공유 끔)에 띄우고, 정식 단원 주소에서 옛 점검 도구를 돌립니다. 단원이 부르는
 * /science-teacher-hub/assets/(review-*.js·unit-items-all.js 등)가 out/ 에 빠짐없이 있는지도 함께 확인됩니다.
 *
 *   node scripts/check-units.mjs            표본(과목마다 1단원 + 무거운 단원 몇 개)
 *   node scripts/check-units.mjs --all      44단원 전부(매일 새벽·손으로 돌릴 때)
 *   환경 변수: CONTENT_DIR(과목 저장소 사본), HUB_DIR(점검 도구 = <HUB_DIR>/_tools, 기본 site/..), PW_CHANNEL(msedge·chrome 등)
 *
 * 보는 것
 *   1. 단원마다: 콘솔 오류 0, 우리 사이트 파일 실패 0, 모든 탭이 보임
 *   2. allcheck(탭·문제 수·실험 수·정리줄) · quizrun(채점) · labrun(실험 합격 조합) · tabcheck('우리 반' 칸)
 *   3. 허브 화면: /, /c/…, /resources/, /qr/, /maps/, /class/, /records/?mock=1, /phet/ 콘솔 오류 0
 * 공유(Apps Script)는 서버가 주소를 빈칸으로 보내고(--no-share), 브라우저에서도 script.google.com 요청을 막습니다.
 * 점검 도구가 localStorage.clear() 를 부르므로 이 스크립트는 localhost 에서만 돕니다.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.resolve(ROOT, process.env.CONTENT_DIR || path.join("..", ".."));
const TOOLS = path.join(path.resolve(ROOT, process.env.HUB_DIR || ".."), "_tools");
const PORT = 4199;
const ORIGIN = `http://localhost:${PORT}`;
const BASE = process.env.BASE_PATH || "/science-teacher-hub";
const ALL = process.argv.includes("--all");

const gen = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "generated.json"), "utf8"));
const allUnits = gen.courses.flatMap((c) => c.units.map((u) => `${c.repo}/${u.slug}`));
/* 표본: 과목마다 첫 단원 + 실제 자료·선택 부품이 많은 단원 */
const EXTRA = ["integrated-science-2/2-1", "science-inquiry-2/2-4", "earth-science-2/3-2", "planet-space-2/2-1"];
const units = ALL ? allUnits : [...new Set([...gen.courses.map((c) => `${c.repo}/${c.units[0].slug}`), ...EXTRA.filter((u) => allUnits.includes(u))])];

for (const f of ["allcheck.js", "quizrun.js", "quizcheck.js", "labrun.js", "labcheck.js", "tabcheck.js"]) {
  if (!fs.existsSync(path.join(TOOLS, f))) {
    console.error(`점검 도구가 없습니다: ${path.join(TOOLS, f)}`);
    process.exit(2);
  }
}

const server = spawn(process.execPath, [path.join(ROOT, "scripts", "serve-out.mjs"), String(PORT), "--no-share", "--tools", TOOLS, "--old", CONTENT], { stdio: ["ignore", "pipe", "inherit"] });
const stop = () => {
  try {
    server.kill();
  } catch {}
};
process.on("exit", stop);
for (let i = 0; i < 50; i++) {
  try {
    if ((await fetch(`${ORIGIN}${BASE}/`)).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctx.route(/script\.google(usercontent)?\.com/, (r) => r.abort());
const page = await ctx.newPage();
let errs = [];
let bad = [];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const where = m.location()?.url || "";
  if (where && !where.startsWith(ORIGIN)) return; /* 바깥 누리집(시뮬레이션·지도 등) 오류는 우리 것이 아님 */
  errs.push(m.text());
});
page.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().startsWith(ORIGIN)) bad.push(`${r.status()} ${r.url()}`);
});

const fails = [];
const report = { mode: ALL ? "all" : "sample", units: units.length, load: {}, tools: {}, hub: {} };
const t0 = Date.now();

/* 1. 단원 열기 */
for (const u of units) {
  errs = [];
  bad = [];
  await page.goto(`${ORIGIN}/${u}/`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const badTabs = [];
    const btns = [...document.querySelectorAll(".tab-btn")];
    for (const b of btns) {
      b.click();
      await wait(150);
      const p = document.querySelector('.tab-panel[data-panel="' + b.getAttribute("data-tab") + '"]');
      if (!p || p.hidden || p.offsetHeight < 50) badTabs.push(b.textContent.trim());
    }
    return { tabs: btns.length, badTabs, review: !!window.STH_REVIEW_BANK };
  });
  report.load[u] = { ...r, errors: errs.slice(0, 5), bad: bad.slice(0, 5) };
  if (errs.length || bad.length || r.badTabs.length || !r.tabs) fails.push(`열기 ${u}: 오류 ${errs.length}, 실패 파일 ${bad.length}, 안 보이는 탭 ${r.badTabs.join("·") || 0}`);
}

/* 2. 옛 점검 도구(새 경로) */
await page.goto(`${ORIGIN}${BASE}/`);
const list = units;
for (const [name, file, glob] of [
  ["allcheck", "allcheck.js", "AC"],
  ["quizrun", "quizrun.js", "QR"],
  ["labrun", "labrun.js", "LR"],
  ["tabcheck", "tabcheck.js", "TC"],
]) {
  const raw = await page.evaluate(
    async ({ file, glob, list }) => {
      window[glob] = list;
      const src = await (await fetch("/_tools/" + file, { cache: "reload" })).text();
      return await eval(src);
    },
    { file, glob, list },
  );
  const res = JSON.parse(raw);
  report.tools[name] = res;
  for (const [u, v] of Object.entries(res)) {
    if (v.fatal) fails.push(`${name} ${u}: ${v.fatal}`);
    else if (name === "allcheck" && (v.오류 || v.안보이는탭 || v.정리줄 !== "O" || !v.문제 || !v.실험)) fails.push(`allcheck ${u}: ${JSON.stringify(v)}`);
    else if (name === "quizrun" && (v.문제점 || v.errors)) fails.push(`quizrun ${u}: ${JSON.stringify(v).slice(0, 300)}`);
    else if (name === "labrun") for (const [k, s] of Object.entries(v)) if (k === "errors" || k === "fatal" || !String(s).startsWith("✅")) fails.push(`labrun ${u} ${k}: ${JSON.stringify(s).slice(0, 200)}`);
    if (name === "tabcheck" && !(v.공유칸 === "그려짐" && v.보임 && !(v.errors || []).length)) fails.push(`tabcheck ${u}: ${JSON.stringify(v)}`);
  }
}

/* 3. 허브 화면 */
for (const p of ["/", "/c/planet-space-2/", "/u/planet-space-2/2-1/plan/", "/resources/", "/resources/#PhET", "/qr/?s=%ED%96%89%EC%84%B1", "/maps/", "/class/", "/records/?mock=1", "/phet/"]) {
  errs = [];
  bad = [];
  await page.goto(`${ORIGIN}${BASE}${p}`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  report.hub[p] = { errors: errs.slice(0, 5), bad: bad.slice(0, 5) };
  if (errs.length || bad.length) fails.push(`허브 ${p}: 오류 ${errs.length}, 실패 파일 ${bad.length} ${JSON.stringify([...errs, ...bad].slice(0, 3))}`);
}

await browser.close();
stop();

const sum = (o, f) => Object.values(o || {}).reduce((n, v) => n + (f(v) || 0), 0);
report.summary = {
  초: Math.round((Date.now() - t0) / 1000),
  문제: sum(report.tools.allcheck, (v) => v.문제),
  실험: sum(report.tools.allcheck, (v) => v.실험),
  실패: fails,
};
fs.mkdirSync(path.join(ROOT, "check-report"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "check-report", "report.json"), JSON.stringify(report, null, 1));
console.log(`점검(${report.mode}, ${units.length}단원, ${report.summary.초}초): 문제 ${report.summary.문제} · 실험 ${report.summary.실험} · 실패 ${fails.length}건`);
if (fails.length) {
  for (const f of fails) console.error("  ✗ " + f);
  process.exit(1);
}
console.log("  ✓ 모두 통과");
