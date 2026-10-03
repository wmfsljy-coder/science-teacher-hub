# 바깥 자료 카드(data-link)의 주소가 살아 있는지 확인한다. 학기 초와 수업 전에 한 번씩 돌린다.
#   python linkcheck.py
# 주소마다 응답 코드를 찍고, 200 번대가 아니면 '확인 필요'로 표시한다. 지도 카드(data-map)는 구글 공식 주소라 건너뛴다.
import glob, io, json, re, sys, urllib.request, ssl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"
found = {}
for f in glob.glob(ROOT + "*/*/*.js") + glob.glob(ROOT + "*/*/index.html"):
    f = f.replace(chr(92), "/"); s = open(f, encoding="utf-8").read()
    for m in re.finditer(r"data-link='(\{.*?\})'", s):
        raw = m.group(1).replace('\\"', '"')
        try: p = json.loads(raw)
        except Exception: print("읽기 실패", f, raw[:60]); continue
        found.setdefault(p["url"], []).append(f.replace(ROOT, "").rsplit("/", 1)[0] + " #" + p["id"])
ctx = ssl.create_default_context()
bad = 0
for url, where in sorted(found.items()):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (link check for school lessons)"})
        with urllib.request.urlopen(req, timeout=20, context=ctx) as r: code = r.status
    except urllib.error.HTTPError as e: code = e.code
    except Exception as e: code = "오류 " + type(e).__name__
    ok = isinstance(code, int) and 200 <= code < 400
    bad += 0 if ok else 1
    print(("  ok " if ok else "확인 필요 ") + str(code), url, "←", ", ".join(where))
print("주소", len(found), "· 확인 필요", bad)
