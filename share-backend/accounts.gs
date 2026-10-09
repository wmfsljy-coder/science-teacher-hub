/** 학생 로그인(학번 · 이름 · PIN 6자리)과 학습 기록 — Code.gs 의 doPost 가 action 이 'acc' 로 시작하면 accounts_(d) 로 넘긴다.
 *
 *  시트 '명단'     : 학번 | 이름 | 학년 | 반 | 수업 반(쉼표) | PIN(해시) | 실패 | 잠금까지 | 등록일 | 최근 접속 | 비고
 *                    선생님이 accImport 로 한 번 넣는다(명렬 + 수강생명렬). PIN 은 hmac 해시로만 둔다(되돌릴 수 없음).
 *  시트 '기기'     : 열쇠(토큰 해시) | 학번 | 만든 시각 | 마지막 | 기기
 *                    로그인한 기기마다 한 줄. 로그아웃하거나 선생님이 PIN 을 초기화하면 지운다.
 *  시트 '학습'     : 열쇠(학번|단원) | 학번 | 단원 | 마지막 | 상태(JSON {s,w}) | 보낸 횟수
 *                    학생 한 명 · 한 단원에 한 줄, 늘 지금 상태로 덮어쓴다(다른 기기에서 이어 하기·선생님 화면).
 *  시트 '학습기록' : 시각 | 학번 | 단원 | 항목 | 값
 *                    바뀐 항목마다 한 줄씩 쌓기만 한다 — 처음 답·고친 답·걸린 시간을 나중에 분석할 수 있게.
 *
 *  PIN: 6자리 숫자, 같은 숫자 반복·연속 숫자·학번이 든 번호는 받지 않는다. 5번 틀리면 10분, 10번 틀리면 하루 잠근다.
 *  비밀 열쇠(hmac)는 '설정' 탭 B3 에 저절로 만들어진다 — 바꾸면 모든 PIN·로그인이 풀린다.
 */
var ROSTER = '명단', DEVICE = '기기', LEARN = '학습', LEARNLOG = '학습기록';

function accSheet_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(head);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1000, 2).setNumberFormat('@');            /* 학번·열쇠가 숫자·날짜로 바뀌지 않게 */
  }
  return sh;
}
function rosterSheet_() { return accSheet_(ROSTER, ['학번', '이름', '학년', '반', '수업 반', 'PIN', '실패', '잠금까지', '등록일', '최근 접속', '비고']); }
function deviceSheet_() { return accSheet_(DEVICE, ['열쇠', '학번', '만든 시각', '마지막', '기기']); }
function learnSheet_() { return accSheet_(LEARN, ['열쇠', '학번', '단원', '마지막', '상태(JSON)', '보낸 횟수']); }
function learnLogSheet_() { return accSheet_(LEARNLOG, ['시각', '학번', '단원', '항목', '값']); }

function accSecret_() {
  var c = CacheService.getScriptCache(), hit = c.get('accSecret'); if (hit) return hit;
  var v0 = accSecretRead_(); c.put('accSecret', v0, 21600); return v0;
}
function accSecretRead_() {
  teacherKey_();                                           /* 설정 탭이 없으면 먼저 만든다 */
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONF);
  var v = String(sh.getRange('B3').getValue()).trim();
  if (!v) {
    v = Utilities.getUuid() + Utilities.getUuid();
    sh.getRange('A3').setValue('로그인 비밀 열쇠');
    sh.getRange('B3').setValue(v);
    sh.getRange('C3').setValue('학생 PIN·로그인을 지키는 값입니다. 바꾸면 모든 학생이 PIN 을 다시 정해야 합니다.');
  }
  return v;
}
function hmac_(x) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(x), accSecret_())).replace(/=+$/, ''); }
function nm_(s) { return String(s == null ? '' : s).replace(/\s+/g, '').trim(); }
function sid_(s) { return String(s == null ? '' : s).replace(/\D/g, '').slice(0, 6); }
function findRow_(sh, col, val) {   /* col 칸이 val 과 똑같은 줄 번호(없으면 0) */
  if (!val || sh.getLastRow() < 2) return 0;
  var f = sh.getRange(2, col, sh.getLastRow() - 1, 1).createTextFinder(String(val)).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}
function badPin_(pin, sid) {
  if (!/^\d{6}$/.test(pin)) return 'PIN 은 숫자 6자리입니다';
  if (/^(\d)\1{5}$/.test(pin)) return '같은 숫자만 반복하는 PIN 은 쓸 수 없습니다';
  if ('0123456789012'.indexOf(pin) >= 0 || '9876543210987'.indexOf(pin) >= 0) return '연속된 숫자는 쓸 수 없습니다';
  if (sid && pin.indexOf(sid) >= 0) return '학번이 들어간 PIN 은 쓸 수 없습니다';
  return '';
}
function profile_(r) { return { sid: String(r[0]), name: String(r[1]), grade: String(r[2] || ''), cls: String(r[3] || ''), classes: String(r[4] || '').split(/[,\s]+/).filter(String) }; }
/** 토큰 → 학번 (기기 시트). 마지막 시각을 고친다. */
function whoAmI_(t) {
  t = String(t || ''); if (t.length < 20) return null;
  var h = hmac_('tok|' + t), c = CacheService.getScriptCache(), hit = c.get('tok:' + h);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var dv = deviceSheet_(), row = findRow_(dv, 1, h);
  if (!row) return null;
  var sid = String(dv.getRange(row, 2).getValue());
  dv.getRange(row, 4).setValue(new Date());             /* 마지막 — 캐시가 비었을 때(1시간에 한 번쯤)만 쓴다 */
  var rs = rosterSheet_(), rr = findRow_(rs, 1, sid);
  if (!rr) return null;
  var me = profile_(rs.getRange(rr, 1, 1, 11).getValues()[0]);
  c.put('tok:' + h, JSON.stringify(me), 3600);
  return me;
}

function accounts_(d) {
  var a = String(d.action || ''), now = new Date(), CC = CacheService.getScriptCache();
  if (!CC.get('accTz')) { ensureTz_(); CC.put('accTz', '1', 21600); }
  /* ---- 학생 ---- */
  if (a === 'accLogin') {
    var sid = sid_(d.sid), name = nm_(d.name);
    if (!sid || !name) return { ok: false, error: '학번과 이름을 적어 주세요' };
    var lk = LockService.getScriptLock(); if (!lk.tryLock(15000)) return { ok: false, error: '잠시 뒤 다시 눌러 주세요' };
    try {
      var rs = rosterSheet_(), row = findRow_(rs, 1, sid);
      var r = row ? rs.getRange(row, 1, 1, 11).getValues()[0] : null;
      if (!r || nm_(r[1]) !== name) return { ok: false, error: '명단에서 찾지 못했습니다. 학번과 이름을 확인하고, 그래도 안 되면 선생님께 말씀해 주세요.' };
      var until = ms_(r[7]);
      if (until && until > now.getTime()) return { ok: false, error: 'PIN 을 여러 번 틀려 잠겼습니다. ' + Math.ceil((until - now.getTime()) / 60000) + '분 뒤에 다시 하거나 선생님께 초기화를 부탁하세요.' };
      if (!String(r[5])) {                                   /* 처음 로그인 — PIN 정하기 */
        var np = String(d.newPin || '');
        if (!np) return { ok: false, need: 'newpin', name: String(r[1]) };
        var why = badPin_(np, sid); if (why) return { ok: false, need: 'newpin', error: why };
        rs.getRange(row, 6, 1, 4).setValues([[hmac_('pin|' + sid + '|' + np), 0, '', now]]);
      } else if (!String(d.pin || '')) {
        return { ok: false, need: 'pin', name: String(r[1]) };
      } else if (hmac_('pin|' + sid + '|' + String(d.pin)) !== String(r[5])) {
        var fails = (+r[6] || 0) + 1, lockMs = fails >= 10 ? 24 * 3600e3 : (fails % 5 === 0 ? 10 * 60e3 : 0);
        rs.getRange(row, 7, 1, 2).setValues([[fails, lockMs ? new Date(now.getTime() + lockMs) : '']]);
        return { ok: false, need: 'pin', error: 'PIN 이 맞지 않습니다' + (lockMs ? ' — 잠시 잠겼습니다.' : ' (' + fails + '번째)') };
      } else if ((+r[6] || 0) || String(r[7])) rs.getRange(row, 7, 1, 2).setValues([[0, '']]);   /* 틀린 적이 있을 때만 지운다 */
      var tok = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
      deviceSheet_().appendRow([hmac_('tok|' + tok), sid, now, now, cut_(d.ua, 60)]);
      rs.getRange(row, 10).setValue(now);
      return { ok: true, t: tok, me: profile_(r) };
    } finally { lk.releaseLock(); }
  }
  if (a === 'accCheck') {   /* 학번·이름만으로 — PIN 을 정했는지(처음인지) 묻는다 */
    var rs0 = rosterSheet_(), row0 = findRow_(rs0, 1, sid_(d.sid)), r0 = row0 ? rs0.getRange(row0, 1, 1, 6).getValues()[0] : null;
    if (!r0 || nm_(r0[1]) !== nm_(d.name)) return { ok: false, error: '명단에서 찾지 못했습니다. 학번과 이름을 확인하고, 그래도 안 되면 선생님께 말씀해 주세요.' };
    return { ok: true, need: String(r0[5]) ? 'pin' : 'newpin' };
  }
  if (a === 'accMe') { var me = whoAmI_(d.t); return me ? { ok: true, me: me } : { ok: false, error: '다시 로그인해 주세요', relogin: 1 }; }
  if (a === 'accLogout') {
    CC.remove('tok:' + hmac_('tok|' + String(d.t || '')));
    var dv = deviceSheet_(), rw = findRow_(dv, 1, hmac_('tok|' + String(d.t || '')));
    if (rw) dv.deleteRow(rw);
    return { ok: true };
  }
  if (a === 'accSync') {    /* 한 단원의 지금 상태 + 바뀐 항목들 */
    var who = whoAmI_(d.t); if (!who) return { ok: false, error: '다시 로그인해 주세요', relogin: 1 };
    var unit = cut_(d.unit, 24); if (!/^[\w-]{2,24}$/.test(unit)) return { ok: false, error: '단원 이름이 이상합니다' };
    var snap = JSON.stringify({ s: d.s || {}, w: d.w || {} });
    if (snap.length > 45000) return { ok: false, error: '기록이 너무 큽니다' };
    var lk2 = LockService.getScriptLock(); if (!lk2.tryLock(15000)) return { ok: false, error: '잠시 뒤', retry: 1 };
    try {
      var ls = learnSheet_(), key = who.sid + '|' + unit, lr = findRow_(ls, 1, key);
      if (lr) { var n0 = +ls.getRange(lr, 6).getValue() || 0; ls.getRange(lr, 4, 1, 3).setValues([[now, snap, n0 + 1]]); }
      else ls.appendRow([key, who.sid, unit, now, snap, 1]);
      var ch = (d.ch || []).slice(0, 300).map(function (c) {
        var t0 = +c[2]; var tt = t0 && Math.abs(t0 - now.getTime()) < 7 * 24 * 3600e3 ? new Date(t0) : now;
        return [tt, who.sid, unit, cut_(c[0], 60), safe_(cut_(JSON.stringify(c[1] === undefined ? null : c[1]), 1000))];
      });
      if (ch.length) { var ll = learnLogSheet_(); ll.getRange(ll.getLastRow() + 1, 1, ch.length, 5).setValues(ch); }
    } finally { lk2.releaseLock(); }
    return { ok: true, at: now.getTime() };
  }
  if (a === 'accPull') {    /* 내 기록(다른 기기에서 이어 하기). units 를 주면 그 단원만 */
    var who2 = whoAmI_(d.t); if (!who2) return { ok: false, error: '다시 로그인해 주세요', relogin: 1 };
    var want = (d.units || []).map(String), out = {};
    learnPick_(function (sid, u) { return sid === who2.sid && (!want.length || want.indexOf(u) >= 0); }).forEach(function (r) {
      try { out[r.unit] = { at: ms_(r.at), d: JSON.parse(r.json || '{}') }; } catch (e) {}
    });
    return { ok: true, me: who2, units: out };
  }

  if (a === 'accClass') {   /* 우리 반 모으기 — 같은 반 로그인 학생들의 이 단원 기록을 이름 없이 센다(3명 이상일 때만) */
    var who3 = whoAmI_(d.t); if (!who3) return { ok: false, error: '다시 로그인해 주세요', relogin: 1 };
    var u3 = cut_(d.unit, 24), cls3 = classOfUnit_(who3, u3);
    if (!cls3) return { ok: false, error: '이 단원을 함께 듣는 반을 찾지 못했습니다' };
    var ck = 'cls:' + cls3 + '|' + u3, ch3 = CC.get(ck); if (ch3) { try { return JSON.parse(ch3); } catch (e) {} }
    var mem = {}, total = 0, mk = CC.get('mem:' + cls3);
    if (mk) { mem = JSON.parse(mk); total = Object.keys(mem).length; }
    else {
      var rv3 = rosterSheet_().getDataRange().getValues();
      for (var i3 = 1; i3 < rv3.length; i3++) { var p3 = profile_(rv3[i3]); if (p3.sid && (p3.cls === cls3 || p3.classes.indexOf(cls3) >= 0)) { mem[p3.sid] = 1; total++; } }
      CC.put('mem:' + cls3, JSON.stringify(mem), 600);
    }
    var agg = { gates: {}, quiz: {}, eps: {}, labs: {}, wrote: 0, n: 0 };
    learnPick_(function (sid, u) { return u === u3 && mem[sid]; }).forEach(function (r) {
      var dd3 = {}; try { dd3 = JSON.parse(r.json || '{}'); } catch (e) { return; }
      classAdd_(agg, dd3.s || {}, dd3.w || {});
    });
    var res3 = agg.n < 3 ? { ok: true, cls: cls3, total: total, n: agg.n, few: 1 } : { ok: true, cls: cls3, total: total, n: agg.n, agg: agg };
    var js3 = JSON.stringify(res3); if (js3.length < 90000) CC.put(ck, js3, 30);
    return res3;
  }

  if (a === 'accImportOnce') return accImportOnce_(d);

  /* ---- 선생님 (교사 열쇠) ---- */
  if (cut_(d.key, 40) !== teacherKey_()) return { ok: false, error: '열쇠가 맞지 않습니다' };
  if (a === 'accRoster') {   /* 명단 + 로그인 상태 (PIN 해시는 보내지 않는다) */
    var rv = rosterSheet_().getDataRange().getValues(), dvs = deviceSheet_().getDataRange().getValues(), nd = {}, list = [];
    for (var j = 1; j < dvs.length; j++) nd[String(dvs[j][1])] = (nd[String(dvs[j][1])] || 0) + 1;
    for (var k = 1; k < rv.length; k++) {
      var p = profile_(rv[k]); if (!p.sid) continue;
      p.pin = !!String(rv[k][5]); p.fails = +rv[k][6] || 0; p.locked = (ms_(rv[k][7]) || 0) > now.getTime(); p.last = ms_(rv[k][9]); p.devices = nd[p.sid] || 0;
      list.push(p);
    }
    return { ok: true, students: list };
  }
  if (a === 'accImport') {   /* 명단 넣기 — rows: [[학번, 이름, 학년, 반, 수업 반], …]. 이미 있는 학번의 PIN·기록은 그대로 둔다 */
    if (d.confirm !== '명단') return { ok: false, error: 'confirm=명단 이 필요합니다' };
    var lk3 = LockService.getScriptLock(); if (!lk3.tryLock(20000)) return { ok: false, error: '잠시 뒤' };
    try {
      var rs3 = rosterSheet_(), old = rs3.getDataRange().getValues(), keep = {};
      for (var m = 1; m < old.length; m++) keep[String(old[m][0])] = old[m];
      var rows = (d.rows || []).slice(0, 3000).map(function (x) {
        var s3 = sid_(x[0]), o = keep[s3] || [];
        return [s3, safe_(cut_(x[1], 20)), cut_(x[2], 4), cut_(x[3], 12), cut_(x[4], 200), o[5] || '', o[6] || 0, o[7] || '', o[8] || '', o[9] || '', safe_(cut_(x[5] || o[10] || '', 60))];
      }).filter(function (x) { return x[0] && x[1]; });
      if (!rows.length) return { ok: false, error: '넣을 줄이 없습니다' };
      if (d.append) {   /* 덧붙이기 — 이미 있는 학번은 건너뛴다 */
        rows = rows.filter(function (x) { return !keep[x[0]]; }); if (!rows.length) return { ok: true, n: 0 };
        var at = rs3.getLastRow() + 1; rs3.getRange(at, 1, rows.length, 1).setNumberFormat('@'); rs3.getRange(at, 1, rows.length, 11).setValues(rows);
        return { ok: true, n: rows.length, append: 1 };
      }
      var cset = {}; rows.forEach(function (x) { cset[x[3]] = 1; String(x[4]).split(/[,\s]+/).forEach(function (c) { if (c) cset[c] = 1; }); }); CacheService.getScriptCache().removeAll(Object.keys(cset).map(function (c) { return 'mem:' + c; }));
      if (rs3.getLastRow() > 1) rs3.getRange(2, 1, rs3.getLastRow() - 1, 11).clearContent();
      rs3.getRange(2, 1, rows.length, 1).setNumberFormat('@');
      rs3.getRange(2, 1, rows.length, 11).setValues(rows);
      return { ok: true, n: rows.length };
    } finally { lk3.releaseLock(); }
  }
  if (a === 'accPinReset') { /* PIN·잠금을 풀고 그 학생의 기기 로그인을 모두 끊는다(기록은 그대로) */
    var rs4 = rosterSheet_(), r4 = findRow_(rs4, 1, sid_(d.sid)); if (!r4) return { ok: false, error: '그 학번이 없습니다' };
    rs4.getRange(r4, 6, 1, 3).setValues([['', 0, '']]);
    var dv4 = deviceSheet_(), dvv = dv4.getDataRange().getValues();
    for (var q = dvv.length - 1; q >= 1; q--) if (String(dvv[q][1]) === sid_(d.sid)) { CC.remove('tok:' + String(dvv[q][0])); dv4.deleteRow(q + 1); }
    return { ok: true };
  }
  if (a === 'accRecords') {  /* 한 반의 학생들 · 한 단원(또는 모든 단원)의 상태 — 선생님 화면이 풀어서 보여 준다 */
    var wc = cut_(d.cls, 16), wu = cut_(d.unit, 24), rv5 = rosterSheet_().getDataRange().getValues(), who5 = {};
    for (var g = 1; g < rv5.length; g++) { var p5 = profile_(rv5[g]); if (p5.sid && (p5.cls === wc || p5.classes.indexOf(wc) >= 0)) who5[p5.sid] = p5; }
    var recs = [];
    learnPick_(function (sid, u) { return who5[sid] && (!wu || u === wu); }).forEach(function (r) {
      var dd = {}; try { dd = JSON.parse(r.json || '{}'); } catch (e) {}
      recs.push({ sid: r.sid, unit: r.unit, at: ms_(r.at), n: +r.n || 0, d: dd });
    });
    return { ok: true, students: Object.keys(who5).map(function (x) { return who5[x]; }), records: recs };
  }
  if (a === 'accLog') {      /* 한 학생 · 한 단원의 바뀐 항목 기록(시간순) */
    var ws = sid_(d.sid), wu6 = cut_(d.unit, 24), lg = learnLogSheet_().getDataRange().getValues(), rows6 = [];
    for (var z = 1; z < lg.length; z++) if (String(lg[z][1]) === ws && (!wu6 || String(lg[z][2]) === wu6)) rows6.push([ms_(lg[z][0]), String(lg[z][2]), String(lg[z][3]), String(lg[z][4])]);
    rows6.sort(function (x, y) { return (x[0] || 0) - (y[0] || 0); });
    return { ok: true, rows: rows6.slice(-2000) };
  }
  return { ok: false, error: '모르는 요청' };
}

/** 단원 → 그 학생이 그 단원을 듣는 반. 1학년 과목(is1·is2·gt1·gt2)은 본반, 2학년 선택 과목은 '2-과목코드A/B' 중 학생이 가진 것. */
var UNIT_CLASS_ = { eshs: '지구과학', esys: '지구시스템', psp: '행성우주', cce: '기후환경', cvg: '융합탐구', shc: '과학사' };
function classOfUnit_(who, unit) {
  var pre = String(unit || '').replace(/[0-9]*-.*$/, '').replace(/[0-9]+$/, '');
  if (/^(is|gt)$/.test(pre)) return who.cls || (who.classes || [])[0] || '';
  var code = UNIT_CLASS_[pre]; if (!code) return '';
  var hit = (who.classes || []).filter(function (c) { return c.indexOf('2-' + code) === 0; });
  return hit[0] || '';
}
/** 한 학생의 단원 상태를 반 합계에 더한다 — 첫 추리(처음·다시 고른 보기), 문항(한 번에·나중에 맞힘), 장면, 실험실, 글을 쓴 사람 수 */
function classAdd_(A, s, w) {
  A.n++;
  Object.keys(s).forEach(function (k) {
    var v = s[k];
    if (/I$/.test(k) && typeof v === 'number' && !/_2I$/.test(k)) {
      var g = k.slice(0, -1), G = A.gates[g] || (A.gates[g] = { a: {}, b: {}, ok: 0, n: 0 });
      G.n++; G.a[v] = (G.a[v] || 0) + 1;
      if (typeof s[g + '_2I'] === 'number') G.b[s[g + '_2I']] = (G.b[s[g + '_2I']] || 0) + 1;
      if (s[g + 'OK'] === '맞음') G.ok++;
    } else if (v && typeof v === 'object' && v.c && v.c.length !== undefined) {
      var E = A.eps[k] || (A.eps[k] = { n: 0, done: 0, sc: [] }), m = 0;
      E.n++; if (v.done) E.done++;
      v.c.forEach(function (x, i) { E.sc[i] = (E.sc[i] || 0) + (x ? 1 : 0); if (x) m++; });
    }
  });
  var Q = s.quiz || {};
  Object.keys(Q).forEach(function (id) {
    var x = Q[id] || {}; if (!(x.r === 1 || x.n || x.sh)) return;
    var q = A.quiz[id] || (A.quiz[id] = { n: 0, first: 0, later: 0, ov: 0 });
    q.n++; if (x.r === 1 && !x.n && !x.sh) q.first++; else { if (x.r === 1) q.later++; if (x.cf === 2) q.ov = (q.ov || 0) + 1; }
  });
  ['lab', 'real'].forEach(function (lk) {
    var L = s[lk] || {};
    Object.keys(L).forEach(function (c) { var x = L[c] || {}; if (x.p == null) return; var key = lk + ':' + c, B = A.labs[key] || (A.labs[key] = { n: 0, ok: 0 }); B.n++; if (x.ok) B.ok++; });
  });
  if (Object.keys(w).some(function (k) { return String(w[k] || '').trim(); })) A.wrote++;
}

/* ---- 명단 처음 넣기: 일회용 열쇠(아래 해시와 맞는 값)로 한 번 쓰고, 쓴 뒤에는 이 줄을 코드에서 지우고 다시 배포한다 ---- */
var ACC_IMPORT_ONCE = '';
function accImportOnce_(d) {
  if (!ACC_IMPORT_ONCE) return { ok: false, error: '닫혀 있습니다' };
  var h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(d.once || ''), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
  if (h !== ACC_IMPORT_ONCE) return { ok: false, error: '열쇠가 맞지 않습니다' };
  d.key = teacherKey_(); d.action = 'accImport'; d.confirm = '명단';
  var res = accounts_(d);
  if (res.ok && d.classes && d.classes.length) {   /* 반목록 탭에 없는 반 코드를 덧붙인다(우리 반 올리기가 받게) */
    var cs = classSheet_(), have = cs.getLastRow() ? cs.getRange(1, 1, cs.getLastRow(), 1).getValues().map(function (r) { return String(r[0]).trim(); }) : [];
    var add = d.classes.filter(function (c) { return c && c[0] && have.indexOf(String(c[0])) < 0; }).map(function (c) { return [cut_(c[0], 16), cut_(c[1], 40)]; });
    if (add.length) { var at = cs.getLastRow() + 1; cs.getRange(at, 1, add.length, 1).setNumberFormat('@'); cs.getRange(at, 1, add.length, 2).setValues(add); }
    res.classesAdded = add.length;
  }
  return res;
}

/** '학습' 탭에서 test(학번, 단원) 이 참인 줄만 꺼낸다 — 학번·단원 두 칸만 먼저 읽고, 상태(JSON)는 고른 줄만 읽는다.
 *  고른 줄이 많으면(선생님이 한 반의 모든 단원을 볼 때) 한 번에 읽는 편이 빠르다. */
function learnPick_(test) {
  var sh = learnSheet_(), n = sh.getLastRow() - 1; if (n < 1) return [];
  var keys = sh.getRange(2, 2, n, 2).getValues(), pick = [];
  for (var i = 0; i < n; i++) if (test(String(keys[i][0]), String(keys[i][1]))) pick.push(i);
  if (!pick.length) return [];
  if (pick.length > 60) {
    var all = sh.getRange(2, 2, n, 5).getValues();
    return pick.map(function (i) { return { sid: String(all[i][0]), unit: String(all[i][1]), at: all[i][2], json: all[i][3], n: all[i][4] }; });
  }
  return pick.map(function (i) { var v = sh.getRange(i + 2, 4, 1, 3).getValues()[0]; return { sid: String(keys[i][0]), unit: String(keys[i][1]), at: v[0], json: v[1], n: v[2] }; });
}
