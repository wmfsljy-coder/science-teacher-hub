# 교과서(비상교육)에 같은 쓰임의 바깥 링크가 있으면 교과서 것을 쓴다. 교과서에 없거나 우리 것이 과제에 더 맞으면 그대로 둔다.
import re, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"
def card(id_, title, src, url, ask):
    q = lambda s: s.replace('"', '\\\\"')
    return "<div data-link='{\\\"id\\\":\\\"%s\\\",\\\"title\\\":\\\"%s\\\",\\\"src\\\":\\\"%s\\\",\\\"url\\\":\\\"%s\\\",\\\"ask\\\":\\\"%s\\\"}'></div>" % (id_, title, src, url, ask)
def swap(path, old_id, new):
    f = ROOT + path; s = open(f, encoding="utf-8", newline="").read()
    m = re.search(r"<div data-link='\{\\\"id\\\":\\\"" + re.escape(old_id) + r"\\\".*?\}'></div>", s)
    assert m, (path, old_id); s = s.replace(m.group(0), new, 1)
    open(f, "w", encoding="utf-8", newline="").write(s); print("바꿈", path, old_id)
swap("integrated-science-1/3-1/real-cases.js", "usgs-map", card("seismic-explorer", "Seismic Explorer — 지진 탐색기 (교과서 연결 자료)", "Concord Consortium · 비상교육 통합과학1 103 · 105쪽", "https://seismic-explorer.concord.org/", "판 경계(Plate boundaries) 표시를 켜고, 지진 점들이 판 경계와 어떻게 겹치는지 보세요. 지진이 가장 많이 몰린 경계 한 곳과, 한반도 둘레에 큰 지진 점이 있는지를 적어 오세요."))
swap("earth-system-2/2-1/real-cases.js", "noaa-tide", card("khoa-tide", "국립해양조사원 스마트 조석예보 (교과서 연결 자료)", "국립해양조사원 · 비상교육 지구시스템과학 78쪽", "https://www.khoa.go.kr/", "첫 화면의 ‘스마트 조석예보’에서 우리 학교와 가까운 항구(예: 진해·부산)의 오늘 만조 시각 두 개를 찾아, 그 간격이 몇 시간 몇 분인지 적고 보스턴과 비교해 오세요."))
swap("planet-space-1/1-2/real-cases.js", "exo-count", card("nasa-exoplanets", "NASA 외계 행성 탐사 (교과서 연결 자료)", "미국 항공우주국 · 비상교육 행성우주과학 141쪽", "https://science.nasa.gov/exoplanets/", "첫 화면에서 지금까지 확인된 외계 행성이 몇 개를 넘었다고 하는지 적고, 이 사례의 숫자(" + "6,375 개)와 비교해 오세요."))
f = ROOT + "planet-space-1/1-1/real-cases.js"; s = open(f, encoding="utf-8", newline="").read()
old = 'api.info("가장 최근 해는 열두 달이 다 모인 해까지만 넣었습니다. " + SRC);'
assert s.count(old) == 1
s = s.replace(old, 'api.info("가장 최근 해는 열두 달이 다 모인 해까지만 넣었습니다. " + SRC\n        + "' + card("kasa-sw", "우주항공청 우주환경센터 (교과서 연결 자료)", "우주항공청 · 비상교육 행성우주과학 18쪽", "https://spaceweather.kasa.go.kr/", "첫 화면의 ‘경보 등급’에서 지금의 R(태양 X선)·S(태양 입자)·G(지자기 폭풍) 단계를 적고, 최근 경보 알림 하나가 무엇이었는지 적어 오세요.") + '");')
open(f, "w", encoding="utf-8", newline="").write(s); print("더함 planet-space-1/1-1 kasa-sw")
