"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { tone, card } from "@/lib/ui";
import Thumb from "./Thumb";
import { CourseProgress, DoneBadge } from "./Progress";

export type CourseCardData = {
  repo: string;
  name: string;
  family: string;
  category: string;
  grade: string;
  emoji: string;
  color: string;
  description: string;
  unitCount: number;
  keys: string[];
  thumbs: (string | null)[];
};

export type SearchItem = {
  id: string;
  repo: string;
  slug: string;
  courseName: string;
  family: string;
  grade: string;
  color: string;
  chapter: string;
  title: string;
  summary: string;
  url: string;
  play: string;
  unitKey: string;
  thumb: string | null;
  thumbAlt: string;
  codes: string[];
  hay: string;
};

const GRADES = ["전체", "1학년", "2·3학년"] as const;
const FAMILIES = ["전체", "통합과학", "과학탐구실험", "지구과학", "지구시스템과학", "행성우주과학", "융합선택"] as const;
const EXAMPLES = ["대멸종", "판 구조", "10통과2-01", "12지구03", "엔소", "탄소중립"];

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, "");

/* 탭하는 큰 선택 버튼 한 줄 */
function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="mr-1 w-full shrink-0 text-sm font-bold sm:w-14 text-slate-500 dark:text-slate-400">{label}</span>
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o)}
            className={`min-h-12 rounded-2xl border-2 px-4 text-base font-bold transition focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500 active:scale-[.97] ${
              on
                ? "border-teal-700 bg-teal-700 text-white dark:border-teal-400 dark:bg-teal-400 dark:text-slate-950"
                : "border-slate-300 bg-white text-slate-700 hover:border-teal-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-400"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function HomeBrowser({ courses, items }: { courses: CourseCardData[]; items: SearchItem[] }) {
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<(typeof GRADES)[number]>("전체");
  const [family, setFamily] = useState<(typeof FAMILIES)[number]>("전체");
  const q = useDeferredValue(query);

  const pass = (g: string, f: string) => (grade === "전체" || g === grade) && (family === "전체" || f === family);

  const shownCourses = courses.filter((c) => pass(c.grade, c.family));

  const results = useMemo(() => {
    const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return null;
    return items.filter((it) => {
      if (!((grade === "전체" || it.grade === grade) && (family === "전체" || it.family === family))) return false;
      const hay = it.hay;
      const hayS = squash(hay);
      return tokens.every((t) => hay.includes(t) || hayS.includes(squash(t)));
    });
  }, [q, items, grade, family]);

  const unitCount = shownCourses.reduce((n, c) => n + c.unitCount, 0);
  const qLower = q.trim().toLowerCase();

  return (
    <div>
      {/* 검색 */}
      <div className={`${card} p-4 sm:p-5`}>
        <label htmlFor="search" className="mb-2 block text-base font-bold">
          단원 찾기
        </label>
        <div className="flex items-center gap-2 rounded-2xl border-2 border-slate-300 bg-slate-50 px-4 focus-within:border-teal-600 dark:border-slate-600 dark:bg-slate-950 dark:focus-within:border-teal-400">
          <span aria-hidden className="text-xl">🔎</span>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="단원 이름, 주제어, 성취기준 코드"
            autoComplete="off"
            className="min-h-14 w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="min-h-11 shrink-0 rounded-xl px-3 text-base font-bold text-slate-600 hover:bg-slate-200 focus-visible:outline-4 focus-visible:outline-teal-500 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              지우기
            </button>
          )}
        </div>
        {!query && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">예:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setQuery(ex)}
                className="min-h-10 rounded-xl bg-slate-100 px-3 font-semibold text-slate-700 hover:bg-teal-100 hover:text-teal-900 focus-visible:outline-4 focus-visible:outline-teal-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-teal-900"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <ChipRow label="학년" options={GRADES} value={grade} onChange={setGrade} />
          <ChipRow label="과목군" options={FAMILIES} value={family} onChange={setFamily} />
        </div>
      </div>

      <p aria-live="polite" className="mt-6 mb-3 text-base font-bold text-slate-600 dark:text-slate-300">
        {results
          ? `‘${q.trim()}’ 검색 결과 ${results.length}개 단원`
          : `과목 ${shownCourses.length}개 · 단원 ${unitCount}개`}
      </p>

      {/* 검색 결과 */}
      {results && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {results.map((it) => {
            const t = tone(it.color);
            const hitCodes = it.codes.filter((c) => qLower && c.toLowerCase().includes(qLower));
            return (
              <li key={it.id} className={`${card} flex gap-3 p-3`}>
                <Thumb src={it.thumb} alt="" className="h-24 w-24 shrink-0 rounded-2xl" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className={`flex flex-wrap items-center gap-2 text-sm font-bold ${t.text}`}>
                    {it.courseName} · {it.chapter}
                    <DoneBadge unitKey={it.unitKey} />
                  </span>
                  <Link
                    href={`/u/${it.repo}/${it.slug}/plan/`}
                    className="text-lg font-extrabold leading-snug hover:underline focus-visible:outline-4 focus-visible:outline-teal-500"
                  >
                    {it.title}
                  </Link>
                  {hitCodes.length > 0 && (
                    <span className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-300">
                      성취기준 {hitCodes.join(", ")}
                    </span>
                  )}
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{it.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link
                      href={`/u/${it.repo}/${it.slug}/plan/`}
                      className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-300 px-3 text-sm font-bold hover:border-teal-600 focus-visible:outline-4 focus-visible:outline-teal-500 dark:border-slate-600"
                    >
                      지도안·QR
                    </Link>
                    <a
                      href={it.play}
                      className="inline-flex min-h-11 items-center rounded-xl bg-teal-700 px-3 text-sm font-bold text-white hover:bg-teal-800 focus-visible:outline-4 focus-visible:outline-teal-500 dark:bg-teal-500 dark:text-slate-950"
                    >
                      수업 열기
                    </a>
                  </div>
                </div>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className={`${card} p-6 text-base text-slate-600 dark:text-slate-300 sm:col-span-2`}>
              맞는 단원이 없습니다. 낱말을 줄이거나, 위의 학년·과목군을 &lsquo;전체&rsquo;로 바꿔 보세요.
            </li>
          )}
        </ul>
      )}

      {/* 과목 카드 */}
      {!results && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shownCourses.map((c) => {
            const t = tone(c.color);
            return (
              <li key={c.repo}>
                <Link
                  href={`/c/${c.repo}/`}
                  className={`${card} ${t.ring} group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500`}
                >
                  <div className={`h-2 ${t.bar}`} aria-hidden />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start gap-3">
                      <span aria-hidden className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${t.soft}`}>
                        {c.emoji}
                      </span>
                      <div className="min-w-0">
                        <h2 className="text-xl font-extrabold leading-tight">{c.name}</h2>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${t.badge}`}>{c.category}</span>
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {c.grade}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{c.description}</p>
                    <CourseProgress keys={c.keys} barClass={t.bar} />
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex -space-x-3" aria-hidden>
                        {c.thumbs.map((s, i) => (
                          <Thumb key={i} src={s} alt="" className="h-11 w-11 rounded-full border-2 border-white dark:border-slate-900" />
                        ))}
                      </div>
                      <span className={`ml-auto text-lg font-extrabold ${t.text}`}>
                        단원 {c.unitCount}개 <span aria-hidden className="inline-block transition group-hover:translate-x-1">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
