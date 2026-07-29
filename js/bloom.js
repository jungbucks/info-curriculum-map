// bloom.js — 화면2 인지수준 태깅.
// 내용 요소 210개를 개별 태깅하지 않는다. 과정·기능 요소의 문장 끝 서술어를
// 정규식으로 추출 → 고유 서술어 목록(수십 개)에만 Bloom 1~6 부여.
// 복합 서술어("~하고 ~하기")는 분리해 수동 처리.

import { store, persist } from './store.js';
import { $, esc, elemsByCat, PRED_RE } from './util.js';

export const PREDICATE_RE = PRED_RE;

const BLOOM = [
  { n: 1, ko: '기억' }, { n: 2, ko: '이해' }, { n: 3, ko: '적용' },
  { n: 4, ko: '분석' }, { n: 5, ko: '평가' }, { n: 6, ko: '창안' },
];

// 과정·기능 요소에서 서술어 수집. 단일(끝 서술어 1개) vs 복합(2개+ 또는 규칙 밖).
export function collectPredicates() {
  const singleMap = new Map();   // pred -> { count, samples[] }
  const compound = [];           // { text, subject, area }
  for (const [subject, areas] of Object.entries(store.seed.areas || {})) {
    for (const a of areas) {
      for (const raw of elemsByCat(a, '과정')) {
        const t = String(raw).trim();
        const hits = t.match(/[가-힣]+(?:하기|보기)/g) || [];
        if (hits.length > 1) { compound.push({ text: t, subject, area: a.area }); continue; }
        const m = t.match(PRED_RE);
        if (m) {
          if (!singleMap.has(m[1])) singleMap.set(m[1], { count: 0, samples: [] });
          const e = singleMap.get(m[1]);
          e.count++;
          if (e.samples.length < 3) e.samples.push(t);
        } else {
          compound.push({ text: t, subject, area: a.area, note: '규칙 밖' });
        }
      }
    }
  }
  const singles = [...singleMap.entries()]
    .map(([pred, v]) => ({ pred, ...v }))
    .sort((a, b) => b.count - a.count || a.pred.localeCompare(b.pred));
  return { singles, compound };
}

// 내용요소 문장 → Bloom 값(0=미태깅). 복합은 수동 map, 단일은 서술어 매핑. grid/gaps가 사용.
export function elementBloom(text) {
  const t = String(text).trim();
  const comp = store.bloom.compound || {};
  if (comp[t] != null) return comp[t];
  const m = t.match(PRED_RE);
  const p = store.bloom.predicates || {};
  return (m && p[m[1]] != null) ? p[m[1]] : 0;
}

let _singles = [], _compound = [];

export function renderTagging() {
  const data = collectPredicates();
  _singles = data.singles; _compound = data.compound;
  const pred = store.bloom.predicates || (store.bloom.predicates = {});
  const ctag = store.bloom.compound || (store.bloom.compound = {});

  const legend = BLOOM.map(b => `<span class="bl-chip bl${b.n}">${b.n} ${b.ko}</span>`).join('');

  $('#tag-list').innerHTML = `
    <div class="tag-hd">
      <h2>과정·기능 서술어 인지수준 태깅</h2>
      <p class="muted">내용 요소 210개를 개별 태깅하지 않고, 문장 끝 서술어(<code>~하기 / ~보기</code>)만 추출해 부여합니다. 같은 Bloom을 다시 누르면 해제.</p>
      <div class="bloom-legend">${legend}</div>
      <div class="tag-prog">단일 서술어 <b id="tag-prog-single">0/${_singles.length}</b> 태깅됨</div>
    </div>
    <table class="tag-tbl">
      <thead><tr><th>서술어</th><th>빈도</th><th>Bloom (1~6)</th><th>예시 내용요소</th></tr></thead>
      <tbody>${_singles.map(s => `
        <tr><td><b>${esc(s.pred)}</b></td><td class="num">${s.count}</td>
          <td>${bloomPick(s.pred, pred[s.pred])}</td>
          <td class="muted small">${s.samples.map(esc).join(' · ')}</td></tr>`).join('')}
      </tbody>
    </table>`;

  $('#tag-compound').innerHTML = `
    <div class="tag-hd">
      <h2>복합 서술어 — 수동 처리 <span class="muted">(<b id="tag-prog-comp">0/${_compound.length}</b>)</span></h2>
      <p class="muted">서술어가 둘 이상(예: “…시각화하고 분석하기”)이라 규칙으로 자를 수 없습니다. 항목별로 직접 부여하세요.</p>
    </div>
    <table class="tag-tbl">
      <thead><tr><th>내용요소(복합)</th><th>출처</th><th>Bloom (1~6)</th></tr></thead>
      <tbody>${_compound.map(c => `
        <tr><td>${esc(c.text)}</td><td class="muted small">${esc(c.subject)}</td>
          <td>${bloomPick(c.text, ctag[c.text])}</td></tr>`).join('')}
      </tbody>
    </table>`;

  $('#tag-list').onclick = tagClick('single');
  $('#tag-compound').onclick = tagClick('compound');
  updateProgress();
}

function bloomPick(key, cur) {
  return `<span class="bloom-pick" data-key="${esc(key)}">` +
    BLOOM.map(b => `<button type="button" class="bl-btn${cur === b.n ? ' on' : ''}" data-lv="${b.n}" title="${b.ko}">${b.n}</button>`).join('') +
    `</span>`;
}

function tagClick(kind) {
  return e => {
    const btn = e.target.closest('.bl-btn'); if (!btn) return;
    const pick = btn.closest('.bloom-pick');
    const key = pick.dataset.key, lv = +btn.dataset.lv;
    const target = kind === 'single' ? store.bloom.predicates : store.bloom.compound;
    if (target[key] === lv) delete target[key]; else target[key] = lv;   // 재클릭 = 해제
    persist();
    pick.querySelectorAll('.bl-btn').forEach(b => b.classList.toggle('on', target[key] === +b.dataset.lv));
    updateProgress();
  };
}

function updateProgress() {
  const p = store.bloom.predicates || {}, c = store.bloom.compound || {};
  const s1 = $('#tag-prog-single');
  if (s1) s1.textContent = `${_singles.filter(s => p[s.pred] != null).length}/${_singles.length}`;
  const s2 = $('#tag-prog-comp');
  if (s2) s2.textContent = `${_compound.filter(x => c[x.text] != null).length}/${_compound.length}`;
}
