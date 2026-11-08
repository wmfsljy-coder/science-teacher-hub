# 과학 수업 허브 — 새 화면 소스 (science-teacher-hub/site)

정식 주소: **https://wmfsljy-coder.github.io/science-teacher-hub/**

고등학교 과학 12과목 44단원을 찾고, 지도안을 읽고, 학생에게 QR 로 여는 교사용 허브입니다.
단원 수업 화면은 각 과목 저장소 주소 `https://wmfsljy-coder.github.io/<저장소>/<단원>/` 가 정식이고, 이 사이트의 '수업 열기'·QR·검색 결과는 모두 그 주소로 갑니다.

## 화면 (모두 /science-teacher-hub/ 아래)
| 주소 | 하는 일 |
|-|-|
| `/` | 과목 카드 12개, 단원 즉시 검색, 학년·과목군 큰 버튼, 이 기기 진도 막대(옛 첫 화면과 같은 계산) |
| `/c/<저장소>/` | 단원 카드, 수업 열기(정식 단원 주소), 지도안·QR, 이 과목 QR 모음 |
| `/u/<저장소>/<단원>/plan/` | 지도안 전문, 수업 흐름, 차시, 성취기준, 학생 입장 QR(정식 단원 주소) |
| `/resources/` | 자료실(543곳, 즉시 찾기·과목·종류 큰 버튼, 40개씩, `#PhET`) — 옛 주소 그대로 |
| `/qr/` | 과목 전체(`/<저장소>/?all=1`)·단원·소단원 QR, 크게 띄우기, A4 6칸 인쇄, `?s=`·`?u=` — 옛 주소 그대로 |
| `/maps/` | plates.kml 안내·내려받기(`/maps/plates.kml` 그대로) |
| `/class/`, `/records/`, `/phet/`, `/assets/`, `/data/` | 저장소의 기존 파일 그대로(조립 단계가 복사) |

## 빌드와 배포
- 저장소 뿌리의 `.github/workflows/pages.yml` 이 푸시·매일 새벽 3시·손으로·'활동 목록 갱신' 커밋 뒤에 돈다.
  1. `site/` 에서 `npm ci` → `node scripts/fetch-content.mjs --clone`(과목 저장소 12개를 `.content/` 에 얕게) → lint → `npm run build`(basePath `/science-teacher-hub`)
  2. `node scripts/assemble-hub.mjs` — out/ 에 저장소의 기존 파일(assets/·class/·records/·data/·maps/·phet/ …)을 그대로 더하고, index.html·qr/·resources/ 만 새 화면. 기존 파일 목록과 하나씩 비교해 빠지면 실패
  3. `node scripts/check-units.mjs` — out/ 을 /science-teacher-hub/ 로, 과목 저장소 사본을 /<저장소>/ 로 같은 로컬 서버(공유 끔)에 띄워 정식 단원 주소에서 allcheck·quizrun·labrun·tabcheck(푸시는 표본 15단원, 새벽·손으로는 44단원). 실패하면 배포 안 함
  4. GitHub Pages(Actions) 배포
- 내 컴퓨터:
```powershell
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
cd site; npm ci
node scripts/fetch-content.mjs          # 과목 저장소는 CONTENT_DIR(기본: 허브의 상위 폴더 = 과학허브)
npm run build; node scripts/assemble-hub.mjs
node scripts/serve-out.mjs 4173 --no-share --old ..\..   # http://localhost:4173/science-teacher-hub/
$env:PW_CHANNEL="msedge"; node scripts/check-units.mjs   # 표본 점검(--all 은 전부)
```

## 되돌리기(배포가 잘못됐을 때)
Settings → Pages → Build and deployment → Source 를 **Deploy from a branch / main / (root)** 로 바꾸면 1~2분 안에 예전처럼 저장소 파일 그대로(옛 첫 화면 index.html 포함 — git 의 index.html 은 그대로 둠) 다시 보입니다. 다시 새 허브로: Source 를 **GitHub Actions** 로 돌리고 Actions → '허브 사이트 빌드와 배포' → Run workflow.

## 만든 도구
Next.js 16(App Router, 정적 내보내기) · TypeScript · Tailwind CSS v4 · react-markdown · qrcode · sharp · Playwright(점검)
