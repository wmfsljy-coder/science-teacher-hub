/** 우리 반 공유 뒷단 — 구글 시트에 붙여 쓰는 Apps Script.
 *
 *  시트 'share'  : 시각 | 반 | 별명 | 단원 | 단원이름 | 성과(JSON) | 한 문장 | 숨김
 *                  학생 한 명의 한 단원에 한 줄. 다시 올리면 그 줄을 덮어쓴다(지금 상태).
 *  시트 '활동'   : 시각 | 반 | 별명 | 단원 | 단원이름 | 올린 칸 수 | 처음/다시
 *                  올릴 때마다 한 줄씩 쌓기만 한다(반별 활동 기록). 덮어쓰지 않는다.
 *  시트 '반목록'(선택) : A열에 허용할 반 코드를 적으면 그 반만 받는다. 없으면 모두 받는다.
 *
 *  'share' 의 '숨김' 칸에 아무 글자나 적으면 그 줄은 학생 화면에 나오지 않는다.
 */
var SHEET = 'share';
var LOG = '활동';

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
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function cut_(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }
function allowed_(cls) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('반목록');
  if (!sh || sh.getLastRow() < 1) return true;
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
      var t = w[0] instanceof Date ? w[0].getTime() : Date.parse(w[0]);
      if (!isNaN(t) && (by[u].last === null || t > by[u].last)) by[u].last = t;
    }
    var units = Object.keys(by).map(function (u) { return by[u]; });
    units.sort(function (a, b) { return (b.last || 0) - (a.last || 0); });
    return out_({ ok: true, units: units });
  }

  return out_({ ok: true, hello: 'sth-share' });
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, error: '형식 오류' }); }
  if (d.action !== 'post') return out_({ ok: false, error: '알 수 없는 요청' });
  var cls = cut_(d.cls, 12), nick = cut_(d.nick, 12), unit = cut_(d.unit, 24);
  if (!cls || !nick || !unit) return out_({ ok: false, error: '반·별명·단원이 필요합니다' });
  if (!allowed_(cls)) return out_({ ok: false, error: '등록되지 않은 반 코드입니다' });
  var res = {}, keys = Object.keys(d.results || {}).slice(0, 12);
  keys.forEach(function (k) { res[cut_(k, 8)] = cut_(d.results[k], 300); });
  var label = cut_(d.unitLabel, 60);
  var row = [new Date(), cls, nick, unit, label, JSON.stringify(res), cut_(d.line, 300), ''];
  var again = false;

  var lock = LockService.getScriptLock(); lock.waitLock(10000);
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
    logSheet_().appendRow([new Date(), cls, nick, unit, label, keys.length, again ? '다시' : '처음']);
  } finally { lock.releaseLock(); }
  return out_({ ok: true, updated: again });
}
