import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 빌드 때 받아 오는 과목 저장소와 생성물
    ".content/**",
    "content/**",
    "public/thumbs/**",
    // 빌드 때 옮겨 담는 옛 단원 화면·엔진(과목 저장소 원본 그대로)과 연결 파일
    "public/u/**",
    "public/engine/**",
    "public/hub-assets/**",
    "legacy/**",
  ]),
]);

export default eslintConfig;
