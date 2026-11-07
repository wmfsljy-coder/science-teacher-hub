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
t('열쇠를 마구 넣어 보면(10분에 30번) 맞는 열쇠도 잠시 막힌다', () => {
  const E = setup();
  assert.strictEqual(E.post({ action: 'teacher', key: E.tk }).ok, true);
  for (let i = 0; i < 30; i++) E.post({ action: 'teacher', key: 'sth-guess' + i });
  assert.strictEqual(E.post({ action: 'teacher', key: E.tk }).ok, false);
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
t('숨김 칸에 글자가 있으면 목록에서 빠진다', () => {
  const E = setup();
  E.post({ action: 'post', cls: '1-3', nick: '고래', unit: 'is1-3', results: {} });
  E.post({ action: 'post', cls: '1-3', nick: '상어', unit: 'is1-3', results: {} });
  E.g.sheet_().getRange(2, 8).setValue('숨김');
  E.g.__cache.removeAll(['L|1-3|is1-3']);
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

console.log('\n' + passed + '개 통과, ' + failed + '개 실패');
process.exit(failed ? 1 : 0);
