# 학생 화면을 과목 안에 가둔다: 교사 허브로 가는 링크는 교사 기기(sth-teacher=1)에서만 보인다.
# + 공용 theme.css 의 모바일 테마 버튼 늘어남 수정, 이야기·공유 부품 배포.
import io, os, re, shutil, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"
SRC = ROOT + "integrated-science-2/assets/"

def read(p): return open(p, encoding="utf-8", newline="").read()
def write(p, s): open(p, "w", encoding="utf-8", newline="").write(s)

GUARD = '<script>try{if(localStorage.getItem("sth-teacher")!=="1")document.currentScript.previousElementSibling.remove()}catch(e){document.currentScript.previousElementSibling.remove()}</script>'

# 1) theme.js — 단원 페이지의 '← 허브' 링크는 교사 기기에서만
js = read(SRC + "theme.js")
old = '    if (!brand || brand.querySelector("a.hub")) return;\n'
if "sth-teacher" not in js:
    nl = "\r\n" if "\r\n" in js else "\n"
    old = old.replace("\n", nl)
    assert js.count(old) == 1
    js = js.replace(old, old + '    /* 학생 기기에서는 과목 밖으로 나가는 길을 만들지 않는다. 교사 허브를 연 적이 있는 기기에서만 보인다. */' + nl
                    + '    try { if (localStorage.getItem("sth-teacher") !== "1") return; } catch (e) { return; }' + nl)
    write(SRC + "theme.js", js)
css = read(SRC + "theme.css")

repos = sorted(d for d in os.listdir(ROOT) if os.path.isfile(ROOT + d + "/assets/theme.js"))
for r in repos:
    write(ROOT + r + "/assets/theme.js", js)
    write(ROOT + r + "/assets/theme.css", css)
print("theme →", len(repos), "repos")

# 2) 이야기·공유 부품 배포
for r in ["earth-system-1", "earth-system-2", "planet-space-1", "planet-space-2"]:
    for f in ["story.js", "story.css", "share.js", "share-config.js"]:
        shutil.copyfile(SRC + f, ROOT + r + "/assets/" + f)
print("story/share → 4 repos")

# 3) 허브로 가는 정적 링크
for r in sorted(os.listdir(ROOT)):
    p = ROOT + r + "/index.html"
    if r == "science-teacher-hub" or not os.path.isfile(p):
        continue
    s = read(p)
    if "science-teacher-hub/" not in s or "sth-teacher" in s:
        continue
    if r in ("integrated-science-1", "integrated-science-2"):
        s2 = re.sub(r'<a class="back" href="https://wmfsljy-coder\.github\.io/science-teacher-hub/">[^<]*</a>',
                    '<a class="back" href="https://wmfsljy-coder.github.io/integrated-science/">← 통합과학</a>', s)
    else:
        s2 = re.sub(r'(<div class="back-link"><a href="https://wmfsljy-coder\.github\.io/science-teacher-hub/">[^<]*</a></div>'
                    r'|<a class="back" href="https://wmfsljy-coder\.github\.io/science-teacher-hub/">[^<]*</a>)',
                    lambda m: m.group(1) + GUARD, s)
    assert s2 != s, r
    write(p, s2)
    print("link", r)

# 4) 교사 허브: 이 기기를 교사 기기로 표시 + QR 안내 문구
p = ROOT + "science-teacher-hub/index.html"
s = read(p)
if "sth-teacher" not in s:
    a = '<script src="assets/theme.js"></script>'
    assert s.count(a) == 1
    s = s.replace(a, '<script>try{localStorage.setItem("sth-teacher","1")}catch(e){}</script>\n' + a)
    b = "학생들이 휴대폰이나 태블릿으로 찍으면 이 페이지로 바로 접속됩니다."
    assert s.count(b) == 1
    s = s.replace(b, "이 페이지는 교사용 허브입니다. 학생에게는 과목 페이지에 있는 QR을 나눠 주세요. 학생 화면에는 다른 과목으로 가는 길이 보이지 않습니다.")
    write(p, s)
    print("hub flagged")
