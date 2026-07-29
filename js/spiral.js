// spiral.js — 화면4 나선형 분석.
// 나선형 = 반복(continuity) + 심화(sequence). 레인별로 두 축을 측정해 판정 + 근거 기록.
//   반복  : 인접 present 단계 내용요소 용어 중복률(겹침계수) 평균. 높을수록 개념이 재출현.
//   심화  : 단계별 depth 최대값(과정·기능 서술어 → depth.json 자동 사전). 순증가면 심화.
//   판정  : 재출현<2단계=단발 / 반복<임계=단절 / 심화(마지막>처음)=🌀나선형 / 그 외=🔁반복(제자리)

import { store, activeTrack } from './store.js';
import { $, esc, elemsByCat, terms, PRED_RE } from './util.js';
import { cellData } from './grid.js';

const LEVEL_LABEL = { 1: '초등', 2: '중', 3: '고', 4: '진로' };
const CLASS = {
  spiral:  { badge: '🌀 나선형', cls: 'sp-spiral' },
  repeat:  { badge: '🔁 반복(제자리)', cls: 'sp-repeat' },
  once:    { badge: '↗ 단발', cls: 'sp-once' },
  broken:  { badge: '— 단절', cls: 'sp-broken' },
};

let _recur = 0.15;   // 반복 인정 임계값

const levelsAll = () => [...new Set(Object.values(store.seed.levels))].sort((a, b) => a - b);
const presentLevels = (lane, lvs) => lvs.filter(lv => cellData(lane, lv).standards.length > 0);

function cellTerms(lane, level) {
  const { areas } = cellData(lane, level);
  const set = new Set();
  for (const a of areas) for (const cat of ['지식', '과정', '가치']) for (const el of elemsByCat(a, cat)) terms(el).forEach(t => set.add(t));
  return set;
}
// 단계 depth = 과정·기능 요소 끝 서술어의 depth 최대값(0 = 미상).
function cellDepth(lane, level) {
  const dict = store.depth.predicates || {};
  const { areas } = cellData(lane, level);
  let max = 0;
  for (const a of areas) for (const el of elemsByCat(a, '과정')) {
    const m = String(el).match(PRED_RE);
    if (m && dict[m[1]] != null) max = Math.max(max, dict[m[1]]);
  }
  return max;
}

function analyzeLane(lane, lvs) {
  const present = presentLevels(lane, lvs);
  const traj = present.map(lv => ({ lv, d: cellDepth(lane, lv) }));

  // 반복: 인접 present 쌍 겹침계수 평균
  const overlaps = [];
  for (let i = 0; i < present.length - 1; i++) {
    const A = cellTerms(lane, present[i]), B = cellTerms(lane, present[i + 1]);
    const inter = [...A].filter(x => B.has(x)).length;
    overlaps.push(inter / (Math.min(A.size, B.size) || 1));
  }
  const recur = overlaps.length ? +(overlaps.reduce((a, b) => a + b, 0) / overlaps.length).toFixed(2) : 0;

  // 심화: depth(0 제외) 처음 대비 마지막
  const dz = traj.map(t => t.d).filter(d => d > 0);
  const deepFirst = dz[0] ?? 0, deepLast = dz[dz.length - 1] ?? 0;
  const rising = dz.length >= 2 && deepLast > deepFirst;

  let cls;
  if (present.length < 2) cls = 'once';
  else if (recur < _recur) cls = 'broken';
  else if (rising) cls = 'spiral';
  else cls = 'repeat';

  const trajStr = traj.map(t => `${LEVEL_LABEL[t.lv]}${t.d || '?'}`).join(' → ') +
    (dz.length >= 2 ? (deepLast > deepFirst ? ' ↗' : deepLast < deepFirst ? ' ↘' : ' →') : '');
  const evidence = `재출현 ${present.length}단계 · 반복 ${recur} · 심화 ${trajStr}`;

  return { lane, present, recur, traj, cls, evidence };
}

export function renderSpiral() {
  const { lanes } = activeTrack();
  const lvs = levelsAll();
  const rows = lanes.map(l => analyzeLane(l, lvs));
  const cnt = c => rows.filter(r => r.cls === c).length;

  $('#spiral-controls').innerHTML = `
    <div class="sp-bar">
      <span class="gap-track">활성 레인 모델: <b>${esc(store.lanes.active)}</b></span>
      <label class="gap-th">반복 인정 임계값 <b id="sp-recur-val">${_recur}</b>
        <input type="range" id="sp-recur" min="0" max="1" step="0.05" value="${_recur}"></label>
    </div>
    <div class="gap-sum">
      <span class="gap-pill sp-spiral">🌀 나선형 ${cnt('spiral')}</span>
      <span class="gap-pill sp-repeat">🔁 반복 ${cnt('repeat')}</span>
      <span class="gap-pill sp-once">↗ 단발 ${cnt('once')}</span>
      <span class="gap-pill sp-broken">— 단절 ${cnt('broken')}</span>
    </div>
    <p class="muted small">나선형 = 반복(개념 재출현) + 심화(단계별 depth 순증가). 심화 depth는 과정·기능 서술어를
      <code>data/depth.json</code> 사전으로 자동 산출(수동 태깅 없음). 임계값·사전은 조정 가능.</p>`;

  $('#spiral-view').innerHTML = `
    <table class="sp-tbl">
      <thead><tr><th>레인</th><th>판정</th><th>재출현</th><th>반복도</th><th>심화 궤적 (depth)</th></tr></thead>
      <tbody>${rows.map(r => `<tr class="${CLASS[r.cls].cls}">
        <td><b>${esc(r.lane)}</b></td>
        <td><span class="sp-tag ${CLASS[r.cls].cls}">${CLASS[r.cls].badge}</span></td>
        <td class="num">${r.present.length}단계</td>
        <td class="num">${r.recur}</td>
        <td>${esc(r.traj.map(t => `${LEVEL_LABEL[t.lv]}:${t.d || '?'}`).join('  →  '))}${trend(r)}</td>
      </tr>`).join('')}</tbody>
    </table>
    <p class="muted small">궤적의 숫자 = 그 단계 과정·기능 서술어의 최고 depth(1 기억 ~ 6 창안). '?'=사전에 없는 서술어.
      격자 화면에서 트랙을 바꾸면 나선 판정도 달라집니다.</p>`;

  $('#sp-recur').oninput = e => { _recur = +e.target.value; $('#sp-recur-val').textContent = e.target.value; renderSpiral(); };
}

function trend(r) {
  const dz = r.traj.map(t => t.d).filter(d => d > 0);
  if (dz.length < 2) return '';
  const a = dz[0], b = dz[dz.length - 1];
  return b > a ? '  <b class="sp-up">↗ 심화</b>' : b < a ? '  <b class="sp-down">↘ 하강</b>' : '  <span class="muted">→ 제자리</span>';
}
