import type { NextConfig } from "next";

/* GitHub Pages 주소가 https://wmfsljy-coder.github.io/science-teacher-hub-qtrqwc/ 이므로 basePath 를 붙입니다. */
const basePath = process.env.BASE_PATH || "/science-teacher-hub-qtrqwc";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
