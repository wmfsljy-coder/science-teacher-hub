/*
 * 빌드할 때만 쓰는 내용 읽기 도구.
 * scripts/fetch-content.mjs 가 만든 content/generated.json 을 읽어 페이지에 넘깁니다.
 * (내용 폴더 위치는 CONTENT_DIR 환경 변수로 정하며, 스크립트가 처리합니다.)
 */
import fs from "node:fs";
import path from "node:path";

export const GITHUB = "https://github.com/wmfsljy-coder/science-teacher-hub-qtrqwc";
/** basePath (일반 <a> 링크·정적 파일 주소에 붙임) */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export type FlowStep = { label: string; kind: "intro" | "story" | "step" };
export type Standard = { code: string; text: string };
export type Period = { n: number; title: string; topic: string; terms: string[] };
export type Counts = {
  stories: number | null;
  quiz: number | null;
  labs: number | null;
  real: number | null;
  precheck: number | null;
};

export type Unit = {
  id: string;
  repo: string;
  slug: string;
  chapter: string;
  title: string;
  part: string;
  summary: string;
  topics: string[];
  /** 정식 단원 주소(QR용, 절대 주소): https://wmfsljy-coder.github.io/<저장소>/<단원>/ */
  url: string;
  /** 같은 사이트 안 단원 주소 /<저장소>/<단원>/ (일반 <a> 링크용 — basePath 밖이라 next/link 쓰지 않음) */
  play: string;
  /** 진도 열쇠: localStorage "sth-<key>" (episodes.js 의 sthUnit 값) */
  key: string;
  /** 소단원 [번호, 이름] — QR 모음용 */
  sections: [string, string][];
  thumb: string | null;
  thumbAlt: string;
  counts: Counts;
  standards: Standard[];
  periods: Period[];
  flow: FlowStep[];
  lesson: string;
};

export type Course = {
  repo: string;
  name: string;
  family: string;
  category: string;
  grade: string;
  emoji: string;
  color: string;
  landing: string | null;
  description: string;
  /** 과목 첫 화면(과목 저장소) */
  url: string;
  /** 과목 전체 QR 주소(?all=1) */
  allUrl: string;
  units: Unit[];
};

type Generated = { generatedAt: string; courses: Course[] };

let cache: Generated | null = null;

function load(): Generated {
  if (cache) return cache;
  const file = path.join(process.cwd(), "content", "generated.json");
  if (!fs.existsSync(file)) {
    throw new Error("content/generated.json 이 없습니다. 먼저 `node scripts/fetch-content.mjs` 를 실행하세요.");
  }
  cache = JSON.parse(fs.readFileSync(file, "utf8")) as Generated;
  return cache;
}

export function getCourses(): Course[] {
  return load().courses;
}

export function getCourse(repo: string): Course | undefined {
  return getCourses().find((c) => c.repo === repo);
}

export function getUnit(repo: string, slug: string): { course: Course; unit: Unit } | undefined {
  const course = getCourse(repo);
  const unit = course?.units.find((u) => u.slug === slug);
  return course && unit ? { course, unit } : undefined;
}

export function getAllUnits(): Unit[] {
  return getCourses().flatMap((c) => c.units);
}

export function generatedAt(): string {
  return load().generatedAt;
}

/* 이미지 주소: 우리 사이트 안 파일이면 basePath 를 붙입니다. */
export function assetUrl(src: string | null): string | null {
  if (!src) return null;
  return src.startsWith("/") ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${src}` : src;
}

/* 자료실(옛 허브 resources/ 표를 빌드 때 읽은 것) */
export type ResourceRow = {
  s: string;
  g: string;
  repo: string;
  unit: string;
  play: string;
  unitLabel: string;
  tab: string;
  kind: string;
  word: string;
  links: { href: string; text: string }[];
  open: string;
  note: string;
};

export function getResources(): { intro: string; rows: ResourceRow[] } {
  const file = path.join(process.cwd(), "content", "resources.json");
  if (!fs.existsSync(file)) return { intro: "", rows: [] };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}