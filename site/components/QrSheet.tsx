"use client";

import QRCode from "qrcode";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";

export type QrCourse = {
  repo: string;
  name: string;
  allUrl: string;
  units: { slug: string; chapter: string; title: string; url: string; sections: [string, string][] }[];
};
type CardData = { key: string; sub: string; name: string; url: string; kind: "subject" | "section" | "whole" };

/* QR 그림(SVG 경로)을 화면에서 바로 만듭니다(서버·네트워크 없이). */
function qrPath(text: string) {
  const q = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  const d = q.modules.data;
  let p = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[y * n + x]) p += `M${x + 2} ${y + 2}h1v1h-1z`;
  return { p, size: n + 4 };
}
function Qr({ text, label, className }: { text: string; label: string; className?: string }) {
  const { p, size } = useMemo(() => qrPath(text), [text]);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className={className} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={p} fill="#0f172a" />
    </svg>
  );
}

function subscribeNone() {
  return () => {};
}
const param = (k: string) => {
  try {
    return new URLSearchParams(location.search).get(k) || "";
  } catch {
    return "";
  }
};

const chip = (on: boolean) =>
  `min-h-12 rounded-2xl border-2 px-4 text-base font-bold transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
    on
      ? "border-teal-700 bg-teal-700 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950"
      : "border-slate-300 bg-white text-slate-700 hover:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
  }`;

/* 과목·단원·소단원 학생 입장 QR 모음(인쇄하면 A4 한 장에 6개). 주소 ?s=과목이름 · ?u=저장소/단원 으로 바로 고를 수 있음 */
export default function QrSheet({ courses }: { courses: QrCourse[] }) {
  /* 처음 한 번 주소의 ?s= · ?u= 를 읽음(서버 그림에서는 빈값) */
  const initS = useSyncExternalStore(subscribeNone, () => param("s"), () => "");
  const initU = useSyncExternalStore(subscribeNone, () => param("u"), () => "");
  const [pickS, setPickS] = useState<string | null>(null);
  const [pickU, setPickU] = useState<string | null>(null);
  const [big, setBig] = useState<CardData | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);

  const s = pickS ?? (initS ? courses.find((c) => c.name.startsWith(initS) || c.repo === initS)?.repo || "" : initU ? initU.split("/")[0] : "");
  const u = pickU ?? (initU && (!pickS || pickS === initU.split("/")[0]) ? initU : "");

  const remember = (ns: string, nu: string) => {
    const a = new URLSearchParams();
    const c = courses.find((x) => x.repo === ns);
    if (c) a.set("s", c.name);
    if (nu) a.set("u", nu);
    history.replaceState(null, "", a.toString() ? `?${a}` : location.pathname);
  };

  const groups = useMemo(() => {
    const list = s === "*" ? courses : courses.filter((c) => c.repo === s);
    return list.map((c) => {
      const units = c.units.filter((x) => !u || `${c.repo}/${x.slug}` === u);
      const cards: { head: string; items: CardData[] }[] = [];
      if (!u) cards.push({ head: `${c.name} — 과목 전체`, items: [{ key: `${c.repo}-all`, sub: "과목 전체 · 단원 목록", name: `${c.name} 전체`, url: c.allUrl, kind: "subject" }] });
      for (const x of units) {
        cards.push({
          head: `${c.name} · ${x.chapter} ${x.title}`,
          items: [
            ...x.sections.map(([no, nm]) => ({ key: `${c.repo}-${x.slug}-${no}`, sub: `${c.name} · ${x.chapter} ${x.title}`, name: `${no} ${nm}`, url: `${x.url}?sec=${no}`, kind: "section" as const })),
            { key: `${c.repo}-${x.slug}`, sub: `${c.name} · ${x.chapter}`, name: `${x.title} — 단원 전체`, url: x.url, kind: "whole" as const },
          ],
        });
      }
      return { repo: c.repo, cards };
    });
  }, [courses, s, u]);

  const openBig = (c: CardData) => {
    setBig(c);
    requestAnimationFrame(() => dlg.current?.showModal());
  };
  const course = courses.find((c) => c.repo === s);

  return (
    <div>
      <div className="no-print space-y-4 rounded-3xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div role="group" aria-label="과목" className="flex flex-wrap gap-2">
          <span className="w-full text-sm font-bold text-slate-500 dark:text-slate-400">과목</span>
          {courses.map((c) => (
            <button key={c.repo} type="button" aria-pressed={s === c.repo} className={chip(s === c.repo)} onClick={() => { setPickS(c.repo); setPickU(""); remember(c.repo, ""); }}>
              {c.name}
            </button>
          ))}
          <button type="button" aria-pressed={s === "*"} className={chip(s === "*")} onClick={() => { setPickS("*"); setPickU(""); remember("", ""); }}>
            모든 과목
          </button>
        </div>
        {course && (
          <div role="group" aria-label="단원" className="flex flex-wrap gap-2">
            <span className="w-full text-sm font-bold text-slate-500 dark:text-slate-400">단원 (고르면 그 단원만 인쇄)</span>
            <button type="button" aria-pressed={!u} className={chip(!u)} onClick={() => { setPickU(""); remember(s, ""); }}>
              전체 단원
            </button>
            {course.units.map((x) => {
              const id = `${course.repo}/${x.slug}`;
              return (
                <button key={id} type="button" aria-pressed={u === id} className={chip(u === id)} onClick={() => { setPickU(id); remember(s, id); }}>
                  {x.chapter} {x.title}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!s}
            className="min-h-14 rounded-2xl bg-teal-700 px-6 text-lg font-bold text-white hover:bg-teal-800 disabled:opacity-40 dark:bg-teal-500 dark:text-slate-950"
          >
            🖨 인쇄 (A4 한 장에 6개)
          </button>
          <p className="text-sm text-slate-600 dark:text-slate-300">‘크게 띄우기’는 교실 화면 가득 QR 을 보여 줍니다. 소단원 QR 을 찍으면 그 소단원 이야기가 바로 열리고, 문제도 그 소단원에 맞춰 나옵니다.</p>
        </div>
      </div>

      {!s && <p className="mt-8 text-center text-lg text-slate-500">위에서 과목을 고르세요.</p>}

      {groups.map((g) =>
        g.cards.map((grp) => (
          <section key={grp.head} className="qr-group mt-8">
            <h2 className="mb-3 text-lg font-extrabold">{grp.head}</h2>
            <ul className="qr-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grp.items.map((c) => (
                <li
                  key={c.key}
                  className={`qr-card flex flex-col items-center rounded-3xl border-2 bg-white p-4 text-center text-slate-900 ${
                    c.kind === "subject" ? "border-amber-400" : c.kind === "whole" ? "border-teal-500" : "border-slate-200"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-500">{c.sub}</p>
                  <p className="mt-0.5 text-lg font-extrabold leading-snug">{c.name}</p>
                  <Qr text={c.url} label={`${c.name} 학생 입장 QR`} className="my-2 w-44 max-w-full" />
                  <p className="break-all text-[11px] text-slate-500">{c.url.replace(/^https:\/\//, "")}</p>
                  <div className="no-print mt-3 flex gap-2">
                    <button type="button" onClick={() => openBig(c)} className="min-h-11 rounded-xl bg-teal-700 px-3 text-sm font-bold text-white hover:bg-teal-800">
                      크게 띄우기
                    </button>
                    <a href={`${c.url}${c.url.includes("?") ? "&" : "?"}open=1`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-300 px-3 text-sm font-bold hover:border-teal-600">
                      미리 보기
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )),
      )}

      <dialog
        ref={dlg}
        onClose={() => setBig(null)}
        onClick={(e) => e.target === e.currentTarget && dlg.current?.close()}
        aria-label="학생 입장 QR 크게 보기"
        className="m-auto max-h-[96vh] w-[min(96vw,820px)] rounded-3xl bg-white p-6 text-slate-900 backdrop:bg-slate-950/80"
      >
        {big && (
          <div className="flex flex-col items-center text-center">
            <p className="text-base font-bold text-slate-500">{big.sub}</p>
            <p className="text-2xl font-extrabold sm:text-3xl">{big.name}</p>
            <Qr text={big.url} label={`${big.name} 학생 입장 QR`} className="my-4 w-[min(72vh,80vw)]" />
            <p className="break-all text-lg font-semibold">{big.url}</p>
            <button type="button" autoFocus onClick={() => dlg.current?.close()} className="mt-4 min-h-14 rounded-2xl border-2 border-slate-300 px-8 text-lg font-bold hover:border-teal-600">
              닫기
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
