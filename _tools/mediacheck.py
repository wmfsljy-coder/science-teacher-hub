# 사진·영상·움짤 품질 기준 검사 — VISUAL_GUIDE.md '3단계' 를 기계로 확인한다.
#   python -X utf8 _tools/mediacheck.py            (모든 과목)
#   python -X utf8 _tools/mediacheck.py earth-system-1/1-2   (단원 하나)
# 과목 저장소가 science-teacher-hub 안에 있든(학교 PC) 옆에 있든(집 노트북) 모두 찾는다.
import os, re, sys, glob
try:
    from PIL import Image
except ImportError:
    Image = None

HUB = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNITS = [u for u in open(os.path.join(HUB, '_tools', 'ALL_UNITS.txt'), encoding='utf-8').read().split() if u]
ONLY = sys.argv[1:] or None
BAN_EXT = ('.gif', '.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff')
VIDEO_EXT = ('.mp4', '.webm', '.mov')


def unit_dir(u):
    for root in (HUB, os.path.dirname(HUB)):
        p = os.path.join(root, *u.split('/'))
        if os.path.isdir(p):
            return p
    return None


def sentences(s):
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
    heroes = re.findall(r'<figure class="hero-art">(.*?)</figure>', html, re.S)
    if not heroes and 'hero-art: 없음' not in html:
        problems.append((u, '대표 그림(hero-art) 없음'))
    elif not heroes:
        notes.append((u, '대표 그림 없음(표시됨): ' + re.search(r'hero-art: 없음[^>]*', html).group(0)))
    for h in heroes:
        m = re.search(r'<img src="([^"]+)" alt="([^"]*)"([^>]*)>', h)
        c = re.search(r'<figcaption><b>([^<]*)</b>(.*?)</figcaption>', h, re.S)
        if not m or not c:
            problems.append((u, 'hero-art 마크업 형식이 다름'))
            continue
        src, alt, rest = m.groups()
        title, cap = c.groups()
        if not src.startswith('img/') or not src.endswith('.webp'):
            problems.append((u, '그림은 img/*.webp 여야 함: ' + src))
        if 'loading="lazy"' not in rest:
            problems.append((u, 'loading="lazy" 없음'))
        if len(alt) < 20:
            problems.append((u, 'alt 가 너무 짧음'))
        if not re.search(r'(습니다|니다)$', title.strip()):
            problems.append((u, '훅 제목이 -습니다/-니다 로 끝나지 않음: ' + title))
        n = len(sentences(cap))
        if not 2 <= n <= 3:
            problems.append((u, '설명이 %d문장 (2~3문장이어야 함)' % n))
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
    for f in glob.glob(os.path.join(d, 'img', '*')):
        ext = os.path.splitext(f)[1].lower()
        rel = os.path.relpath(f, d).replace('\\', '/')
        if ext in BAN_EXT:
            problems.append((u, 'webp 가 아닌 그림/움짤: ' + rel))
        if ext in VIDEO_EXT:
            sz = os.path.getsize(f)
            if sz > 8_000_000:
                problems.append((u, '영상이 너무 큼(%d B): %s' % (sz, rel)))
    for v in re.findall(r'<video[^>]*>', html):
        for need in ('controls', 'muted', 'playsinline', 'preload="none"', 'poster='):
            if need not in v:
                problems.append((u, '<video> 에 %s 없음' % need))
        if re.search(r'\b(autoplay|loop)\b', v):
            problems.append((u, '<video> 는 autoplay·loop 금지'))
    # 캔버스 움직임: K.animate 를 쓰면 멈추기 단추와 K.REDUCE 처리가 있어야 함
    ep = os.path.join(d, 'episodes.js')
    if os.path.exists(ep):
        js = open(ep, encoding='utf-8').read()
        if 'K.animate(' in js and 'REDUCE' not in js:
            problems.append((u, 'K.animate 를 쓰는데 K.REDUCE(움직임 줄이기) 처리가 없음'))

print('단원 %d개 검사' % seen)
for u, msg in notes:
    print(' · 참고', u, '—', msg)
if problems:
    for u, msg in problems:
        print(' ✗', u, '—', msg)
    sys.exit(1)
print('문제 없음')
