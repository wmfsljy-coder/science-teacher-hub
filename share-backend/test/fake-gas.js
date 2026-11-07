/* 가짜 Apps Script 환경 — 진짜 시트 없이 Code.gs·accounts.gs 를 node 에서 돌려 보는 시험용.
   SpreadsheetApp(시트 = 2차원 배열) · CacheService(만료 있음) · LockService · Utilities · ContentService 만 흉내 낸다.
   clasp push 에는 올라가지 않는다(.claspignore 가 test/ 를 뺀다). */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function a1(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  let c = 0; for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64);
  return [+m[2], c];
}
const blank = (v) => v === '' || v == null;

class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = this.sh.rows[this.r - 1 + i] || [];
      const o = [];
      for (let j = 0; j < this.nc; j++) { const v = row[this.c - 1 + j]; o.push(v == null ? '' : v); }
      out.push(o);
    }
    return out;
  }
  getValue() { return this.getValues()[0][0]; }
  setValues(vs) {
    if (vs.length !== this.nr || vs.some((r) => r.length !== this.nc)) throw new Error('setValues 크기가 다릅니다 ' + this.nr + 'x' + this.nc);
    vs.forEach((row, i) => row.forEach((v, j) => this.sh.put(this.r + i, this.c + j, v)));
    this.sh.ss.writes++;
    return this;
  }
  setValue(v) { this.sh.put(this.r, this.c, v); this.sh.ss.writes++; return this; }
  clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.put(this.r + i, this.c + j, ''); return this; }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  setBackground() { return this; }
  setFontColor() { return this; }
  createTextFinder(text) {
    const self = this;
    return { matchEntireCell() { return this; }, findNext() {
      const v = self.getValues();
      for (let i = 0; i < v.length; i++) for (let j = 0; j < v[i].length; j++) if (String(v[i][j]) === String(text)) return { getRow: () => self.r + i };
      return null;
    } };
  }
}
class Sheet {
  constructor(ss, name) { this.ss = ss; this.name = name; this.rows = []; }
  put(r, c, v) {
    if (typeof v === 'string' && v.charAt(0) === "'") v = v.slice(1);         /* 시트는 앞의 ' 를 떼고 글자로 둔다 */
    else if (typeof v === 'string' && /^[=+\-@]/.test(v)) this.ss.formulas.push(this.name + '!' + r + ',' + c + ' ' + v);   /* ' 없이 = + - @ 로 시작하면 진짜 시트는 수식으로 본다 */
    while (this.rows.length < r) this.rows.push([]);
    const row = this.rows[r - 1]; while (row.length < c) row.push('');
    row[c - 1] = v;
  }
  getLastRow() { for (let i = this.rows.length - 1; i >= 0; i--) if (this.rows[i].some((v) => !blank(v))) return i + 1; return 0; }
  getLastColumn() { return Math.max(0, ...this.rows.map((r) => { for (let j = r.length - 1; j >= 0; j--) if (!blank(r[j])) return j + 1; return 0; })); }
  getRange(r, c, nr, nc) {
    this.ss.reads++;
    if (typeof r === 'string') { const [rr, cc] = a1(r); return new Range(this, rr, cc, 1, 1); }
    return new Range(this, r, c, nr || 1, nc || 1);
  }
  getDataRange() { this.ss.reads++; this.ss.fullReads++; return new Range(this, 1, 1, this.getLastRow(), this.getLastColumn()); }
  appendRow(v) { const r = this.getLastRow() + 1; v.forEach((x, j) => this.put(r, j + 1, x)); this.ss.writes++; return this; }
  deleteRow(r) { this.rows.splice(r - 1, 1); return this; }
  setFrozenRows() { return this; }
  setColumnWidth() { return this; }
  clear() { this.rows = []; return this; }
}
class Spreadsheet {
  constructor() { this.sheets = {}; this.tz = 'Asia/Seoul'; this.reads = 0; this.writes = 0; this.fullReads = 0; this.formulas = []; this.slept = 0; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { const s = new Sheet(this, n); this.sheets[n] = s; return s; }
  getSpreadsheetTimeZone() { return this.tz; }
  setSpreadsheetTimeZone(t) { this.tz = t; }
  setActiveSheet() {}
}
function makeCache(clock) {
  const m = new Map();
  const live = (k) => { const e = m.get(k); if (!e) return null; if (e.exp <= clock()) { m.delete(k); return null; } return e.v; };
  return {
    get: (k) => live(k),
    put: (k, v, sec) => { if (String(k).length > 250) throw new Error('캐시 열쇠가 너무 깁니다'); if (Buffer.byteLength(String(v), 'utf8') > 100 * 1024) throw new Error('캐시 값이 너무 큽니다(100KB 넘음)');   /* 진짜 캐시처럼 바이트로 센다 */ m.set(k, { v: String(v), exp: clock() + Math.min(sec || 600, 21600) * 1000 }); },
    remove: (k) => { m.delete(k); },
    removeAll: (ks) => ks.forEach((k) => m.delete(k)),
    _map: m,
  };
}
const signed = (buf) => Array.from(buf).map((b) => (b > 127 ? b - 256 : b));

/** .gs 파일들을 한 맥락(context)에 불러 돌려준다. ctx.doGet / ctx.doPost / ctx.accounts_ 등을 바로 부른다. */
function load(dir) {
  const ss = new Spreadsheet();
  const cache = makeCache(() => Date.now());
  const lock = { tryLock: () => true, releaseLock: () => {}, waitLock: () => {} };
  const ctx = {
    console, Date, JSON, Math, Object, Array, String, Number, RegExp, Error, isNaN, isFinite, parseInt, parseFloat,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => { throw new Error('UI 없음'); } },
    CacheService: { getScriptCache: () => cache },
    LockService: { getScriptLock: () => lock, getDocumentLock: () => lock },
    ContentService: { createTextOutput: (s) => ({ s, setMimeType() { return this; }, getContent() { return this.s; } }), MimeType: { JSON: 'json' } },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (v, k) => signed(crypto.createHmac('sha256', String(k)).update(String(v), 'utf8').digest()),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes.map((b) => b & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      computeDigest: (alg, s) => signed(crypto.createHash(alg === 'SHA_1' ? 'sha1' : 'sha256').update(String(s), 'utf8').digest()),
      DigestAlgorithm: { SHA_1: 'SHA_1', SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      sleep: (ms) => { ss.slept += ms; },
    },
  };
  vm.createContext(ctx);
  for (const f of ['Code.gs', 'links.gs', 'precheck.gs', 'accounts.gs', 'community.gs']) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f });
  }
  ctx.__ss = ss; ctx.__cache = cache;
  return ctx;
}
module.exports = { load };
