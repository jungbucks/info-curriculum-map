// contrast.js — 화면2 계열 대조표.
// 레인 하나를 골라, 행=내용요소 3범주 · 열=학교급 1~4단계로 깔아
// "지식이 초등→진로로 어떻게 확장되는가"를 왼→오로 대조한다.
// 직전 단계까지 없던 용어를 가진 요소는 '새 요소'로 강조.

import { store, activeTrack } from './store.js';
import { $, esc, elemsByCat, terms } from './util.js';
import { cellData } from './grid.js';

const CATS = [
  { key: '지식', label: '지식·이해' },
  { key: '과정', label: '과정·기능' },
  { key: '가치', label: '가치·태도' },
];
const LEVEL_LABEL = { 1: '초등 실과', 2: '중학교 정보', 3: '고등 정보', 4: '진로·융합선택' };

let _lane = null;

const levels = () => [...new Set(Object.values(store.seed.levels))].sort((a, b) => a - b);

export function renderContrast() {
  const { lanes } = activeTrack();
  if (!lanes.length) return;
  if (!_lane || !lanes.includes(_lane)) _lane = lanes[0];
  const lvs = levels();

  $('#contrast-controls').innerHTML = `
    <div class="ct-bar">
      <span class="muted">레인</span>
      ${lanes.map(l => `<button class="ct-lane${l === _lane ? ' on' : ''}" data-lane="${esc(l)}">${esc(l)}</button>`).join('')}
    </div>
    <p class="ct-help muted small">한 행(범주)을 왼→오로 읽으면 초등→진로로 어떻게 확장되는지 대조됩니다.
      <span class="ct-new-key">초록 밑줄</span> = 직전 단계까지 없던 용어를 담은 새 요소.</p>`;
  $('#contrast-controls').querySelectorAll('.ct-lane').forEach(b =>
    b.onclick = () => { _lane = b.dataset.lane; renderContrast(); });

  const head = `<tr><th class="ct-corner">범주 \\ 단계</th>${lvs.map(lv =>
    `<th>${esc(LEVEL_LABEL[lv] || ('L' + lv))}<small>${lv}단계</small></th>`).join('')}</tr>`;

  let body = '';
  for (const cat of CATS) {
    const prevTerms = new Set();   // 직전 단계까지 누적된 용어
    let cells = '';
    for (const lv of lvs) {
      const { areas } = cellData(_lane, lv);
      const els = [];
      for (const a of areas) for (const el of elemsByCat(a, cat.key)) els.push(el);

      const lis = els.map(el => {
        const tks = terms(el);
        const isNew = prevTerms.size > 0 && tks.length > 0 && !tks.some(t => prevTerms.has(t));
        return `<li class="${isNew ? 'ct-new' : ''}">${esc(el)}</li>`;
      }).join('');
      cells += `<td>${els.length ? `<ul>${lis}</ul>` : '<span class="muted">—</span>'}</td>`;

      for (const el of els) terms(el).forEach(t => prevTerms.add(t));
    }
    body += `<tr><th class="ct-cat">${cat.label}</th>${cells}</tr>`;
  }

  $('#contrast-view').innerHTML = `<table class="ct-tbl"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
