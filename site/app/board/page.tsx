import type { Metadata } from "next";
import Link from "next/link";
import { TeacherMark } from "@/components/DeviceMode";
import { getCourses } from "@/lib/content";
import { card, tone } from "@/lib/ui";

export const metadata: Metadata = {
  title: "칠판모드",
  description: "전자칠판 강의 화면 · 혼자 복습하기 · 개념정리 학습지 · 형성평가를 과목별로 모은 곳",
};

/* 첫 화면처럼 과목 카드로 묶어 보여 주고, 카드를 누르면 그 과목의 칠판모드(/board/[repo]/)로 갑니다.
 * 단원 폴더의 board-0N.html·sheet-0N.html·form-0N.html 을 fetch-content 가 읽어 둡니다.
 * 새 칠판 화면은 다음 빌드 때 저절로 나타납니다(지침: _tools/BOARD_GUIDE.md). */
export default function BoardPage() {
  const courses = getCourses();
  const ready = courses
    .map((c) => {
      const units = c.units.filter((u) => (u.boards || []).length);
      return {
        c,
        units,
        n: units.reduce((m, u) => m + u.boards.length, 0),
        forms: units.reduce((m, u) => m + u.boards.filter((b) => b.form).length, 0),
      };
    })
    .filter((x) => x.units.length);
  const waiting = courses.filter((c) => !ready.some((x) => x.c.repo === c.repo));
  const total = ready.reduce((n, x) => n + x.n, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <section className="mb-8">
        <p className="text-sm font-bold text-teal-700 dark:text-teal-300">전자칠판 강의 · 개념정리 학습지 · 형성평가</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">📺 칠판모드</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          과목을 고르면 소단원마다 칠판 강의 화면, 혼자 복습하기, 개념정리 학습지, 형성평가가 있습니다. 칠판 빈칸 번호와 학습지 빈칸 번호가 같습니다.
        </p>
      </section>
      <TeacherMark />

      <p className="mb-3 text-base font-bold text-slate-600 dark:text-slate-300">
        과목 {ready.length}개 · 소단원 {total}개
      </p>

      {ready.length === 0 && <p className={`${card} p-6 text-lg`}>아직 칠판 강의 화면이 있는 단원이 없습니다.</p>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ready.map(({ c, units, n, forms }) => {
          const t = tone(c.color);
          return (
            <li key={c.repo}>
              <Link
                href={`/board/${c.repo}/`}
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
                  <ul className="mt-3 flex-1 space-y-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {units.map((u) => (
                      <li key={u.id} className="truncate">
                        <span className={`font-bold ${t.text}`}>{u.chapter}</span> {u.title}
                        <span className="text-slate-400 dark:text-slate-500"> · {u.boards.length}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                      단원 {units.length}개{forms ? ` · 형성평가 ${forms}개` : ""}
                    </span>
                    <span className={`ml-auto text-lg font-extrabold ${t.text}`}>
                      소단원 {n}개 <span aria-hidden className="inline-block transition group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {waiting.length > 0 && (
        <p className="mt-8 leading-relaxed text-slate-600 dark:text-slate-300">
          <b>준비 중인 과목</b> · {waiting.map((c) => c.name).join(" · ")}
        </p>
      )}
    </div>
  );
}
