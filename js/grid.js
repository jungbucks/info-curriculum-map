// grid.js — 화면1 격자 맵.
// 행 = 레인(활성 트랙), 열 = 학교급 1~4단계. CSS Grid가 위치 결정(좌표 계산 금지).
// 셀 = DOM 요소. 셀에 성취기준 개수 + (태깅되면) 인지수준 색 농도.
// 클릭 시 상세 패널: 핵심 아이디어 / 내용 요소 3범주 / 성취기준.

import { store, activeTrack, areaKey, persist } from './store.js';
import { $, esc, elemsByCat, catKey } from './util.js';
import { elementBloom } from './bloom.js';
import { drawEdges } from './edges-svg.js';

// 레인별 색상(색은 레인이 씀 — 간선은 선 모양으로 구분). separated 최대 8레인.
const LANE_HUES = [210, 152, 42, 275, 350, 22, 190, 110];

const LEVEL_LABEL = { 1: '초등 실과', 2: '중학교 정보', 3: '고등 정보', 4: '진로·융합선택' };

// 단계(열) 목록: seed.levels의 distinct level.
function levelColumns() {
  const levels = [...new Set(Object.values(store.seed.levels))].sort((a, b) => a - b);
  return levels.map(lv => ({ level: lv, label: LEVEL_LABEL[lv] || ('L' + lv) }));
}

// (레인, 단계) → { areas, standards }
function cellData(lane, level) {
  const { assign } = activeTrack();
  const areas = [];
  for (const [subj, arr] of Object.entries(store.seed.areas)) {
    if (store.seed.levels[subj] !== level) continue;
    for (const a of arr) {
      const v = assign[areaKey(subj, a.area_no)];
      const ls = Array.isArray(v) ? v : (v ? [v] : []);
      if (ls.includes(lane)) areas.push({ subject: subj, ...a });
    }
  }
  const standards = [];
  for (const a of areas)
    for (const s of store.seed.standards)
      if (s.subject === a.subject && s.area_no === a.area_no) standards.push(s);
  return { areas, standards };
}

// 셀 Bloom 최대값(과정·기능 요소 기준). 미태깅이면 0.
function cellBloomMax(cell) {
  let max = 0;
  for (const a of cell.areas)
    for (const t of elemsByCat(a, '과정')) max = Math.max(max, elementBloom(t));
  return max;
}

// ── 트랙 전환 컨트롤 ──
function renderControls() {
  const box = $('#grid-controls');
  const tracks = store.lanes.tracks || {};
  box.innerHTML = '<span class="gc-label">레인 모델</span>' +
    Object.entries(tracks).map(([id, t]) =>
      `<button class="gc-track${store.lanes.active === id ? ' on' : ''}" data-track="${esc(id)}" title="${esc(t.label || id)}">${esc(id)}</button>`
    ).join('') +
    `<span class="gc-hint">${esc((tracks[store.lanes.active] || {}).label || '')}</span>`;
  box.querySelectorAll('.gc-track').forEach(b => b.onclick = () => {
    store.lanes.active = b.dataset.track; persist(); renderGrid();
  });
}

// ── 격자 렌더 ──
export function renderGrid() {
  if (!store.seed.standards || !store.lanes.tracks) return;
  renderControls();
  const { lanes } = activeTrack();
  const cols = levelColumns();
  const map = $('#grid-map');
  map.style.gridTemplateColumns = `150px repeat(${cols.length}, minmax(90px, 1fr))`;

  let html = `<div class="gm-corner">레인 \\ 단계</div>`;
  for (const c of cols) html += `<div class="gm-colhd">${esc(c.label)}<small>${c.level}단계</small></div>`;

  lanes.forEach((lane, li) => {
    const hue = LANE_HUES[li % LANE_HUES.length];
    html += `<div class="gm-lanehd" style="--hue:${hue}">${esc(lane)}</div>`;
    for (const c of cols) {
      const cell = cellData(lane, c.level);
      const n = cell.standards.length;
      const bmax = cellBloomMax(cell);
      if (!n) { html += `<div class="gm-cell empty" aria-hidden="true"></div>`; continue; }
      html += `<div class="gm-cell" style="--hue:${hue};--dens:${bmax / 6}"
        data-lane="${esc(lane)}" data-level="${c.level}" role="button" tabindex="0"
        aria-label="${esc(lane)} ${c.level}단계 · 성취기준 ${n}개">
        <span class="gm-count">${n}</span>
        <span class="gm-meta">${cell.areas.length}영역${bmax ? ` · B${bmax}` : ''}</span>
      </div>`;
    }
  });
  map.innerHTML = html;

  map.onclick = e => { const c = e.target.closest('.gm-cell:not(.empty)'); if (c) openDetail(c.dataset.lane, +c.dataset.level); };
  map.onkeydown = e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest('.gm-cell:not(.empty)');
    if (c) { e.preventDefault(); openDetail(c.dataset.lane, +c.dataset.level); }
  };

  drawEdges();

  const m = location.hash.match(/^#cell=([^/]+)\/(\d+)/);
  if (m) openDetail(decodeURIComponent(m[1]), +m[2]);
}

// ── 상세 패널 ──
function openDetail(lane, level) {
  const cell = cellData(lane, level);
  const p = $('#detail-panel');
  const colLabel = (levelColumns().find(c => c.level === level) || {}).label || ('L' + level);

  let h = `<div class="dp-hd"><span><strong>${esc(lane)}</strong> · ${esc(colLabel)}
      <em>성취기준 ${cell.standards.length} · 영역 ${cell.areas.length}</em></span>
    <button class="dp-close" aria-label="닫기">✕</button></div>`;

  for (const a of cell.areas) {
    const stds = store.seed.standards.filter(s => s.subject === a.subject && s.area_no === a.area_no);
    h += `<section class="dp-area">
      <h3>${esc(a.subject)} <span>· ${esc(a.area)}</span></h3>
      <div class="dp-sub">핵심 아이디어</div>
      <ul>${(a.core_ideas || []).map(c => `<li>${esc(c)}</li>`).join('')}</ul>
      <div class="dp-sub">내용 요소</div>
      <div class="dp-cats">${['지식', '과정', '가치'].map(pfx =>
        `<div class="dp-cat"><b>${esc(catKey(a, pfx))}</b><ul>${elemsByCat(a, pfx).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`
      ).join('')}</div>
      <div class="dp-sub">성취기준 ${stds.length}</div>
      <ul class="dp-stds">${stds.map(s => `<li><code>${esc(s.id)}</code> ${esc(s.text)}</li>`).join('')}</ul>
    </section>`;
  }

  p.innerHTML = h;
  p.hidden = false;
  p.querySelector('.dp-close').onclick = () => {
    p.hidden = true;
    history.replaceState(null, '', '#grid');
  };
  history.replaceState(null, '', `#cell=${encodeURIComponent(lane)}/${level}`);
}
