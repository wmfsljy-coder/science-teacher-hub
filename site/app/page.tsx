import HomeBrowser, { type CourseCardData, type SearchItem } from "@/components/HomeBrowser";
import { TeacherMark } from "@/components/DeviceMode";
import { ProgressSummary } from "@/components/Progress";
import { assetUrl, getCourses } from "@/lib/content";

export default function Home() {
  const courses = getCourses();
  const unitTotal = courses.reduce((n, c) => n + c.units.length, 0);

  const courseCards: CourseCardData[] = courses.map((c) => ({
    repo: c.repo,
    name: c.name,
    family: c.family,
    category: c.category,
    grade: c.grade,
    emoji: c.emoji,
    color: c.color,
    description: c.description,
    unitCount: c.units.length,
    keys: c.units.map((u) => u.key).filter(Boolean),
    thumbs: c.units.slice(0, 3).map((u) => assetUrl(u.thumb)),
  }));

  const items: SearchItem[] = courses.flatMap((c) =>
    c.units.map((u) => ({
      id: u.id,
      repo: c.repo,
      slug: u.slug,
      courseName: c.name,
      family: c.family,
      grade: c.grade,
      color: c.color,
      chapter: u.chapter,
      title: u.title,
      summary: u.summary,
      url: u.url,
      play: u.play,
      unitKey: u.key,
      thumb: assetUrl(u.thumb),
      thumbAlt: u.thumbAlt,
      codes: u.standards.map((s) => s.code),
      hay: [
        c.name,
        c.family,
        u.chapter,
        u.title,
        u.part,
        u.summary,
        ...u.topics,
        ...u.standards.map((s) => `${s.code} ${s.text}`),
        ...u.periods.map((p) => `${p.title} ${p.topic} ${p.terms.join(" ")}`),
        ...u.flow.filter((f) => f.kind === "story").map((f) => f.label),
      ]
        .join(" ")
        .toLowerCase(),
    })),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <section className="mb-8">
        <p className="text-sm font-bold text-teal-700 dark:text-teal-300">2022 개정 교육과정 · 고등학교 과학</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-balance sm:text-4xl">
          수업할 단원을 찾고, 바로 여세요
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
          {courses.length}과목 {unitTotal}단원. 지도안을 읽고, 학생에게 QR로 단원을 띄우고, &lsquo;수업 열기&rsquo;로 시작합니다.
        </p>
      </section>
      <TeacherMark />
      <div className="mb-6">
        <ProgressSummary keys={courses.flatMap((c) => c.units.map((u) => u.key)).filter(Boolean)} />
      </div>
      <HomeBrowser courses={courseCards} items={items} />
    </div>
  );
}
