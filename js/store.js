// store.js — 데이터 로드 + 상태 + 영속화(localStorage) + JSON export/import.
// 원칙: seed.json은 읽기 전용. 파생물(bloom/edges/gaps)만 수정·저장.

import { downloadJson } from './util.js';

const LS_KEY = 'infomap_v1';

export const store = {
  seed:  { levels: {}, areas: {}, standards: [] },  // 읽기 전용
  bloom: { predicates: {}, compound: [] },
  edges: { edges: [] },
  gaps:  { threshold: { naming_overlap: 0.2 }, gaps: [] },
};

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

// seed는 항상 파일에서. 파생물은 localStorage 우선, 없으면 파일 기본값.
export async function loadAll() {
  store.seed = await fetchJson('data/seed.json');
  const [bloom, edges, gaps] = await Promise.all([
    fetchJson('data/bloom.json'), fetchJson('data/edges.json'), fetchJson('data/gaps.json'),
  ]);
  store.bloom = bloom; store.edges = edges; store.gaps = gaps;

  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    try {
      const o = JSON.parse(saved);
      if (o.bloom) store.bloom = o.bloom;
      if (o.edges) store.edges = o.edges;
      if (o.gaps)  store.gaps = o.gaps;
    } catch { /* 손상 저장 무시 */ }
  }
}

export function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    bloom: store.bloom, edges: store.edges, gaps: store.gaps,
  }));
}

export function exportFile(kind) {
  const map = { bloom: store.bloom, edges: store.edges, gaps: store.gaps };
  if (!map[kind]) return;
  downloadJson(`${kind}.json`, map[kind]);
}

// TODO: import — 파일 종류 판별 후 해당 파생물만 교체(seed 덮어쓰기 금지) → persist().
export function importFile(/* file */) {}
