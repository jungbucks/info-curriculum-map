// main.js — 진입점. 데이터 로드 → 탭 라우팅 → 화면 부팅.
// <script type="module">로만 로드. 외부 라이브러리 없음.

import { loadAll, store, exportFile, importFile } from './store.js';
import { renderGrid } from './grid.js';
import { renderContrast } from './contrast.js';
import { renderGaps } from './gaps.js';
import { renderSpiral } from './spiral.js';
import { $, setStatus } from './util.js';

const SCREENS = {
  grid:     { el: '#screen-grid',     render: renderGrid },
  contrast: { el: '#screen-contrast', render: renderContrast },
  gaps:     { el: '#screen-gaps',     render: renderGaps },
  spiral:   { el: '#screen-spiral',   render: renderSpiral },
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

function bindFooter() {
  const acts = { 'export-edges': 'edges', 'export-gaps': 'gaps' };
  document.querySelectorAll('[data-act]').forEach(b =>
    b.addEventListener('click', () => {
      if (acts[b.dataset.act]) exportFile(acts[b.dataset.act]);
      else if (b.dataset.act === 'reset') { localStorage.removeItem('infomap_v1'); location.reload(); }
    }));
  const imp = $('#import-file');
  if (imp) imp.addEventListener('change', async () => {
    if (!imp.files[0]) return;
    const ok = await importFile(imp.files[0]);
    setStatus(ok ? `불러옴: ${imp.files[0].name}` : '알 수 없는 JSON 형식', !ok);
    imp.value = '';
    if (ok) route();
  });
}

function route() {
  const key = location.hash.replace(/^#/, '').split(/[=&/]/)[0];
  const name = ['contrast', 'gaps', 'spiral'].includes(key) ? key : 'grid';  // #cell·#node → grid
  showScreen(name);
}

async function boot() {
  try {
    await loadAll();                 // seed/lanes/edges/gaps 로드 + localStorage 병합
    setStatus(`로드 완료 · 성취기준 ${store.seed.standards.length}개`);
    bindTabs();
    bindFooter();
    route();
  } catch (e) {
    setStatus('데이터 로드 실패: ' + e.message, true);
    console.error(e);
  }
}

boot();
