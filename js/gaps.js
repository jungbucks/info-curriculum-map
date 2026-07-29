// gaps.js — 화면3 결손 리포트.
// 각 레인을 학교급 순으로 훑어 판정 + 판정 근거 문자열을 반드시 기록.
//   by_design       : 레인에 그 학교급 편제 없음 (기본 필터 제외 = 노이즈)
//   naming_mismatch : 인접 present 단계 내용요소 용어 중복률 < 임계값
// 임계값(naming_overlap) UI 조정 → 즉시 재계산. by_design 기본 제외. gaps.json export.
// (stagnant는 사용자 결정으로 제거 — 인지수준 축을 안 씀.)

import { store, activeTrack, persist } from './store.js';
import { $, esc, elemsByCat, terms } from './util.js';
import { cellData } from './grid.js';

const LEVEL_LABEL = { 1: '초등 실과', 2: '중학교 정보', 3: '고등 정보', 4: '진로·융합선택' };
const TYPE_LABEL = { by_design: '편제 없음', naming_mismatch: '용어 불일치' };

function cellTerms(lane, level) {
  const { areas } = cellData(lane, level);
  const set = new Set();
  for (const a of areas) for (const cat of ['지식', '과정', '가치']) for (const el of elemsByCat(a, cat)) terms(el).forEach(t => set.add(t));
  return set;
}
const levelsAll = () => [...new Set(Object.values(store.seed.levels))].sort((a, b) => a - b);
const presentLevels = (lane, lvs) => lvs.filter(lv => cellData(lane, lv).standards.length > 0);

export function computeGaps(threshold) {
  if (threshold == null) threshold = (store.gaps.threshold || {}).naming_overlap ?? 0.2;
  const { lanes } = activeTrack();
  const lvs = levelsAll();
  const gaps = [];
  for (const lane of lanes) {
    const present = presentLevels(lane, lvs);
    if (!present.length) continue;

    for (const lv of lvs) if (!present.includes(lv)) gaps.push({
      lane, from_level: lv, to_level: lv, gap_type: 'by_design',
      evidence: `${lane} · ${lv}단계(${LEVEL_LABEL[lv]}): 영역 편제 없음`,
      params: { threshold },
    });

    for (let i = 0; i < present.length - 1; i++) {
      const f = present[i], t = present[i + 1];
      const A = cellTerms(lane, f), B = cellTerms(lane, t);
      const inter = [...A].filter(x => B.has(x));
      const denom = Math.min(A.size, B.size) || 1;
      const ratio = +(inter.length / denom).toFixed(3);
      if (ratio < threshold) gaps.push({
        lane, from_level: f, to_level: t, gap_type: 'naming_mismatch',
        evidence: `${lane} · ${f}→${t}단계: 용어 중복률 ${ratio} < ${threshold} (공통 ${inter.length}/${denom})` +
          (inter.length ? `; 공통어 [${inter.slice(0, 8).join(', ')}]` : '; 공통어 없음'),
        params: { threshold, common: inter },
      });
    }
  }
  return gaps;
}

export function recompute() {
  const th = (store.gaps.threshold || {}).naming_overlap ?? 0.2;
  store.gaps.gaps = computeGaps(th);
  store.gaps.generated_at = new Date().toISOString();
  persist();
  return store.gaps.gaps;
}

let _showByDesign = false;

export function renderGaps() {
  const th = (store.gaps.threshold || (store.gaps.threshold = {})).naming_overlap ?? 0.2;
  const gaps = recompute();
  const cnt = k => gaps.filter(g => g.gap_type === k).length;
  const trackLabel = (store.lanes.tracks[store.lanes.active] || {}).label || store.lanes.active;

  $('#gaps-controls').innerHTML = `
    <div class="gap-bar">
      <span class="gap-track">활성 레인 모델: <b>${esc(store.lanes.active)}</b> <span class="muted small">${esc(trackLabel)}</span></span>
      <label class="gap-th">naming 임계값 <b id="gap-th-val">${th}</b>
        <input type="range" id="gap-th" min="0" max="1" step="0.05" value="${th}"></label>
      <label class="gap-bd"><input type="checkbox" id="gap-bd"${_showByDesign ? ' checked' : ''}> by_design 포함</label>
    </div>
    <div class="gap-sum">
      <span class="gap-pill t-by_design">편제 없음 ${cnt('by_design')}</span>
      <span class="gap-pill t-naming_mismatch">용어 불일치 ${cnt('naming_mismatch')}</span>
    </div>`;

  const rows = gaps.filter(g => _showByDesign || g.gap_type !== 'by_design');
  $('#gaps-report').innerHTML = `
    <table>
      <thead><tr><th>레인</th><th>구간</th><th>유형</th><th>판정 근거</th></tr></thead>
      <tbody>${rows.map(g => `<tr class="t-${g.gap_type}">
        <td>${esc(g.lane)}</td>
        <td class="num">${g.from_level === g.to_level ? g.from_level + '단계' : g.from_level + '→' + g.to_level}</td>
        <td><span class="gap-tag t-${g.gap_type}">${TYPE_LABEL[g.gap_type]}</span></td>
        <td>${esc(g.evidence)}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">해당 결손 없음</td></tr>`}
      </tbody>
    </table>
    <p class="muted small">gaps.json으로 내보내면 이 판정(근거 포함)이 논문 방법론 절의 원자료가 됩니다. 활성 레인 모델을 격자 화면에서 바꾸면 결손도 달라집니다.</p>`;

  $('#gap-th').oninput = e => {
    store.gaps.threshold.naming_overlap = +e.target.value;
    $('#gap-th-val').textContent = e.target.value;
    renderGaps();
  };
  $('#gap-bd').onchange = e => { _showByDesign = e.target.checked; renderGaps(); };
}
