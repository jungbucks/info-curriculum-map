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
  // 해시가 비었을 때만 기본값 세팅(#cell=…/#node=… 등 세부 상태는 각 화면이 관리).
  if (!location.hash) history.replaceState(null, '', '#' + name);
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab =>
    tab.addEventListener('click', () => showScreen(tab.dataset.screen)));
  window.addEventListener('hashchange', route);
}

function route() {
  const key = location.hash.replace(/^#/, '').split(/[=&/]/)[0];
  const name = (key === 'tag' || key === 'gaps') ? key : 'grid';  // #cell·#node → grid
  showScreen(name);
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
