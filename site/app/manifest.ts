import type { MetadataRoute } from "next";
import { BASE } from "@/lib/content";

/* 홈 화면 아이콘(2026-11-08): 지구 + 원자 궤도, 청록. 원본 그림은 app/icon.svg */
export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "과학 수업 허브",
    short_name: "과학 허브",
    description: "고등학교 과학 12과목 44단원 인터랙티브 수업 모음",
    start_url: `${BASE}/`,
    scope: `${BASE}/`,
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0B5E58",
    lang: "ko",
    icons: [
      { src: `${BASE}/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${BASE}/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${BASE}/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}