# 지구과학·지구시스템·행성우주의 이야기 탭 이름을 통합과학처럼 교육과정 소단원명으로 바꾼다.
# 이름은 각 탭의 eyebrow("01 · 소단원명 · 이야기 한 편")에서 가져온다. 여러 번 돌려도 안전하다.
import io, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"

UNITS = ["earth-science-2/" + x for x in ["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"]] + \
        ["earth-system-1/1-1", "earth-system-1/1-2", "earth-system-2/2-1", "earth-system-2/2-2",
         "planet-space-1/1-1", "planet-space-1/1-2", "planet-space-2/2-1", "planet-space-2/2-2"]

# 가운데 점이 여러 번 들어가 탭으로는 너무 긴 이름만 줄여 쓴다.
SHORT = {
 "용승과 침강 · 엔소(ENSO)": "용승·침강과 엔소(ENSO)",
 "기후 변화의 자연적 요인과 인위적 요인": "기후 변화의 자연적·인위적 요인",
 "온실 효과와 지구 온난화 · 기후 변화 대응": "지구 온난화와 기후 변화 대응",
 "단열 변화 · 대기 안정도 · 강수 과정": "단열 변화와 대기 안정도",
 "기압의 연직 분포 · 정역학적 균형 · 연직 운동": "기압의 연직 분포와 정역학적 균형",
 "지균풍 · 경도풍 · 지상풍 · 행성파": "지균풍·경도풍과 행성파",
}

TAB = re.compile(r'(<button class="tab-btn[^"]*" data-tab="(\d+)"><span class="num">\d+</span>\s*)([^<]+)(</button>)')

for u in UNITS:
    p = ROOT + u + "/index.html"
    s = open(p, encoding="utf-8", newline="").read()
    # 탭 순서대로 eyebrow 를 모은다
    names = {}
    for m in re.finditer(r'<section class="tab-panel"[^>]*data-panel="(\d+)"(.*?)</section>', s, re.S):
        eb = re.search(r'<div class="eyebrow">([^<]+)</div>', m.group(2))
        if not eb:
            continue
        t = eb.group(1).strip()
        mm = re.match(r'^\d+\s*·\s*(.+?)\s*·\s*이야기 한 편$', t)
        if mm:
            names[m.group(1)] = SHORT.get(mm.group(1), mm.group(1))
    n = [0]
    def rep(m):
        want = names.get(m.group(2))
        if not want or m.group(3).strip() == want:
            return m.group(0)
        n[0] += 1
        return m.group(1) + want + m.group(4)
    s2 = TAB.sub(rep, s)
    if n[0]:
        open(p, "w", encoding="utf-8", newline="").write(s2)
    print("%-26s 탭 %d개 이름 바꿈" % (u, n[0]))
