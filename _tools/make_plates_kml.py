# 쓰는 법: PB2002_steps.json 을 github.com/fraxen/tectonicplates (GeoJSON 폴더)에서 받은 폴더를 첫 인자로,
#   python _tools/make_plates_kml.py <받은 폴더> maps/plates.kml
# PB2002(Bird 2003) 판 경계를 교과서식 큰 판으로 묶어 KML 로 만든다 — 구글 내 지도(My Maps) 가져오기용
import json, sys, collections
D = sys.argv[1]; OUT = sys.argv[2]
steps = json.load(open(D + '/PB2002_steps.json', encoding='utf-8'))['features']

# 작은 판을 교과서의 큰 판으로 묶는다(같은 묶음 사이의 경계는 그리지 않는다)
MERGE = {'AM': 'EU', 'YA': 'EU', 'ON': 'EU', 'SU': 'EU', 'BU': 'EU', 'AS': 'EU',
         'OK': 'NA', 'IN': 'IA', 'AU': 'IA', 'TO': 'IA', 'KE': 'IA', 'NI': 'IA', 'FT': 'IA', 'MO': 'IA', 'BH': 'IA',
         'TI': 'IA', 'WL': 'IA', 'SB': 'IA', 'SS': 'IA', 'NB': 'IA', 'MN': 'IA', 'NH': 'IA', 'CR': 'IA', 'BR': 'IA',
         'BS': 'IA', 'MS': 'IA', 'MA': 'PS', 'CL': 'PA', 'ND': 'SA', 'AP': 'SA', 'PM': 'CA', 'EA': 'NZ', 'JZ': 'NZ',
         'GP': 'NZ', 'RI': 'CO', 'SW': 'SC', 'SL': 'SC'}
KO = {'EU': '유라시아판', 'PA': '태평양판', 'NA': '북아메리카판', 'SA': '남아메리카판', 'AF': '아프리카판', 'IA': '인도-오스트레일리아판',
      'AN': '남극판', 'PS': '필리핀판', 'NZ': '나스카판', 'CO': '코코스판', 'CA': '카리브판', 'AR': '아라비아판', 'SC': '스코샤판',
      'JF': '후안데푸카판', 'SO': '소말리아판', 'AT': '아나톨리아판'}
KIND = {'OSR': 'div', 'CRB': 'div', 'OTF': 'tra', 'CTF': 'tra', 'SUB': 'con', 'OCB': 'con', 'CCB': 'con'}
KNAME = {'div': '발산형 경계', 'con': '수렴형 경계', 'tra': '보존형 경계'}
KDESC = {'div': '두 판이 멀어지는 곳 — 해령·열곡대, 새 지각이 생긴다', 'con': '두 판이 가까워지는 곳 — 해구(섭입)·습곡 산맥(충돌)',
         'tra': '두 판이 어긋나는 곳 — 변환 단층, 지각이 생기지도 사라지지도 않는다'}
# KML 색은 aabbggrr
COL = {'div': 'ff1e1ee6', 'con': 'ffd2641e', 'tra': 'ff28a028'}

def m(c): return MERGE.get(c, c)
lines = collections.defaultdict(list)          # (경계 이름, 종류) → [[점들], …]
ST = sorted(steps, key=lambda f: (f['properties']['PLATEBOUND'], f['properties']['SEQNUM']))
K = [KIND.get(f['properties']['STEPCLASS']) for f in ST]
# 해령 사이의 짧은 변환 단층(합 300 km 미만)은 해령(발산)으로 그린다 — 교과서 지도처럼 해령이 한 줄로 보이게
i = 0
while i < len(ST):
    if K[i] == 'tra':
        bnd = ST[i]['properties']['PLATEBOUND']; j = i; L = 0
        while j < len(ST) and K[j] == 'tra' and ST[j]['properties']['PLATEBOUND'] == bnd:
            L += ST[j]['properties']['STEPLENGTH']; j += 1
        before = i > 0 and K[i - 1] == 'div' and ST[i - 1]['properties']['PLATEBOUND'] == bnd
        after = j < len(ST) and K[j] == 'div' and ST[j]['properties']['PLATEBOUND'] == bnd
        if before and after and L < 300:
            for t in range(i, j): K[t] = 'div'
        i = j
    else: i += 1
for f, k in zip(ST, K):
    p = f['properties']; a, b = p['PLATEBOUND'].replace('\\', '-').replace('/', '-').split('-')[:2]
    A, B = sorted([m(a), m(b)])
    if A == B: continue
    if not k: continue
    key = (A, B, k)
    s0, s1 = (round(p['STARTLONG'], 3), round(p['STARTLAT'], 3)), (round(p['FINALLONG'], 3), round(p['FINALLAT'], 3))
    if abs(s0[0] - s1[0]) > 180: continue          # 날짜 변경선을 건너는 한 걸음은 뺀다
    L = lines[key]
    if L and L[-1][-1] == s0: L[-1].append(s1)
    else: L.append([s0, s1])

# 판 이름 자리(교과서 지도에서 판 안쪽)
LABEL = [('EU', 55, 85), ('EU', 56, 32), ('PA', 0, -150), ('PA', 22, 176), ('NA', 52, -100), ('SA', -12, -55), ('AF', 5, 15),
         ('IA', -25, 128), ('IA', -10, 80), ('AN', -76, 40), ('AN', -72, -120), ('PS', 18, 133), ('NZ', -18, -90), ('CO', 7, -96),
         ('CA', 15, -75), ('AR', 22, 47), ('SC', -58, -45), ('JF', 46, -128), ('SO', -15, 45), ('AT', 38.6, 35.5)]
# 이름이 있는 지형 — (이름, 위도, 경도, 설명)
FEAT = {
 '해구': [('마리아나 해구 (챌린저 해연)', 11.373, 142.592, '태평양판이 필리핀판 아래로 섭입. 가장 깊은 곳 약 10,900 m — 지구에서 가장 깊은 바다'),
          ('일본 해구', 38.5, 143.9, '태평양판이 북아메리카판(오호츠크) 아래로 섭입. 2011년 도호쿠 지진(규모 9.0)'),
          ('이즈·오가사와라 해구', 30.0, 142.5, '태평양판이 필리핀판 아래로 섭입'),
          ('쿠릴·캄차카 해구', 46.0, 154.0, '태평양판이 북아메리카판 아래로 섭입'),
          ('알류샨 해구', 51.0, -175.0, '태평양판이 북아메리카판 아래로 섭입'),
          ('필리핀 해구', 10.0, 127.0, '필리핀판이 유라시아판 아래로 섭입'),
          ('자바(순다) 해구', -10.5, 110.0, '인도-오스트레일리아판이 유라시아판 아래로 섭입. 2004년 수마트라 지진'),
          ('통가 해구', -23.25, -174.73, '태평양판이 인도-오스트레일리아판 아래로 섭입. 깊이 약 10,800 m'),
          ('케르마데크 해구', -31.0, -177.0, '태평양판이 인도-오스트레일리아판 아래로 섭입'),
          ('페루·칠레(아타카마) 해구', -23.0, -71.5, '나스카판이 남아메리카판 아래로 섭입 → 안데스 산맥'),
          ('중앙아메리카 해구', 14.0, -93.0, '코코스판이 북아메리카·카리브판 아래로 섭입'),
          ('푸에르토리코 해구', 19.8, -66.0, '대서양에서 가장 깊은 곳(약 8,400 m)')],
 '해령·열곡대': [('대서양 중앙 해령', 30.0, -42.0, '북아메리카판·유라시아판(북쪽), 남아메리카판·아프리카판(남쪽)이 멀어진다. 한쪽으로 해마다 약 1~2.5 cm'),
          ('동태평양 해령', -20.0, -113.0, '태평양판과 나스카판이 멀어진다. 확장 속도가 빠른 해령(한쪽 약 6~8 cm/년)'),
          ('인도양 중앙 해령', -15.0, 66.5, '아프리카판(소말리아)과 인도-오스트레일리아판이 멀어진다'),
          ('남동인도양 해령', -45.0, 100.0, '인도-오스트레일리아판과 남극판이 멀어진다'),
          ('아이슬란드 (싱벨리르 열곡)', 64.256, -21.13, '대서양 중앙 해령이 바다 위로 드러난 곳 — 섬 한가운데가 갈라진다'),
          ('동아프리카 열곡대', -2.0, 36.5, '대륙이 갈라지기 시작하는 곳(아프리카판·소말리아판)'),
          ('홍해', 20.0, 38.5, '열곡이 바다가 된 곳 — 아프리카판과 아라비아판이 멀어진다')],
 '변환 단층·충돌대': [('산안드레아스 단층', 35.27, -119.83, '태평양판과 북아메리카판이 어긋나는 보존형 경계'),
          ('북아나톨리아 단층', 40.7, 31.5, '아나톨리아판과 유라시아판이 어긋나는 보존형 경계'),
          ('알파인 단층 (뉴질랜드)', -43.5, 170.5, '태평양판과 인도-오스트레일리아판이 어긋나는 보존형 경계'),
          ('히말라야 산맥', 28.0, 86.9, '인도-오스트레일리아판과 유라시아판이 충돌해 솟은 산맥(수렴형·충돌)'),
          ('알프스 산맥', 46.5, 10.0, '아프리카판과 유라시아판의 충돌')],
 '열점(판 한가운데 화산)': [('하와이 (킬라우에아)', 19.41, -155.28, '태평양판 한가운데의 열점 — 판이 움직여 섬이 북서쪽으로 줄지어 있다'),
          ('옐로스톤', 44.43, -110.59, '북아메리카판 한가운데의 열점 칼데라'),
          ('갈라파고스 제도', -0.5, -91.0, '나스카판 위의 열점 화산섬'),
          ('레위니옹섬', -21.1, 55.5, '아프리카판 위의 열점 화산섬')],
}
def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
o = ['<?xml version="1.0" encoding="UTF-8"?>', '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
     '<name>판 구조 지도 (과학허브)</name>',
     '<description>판 경계: Bird, P. (2003) PB2002 — Ahlenius·Nordpil 변환본(Open Data Commons Attribution). 작은 판은 교과서식 큰 판으로 묶었다. 지형 위치는 어림값.</description>']
for k in COL:
    o.append('<Style id="%s"><LineStyle><color>%s</color><width>3</width></LineStyle></Style>' % (k, COL[k]))
o.append('<Style id="plate"><IconStyle><scale>0</scale></IconStyle><LabelStyle><scale>1.2</scale></LabelStyle></Style>')
for k in ('div', 'con', 'tra'):
    o.append('<Folder><name>%s</name>' % KNAME[k])
    for (A, B, kk), segs in sorted(lines.items()):
        if kk != k: continue
        for sg in segs:
            if len(sg) < 2: continue
            o.append('<Placemark><name>%s — %s · %s</name><description>%s</description><styleUrl>#%s</styleUrl><LineString><coordinates>%s</coordinates></LineString></Placemark>'
                     % (KNAME[k], KO.get(A, A), KO.get(B, B), esc(KDESC[k]), k, ' '.join('%s,%s' % c for c in sg)))
    o.append('</Folder>')
o.append('<Folder><name>판 이름</name>')
for c, la, lo in LABEL:
    o.append('<Placemark><name>%s</name><styleUrl>#plate</styleUrl><Point><coordinates>%s,%s</coordinates></Point></Placemark>' % (KO[c], lo, la))
o.append('</Folder>')
for fn, items in FEAT.items():
    o.append('<Folder><name>%s</name>' % fn)
    for n, la, lo, ds in items:
        o.append('<Placemark><name>%s</name><description>%s</description><Point><coordinates>%s,%s</coordinates></Point></Placemark>' % (esc(n), esc(ds), lo, la))
    o.append('</Folder>')
o.append('</Document></kml>')
open(OUT, 'w', encoding='utf-8').write('\n'.join(o))
n = sum(len(v) for v in lines.values())
print('경계 선', n, '판 이름', len(LABEL), '지형', sum(len(v) for v in FEAT.values()), 'bytes', len('\n'.join(o).encode('utf-8')))
print({k: sum(len(v) for (a, b, kk), v in lines.items() if kk == k) for k in COL})
