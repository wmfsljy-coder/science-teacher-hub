/* 단원 대표 그림(빌드 때 줄인 작은 그림). 정적 사이트라 next/image 대신 img 를 씁니다. */
export default function Thumb({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div aria-hidden className={`grid place-items-center bg-slate-100 text-4xl dark:bg-slate-800 ${className}`}>
        🔭
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={480} height={480} loading="lazy" decoding="async" className={`object-cover ${className}`} />
  );
}
