import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeacherMark } from "@/components/DeviceMode";
import { getCourse, getCourses, type Unit } from "@/lib/content";
import { card, tone } from "@/lib/ui";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCourses()
    .filter((c) => c.units.some((u) => (u.boards || []).length))
    .map((c) => ({ repo: c.repo }));
}

export async function generateMetadata({ params }: PageProps<"/board/[repo]">): Promise<Metadata> {
  const { repo } = await params;
  const c = getCourse(repo);
  return {
    title: `칠판모드 · ${c?.name ?? "과목"}`,
    description: `${c?.name ?? ""} 칠판 강의 화면 · 개념정리 학습지 · 형성평가`,
  };
}

const pill =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 transition hover:border-teal-600 hover:text-teal-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-400 dark:hover:text-teal-200";
const pillMain =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-3 text-sm font-bold text-white transition hover:bg-teal-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400";
const keyLink =
  "text-xs font-bold text-slate-500 underline underline-offset-2 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300";

/* 한 과목의 칠판모드: 대단원 → 단원 → 소단원(칠판 강의 · 혼자 복습 · 학습지 · 형성평가) */
export default async function BoardCoursePage({ params }: PageProps<"/board/[repo]">) {
  const { repo } = await params;
  const course = getCourse(repo);
  if (!course) notFound();
  const units = course.units.filter((u) => (u.boards || []).length);
  if (!units.length) notFound();
  const t = tone(course.color);
  const total = units.reduce((m, u) => m + u.boards.length, 0);

  const groups: { part: string; units: Unit[] }[] = [];
  for (const u of units) {
    const g = groups.find((x) => x.part === u.part);
    if (g) g.units.push(u);
    else groups.push({ part: u.part, units: [u] });
  }
  const others = getCourses().filter((c) => c.repo !== repo && c.units.some((u) => (u.boards || []).length));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <TeacherMark />
      <nav aria-label="위치" className="mb-4 flex flex-wrap items-center gap-x-4 text-base">
        <Link
          href="/board/"
          className="inline-flex min-h-11 items-center font-semibold text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300"
        >
          ← 칠판모드 모든 과목
        </Link>
        <Link
          href={`/c/${course.repo}/`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300"
        >
          {course.name} 단원 목록
        </Link>
      </nav>

      <header className={`${card} overflow-hidden`}>
        <div className={`h-2 ${t.bar}`} aria-hidden />
        <div className="flex items-center gap-4 p-5 sm:p-6">
          <span aria-hidden className={`grid h-16 w-16 shrink-0 place-items-center rounded-3xl text-4xl ${t.soft}`}>
            {course.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <span className={`rounded-lg px-2 py-0.5 text-sm font-bold ${t.badge}`}>{course.category}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {course.grade}
              </span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                단원 {units.length}개 · 소단원 {total}개
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">📺 {course.name} 칠판모드</h1>
          </div>
        </div>
      </header>

      {units.length > 1 && (
        <nav aria-label="단원 바로가기" className="mt-5 flex flex-wrap gap-2">
          {units.map((u) => (
            <a key={u.id} href={`#b-${u.slug}`} className={pill}>
              <span className={t.text}>{u.chapter}</span> {u.title}
            </a>
          ))}
        </nav>
      )}

      {groups.map((g) => (
        <section key={g.part || "all"} className="mt-8">
          {g.part && <h2 className={`mb-3 text-lg font-extrabold ${t.text}`}>{g.part}</h2>}
          <div className="space-y-5">
            {g.units.map((u) => (
              <div key={u.id} id={`b-${u.slug}`} className={`${card} scroll-mt-28 p-4 sm:p-5`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-xl font-extrabold">
                    <span className={t.text}>{u.chapter}</span> {u.title}
                  </h3>
                  <a href={u.play} className="text-sm font-bold underline underline-offset-4 hover:text-teal-700 dark:hover:text-teal-300">
                    단원 화면 열기
                  </a>
                </div>
                <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                  {u.boards.map((b) => (
                    <li key={b.n} className={`rounded-2xl p-3.5 ${t.soft}`}>
                      <p className="text-base font-bold leading-snug">
                        <span className="mr-1.5 font-extrabold tabular-nums">{b.n}</span>
                        {b.name}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <a href={`${u.play}${b.board}`} target="_blank" rel="noopener" className={pillMain}>
                          📺 칠판 강의
                        </a>
                        <a href={`${u.play}${b.board}?s=1`} target="_blank" rel="noopener" className={pill}>
                          🔁 혼자 복습
                        </a>
                        {b.sheet && (
                          <a href={`${u.play}${b.sheet}`} target="_blank" rel="noopener" className={pill}>
                            📝 학습지
                          </a>
                        )}
                        {b.form && (
                          <a href={`${u.play}${b.form}`} target="_blank" rel="noopener" className={pill}>
                            ✅ 형성평가
                          </a>
                        )}
                      </div>
                      {(b.sheet || b.form) && (
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1" data-teacher>
                          {b.sheet && (
                            <a href={`${u.play}${b.sheet}?key=1`} target="_blank" rel="noopener" className={keyLink}>
                              학습지 정답
                            </a>
                          )}
                          {b.form && (
                            <>
                              <a href={`${u.play}${b.form}?key=1`} target="_blank" rel="noopener" className={keyLink}>
                                형성평가 정답
                              </a>
                              <a href={`${u.play}${b.form}?show=1`} target="_blank" rel="noopener" className={keyLink}>
                                형성평가 칠판에 띄우기
                              </a>
                            </>
                          )}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      {others.length > 0 && (
        <nav aria-label="다른 과목 칠판모드" className="mt-10 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-sm font-bold text-slate-500 dark:text-slate-400">다른 과목</span>
          {others.map((c) => (
            <Link key={c.repo} href={`/board/${c.repo}/`} className={pill}>
              <span aria-hidden>{c.emoji}</span> {c.name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
