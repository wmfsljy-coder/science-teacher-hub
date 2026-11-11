import type { Metadata } from "next";
import Link from "next/link";
import { TeacherMark } from "@/components/DeviceMode";
import { getCourses } from "@/lib/content";
import { btnPrimary, btnSecondary, card, tone } from "@/lib/ui";

export const metadata: Metadata = {
  title: "칠판모드",
  description: "전자칠판 강의 화면 · 혼자 복습하기 · 개념정리 학습지를 과목별로 모은 곳",
};

/* 단원 폴더의 board-0N.html(전자칠판 강의 화면)·sheet-0N.html(개념정리 학습지)을 fetch-content 가 읽어 둔 것을 과목별로 보여 줍니다.
 * 단원에 새 칠판 화면을 넣으면 다음 빌드 때 여기에 저절로 나타납니다(지침: _tools/BOARD_GUIDE.md). */
const small =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 text-base font-bold text-slate-800 transition hover:border-teal-600 hover:text-teal-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-400 dark:hover:text-teal-200";

export default function BoardPage() {
  const courses = getCourses();
  const ready = courses
    .map((c) => ({ c, units: c.units.filter((u) => (u.boards || []).length) }))
    .filter((x) => x.units.length);
  const waiting = courses.filter((c) => !ready.some((x) => x.c.repo === c.repo));
  const total = ready.reduce((n, x) => n + x.units.reduce((m, u) => m + u.boards.length, 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <TeacherMark />
      <h1 className="text-3xl font-extrabold tracking-tight">📺 칠판모드</h1>
      <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        소단원 개념을 전자칠판에 띄워 강의하는 화면을 과목별로 모았습니다. 칠판에 열리는 빈칸 번호가 개념정리 학습지의 빈칸 번호와 같아, 수업하며 함께 채우고 수업 끝에 학습지로 확인할 수 있습니다. 학생은 단원 화면 맨 아래 ‘칠판모드’ 탭에서 혼자 복습하기와 학습지를 엽니다.
      </p>
      <p className="mt-2 font-bold text-teal-700 dark:text-teal-300">
        지금 {ready.length}과목 · 소단원 {total}개
      </p>

      {ready.length > 1 && (
        <nav aria-label="과목 바로가기" className="mt-6 flex flex-wrap gap-2">
          {ready.map(({ c }) => (
            <a key={c.repo} href={`#board-${c.repo}`} className={small}>
              <span aria-hidden>{c.emoji}</span> {c.name}
            </a>
          ))}
        </nav>
      )}

      {ready.length === 0 && (
        <p className={`${card} mt-8 p-6 text-lg`}>아직 칠판 강의 화면이 있는 단원이 없습니다.</p>
      )}

      <div className="mt-8 space-y-8">
        {ready.map(({ c, units }) => {
          const t = tone(c.color);
          return (
            <section key={c.repo} id={`board-${c.repo}`} className={`${card} scroll-mt-28 p-5 sm:p-6`} aria-labelledby={`board-h-${c.repo}`}>
              <div className="flex flex-wrap items-center gap-3">
                <h2 id={`board-h-${c.repo}`} className="text-2xl font-extrabold">
                  <span aria-hidden>{c.emoji}</span> {c.name}
                </h2>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${t.badge}`}>
                  {c.grade} · {c.category}
                </span>
                <Link href={`/c/${c.repo}/`} className="ml-auto text-sm font-bold underline underline-offset-4 hover:text-teal-700 dark:hover:text-teal-300">
                  과목 단원 목록 →
                </Link>
              </div>

              <div className="mt-5 space-y-6">
                {units.map((u) => (
                  <div key={u.id}>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-xl font-extrabold">
                        <span className={t.text}>{u.chapter}</span> {u.title}
                      </h3>
                      <a href={u.play} className="text-sm font-bold underline underline-offset-4 hover:text-teal-700 dark:hover:text-teal-300">
                        단원 화면 열기
                      </a>
                    </div>
                    <ul className="mt-3 space-y-3">
                      {u.boards.map((b) => (
                        <li key={b.n} className={`rounded-2xl p-4 ${t.soft}`}>
                          <p className="text-lg font-bold">
                            <span className="mr-2 font-extrabold tabular-nums">{b.n}</span>
                            {b.name}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a href={`${u.play}${b.board}`} target="_blank" rel="noopener" className={btnPrimary}>
                              📺 칠판 강의 화면
                            </a>
                            <a href={`${u.play}${b.board}?s=1`} target="_blank" rel="noopener" className={btnSecondary}>
                              🔁 혼자 복습하기
                            </a>
                            {b.sheet && (
                              <>
                                <a href={`${u.play}${b.sheet}`} target="_blank" rel="noopener" className={btnSecondary}>
                                  📝 개념정리 학습지
                                </a>
                                <a href={`${u.play}${b.sheet}?key=1`} target="_blank" rel="noopener" className={btnSecondary}>
                                  🔑 학습지 정답
                                </a>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {waiting.length > 0 && (
        <p className="mt-8 leading-relaxed text-slate-600 dark:text-slate-300">
          <b>준비 중인 과목</b> · {waiting.map((c) => c.name).join(" · ")}
        </p>
      )}
    </div>
  );
}
