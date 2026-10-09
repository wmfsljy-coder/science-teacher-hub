/** 우리 반 공유 뒷단 — 구글 시트에 붙여 쓰는 Apps Script.
 *
 *  시트 'share'  : 시각 | 반 | 별명 | 단원 | 단원이름 | 성과(JSON) | 한 문장 | 숨김
 *                  학생 한 명의 한 단원에 한 줄. 다시 올리면 그 줄을 덮어쓴다(지금 상태).
 *  시트 '활동'   : 시각 | 반 | 별명 | 단원 | 단원이름 | 올린 칸 수 | 처음/다시
 *                  올릴 때마다 한 줄씩 쌓기만 한다(반별 활동 기록). 덮어쓰지 않는다.
 *  시트 '설정'   : A1 '교사 열쇠' / B1 에 아무도 모르는 글자. 선생님 화면에서 이 열쇠를 넣어야
 *                  모든 반을 한눈에 볼 수 있다. 시트를 처음 쓸 때 저절로 만들어진다.
 *  시트 '반목록'(선택) : A열에 허용할 반 코드를 적으면 그 반만 받는다. 없으면 모두 받는다.
 *  시트 '투표'   : 시각 | 반 | 별명 | 단원 | 첫 추리 열쇠 | 처음 고른 보기 | 다시 고른 보기 | 숨김
 *                  첫 추리에서 학생이 ‘우리 반 투표에 보내기’를 누르면 쌓인다(같은 반·별명·단원·열쇠는 덮어쓴다).
 *  시트 '측정값' : 시각 | 반 | 별명 | 단원 | 측정 | 값(JSON {v:[숫자 1~3개], g:잰 자리}) | 숨김
 *                  단원의 ‘우리 반 측정값’(선택 활동, assets/measure.js)이 올린다. 같은 반·별명·단원·측정은 덮어쓴다.
 *
 *  'share' 의 '숨김' 칸에 아무 글자나 적으면 그 줄은 학생 화면에 나오지 않는다.
 *  한 반을 통째로 지우려면 POST {action:'wipe', key, cls, confirm:'지움'} (되돌릴 수 없다).
 *  교사 화면도 POST {action:'teacher', key} 로 받는다 — 열쇠가 주소에 남지 않게.
 */
var SHEET = 'share';
var LOG = '활동';
var CONF = '설정';
var MEASURE = '측정값';
var VOTE = '투표';

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['시각', '반', '별명', '단원', '단원이름', '성과(JSON)', '한 문장', '숨김']);
  }
  return sh;
}
function voteSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(VOTE);
  if (!sh) {
    sh = ss.insertSheet(VOTE);
    sh.appendRow(['시각', '반', '별명', '단원', '첫 추리 열쇠', '처음 고른 보기', '다시 고른 보기', '숨김']);
  }
  return sh;
}
function measureSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(MEASURE);
  if (!sh) {
    sh = ss.insertSheet(MEASURE);
    sh.appendRow(['시각', '반', '별명', '단원', '측정', '값(JSON)', '숨김']);
  }
  return sh;
}
function logSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(LOG);
  if (!sh) {
    sh = ss.insertSheet(LOG);
    sh.appendRow(['시각', '반', '별명', '단원', '단원이름', '올린 칸 수', '처음/다시']);
  }
  return sh;
}
/** 교사 열쇠. 없으면 만들어 둔다. */
function teacherKey_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONF);
  if (!sh) {
    sh = ss.insertSheet(CONF);
    var made = 'sth-' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    sh.getRange('A1').setValue('교사 열쇠');
    sh.getRange('B1').setValue(made);
    sh.getRange('A2').setValue('이 열쇠를 선생님 화면(반별 활동)에 한 번 넣으면 모든 반을 볼 수 있습니다. 바꾸고 싶으면 B1 을 고치세요.');
    sh.setColumnWidth(1, 120); sh.setColumnWidth(2, 260);
    return made;
  }
  return String(sh.getRange('B1').getValue()).trim();
}
/** 시트의 표준시를 스크립트와 맞춘다. 다르면 시각이 몇 시간씩 어긋나 기록된다. */
function ensureTz_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSpreadsheetTimeZone() !== 'Asia/Seoul') ss.setSpreadsheetTimeZone('Asia/Seoul');
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function cut_(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }
/** 학생이 보낸 글이 = + - @ 로 시작하면 시트가 수식으로 실행한다(=IMPORTXML 로 자료를 빼돌릴 수도 있다).
 *  앞에 ' 를 붙여 글자로만 저장한다. 시트에서 읽으면 ' 는 빠진 채로 돌아온다. */
function safe_(s) { s = String(s == null ? '' : s); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function ms_(v) { var t = v instanceof Date ? v.getTime() : Date.parse(v); return isNaN(t) ? null : t; }
/** 반목록 기본값 — 시트에 '반목록' 탭이 없을 때 준비하기가 만든다. 고칠 때는 시트의 탭을 고치면 된다(A열 코드만 본다). */
var CLASSES = (function () {
  var out = [], i, subj = [['지구과학', '지구과학'], ['지구시스템', '지구시스템과학'], ['행성우주', '행성우주과학'],
    ['기후환경', '기후변화와 환경생태'], ['융합탐구', '융합과학 탐구'], ['과학사', '과학의 역사와 문화']];
  for (i = 1; i <= 7; i++) out.push(['1-' + i, '1학년 ' + i + '반 (통합과학·과학탐구실험)']);
  subj.forEach(function (s) { (s[0] === '지구시스템' ? ['201', '207'] : ['A', 'B']).forEach(function (b) { out.push(['2-' + s[0] + b, '2학년 ' + s[1] + ' ' + b + '반']); }); });
  return out;
})();
function classSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('반목록');
  if (!sh) {
    sh = ss.insertSheet('반목록');
    sh.getRange(1, 1, CLASSES.length, 1).setNumberFormat('@');          /* '1-1' 이 날짜(1월 1일)로 바뀌지 않게 글자 칸으로 */
    sh.getRange(1, 1, CLASSES.length, 2).setValues(CLASSES);
    sh.setColumnWidth(1, 140); sh.setColumnWidth(2, 280);
  }
  return heal_(sh);
}
/** 반목록 A열에 날짜로 바뀐 반 코드(예: 2026-01-01 ← '1-1')가 있으면 '월-일' 글자로 되돌린다. */
function heal_(sh) {
  var n = sh.getLastRow(); if (n < 1) return sh;
  var rg = sh.getRange(1, 1, n, 1), v = rg.getValues(), bad = false;
  v = v.map(function (r) { var x = r[0]; if (x instanceof Date) { bad = true; return [(x.getMonth() + 1) + '-' + x.getDate()]; } return [x]; });
  if (bad) { rg.setNumberFormat('@'); rg.setValues(v); }
  return sh;
}
function allowed_(cls) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('반목록');
  if (!sh || sh.getLastRow() < 1) return true;
  heal_(sh);
  var list = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return String(r[0]).trim(); }).filter(String);
  return list.length === 0 || list.indexOf(cls) !== -1;
}

function doGet(e) {
  var p = e.parameter || {};

  /* 한 반의 한 단원 — 친구들이 올린 것 */
  if (p.action === 'list') {
    var cls = cut_(p.cls, 12), unit = cut_(p.unit, 24);
    var rows = sheet_().getDataRange().getValues(), items = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[1]) !== cls || String(r[3]) !== unit || String(r[7]).trim()) continue;
      var res = {};
      try { res = JSON.parse(r[5] || '{}'); } catch (err) {}
      delete res._ev;                                           // 수업 효과 기록은 선생님 화면에서만
      items.push({ nick: String(r[2]), results: res, line: String(r[6] || ''), t: r[0] });
    }
    return out_({ ok: true, items: items });
  }

  /* 한 반의 활동 기록 — 어느 단원에서 몇 명이, 마지막이 언제인지 */
  if (p.action === 'classlog') {
    var c2 = cut_(p.cls, 12);
    var rs = sheet_().getDataRange().getValues(), by = {};
    for (var k = 1; k < rs.length; k++) {
      var w = rs[k];
      if (String(w[1]) !== c2 || String(w[7]).trim()) continue;
      var u = String(w[3]);
      if (!by[u]) by[u] = { unit: u, label: String(w[4] || ''), n: 0, last: null };
      by[u].n++;
      if (String(w[4] || '')) by[u].label = String(w[4]);
      var t = ms_(w[0]);
      if (t !== null && (by[u].last === null || t > by[u].last)) by[u].last = t;
    }
    var units = Object.keys(by).map(function (u) { return by[u]; });
    units.sort(function (a, b) { return (b.last || 0) - (a.last || 0); });
    return out_({ ok: true, units: units });
  }

  /* 한 반의 한 단원 · 한 측정 — 친구들이 올린 측정값 (숨김 칸에 글자가 있으면 빼고) */
  if (p.action === 'measures') {
    var mc = cut_(p.cls, 12), mu = cut_(p.unit, 24), mk = cut_(p.key, 12), mitems = [];
    var msh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(MEASURE);
    var mv = msh ? msh.getDataRange().getValues() : [];
    for (var mi = 1; mi < mv.length; mi++) {
      var mr = mv[mi];
      if (String(mr[1]) !== mc || String(mr[3]) !== mu || String(mr[4]) !== mk || String(mr[6]).trim()) continue;
      var mo = {}; try { mo = JSON.parse(mr[5] || '{}'); } catch (err4) {}
      if (mo instanceof Array) mo = { v: mo };
      mitems.push({ nick: String(mr[2]), v: mo.v || [], g: String(mo.g || ''), t: ms_(mr[0]) });
    }
    return out_({ ok: true, items: mitems });
  }

  /* 한 반의 한 단원에서 처음에 많이 틀린 문항 — 별명 없이 문항별 인원만(학생 화면의 ‘다시 풀기’가 쓴다) */
  if (p.action === 'classmiss') {
    var xc = cut_(p.cls, 12), xu = cut_(p.unit, 24), xr = sheet_().getDataRange().getValues(), cnt = {}, ns = 0;
    for (var xi = 1; xi < xr.length; xi++) {
      var xw = xr[xi];
      if (String(xw[1]) !== xc || String(xw[3]) !== xu || String(xw[7]).trim()) continue;
      var xres = {}; try { xres = JSON.parse(xw[5] || '{}'); } catch (err5) {}
      var xe = String(xres._ev || ''); if (!xe) continue; ns++;
      xe.split('|').forEach(function (part) {
        if (part.slice(0, 2) !== 'x:') return;
        part.slice(2).split(',').forEach(function (id) { if (/^[\w-]{1,8}$/.test(id)) cnt[id] = (cnt[id] || 0) + 1; });
      });
    }
    var top = Object.keys(cnt).map(function (id) { return { id: id, n: cnt[id] }; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 10);
    return out_({ ok: true, students: ns, items: top });
  }

  /* 바로가기 탭 만들기 — 내용은 코드에 박힌 공개 링크뿐이라 열쇠 없이도 된다(이미 최신이면 아무것도 안 한다). */
  if (p.action === 'links') { ensureLinks_(false); return out_({ ok: true, ver: LINKS_VER, n: LINKS.length }); }

  /* 받는 반 코드 목록(반목록 탭 A열) — 코드는 학생 화면 소스에도 있는 공개 정보다. 비어 있으면 모든 반을 받는다. */
  if (p.action === 'classes') {
    var csh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('반목록');
    if (csh) heal_(csh);
    var codes = csh && csh.getLastRow() ? csh.getRange(1, 1, csh.getLastRow(), 1).getValues().map(function (r) { return String(r[0]).trim(); }).filter(String) : [];
    return out_({ ok: true, sheet: !!csh, classes: codes });
  }

  return out_({ ok: true, hello: 'sth-share', tz: SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(),
                now: new Date(), nowMs: Date.now() });
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: '형식 오류' }); }
  /* 학생 로그인·학습 기록(accounts.gs) — action 이 acc 로 시작하는 요청 */
  if (/^acc[A-Z]/.test(String(d.action || ''))) return out_(accounts_(d));
  /* 익명 돌려 읽기·동료 평가·궁금한 것 게시판(community.gs) — action 이 peer·q 로 시작하는 요청 */
  if (/^(peer|q)[A-Z]/.test(String(d.action || ''))) return out_(community_(d));
  /* '@학번' 이름은 로그인한 학생만 쓴다(투표·올리기·측정값) — 토큰이 그 학번과 맞아야 받는다 */
  if (/^(vote|post|measure)$/.test(String(d.action || '')) && cut_(d.nick, 12).charAt(0) === '@') {
    var aw = whoAmI_(d.t); if (!aw || '@' + aw.sid !== cut_(d.nick, 12)) return out_({ ok: false, error: '다시 로그인해 주세요' });
  }
  /* 교사 열쇠가 드는 요청은 주소창·방문 기록에 남지 않도록 POST 로만 받는다 */
  /* 선생님 화면 — 모든 반을 한눈에. 교사 열쇠가 맞아야 한다. */
  if (d.action === 'teacher') {
    if (cut_(d.key, 40) !== teacherKey_()) return out_({ ok: false, error: '열쇠가 맞지 않습니다' });
    var rs2 = sheet_().getDataRange().getValues();
    var cls_ = {}, cell = {}, units2 = {}, cs = {}, UI = unitInfo_();
    for (var a = 1; a < rs2.length; a++) {
      var v = rs2[a];
      if (String(v[7]).trim()) continue;
      var c = String(v[1]), un = String(v[3]), lb = String(v[4] || ''), nk = String(v[2]), tt = ms_(v[0]);
      if (!c || !un) continue;
      if (!cls_[c]) cls_[c] = { cls: c, nicks: {}, units: {}, last: null };
      cls_[c].nicks[nk] = 1; cls_[c].units[un] = 1;
      if (tt !== null && (cls_[c].last === null || tt > cls_[c].last)) cls_[c].last = tt;
      /* 과목별 — 반마다 그 과목을 올린 학생 수 */
      var sj = (UI.by[un] || {}).subj || '기타', sk = c + '\u0000' + sj;
      if (!cs[sk]) cs[sk] = { cls: c, subj: sj, nicks: {}, units: {}, last: null };
      cs[sk].nicks[nk] = 1; cs[sk].units[un] = 1;
      if (tt !== null && (cs[sk].last === null || tt > cs[sk].last)) cs[sk].last = tt;
      var ck = c + '\u0000' + un;
      if (!cell[ck]) cell[ck] = { cls: c, unit: un, n: 0, last: null };
      cell[ck].n++;
      if (tt !== null && (cell[ck].last === null || tt > cell[ck].last)) cell[ck].last = tt;
      if (lb) units2[un] = lb;
      else if (!units2[un]) units2[un] = un;
    }
    var classes = Object.keys(cls_).map(function (c) {
      return { cls: c, students: Object.keys(cls_[c].nicks).length, units: Object.keys(cls_[c].units).length, last: cls_[c].last };
    });
    classes.sort(function (x, y) { return x.cls < y.cls ? -1 : (x.cls > y.cls ? 1 : 0); });

    /* 최근 활동 — '활동' 시트의 끝에서부터 */
    var lg = logSheet_(), recent = [];
    var lastRow = lg.getLastRow();
    if (lastRow > 1) {
      var from = Math.max(2, lastRow - 59);
      var block = lg.getRange(from, 1, lastRow - from + 1, 7).getValues();
      for (var b = block.length - 1; b >= 0; b--) {
        var g = block[b];
        recent.push({ t: ms_(g[0]), cls: String(g[1]), nick: String(g[2]), unit: String(g[3]), label: String(g[4] || ''), n: g[5], kind: String(g[6] || '') });
      }
    }
    var bySubj = Object.keys(cs).map(function (k4) { var x = cs[k4]; return { cls: x.cls, subj: x.subj, students: Object.keys(x.nicks).length, units: Object.keys(x.units).length, last: x.last }; });
    return out_({ ok: true, classes: classes, cells: Object.keys(cell).map(function (k2) { return cell[k2]; }), units: units2, recent: recent, bySubj: bySubj });
  }

  /* 수업 효과 — 단원 × 반 마다 완료율·첫 추리 정답률·한 번에 맞힌 비율·막힌 장면. 교사 열쇠가 맞아야 한다.
     학생 화면이 올린 results._ev ( g:키=1/0,… | e:이야기=푼/전체@막힌 장면,… | q:한 번에/손댄 | x:처음에 틀린 문항,… ) 를 모은다. */
  if (d.action === 'evidence') {
    if (cut_(d.key, 40) !== teacherKey_()) return out_({ ok: false, error: '열쇠가 맞지 않습니다' });
    var ev = sheet_().getDataRange().getValues(), agg = {};
    for (var x = 1; x < ev.length; x++) {
      var q = ev[x];
      if (String(q[7]).trim()) continue;
      var ec = String(q[1]), eu = String(q[3]);
      if (!ec || !eu) continue;
      var rr = {}; try { rr = JSON.parse(q[5] || '{}'); } catch (err2) {}
      var ak = eu + '\u0000' + ec;
      if (!agg[ak]) agg[ak] = { unit: eu, label: String(q[4] || ''), cls: ec, n: 0, withEv: 0, g1: 0, gn: 0, gates: {}, eps: {}, q1: 0, qt: 0, lab: 0, pc: {}, miss: {} };
      var A = agg[ak]; A.n++;
      if (/응용 \d+\/\d+ 해결/.test(String(rr.rLab || '')) && !/응용 0\//.test(String(rr.rLab))) A.lab++;
      var s0 = String(rr._ev || '');
      if (!s0) continue;
      A.withEv++;
      s0.split('|').forEach(function (part) {
        var tag = part.slice(0, 2), body = part.slice(2);
        if (!body) return;
        body.split(',').forEach(function (it) {
          if (tag === 'g:') {
            var kv = it.split('='); if (kv.length < 2) return;
            var gg = A.gates[kv[0]] || (A.gates[kv[0]] = { k: kv[0], n: 0, ok: 0 });
            gg.n++; A.gn++; if (kv[1].charAt(0) === '1') { gg.ok++; A.g1++; }
          } else if (tag === 'e:') {
            var m = /^([^=]+)=(\d+)\/(\d+)(?:@(\d+))?$/.exec(it); if (!m) return;
            var ee = A.eps[m[1]] || (A.eps[m[1]] = { k: m[1], tot: +m[3], n: 0, done: 0, stuck: {} });
            ee.n++; if (+m[2] >= +m[3]) ee.done++; else if (m[4]) ee.stuck[m[4]] = (ee.stuck[m[4]] || 0) + 1;
          } else if (tag === 'q:') {
            var qm = /^(\d+)\/(\d+)$/.exec(it); if (qm) { A.q1 += +qm[1]; A.qt += +qm[2]; }
          } else if (tag === 'h:') {
            var hm = /^(\d+)\/(\d+)\/(\d+)$/.exec(it); if (hm) { A.ls = (A.ls || 0) + +hm[1]; A.lt = (A.lt || 0) + +hm[2]; A.hs = (A.hs || 0) + +hm[3]; }
          } else if (tag === 'p:') {
            pcAdd_(A.pc, it);
          } else if (tag === 'x:') {
            if (/^[\w-]{1,8}$/.test(it)) A.miss[it] = (A.miss[it] || 0) + 1;    // 처음에 틀린 문항
          }
        });
      });
    }
    var list = Object.keys(agg).map(function (k3) {
      var A = agg[k3];
      A.gates = Object.keys(A.gates).map(function (g2) { return A.gates[g2]; });
      A.eps = Object.keys(A.eps).map(function (e2) { return A.eps[e2]; });
      A.pc = Object.keys(A.pc).sort().map(function (p2) { return A.pc[p2]; });
      return A;
    });
    list.sort(function (a1, b1) { return a1.unit < b1.unit ? -1 : (a1.unit > b1.unit ? 1 : (a1.cls < b1.cls ? -1 : 1)); });
    return out_({ ok: true, rows: list });
  }

  /* 한 반 · 한 단원의 학생별 기록 — 모둠 편성과 '먼저 가 볼 학생'에 쓴다. 교사 열쇠가 맞아야 한다.
     학생 글(한 줄)은 보내지 않는다. 별명·첫 추리(맞음 여부·고른 보기)·이야기 진행·문항·실험실만. */
  if (d.action === 'students') {
    if (cut_(d.key, 40) !== teacherKey_()) return out_({ ok: false, error: '열쇠가 맞지 않습니다' });
    var wc = cut_(d.cls, 12), wu = cut_(d.unit, 24), sv = sheet_().getDataRange().getValues(), st = [];
    for (var y = 1; y < sv.length; y++) {
      var w = sv[y];
      if (String(w[7]).trim() || String(w[1]) !== wc || String(w[3]) !== wu) continue;
      var wr = {}; try { wr = JSON.parse(w[5] || '{}'); } catch (err3) {}
      var one = { nick: String(w[2]), t: ms_(w[0]), g: {}, e: {}, q: null, h: null, p: {}, x: [], r: null };
      String(wr._ev || '').split('|').forEach(function (part) {
        var tag = part.slice(0, 2), body = part.slice(2);
        if (!body) return;
        body.split(',').forEach(function (it) {
          if (tag === 'g:') { var kv = it.split('='); if (kv.length < 2) return; var gv = kv[1].split('~'); one.g[kv[0]] = [+gv[0], gv.length > 1 ? +gv[1] : null]; }
          else if (tag === 'e:') { var m = /^([^=]+)=(\d+)\/(\d+)(?:@(\d+))?$/.exec(it); if (m) one.e[m[1]] = [+m[2], +m[3], m[4] ? +m[4] : 0]; }
          else if (tag === 'q:') { var qm = /^(\d+)\/(\d+)$/.exec(it); if (qm) one.q = [+qm[1], +qm[2]]; }
          else if (tag === 'h:') { var hm = /^(\d+)\/(\d+)\/(\d+)$/.exec(it); if (hm) one.h = [+hm[1], +hm[2], +hm[3]]; }
          else if (tag === 'p:') { var pm = PC_RE.exec(it); if (pm) one.p[pm[1]] = [pm[2], pm[3] == null ? null : +pm[3]]; }
          else if (tag === 'x:') { if (/^[\w-]{1,8}$/.test(it)) one.x.push(it); }
          else if (tag === 'r:') { var rm = /^(\d+)\/(\d+)$/.exec(it); if (rm) one.r = [+rm[1], +rm[2]]; }
        });
      });
      st.push(one);
    }
    return out_({ ok: true, cls: wc, unit: wu, students: st });
  }

  /* 옛 시트의 기록을 옮겨 붙인다 — 교사 열쇠와 confirm:'옮김' 이 있어야 한다. rows: share 줄들, logs: 활동 줄들(첫 칸은 시각 숫자). */
  if (d.action === 'import') {
    if (cut_(d.key, 40) !== teacherKey_() || d.confirm !== '옮김') return out_({ ok: false, error: '열쇠 또는 확인이 맞지 않습니다' });
    ensureTz_();
    var ilk = LockService.getScriptLock(); if (!ilk.tryLock(20000)) return out_({ ok: false, error: '잠시 뒤 다시' });
    try {
      var fix = function (r, n) { var o = []; for (var c = 0; c < n; c++) { var v = r[c]; o.push(c === 0 ? new Date(+v || Date.parse(v) || Date.now()) : safe_(v == null ? '' : v)); } return o; };
      var A1 = (d.rows || []).slice(0, 5000).map(function (r) { return fix(r, 8); });
      var A2 = (d.logs || []).slice(0, 20000).map(function (r) { return fix(r, 7); });
      if (A1.length) { var s1 = sheet_(); s1.getRange(s1.getLastRow() + 1, 1, A1.length, 8).setValues(A1); }
      if (A2.length) { var s2 = logSheet_(); s2.getRange(s2.getLastRow() + 1, 1, A2.length, 7).setValues(A2); }
    } finally { ilk.releaseLock(); }
    return out_({ ok: true, rows: A1.length, logs: A2.length });
  }

  /* 한 반의 자료를 지운다 — 교사 열쇠가 맞고 confirm 을 붙였을 때만.
     시험 자료를 치우거나 지난 학년도 반을 정리할 때 쓴다. 되돌릴 수 없다. */
  if (d.action === 'wipe') {
    if (cut_(d.key, 40) !== teacherKey_()) return out_({ ok: false, error: '열쇠가 맞지 않습니다' });
    var wc = cut_(d.cls, 12);
    if (!wc) return out_({ ok: false, error: '지울 반을 적어 주세요' });
    if (cut_(d.confirm, 10) !== '지움') return out_({ ok: false, error: 'confirm=지움 이 필요합니다' });
    var gone = 0;
    var lk = LockService.getScriptLock(); if (!lk.tryLock(20000)) return out_({ ok: false, error: '잠시 뒤 다시 시도해 주세요' });
    try {
      [sheet_(), logSheet_(), measureSheet_(), voteSheet_()].forEach(function (sh) {
        var vs = sh.getDataRange().getValues();
        for (var r = vs.length - 1; r >= 1; r--) {
          if (String(vs[r][1]) === wc) { sh.deleteRow(r + 1); gone++; }
        }
      });
    } finally { lk.releaseLock(); }
    return out_({ ok: true, removed: gone });
  }

  /* 첫 추리 투표 — 처음 고른 보기와 (짝과 이야기한 뒤) 다시 고른 보기의 번호만 받는다. 같은 반·별명·단원·열쇠는 덮어쓴다. */
  if (d.action === 'vote') {
    var vc = cut_(d.cls, 12), vn = cut_(d.nick, 12), vu = cut_(d.unit, 24), vk = cut_(d.key, 12);
    if (!vc || !vn || !vu || !vk) return out_({ ok: false, error: '반·별명·단원이 필요합니다' });
    if (!allowed_(vc)) return out_({ ok: false, error: '등록되지 않은 반 코드입니다' });
    var va = parseInt(d.a, 10), vb = d.b == null || d.b === '' ? '' : parseInt(d.b, 10);
    if (!(va >= 0 && va < 8) || (vb !== '' && !(vb >= 0 && vb < 8))) return out_({ ok: false, error: '보기 번호가 맞지 않습니다' });
    var vrow = [new Date(), safe_(vc), safe_(vn), safe_(vu), safe_(vk), va, vb, ''], vdone = false;
    ensureTz_();
    var vl = LockService.getScriptLock();
    if (!vl.tryLock(20000)) return out_({ ok: false, error: '지금 올리는 친구가 많습니다. 잠시 뒤 다시 눌러 주세요' });
    try {
      var vsh = voteSheet_(), vr = vsh.getDataRange().getValues();
      for (var vi = 1; vi < vr.length; vi++) {
        if (String(vr[vi][1]) === vc && String(vr[vi][2]) === vn && String(vr[vi][3]) === vu && String(vr[vi][4]) === vk) {
          vrow[7] = vr[vi][7]; vsh.getRange(vi + 1, 1, 1, vrow.length).setValues([vrow]); vdone = true; break;
        }
      }
      if (!vdone) vsh.appendRow(vrow);
    } finally { vl.releaseLock(); }
    return out_({ ok: true, updated: vdone });
  }

  /* 첫 추리 투표 모아 보기 — 교사 열쇠가 맞아야 한다. 보기마다 처음·다시 인원(별명은 보내지 않는다). */
  if (d.action === 'votes') {
    if (cut_(d.key, 40) !== teacherKey_()) return out_({ ok: false, error: '열쇠가 맞지 않습니다' });
    var wc2 = cut_(d.cls, 12), wu2 = cut_(d.unit, 24), gs = {};
    var vs2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(VOTE), vv = vs2 ? vs2.getDataRange().getValues() : [];
    for (var vj = 1; vj < vv.length; vj++) {
      var q2 = vv[vj];
      if (String(q2[1]) !== wc2 || String(q2[3]) !== wu2 || String(q2[7]).trim()) continue;
      var gk = String(q2[4]), G = gs[gk] || (gs[gk] = { k: gk, n: 0, a: [], b: [], nb: 0, moved: 0, last: null });
      var a1 = +q2[5], b1 = q2[6] === '' ? null : +q2[6];
      G.n++; G.a[a1] = (G.a[a1] || 0) + 1;
      if (b1 !== null) { G.nb++; G.b[b1] = (G.b[b1] || 0) + 1; if (b1 !== a1) G.moved++; }
      var tq = ms_(q2[0]); if (tq !== null && (G.last === null || tq > G.last)) G.last = tq;
    }
    return out_({ ok: true, gates: Object.keys(gs).map(function (k5) { var G2 = gs[k5]; for (var z = 0; z < 8; z++) { G2.a[z] = G2.a[z] || 0; G2.b[z] = G2.b[z] || 0; } return G2; }) });
  }

  /* 우리 반 측정값(선택 활동) — 숫자 1~3개만 받는다. 같은 반·별명·단원·측정은 덮어쓴다. */
  if (d.action === 'measure') {
    var qc = cut_(d.cls, 12), qn = cut_(d.nick, 12), qu = cut_(d.unit, 24), qk = cut_(d.key, 12);
    if (!qc || !qn || !qu || !qk) return out_({ ok: false, error: '반·별명·단원이 필요합니다' });
    if (!allowed_(qc)) return out_({ ok: false, error: '등록되지 않은 반 코드입니다' });
    var qv = (d.v instanceof Array ? d.v : []).slice(0, 3).map(Number).filter(function (x) { return isFinite(x) && Math.abs(x) < 1e7; })
      .map(function (x) { return Math.round(x * 1000) / 1000; });
    if (!qv.length) return out_({ ok: false, error: '측정값이 없습니다' });
    var qg = cut_(d.g, 10).replace(/[<>&"]/g, '');                 // (선택) 잰 자리 같은 무리 이름
    var qrow = [new Date(), safe_(qc), safe_(qn), safe_(qu), safe_(qk), JSON.stringify(qg ? { v: qv, g: qg } : { v: qv }), ''], qa = false;
    ensureTz_();
    var ql = LockService.getScriptLock();
    if (!ql.tryLock(20000)) return out_({ ok: false, error: '지금 올리는 친구가 많습니다. 잠시 뒤 다시 눌러 주세요' });
    try {
      var qsh = measureSheet_(), qr = qsh.getDataRange().getValues();
      for (var qi = 1; qi < qr.length; qi++) {
        if (String(qr[qi][1]) === qc && String(qr[qi][2]) === qn && String(qr[qi][3]) === qu && String(qr[qi][4]) === qk) {
          qrow[6] = qr[qi][6];
          qsh.getRange(qi + 1, 1, 1, qrow.length).setValues([qrow]); qa = true; break;
        }
      }
      if (!qa) qsh.appendRow(qrow);
    } finally { ql.releaseLock(); }
    return out_({ ok: true, updated: qa });
  }

  if (d.action !== 'post') return out_({ ok: false, error: '알 수 없는 요청' });
  var cls = cut_(d.cls, 12), nick = cut_(d.nick, 12), unit = cut_(d.unit, 24);
  if (!cls || !nick || !unit) return out_({ ok: false, error: '반·별명·단원이 필요합니다' });
  if (!allowed_(cls)) return out_({ ok: false, error: '등록되지 않은 반 코드입니다' });
  var res = {}, keys = Object.keys(d.results || {}).slice(0, 12);
  keys.forEach(function (k) { res[cut_(k, 8)] = cut_(d.results[k], 300); });
  var label = cut_(d.unitLabel, 60);
  var row = [new Date(), safe_(cls), safe_(nick), safe_(unit), safe_(label), JSON.stringify(res), safe_(cut_(d.line, 300)), ''];
  var again = false;

  ensureTz_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return out_({ ok: false, error: '지금 올리는 친구가 많습니다. 잠시 뒤 다시 눌러 주세요' });
  try {
    var sh = sheet_(), rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1]) === cls && String(rows[i][2]) === nick && String(rows[i][3]) === unit) {
        row[7] = rows[i][7];                                   // 숨김 표시는 유지
        sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
        again = true;
        break;
      }
    }
    if (!again) sh.appendRow(row);
    /* 활동 기록은 덮어쓰지 않고 쌓는다 */
    logSheet_().appendRow([new Date(), safe_(cls), safe_(nick), safe_(unit), safe_(label), keys.filter(function (k) { return k !== '_ev'; }).length, again ? '다시' : '처음']);
  } finally { lock.releaseLock(); }
  return out_({ ok: true, updated: again });
}

/** 시트 메뉴에서 한 번 눌러 권한을 승인하고 열쇠를 확인하는 용도. */
function 준비하기() {
  ensureTz_(); sheet_(); logSheet_(); classSheet_(); ensureLinks_(false);
  var key = teacherKey_();
  SpreadsheetApp.getUi().alert('준비되었습니다.\n\n교사 열쇠: ' + key + '\n\n선생님 화면(반별 활동)에 이 열쇠를 한 번 넣으면 모든 반이 보입니다.');
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('우리 반 공유').addItem('준비하기 / 교사 열쇠 보기', '준비하기').addItem('바로가기 다시 만들기', '바로가기')
    .addItem('생각 점검 표 새로 만들기', '생각점검').addItem('과목별 보기 새로 만들기 (반별 명단 · 과목 탭)', '과목별보기메뉴').addToUi();
  try { ensureLinks_(false); } catch (e) {}
  try { 과목별보기(true); } catch (e) {}                          /* 열 때마다 반별 명단·과목 탭을 최신으로 */
}
function 바로가기() { ensureLinks_(true); SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('바로가기')); }
/** '바로가기' 탭 — 교사용 허브와 전 과목·전 단원 링크(links.gs 의 LINKS). 목록이 바뀌었거나 force 이면 다시 쓴다. */
function ensureLinks_(force) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('바로가기'), fresh = !sh;
  if (!sh) sh = ss.insertSheet('바로가기', 0);
  if (!force && !fresh && String(sh.getRange('H1').getValue()) === LINKS_VER) return sh;
  sh.clear();
  var head = [['구분', '학년', '과목', '단원', '학생 화면', '교사 미리 보기(모든 장면 열림)']];
  var body = LINKS.map(function (r) {
    var u = r[4], q = function (s) { return String(s).replace(/"/g, '""'); };
    return [r[0], r[1], r[2], r[3], '=HYPERLINK("' + q(u) + '","' + q(r[3] && r[0] === '단원' ? '열기' : '열기 ↗') + '")',
            r[0] === '단원' ? '=HYPERLINK("' + q(u + '?open=1') + '","미리 보기")' : ''];
  });
  sh.getRange(1, 1, 1, 6).setValues(head).setFontWeight('bold').setBackground('#e8f0fe');
  sh.getRange(2, 1, body.length, 6).setValues(body);
  sh.getRange('H1').setValue(LINKS_VER).setFontColor('#bbbbbb');
  sh.setFrozenRows(1);
  [70, 60, 150, 300, 90, 170].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  for (var i = 0; i < LINKS.length; i++) if (LINKS[i][0] !== '단원') sh.getRange(i + 2, 1, 1, 6).setBackground(LINKS[i][0] === '교사' ? '#fff4d6' : '#f3f6fb').setFontWeight('bold');
  return sh;
}

/* =========================================================================
   내 생각 점검(사전·사후 오개념 진단) — 학생 화면 assets/precheck.js 가 올리는 _ev 의 p: 조각
     p:문장=처음>나중,…   처음: 2 맞음·확실, 1 맞음·반반, 0 모름, -1 틀림·반반, -2 틀림·확실, n 답 없음 / 나중: 1 맞음, 0 틀림
   ========================================================================= */
var PC_RE = /^([a-z0-9]+)=(-?\d|n)(?:>(-?\d))?$/;
/** 한 문장의 처음·나중 기록을 더한다. 나중 값은 2·1(맞음)·-1·-2(틀림), 예전 기록의 0 은 틀림으로 본다.
 *  짝(처음·나중 모두 있는 것)으로 사전·사후 정답, 확신 오답(굳은 오개념), 변화 유형을 센다. */
function pcAdd_(store, it) {
  var m = PC_RE.exec(it); if (!m) return;
  var x = store[m[1]] || (store[m[1]] = { k: m[1], n: 0, ok: 0, sure: 0, wrong: 0, sureWrong: 0, unk: 0, an: 0, aok: 0, fix: 0,
                                           pn: 0, pre: 0, post: 0, preSW: 0, postSW: 0, keep: 0, slip: 0, stay: 0 });
  var f = m[2] === 'n' ? null : +m[2], a = m[3] == null ? null : +m[3];
  if (f !== null) {
    x.n++;
    if (f > 0) x.ok++; else if (f < 0) x.wrong++; else x.unk++;
    if (f === -2) x.sureWrong++;
    if (f === 2 || f === -2) x.sure++;
  }
  if (a !== null) {
    x.an++; if (a > 0) x.aok++;
    if (a > 0 && (f === null || f <= 0)) x.fix++;
    if (f !== null) {
      var p0 = f > 0, p1 = a > 0;
      x.pn++; if (p0) x.pre++; if (p1) x.post++;
      if (f === -2) x.preSW++; if (a === -2) x.postSW++;
      if (p0 && p1) x.keep++; else if (p0 && !p1) x.slip++; else if (!p0 && !p1) x.stay++;
    }
  }
}
/** 짝 기록 묶음의 정규화 향상도 g = (사후 정답 − 사전 정답) / (짝 수 − 사전 정답) */
function pcGain_(x) { return x.pn - x.pre > 0 ? Math.round((x.post - x.pre) / (x.pn - x.pre) * 100) / 100 : null; }
/** 단원의 생각 점검 문장 { p1: { s: '문장', a: true }, … } — precheck.gs 의 PC_ITEMS(도구가 만든 파일)에서 읽는다. */
function pcItems_(u) { return (typeof PC_ITEMS !== 'undefined' && PC_ITEMS[u]) || {}; }
function pct_(a, b) { return b ? Math.round(a / b * 100) + '%' : '–'; }
/** '생각 점검' 탭 — 단원 · 반 · 문장마다 처음 생각과 이야기 뒤 생각을 모은 표. 메뉴에서 누를 때마다 새로 쓴다. */
function 생각점검() {
  ensureTz_();
  var rs = sheet_().getDataRange().getValues(), agg = {}, labels = {};
  for (var i = 1; i < rs.length; i++) {
    var q = rs[i];
    if (String(q[7]).trim()) continue;
    var c = String(q[1]), u = String(q[3]); if (!c || !u) continue;
    var rr = {}; try { rr = JSON.parse(q[5] || '{}'); } catch (e) {}
    String(rr._ev || '').split('|').forEach(function (part) {
      if (part.slice(0, 2) !== 'p:' || !part.slice(2)) return;
      var key = u + '\u0000' + c;
      if (!agg[key]) agg[key] = { unit: u, cls: c, pc: {} };
      part.slice(2).split(',').forEach(function (it) { pcAdd_(agg[key].pc, it); });
    });
    if (String(q[4] || '')) labels[u] = String(q[4]);
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('생각 점검');
  if (!sh) sh = ss.insertSheet('생각 점검');
  sh.clear();
  var head = ['단원', '반', '번호', '문장', '정답', '처음에 답한 학생', '처음 맞음', '처음 확신 오답', '잘 모르겠다',
              '두 번 답한 학생', '사전 정답', '사후 정답', '사후 확신 오답', '오개념→바른 개념', '맞았다가 틀림', '남은 오개념', '정규화 향상도 g'];
  var body = [], cache = {}, sum = [];
  Object.keys(agg).sort().forEach(function (key) {
    var A = agg[key], items = cache[A.unit] || (cache[A.unit] = pcItems_(A.unit));
    var T = { pn: 0, pre: 0, post: 0, preSW: 0, postSW: 0, fix: 0, slip: 0, stay: 0 };
    Object.keys(A.pc).sort().forEach(function (k) {
      var x = A.pc[k], it = items[k] || {}, gx = pcGain_(x);
      Object.keys(T).forEach(function (t) { T[t] += x[t] || 0; });
      body.push([labels[A.unit] || A.unit, A.cls, k, it.s || '(문장 목록에 없음)', it.a == null ? '' : (it.a ? '맞다' : '틀리다'), x.n,
        pct_(x.ok, x.n), x.sureWrong + '명 (' + pct_(x.sureWrong, x.n) + ')', x.unk,
        x.pn, pct_(x.pre, x.pn), pct_(x.post, x.pn), x.postSW + '명', x.fix, x.slip, x.stay, gx === null ? '–' : gx]);
    });
    var gT = pcGain_(T);
    sum.push([labels[A.unit] || A.unit, A.cls, T.pn, pct_(T.pre, T.pn), pct_(T.post, T.pn), T.preSW + ' → ' + T.postSW, T.fix, T.slip, T.stay, gT === null ? '–' : gT]);
  });
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e8f0fe');
  if (body.length) sh.getRange(2, 1, body.length, head.length).setValues(body.map(function (r) { return r.map(safe_); }));
  else sh.getRange(2, 1).setValue('아직 올라온 생각 점검 기록이 없습니다. 학생이 단원 첫머리의 생각 점검에 답하고 우리 반 탭에서 올리면 여기에 쌓입니다.');
  sh.setFrozenRows(1);
  [200, 100, 45, 380, 55, 80, 70, 100, 70, 80, 70, 70, 85, 95, 60, 75, 85].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, 4, Math.max(1, body.length), 1).setWrap(true);
  /* 아래쪽: 단원 × 반 요약 — 오개념이 바뀌었는지 한 줄로 */
  var top = body.length + 4;
  sh.getRange(top - 1, 1).setValue('단원 × 반 요약 — 처음과 이야기 뒤에 모두 답한 문장만 셉니다. g 0.7 이상 크게 바뀜 · 0.3~0.7 어느 정도 바뀜 · 0~0.3 조금 바뀜 · 0 이하 바뀌지 않음').setFontWeight('bold');
  var sh2 = [['단원', '반', '두 번 답한 응답 수', '사전 정답', '사후 정답', '확신 오답 사전 → 사후', '오개념→바른 개념', '맞았다가 틀림', '남은 오개념', '정규화 향상도 g']];
  sh.getRange(top, 1, 1, sh2[0].length).setValues(sh2).setFontWeight('bold').setBackground('#e6f4ea');
  if (sum.length) sh.getRange(top + 1, 1, sum.length, sh2[0].length).setValues(sum.map(function (r) { return r.map(safe_); }));
  sh.getRange('R1').setValue('만든 시각 ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')).setFontColor('#999999');
  ss.setActiveSheet(sh);
}


/* =========================================================================
   과목별 보기 — 시트를 열 때와 메뉴 '과목별 보기 새로 만들기'에서 다시 쓴다.
   · '반별 명단' 탭 : 반 · 별명 마다 한 줄 — 어느 과목·몇 단원을 했는지, 처음·마지막 활동, 올린 횟수
   · '과목·○○' 탭 : 과목마다 하나. 위는 반 요약(반마다 학생 수, 단원마다 올린 학생 수),
                     아래는 반별 명단(학생 한 줄 × 단원 한 칸: 이야기 · 문제 · 생각 점검), 칸 색으로 진행 정도
   단원 순서·이름·이야기 수는 precheck.gs 의 UNIT_LIST(도구가 만든 파일)에서 읽는다.
   ========================================================================= */
var VIEW_PREFIX = '과목·';
var COLOR_DONE = '#d9f2e1', COLOR_PART = '#fff4c2', COLOR_TOUCH = '#eef1f5';
function unitInfo_() {
  var by = {}, order = [], subjects = [];
  (typeof UNIT_LIST !== 'undefined' ? UNIT_LIST : []).forEach(function (r, i) {
    by[r[0]] = { id: r[0], subj: r[1], name: r[2], grade: r[3], eps: r[4] || 0, i: i };
    order.push(r[0]);
    if (subjects.indexOf(r[1]) < 0) subjects.push(r[1]);
  });
  return { by: by, order: order, subjects: subjects };
}
/** 한 학생 · 한 단원의 _ev 를 읽어 짧은 요약으로 — 이야기 끝낸 수, 문제 한 번에 맞힘/손댄, 생각 점검 처음→나중 맞힌 수 */
function evSum_(ev, eps) {
  var o = { done: 0, started: 0, q1: 0, qt: 0, pn: 0, pre: 0, post: 0, f: 0, fok: 0 };
  String(ev || '').split('|').forEach(function (part) {
    var tag = part.slice(0, 2), body = part.slice(2);
    if (!body) return;
    body.split(',').forEach(function (it) {
      if (tag === 'e:') { var m = /^([^=]+)=(\d+)\/(\d+)/.exec(it); if (m) { o.started++; if (+m[2] >= +m[3]) o.done++; } }
      else if (tag === 'q:') { var qm = /^(\d+)\/(\d+)$/.exec(it); if (qm) { o.q1 = +qm[1]; o.qt = +qm[2]; } }
      else if (tag === 'p:') {
        var pm = PC_RE.exec(it); if (!pm) return;
        var f = pm[2] === 'n' ? null : +pm[2], a = pm[3] == null ? null : +pm[3];
        if (f !== null) { o.f++; if (f > 0) o.fok++; }
        if (f !== null && a !== null) { o.pn++; if (f > 0) o.pre++; if (a > 0) o.post++; }
      }
    });
  });
  o.eps = eps || o.started;
  var bits = [];
  if (o.eps) bits.push('이야기 ' + o.done + '/' + o.eps);
  if (o.qt) bits.push('문제 ' + o.q1 + '/' + o.qt);
  if (o.pn) bits.push('생각 ' + o.pre + '→' + o.post + '/' + o.pn);
  else if (o.f) bits.push('생각 처음 ' + o.fok + '/' + o.f);
  o.text = bits.join(' · ') || '올림';
  o.color = o.eps && o.done >= o.eps ? COLOR_DONE : (o.done || o.started ? COLOR_PART : COLOR_TOUCH);
  return o;
}
function day_(t) { return t == null ? '' : Utilities.formatDate(new Date(t), 'Asia/Seoul', 'M/d HH:mm'); }
function classOrder_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('반목록'), list = [];
  if (sh && sh.getLastRow()) { heal_(sh); list = sh.getRange(1, 1, sh.getLastRow(), 2).getValues().map(function (r) { return [String(r[0]).trim(), String(r[1] || '')]; }).filter(function (r) { return r[0]; }); }
  if (!list.length) list = CLASSES;
  var pos = {}, names = {};
  list.forEach(function (r, i) { pos[r[0]] = i; names[r[0]] = r[1]; });
  return { cmp: function (a, b) { var x = pos[a] == null ? 1e4 : pos[a], y = pos[b] == null ? 1e4 : pos[b]; return x !== y ? x - y : (a < b ? -1 : (a > b ? 1 : 0)); }, names: names };
}
function nickCmp_(a, b) { return a.localeCompare(b, 'ko', { numeric: true }); }
function freshTab_(name, after) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, after == null ? ss.getNumSheets() : after);
  var f = sh.getFilter(); if (f) f.remove();
  sh.clear(); sh.setFrozenRows(0); sh.setFrozenColumns(0);
  return sh;
}
/** quiet: 시트를 열 때 저절로 부를 때는 탭을 옮겨 다니지 않는다 */
function 과목별보기(quiet) {
  ensureTz_();
  var U = unitInfo_(), CO = classOrder_();
  var rs = sheet_().getDataRange().getValues();
  var stu = {}, subjCls = {}, unitLabel = {};
  for (var i = 1; i < rs.length; i++) {
    var r = rs[i];
    if (String(r[7]).trim()) continue;
    var c = String(r[1]), nk = String(r[2]), u = String(r[3]); if (!c || !nk || !u) continue;
    var ui = U.by[u], subj = ui ? ui.subj : '기타';
    if (!ui && String(r[4] || '')) unitLabel[u] = String(r[4]);
    var rr = {}; try { rr = JSON.parse(r[5] || '{}'); } catch (e) {}
    var k = c + '\u0000' + nk, t = ms_(r[0]);
    var S = stu[k] || (stu[k] = { cls: c, nick: nk, units: {}, subj: {}, first: null, last: null, posts: 0, done: 0 });
    var sm = evSum_(rr._ev, ui ? ui.eps : 0); sm.t = t;
    S.units[u] = sm; S.subj[subj] = 1;
    if (sm.eps && sm.done >= sm.eps) S.done++;
    if (t !== null && (S.last === null || t > S.last)) S.last = t;
    (subjCls[subj] || (subjCls[subj] = {}))[c] = 1;
  }
  /* 활동 탭 — 올린 횟수와 처음 올린 시각 */
  var lg = logSheet_(), ln = lg.getLastRow();
  if (ln > 1) lg.getRange(2, 1, ln - 1, 3).getValues().forEach(function (g) {
    var S = stu[String(g[1]) + '\u0000' + String(g[2])]; if (!S) return;
    S.posts++; var t = ms_(g[0]); if (t !== null && (S.first === null || t < S.first)) S.first = t;
  });
  var keys = Object.keys(stu).sort(function (a, b) { var A = stu[a], B = stu[b]; return CO.cmp(A.cls, B.cls) || nickCmp_(A.nick, B.nick); });
  var stamp = '만든 시각 ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm') + ' · 시트를 열 때마다 새로 씁니다 (메뉴: 우리 반 공유 → 과목별 보기 새로 만들기)';

  /* ---- 반별 명단 ---- */
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var base = ss.getSheetByName('바로가기') ? ss.getSheetByName('바로가기').getIndex() : 0;
  var rl = freshTab_('반별 명단', base);
  var head = ['반', '반 이름', '별명', '과목', '올린 단원 수', '이야기를 다 마친 단원', '처음 올림', '마지막 활동', '올린 횟수'];
  var body = keys.map(function (k) {
    var S = stu[k], subs = U.subjects.filter(function (s) { return S.subj[s]; }).concat(S.subj['기타'] ? ['기타'] : []);
    return [S.cls, CO.names[S.cls] || '', S.nick, subs.join(', '), Object.keys(S.units).length, S.done, day_(S.first), day_(S.last), S.posts];
  });
  rl.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e8f0fe');
  if (body.length) {
    rl.getRange(2, 1, body.length, head.length).setNumberFormat('@').setValues(body.map(function (r) { return r.map(function (v) { return typeof v === 'number' ? v : safe_(v); }); }));
    rl.getRange(2, 5, body.length, 2).setNumberFormat('0'); rl.getRange(2, 9, body.length, 1).setNumberFormat('0');
    /* 반이 바뀌는 줄에 옅은 띠 */
    var band = [], on = false, prev = null;
    body.forEach(function (r) { if (r[0] !== prev) { on = !on; prev = r[0]; } band.push(new Array(head.length).fill(on ? '#ffffff' : '#f6f8fb')); });
    rl.getRange(2, 1, body.length, head.length).setBackgrounds(band);
    rl.getRange(1, 1, body.length + 1, head.length).createFilter();
  } else rl.getRange(2, 1).setValue('아직 올린 학생이 없습니다.');
  rl.setFrozenRows(1);
  [60, 210, 100, 220, 85, 130, 90, 90, 70].forEach(function (w, j) { rl.setColumnWidth(j + 1, w); });
  rl.getRange('K1').setValue(stamp).setFontColor('#999999');

  /* ---- 과목·○○ 탭 ---- */
  var made = [];
  U.subjects.concat(subjCls['기타'] ? ['기타'] : []).forEach(function (subj) {
    var name = VIEW_PREFIX + subj, sh = ss.getSheetByName(name);
    if (!subjCls[subj]) { if (sh) { freshTab_(name).getRange(1, 1).setValue(subj + ' — 아직 올린 학생이 없습니다.'); } return; }
    made.push(name);
    sh = freshTab_(name);
    var units = subj === '기타' ? Object.keys(unitLabel) : U.order.filter(function (u) { return U.by[u].subj === subj; });
    var uname = function (u) { return U.by[u] ? U.by[u].name : (unitLabel[u] || u); };
    var classes = Object.keys(subjCls[subj]).sort(CO.cmp);
    var W = 3 + units.length, rows = [], colors = [], bold = [], heads = [];
    var push = function (r, col, b) { while (r.length < W) r.push(''); rows.push(r); colors.push(col || new Array(W).fill('#ffffff')); if (b) bold.push(rows.length); };
    push([subj + ' — 반별 활동', '', stamp], null, true);
    push([]);
    /* 위: 반 요약 */
    push(['반 요약', '학생 수', '다 마친 단원 수 (학생 합계)'].concat(units.map(uname)), new Array(W).fill('#e8f0fe'), true); heads.push(rows.length);
    classes.forEach(function (c) {
      var mine = keys.filter(function (k) { return stu[k].cls === c && stu[k].subj[subj]; });
      var doneCells = 0, cells = units.map(function (u) {
        var n = 0, d = 0; mine.forEach(function (k) { var x = stu[k].units[u]; if (x) { n++; if (x.eps && x.done >= x.eps) d++; } });
        doneCells += d; return n ? n + '명 올림 · ' + d + '명 다 마침' : '';
      });
      push([c + (CO.names[c] ? ' ' + CO.names[c] : ''), mine.length, doneCells].concat(cells));
    });
    push([]);
    push(['칸 읽는 법 — 이야기: 마친 수/전체 · 문제: 한 번에 맞힌 문항/풀어 본 문항 · 생각: 처음 맞힌 수→이야기 뒤 맞힌 수/두 번 답한 문장 수. 초록은 이야기를 다 마침, 노랑은 하는 중, 회색은 올렸지만 이야기 기록이 없음'], null, false);
    /* 아래: 반별 명단 */
    classes.forEach(function (c) {
      push([]);
      var mine = keys.filter(function (k) { return stu[k].cls === c && stu[k].subj[subj]; });
      push([c + (CO.names[c] ? ' ' + CO.names[c] : '') + ' — ' + mine.length + '명', '마지막 활동', '다 마친 단원'].concat(units.map(uname)), new Array(W).fill('#e6f4ea'), true); heads.push(rows.length);
      mine.forEach(function (k) {
        var S = stu[k], last = null, done = 0, col = ['#ffffff', '#ffffff', '#ffffff'];
        var cells = units.map(function (u) {
          var x = S.units[u]; if (!x) { col.push('#ffffff'); return ''; }
          if (x.t !== null && (last === null || x.t > last)) last = x.t;
          if (x.eps && x.done >= x.eps) done++;
          col.push(x.color); return x.text;
        });
        push([S.nick, day_(last), done + '/' + units.length].concat(cells), col);
      });
    });
    var rg = sh.getRange(1, 1, rows.length, W);
    rg.setNumberFormat('@');
    rg.setValues(rows.map(function (r) { return r.map(function (v) { return typeof v === 'number' ? String(v) : safe_(v); }); }));
    rg.setBackgrounds(colors).setVerticalAlignment('middle');
    sh.getRange(3, 4, rows.length - 2, Math.max(1, units.length)).setWrap(true);
    bold.forEach(function (n) { sh.getRange(n, 1, 1, W).setFontWeight('bold'); });
    sh.getRange(1, 1).setFontSize(13);
    sh.getRange(1, 3).setFontColor('#999999');
    sh.setFrozenColumns(1);
    sh.setColumnWidth(1, 190); sh.setColumnWidth(2, 85); sh.setColumnWidth(3, 95);
    for (var j = 0; j < units.length; j++) sh.setColumnWidth(4 + j, 165);
  });
  if (!quiet) {
    ss.setActiveSheet(rl);
    SpreadsheetApp.getActiveSpreadsheet().toast('반별 명단과 과목 탭 ' + made.length + '개를 새로 만들었습니다: ' + (made.join(', ') || '없음'), '과목별 보기', 6);
  }
  return made;
}
function 과목별보기메뉴() { 과목별보기(false); }
