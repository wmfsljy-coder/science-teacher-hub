# 단원별 학습 목표(성취기준)·핵심 용어·이야기 제목을 뽑아 본다.  python _tools/objectives.py integrated-science-2/1-1 ...
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
def strip(s): return re.sub(r"<[^>]+>", "", s).strip()
for u in sys.argv[1:]:
    h = open(u + "/index.html", encoding="utf-8").read()
    print("=====", u, strip(re.search(r"<title>(.*?)</title>", h).group(1)))
    for m in re.finditer(r'<section class="tab-panel" data-panel="(\d+)"[^>]*>(.*?)(?=<section class="tab-panel"|</main>)', h, re.S):
        p = m.group(2)
        t = re.search(r'<h2 class="display">(.*?)</h2>', p)
        eb = re.search(r'<div class="eyebrow">(.*?)</div>', p)
        stds = re.findall(r"<b>\[([^\]]+)\]</b>\s*(.*?)(?=<br>|</div>)", p)
        terms = re.findall(r"<b>([^<]+)</b>", (re.search(r'<div class="terms">(.*?)</div>', p) or [None, ""])[1] if re.search(r'<div class="terms">(.*?)</div>', p) else "")
        if not stds: continue
        print("-", strip(eb.group(1)) if eb else "", "|", strip(t.group(1)) if t else "")
        for c, s in stds: print("   [%s] %s" % (c, strip(s)))
        if terms: print("   용어:", ", ".join(terms))
