"use client";

import { useSyncExternalStore } from "react";

/* 학생 기기의 진도(localStorage "sth-<단원 열쇠>")를 읽어 막대로 보여 줍니다.
 * 계산은 옛 허브 첫 화면(doneOf)과 같습니다: 쓴 글(w) 중 10글자 이상이 하나라도 있거나, 상태(s) 중 참인 값이 하나라도 있으면 '기록 있음'.
 * 같은 주소 바탕(wmfsljy-coder.github.io)이라 옛 단원 주소에서 한 기록도 그대로 보입니다. */
export function doneOf(key: string): boolean {
  try {
    const o = JSON.parse(localStorage.getItem("sth-" + key) || "{}");
    const w = o.w || {};
    for (const k in w) if (w[k] && String(w[k]).trim().length >= 10) return true;
    const s = o.s || {};
    for (const k in s) if (s[k]) return true;
  } catch {}
  return false;
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("pageshow", cb);
  window.addEventListener("focus", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("pageshow", cb);
    window.removeEventListener("focus", cb);
  };
}

/* 기록 있는 열쇠들을 글자 하나로(값이 같으면 다시 그리지 않음). 서버 그림에서는 null */
function useDoneKeys(keys: string[]): Set<string> | null {
  const snap = useSyncExternalStore(
    subscribe,
    () => keys.filter(doneOf).join(","),
    () => null,
  );
  return snap === null ? null : new Set(snap ? snap.split(",") : []);
}

/* 첫 화면 맨 위: 전체 진도 */
export function ProgressSummary({ keys }: { keys: string[] }) {
  const done = useDoneKeys(keys);
  const n = done?.size ?? 0;
  const pct = keys.length ? Math.round((n / keys.length) * 100) : 0;
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-bold">이 기기의 학습 기록</p>
        <p className="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {done === null ? "읽는 중…" : n ? (
            <>
              <b className="text-teal-700 dark:text-teal-300">{n}개</b> 단원 기록됨 · 전체 {keys.length}개
            </>
          ) : (
            `아직 기록이 없습니다 · 전체 ${keys.length}개 단원`
          )}
        </p>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label="기록한 단원 비율"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-teal-600 transition-[width] dark:bg-teal-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* 과목 카드 안: 그 과목 진도 */
export function CourseProgress({ keys, barClass }: { keys: string[]; barClass: string }) {
  const done = useDoneKeys(keys);
  const n = done?.size ?? 0;
  return (
    <div className="mt-3 flex items-center gap-2" aria-label={`이 기기 기록 ${n} / ${keys.length} 단원`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden>
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${keys.length ? (n / keys.length) * 100 : 0}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums text-slate-500 dark:text-slate-400">
        {done === null ? "–" : n} / {keys.length}
      </span>
    </div>
  );
}

/* 단원 하나: 기록 있으면 작은 표시 */
export function DoneBadge({ unitKey }: { unitKey: string }) {
  const done = useDoneKeys([unitKey]);
  if (!done?.size) return null;
  return <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">기록 있음</span>;
}
