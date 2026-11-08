/*
 * 자료실 목록 만들기 (fetch-content.mjs 가 부릅니다)
 * 허브의 옛 자료실 표(resources/index.html — _tools/make_resource_list.py 가 만든 것)를 읽어
 * React 자료실 화면이 쓰는 content/resources.json 으로 바꿉니다. 원본 파일은 읽기만 합니다.
 * 단원 링크는 정식 단원 주소(/<저장소>/<단원>/)로.
 */
import fs from "node:fs";
import path from "node:path";

const strip = (h) =>
  h
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const unent = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function buildResources({ root, hubDir }) {
  const src = path.join(hubDir, "resources", "index.html");
  const rows = [];
  const html = fs.existsSync(src) ? fs.readFileSync(src, "utf8") : "";
  for (const m of html.matchAll(/<tr data-s="([^"]*)" data-g="([^"]*)">([\s\S]*?)<\/tr>/g)) {
    const cells = [...m[3].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
    if (cells.length < 6) continue;
    const ua = cells[1].match(/<a href="(?:\.\.\/)+([\w-]+)\/([\w-]+)\/?"[^>]*>([\s\S]*?)<\/a>/);
    const links = [...cells[4].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((a) => ({ href: unent(a[1]), text: strip(a[2]) }));
    rows.push({
      s: unent(m[1]),
      g: unent(m[2]),
      repo: ua ? ua[1] : "",
      unit: ua ? ua[2] : "",
      play: ua ? `/${ua[1]}/${ua[2]}/` : "",
      unitLabel: ua ? strip(ua[3]) : strip(cells[1]),
      tab: strip((cells[1].match(/<div class="sub">([\s\S]*?)<\/div>/) || [])[1] || ""),
      kind: strip(cells[2]),
      word: strip(cells[3]),
      links,
      open: links.length ? "" : strip(cells[4]),
      note: strip(cells[5]),
    });
  }
  if (rows.length < 100) throw new Error(`자료실 목록이 너무 적습니다(${rows.length}줄) — ${src} 모양이 바뀌었는지 확인`);
  fs.writeFileSync(path.join(root, "content", "resources.json"), JSON.stringify({ rows }));
  console.log(`자료실: ${rows.length}곳 → content/resources.json`);
}
