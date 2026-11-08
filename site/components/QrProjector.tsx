"use client";

import { useRef, useState, type KeyboardEvent } from "react";

/* 학생 입장 QR. '크게 띄우기'를 누르면 네이티브 <dialog>(showModal)로 화면 가득 보여 줍니다.
 * - showModal: 배경은 자동으로 inert(누를 수도, 초점이 갈 수도 없음)
 * - Tab/Shift+Tab: 창 안 버튼끼리만 돌도록 한 번 더 가둠
 * - Esc 또는 바깥(배경) 누르기: 닫기 → '크게 띄우기' 버튼으로 초점 되돌림 */
export default function QrProjector({ svg, url, title }: { svg: string; url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
  };

  const close = () => {
    const d = dialogRef.current;
    if (d?.open) d.close();
  };

  /* close 이벤트(Esc·닫기 버튼·배경 클릭 모두 여기로 옴) */
  const onClosed = () => {
    document.body.style.overflow = "";
    openerRef.current?.focus();
  };

  const trapTab = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])"),
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !e.currentTarget.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !e.currentTarget.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[240px] rounded-2xl bg-white p-3" role="img" aria-label={`${title} 학생용 주소 QR 코드`}>
        <div className="[&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <p className="mt-2 break-all text-center text-xs text-slate-500 dark:text-slate-400">{url}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          ref={openerRef}
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          className="min-h-12 rounded-xl bg-slate-900 px-3 text-base font-bold text-white hover:bg-slate-700 focus-visible:outline-4 focus-visible:outline-teal-500 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          크게 띄우기
        </button>
        <button
          type="button"
          onClick={copy}
          className="min-h-12 rounded-xl border-2 border-slate-300 px-3 text-base font-bold hover:border-teal-600 focus-visible:outline-4 focus-visible:outline-teal-500 dark:border-slate-600"
        >
          {copied ? "복사했어요" : "주소 복사"}
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-label="학생 입장 QR 크게 보기"
        onClose={onClosed}
        onKeyDown={trapTab}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-dvw max-w-none flex-col items-center justify-center gap-4 bg-white p-6 text-slate-900 backdrop:bg-slate-950/70 open:flex"
      >
        <p className="text-center text-2xl font-extrabold sm:text-4xl">{title}</p>
        <div
          aria-hidden
          className="aspect-square w-[min(80vw,65vh)] [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <p className="break-all text-center text-lg font-semibold sm:text-2xl">{url}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={copy}
            className="min-h-14 rounded-2xl border-2 border-slate-300 px-6 text-xl font-bold focus-visible:outline-4 focus-visible:outline-teal-500"
          >
            {copied ? "복사했어요" : "주소 복사"}
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="min-h-14 rounded-2xl bg-slate-900 px-8 text-xl font-bold text-white focus-visible:outline-4 focus-visible:outline-teal-500"
          >
            닫기 (Esc)
          </button>
        </div>
      </dialog>
    </>
  );
}
