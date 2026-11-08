# CLAUDE.md — 과학 수업 허브 새 화면(site/) 작업 규칙

@AGENTS.md

- 이 폴더는 science-teacher-hub 저장소 안의 Next.js 16 소스입니다. 결과는 https://wmfsljy-coder.github.io/science-teacher-hub/ (basePath `/science-teacher-hub`).
- 단원 정식 주소는 `https://wmfsljy-coder.github.io/<저장소>/<단원>/`. 단원을 이 사이트로 복사하지 않습니다(예전 science-hub-next 의 /u/ 복사본은 끝냄).
- 저장소 뿌리의 기존 파일(assets/·class/·records/·data/·maps/·phet/)은 주소가 그대로 열려야 합니다. 단원들이 `/science-teacher-hub/assets/…` 를 절대 주소로 부릅니다. 새 화면은 index.html·qr/·resources/ 자리만 씁니다. `scripts/assemble-hub.mjs` 가 겹침·빠짐을 막습니다.
- 시작 전 `git pull --rebase`, 고친 뒤 `npm run lint`·`npm run build`·`node scripts/assemble-hub.mjs`·`node scripts/check-units.mjs`, 커밋·푸시, `문서/작업일지.md` 에 한 문단.
- 화면 원칙: 큰 버튼(48px 이상), 드롭다운·숨은 메뉴 없음, 입력 즉시 결과, 한국어, 모바일 먼저, 밝게/어둡게.
- 점검 도구는 `localStorage.clear()` 를 부르므로 내 컴퓨터(localhost)에서만. 로컬 서버는 `--no-share` 로 공유 주소를 비웁니다.
- 학생 진도는 localStorage `sth-<단원 열쇠>`(episodes.js 의 sthUnit 값). 열쇠를 바꾸지 마세요.

## 어디에 무엇이
- `lib/courses.json` 과목 목록 · `scripts/fetch-content.mjs` 과목 저장소 읽기 → `content/generated.json`, `public/thumbs/` · `scripts/resources.mjs` 자료실 표 → `content/resources.json`
- `app/page.tsx` 첫 화면 · `app/c/[repo]` 과목 · `app/u/[repo]/[unit]/plan` 지도안·QR · `app/resources` 자료실 · `app/qr` QR 모음 · `app/maps` 판 구조 지도
- `components/Progress.tsx` 진도 막대 · `components/QrSheet.tsx` · `components/ResourceBrowser.tsx` · `components/DeviceMode.tsx`(첫 화면·QR 모음을 연 기기 = 교사 기기, 옛 허브와 같음)
- `scripts/assemble-hub.mjs` 조립 · `scripts/check-units.mjs` 점검 · `scripts/serve-out.mjs` 로컬 서버
