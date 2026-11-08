"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
const getDark = () => document.documentElement.classList.contains("dark");

/* 밝게/어둡게 바꾸는 큰 버튼 */
export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getDark, () => false);
  const flip = () => {
    const next = !getDark();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("shn-theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={flip}
      aria-pressed={dark}
      className="inline-flex min-h-12 min-w-12 items-center justify-center gap-1 rounded-xl border-2 border-slate-300 px-3 text-sm font-bold text-slate-700 hover:border-teal-600 focus-visible:outline-4 focus-visible:outline-teal-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-400 sm:text-base"
    >
      <span aria-hidden>{dark ? "☀️" : "🌙"}</span>
      <span className="hidden sm:inline">{dark ? "밝게" : "어둡게"}</span>
      <span className="sr-only sm:hidden">{dark ? "밝은 화면으로" : "어두운 화면으로"}</span>
    </button>
  );
}
