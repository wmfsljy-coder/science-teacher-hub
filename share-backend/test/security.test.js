/* 보안 고침 시험 — node share-backend/test/security.test.js
   첫 로그인 가로채기 막기 · 같은 답(명단에 있는지 안 알려 줌) · 틀린 횟수 제한 · 관리 열쇠 · 공개 목록에서 학번 가리기 · 목록 캐시.
   이름·학번은 모두 지어낸 것이다. */
'use strict';
const path = require('path');
const assert = require('assert');
const { load } = require('./fake-gas');

let passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.message)); }
}

function setup() {
  const g = load(path.join(__dirname, '..'));
  const tk = g.teacherKey_(), ak = g.adminKey_();
  const rs = g.rosterSheet_();
  /* 학번 | 이름 | 학년 | 반 | 수업 반 | PIN | 실패 | 잠금까지 | 등록일 | 최근 접속 | 비고 */
  rs.appendRow(['10301', '가나다', '1', '1-3', '', '', 0, '', '', '', '']);
  rs.appendRow(['10302', '라마바', '1', '1-3', '', '', 0, '', '', '', '']);
  rs.appendRow(['10501', '사아자', '1', '1-5', '', '', 0, '', '', '', '']);
  rs.appendRow(['20101', '차카타', '2', '2-1', '2-지구과학A', '', 0, '', '', '', '']);
  g.classSheet_();
  const post = (o) => JSON.parse(g.doPost({ postData: { contents: JSON.stringify(o) } }).getContent());
  const get = (p) => JSON.parse(g.doGet({ parameter: p }).getContent());
  return { g, tk, ak, post, get, rs };
}
const pinCell = (env, sid) => { const v = env.rs.getDataRange().getValues(); const r = v.find((x) => String(x[0]) === sid); return String(r[5]); };

console.log('첫 로그인 · 계정');
t('PIN 정하기가 닫혀 있으면 학번+이름만으로 계정을 차지할 수 없다', () => {
  const E = setup();
  const r = E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  assert.strictEqual(r.ok, false); assert.ok(!r.t, '토큰이 나오면 안 됨');
  assert.strictEqual(pinCell(E, '10301'), '', 'PIN 이 저장되면 안 됨');
  const r2 = E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '482915' });
  assert.strictEqual(r2.ok, false); assert.ok(!r2.t);
  assert.strictEqual(pinCell(E, '10301'), '');
});
t('accCheck 답이 명단에 있든 없든, PIN 이 있든 없든 같다(닫혀 있을 때)', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-5', minutes: 20 });
  E.post({ action: 'accLogin', sid: '10501', name: '사아자', newPin: '482915' });          // 1-5 학생은 PIN 정함
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-5', minutes: 0 });
  const a = E.post({ action: 'accCheck', sid: '10301', name: '가나다' });                   // 명단 O, PIN X
  const b = E.post({ action: 'accCheck', sid: '19999', name: '없는이' });                   // 명단 X
  const c = E.post({ action: 'accCheck', sid: '10501', name: '사아자' });                   // 명단 O, PIN O
  const d = E.post({ action: 'accCheck', sid: '10302', name: '틀린이름' });                 // 학번 O, 이름 X
  assert.deepStrictEqual(a, b); assert.deepStrictEqual(b, c); assert.deepStrictEqual(c, d);
  assert.deepStrictEqual(a, { ok: true, need: 'pin' });
});
t('accLogin 실패 답도 명단에 있는지 알려 주지 않는다', () => {
  const E = setup();
  const a = E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '482915' });   // 명단 O, PIN 없음
  const b = E.post({ action: 'accLogin', sid: '19999', name: '없는이', pin: '482915' });   // 명단 X
  assert.deepStrictEqual(a, b);
  const c = E.post({ action: 'accLogin', sid: '19998', name: '없는이' });
  const d = E.post({ action: 'accLogin', sid: '10302', name: '라마바' });
  assert.deepStrictEqual(c, d); assert.ok(!('name' in d), '이름을 돌려주지 않음');
});
t('교사 열쇠가 틀리면 PIN 정하기를 열 수 없다', () => {
  const E = setup();
  const r = E.post({ action: 'accPinWindow', key: 'sth-nope', cls: '1-3' });
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(E.post({ action: 'accCheck', sid: '10301', name: '가나다' }), { ok: true, need: 'pin' });
});
t('선생님이 연 반의 학생은 처음 PIN 을 정하고 로그인한다(정상 첫 로그인)', () => {
  const E = setup();
  const w = E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  assert.strictEqual(w.ok, true); assert.ok(w.open['1-3'] > Date.now() + 19 * 60e3, '기본 20분');
  assert.deepStrictEqual(E.post({ action: 'accCheck', sid: '10301', name: '가나다' }), { ok: true, need: 'newpin' });
  assert.deepStrictEqual(E.post({ action: 'accCheck', sid: '10501', name: '사아자' }), { ok: true, need: 'pin' }, '다른 반은 닫혀 있음');
  const r = E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915', ua: 'test' });
  assert.strictEqual(r.ok, true); assert.ok(r.t && r.t.length >= 40);
  assert.ok(r.me.pub && r.me.pub.indexOf('10301') < 0, '공개 이름에 학번이 없음');
  assert.notStrictEqual(pinCell(E, '10301'), '');
  /* 그 뒤에 친구가 newPin 으로 덮어쓰려 해도 안 된다 */
  const h = E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '999111' });
  assert.strictEqual(h.ok, false); assert.ok(!h.t);
  const again = E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '482915' });
  assert.strictEqual(again.ok, true);
  assert.strictEqual(E.post({ action: 'accMe', t: again.t }).me.pub, r.me.pub);
});
t('창이 열려 있어도 쉬운 PIN 은 받지 않는다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '*', minutes: 5 });
  const r = E.post({ action: 'accLogin', sid: '10302', name: '라마바', newPin: '123456' });
  assert.strictEqual(r.ok, false); assert.strictEqual(r.need, 'newpin'); assert.strictEqual(pinCell(E, '10302'), '');
});
t('시간이 지나면 창이 닫힌다, 0분이면 바로 닫힌다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3', minutes: 20 });
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3', minutes: 0 });
  assert.deepStrictEqual(E.post({ action: 'accCheck', sid: '10301', name: '가나다' }), { ok: true, need: 'pin' });
  E.g.pinWinWrite_({ '1-3': Date.now() - 1000 });
  assert.deepStrictEqual(E.post({ action: 'accCheck', sid: '10301', name: '가나다' }), { ok: true, need: 'pin' });
  const m = E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3', minutes: 600 });
  assert.ok(m.open['1-3'] <= Date.now() + 60 * 60e3 + 1000, '최대 60분');
});
t('틀린 횟수 제한: 5번 틀리면 맞는 PIN 도 잠시 막힌다 · 명단에 없는 학번도 똑같이 잠긴다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  let last, lastFake;
  for (let i = 0; i < 5; i++) {
    last = E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '000111' });
    lastFake = E.post({ action: 'accLogin', sid: '19999', name: '없는이', pin: '000111' });
    assert.deepStrictEqual(last, lastFake, (i + 1) + '번째 답이 같아야 함');
  }
  assert.ok(/잠겼습니다/.test(last.error));
  const ok = E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '482915' });
  assert.strictEqual(ok.ok, false); assert.ok(/잠겼습니다/.test(ok.error));
  assert.deepStrictEqual(ok, E.post({ action: 'accLogin', sid: '19999', name: '없는이', pin: '482915' }));
});
t('[잠금 분리] 친구가 학번만 알고 틀린 이름·아무 PIN 으로 10번 넣어도 본인은 바로 로그인된다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  let last;
  for (let i = 0; i < 10; i++) last = E.post({ action: 'accLogin', sid: '10301', name: '친구가아는이름', pin: '000111' });
  assert.ok(/잠겼습니다/.test(last.error), '그 조합(학번+틀린 이름)은 잠김');
  for (let i = 0; i < 6; i++) E.post({ action: 'accLogin', sid: '10301', name: '다른이름' + i, pin: '000111' });
  const me = E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '482915' });
  assert.strictEqual(me.ok, true, '본인(맞는 이름·PIN)은 잠기지 않음');
  const row = E.rs.getDataRange().getValues().find((x) => String(x[0]) === '10301');
  assert.strictEqual(+row[6] || 0, 0, '본인 줄의 실패 칸에 쌓이지 않음');
});
t('[잠금 분리] 이름 틀린 조합·명단에 없는 조합·진짜 학생의 틀린 PIN 이 답으로 구별되지 않는다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  E.post({ action: 'accLogin', sid: '10302', name: '라마바', newPin: '482915' });
  for (let i = 0; i < 11; i++) {
    const a = E.post({ action: 'accLogin', sid: '10302', name: '라마바', pin: '000111' });     // 진짜 학생, 틀린 PIN
    const b = E.post({ action: 'accLogin', sid: '10302', name: '틀린이름', pin: '000111' });   // 학번 O, 이름 X
    const c = E.post({ action: 'accLogin', sid: '19999', name: '없는이', pin: '000111' });     // 명단 X
    assert.deepStrictEqual(a, b, (i + 1) + '번째'); assert.deepStrictEqual(b, c, (i + 1) + '번째');
  }
});
t('accCheck 도 학번마다 10분에 40번까지', () => {
  const E = setup();
  for (let i = 0; i < 40; i++) assert.strictEqual(E.post({ action: 'accCheck', sid: '10302', name: '라마바' }).ok, true);
  assert.strictEqual(E.post({ action: 'accCheck', sid: '10302', name: '라마바' }).ok, false);
});
t('PIN 초기화·명단 넣기는 관리 열쇠까지 있어야 한다, 초기화하면 잠금도 풀린다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  for (let i = 0; i < 5; i++) E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '000111' });
  assert.strictEqual(E.post({ action: 'accPinReset', key: E.tk, sid: '10301' }).ok, false);
  assert.strictEqual(E.post({ action: 'accImport', key: E.tk, confirm: '명단', rows: [['10399', '파하가']] }).ok, false);
  assert.strictEqual(E.post({ action: 'accPinReset', key: E.tk, admin: E.ak, sid: '10301' }).ok, true);
  assert.strictEqual(pinCell(E, '10301'), '');
  const r = E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '573920' });   // 창이 아직 열려 있음
  assert.strictEqual(r.ok, true, '초기화 뒤 다시 정할 수 있음');
});
t('[A4] 캐시가 지워져도 틀린 횟수·잠금은 명단 탭 기준으로 이어진다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  for (let i = 0; i < 4; i++) E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '000111' });
  E.g.__cache._map.clear();                                   // 캐시가 통째로 사라짐
  const fifth = E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '000111' });
  assert.ok(/잠겼습니다/.test(fifth.error), '시트의 4번 + 1 = 5번째에 잠김');
  E.g.__cache._map.clear();
  const ok = E.post({ action: 'accLogin', sid: '10301', name: '가나다', pin: '482915' });
  assert.strictEqual(ok.ok, false, '캐시가 없어도 시트 잠금 시각으로 막힘'); assert.ok(/잠겼습니다/.test(ok.error));
  const row = E.rs.getDataRange().getValues().find((x) => String(x[0]) === '10301');
  assert.strictEqual(+row[6], 5); assert.ok(row[7] instanceof Date && row[7].getTime() > Date.now());
});
t('[시트] PIN·기기 해시가 - 로 시작해도 수식으로 쓰지 않는다(로그인 20번)', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '*' });
  E.post({ action: 'accLogin', sid: '10302', name: '라마바', newPin: '482915' });
  for (let i = 0; i < 20; i++) assert.strictEqual(E.post({ action: 'accLogin', sid: '10302', name: '라마바', pin: '482915' }).ok, true);
  assert.deepStrictEqual(E.g.__ss.formulas, []);
});
t('accRoster 는 교사 열쇠로 되고 열린 반을 함께 준다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  const r = E.post({ action: 'accRoster', key: E.tk });
  assert.strictEqual(r.ok, true); assert.ok(r.pinOpen['1-3']); assert.strictEqual(r.students.length, 4);
  assert.ok(r.students.every((s) => !('PIN' in s) && typeof s.pin === 'boolean'));
});

console.log('교사 열쇠');
t('지우기(wipe)·옛 기록 옮기기는 관리 열쇠까지', () => {
  const E = setup();
  assert.strictEqual(E.post({ action: 'wipe', key: E.tk, cls: '1-3', confirm: '지움' }).ok, false);
  assert.strictEqual(E.post({ action: 'import', key: E.tk, confirm: '옮김', rows: [] }).ok, false);
  assert.strictEqual(E.post({ action: 'wipe', key: E.tk, admin: E.ak, cls: '1-3', confirm: '지움' }).ok, true);
});
t('[열쇠] 남이 틀린 열쇠를 아무리 넣어도 맞는 열쇠는 통과, 틀린 열쇠는 기다리지 않고 바로 거절', () => {
  const E = setup();
  for (let i = 0; i < 60; i++) assert.strictEqual(E.post({ action: 'teacher', key: 'sth-guess' + i }).ok, false);
  for (let i = 0; i < 60; i++) assert.strictEqual(E.post({ action: 'wipe', key: E.tk, admin: 'adm-guess' + i, cls: '1-3', confirm: '지움' }).ok, false);
  assert.strictEqual(E.g.__ss.slept, 0, 'sleep 없음(실행 시간·동시 실행 자리를 잡아먹지 않음)');
  assert.strictEqual(E.post({ action: 'teacher', key: E.tk }).ok, true);
  assert.strictEqual(E.post({ action: 'accPinReset', key: E.tk, admin: E.ak, sid: '10302' }).ok, true);
  assert.strictEqual(E.g.__cache.get('keyBad:t'), null, '서버 전체 잠금 칸이 없음');
});
t('빈 열쇠는 늘 거절한다(시트 B1 이 비어 있어도)', () => {
  const E = setup();
  assert.strictEqual(E.g.keyEq_('', ''), false);
  assert.strictEqual(E.post({ action: 'teacher' }).ok, false);
});

console.log('공개 목록');
t('?action=list 는 \'@학번\' 대신 가린 이름을 주고, 내 공개 이름(me.pub)과 같다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  const me = E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: '@10301', t: me.t, unit: 'is1-1', results: { a: '1', _ev: 'g:x=1' }, line: '한 문장' }).ok, true);
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: '불가사리', unit: 'is1-1', results: { a: '2' } }).ok, true);
  const L = E.get({ action: 'list', cls: '1-3', unit: 'is1-1' });
  assert.strictEqual(L.items.length, 2);
  const s = JSON.stringify(L);
  assert.ok(s.indexOf('10301') < 0 && s.indexOf('@') < 0, '학번이 보이면 안 됨');
  assert.ok(L.items.some((x) => x.nick === me.me.pub));
  assert.ok(L.items.some((x) => x.nick === '불가사리'));
  assert.ok(L.items.every((x) => !('_ev' in x.results)));
  /* 선생님 화면(교사 열쇠)에는 그대로 */
  const S = E.post({ action: 'students', key: E.tk, cls: '1-3', unit: 'is1-1' });
  assert.ok(S.students.some((x) => x.nick === '@10301'));
});
t('남이 \'@학번\' 이름으로 올리는 것은 여전히 막힌다', () => {
  const E = setup();
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: '@10302', unit: 'is1-1', results: {} }).ok, false);
});
t('measures 목록도 학번을 가린다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  const me = E.post({ action: 'accLogin', sid: '10302', name: '라마바', newPin: '482915' });
  assert.strictEqual(E.post({ action: 'measure', cls: '1-3', nick: '@10302', t: me.t, unit: 'is1-1', key: 'm1', v: [3.2] }).ok, true);
  const M = E.get({ action: 'measures', cls: '1-3', unit: 'is1-1', key: 'm1' });
  assert.strictEqual(M.items.length, 1); assert.strictEqual(M.items[0].nick, me.me.pub);
  assert.ok(JSON.stringify(M).indexOf('10302') < 0);
});
t('목록은 잠깐 캐시되지만, 새로 올리면 바로 다시 읽는다 · 다시 올리면 덮어쓴다', () => {
  const E = setup();
  E.post({ action: 'post', cls: '1-3', nick: '고래', unit: 'is1-2', results: { a: '1' }, line: '처음' });
  assert.strictEqual(E.get({ action: 'list', cls: '1-3', unit: 'is1-2' }).items.length, 1);
  const before = E.g.__ss.reads;
  E.get({ action: 'list', cls: '1-3', unit: 'is1-2' });
  assert.strictEqual(E.g.__ss.reads, before, '두 번째는 시트를 읽지 않음(캐시)');
  E.post({ action: 'post', cls: '1-3', nick: '고래', unit: 'is1-2', results: { a: '2' }, line: '고침' });
  E.post({ action: 'post', cls: '1-3', nick: '상어', unit: 'is1-2', results: { a: '3' } });
  const L = E.get({ action: 'list', cls: '1-3', unit: 'is1-2' });
  assert.strictEqual(L.items.length, 2);
  assert.strictEqual(L.items.find((x) => x.nick === '고래').line, '고침');
  const C = E.get({ action: 'classlog', cls: '1-3' });
  assert.strictEqual(C.units[0].n, 2);
});
t('[A3] 읽는 사이에 누가 올려도, 옛 목록이 캐시에 남아 방금 쓴 글을 가리지 않는다', () => {
  const E = setup();
  E.post({ action: 'post', cls: '1-3', nick: '고래', unit: 'is1-5', results: { a: '1' } });
  const real = E.g.pickRows_; let once = true;
  E.g.pickRows_ = function () {                               // GET 이 옛 줄을 읽은 직후에 다른 학생이 올린다
    const rows = real.apply(null, arguments);
    if (once) { once = false; assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: '상어', unit: 'is1-5', results: { a: '2' } }).ok, true); }
    return rows;
  };
  assert.strictEqual(E.get({ action: 'list', cls: '1-3', unit: 'is1-5' }).items.length, 1, '이 GET 은 옛 목록(1명)');
  E.g.pickRows_ = real;
  assert.strictEqual(E.get({ action: 'list', cls: '1-3', unit: 'is1-5' }).items.length, 2, '바로 다음 GET 은 새 목록(2명)');
});
t('[A3] 세대 값이 캐시에서 사라져도 옛 목록을 주지 않는다', () => {
  const E = setup();
  E.post({ action: 'post', cls: '1-3', nick: '고래', unit: 'is1-6', results: {} });
  E.get({ action: 'list', cls: '1-3', unit: 'is1-6' });
  E.post({ action: 'post', cls: '1-3', nick: '상어', unit: 'is1-6', results: {} });
  E.g.__cache.remove('G|1-3');
  assert.strictEqual(E.get({ action: 'list', cls: '1-3', unit: 'is1-6' }).items.length, 2);
});
t('[A2] 한글이 많아 100KB(바이트)를 넘는 목록은 캐시에 넣지 않고, 답은 정상', () => {
  const E = setup();
  const long = '가'.repeat(290);                               // 한 칸 300자 안
  for (let i = 0; i < 12; i++) {
    const res = {}; for (let k = 0; k < 10; k++) res['k' + k] = long;
    assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: 'n' + i, unit: 'is1-7', results: res, line: long }).ok, true);
  }
  const L = E.get({ action: 'list', cls: '1-3', unit: 'is1-7' });
  const s = JSON.stringify(L);
  assert.ok(s.length < 90000 && Buffer.byteLength(s) > 100 * 1024, '글자 수는 9만 아래, 바이트는 100KB 넘음(옛 검사를 통과하던 크기)');
  assert.strictEqual(L.ok, true); assert.strictEqual(L.items.length, 12);
  const before = E.g.__ss.reads;
  assert.strictEqual(E.get({ action: 'list', cls: '1-3', unit: 'is1-7' }).items.length, 12);
  assert.ok(E.g.__ss.reads > before, '캐시에 없으니 다시 시트를 읽음');
  assert.strictEqual(E.g.utf8Len_('가a😀'), 3 + 1 + 4);
});
t('[A2] 캐시 저장이 실패해도 응답은 정상', () => {
  const E = setup();
  E.post({ action: 'post', cls: '1-3', nick: '고래', unit: 'is1-8', results: {} });
  const put = E.g.__cache.put; E.g.__cache.put = () => { throw new Error('캐시 고장'); };
  try { assert.strictEqual(E.get({ action: 'list', cls: '1-3', unit: 'is1-8' }).items.length, 1); assert.strictEqual(E.get({ action: 'classlog', cls: '1-3' }).ok, true); }
  finally { E.g.__cache.put = put; }
});
t('숨김 칸에 글자가 있으면 목록에서 빠진다', () => {
  const E = setup();
  E.post({ action: 'post', cls: '1-3', nick: '고래', unit: 'is1-3', results: {} });
  E.post({ action: 'post', cls: '1-3', nick: '상어', unit: 'is1-3', results: {} });
  E.g.sheet_().getRange(2, 8).setValue('숨김');
  E.g.bump_('1-3');                                          // 시트를 직접 고친 것은 20초 뒤 보이므로, 시험에서는 세대를 바꾼다
  const L = E.get({ action: 'list', cls: '1-3', unit: 'is1-3' });
  assert.deepStrictEqual(L.items.map((x) => x.nick), ['상어']);
});
t('많은 줄 사이에서도 고른 줄만 정확히 꺼낸다(pickRows_)', () => {
  const E = setup();
  for (let i = 0; i < 120; i++) E.post({ action: 'post', cls: i % 3 ? '1-5' : '1-3', nick: 'n' + i, unit: i % 2 ? 'is1-4' : 'is1-9', results: { a: String(i) } });
  const L = E.get({ action: 'list', cls: '1-3', unit: 'is1-4' });
  const want = []; for (let i = 0; i < 120; i++) if (!(i % 3) && i % 2) want.push('n' + i);
  assert.deepStrictEqual(L.items.map((x) => x.nick).sort(), want.sort());
  assert.ok(L.items.every((x) => +x.results.a % 3 === 0));
});

console.log('별명 사칭 · 수식 막기');
t('[B1] 토큰 없이 \'@학번\' 을 따옴표·전각·공백·보이지 않는 글자로 감싸 보내도 막힌다', () => {
  const E = setup();
  const tricks = ["'@10301", "''@10301", ' @10301', '\uFF2010301', '\uFE6B10301', '\u200B@10301', '\uFEFF@10301', '\u2018@10301', '"@10301', '\u3000@10301', '\u202E@10301'];
  for (const nk of tricks) {
    for (const action of ['post', 'vote', 'measure']) {
      const r = E.post({ action, cls: '1-3', nick: nk, unit: 'is1-1', results: {}, key: 'g1', a: 0, v: [1] });
      assert.strictEqual(r.ok, false, action + ' ' + JSON.stringify(nk) + ' 가 통과하면 안 됨');
    }
    const c = E.post({ action: 'qAdd', cls: '1-3', nick: nk, unit: 'is1-1', text: '궁금한 것이 있어요 정말로' });
    assert.strictEqual(c.ok, false, 'qAdd ' + JSON.stringify(nk));
  }
  ['share', '투표', '측정값', '질문'].forEach((n) => { const sh = E.g.__ss.getSheetByName(n); if (sh) assert.ok(!sh.getDataRange().getValues().some((r) => String(r[2]).indexOf('10301') >= 0 || String(r[3]).indexOf('10301') >= 0), n + ' 탭에 저장되면 안 됨'); });
});
t('[B1] 가린 이름(친구 xxxx)을 흉내 내는 별명도 토큰 없이는 막힌다, 본인 토큰이면 전각 사용도 본인 이름으로', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  const me = E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: me.me.pub, unit: 'is1-1', results: {} }).ok, false);
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: '\uFF2010301', t: me.t, unit: 'is1-1', results: {} }).ok, true);
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: '@10302', t: me.t, unit: 'is1-1', results: {} }).ok, false, '남의 학번은 내 토큰으로도 안 됨');
  const L = E.get({ action: 'list', cls: '1-3', unit: 'is1-1' });
  assert.deepStrictEqual(L.items.map((x) => x.nick), [me.me.pub]);
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: '친구가 좋아', unit: 'is1-1', results: {} }).ok, true, '평범한 별명은 그대로');
});
t('[별명 그대로] 이모지(ZWJ)·전각 별명은 보낸 그대로 저장·표시되고, 다시 올리면 같은 글을 덮는다', () => {
  const E = setup();
  const sci = '\u{1F469}\u200D\u{1F52C}', wide = '\uFF21고래', narrow = 'A고래';
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: sci, unit: 'is2-1', results: { a: '1' } }).updated, false);
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: sci, unit: 'is2-1', results: { a: '2' } }).updated, true, 'ZWJ 이모지 재게시는 같은 글');
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: wide, unit: 'is2-1', results: { a: 'w' } }).updated, false);
  assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: narrow, unit: 'is2-1', results: { a: 'n' } }).updated, false, 'Ａ고래 와 A고래 는 다른 글');
  const L = E.get({ action: 'list', cls: '1-3', unit: 'is2-1' });
  assert.deepStrictEqual(L.items.map((x) => x.nick).sort(), [sci, wide, narrow].sort(), "목록의 별명 = 보낸 별명(학생 화면의 '(나)' 가 맞음)");
  assert.strictEqual(L.items.find((x) => x.nick === wide).results.a, 'w');
  assert.strictEqual(E.post({ action: 'measure', cls: '1-3', nick: sci, unit: 'is2-1', key: 'm1', v: [1] }).updated, false);
  assert.strictEqual(E.post({ action: 'measure', cls: '1-3', nick: sci, unit: 'is2-1', key: 'm1', v: [2] }).updated, true);
  assert.strictEqual(E.post({ action: 'peerPut', cls: '1-3', nick: sci, unit: 'is2-1', text: '첫 번째 글입니다 열 글자 넘게' }).ok, true);
  assert.strictEqual(E.post({ action: 'peerPut', cls: '1-3', nick: sci, unit: 'is2-1', text: '고친 글입니다 열 글자 넘게요' }).ok, true);
  assert.strictEqual(E.g.__ss.getSheetByName('돌려읽기').getLastRow(), 2, '돌려 읽기도 한 줄(덮어쓰기)');
});
t('[별명 검사] 검사용 값은 숨은 글자를 가운데까지 지우고(저장값은 그대로), 앞 따옴표·전각도 정리한다', () => {
  const E = setup();
  assert.strictEqual(E.g.nickCheck_('\u200B\u2018@10301\u200B '), '@10301');
  assert.strictEqual(E.g.nickCheck_('\uFF2010301'), '@10301');
  assert.strictEqual(E.g.nickCheck_('친구 a\u200Bbcd'), '친구 abcd');
  ['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF', '\u00AD', '\u2061', '\u180E', '\u3164'].forEach((z) => assert.strictEqual(E.g.nickCheck_('친구 a' + z + 'bcd'), '친구 abcd', 'U+' + z.charCodeAt(0).toString(16)));
});
t('[별명 검사] 가운데 숨은 글자로 가린 이름(친구 xxxx)을 흉내 내도 토큰 없이는 막히고, ZWJ 이모지 별명은 그대로 저장된다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  const me = E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  const pub = me.me.pub;                                    // '친구 ' + 4글자
  ['\u200B', '\u200D', '\u2060', '\uFEFF', '\u00AD'].forEach((z) => {
    const fake = pub.slice(0, 4) + z + pub.slice(4);
    assert.strictEqual(E.post({ action: 'post', cls: '1-3', nick: fake, unit: 'is3-1', results: {} }).ok, false, '사칭 U+' + z.charCodeAt(0).toString(16));
    assert.strictEqual(E.post({ action: 'qAdd', cls: '1-3', nick: fake, unit: 'is3-1', text: '궁금한 것이 있어요 정말로' }).ok, false);
  });
  const sci = '\u{1F469}\u200D\u{1F52C}';
  E.post({ action: 'post', cls: '1-3', nick: sci, unit: 'is3-1', results: {} });
  assert.deepStrictEqual(E.get({ action: 'list', cls: '1-3', unit: 'is3-1' }).items.map((x) => x.nick), [sci]);
});
t('[pub] 예전 캐시에 남은 프로필에 pub 이 없어도 채워서 돌려준다', () => {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  const me = E.post({ action: 'accLogin', sid: '10301', name: '가나다', newPin: '482915' });
  E.post({ action: 'accMe', t: me.t });                       // 캐시에 담김
  const k = [...E.g.__cache._map.keys()].find((x) => x.indexOf('tok:') === 0);
  const old = JSON.parse(E.g.__cache.get(k)); delete old.pub; E.g.__cache.put(k, JSON.stringify(old), 3600);
  assert.strictEqual(E.post({ action: 'accMe', t: me.t }).me.pub, me.me.pub);
});
t('[B1] 글 칸의 수식 주입(= + - @, 앞 따옴표·공백 포함)이 수식으로 저장되지 않는다', () => {
  const E = setup();
  const bad = ['=IMPORTXML("http://x","//a")', '+1+1', '-2+3', '@SUM(1)', "'=HYPERLINK(1)", ' =1+1', '\t=1'];
  bad.forEach((v, i) => {
    E.post({ action: 'post', cls: '1-3', nick: '별' + i, unit: v.slice(0, 10) || 'u', unitLabel: v, results: { a: v }, line: v });
    E.post({ action: 'measure', cls: '1-3', nick: '별' + i, unit: 'is1-1', key: 'm1', v: [1], g: v });
    E.post({ action: 'peerPut', cls: '1-3', nick: '별' + i, unit: 'is1-1', text: v + ' 열 글자 넘게 씁니다' });
    E.post({ action: 'qAdd', cls: '1-3', nick: '별' + i, unit: 'is1-1', text: v + ' 궁금해요 정말' });
  });
  E.g.healCls_();                                             // 읽어서 다시 쓰는 길도 한 번
  assert.deepStrictEqual(E.g.__ss.formulas, []);
  assert.strictEqual(E.g.safe_("'=1"), "''=1"); assert.strictEqual(E.g.safe_(' =1'), "' =1"); assert.strictEqual(E.g.safe_('고래'), '고래');
});

console.log('반 통계 (저장형 XSS)');
function classEnv() {
  const E = setup();
  E.post({ action: 'accPinWindow', key: E.tk, cls: '1-3' });
  const ts = ['10301', '10302'].map((sid, i) => E.post({ action: 'accLogin', sid, name: ['가나다', '라마바'][i], newPin: '482915' }).t);
  E.rs.appendRow(['10303', '파하가', '1', '1-3', '', '', 0, '', '', '', '']);
  ts.push(E.post({ action: 'accLogin', sid: '10303', name: '파하가', newPin: '482915' }).t);
  return { E, ts };
}
const XSS = '<img src=x onerror=alert(1)>';
t('[B1] accSync 는 lab·real 키와 값을 정해진 모양만 저장한다(정상 기록은 그대로)', () => {
  const { E, ts } = classEnv();
  const s = { lab: { c1: { p: 2, ok: 1, n: 1 }, [XSS]: { p: 0, ok: 1 }, c2: { p: XSS, ok: '<b>', n: 'x', evil: XSS } }, real: { r1: { p: 1, a: '답 ' + XSS } }, quiz: { q1: { r: 1 } } };
  assert.strictEqual(E.post({ action: 'accSync', t: ts[0], unit: 'is1-1', s, w: {} }).ok, true);
  const got = E.post({ action: 'accPull', t: ts[0], units: ['is1-1'] }).units['is1-1'].d.s;
  assert.deepStrictEqual(Object.keys(got.lab).sort(), ['c1', 'c2']);
  assert.deepStrictEqual(got.lab.c1, { p: 2, ok: 1, n: 1 }, '정상 기록은 그대로(다른 기기에서 이어 하기)');
  assert.deepStrictEqual(got.lab.c2, {}, '숫자·불리언이 아닌 p·ok·n, 모르는 칸은 버림');
  assert.strictEqual(got.real.r1.a, '답 ' + XSS, '적은 답은 글자로 남김(선생님 화면은 textContent)');
  assert.deepStrictEqual(got.quiz, { q1: { r: 1 } });
});
t('[B1] 반 통계(accClass)에는 모양이 다른 키가 나가지 않는다 — 이미 저장된 나쁜 키 포함', () => {
  const { E, ts } = classEnv();
  ts.forEach((t, i) => E.post({ action: 'accSync', t, unit: 'is1-1', s: { lab: { c1: { p: 1, ok: i % 2 } }, quiz: { q1: { r: 1 } }, g1I: 0, ep1: { c: [1, 0], done: false } }, w: {} }));
  /* 고치기 전에 저장된 것처럼 시트에 직접 나쁜 키를 넣는다 */
  const ls = E.g.learnSheet_(), v = ls.getDataRange().getValues();
  const r = v.findIndex((x) => String(x[1]) === '10301');
  const bad = { s: { lab: { [XSS]: { p: 1, ok: 1 }, c1: { p: 1, ok: 1 } }, real: { ['r1"><svg>']: { p: 0 } }, quiz: { [XSS]: { r: 1 } }, [XSS + 'I']: 1, [XSS]: { c: [1], done: true } }, w: {} };
  ls.getRange(r + 1, 5).setValue(JSON.stringify(bad));
  const res = E.post({ action: 'accClass', t: ts[1], unit: 'is1-1' });
  assert.strictEqual(res.ok, true); assert.ok(res.agg, '3명 이상이라 통계가 나옴');
  const js = JSON.stringify(res.agg);
  assert.ok(js.indexOf('<') < 0 && js.indexOf('svg') < 0, '나쁜 키가 통계에 없음');
  assert.deepStrictEqual(Object.keys(res.agg.labs), ['lab:c1']);
  assert.strictEqual(res.agg.labs['lab:c1'].n, 3);
  assert.deepStrictEqual(Object.keys(res.agg.quiz), ['q1']); assert.deepStrictEqual(Object.keys(res.agg.gates), ['g1']); assert.deepStrictEqual(Object.keys(res.agg.eps), ['ep1']);
});

console.log('\n' + passed + '개 통과, ' + failed + '개 실패');
process.exit(failed ? 1 : 0);
