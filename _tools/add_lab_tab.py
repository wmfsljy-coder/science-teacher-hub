# 이야기형 단원에 '응용 실험실' 탭을 정리하기 바로 앞에 끼워 넣는다.
#   python _tools/add_lab_tab.py <저장소>/<단원> [...]
# - 탭 단추·탭 내용의 번호(data-tab/data-panel, 01·02 표시, eyebrow 번호)를 다시 매긴다
# - ../assets/lab.js 와 lab-cases.js 를 불러오게 한다
# - 정리하기 recap 과 우리 반 공유 rows 에 { key: "rLab", label: "응용 실험실" } 을 더한다
# 이미 들어가 있으면 건너뛴다(여러 번 돌려도 안전).
import io, re, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"

PANEL = '''    <!-- ===================================================================== {nn} 응용 실험실 -->
    <section class="tab-panel" data-panel="{k}" hidden>
      <div class="stage-head">
        <div class="eyebrow">{nn} · 배운 것을 처음 보는 상황에</div>
        <h2 class="display">응용 실험실</h2>
        <p>이야기에서 찾아낸 개념을 전혀 다른 상황에 써 봅니다. 사례마다 <b>먼저 예상하고 → 직접 조작해 → 판정받고 → 까닭을 확인</b>합니다. 세 번 틀리면 풀이를 볼 수 있어요.</p>
      </div>
      <div id="lab"></div>
    </section>

'''
ROW = '{ key: "rLab", label: "응용 실험실" }'


def add_row(js, anchor):
    """anchor( 'recap:' 또는 sthShare 안의 'rows:' ) 뒤의 배열 끝에 ROW 를 넣는다."""
    i = js.find(anchor)
    if i < 0:
        return js, False
    a = js.index("[", i)
    depth, j = 0, a
    while True:
        ch = js[j]
        if ch == "[": depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0: break
        j += 1
    body = js[a + 1:j]
    if "rLab" in body:
        return js, False
    stripped = body.rstrip()
    indent = re.search(r"\n(\s*)\{", body)
    ind = indent.group(1) if indent else "    "
    new = stripped + ",\n" + ind + ROW + body[len(stripped):]
    return js[:a + 1] + new + js[j:], True


def one(unit):
    hp, jp = ROOT + unit + "/index.html", ROOT + unit + "/episodes.js"
    h = open(hp, encoding="utf-8", newline="").read()
    if 'id="lab"' in h:
        print("건너뜀(이미 있음):", unit); return
    btns = re.findall(r'<button class="tab-btn[^"]*" data-tab="(\d+)"><span class="num">\d+</span>\s*([^<]+)</button>', h)
    k = None
    for idx, name in btns:
        if name.strip() == "정리하기": k = int(idx)
    assert k is not None, unit + ": 정리하기 탭을 못 찾음"

    # 1) 번호 다시 매기기: k 이상은 +1
    def shift(n): n = int(n); return n + 1 if n >= k else n
    h = re.sub(r'(<button class="tab-btn[^"]*" data-tab=")(\d+)("><span class="num">)(\d+)(</span>)',
               lambda m: m.group(1) + str(shift(m.group(2))) + m.group(3) + "%02d" % (shift(m.group(2)) + 1) + m.group(5), h)
    # 탭 내용: 번호와 그 안의 eyebrow 번호를 함께
    def fix_panel(m):
        old = int(m.group(2)); new = shift(old)
        return m.group(1) + str(new) + m.group(3)
    h = re.sub(r'(<section class="tab-panel"[^>]*data-panel=")(\d+)(")', fix_panel, h)
    for newi in sorted({shift(int(i)) for i, _ in btns if int(i) >= k}):
        m = re.search(r'<section class="tab-panel"[^>]*data-panel="%d"' % newi, h)
        seg_end = h.find("</section>", m.end())
        part = h[m.end():seg_end]
        part2 = re.sub(r'(<div class="eyebrow">)(\d+)( · )', lambda e: e.group(1) + "%02d" % (newi + 1) + e.group(3), part, count=1)
        h = h[:m.end()] + part2 + h[seg_end:]
    # 주석 속 번호(=== 05 정리하기 같은 것)도 맞춘다
    h = re.sub(r'(={5,} )(\d{2})( (?:정리하기|우리 반))', lambda m: m.group(1) + "%02d" % (int(m.group(2)) + 1) + m.group(3), h)

    # 2) 탭 단추 넣기
    pos = re.search(r'\s*<button class="tab-btn[^"]*" data-tab="%d"><span class="num">\d+</span>\s*정리하기</button>' % (k + 1), h)
    btn = '\n    <button class="tab-btn" data-tab="%d"><span class="num">%02d</span> 응용 실험실</button>' % (k, k + 1)
    h = h[:pos.start()] + btn + h[pos.start():]

    # 3) 탭 내용 넣기 — 정리하기 내용(과 그 앞 주석) 바로 앞에
    m = re.search(r'<section class="tab-panel"[^>]*data-panel="%d"' % (k + 1), h)
    start = m.start()
    line_start = h.rfind("\n", 0, start) + 1
    prev = h.rfind("\n", 0, line_start - 1) + 1
    if h[prev:line_start].strip().endswith("-->"):
        # 바로 위가 주석(한 줄이든 여러 줄이든)이면 그 주석 시작까지 올라간다
        cs = h.rfind("<!--", 0, start)
        line_start = h.rfind("\n", 0, cs) + 1
    h = h[:line_start] + PANEL.format(k=k, nn="%02d" % (k + 1)) + h[line_start:]

    # 4) 스크립트
    assert '<script src="../assets/story.js"></script>' in h and '<script src="episodes.js"></script>' in h
    h = h.replace('<script src="../assets/story.js"></script>', '<script src="../assets/story.js"></script>\n<script src="../assets/lab.js"></script>', 1)
    h = h.replace('<script src="episodes.js"></script>', '<script src="episodes.js"></script>\n<script src="lab-cases.js"></script>', 1)
    open(hp, "w", encoding="utf-8", newline="").write(h)

    # 5) 정리하기·우리 반에 응용 결과 줄
    js = open(jp, encoding="utf-8", newline="").read()
    js, r1 = add_row(js, "recap:")
    sh = js.find("window.sthShare(")
    r2 = False
    if sh >= 0:
        head, tail = js[:sh], js[sh:]
        tail, r2 = add_row(tail, "rows:")
        js = head + tail
    open(jp, "w", encoding="utf-8", newline="").write(js)
    print("넣음 %-26s 응용 실험실=탭%d · 정리하기 줄 %s · 우리 반 줄 %s" % (unit, k, "O" if r1 else "X", "O" if r2 else "X"))


for u in sys.argv[1:]:
    one(u.strip("/"))
