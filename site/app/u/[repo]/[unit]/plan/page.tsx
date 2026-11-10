import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import Counts from "@/components/Counts";
import Markdown from "@/components/Markdown";
import QrProjector from "@/components/QrProjector";
import Thumb from "@/components/Thumb";
import { assetUrl, getCourses, getUnit } from "@/lib/content";
import { btnPrimary, btnSecondary, card, tone } from "@/lib/ui";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCourses().flatMap((c) => c.units.map((u) => ({ repo: c.repo, unit: u.slug })));
}

export async function generateMetadata({ params }: PageProps<"/u/[repo]/[unit]/plan">): Promise<Metadata> {
  const { repo, unit } = await params;
  const hit = getUnit(repo, unit);
  return {
    title: hit ? `${hit.course.name} ${hit.unit.chapter} ${hit.unit.title}` : "단원",
    description: hit?.unit.summary,
  };
}

const KIND_STYLE = {
  intro: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100",
  story: "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-100",
  step: "border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
} as const;

export default async function UnitPage({ params }: PageProps<"/u/[repo]/[unit]/plan">) {
  const { repo, unit: slug } = await params;
  const hit = getUnit(repo, slug);
  if (!hit) notFound();
  const { course, unit } = hit;
  const t = tone(course.color);
  const qrSvg = await QRCode.toString(unit.url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#ffffff" } });

  const idx = course.units.findIndex((u) => u.slug === unit.slug);
  const prev = course.units[idx - 1];
  const next = course.units[idx + 1];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <nav aria-label="위치" className="no-print mb-4 flex flex-wrap items-center gap-x-2 text-base">
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300">
          모든 과목
        </Link>
        <span aria-hidden className="text-slate-400">›</span>
        <Link
          href={`/c/${course.repo}/`}
          className="inline-flex min-h-11 items-center font-semibold text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300"
        >
          {course.name}
        </Link>
      </nav>

      {/* 머리 */}
      <header className={`${card} overflow-hidden`}>
        <div className={`h-2 ${t.bar}`} aria-hidden />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-7">
          <Thumb src={assetUrl(unit.thumb)} alt={unit.thumbAlt} className="aspect-square w-full max-w-[220px] shrink-0 rounded-3xl sm:w-48" />
          <div className="min-w-0 flex-1">
            <p className={`text-base font-extrabold ${t.text}`}>
              {course.name} · {unit.chapter}
              {unit.part ? <span className="font-semibold text-slate-500 dark:text-slate-400"> · {unit.part}</span> : null}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">{unit.title}</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">{unit.summary}</p>
            <div className="mt-4">
              <Counts counts={unit.counts} size="md" />
            </div>
            <div className="no-print mt-5 grid gap-2 sm:grid-cols-2 lg:max-w-xl">
              <a href={unit.play} className={btnPrimary}>
                수업 열기(학생 화면)
              </a>
              <a href={`${unit.play}?open=1`} className={btnSecondary}>
                교사 미리 보기(모두 열기)
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          {/* 수업 흐름 */}
          <section className={`${card} p-5 sm:p-6`} aria-labelledby="flow-h">
            <h2 id="flow-h" className="text-xl font-extrabold">
              수업 흐름
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">단원 화면의 탭 순서입니다. 노란색은 사전 점검, 초록색은 이야기(1편 = 1차시 권장).</p>
            <ol className="mt-4 flex flex-wrap items-center gap-2">
              {unit.flow.map((f, i) => (
                <li key={`${f.label}-${i}`} className="flex items-center gap-2">
                  <span className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border-2 px-3 text-base font-bold ${KIND_STYLE[f.kind]}`}>
                    <span className="text-xs font-extrabold opacity-60">{String(i).padStart(2, "0")}</span>
                    {f.label}
                  </span>
                  {i < unit.flow.length - 1 && (
                    <span aria-hidden className="text-slate-400">
                      →
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* 차시 한눈에 */}
          {unit.periods.length > 0 && (
            <section className={`${card} p-5 sm:p-6`} aria-labelledby="period-h">
              <h2 id="period-h" className="text-xl font-extrabold">
                차시 한눈에
              </h2>
              <ol className="mt-4 grid gap-3 sm:grid-cols-2">
                {unit.periods.map((p) => (
                  <li key={p.n} className={`rounded-2xl p-4 ${t.soft}`}>
                    <p className={`text-sm font-extrabold ${t.text}`}>
                      {p.n}차시{p.topic ? ` · ${p.topic}` : ""}
                    </p>
                    <p className="mt-0.5 text-lg font-bold leading-snug">{p.title}</p>
                    {p.terms.length > 0 && (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-semibold">핵심 용어</span> {p.terms.join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* 지도안 전문 */}
          <section className={`${card} p-5 sm:p-7`} aria-labelledby="lesson-h">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="lesson-h" className="text-xl font-extrabold">
                지도안
              </h2>
              <a
                href={`https://github.com/wmfsljy-coder/${course.pages ?? course.repo}/blob/main/${unit.slug}/LESSON.md`}
                target="_blank"
                rel="noopener"
                className="no-print text-sm font-semibold text-slate-500 underline underline-offset-2 hover:text-teal-700 dark:text-slate-400"
              >
                원본 LESSON.md ↗
              </a>
            </div>
            {unit.lesson ? (
              <Markdown>{unit.lesson}</Markdown>
            ) : (
              <p className="mt-3 text-slate-500">이 단원에는 아직 지도안이 없습니다.</p>
            )}
          </section>
        </div>

        {/* 옆 칸: QR · 성취기준 · 링크 */}
        <aside className="order-first space-y-6 lg:sticky lg:top-24 lg:order-none lg:self-start">
          <section className={`${card} no-print p-5`} aria-labelledby="qr-h">
            <h2 id="qr-h" className="mb-3 text-lg font-extrabold">
              학생 입장 QR
            </h2>
            <QrProjector svg={qrSvg} url={unit.url} title={`${course.name} ${unit.chapter} ${unit.title}`} />
          </section>

          {unit.standards.length > 0 && (
            <section className={`${card} p-5`} aria-labelledby="std-h">
              <h2 id="std-h" className="mb-3 text-lg font-extrabold">
                성취기준
              </h2>
              <ul className="space-y-3">
                {unit.standards.map((s) => (
                  <li key={s.code} className="text-sm leading-relaxed">
                    <span className={`mb-1 inline-block rounded-lg px-2 py-0.5 text-xs font-extrabold ${t.badge}`}>{s.code}</span>
                    <p className="text-slate-700 dark:text-slate-300">{s.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={`${card} no-print p-5`} aria-labelledby="link-h">
            <h2 id="link-h" className="mb-3 text-lg font-extrabold">
              다른 곳으로
            </h2>
            <div className="grid gap-2">
              {prev && (
                <Link href={`/u/${course.repo}/${prev.slug}/plan/`} className="flex min-h-12 items-center rounded-xl border-2 border-slate-200 px-3 text-sm font-bold hover:border-teal-600 dark:border-slate-700">
                  ← {prev.chapter} {prev.title}
                </Link>
              )}
              {next && (
                <Link href={`/u/${course.repo}/${next.slug}/plan/`} className="flex min-h-12 items-center rounded-xl border-2 border-slate-200 px-3 text-sm font-bold hover:border-teal-600 dark:border-slate-700">
                  {next.chapter} {next.title} →
                </Link>
              )}
              <a href={course.url} className="flex min-h-12 items-center rounded-xl border-2 border-slate-200 px-3 text-sm font-bold hover:border-teal-600 dark:border-slate-700">
                과목 첫 화면(학생용) ↗
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
