# story.css 안의 '우리 반 공유 탭' 스타일만 떼어 share.css 를 만들고,
# story.css 가 없는 저장소(이야기형으로 개편하지 않은 단원)에 나눠 넣는다.
# story.css 를 쓰는 저장소에는 같은 내용이 이미 들어 있으므로 넣지 않는다.
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"
PLAIN = ["climate-change-ecology", "convergence-science-inquiry", "science-history-culture",
         "science-inquiry-1", "science-inquiry-2"]

src = open(ROOT + "earth-science-2/assets/story.css", encoding="utf-8", newline="").read()
i = src.find("/* =========================================================================\n   우리 반 공유 탭 (share.js)")
assert i > 0, "story.css 에서 공유 탭 스타일을 못 찾았습니다"
head = ("/* =========================================================================\n"
        "   우리 반 공유 탭 전용 스타일 (share.js)\n"
        "   story.css 가 없는 단원에서 theme.css 다음에 불러온다.\n"
        "   story.css 를 쓰는 단원에는 같은 내용이 그 안에 들어 있으므로 함께 부르지 않는다.\n"
        "   이 파일은 _tools/make_share_css.py 가 story.css 에서 만들어 낸다.\n"
        "   ========================================================================= */\n")
body = src[i:]
body = body[body.index("*/") + 3:].lstrip("\n")
for repo in PLAIN:
    open(ROOT + repo + "/assets/share.css", "w", encoding="utf-8", newline="").write(head + body)
    print("넣음", repo + "/assets/share.css")
