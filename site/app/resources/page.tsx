import type { Metadata } from "next";
import ResourceBrowser from "@/components/ResourceBrowser";
import { getResources } from "@/lib/content";

export const metadata: Metadata = {
  title: "자료실",
  description: "단원 본문에 붙인 '진짜 보기' 자료(인물·법칙 카드, 지명, PhET, 3D 분자·화석, 실제 자료 그래프 등)를 과목·종류별로 찾기",
};

export default function ResourcesPage() {
  const { rows } = getResources();
  const subjects = [...new Set(rows.map((r) => r.s))];
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <h1 className="text-3xl font-extrabold tracking-tight">🔎 자료실 — 진짜 보기 자료</h1>
      <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
        단원 본문에 붙인 단추와 상자를 모두 모았습니다({rows.length}곳). 초록 단추는 그 자료로, 흰 단추는 그 단원(탭)으로 바로 갑니다. 학생은 본문에서 낱말을 누르거나 문단 아래 &lsquo;더 해 보기&rsquo; 상자를 엽니다. 기록·채점은 없습니다.
      </p>
      <div className="mt-6">
        <ResourceBrowser rows={rows} subjects={subjects} />
      </div>
    </div>
  );
}
