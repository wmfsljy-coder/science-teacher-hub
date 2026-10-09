# 인물·법칙 카드 자료를 한 번 받아 저장소마다 assets/people-data.js 로 쓴다(학생 화면은 위키백과를 직접 부르지 않는다).
#   python -I -X utf8 _tools/make_people.py <목록.json> [고칠 것.json]
# 목록: [{"unit":"science-inquiry-1/1-3","kind":"person"|"law","surface":"멘델레예프","title":"드미트리 멘델레예프","qid":"Q9106"}, …]
# 고칠 것(선택): {"제목": {"x": "요약을 손으로 고친 글", "b": [1390, 7], "phet": "…", "drop": true}, …}
# 받은 날짜·출처를 함께 적고, 위키백과 본문과 위키데이터의 생년이 다르면 warn 을 붙인다. 검토용 표는 과학허브/인물카드_검토.md.
import json, re, sys, time, datetime, urllib.request, urllib.parse, os, collections
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
UA = {'User-Agent': 'science-hub-people/1.0 (wmfsljy21@naver.com)'}
def get(u):
    for i in range(6):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30))
        except Exception as e:
            if i == 5: raise
            time.sleep(6 * (i + 1))
lst = json.load(open(sys.argv[1], encoding='utf-8'))
fix = json.load(open(sys.argv[2], encoding='utf-8')) if len(sys.argv) > 2 else {}
NOBEL = {'Q38104', 'Q44585', 'Q80061', 'Q35637', 'Q37922', 'Q47170'}   # 물리·화학·생리의학·평화·문학·경제
KOR = ('조선', '대한민국', '고려', '대한 제국', '한국')
def ymd(c):
    try:
        dv = c[0]['mainsnak']['datavalue']['value']; y = int(dv['time'][:5]); p = dv['precision']
        if p >= 11: return [y, p, int(dv['time'][6:8]), int(dv['time'][9:11])]   # 날짜까지 알면 월·일(만 나이를 셈)
        return [y, p]
    except Exception: return None
def sents(s, n):   # 수식·그림을 가리키는 문장(요약에서는 식이 빠진다)은 뺀다
    s = re.sub(r'\s*\([^)]*아래 참조[^)]*\)', '', re.sub(r'\s+', ' ', s))
    p = [x for x in re.split(r'(?<=다\.)\s+', s.strip()) if not re.search(r'다음과 같|다음 식|위의 그림|아래 그림', x)]
    return ' '.join(p[:n])
titles = collections.OrderedDict()
for it in lst: titles.setdefault(it['title'], it)
DATA = {}; today = datetime.date.today().isoformat()
for t, it in titles.items():
    f = fix.get(t, {})
    if f.get('drop'): continue
    s = get('https://ko.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(t.replace(' ', '_')))
    if s.get('type') != 'standard': print('건너뜀(문서 아님)', t, s.get('type')); continue
    q = s.get('wikibase_item') or it.get('qid')
    e = {'t': s.get('title', t), 'k': 'l' if it['kind'] == 'law' else 'p', 'url': s['content_urls']['desktop']['page'], 'q': q, 'at': today}
    d = re.sub(r'\s*\([^)]*\d{3,4}[^)]*\)\s*$', '', s.get('description') or '')
    if d: e['d'] = d
    ex = s.get('extract') or ''
    m = re.match(r'^([^(]{0,40})\(([^)]*)\)', ex); ys = []
    if m:
        ys = [int(x) for x in re.findall(r'(1[0-9]{3}|20[0-9]{2})년', m.group(2))]
        ex = m.group(1).rstrip() + ex[m.end():]
    e['x'] = sents(ex, 3)
    if s.get('thumbnail') and e['k'] == 'p': e['img'] = s['thumbnail']['source']
    if q:
        w = get('https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&props=claims&ids=' + q)['entities'][q].get('claims', {})
        if e['k'] == 'p':
            b, dd = ymd(w.get('P569')), ymd(w.get('P570'))
            if b: e['b'] = b
            if dd: e['e'] = dd
            cs = [x['mainsnak']['datavalue']['value']['id'] for x in w.get('P27', []) if x['mainsnak'].get('datavalue')][:2]
            if cs:
                lb = get('https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&props=labels&languages=ko&ids=' + '|'.join(cs))['entities']
                e['c'] = [lb[c]['labels']['ko']['value'] for c in cs if 'ko' in lb[c].get('labels', {})]
            if any(x['mainsnak'].get('datavalue', {}).get('value', {}).get('id') in NOBEL for x in w.get('P166', [])): e['nobel'] = 1
            mt = w.get('P1563')
            if mt and mt[0]['mainsnak'].get('datavalue'): e['mt'] = mt[0]['mainsnak']['datavalue']['value']
            if b and b[1] >= 9 and ys and b[0] not in ys: e['warn'] = '위키백과 본문(%d년)과 위키데이터(%d년)의 생년이 다릅니다' % (ys[0], b[0])
            if any(any(k in c for k in KOR) for c in e.get('c', [])): e['ek'] = 1
    for k, v in f.items():
        if k != 'drop': e[k] = v
    DATA[t] = e
    print('받음', t, e.get('b'), e.get('e'), e.get('c'), '경고:' + e['warn'] if e.get('warn') else '')
    time.sleep(0.3)
# 저장소마다 그 저장소에서 쓰는 것만
by_repo = collections.defaultdict(dict)
for it in lst:
    if it['title'] in DATA: by_repo[it['unit'].split('/')[0]][it['title']] = DATA[it['title']]
for repo, d in by_repo.items():
    p = os.path.join(ROOT, repo, 'assets', 'people-data.js')
    body = ('/* 인물·법칙 카드 자료 — science-teacher-hub/_tools/make_people.py 가 만든 파일(고치지 말고 다시 만든다).\n'
            '   출처: 한국어 위키백과 요약(CC BY-SA 4.0)·위키데이터(CC0), 받은 날 %s. 사진은 위키미디어 공용. */\n'
            'window.STH_PEOPLE = ' % today) + json.dumps(d, ensure_ascii=False, indent=0).replace('\n', '') + ';\n'
    crlf = False
    sh = os.path.join(ROOT, repo, 'assets', 'share.js')
    if os.path.exists(sh) and b'\r\n' in open(sh, 'rb').read(): crlf = True
    open(p, 'wb').write((body.replace('\n', '\r\n') if crlf else body).encode('utf-8'))
    print('썼음', repo, len(d))
# 검토용 표
L = ['# 인물·법칙 카드 검토 (%s 받음)' % today, '', '| 제목 | 종류 | 생몰 | 국적 | 설명 | 요약 | 경고 |', '|---|---|---|---|---|---|---|']
for t, e in DATA.items():
    L.append('| %s | %s | %s | %s | %s | %s | %s |' % (t, '인물' if e['k'] == 'p' else '법칙', (str(e.get('b')) + '~' + str(e.get('e'))) if e['k'] == 'p' else '',
             '·'.join(e.get('c', [])), e.get('d', ''), e['x'].replace('|', '/'), e.get('warn', '')))
open(os.path.join(ROOT, '인물카드_검토.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('합계', len(DATA))
