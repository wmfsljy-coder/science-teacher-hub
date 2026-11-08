"use client";

import { useEffect } from "react";

/* 교사용 화면(첫 화면·QR 모음)을 연 기기는 교사 기기로 표시 — 옛 허브와 같은 약속(단원에서 '← 허브' 링크, 잠긴 곳 열림) */
export function TeacherMark() {
  useEffect(() => {
    try {
      localStorage.setItem("sth-teacher", "1");
    } catch {}
  }, []);
  return null;
}
