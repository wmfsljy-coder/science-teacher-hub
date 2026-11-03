# 그림(시뮬레이션) 디자인 지침 — '무대' 수준으로 맞추기

모든 이야기 단원의 캔버스 그림을 **행성우주과학 Ⅱ-1 「02 별까지의 거리」의 세 장면** 수준으로 맞춘다.
본보기: `planet-space-2/2-1/index.html`, `planet-space-2/2-1/episodes.js` 의
`장면: 첫 번째 자 — 연주 시차`, `장면: 손가락으로 만드는 시차`, `장면: 관측 기록` (검색어 `/* ---- 장면:`).
작업 전에 이 세 장면 코드와 `assets/kit.js` 머리말, `assets/scope.js` 머리말을 끝까지 읽는다.
이 지침은 `STORY_GUIDE.md` 위에 얹는 것이다. STORY_GUIDE 의 호환·막힘 규칙을 그대로 지킨다.

## 이미 된 것 (1단계, 손대지 않아도 됨)
- 이야기 단원 캔버스는 `cssVar()` 가 어두운 무대 색(`theme.css` 의 `.sth-stage`)을 돌려주므로, 기존 그림도 이미 어두운 남색 무대 위에 그려진다.
- `index.html` 에 `scope.js`·`kit.js` 가 연결돼 있다. `window.sthKit`(아래 K)을 바로 쓸 수 있다.

## 2단계에서 할 일 — 장면마다
1. **무대 바탕**: `paper(ctx, W, H)` 대신 `K.stage(ctx, 0, 0, W, H, 종류, { seed: 숫자, title: "무엇을 보는 그림" })`.
   종류: `space` 천체·우주 / `lab` 물리·화학·생명·그래프(격자) / `ocean` 바다 / `sky` 낮 하늘·대기 / `earth` 땅속·지층 / `night` 그 밖.
   한 캔버스에 두 관점(예: 위에서 본 모습 + 내 눈에 보이는 모습)이 있으면 무대를 둘로 나누고 사이를 8 px 띄운다.
   그 캔버스를 감싼 `<div class="canvas-wrap">` 에 `stage` 클래스를 더한다.
2. **이름표**: 그림 위 사물·점·영역 이름은 `K.pill(ctx, 글, x, y, { a, c, s, box: [왼, 오른] })`(반투명 바탕).
   눈금 숫자·작은 설명만 `K.t`. 글자가 캔버스 밖이나 무대 칸 밖으로 나가지 않게 `box` 를 준다. 글자끼리 겹치지 않게 자리를 잡는다.
3. **실감**: 빛나는 것(별·전구·불꽃·입자)은 `K.glow`, 태양 `K.sun`, 공·행성·원자 `K.planet(ctx,x,y,r,밝은색,어두운색)`, 지구 `K.earth`.
   힘·속도·흐름은 `K.arrow`, 각은 `K.wedge`(채운 부채꼴, 2p·p 처럼 서로 다른 색), 길이·폭은 `K.bracket`.
   그라데이션으로 재질을 준다(액체·금속·암석·피부·유리). 평면 단색 사각형만으로 끝내지 않는다.
4. **그래프**: `var g = K.chart(ctx, { x, y, w, h, x0, x1, y0, y1, xl, yl, xt, yt })` 후 `K.plot(ctx, g, 점들, 색, { dots })`.
   선은 빛나는 색(K.C.blue·yellow·green·red·violet), 범례는 pill, 읽어야 하는 값은 점선과 pill 로 짚어 준다.
5. **움직임**: 현상이 원래 움직이는 것(공전·파동·입자 운동·흐름·전류·대류·판 이동)이면 `K.animate(canvas, function (dt) {…})`
   로 은은하게 움직인다(약 30번/초, setTimeout — requestAnimationFrame 금지). 계속 도는 움직임에는 ⏸ 멈추기 단추를 둔다.
   `K.REDUCE`(움직임 줄이기 설정)이면 처음부터 멈춘 상태로. **움직임이 미션 판정·단추 잠금을 막으면 안 된다**(잠갔으면 반드시 푼다).
6. **읽음판(선택, 수치가 핵심인 장면)**: 캔버스 아래 `controls` 를
   `<div class="sim-side">` 로 바꾸고 `<div class="readout">`(큰 글씨 공식·값, `.k` 이름 `.v.b/.v.y/.v.g/.v.r` 값 `.sub` 보조 `.ok.g/.ok.r` 판정)과
   슬라이더를 나란히 둔다. 실제 사례 값이 있으면 `<div class="presets full">` 단추(이름·값, 교과서 밖 값이면 `<span class="tag-ref">참고 · 교과서 밖 실측값</span>`).
7. **정직**: 크기·거리·각을 과장했으면 `K.warn(ctx, x, y, "⚠ … 실제 비율이 아님")`. 실제 값만 쓰고, 확실하지 않은 수치는 쓰지 않는다.
8. **비유가 있는 장면**은 대응표(`<table class="analog">`, 왼쪽 비유 ↔ `td.sky` 실제)나 한 줄 띠(`<p class="analog-strip">`)를 붙여도 좋다.

## 색
- 무대 위 색은 `K.C.ink/mute/dim/yellow/blue/green/red/violet/orange/line/grid` 또는 기존 `v("--token")`(이미 무대 색).
- 캔버스 안에 흰 바탕(#fff 등) 칠하지 않는다. 재질 그라데이션(살색·금속·물)만 예외.

## 절대 바꾸지 않을 것
- 장면 순서, `ep.clear(n)` 번호, 미션 판정 조건, 슬라이더 id·범위·step, `sthState`/`sthGate`/`sthWork` 키, 이야기 글(말풍선·사건 파일·결말), 성취기준·오개념 상자.
  (그림 안 이름표 문구를 더 알아보기 쉽게 다듬는 것은 괜찮다. 읽음판을 넣으며 info-card 글은 그대로 둔다.)
- `assets/` 파일, 다른 단원. git 커밋·푸시 하지 않는다.

## 소단원 잇기 (단원마다 `handoff.js` 하나)
본보기: `planet-space-2/2-1/handoff.js`. 엔진 설명은 `assets/scope.js` 머리말.
1. 단원의 이야기들을 읽고 **뒤 소단원이 앞 소단원의 무엇(개념·공식·용어·값)에 기대는지** 찾는다. 기대는 것이 없으면 카드를 만들지 않는다.
2. 넘겨주는 이야기 결말에 `sthHandoff({ ep, title, lines, note })` — 챙겨 갈 것 2~3줄(공식·핵심 문장, `<b>` 강조), note 에 어디서 다시 쓰이는지.
3. 기대는 이야기에 `sthBridge({ ep, need: "0N", doneKey: "epX", lines, check })` — 그 이야기에 꼭 필요한 줄만, 이 이야기에서 어떻게 쓰이는지 한 줄, 확인 한 문제(보기 3~4개, a 는 0부터, why 짧게).
4. 첫 이야기가 아닌데 앞 소단원과 무관하게 시작해도 되는 이야기에는 필요하면 `sthBridge({ ep, always: true, title: "시작 전 1분 · …", lines, note })`.
5. `index.html` 에서 episodes.js(worked.js 가 있으면 그 다음) 바로 뒤에 `<script src="handoff.js"></script>`.
6. `lab-cases.js` 사례마다 관련 소단원을 **`about: "0N"`** 으로 단다(`sec` 아님 — `sec` 를 달면 lab.js 가 사례를 이야기 탭으로 옮겨 버린다).

## 확인 (끝내기 전에 모두)
- `node --check <단원>/episodes.js`, `node --check <단원>/handoff.js`, `python _tools/check_ids.py <저장소>/<단원>`
- 로컬 서버(배정받은 포트)에서 `/_tools/` 를 열고 allcheck · overlap · solverun 을 그 단원에 돌린다. **오류 0, 막힌곳 0, 겹침·잘림 0** 이어야 한다
  (원래부터 있던 문제면 보고에 적는다).
- 새로 그린 캔버스마다 화면을 찍어 직접 본다: 글자 겹침, 잘림, 너무 어두워 안 보이는 선, 의미가 헷갈리는 색.
- `?sec=` 로 앞 소단원을 뺀 주소를 열어 이어받기 카드가 펼쳐지는지 본다.
