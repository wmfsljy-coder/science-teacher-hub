# 탭별 장면 제목을 뽑아 본다 (문제를 이야기와 맞추려고).  python _tools/scenes.py <단원> ...
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
for u in sys.argv[1:]:
    h = open(u + "/index.html", encoding="utf-8").read()
    print("=====", u)
    for m in re.finditer(r'<section class="tab-panel" data-panel="(\d+)"[^>]*>(.*?)(?=<section class="tab-panel"|</main>)', h, re.S):
        p = m.group(2)
        t = re.search(r'<h2 class="display">(.*?)</h2>', p)
        sc = re.findall(r'data-title="([^"]+)"', p)
        if sc: print(" -", t.group(1) if t else "", ":", " / ".join(sc))
