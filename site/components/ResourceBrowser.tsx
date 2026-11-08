"use client";

import { useDeferredValue, useMemo, useState, useSyncExternalStore } from "react";
import type { ResourceRow } from "@/lib/content";
import { card } from "@/lib/ui";

const PAGE = 40;

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const getHash = () => {
  try {
    return decodeURIComponent(location.hash.slice(1));
  } catch {
    return "";
  }
};

function Chips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: string; t: string; n?: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="w-full text-sm font-bold text-slate-500 dark:text-slate-400">{label}</span>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <button
            key={o.v || "all"}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.v)}
            className={`min-h-12 rounded-2xl border-2 px-4 text-base font-bold transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500 active:scale-[.97] ${
              on
                ? "border-teal-700 bg-teal-700 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950"
                : "border-slate-300 bg-white text-slate-700 hover:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-400"
            }`}
          >
            {o.t}
            {o.n != null && <span className="ml-1.5 text-sm opacity-70">{o.n}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* 자료실: 과목·종류 큰 버튼 + 입력 즉시 찾기. 한 번에 40개씩만 그려 화면이 무겁지 않게(옛 화면은 DOM 5,500개). */
export default function ResourceBrowser({ rows, subjects }: { rows: ResourceRow[]; subjects: string[] }) {
  const hash = useSyncExternalStore(subscribeHash, getHash, () => "");
  const [subj, setSubj] = useState("");
  const [kindPick, setKind] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(query.trim().toLowerCase());

  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.g, (m.get(r.g) || 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [rows]);
  /* 주소 끝 #PhET · #인물 카드 처럼 종류 이름이 오면 그 종류만(옛 자료실과 같은 약속) */
  const kind = kindPick ?? (kinds.some(([k]) => k === hash) ? hash : "");

  const hay = useMemo(() => rows.map((r) => [r.s, r.unitLabel, r.tab, r.kind, r.word, r.open, r.note, ...r.links.map((l) => l.text)].join(" ").toLowerCase()), [rows]);
  const shown = useMemo(() => {
    const tokens = q.split(/\s+/).filter(Boolean);
    return rows.filter((r, i) => (!subj || r.s === subj) && (!kind || r.g === kind) && tokens.every((t) => hay[i].includes(t)));
  }, [rows, hay, subj, kind, q]);

  const reset = (fn: () => void) => {
    fn();
    setLimit(PAGE);
  };

  return (
    <div>
      <div className={`${card} space-y-4 p-4 sm:p-5`}>
        <div>
          <label htmlFor="rq" className="mb-2 block text-base font-bold">
            자료 찾기
          </label>
          <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 focus-within:border-teal-600 dark:border-slate-600 dark:bg-slate-950">
            <span aria-hidden className="text-xl">🔎</span>
            <input
              id="rq"
              type="search"
              value={query}
              onChange={(e) => reset(() => setQuery(e.target.value))}
              placeholder="낱말·단원·자료 이름 (예: 뉴턴, 해구, 온실)"
              autoComplete="off"
              className="min-h-14 w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
            />
            {query && (
              <button type="button" onClick={() => reset(() => setQuery(""))} className="min-h-11 shrink-0 rounded-xl px-3 font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800">
                지우기
              </button>
            )}
          </div>
        </div>
        <Chips label="과목" value={subj} onChange={(v) => reset(() => setSubj(v))} options={[{ v: "", t: "전체" }, ...subjects.map((s) => ({ v: s, t: s }))]} />
        <Chips label="종류" value={kind} onChange={(v) => reset(() => setKind(v))} options={[{ v: "", t: "전체", n: rows.length }, ...kinds.map(([k, n]) => ({ v: k, t: k, n }))]} />
      </div>

      <p aria-live="polite" className="mb-3 mt-6 text-base font-bold text-slate-600 dark:text-slate-300">
        {shown.length}곳{shown.length > limit ? ` 중 ${limit}곳 보기` : ""}
      </p>

      <ul className="grid gap-3 md:grid-cols-2">
        {shown.slice(0, limit).map((r, i) => (
          <li key={`${r.repo}-${r.unit}-${r.word}-${i}`} className={`${card} flex flex-col gap-2 p-4`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{r.kind}</span>
              <span className="font-semibold text-slate-500 dark:text-slate-400">{r.s}</span>
            </div>
            <p className="text-lg font-extrabold leading-snug">{r.word || r.open}</p>
            {r.note && <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{r.note}</p>}
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              {r.links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-3 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline-4 focus-visible:outline-teal-500 dark:bg-teal-500 dark:text-slate-950"
                >
                  {l.text} <span aria-hidden className="ml-1">↗</span>
                </a>
              ))}
              {r.play && (
                <a
                  href={r.play}
                  className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-300 px-3 text-sm font-bold hover:border-teal-600 focus-visible:outline-4 focus-visible:outline-teal-500 dark:border-slate-600"
                >
                  {r.unitLabel}
                  {r.tab ? ` · ${r.tab}` : ""}
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {shown.length > limit && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE)}
            className="min-h-14 rounded-2xl border-2 border-slate-300 bg-white px-8 text-lg font-bold hover:border-teal-600 focus-visible:outline-4 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-900"
          >
            {Math.min(PAGE, shown.length - limit)}곳 더 보기
          </button>
        </div>
      )}
      {!shown.length && <p className="mt-6 text-center text-slate-500">맞는 자료가 없습니다. 낱말을 줄이거나 과목·종류를 ‘전체’로 바꿔 보세요.</p>}
    </div>
  );
}
