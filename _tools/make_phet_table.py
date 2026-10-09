# 🧪 더 해 보기(단원마다 try-items.js)를 모아 선생님용 표 phet/index.html 을 만든다. 단원 쪽을 고친 뒤 다시 돌린다.
#   python -I -X utf8 _tools/make_phet_table.py
import json, os, re, html
HUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ROOT = os.path.join(HUB, '..')
units = [u for u in open(os.path.join(HUB, '_tools', 'ALL_UNITS.txt'), encoding='utf-8').read().split() if u]
# 단원 이름·과목은 바로가기 목록(precheck-all.js 의 STH_UNITS: [코드, 과목, 단원 이름, 학년, 이야기 수, 경로])에서
UL = json.loads(re.search(r'window\.STH_UNITS = (\[.*?\]);', open(os.path.join(HUB, 'assets', 'precheck-all.js'), encoding='utf-8').read(), re.S).group(1))
by_path = {r[5]: r for r in UL}
def vis(s): return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', s, flags=re.S)))
rows = []
for u in units:
    f = os.path.join(ROOT, u, 'try-items.js')
    if not os.path.exists(f): continue
    items = json.loads(re.search(r'sthTry\((\[.*\])\);', open(f, encoding='utf-8').read(), re.S).group(1))
    h = open(os.path.join(ROOT, u, 'index.html'), encoding='utf-8').read()
    tabs = {m.group(1): vis(m.group(2)).strip() for m in re.finditer(r'<button class="tab-btn[^"]*" data-tab="(\d+)">(.*?)</button>', h, re.S)}
    panels = [(m.group(1), m.start()) for m in re.finditer(r'<section class="tab-panel" data-panel="(\d+)"', h)]
    for it in items:
        tab = ''
        for k, start in panels:
            end = next((s2 for k2, s2 in panels if s2 > start), len(h))
            if it['near'] in vis(h[start:end]): tab = tabs.get(k, ''); break
        r = by_path.get(u, [u, u.split('/')[0], u])
        rows.append((r[1], r[2], u, tab, it))
subj = list(dict.fromkeys(r[0] for r in rows))
E = html.escape
T = []
for s, name, u, tab, it in rows:
    url = 'https://phet.colorado.edu/sims/html/%s/latest/%s_ko.html' % (it['sim'], it['sim'])
    T.append('<tr data-s="%s"><td>%s</td><td><a href="../../%s/">%s</a><div class="tab">%s</div></td><td class="near">“%s”</td>'
             '<td><a href="%s" target="_blank" rel="noopener"><b>%s</b></a><div class="why">%s</div></td><td><ol>%s</ol></td><td>%s</td></tr>'
             % (E(s), E(s), E(u), E(name), E(tab), E(it['near']), url, E(it['ko']), E(it.get('why', '')),
                ''.join('<li>%s</li>' % E(t) for t in it.get('tasks', [])), E(it.get('q', ''))))
page = '''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PhET 더 해 보기 — 교사용</title>
<link rel="stylesheet" href="../assets/theme.css">
<style>
  .hero { padding: 40px 30px 6px; max-width: 1280px; margin: 0 auto; }
  .hero .back { display: inline-block; margin-bottom: 10px; font-size: 13px; color: var(--mist); text-decoration: none; font-weight: 700; }
  .hero h1 { font-size: clamp(26px, 4vw, 36px); margin: 8px 0 8px; font-weight: 400; }
  .hero p { color: var(--mist); font-size: 14.5px; line-height: 1.75; max-width: 860px; margin: 0; }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 18px 30px 80px; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 14px; }
  .chip { border: 2px solid var(--line); border-radius: 999px; padding: 6px 13px; font: inherit; font-weight: 800; font-size: 13px; background: var(--card); color: var(--ink); cursor: pointer; }
  .chip.on { border-color: var(--brand); background: var(--brand-100); color: var(--brand-700); }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%%; min-width: 960px; font-size: 13px; background: var(--panel); }
  th, td { border: 1px solid var(--line); padding: 8px 10px; vertical-align: top; text-align: left; line-height: 1.6; color: var(--ink); }
  th { background: var(--card-2); color: var(--mist); position: sticky; top: 0; }
  td ol { margin: 0; padding-left: 18px; }
  .tab, .why { font-size: 12px; color: var(--mist); margin-top: 3px; }
  .near { color: var(--mist); max-width: 220px; }
  td a { color: var(--brand-700); font-weight: 800; }
</style>
</head>
<body>
<div class="hero">
  <a class="back" href="../">← 교사용 허브</a>
  <h1 class="display">🧪 PhET 더 해 보기 — 과목별 표</h1>
  <p>단원 본문의 관련 문단 바로 아래에 붙인 PhET 시뮬레이션(콜로라도 대학교, 한국어판)과 학생 과제를 모았습니다. 모두 %d곳입니다. 단원 이름을 누르면 그 단원으로, 시뮬레이션 이름을 누르면 시뮬레이션으로 갑니다. 학생 화면에서는 ‘찾아낸 것 한 줄’을 적을 수 있고, 채점은 없습니다.</p>
</div>
<div class="wrap">
  <div class="chips" id="chips"><button class="chip on" data-s="">전체</button>%s</div>
  <div class="scroll"><table>
    <thead><tr><th>과목</th><th>단원 · 탭</th><th>붙인 자리(본문 글귀)</th><th>시뮬레이션</th><th>해 볼 것</th><th>생각할 질문</th></tr></thead>
    <tbody>%s</tbody>
  </table></div>
</div>
<script>
(function () {
  var chips = document.querySelectorAll(".chip");
  Array.prototype.forEach.call(chips, function (c) {
    c.addEventListener("click", function () {
      Array.prototype.forEach.call(chips, function (x) { x.classList.toggle("on", x === c); });
      var s = c.getAttribute("data-s");
      Array.prototype.forEach.call(document.querySelectorAll("tbody tr"), function (tr) { tr.hidden = !!s && tr.getAttribute("data-s") !== s; });
    });
  });
})();
</script>
</body>
</html>
''' % (len(rows), ''.join('<button class="chip" data-s="%s">%s</button>' % (E(s), E(s)) for s in subj), '\n'.join(T))
os.makedirs(os.path.join(HUB, 'phet'), exist_ok=True)
open(os.path.join(HUB, 'phet', 'index.html'), 'w', encoding='utf-8').write(page)
print('rows', len(rows), 'subjects', subj)
