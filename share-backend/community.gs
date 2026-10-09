/** 함께 배우기 — 익명 돌려 읽기(동료 평가)와 궁금한 것 게시판. Code.gs 의 doPost 가 action 이 peer·q 로 시작하면 community_(d) 로 넘긴다.
 *
 *  시트 '돌려읽기' : 시각 | 반 | 단원 | 글쓴이 | 글 | 숨김
 *                    정리하기의 한 문장을 학생이 ‘돌려 읽기에 내기’를 눌렀을 때만 받는다. 같은 반·단원·글쓴이는 덮어쓴다.
 *  시트 '동료평가' : 시각 | 반 | 단원 | 글쓴이 | 평가자 | 점검(JSON [1/0 …]) | 좋은 점 | 고칠 점 | 숨김
 *                    같은 글쓴이·평가자는 덮어쓴다. 학생 화면에는 글쓴이·평가자 이름이 나가지 않는다.
 *  시트 '질문'     : 시각 | 반 | 단원 | 글쓴이 | 질문 | 나도(JSON 별명들) | 풀림(JSON 별명들) | 숨김 | 번호
 *
 *  누구인지: 별명(sth-me) 또는 로그인 학생('@학번' + 로그인 토큰 t). '@' 로 시작하는 이름은 토큰이 맞아야 받는다.
 *  선생님(교사 열쇠): peerAll · peerHide · qAll · qHide.  숨김 칸에 글자가 있으면 학생 화면에 나오지 않는다.
 */
var PEER = '돌려읽기', PEER_RATE = '동료평가', QBOARD = '질문';
var PEER_RUBRIC_N = 3;

function cSheet_(name, head) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }
  return sh;
}
function peerSheet_() { return cSheet_(PEER, ['시각', '반', '단원', '글쓴이', '글', '숨김']); }
function rateSheet_() { return cSheet_(PEER_RATE, ['시각', '반', '단원', '글쓴이', '평가자', '점검(JSON)', '좋은 점', '고칠 점', '숨김']); }
function qSheet_() { return cSheet_(QBOARD, ['시각', '반', '단원', '글쓴이', '질문', '나도(JSON)', '풀림(JSON)', '숨김', '번호']); }

/** 글을 가리키는 번호 — 글쓴이 이름 대신 쓴다(학생 화면에 이름이 나가지 않게). */
function peerId_(cls, unit, nick) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, 'peer|' + teacherKey_() + '|' + cls + '|' + unit + '|' + nick);
  return b.slice(0, 6).map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}
function jarr_(s) { try { var a = JSON.parse(s || '[]'); return a instanceof Array ? a : []; } catch (e) { return []; } }

/** 보낸 사람 확인 — 반·별명·단원. 로그인 이름('@학번')은 토큰으로 확인한다. */
function who_(d) {
  var cls = cut_(d.cls, 16), nick = cut_(d.nick, 12), unit = cut_(d.unit, 24);
  if (!cls || !nick || !/^[\w-]{2,24}$/.test(unit)) return { err: '반·이름·단원이 필요합니다' };
  if (nick.charAt(0) === '@') {
    var w = typeof whoAmI_ === 'function' ? whoAmI_(d.t) : null;
    if (!w || '@' + w.sid !== nick) return { err: '다시 로그인해 주세요', relogin: 1 };
  }
  if (cls !== '0-시험' && !allowed_(cls)) return { err: '등록되지 않은 반 코드입니다' };     /* 0-시험: 선생님 시험용 반(명단의 9901~9903) */
  return { cls: cls, nick: nick, unit: unit };
}

function community_(d) {
  var a = String(d.action || '');
  var T = function () { return cut_(d.key, 40) === teacherKey_(); };

  /* ---------- 선생님 ---------- */
  if (a === 'peerAll' || a === 'qAll' || a === 'peerHide' || a === 'qHide') {
    if (!T()) return { ok: false, error: '열쇠가 맞지 않습니다' };
    var tc = cut_(d.cls, 16), tu = cut_(d.unit, 24);
    if (a === 'peerAll') {
      var pv = peerSheet_().getDataRange().getValues(), rv = rateSheet_().getDataRange().getValues(), by = {}, list = [];
      for (var i = 1; i < pv.length; i++) {
        if (String(pv[i][1]) !== tc || String(pv[i][2]) !== tu) continue;
        var o = { id: peerId_(tc, tu, String(pv[i][3])), nick: String(pv[i][3]), text: String(pv[i][4]), t: ms_(pv[i][0]), hide: !!String(pv[i][5]).trim(), n: 0, sum: [0, 0, 0], good: [], fix: [] };
        by[o.nick] = o; list.push(o);
      }
      for (var j = 1; j < rv.length; j++) {
        if (String(rv[j][1]) !== tc || String(rv[j][2]) !== tu || String(rv[j][8]).trim()) continue;
        var tg = by[String(rv[j][3])]; if (!tg) continue;
        tg.n++; jarr_(rv[j][5]).forEach(function (v, k) { if (k < 3) tg.sum[k] += v ? 1 : 0; });
        if (String(rv[j][6]).trim()) tg.good.push(String(rv[j][6])); if (String(rv[j][7]).trim()) tg.fix.push(String(rv[j][7]));
      }
      return { ok: true, items: list };
    }
    if (a === 'qAll') {
      var qv = qSheet_().getDataRange().getValues(), qs = [];
      for (var q = 1; q < qv.length; q++) {
        if (String(qv[q][1]) !== tc || String(qv[q][2]) !== tu) continue;
        qs.push({ id: String(qv[q][8]), text: String(qv[q][4]), nick: String(qv[q][3]), same: jarr_(qv[q][5]).length, solved: jarr_(qv[q][6]).length, hide: !!String(qv[q][7]).trim(), t: ms_(qv[q][0]) });
      }
      return { ok: true, items: qs };
    }
    /* 숨기기 / 다시 보이기 */
    var hsh = a === 'peerHide' ? peerSheet_() : qSheet_(), hv = hsh.getDataRange().getValues(), hid = cut_(d.id, 20), done = 0;
    for (var h = 1; h < hv.length; h++) {
      if (String(hv[h][1]) !== tc || String(hv[h][2]) !== tu) continue;
      var match = a === 'peerHide' ? peerId_(tc, tu, String(hv[h][3])) === hid : String(hv[h][8]) === hid;
      if (match) { hsh.getRange(h + 1, a === 'peerHide' ? 6 : 8).setValue(d.hide ? '선생님' : ''); done++; }
    }
    return { ok: true, n: done };
  }

  /* ---------- 학생 ---------- */
  var W = who_(d); if (W.err) return { ok: false, error: W.err, relogin: W.relogin };
  ensureTz_();

  /* 돌려 읽기에 내 글 내기 */
  if (a === 'peerPut') {
    var text = cut_(d.text, 400);
    if (text.length < 10) return { ok: false, error: '10자 이상 써 주세요' };
    var lk = LockService.getScriptLock(); if (!lk.tryLock(20000)) return { ok: false, error: '지금 올리는 친구가 많습니다. 잠시 뒤 다시 눌러 주세요' };
    try {
      var sh = peerSheet_(), v = sh.getDataRange().getValues(), row = [new Date(), safe_(W.cls), safe_(W.unit), safe_(W.nick), safe_(text), ''], upd = false;
      for (var r = 1; r < v.length; r++) if (String(v[r][1]) === W.cls && String(v[r][2]) === W.unit && String(v[r][3]) === W.nick) { row[5] = v[r][5]; sh.getRange(r + 1, 1, 1, 6).setValues([row]); upd = true; break; }
      if (!upd) sh.appendRow(row);
    } finally { lk.releaseLock(); }
    return { ok: true, updated: upd };
  }

  /* 읽을 글 두 편(평가를 적게 받은 글부터, 내 글·이미 평가한 글은 빼고) + 내 글이 받은 평가 */
  if (a === 'peerGet') {
    var pv2 = peerSheet_().getDataRange().getValues(), rv2 = rateSheet_().getDataRange().getValues();
    var cnt = {}, mineDone = {}, got = [], myText = '';
    for (var m = 1; m < rv2.length; m++) {
      if (String(rv2[m][1]) !== W.cls || String(rv2[m][2]) !== W.unit || String(rv2[m][8]).trim()) continue;
      var wr = String(rv2[m][3]), rt = String(rv2[m][4]);
      cnt[wr] = (cnt[wr] || 0) + 1;
      if (rt === W.nick) mineDone[wr] = 1;
      if (wr === W.nick) got.push({ c: jarr_(rv2[m][5]), good: String(rv2[m][6]), fix: String(rv2[m][7]) });
    }
    var pool = [];
    for (var p = 1; p < pv2.length; p++) {
      if (String(pv2[p][1]) !== W.cls || String(pv2[p][2]) !== W.unit) continue;
      var wn = String(pv2[p][3]);
      if (wn === W.nick) { myText = String(pv2[p][4]); continue; }
      if (String(pv2[p][5]).trim() || mineDone[wn]) continue;
      pool.push({ id: peerId_(W.cls, W.unit, wn), text: String(pv2[p][4]), n: cnt[wn] || 0, r: Math.random() });
    }
    pool.sort(function (x, y) { return x.n - y.n || x.r - y.r; });
    var want = Math.max(1, Math.min(3, +d.n || 2));
    return { ok: true, items: pool.slice(0, want).map(function (x) { return { id: x.id, text: x.text }; }), left: Math.max(0, pool.length - want),
             rated: Object.keys(mineDone).length, mine: myText ? { text: myText, got: got } : null };
  }

  /* 친구 글 평가 — 점검 세 칸(1/0)과 좋은 점·고칠 점 한 줄씩 */
  if (a === 'peerRate') {
    var id = cut_(d.id, 20), c = (d.c instanceof Array ? d.c : []).slice(0, PEER_RUBRIC_N).map(function (x) { return x ? 1 : 0; });
    var good = cut_(d.good, 120), fix = cut_(d.fix, 120);
    if (!good && !fix) return { ok: false, error: '좋은 점이나 고칠 점을 한 줄 써 주세요' };
    var pv3 = peerSheet_().getDataRange().getValues(), writer = null;
    for (var x = 1; x < pv3.length; x++) if (String(pv3[x][1]) === W.cls && String(pv3[x][2]) === W.unit && peerId_(W.cls, W.unit, String(pv3[x][3])) === id) { writer = String(pv3[x][3]); break; }
    if (!writer) return { ok: false, error: '그 글을 찾지 못했습니다' };
    if (writer === W.nick) return { ok: false, error: '내 글은 평가할 수 없습니다' };
    var lk3 = LockService.getScriptLock(); if (!lk3.tryLock(20000)) return { ok: false, error: '잠시 뒤 다시 눌러 주세요' };
    try {
      var rs = rateSheet_(), rvv = rs.getDataRange().getValues(), rrow = [new Date(), safe_(W.cls), safe_(W.unit), safe_(writer), safe_(W.nick), JSON.stringify(c), safe_(good), safe_(fix), ''], up3 = false;
      for (var y = 1; y < rvv.length; y++) if (String(rvv[y][1]) === W.cls && String(rvv[y][2]) === W.unit && String(rvv[y][3]) === writer && String(rvv[y][4]) === W.nick) { rrow[8] = rvv[y][8]; rs.getRange(y + 1, 1, 1, 9).setValues([rrow]); up3 = true; break; }
      if (!up3) rs.appendRow(rrow);
    } finally { lk3.releaseLock(); }
    return { ok: true };
  }

  /* 궁금한 것 게시판 */
  if (a === 'qAdd' || a === 'qList' || a === 'qMark') {
    var qsh = qSheet_();
    if (a === 'qAdd') {
      var qt = cut_(d.text, 160);
      if (qt.length < 5) return { ok: false, error: '5자 이상 써 주세요' };
      var lk4 = LockService.getScriptLock(); if (!lk4.tryLock(20000)) return { ok: false, error: '잠시 뒤 다시 눌러 주세요' };
      try {
        var all = qsh.getDataRange().getValues(), mineN = 0;
        for (var z = 1; z < all.length; z++) if (String(all[z][1]) === W.cls && String(all[z][2]) === W.unit && String(all[z][3]) === W.nick) mineN++;
        if (mineN >= 5) return { ok: false, error: '한 단원에 질문은 다섯 개까지 남길 수 있습니다' };
        qsh.appendRow([new Date(), safe_(W.cls), safe_(W.unit), safe_(W.nick), safe_(qt), '[]', '[]', '', Utilities.getUuid().replace(/-/g, '').slice(0, 10)]);
      } finally { lk4.releaseLock(); }
    }
    if (a === 'qMark') {
      var mid = cut_(d.id, 20), col = d.kind === 'solved' ? 7 : 6;
      var lk5 = LockService.getScriptLock(); if (!lk5.tryLock(20000)) return { ok: false, error: '잠시 뒤 다시 눌러 주세요' };
      try {
        var mv = qsh.getDataRange().getValues();
        for (var u = 1; u < mv.length; u++) {
          if (String(mv[u][1]) !== W.cls || String(mv[u][2]) !== W.unit || String(mv[u][8]) !== mid) continue;
          var arr = jarr_(mv[u][col - 1]).filter(function (n) { return n !== W.nick; });
          if (d.on) arr.push(W.nick);
          qsh.getRange(u + 1, col).setValue(JSON.stringify(arr.slice(0, 200)));
          break;
        }
      } finally { lk5.releaseLock(); }
    }
    var lv = qsh.getDataRange().getValues(), out = [];
    for (var l = 1; l < lv.length; l++) {
      if (String(lv[l][1]) !== W.cls || String(lv[l][2]) !== W.unit || String(lv[l][7]).trim()) continue;
      var sa = jarr_(lv[l][5]), so = jarr_(lv[l][6]);
      out.push({ id: String(lv[l][8]), text: String(lv[l][4]), same: sa.length, solved: so.length, meSame: sa.indexOf(W.nick) >= 0, meSolved: so.indexOf(W.nick) >= 0, mine: String(lv[l][3]) === W.nick, t: ms_(lv[l][0]) });
    }
    return { ok: true, items: out };
  }

  return { ok: false, error: '알 수 없는 요청' };
}
