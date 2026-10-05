/** 우리 반 공유 뒷단 — 구글 시트에 붙여 쓰는 Apps Script.
 *
 *  시트 'share'  : 시각 | 반 | 별명 | 단원 | 단원이름 | 성과(JSON) | 한 문장 | 숨김
 *                  학생 한 명의 한 단원에 한 줄. 다시 올리면 그 줄을 덮어쓴다(지금 상태).
 *  시트 '활동'   : 시각 | 반 | 별명 | 단원 | 단원이름 | 올린 칸 수 | 처음/다시
 *                  올릴 때마다 한 줄씩 쌓기만 한다(반별 활동 기록). 덮어쓰지 않는다.
 *  시트 '설정'   : A1 '교사 열쇠' / B1 에 아무도 모르는 글자. 선생님 화면에서 이 열쇠를 넣어야
 *                  모든 반을 한눈에 볼 수 있다. 시트를 처음 쓸 때 저절로 만들어진다.
 *  시트 '반목록'(선택) : A열에 허용할 반 코드를 적으면 그 반만 받는다. 없으면 모두 받는다.
 *
 *  'share' 의 '숨김' 칸에 아무 글자나 적으면 그 줄은 학생 화면에 나오지 않는다.
 *  한 반을 통째로 지우려면 POST {action:'wipe', key, cls, confirm:'지움'} (되돌릴 수 없다).
 *  교사 화면도 POST {action:'teacher', key} 로 받는다 — 열쇠가 주소에 남지 않게.
 */
var SHEET = 'share';
var LOG = '활동';
var CONF = '설정';

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['시각', '반', '별명', '단원', '단원이름', '성과(JSON)', '한 문장', '숨김']);
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
  subj.forEach(function (s) { ['A', 'B'].forEach(function (b) { out.push(['2-' + s[0] + b, '2학년 ' + s[1] + ' ' + b + '반']); }); });
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
  /* 교사 열쇠가 드는 요청은 주소창·방문 기록에 남지 않도록 POST 로만 받는다 */
  /* 선생님 화면 — 모든 반을 한눈에. 교사 열쇠가 맞아야 한다. */
  if (d.action === 'teacher') {
    if (cut_(d.key, 40) !== teacherKey_()) return out_({ ok: false, error: '열쇠가 맞지 않습니다' });
    var rs2 = sheet_().getDataRange().getValues();
    var cls_ = {}, cell = {}, units2 = {};
    for (var a = 1; a < rs2.length; a++) {
      var v = rs2[a];
      if (String(v[7]).trim()) continue;
      var c = String(v[1]), un = String(v[3]), lb = String(v[4] || ''), nk = String(v[2]), tt = ms_(v[0]);
      if (!c || !un) continue;
      if (!cls_[c]) cls_[c] = { cls: c, nicks: {}, units: {}, last: null };
      cls_[c].nicks[nk] = 1; cls_[c].units[un] = 1;
      if (tt !== null && (cls_[c].last === null || tt > cls_[c].last)) cls_[c].last = tt;
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
    return out_({ ok: true, classes: classes, cells: Object.keys(cell).map(function (k2) { return cell[k2]; }), units: units2, recent: recent });
  }

  /* 수업 효과 — 단원 × 반 마다 완료율·첫 추리 정답률·한 번에 맞힌 비율·막힌 장면. 교사 열쇠가 맞아야 한다.
     학생 화면이 올린 results._ev ( g:키=1/0,… | e:이야기=푼/전체@막힌 장면,… | q:한 번에/손댄 ) 를 모은다. */
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
      if (!agg[ak]) agg[ak] = { unit: eu, label: String(q[4] || ''), cls: ec, n: 0, withEv: 0, g1: 0, gn: 0, gates: {}, eps: {}, q1: 0, qt: 0, lab: 0, pc: {} };
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
      var one = { nick: String(w[2]), t: ms_(w[0]), g: {}, e: {}, q: null, h: null, p: {} };
      String(wr._ev || '').split('|').forEach(function (part) {
        var tag = part.slice(0, 2), body = part.slice(2);
        if (!body) return;
        body.split(',').forEach(function (it) {
          if (tag === 'g:') { var kv = it.split('='); if (kv.length < 2) return; var gv = kv[1].split('~'); one.g[kv[0]] = [+gv[0], gv.length > 1 ? +gv[1] : null]; }
          else if (tag === 'e:') { var m = /^([^=]+)=(\d+)\/(\d+)(?:@(\d+))?$/.exec(it); if (m) one.e[m[1]] = [+m[2], +m[3], m[4] ? +m[4] : 0]; }
          else if (tag === 'q:') { var qm = /^(\d+)\/(\d+)$/.exec(it); if (qm) one.q = [+qm[1], +qm[2]]; }
          else if (tag === 'h:') { var hm = /^(\d+)\/(\d+)\/(\d+)$/.exec(it); if (hm) one.h = [+hm[1], +hm[2], +hm[3]]; }
          else if (tag === 'p:') { var pm = PC_RE.exec(it); if (pm) one.p[pm[1]] = [pm[2], pm[3] == null ? null : +pm[3]]; }
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
      [sheet_(), logSheet_()].forEach(function (sh) {
        var vs = sh.getDataRange().getValues();
        for (var r = vs.length - 1; r >= 1; r--) {
          if (String(vs[r][1]) === wc) { sh.deleteRow(r + 1); gone++; }
        }
      });
    } finally { lk.releaseLock(); }
    return out_({ ok: true, removed: gone });
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
    .addItem('생각 점검 표 새로 만들기', '생각점검').addToUi();
  try { ensureLinks_(false); } catch (e) {}
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
var PC_RE = /^([a-z0-9]+)=(-?\d|n)(?:>([01]))?$/;
function pcAdd_(store, it) {
  var m = PC_RE.exec(it); if (!m) return;
  var x = store[m[1]] || (store[m[1]] = { k: m[1], n: 0, ok: 0, sure: 0, wrong: 0, sureWrong: 0, unk: 0, an: 0, aok: 0, fix: 0 });
  var f = m[2], a = m[3] == null ? null : +m[3];
  if (f !== 'n') {
    x.n++; f = +f;
    if (f > 0) x.ok++; else if (f < 0) x.wrong++; else x.unk++;
    if (f === -2) x.sureWrong++;
    if (f === 2 || f === -2) x.sure++;
  }
  if (a !== null) { x.an++; if (a === 1) { x.aok++; if (f === 'n' || f <= 0) x.fix++; } }
}
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
  var head = ['단원', '반', '번호', '문장', '정답', '처음에 답한 학생', '처음 맞음', '확신하고 틀림', '잘 모르겠다', '이야기 뒤 다시 답함', '이야기 뒤 맞음', '틀림·모름 → 맞음'];
  var body = [], cache = {};
  Object.keys(agg).sort().forEach(function (key) {
    var A = agg[key], items = cache[A.unit] || (cache[A.unit] = pcItems_(A.unit));
    Object.keys(A.pc).sort().forEach(function (k) {
      var x = A.pc[k], it = items[k] || {};
      body.push([labels[A.unit] || A.unit, A.cls, k, it.s || '(문장을 읽지 못함)', it.a == null ? '' : (it.a ? '맞다' : '틀리다'), x.n,
        pct_(x.ok, x.n), x.sureWrong + '명 (' + pct_(x.sureWrong, x.n) + ')', x.unk, x.an, pct_(x.aok, x.an), x.fix]);
    });
  });
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e8f0fe');
  if (body.length) sh.getRange(2, 1, body.length, head.length).setValues(body.map(function (r) { return r.map(safe_); }));
  else sh.getRange(2, 1).setValue('아직 생각 점검 기록이 담긴 올리기가 없습니다. 학생이 생각 점검을 하고 우리 반 탭에서 올리면 쌓입니다.');
  sh.setFrozenRows(1);
  [220, 110, 50, 420, 60, 90, 80, 110, 80, 100, 90, 110].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, 4, Math.max(1, body.length), 1).setWrap(true);
  sh.getRange('N1').setValue('만든 시각 ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm')).setFontColor('#999999');
  ss.setActiveSheet(sh);
}

