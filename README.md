# 고등학교 과학 인터랙티브 학습 도구

고등학교 과학 과목의 **인터랙티브 학습 도구 모음**입니다. 학생은 브라우저만 있으면 되고, 설치나 회원 가입이 없습니다.

- 바로 열기: https://wmfsljy-coder.github.io/science-teacher-hub/
- 동료 교사용 안내(복제·반 코드·수업 흐름): [GUIDE.md](GUIDE.md)
- 제작 과정과 검증 방법: [MAKING.md](MAKING.md)
- 10분 시연 순서: [DEMO.md](DEMO.md)
- 성취기준 대응표와 단원별 지도안 목록: [STANDARDS.md](STANDARDS.md) (지도안은 각 단원 폴더의 `LESSON.md`)

## 내 학교에서 쓰기

1. 이 저장소를 **Fork** 하거나 *Use this template* 으로 복사합니다.
2. Settings → Pages → Branch 를 `main` / `(root)` 로 두면 몇 분 뒤 `https://<내 계정>.github.io/science-teacher-hub/` 에 열립니다.
3. **우리 반 공유**를 쓰려면 `assets/share-config.js` 의 주소를 내 Apps Script 웹 앱 주소로 바꿉니다(만드는 법: science-teacher-hub 의 [GUIDE.md](https://github.com/wmfsljy-coder/science-teacher-hub/blob/main/GUIDE.md)). 바꾸지 않으면 공유 기능만 꺼지고 나머지는 그대로 됩니다.
4. 반 목록을 고르게 하려면 `assets/share-config.js` 에 `window.STH_CLASSES = [{ v: "1-1", t: "1학년 1반" }, …]` 를 적습니다.

## 라이선스

코드는 MIT, 학습 내용은 CC BY-NC-SA 4.0 입니다. 자세한 것은 [LICENSE](LICENSE). 학습 내용 일부는 생성형 AI 의 도움으로 만들었고 교사가 검토했습니다. 오류를 발견하시면 Issues 에 남겨 주세요.

<!-- make_readme.py 로 만든 파일 -->
