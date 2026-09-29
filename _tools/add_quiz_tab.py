# 이야기형 단원에 '수준별 문제' 탭을 응용 실험실(없으면 정리하기) 바로 앞에 끼워 넣는다.
#   python _tools/add_quiz_tab.py <저장소>/<단원> [...]
# - 탭 단추·탭 내용의 번호(data-tab/data-panel, 01·02 표시, eyebrow 번호)를 다시 매긴다
# - ../assets/quiz.js 와 quiz-items.js 를 불러오게 한다
# - 정리하기 recap 과 우리 반 공유 rows 에 { key: "rQuiz", label: "수준별 문제" } 를 (응용 실험실 줄 앞에) 더한다
# 이미 들어가 있으면 건너뛴다(여러 번 돌려도 안전).
import io, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"

PANEL = '''    <!-- ===================================================================== {nn} 수준별 문제 -->
    <section class="tab-panel" data-panel="{k}" hidden>
      <div class="stage-head">
        <div class="eyebrow">{nn} · 기본 · 발전 · 심화</div>
        <h2 class="display">수준별 문제</h2>
        <p>이 단원의 학습 목표를 세 단계로 확인합니다. <b>1단계 기본</b>은 용어와 핵심 개념, <b>2단계 발전</b>은 자료 해석과 계산, <b>3단계 심화</b>는 처음 보는 상황에 적용하고 근거를 들어 설명하기입니다. 자기 수준에 맞는 단계부터 시작하세요. 두 번 틀리면 정답과 해설을 볼 수 있어요.</p>
      </div>
      <div id="quiz"></div>
    </section>

'''
ROW = '{ key: "rQuiz", label: "수준별 문제" }'


def add_row(js, anchor):
    """anchor( 'recap:' 또는 sthShare 안의 'rows:' ) 뒤 배열에 ROW 를 넣는다. 응용 실험실 줄이 있으면 그 앞에."""
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
    if "rQuiz" in body:
        return js, False
    indent = re.search(r"\n(\s*)\{", body)
    ind = indent.group(1) if indent else "    "
    lab = re.search(r'\{ key: "rLab"', body)
    if lab:
        new = body[:lab.start()] + ROW + ",\n" + ind + body[lab.start():]
    else:
        stripped = body.rstrip()
        new = stripped + ",\n" + ind + ROW + body[len(stripped):]
    return js[:a + 1] + new + js[j:], True


def one(unit):
    hp, jp = ROOT + unit + "/index.html", ROOT + unit + "/episodes.js"
    h = open(hp, encoding="utf-8", newline="").read()
    if 'id="quiz"' in h:
        print("건너뜀(이미 있음):", unit); return
    btns = re.findall(r'<button class="tab-btn[^"]*" data-tab="(\d+)"><span class="num">\d+</span>\s*([^<]+)</button>', h)
    k = None
    for idx, name in btns:
        if name.strip() == "응용 실험실": k = int(idx)
    if k is None:
        for idx, name in btns:
            if name.strip() == "정리하기": k = int(idx)
    assert k is not None, unit + ": 정리하기 탭을 못 찾음"
    NEXT = [n.strip() for i, n in btns if int(i) == k][0]

    # 1) 번호 다시 매기기: k 이상은 +1
    def shift(n): n = int(n); return n + 1 if n >= k else n
    h = re.sub(r'(<button class="tab-btn[^"]*" data-tab=")(\d+)("><span class="num">)(\d+)(</span>)',
               lambda m: m.group(1) + str(shift(m.group(2))) + m.group(3) + "%02d" % (shift(m.group(2)) + 1) + m.group(5), h)
    h = re.sub(r'(<section class="tab-panel"[^>]*data-panel=")(\d+)(")', lambda m: m.group(1) + str(shift(m.group(2))) + m.group(3), h)
    for newi in sorted({shift(int(i)) for i, _ in btns if int(i) >= k}):
        m = re.search(r'<section class="tab-panel"[^>]*data-panel="%d"' % newi, h)
        seg_end = h.find("</section>", m.end())
        part = h[m.end():seg_end]
        part2 = re.sub(r'(<div class="eyebrow">)(\d+)( · )', lambda e: e.group(1) + "%02d" % (newi + 1) + e.group(3), part, count=1)
        h = h[:m.end()] + part2 + h[seg_end:]
    h = re.sub(r'(={5,} )(\d{2})( (?:응용 실험실|정리하기|우리 반))', lambda m: m.group(1) + "%02d" % (int(m.group(2)) + 1) + m.group(3), h)

    # 2) 탭 단추
    pos = re.search(r'\s*<button class="tab-btn[^"]*" data-tab="%d"><span class="num">\d+</span>\s*%s</button>' % (k + 1, NEXT), h)
    btn = '\n    <button class="tab-btn" data-tab="%d"><span class="num">%02d</span> 수준별 문제</button>' % (k, k + 1)
    h = h[:pos.start()] + btn + h[pos.start():]

    # 3) 탭 내용 — 다음 탭 내용(과 그 앞 주석) 바로 앞에
    m = re.search(r'<section class="tab-panel"[^>]*data-panel="%d"' % (k + 1), h)
    start = m.start()
    line_start = h.rfind("\n", 0, start) + 1
    prev = h.rfind("\n", 0, line_start - 1) + 1
    if h[prev:line_start].strip().endswith("-->"):
        cs = h.rfind("<!--", 0, start)
        line_start = h.rfind("\n", 0, cs) + 1
    h = h[:line_start] + PANEL.format(k=k, nn="%02d" % (k + 1)) + h[line_start:]

    # 4) 스크립트
    assert '<script src="../assets/story.js"></script>' in h and '<script src="episodes.js"></script>' in h
    h = h.replace('<script src="../assets/story.js"></script>', '<script src="../assets/story.js"></script>\n<script src="../assets/quiz.js"></script>', 1)
    h = h.replace('<script src="episodes.js"></script>', '<script src="episodes.js"></script>\n<script src="quiz-items.js"></script>', 1)
    open(hp, "w", encoding="utf-8", newline="").write(h)

    # 5) 정리하기·우리 반에 결과 줄
    js = open(jp, encoding="utf-8", newline="").read()
    js, r1 = add_row(js, "recap:")
    sh = js.find("window.sthShare(")
    r2 = False
    if sh >= 0:
        head, tail = js[:sh], js[sh:]
        tail, r2 = add_row(tail, "rows:")
        js = head + tail
    open(jp, "w", encoding="utf-8", newline="").write(js)
    print("넣음 %-26s 수준별 문제=탭%d · 정리하기 줄 %s · 우리 반 줄 %s" % (unit, k, "O" if r1 else "X", "O" if r2 else "X"))


for u in sys.argv[1:]:
    one(u.strip("/"))
