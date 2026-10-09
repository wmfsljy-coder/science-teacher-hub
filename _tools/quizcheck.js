/* 수준별 문제 검사기 — 단원 페이지에서:
     eval(await (await fetch('/_tools/quizcheck.js',{cache:'reload'})).text())
   1) 문제 자료 점검: id 중복, 단계(1~3), 학습 목표 코드가 페이지에 있는지, 소단원 번호, 정답 범위, 짝·순서 중복
   2) 채점 점검: 문제마다 일부러 틀린 답 → '틀림', 바른 답 → '맞음' 으로 채점되는지
   3) 단계·형식·목표별 문제 수를 센다 */
(async function () {
  var errs = [], bad = [];
  window.addEventListener("error", function (e) { errs.push(e.message + " @" + e.lineno); });
  try { localStorage.clear(); } catch (e) {}
  var tab = Array.prototype.slice.call(document.querySelectorAll(".tab-btn")).filter(function (b) { return /수준별/.test(b.textContent); })[0];
  if (!tab) return JSON.stringify({ fatal: "수준별 문제 탭 없음" });
  tab.click();
  await new Promise(function (r) { setTimeout(r, 150); });
  var cards = Array.prototype.slice.call(document.querySelectorAll(".qz-card:not(.qz-mini)"));
  if (!cards.length) return JSON.stringify({ fatal: "문제가 없음", errs: errs });

  /* 페이지의 목표·소단원 */
  var STD = {}, SEC = {};
  Array.prototype.forEach.call(document.querySelectorAll(".std-note"), function (d) {
    var re = /\[([^\]]+)\]<\/b>/g, m; while ((m = re.exec(d.innerHTML))) STD[m[1]] = 1;
  });
  Array.prototype.forEach.call(document.querySelectorAll(".tab-btn .num"), function (n) { SEC[n.textContent.trim()] = 1; });

  var ids = {}, count = { lv: {}, t: {}, std: {} };
  cards.forEach(function (c) {
    var it = c._item, p = it.id + ": ";
    if (ids[it.id]) bad.push(p + "id 중복"); ids[it.id] = 1;
    if ([1, 2, 3].indexOf(it.lv) < 0) bad.push(p + "단계 없음");
    if (!it.std || !STD[it.std]) bad.push(p + "학습 목표 코드가 페이지에 없음 (" + it.std + ")");
    if (!it.sec || !SEC[it.sec]) bad.push(p + "소단원 번호 없음 (" + it.sec + ")");
    if (!it.q) bad.push(p + "문제 글 없음");
    if (!it.why && it.t !== "essay") bad.push(p + "해설 없음");
    if (it.t === "mc" && !(it.a >= 0 && it.a < it.options.length)) bad.push(p + "정답 번호 범위 밖");
    if (it.t === "bogi" && (!it.a.length || it.a.some(function (i) { return i >= it.items.length; }))) bad.push(p + "보기 정답 이상");
    if (it.t === "blank" && !(it.a && it.a.length && it.a.every(function (x) { return x && x.length; }))) bad.push(p + "빈칸 정답 없음");
    if (it.t === "num" && typeof it.a !== "number") bad.push(p + "계산 정답이 숫자가 아님");
    if (it.t === "match") { var r = {}; it.pairs.forEach(function (q) { if (r[q[1]]) bad.push(p + "짝 오른쪽 중복: " + q[1]); r[q[1]] = 1; }); }
    if (it.t === "order") { var o = {}; it.items.forEach(function (q) { if (o[q]) bad.push(p + "순서 항목 중복"); o[q] = 1; }); }
    if (it.t === "essay" && !(it.model && it.rubric && it.rubric.length >= 2)) bad.push(p + "모범 답안·채점 기준 부족");
    count.lv[it.lv] = (count.lv[it.lv] || 0) + 1;
    count.t[it.t] = (count.t[it.t] || 0) + 1;
    count.std[it.std] = (count.std[it.std] || 0) + 1;
  });

  /* 채점 점검 — 모든 카드를 보이게 한 뒤 */
  cards.forEach(function (c) { c.hidden = false; });
  function checkBtn(c) { return Array.prototype.slice.call(c.querySelectorAll(".qz-row .btn.primary")).filter(function (b) { return b.textContent === "확인"; })[0]; }
  cards.forEach(function (c) {
    var it = c._item, p = it.id + ": ";
    try {
      if (it.t === "essay") { c._auto(true); if (!c.classList.contains("ok")) bad.push(p + "서술형 자기 평가 저장 실패"); return; }
      if (it.t !== "ox") {
        c._auto(false); if (checkBtn(c)) checkBtn(c).click();
        if (c.classList.contains("ok")) bad.push(p + "틀린 답을 맞다고 채점");
      }
      c._auto(true); if (checkBtn(c)) checkBtn(c).click();
      if (!c.classList.contains("ok")) bad.push(p + "바른 답을 틀리다고 채점 → " + (c.querySelector(".qz-verdict") || {}).textContent);
    } catch (e) { bad.push(p + "오류 " + e.message); }
  });
  var res = window.sthState("rQuiz");
  try { localStorage.clear(); } catch (e) {}
  return JSON.stringify({ 문제수: cards.length, 단계: count.lv, 형식: count.t, 목표: count.std, 결과줄: res, 문제점: bad, errors: errs }, null, 1);
})();
