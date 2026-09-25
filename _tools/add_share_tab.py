# 이야기형으로 개편하지 않은 17개 단원에 '우리 반' 탭을 넣는다. 여러 번 돌려도 안전하다.
import glob, io, os, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"
REPOS = ["climate-change-ecology", "convergence-science-inquiry", "science-history-culture",
         "science-inquiry-1", "science-inquiry-2"]
SKIP_WORK = "아직 헷갈리는 것"          # 다음 시간을 위한 혼자 메모라 반에 올리지 않는다

def work_items(s):
    out = re.findall(r'"id":\s*"(w\d+)"[\s,]*\n?\s*"label":\s*"([^"]+)"', s)
    if not out:
        out = re.findall(r'\{\s*id:\s*"(w\d+)",\s*label:\s*"([^"]+)"', s)
    return [(i, l) for i, l in out if l.strip() != SKIP_WORK]

done = skipped = 0
for repo in REPOS:
    for p in sorted(glob.glob(ROOT + repo + "/*/index.html")):
        rel = os.path.relpath(p, ROOT).replace("\\", "/")
        s = open(p, encoding="utf-8", newline="").read()
        if 'id="share"' in s:
            print("건너뜀(이미 있음):", rel); skipped += 1; continue

        unit = re.search(r'window\.sthUnit\("([^"]+)"\)', s)
        label = re.search(r'unitLabel:\s*"([^"]+)"', s)
        works = work_items(s)
        if not (unit and label and works):
            print("!! 정보 부족:", rel, bool(unit), bool(label), len(works)); continue

        tabs = re.findall(r'<button class="tab-btn[^"]*" data-tab="(\d+)"', s)
        n = max(int(t) for t in tabs) + 1
        num = "%02d" % (n + 1)

        # 1) 탭 단추 — 마지막 탭 단추 뒤에
        last = None
        for m in re.finditer(r'<button class="tab-btn[^>]*>.*?</button>', s):
            last = m
        btn = '\n    <button class="tab-btn" data-tab="%d"><span class="num">%s</span> 우리 반</button>' % (n, num)
        s = s[:last.end()] + btn + s[last.end():]

        # 2) 탭 내용 — </main> 앞에
        panel = ('\n    <!-- ===================================================================== %s 우리 반 -->\n'
                 '    <section class="tab-panel" data-panel="%d" hidden>\n'
                 '      <div class="stage-head">\n'
                 '        <div class="eyebrow">%s · 같은 반 친구들과 나누기</div>\n'
                 '        <h2 class="display">우리 반</h2>\n'
                 '        <p>정리하기에 쓴 것을 우리 반에 올리고, 같은 반 친구들이 어디까지 했는지 함께 보세요. '
                 '<b>올리기 버튼을 눌렀을 때만</b> 공유됩니다. 실명 대신 별명을 쓰고, 글까지 올릴지는 직접 고르세요.</p>\n'
                 '      </div>\n'
                 '      <div class="stage-card"><div id="share"></div></div>\n'
                 '    </section>\n') % (num, n, num)
        i = s.rindex("</main>")
        s = s[:i] + panel + "\n  " + s[i:]

        # 3) 스타일·스크립트
        s = s.replace('<link rel="stylesheet" href="../assets/theme.css">',
                      '<link rel="stylesheet" href="../assets/theme.css">\n<link rel="stylesheet" href="../assets/share.css">', 1)
        s = s.replace('<script src="../assets/theme.js"></script>',
                      '<script src="../assets/theme.js"></script>\n<script src="../assets/share-config.js"></script>\n<script src="../assets/share.js"></script>', 1)

        # 4) sthShare 호출 — 마지막 스크립트 블록의 })(); 앞에
        call = ('  window.sthShare({\n'
                '    mount: "share",\n'
                '    unit: "%s",\n'
                '    unitLabel: "%s",\n'
                '    works: [\n%s\n'
                '    ]\n'
                '  });\n') % (unit.group(1), label.group(1),
                              ",\n".join('      { id: "%s", label: "%s" }' % (i, l) for i, l in works))
        j = s.rindex("})();")
        s = s[:j] + call + s[j:]

        open(p, "w", encoding="utf-8", newline="").write(s)
        print("넣음 %-28s 탭%d · 답안 %d칸" % (rel, n, len(works)))
        done += 1

print("\n넣은 단원 %d개, 건너뛴 단원 %d개" % (done, skipped))
