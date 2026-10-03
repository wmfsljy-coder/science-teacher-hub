from rp import rp
import re
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"
def card(id_, title, src, url, ask):
    q = lambda s: s.replace('"', '\\\\"')
    return "<div data-link='{\\\"id\\\":\\\"%s\\\",\\\"title\\\":\\\"%s\\\",\\\"src\\\":\\\"%s\\\",\\\"url\\\":\\\"%s\\\",\\\"ask\\\":\\\"%s\\\"}'></div>" % (id_, title, src, url, ask)
def swap(path, old_id, new):
    f = ROOT + path; s = open(f, encoding="utf-8", newline="").read()
    m = re.search(r"<div data-link='\{\\\"id\\\":\\\"" + re.escape(old_id) + r"\\\".*?\}'></div>", s)
    assert m, (path, old_id); s = s.replace(m.group(0), new, 1)
    open(f, "w", encoding="utf-8", newline="").write(s); print("바꿈", path, old_id)
C1 = "climate-change-ecology/1/real-cases.js"
rp(C1, [
 ('["1980년대 점들은 약 13.5 °C, 2020년대 점들은 약 15 °C 근처입니다.", "약 1.3 °C ÷ 4(십 년 단위) ≈ ?"]', '["가장 잘 맞는 직선은 1981년 약 13.4 °C, 2024년 약 14.6 °C 근처를 지납니다. 맨 끝 2023 ~ 2024년의 높은 점에만 맞추지 마세요.", "약 1.2 °C ÷ 4.3(십 년 단위) ≈ ?"]'),
 ('"㉡ 10년에 0.3 °C 쯤씩 꾸준히 올랐다"', '"㉡ 해마다 오르내리지만 긴 흐름으로는 꾸준히 올랐다"'),
 ('겨울에 바다가 얼 만큼 춥습니다.', '늦겨울엔 북쪽에서 떠내려온 바다 얼음이 해안에 닿을 만큼 춥습니다.'),
 ('실잠자리처럼 따뜻한 곳에 살던 곤충이 우리나라에서 점점 북쪽으로 발견되는 것도', '남방노랑나비·연분홍실잠자리처럼 남쪽에 살던 곤충이 우리나라에서 점점 북쪽으로 발견되는 것도'),
 ('["44년 동안", (sl * 4.3', '["1981 → 2024(43년)", (sl * 4.3'),
 ('— 44년 동안 약 ', '— 1981 ~ 2024년 43년 동안 약 '),
])
C2 = "climate-change-ecology/2/real-cases.js"
rp(C2, [
 ('IPCC 는 온실 기체 배출이 많은 시나리오에서 2100년까지 해수면이 수십 cm ~ 1 m 가까이 오를 수 있다고 봅니다.', 'IPCC 제6차 보고서는 배출이 아주 많으면(SSP5-8.5) 2100년 해수면이 1995 ~ 2014년보다 약 0.6 ~ 1.0 m, 배출을 크게 줄여도(SSP1-2.6) 약 0.3 ~ 0.6 m 오를 가능성이 높다고 봅니다(NASA 는 초기 위성 오차를 바로잡은 자료로 1993년 약 2.1 mm/년에서 2024년 약 4.4 mm/년으로 두 배 넘게 빨라졌다고 발표했습니다).'),
])
