# 사진·영상·움짤 품질 기준 검사 — VISUAL_GUIDE.md '3단계' 를 기계로 확인한다.
#   python -X utf8 _tools/mediacheck.py            (모든 과목)
#   python -X utf8 _tools/mediacheck.py earth-system-1/1-2   (단원 하나)
# 과목 저장소가 science-teacher-hub 안에 있든(학교 PC) 옆에 있든(집 노트북) 모두 찾는다.
# 파일만 읽는 검사다. 움직임이 실제로 멈추는지는 브라우저에서 mediarun.js 로 본다.
import os, re, sys, glob
try:
    from PIL import Image
except ImportError:
    Image = None
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

HUB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = [u for u in open(os.path.join(HUB, '_tools', 'ALL_UNITS.txt'), encoding='utf-8').read().split() if u]
ONLY = sys.argv[1:] or None
BAN_EXT = ('.gif', '.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff')
VIDEO_EXT = ('.mp4', '.webm', '.mov')
# 땅·바다·우주 그림은 크기·높이를 늘 바꿔 그리므로 비율 안내가 필수인 과목
SCALE_REPOS = ('earth-science-2', 'earth-system-1', 'earth-system-2', 'planet-space-1', 'planet-space-2', 'climate-change-ecology')
SCALE_WORDS = re.compile(r'art-note|실제 비율')


def unit_dir(u):
    for root in (HUB, os.path.dirname(HUB)):
        p = os.path.join(root, *u.split('/'))
        if os.path.isdir(p):
            return p
    return None


def sentences(s):
    s = re.sub(r'<span class="art-note">.*?</span>', '', s, flags=re.S)   # 비율 안내는 설명 문장 수에 넣지 않는다
    s = re.sub(r'<[^>]+>', '', s).strip()
    return [x for x in re.split(r'(?<=[다요]\.)\s+', s) if x.strip()]


problems, notes, seen = [], [], 0
for u in UNITS:
    if ONLY and u not in ONLY:
        continue
    d = unit_dir(u)
    if not d:
        continue
    seen += 1
    html = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
    figures = list(re.finditer(r'<figure class="hero-art">(.*?)</figure>', html, re.S))
    heroes = [m.group(1) for m in figures]
    if not heroes and 'hero-art: 없음' not in html:
        problems.append((u, '대표 그림(hero-art) 없음'))
    elif not heroes:
        notes.append((u, '대표 그림 없음(표시됨): ' + re.search(r'hero-art: 없음[^>]*', html).group(0)))
    used = set()
    for fm in figures:
        h = fm.group(1)
        m = re.search(r'<img src="([^"]+)" alt="([^"]*)"([^>]*)>', h)
        c = re.search(r'<figcaption><b>([^<]*)</b>(.*?)</figcaption>', h, re.S)
        if not m or not c:
            problems.append((u, 'hero-art 마크업 형식이 다름'))
            continue
        src, alt, rest = m.groups()
        title, cap = c.groups()
        used.add(src)
        if not src.startswith('img/') or not src.endswith('.webp'):
            problems.append((u, '그림은 img/*.webp 여야 함: ' + src))
        if 'width="900"' not in rest or 'height="900"' not in rest:
            problems.append((u, 'img 에 width="900" height="900" 없음(읽는 중 화면이 밀림)'))
        if 'loading="lazy"' not in rest:
            problems.append((u, 'loading="lazy" 없음'))
        if len(alt) < 20:
            problems.append((u, 'alt 가 너무 짧음'))
        if not re.search(r'(습니다|니다)$', title.strip()):
            problems.append((u, '훅 제목이 -습니다/-니다 로 끝나지 않음: ' + title))
        n = len(sentences(cap))
        if not 2 <= n <= 3:
            problems.append((u, '설명이 %d문장 (2~3문장이어야 함)' % n))
        if u.split('/')[0] in SCALE_REPOS and not SCALE_WORDS.search(cap):
            problems.append((u, '비율 안내 없음: figcaption 끝에 <span class="art-note">⚠ …</span>'))
        # 그림은 그 장면 stage-card 바로 앞에 둔다
        after = re.sub(r'<!--.*?-->', '', html[fm.end():fm.end() + 400], flags=re.S).lstrip()
        if not after.startswith('<div class="stage-card'):
            notes.append((u, '대표 그림 바로 뒤가 stage-card 가 아님: ' + after[:40].replace('\n', ' ')))
        p = os.path.join(d, *src.split('/'))
        if not os.path.exists(p):
            problems.append((u, '그림 파일 없음: ' + src))
            continue
        sz = os.path.getsize(p)
        if sz > 190000:
            problems.append((u, '그림 용량 %d B (190 KB 이하)' % sz))
        if Image:
            w, hh = Image.open(p).size
            if (w, hh) != (900, 900):
                problems.append((u, '그림 크기 %dx%d (900x900)' % (w, hh)))
    # 금지 형식·영상 규칙
    files = glob.glob(os.path.join(d, 'img', '*'))
    names = {os.path.basename(f) for f in files}
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        rel = os.path.relpath(f, d).replace('\\', '/')
        sz = os.path.getsize(f)
        if ext in BAN_EXT:
            problems.append((u, 'webp 가 아닌 그림/움짤: ' + rel))
        if ext in VIDEO_EXT:
            if sz > 8_000_000:
                problems.append((u, '영상이 너무 큼(%d B): %s' % (sz, rel)))
            elif sz > 2_000_000:
                notes.append((u, '영상 2 MB 넘음(쇼츠만 8 MB 까지): ' + rel))
            if ext == '.mov':
                problems.append((u, '.mov 대신 mp4 + webm: ' + rel))
            if ext in ('.mp4', '.webm'):
                other = os.path.splitext(os.path.basename(f))[0] + ('.webm' if ext == '.mp4' else '.mp4')
                if other not in names:
                    problems.append((u, 'mp4·webm 두 벌이어야 함, 없는 것: ' + other))
        if ext == '.webp' and rel not in used and sz > 2_000_000:
            problems.append((u, '움짤 webp 2 MB 넘음: ' + rel))
    for v in re.findall(r'<video[^>]*>', html):
        for need in ('controls', 'muted', 'playsinline', 'preload="none"', 'poster='):
            if need not in v:
                problems.append((u, '<video> 에 %s 없음' % need))
        if re.search(r'\b(autoplay|loop)\b', v):
            problems.append((u, '<video> 는 autoplay·loop 금지'))
        pm = re.search(r'poster="([^"]+)"', v)
        if pm and not os.path.exists(os.path.join(d, *pm.group(1).split('/'))):
            problems.append((u, '영상 포스터 파일 없음: ' + pm.group(1)))
    # 캔버스 움직임(별칭 SK·KT·KB 등도 본다). 파일 단위로만 본다 — 그림별로는 mediarun.js
    ep = os.path.join(d, 'episodes.js')
    if os.path.exists(ep):
        js = open(ep, encoding='utf-8').read()
        if re.search(r'\b[A-Za-z]*K[A-Za-z]*\.animate\(', js) and 'REDUCE' not in js:
            problems.append((u, 'K.animate 를 쓰는데 K.REDUCE(움직임 줄이기) 처리가 없음'))
        if 'requestAnimationFrame' in js:
            problems.append((u, 'requestAnimationFrame 금지(K.animate 를 쓴다)'))
        if re.search(r'devicePixelRatio', js):
            problems.append((u, 'devicePixelRatio 대신 canvas.width / canvas._w 를 쓴다(버퍼는 늘 2배)'))

print('단원 %d개 검사' % seen)
for u, msg in notes:
    print(' · 참고', u, '—', msg)
if problems:
    for u, msg in problems:
        print(' ✗', u, '—', msg)
    sys.exit(1)
print('문제 없음')
