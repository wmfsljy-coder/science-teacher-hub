# 단원 쪽에 붙인 ‘진짜 보기’ 자료를 모두 모아 선생님용 목록 resources/index.html 을 만든다. 단원 쪽을 고친 뒤 다시 돌린다.
#   python -I -X utf8 _tools/make_resource_list.py
# 모으는 것: 📍 data-place · data-view(별·태양계·지구·태양·지도·분자·PhET·그래프·주기율표·사료·허블·화석·인물·법칙) · 🧪 try-items.js
import json, os, re, html
HUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ROOT = os.path.join(HUB, '..')
E = html.escape
units = [u for u in open(os.path.join(HUB, '_tools', 'ALL_UNITS.txt'), encoding='utf-8').read().split() if u]
UL = json.loads(re.search(r'window\.STH_UNITS = (\[.*?\]);', open(os.path.join(HUB, 'assets', 'precheck-all.js'), encoding='utf-8').read(), re.S).group(1))
by_path = {r[5]: r for r in UL}
KIND = {  # 종류 → (모음 이름, 아이콘)
    'place': ('지명', '📍'), 'sky': ('별·은하', '🔭'), 'star': ('별·은하', '🔭'), 'hubble': ('별·은하', '🔭'), 'eyes': ('태양계', '🪐'), 'exo': ('태양계', '🪐'),
    'earth': ('지금의 지구', '🌐'), 'sun': ('오늘의 태양', '☀️'), 'mymap': ('판 구조 지도', '🗺'), 'mol': ('분자 3D', '🧬'), 'phet': ('PhET', '🧪'),
    'owid': ('실제 자료 그래프', '📈'), 'ptable': ('주기율표', '⚗️'), 'commons': ('원본 사료', '📜'), 'web': ('원본 사료', '📜'), 'out': ('원본 사료', '🔗'),
    'model': ('박물관 3D 화석', '🦴'), 'who': ('인물 카드', '📇'), 'law': ('법칙 카드', '📐'), 'try': ('PhET', '🧪'), 'try2': ('다른 시뮬레이션', '🧪')}
def vis(s): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s))
def link_of(kind, val):
    a = val.split('|')
    if kind == 'place':
        p = val.split(',')
        return 'https://www.google.com/maps/search/?api=1&query=%s,%s' % (p[0], p[1]), '구글 지도 %s, %s' % (p[0], p[1])
    if kind == 'sky': return 'https://aladin.cds.unistra.fr/AladinLite/?target=%s&fov=%s' % (a[0], a[1] if len(a) > 1 else 2), '알라딘 하늘 지도 · ' + a[0]
    if kind == 'star': return 'https://stellarium-web.org/skysource/' + a[0], '스텔라리움 웹 · ' + a[0]
    if kind == 'eyes': return 'https://eyes.nasa.gov/apps/solar-system/#/' + a[0], 'NASA Eyes · ' + a[0]
    if kind == 'earth': return 'https://earth.nullschool.net/#' + val, 'earth.nullschool.net'
    if kind == 'sun': return '', {'hmi': 'NASA SDO 오늘의 흑점', '171': 'NASA SDO 코로나', 'c3': 'SOHO 코로나그래프', 'aurora': 'NOAA 오로라 예보'}.get(a[0], a[0])
    if kind == 'mymap': return 'https://www.google.com/maps/d/viewer?mid=' + a[0], '구글 내 지도 · 판 구조'
    if kind == 'mol': return 'https://www.rcsb.org/structure/' + a[0], 'RCSB PDB %s%s' % (a[0], ' · ' + a[1] if len(a) > 1 else '')
    if kind == 'phet': return 'https://phet.colorado.edu/sims/html/%s/latest/%s_ko.html' % (a[0], a[0]), 'PhET ' + a[0]
    if kind == 'owid': return 'https://ourworldindata.org/grapher/' + a[0], 'Our World in Data%s' % (' · ' + a[1] if len(a) > 1 else '')
    if kind == 'ptable': return 'https://ptable.com/?lang=ko', 'Ptable 주기율표'
    if kind == 'commons': return 'https://commons.wikimedia.org/wiki/File:' + a[0].replace(' ', '_'), '위키미디어 공용 · %s%s' % (a[1] if len(a) > 1 else '', ' · ' + a[2] if len(a) > 2 else '')
    if kind == 'hubble': return 'https://esahubble.org/images/%s/' % a[0], 'ESA/Hubble%s' % (' · ' + a[1] if len(a) > 1 else '')
    if kind == 'model': return 'https://sketchfab.com/3d-models/' + a[0], 'Sketchfab · ' + (a[1] if len(a) > 1 else '')
    if kind in ('web', 'out'): return a[0], a[1] if len(a) > 1 else a[0]
    if kind in ('who', 'law'): return 'https://ko.wikipedia.org/wiki/' + val.replace(' ', '_'), '위키백과 · ' + val
    return '', val
PEOPLE = {}   # 📇·📐 카드 자료 — 오른쪽 칸에 한 줄 설명, 링크는 카드의 출처
for repo in set(u.split('/')[0] for u in units):
    pf = os.path.join(ROOT, repo, 'assets', 'people-data.js')
    if os.path.exists(pf): PEOPLE.update(json.loads(re.search(r'window\.STH_PEOPLE = (\{.*\});', open(pf, encoding='utf-8').read(), re.S).group(1)))
def card_note(v):
    e = PEOPLE.get(v)
    if not e: return ''
    yr = lambda b: ('기원전 %d' % -b[0]) if b[0] < 0 else str(b[0])
    life = (' (%s~%s)' % (yr(e['b']), yr(e['e']) if e.get('e') else '')) if e.get('b') else ''
    return (e.get('d') or e['x'].split('. ')[0]) + life
rows = []
for u in units:
    p = os.path.join(ROOT, u, 'index.html')
    if not os.path.exists(p): continue
    h = open(p, encoding='utf-8').read()
    r = by_path.get(u, [u, u.split('/')[0], u])
    tabs = {m.group(1): vis(m.group(2)).strip() for m in re.finditer(r'<button class="tab-btn[^"]*" data-tab="(\d+)">(.*?)</button>', h, re.S)}
    panels = [(m.group(1), m.start()) for m in re.finditer(r'<section class="tab-panel" data-panel="(\d+)"', h)]
    def tab_at(pos):
        t = ''
        for k, s0 in panels:
            if s0 <= pos: t = tabs.get(k, '')
        return t
    for m in re.finditer(r'<span data-(place|view)=("([^"]*)"|([^\s>]*))((?: data-[a-z]+="[^"]*")*)>(.*?)</span>', h):
        val = m.group(3) if m.group(3) is not None else m.group(4)
        if m.group(1) == 'place': kind, v = 'place', val
        else: kind, v = val.split(':', 1)[0], val.split(':', 1)[1] if ':' in val else ''
        ask = re.search(r'data-ask="([^"]*)"', m.group(5) or '')
        url, what = link_of(kind, html.unescape(v))
        note = html.unescape(ask.group(1)) if ask else ''
        if kind in ('who', 'law'):
            note = card_note(html.unescape(v)); url = PEOPLE.get(html.unescape(v), {}).get('url', url)
        rows.append([r[1], r[2], u, tab_at(m.start()), kind, vis(m.group(6)), url, what, note])
    tf = os.path.join(ROOT, u, 'try-items.js')
    if os.path.exists(tf):
        vh = vis(re.sub(r'<script.*?</script>|<style.*?</style>', ' ', h, flags=re.S))
        for it in json.loads(re.search(r'sthTry\((\[.*\])\);', open(tf, encoding='utf-8').read(), re.S).group(1)):
            tb = ''
            for k, s0 in panels:
                end = next((s2 for k2, s2 in panels if s2 > s0), len(h))
                if it['near'] in vis(re.sub(r'<script.*?</script>', ' ', h[s0:end], flags=re.S)): tb = tabs.get(k, ''); break
            S = it.get('src')
            url = S['url'] if S else 'https://phet.colorado.edu/sims/html/%s/latest/%s_ko.html' % (it['sim'], it['sim'])
            task = ' / '.join(it.get('tasks', [])) + (' 🤔 ' + it['q'] if it.get('q') else '')
            rows.append([r[1], r[2], u, tb, 'try2' if S else 'try', '“' + it['near'] + '”' + (' (우리 시뮬레이션 아래 한 줄)' if it.get('mini') else ' (문단 아래 상자)'), url,
                         (S['site'] + ' · ' + it['ko'] + (' (새 창)' if S.get('tab') else '')) if S else 'PhET ' + it['ko'], task])
groups = list(dict.fromkeys(KIND[x[4]][0] for x in rows if x[4] in KIND))
subj = list(dict.fromkeys(x[0] for x in rows))
cnt = {g: sum(1 for x in rows if KIND.get(x[4], ('',))[0] == g) for g in groups}
T = []
for s, name, u, tab, kind, word, url, what, extra in rows:
    g, ico = KIND.get(kind, (kind, '·'))
    T.append('<tr data-s="%s" data-g="%s"><td>%s</td><td><a href="../../%s/">%s</a><div class="sub">%s</div></td><td>%s %s</td><td>%s</td><td>%s</td><td class="sub2">%s</td></tr>' % (
        E(s), E(g), E(s), E(u), E(name), E(tab), ico, E(g), E(word),
        ('<a href="%s" target="_blank" rel="noopener">%s</a>' % (E(url), E(what))) if url else E(what), E(extra)))
page = open(os.path.join(HUB, '_tools', 'resource_list_template.html'), encoding='utf-8').read()
page = page.replace('{{N}}', str(len(rows))).replace('{{SUBJ}}', ''.join('<button class="chip" data-k="s" data-v="%s">%s</button>' % (E(x), E(x)) for x in subj))
page = page.replace('{{GROUPS}}', ''.join('<button class="chip" data-k="g" data-v="%s">%s <span>%d</span></button>' % (E(g), E(g), cnt[g]) for g in groups)).replace('{{ROWS}}', '\n'.join(T))
os.makedirs(os.path.join(HUB, 'resources'), exist_ok=True)
open(os.path.join(HUB, 'resources', 'index.html'), 'w', encoding='utf-8').write(page)
print('rows', len(rows), cnt)
