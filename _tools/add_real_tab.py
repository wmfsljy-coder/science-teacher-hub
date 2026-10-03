# 단원에 '실제 자료' 탭을 넣는다(이야기 탭들 뒤, 수준별 문제 앞). 한 번만 적용된다.
#   python add_real_tab.py 저장소/단원 자료파일1.js 자료파일2.js ...
# 자료 파일은 scratchpad 의 data/out 에서 단원의 data/ 로 복사하고, real-cases.js 는 미리 써 둔다.
import io, os, re, sys, shutil
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"
SRC = "C:/Users/user/AppData/Local/Temp/claude/C--Users-user-Desktop----/a41b6b8a-98e0-4526-87d5-db9fe30af1c8/scratchpad/data/out/"

def run(unit, datas):
    d = ROOT + unit + "/"
    assert os.path.exists(d + "real-cases.js"), "real-cases.js 먼저"
    os.makedirs(d + "data", exist_ok=True)
    for f in datas: shutil.copy(SRC + f, d + "data/" + f)
    f = d + "index.html"
    raw = open(f, encoding="utf-8", newline="").read(); crlf = "\r\n" in raw; s = raw.replace("\r\n", "\n")
    if 'id="real"' in s: print("이미", unit); return
    # 1) 탭 단추
    btns = re.findall(r'<button class="tab-btn[^"]*" data-tab="(\d+)"><span class="num">(\d+)</span> ([^<]+)</button>', s)
    qi = [i for i, b in enumerate(btns) if b[2].strip() == "수준별 문제"][0]
    def btn_re(i): return re.compile(r'(<button class="tab-btn[^"]*" data-tab=")' + btns[i][0] + r'("><span class="num">)' + btns[i][1] + r'(</span> )')
    for i in range(len(btns) - 1, qi - 1, -1):
        s = btn_re(i).sub(lambda m: m.group(1) + str(i + 1) + m.group(2) + "%02d" % (i + 2) + m.group(3), s, count=1)
    newbtn = '<button class="tab-btn" data-tab="%d"><span class="num">%02d</span> 실제 자료</button>\n    ' % (qi, qi + 1)
    s = s.replace('<button class="tab-btn" data-tab="%d"><span class="num">%02d</span> 수준별 문제' % (qi + 1, qi + 2),
                  newbtn + '<button class="tab-btn" data-tab="%d"><span class="num">%02d</span> 수준별 문제' % (qi + 1, qi + 2), 1)
    # 2) 패널 번호(뒤에서부터) + 눈썹 번호
    for i in range(len(btns) - 1, qi - 1, -1):
        s = s.replace('<section class="tab-panel" data-panel="%d"' % i, '<section class="tab-panel" data-panel="%d"' % (i + 1), 1)
        s = re.sub(r'(<section class="tab-panel" data-panel="%d"[^>]*>\s*<div class="stage-head">\s*<div class="eyebrow">)%02d( ·)' % (i + 1, i + 1),
                   lambda m: m.group(1) + "%02d" % (i + 2) + m.group(2), s, count=1)
        s = s.replace("===================================================================== %02d " % (i + 1), "===================================================================== %02d " % (i + 2), 1)
    panel = ('    <!-- ===================================================================== %02d 실제 자료 -->\n'
             '    <section class="tab-panel" data-panel="%d" hidden>\n'
             '      <div class="stage-head">\n'
             '        <div class="eyebrow">%02d · 진짜 관측값으로</div>\n'
             '        <h2 class="display">실제 자료</h2>\n'
             '        <p>이야기에서 배운 생각을 <b>과학자들이 실제로 잰 자료</b>에 대어 봅니다. 사례마다 먼저 예상하고, 자료를 직접 읽어 값을 구한 뒤 판정받습니다. '
             '자료 사본은 이 저장소의 <code>data/</code> 폴더에 출처와 함께 들어 있어, 바깥 누리집이 열리지 않아도 수업할 수 있습니다. '
             '<b>🔗 진짜 자료</b>·<b>🛰 현장 보기</b> 카드는 새 창으로 다녀와 찾아온 것을 한 문장으로 남기는 곳입니다.</p>\n'
             '      </div>\n'
             '      <div id="real"></div>\n'
             '    </section>\n\n') % (qi + 1, qi, qi + 1)
    anchor = '    <!-- ===================================================================== %02d ' % (qi + 2)
    if anchor in s: s = s.replace(anchor, panel + anchor, 1)
    else: s = s.replace('    <section class="tab-panel" data-panel="%d"' % (qi + 1), panel + '    <section class="tab-panel" data-panel="%d"' % (qi + 1), 1)
    # 3) 스크립트
    tags = '<script src="../assets/link.js"></script>\n' + "".join('<script src="data/%s"></script>\n' % x for x in datas) + '<script src="real-cases.js"></script>\n'
    s = s.replace('<script src="lab-cases.js"></script>\n', '<script src="lab-cases.js"></script>\n' + tags, 1)
    assert 'real-cases.js' in s and 'data-panel="%d"' % len(btns) in s
    if crlf: s = s.replace("\n", "\r\n")
    open(f, "w", encoding="utf-8", newline="").write(s)
    # 4) 정리하기·우리 반 줄
    f = d + "episodes.js"
    e = open(f, encoding="utf-8", newline="").read()
    n = e.count('{ key: "rLab", label: "응용 실험실" }')
    e = e.replace('{ key: "rLab", label: "응용 실험실" }', '{ key: "rLab", label: "응용 실험실" },\n    { key: "rReal", label: "실제 자료" }')
    open(f, "w", encoding="utf-8", newline="").write(e)
    print("넣음", unit, "탭", len(btns) + 1, "· 정리줄", n)

if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2:])
