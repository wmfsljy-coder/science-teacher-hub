import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Counts from "@/components/Counts";
import Thumb from "@/components/Thumb";
import { assetUrl, BASE, getCourse, getCourses, type Unit } from "@/lib/content";
import { btnPrimary, btnSecondary, card, tone } from "@/lib/ui";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCourses().map((c) => ({ repo: c.repo }));
}

export async function generateMetadata({ params }: PageProps<"/c/[repo]">): Promise<Metadata> {
  const { repo } = await params;
  const c = getCourse(repo);
  return { title: c?.name ?? "과목", description: c?.description };
}

export default async function CoursePage({ params }: PageProps<"/c/[repo]">) {
  const { repo } = await params;
  const course = getCourse(repo);
  if (!course) notFound();
  const t = tone(course.color);

  /* 대단원(part)별로 묶기 */
  const groups: { part: string; units: Unit[] }[] = [];
  for (const u of course.units) {
    const g = groups.find((x) => x.part === u.part);
    if (g) g.units.push(u);
    else groups.push({ part: u.part, units: [u] });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <nav aria-label="위치" className="mb-4 text-base" data-teacher>
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300">
          ← 모든 과목
        </Link>
      </nav>

      <header className={`${card} overflow-hidden`}>
        <div className={`h-2 ${t.bar}`} aria-hidden />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-7">
          <span aria-hidden className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl text-5xl ${t.soft}`}>
            {course.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <span className={`rounded-lg px-2 py-0.5 text-sm font-bold ${t.badge}`}>{course.category}</span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {course.grade}
              </span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                단원 {course.units.length}개
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{course.name}</h1>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">{course.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-7" data-teacher>
          <a href={`${BASE}/qr/?s=${encodeURIComponent(course.name)}`} className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-300 px-3 text-sm font-bold hover:border-teal-600 dark:border-slate-600">
            📱 이 과목 QR 모음·인쇄
          </a>
          <a href={course.url} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-300 px-3 text-sm font-bold hover:border-teal-600 dark:border-slate-600">
            과목 첫 화면(학생용 단원 목록) ↗
          </a>
        </div>
      </header>

      {groups.map((g) => (
        <section key={g.part || "all"} className="mt-10" aria-labelledby={`p-${g.units[0].slug}`}>
          {g.part && (
            <h2 id={`p-${g.units[0].slug}`} className={`mb-4 text-lg font-extrabold ${t.text}`}>
              {g.part}
            </h2>
          )}
          <ul className="grid gap-5 md:grid-cols-2">
            {g.units.map((u) => (
              <li key={u.slug} className={`${card} flex flex-col overflow-hidden`}>
                <div className="flex gap-4 p-4 sm:p-5">
                  <Thumb src={assetUrl(u.thumb)} alt={u.thumbAlt} className="aspect-square w-28 shrink-0 rounded-2xl sm:w-36" />
                  <div className="min-w-0 flex-1">
                    <span className={`text-sm font-extrabold ${t.text}`}>{u.chapter}</span>
                    <h3 className="text-xl font-extrabold leading-snug">
                      <Link href={`/u/${course.repo}/${u.slug}/plan/`} className="hover:underline focus-visible:outline-4 focus-visible:outline-teal-500">
                        {u.title}
                      </Link>
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{u.summary}</p>
                  </div>
                </div>
                <div className="px-4 sm:px-5">
                  <Counts counts={u.counts} />
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2 p-4 sm:p-5">
                  <a href={u.play} className={btnPrimary} aria-label={`${u.title} 수업 열기`}>
                    수업 열기
                  </a>
                  <Link href={`/u/${course.repo}/${u.slug}/plan/`} className={btnSecondary} data-teacher>
                    지도안·QR
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
