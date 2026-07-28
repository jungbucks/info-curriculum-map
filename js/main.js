// main.js — 진입점. 데이터 로드 → 탭 라우팅 → 화면 부팅.
// <script type="module">로만 로드. 외부 라이브러리 없음.

import { loadAll, store } from './store.js';
import { renderGrid } from './grid.js';
import { renderTagging } from './bloom.js';
import { renderGaps } from './gaps.js';
import { $, setStatus } from './util.js';

const SCREENS = {
  grid: { el: '#screen-grid', render: renderGrid },
  tag:  { el: '#screen-tag',  render: renderTagging },
  gaps: { el: '#screen-gaps', render: renderGaps },
};

function showScreen(name) {
  if (!SCREENS[name]) name = 'grid';
  for (const [key, s] of Object.entries(SCREENS)) {
    $(s.el).hidden = key !== name;
  }
  document.querySelectorAll('.tab').forEach(t =>
    t.setAttribute('aria-selected', t.dataset.screen === name));
  SCREENS[name].render();
  // URL 해시 상태 유지 (#screen=grid, #node=..., #cell=... 은 각 화면이 확장)
  if (!location.hash.startsWith('#' + name)) history.replaceState(null, '', '#' + name);
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => showScreen(tab.dataset.screen)));
  window.addEventListener('hashchange', route);
}

function route() {
  const name = (location.hash.replace(/^#/, '').split('=')[0]) || 'grid';
  showScreen(name in SCREENS ? name : 'grid');
}

async function boot() {
  try {
    await loadAll();                 // seed/bloom/edges/gaps 로드 + localStorage 병합
    setStatus(`로드 완료 · 성취기준 ${store.seed.standards.length}개`);
    bindTabs();
    route();
  } catch (e) {
    setStatus('데이터 로드 실패: ' + e.message, true);
    console.error(e);
  }
}

boot();
