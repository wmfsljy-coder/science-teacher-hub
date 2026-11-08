import type { Metadata } from "next";
import { BASE, getUnit } from "@/lib/content";
import { btnPrimary, btnSecondary, card } from "@/lib/ui";

export const metadata: Metadata = {
  title: "판 구조 지도",
  description: "판 경계 KML(plates.kml) 내려받기와 구글 내 지도에 올리는 방법",
};

const MAP_ID = "15PN10J5cnnwi0bF_vb08MdVo26GHfA0";
const USED = [
  ["integrated-science-1", "3-1"],
  ["earth-system-1", "1-2"],
] as const;

export default function MapsPage() {
  const used = USED.map(([r, u]) => getUnit(r, u)).filter((x) => !!x);
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <h1 className="text-3xl font-extrabold tracking-tight">🗺 판 구조 지도 (plates.kml)</h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
        구글 내 지도(My Maps)에 가져와 쓰는 판 경계 지도입니다. 단원 쪽의 🗺 단추가 이 지도를 페이지 안에 띄웁니다.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a href={`https://www.google.com/maps/d/viewer?mid=${MAP_ID}`} target="_blank" rel="noopener" className={btnPrimary}>
          지금 쓰는 지도 열기 ↗
        </a>
        <a href={`${BASE}/maps/plates.kml`} download className={btnSecondary}>
          plates.kml 내려받기
        </a>
      </div>

      <section className={`${card} mt-8 p-5 sm:p-6`}>
        <h2 className="text-xl font-extrabold">들어 있는 것</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-6 leading-relaxed">
          <li>
            <b>판 경계 360줄</b>, 세 층: 발산형(빨강, 해령·열곡대) · 수렴형(파랑, 해구·충돌대) · 보존형(초록, 변환 단층)
          </li>
          <li>
            <b>판 이름 20곳</b>: 유라시아판, 태평양판, 필리핀판, 인도-오스트레일리아판 등
          </li>
          <li>
            <b>이름 있는 지형 28곳</b>: 해구 12곳(마리아나 해구 챌린저 해연 등), 해령·열곡대 7곳, 변환 단층·충돌대 5곳, 열점 4곳 — 어떤 판이 어떻게 만나는지 설명이 달려 있습니다.
          </li>
        </ul>
        <h2 className="mt-6 text-xl font-extrabold">쓰는 단원</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {used.map((h) => (
            <li key={h.unit.id}>
              <a href={h.unit.play} className="inline-flex min-h-12 items-center rounded-xl border-2 border-slate-300 px-4 font-bold hover:border-teal-600 dark:border-slate-600">
                {h.course.name} {h.unit.chapter} {h.unit.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} mt-6 p-5 sm:p-6`}>
        <h2 className="text-xl font-extrabold">구글 내 지도에 다시 올리기 (한 번만)</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-6 leading-relaxed">
          <li>
            <a className="underline" href="https://www.google.com/mymaps" target="_blank" rel="noopener">
              google.com/mymaps
            </a>
            에서 <b>새 지도 만들기</b>
          </li>
          <li>
            첫 레이어에서 <b>가져오기</b> → 내려받은 <code>plates.kml</code> 올리기
          </li>
          <li>
            레이어마다 <b>스타일 → 라벨 설정 → 이름</b>
          </li>
          <li>
            <b>공유 → 링크가 있는 모든 사용자 → 보기 가능</b>
          </li>
          <li>
            주소의 <code>mid=</code> 뒤 값(지도 ID)을 단원 쪽 <code>data-view=&quot;mymap:지도ID|위도,경도|줌&quot;</code> 에 넣기(같은 지도에서 레이어만 바꾸면 ID 는 그대로)
          </li>
        </ol>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          출처: Bird, P. (2003) An updated digital model of plate boundaries, G³ 4(3), 1027 — PB2002. 변환본 Hugo Ahlenius·Nordpil(Open Data Commons Attribution). 교과서 지도에 맞춰 작은 판을 큰 판으로 묶었고, 지형 위치는 어림값입니다.
        </p>
      </section>
    </div>
  );
}
