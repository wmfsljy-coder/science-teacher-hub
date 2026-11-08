import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import FontSize from "@/components/FontSize";
import { BASE, GITHUB } from "@/lib/content";

/* 위쪽 메뉴(늘 보이는 큰 버튼 한 줄). class/·records/ 는 옛 화면을 옮겨 담은 정적 파일이라 일반 <a> */
const NAV: { href: string; label: string; next?: boolean }[] = [
  { href: "/resources/", label: "🔎 자료실", next: true },
  { href: "/qr/", label: "📱 QR 모음", next: true },
  { href: `${BASE}/class/`, label: "📊 우리 반(교사)" },
  { href: `${BASE}/records/`, label: "🗂 학생 기록" },
  { href: "/maps/", label: "🗺 판 구조 지도", next: true },
];
const navCls =
  "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:border-teal-600 hover:text-teal-800 focus-visible:outline-4 focus-visible:outline-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-400";

export const metadata: Metadata = {
  title: { default: "과학 수업 허브", template: "%s · 과학 수업 허브" },
  description: "고등학교 과학 12과목 44단원의 인터랙티브 수업을 한곳에서 찾고, 지도안을 보고, 바로 여는 사이트",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

/* 화면이 그려지기 전에 다크 모드를 정해 깜빡임을 막습니다. */
const themeScript = `try{var f=localStorage.getItem('shn-fs');document.documentElement.style.fontSize=(f&&/^(87.5|93.75|100|112.5)%$/.test(f))?f:'93.75%'}catch(e){document.documentElement.style.fontSize='93.75%'}try{var t=localStorage.getItem('shn-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" suppressHydrationWarning className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-teal-700 focus:px-4 focus:py-3 focus:font-bold focus:text-white"
        >
          본문으로 건너뛰기
        </a>
        <header className="no-print z-30 sm:sticky sm:top-0 border-b border-slate-200 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="flex min-h-12 items-center gap-2 whitespace-nowrap rounded-xl pr-2 text-base font-extrabold tracking-tight sm:text-lg focus-visible:outline-4 focus-visible:outline-teal-500"
            >
              <span aria-hidden className="text-2xl">🔭</span>
              <span>과학 수업 허브</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <FontSize />
          <ThemeToggle />
            </div>
          </div>
          <nav aria-label="교사 도구" data-teacher className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 sm:flex-wrap sm:overflow-visible sm:px-6">
            {NAV.map((n) =>
              n.next ? (
                <Link key={n.href} href={n.href} className={navCls}>
                  {n.label}
                </Link>
              ) : (
                <a key={n.href} href={n.href} className={navCls}>
                  {n.label}
                </a>
              ),
            )}
          </nav>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="no-print border-t border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 sm:px-6">
            <p>
              44단원 수업 화면·자료실·QR 모음·교사 화면이 모두 이 사이트 안에 있습니다. 학생 진도는 옛 단원 주소와 이어집니다.
            </p>
            <p>
              코드는 MIT, 학습 내용은 CC BY-NC-SA 4.0 ·{" "}
              <a className="underline underline-offset-2 hover:text-teal-700 dark:hover:text-teal-300" href={GITHUB}>
                GitHub 저장소
              </a>{" "}
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
