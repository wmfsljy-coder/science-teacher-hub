/* 과목 색. Tailwind 가 찾을 수 있도록 클래스 이름을 통째로 적어 둡니다. */
export type Tone = { badge: string; ring: string; bar: string; soft: string; text: string };

const TONES: Record<string, Tone> = {
  teal: {
    badge: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200",
    ring: "hover:border-teal-500 focus-visible:border-teal-500",
    bar: "bg-teal-500",
    soft: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
  },
  sky: {
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200",
    ring: "hover:border-sky-500 focus-visible:border-sky-500",
    bar: "bg-sky-500",
    soft: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
  },
  emerald: {
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
    ring: "hover:border-emerald-500 focus-visible:border-emerald-500",
    bar: "bg-emerald-500",
    soft: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200",
    ring: "hover:border-amber-500 focus-visible:border-amber-500",
    bar: "bg-amber-500",
    soft: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
  },
  violet: {
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200",
    ring: "hover:border-violet-500 focus-visible:border-violet-500",
    bar: "bg-violet-500",
    soft: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
  },
  rose: {
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
    ring: "hover:border-rose-500 focus-visible:border-rose-500",
    bar: "bg-rose-500",
    soft: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
  },
};

export function tone(color: string): Tone {
  return TONES[color] ?? TONES.teal;
}

/* 큰 버튼 모양(모든 페이지 공통) */
export const btnPrimary =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-6 text-lg font-bold text-white shadow-sm transition hover:bg-teal-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500 active:scale-[.98] dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400";
export const btnSecondary =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-white px-6 text-lg font-bold text-slate-800 transition hover:border-teal-600 hover:text-teal-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-teal-500 active:scale-[.98] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-400 dark:hover:text-teal-200";
export const card =
  "rounded-3xl border-2 border-slate-200 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900";
