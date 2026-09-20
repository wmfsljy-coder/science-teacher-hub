# 시범 단원(2-1)에 '우리 반' 탭을 붙이고, story.css 에 공유 탭 스타일을 덧붙인다. 한 번만 실행.
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
ROOT = "C:/Users/user/Desktop/클로드/과학허브/"

def rw(path, fn):
    p = ROOT + path
    s = open(p, encoding="utf-8").read()
    s2 = fn(s)
    open(p, "w", encoding="utf-8", newline="").write(s2)
    print("ok", path)

CSS = '''
/* =========================================================================
   우리 반 공유 탭 (share.js)
   ========================================================================= */
.share { padding: 18px 20px 22px; }
.share h4 { font-family: "Jua"; font-weight: 400; font-size: 17px; margin: 18px 0 10px; color: var(--ink); }
.share-id { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
.share-id label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; font-weight: 800; color: var(--mist); }
.share-id input { border: 2px solid var(--line); border-radius: 12px; padding: 8px 12px; font-size: 14px; font-family: inherit;
  background: var(--card-2); color: var(--ink); width: 150px; }
.share-id input:focus { outline: none; border-color: var(--brand); }
.sm-row { display: flex; gap: 10px; flex-wrap: wrap; padding: 9px 12px; border-radius: 12px; background: var(--card-2);
  border: 2px solid var(--line); margin-bottom: 6px; font-size: 13px; color: var(--mist); }
.sm-row b { color: var(--ink); }
.sm-row.ok { background: var(--teal-100); border-color: var(--teal-100); color: var(--teal-700); }
.share-act { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 14px; }
.sh-check { font-size: 12.5px; color: var(--mist); width: 100%; }
.sh-note { font-size: 13px; color: var(--mist); line-height: 1.7; margin: 16px 0 0; }
.sh-bar { font-size: 12.5px; color: var(--ink); margin-bottom: 8px; }
.sh-bar i { display: block; height: 8px; border-radius: 999px; background: var(--card-2); border: 1px solid var(--line); overflow: hidden; margin-top: 4px; }
.sh-bar i b { display: block; height: 100%; background: var(--teal); }
.sh-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); gap: 10px; margin-top: 14px; }
.sh-card { border: 2px solid var(--line); border-radius: 16px; padding: 12px 14px; background: var(--card); font-size: 12.5px; line-height: 1.65; color: var(--ink); }
.sh-card.me { border-color: var(--brand); }
.sh-card .sh-nick { font-family: "Jua"; font-size: 15px; margin-bottom: 4px; }
.sh-card p { margin: 0 0 4px; color: var(--mist); }
.sh-card p b { color: var(--ink); }
.sh-card blockquote { margin: 8px 0 0; padding: 8px 10px; border-radius: 10px; background: var(--amber-100); color: #3a2a00; }
'''

def css(s):
    assert "share.js" not in s
    return s.rstrip("\n") + "\n" + CSS

def html(s):
    a = '    <button class="tab-btn" data-tab="3"><span class="num">04</span> 정리하기</button>\n'
    assert s.count(a) == 1
    s = s.replace(a, a + '    <button class="tab-btn" data-tab="4"><span class="num">05</span> 우리 반</button>\n')
    b = "  </main>"
    assert s.count(b) == 1
    s = s.replace(b, '''
    <!-- ===================================================================== 05 우리 반 -->
    <section class="tab-panel" data-panel="4" hidden>
      <div class="stage-head">
        <div class="eyebrow">05 · 같은 반 친구들과 나누기</div>
        <h2 class="display">우리 반</h2>
        <p>내가 해결한 사건과 찾아낸 답을 우리 반에 올리고, 친구들은 어떤 작전을 세웠는지 살펴보세요. <b>올리기 버튼을 눌렀을 때만</b> 공유됩니다. 실명 대신 별명을 쓰세요.</p>
      </div>
      <div class="stage-card"><div id="share"></div></div>
    </section>
  </main>''')
    c = '<script src="../assets/story.js"></script>'
    assert s.count(c) == 1
    return s.replace(c, c + '\n<script src="../assets/share-config.js"></script>\n<script src="../assets/share.js"></script>')

def js(s):
    s = s.rstrip()
    assert s.endswith("})();")
    return s[:-5] + '''/* ========================================================================= 05 우리 반 */
window.sthShare({
  mount: "share", unit: "is2-2-1", unitLabel: "[통합과학2 Ⅱ-1] 생태계와 환경 변화",
  rows: [
    { key: "r1", label: "① 한 나무, 두 가지 잎" },
    { key: "r2", label: "② 늑대가 돌아왔다" },
    { key: "r3", label: "③ 2℃의 문턱" }
  ],
  line: { id: "all", label: "세 사건을 꿰는 한 문장" }
});

})();
'''

rw("integrated-science-2/assets/story.css", css)
rw("integrated-science-2/2-1/index.html", html)
rw("integrated-science-2/2-1/episodes.js", js)
