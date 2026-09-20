# 사용: python _tools/check_ids.py integrated-science-2/2-2
# episodes.js 가 찾는 id 가 index.html 에 모두 있는지, id 중복은 없는지 본다.
import io, re, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
d = sys.argv[1].rstrip("/\\")
html = open(d + "/index.html", encoding="utf-8").read()
js = open(d + "/episodes.js", encoding="utf-8").read()

ids = re.findall(r'\bid="([^"]+)"', html)
dup = sorted({i for i in ids if ids.count(i) > 1})
want = set(re.findall(r'\$\("([^"]+)"\)', js))
want |= set(re.findall(r'getElementById\("([^"]+)"\)', js))
want |= set(re.findall(r'\b(?:mount|gate|root|veil):\s*"([^"]+)"', js))
want |= set(re.findall(r'(?:sthMission|done)\("([^"]+)"', js))
made = set(re.findall(r"id='([^']+)'", js)) | set(re.findall(r'id=\\"([^"\\]+)\\"', js))
missing = sorted(i for i in want if i not in ids and i not in made and not i.endswith("-recap"))

bad = False
if dup: print("중복 id:", dup); bad = True
if missing: print("HTML에 없는 id:", missing); bad = True
for need in ["../assets/theme.js", "../assets/story.js", "../assets/share-config.js", "../assets/share.js", "episodes.js", "../assets/story.css"]:
    if need not in html: print("빠진 파일 참조:", need); bad = True
if "requestAnimationFrame" in js: print("requestAnimationFrame 사용 금지(setTimeout 사용)"); bad = True
if "확인 필요" in html or "확인 후 채워" in html: print("옛 '확인 필요' 문구가 남아 있음"); bad = True
print("문제 없음" if not bad else "↑ 고쳐야 함", "| id", len(ids), "개, JS 참조", len(want), "개")
sys.exit(1 if bad else 0)
