#!/usr/bin/env node
/* 빌드 결과(out/)를 GitHub Pages 처럼 /science-teacher-hub-qtrqwc/ 아래에서 보여 주는 아주 작은 서버(BASE_PATH 로 바꿀 수 있음).
 * 사용: node scripts/serve-out.mjs [포트=4173] [--no-share] [--tools <폴더>]
 *   → http://localhost:4173/science-teacher-hub/
 *   --no-share     : share-config.js 를 보낼 때 공유 주소(STH_SHARE_URL)를 빈칸으로 바꿔 보냄(검사 중 진짜 시트에 아무것도 안 감)
 *   --tools <폴더> : 옛 점검 도구(allcheck.js·quizrun.js·labrun.js·tabcheck.js 등)를 /_tools/ 로 보여 줌(내 컴퓨터 검사용)
 *   --old <폴더>   : 그 밖의 주소(/<저장소>/…)는 과목 저장소 폴더에서 보여 줌 — 정식 단원 주소를 같은 출처로 시험
 * 폴더 주소 끝에 / 가 없으면 Pages 처럼 / 를 붙여 넘겨줍니다(단원 화면의 상대 주소가 맞게). */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const BASE = process.env.BASE_PATH || "/science-teacher-hub-qtrqwc";
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => (args.indexOf(n) >= 0 ? args[args.indexOf(n) + 1] : null);
const PORT = Number(args.find((a) => /^\d+$/.test(a)) || 4173);
const NO_SHARE = flag("--no-share");
const TOOLS = opt("--tools") ? path.resolve(opt("--tools")) : null;
const OLD = opt("--old") ? path.resolve(opt("--old")) : null;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".kml": "application/vnd.google-earth.kml+xml",
};

function send(res, file, urlPath) {
  const type = TYPES[path.extname(file)] || "application/octet-stream";
  if (NO_SHARE && path.basename(file) === "share-config.js") {
    const t = fs.readFileSync(file, "utf8").replace(/window\.STH_SHARE_URL\s*=\s*"[^"]*"/, 'window.STH_SHARE_URL = ""');
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    return res.end(t);
  }
  res.writeHead(200, { "Content-Type": type, "Cache-Control": urlPath.includes("/_tools/") ? "no-store" : "no-cache" });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    let p = decodeURIComponent(u.pathname);
    if (p === "/") {
      res.writeHead(302, { Location: BASE + "/" });
      return res.end();
    }
    let root = ROOT;
    if (TOOLS && p.startsWith("/_tools/")) {
      root = TOOLS;
      p = p.slice("/_tools".length);
    } else if (p.startsWith(BASE)) {
      p = p.slice(BASE.length) || "/";
    } else if (OLD) {
      root = OLD;
    } else {
      res.writeHead(404);
      return res.end("not found");
    }
    let file = path.join(root, p);
    if (!file.startsWith(root)) {
      res.writeHead(403);
      return res.end();
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!u.pathname.endsWith("/")) {
        res.writeHead(301, { Location: u.pathname + "/" + u.search });
        return res.end();
      }
      file = path.join(file, "index.html");
    }
    if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
    /* Next 미리 불러오기 조각: __next.c.$d$repo.__PAGE__.txt → __next.c/$d$repo/__PAGE__.txt (Windows 빌드는 폴더로 만듦) */
    if (!fs.existsSync(file)) {
      const m = /^__next\.([^.]+)\.(.+\.txt)$/.exec(path.basename(file));
      if (m) {
        const alt = path.join(path.dirname(file), "__next." + m[1], ...m[2].replace(/\.txt$/, "").split(".")) + ".txt";
        if (fs.existsSync(alt)) file = alt;
      }
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      return res.end(fs.existsSync(path.join(ROOT, "404.html")) ? fs.readFileSync(path.join(ROOT, "404.html")) : "not found");
    }
    send(res, file, u.pathname);
  })
  .listen(PORT, () => console.log(`http://localhost:${PORT}${BASE}/${NO_SHARE ? "  (공유 끔)" : ""}${TOOLS ? `  (점검 도구: /_tools/ ← ${TOOLS})` : ""}`));