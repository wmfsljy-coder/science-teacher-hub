import type { Counts as C } from "@/lib/content";

/* 단원 구성 숫자(이야기·문제·실험실…)를 작은 칩으로 */
export default function Counts({ counts, size = "sm" }: { counts: C; size?: "sm" | "md" }) {
  const list: [string, number | null, string][] = [
    ["📖", counts.stories, "이야기 {n}편"],
    ["✅", counts.quiz, "문제 {n}"],
    ["🧪", counts.labs, "실험실 {n}"],
    ["📊", counts.real, "실제 자료 {n}"],
    ["🤔", counts.precheck, "사전 점검 {n}"],
  ];
  const cls =
    size === "md"
      ? "rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold dark:bg-slate-800"
      : "rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-800";
  return (
    <ul className="flex flex-wrap gap-1.5 text-slate-700 dark:text-slate-300">
      {list
        .filter(([, n]) => n != null)
        .map(([icon, n, label]) => (
          <li key={label} className={cls}>
            <span aria-hidden>{icon} </span>
            {label.replace("{n}", String(n))}
          </li>
        ))}
    </ul>
  );
}
