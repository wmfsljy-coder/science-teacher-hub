"use client";

import { useSyncExternalStore } from "react";

/* 글자 크기 가가가가 — html 글자 기준(rem)을 바꿔 사이트 전체 글자·단추를 함께 키우고 줄인다.
   기본은 조금 작게(93.75%). 기기마다 기억(localStorage "shn-fs"). 처음 그리기 전 적용은 layout 의 themeScript. */
const SIZES = [
  { v: "87.5%", t: "아주 작게", px: 12 },
  { v: "93.75%", t: "작게(기본)", px: 14 },
  { v: "100%", t: "보통", px: 16 },
  { v: "112.5%", t: "크게", px: 18 },
];
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  return () => mo.disconnect();
}
const getFs = () => document.documentElement.style.fontSize || "93.75%";

export default function FontSize() {
  const cur = useSyncExternalStore(subscribe, getFs, () => "93.75%");
  const pick = (v: string) => {
    document.documentElement.style.setProperty("font-size", v);
    try {
      localStorage.setItem("shn-fs", v);
    } catch {}
  };
  return (
    <div role="group" aria-label="글자 크기" className="flex items-center gap-0.5 rounded-xl border-2 border-slate-300 p-0.5 dark:border-slate-600">
      {SIZES.map((z) => (
        <button
          key={z.v}
          type="button"
          title={z.t}
          aria-pressed={cur === z.v}
          onClick={() => pick(z.v)}
          style={{ fontSize: z.px }}
          className={`min-h-9 min-w-8 rounded-lg px-1.5 font-extrabold leading-none focus-visible:outline-4 focus-visible:outline-teal-500 ${
            cur === z.v ? "bg-teal-700 text-white dark:bg-teal-400 dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          가
        </button>
      ))}
    </div>
  );
}