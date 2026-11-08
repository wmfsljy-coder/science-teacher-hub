import type { Metadata } from "next";
import { TeacherMark } from "@/components/DeviceMode";
import QrSheet, { type QrCourse } from "@/components/QrSheet";
import { getCourses } from "@/lib/content";

export const metadata: Metadata = {
  title: "학생 입장 QR 모음",
  description: "과목 전체·단원·소단원별 학생 입장 QR — 크게 띄우기, A4 인쇄",
};

export default function QrPage() {
  const courses: QrCourse[] = getCourses().map((c) => ({
    repo: c.repo,
    name: c.name,
    allUrl: c.allUrl,
    units: c.units.map((u) => ({ slug: u.slug, chapter: u.chapter, title: u.title, url: u.url, sections: u.sections })),
  }));
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <TeacherMark />
      <div className="no-print">
        <h1 className="text-3xl font-extrabold tracking-tight">📱 학생 입장 QR 모음</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
          과목 맨 앞의 ‘과목 전체’ QR 을 찍으면 그 과목의 단원 목록이 열리고, 학생이 단원을 골라 들어갑니다. 오늘 수업할 소단원 QR 을 띄우거나 인쇄해 나눠 주세요. 단원을 처음부터 시작할 때는 ‘단원 전체’ QR(00 들어가기부터)을 씁니다.
        </p>
      </div>
      <div className="mt-6">
        <QrSheet courses={courses} />
      </div>
    </div>
  );
}
