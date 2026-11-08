import Link from "next/link";
import { btnPrimary } from "@/lib/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <p className="text-5xl" aria-hidden>
        🧭
      </p>
      <h1 className="mt-4 text-2xl font-extrabold">찾는 화면이 없습니다</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">주소가 바뀌었거나 없는 단원일 수 있어요.</p>
      <Link href="/" className={`${btnPrimary} mt-6`}>
        처음 화면으로
      </Link>
    </div>
  );
}
