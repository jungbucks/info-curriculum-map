// store.js — 데이터 로드 + 상태 + 영속화(localStorage) + JSON export/import.
// 원칙: seed.json은 읽기 전용. 파생물(lanes/edges/gaps)만 수정·저장.

import { downloadJson, elemsByCat } from './util.js';

const LS_KEY = 'infomap_v1';

export const store = {
  seed:  { levels: {}, areas: {}, standards: [] },  // 읽기 전용
  lanes: { active: 'integrated', tracks: {} },       // 영역→레인 배정(투트랙)
  depth: { predicates: {} },                          // 서술어→심화(깊이) 사전(config)
  edges: { edges: [] },
  gaps:  { threshold: { naming_overlap: 0.2 }, gaps: [] },
};

// 현재 활성 트랙(레인 목록 + 배정). grid/gaps가 사용.
export function activeTrack() {
  return store.lanes.tracks[store.lanes.active] || { lanes: [], assign: {} };
}
// 영역 키 규약: '<과목명>#<area_no>'
export const areaKey = (subject, area_no) => `${subject}#${area_no}`;

// 영역의 특정 범주 내용요소를, 계열(lane)로 분해(split)된 경우 그 계열 것만 반환.
// split 없는 영역은 전체 반환(기존 동작). area는 subject·area_no·elements를 가진 객체(cellData 결과).
export function elementsInLane(area, catPrefix, lane) {
  const els = elemsByCat(area, catPrefix);
  const split = (store.lanes.splits || {})[`${area.subject}#${area.area_no}`];
  if (!split) return els;
  return els.filter(el => (split[el] || []).includes(lane));
}

async function fetchJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

// seed는 항상 파일에서. 파생물은 localStorage 우선, 없으면 파일 기본값.
export async function loadAll() {
  store.seed = await fetchJson('data/seed.json');
  const [lanes, depth, edges, gaps] = await Promise.all([
    fetchJson('data/lanes.json'), fetchJson('data/depth.json'),
    fetchJson('data/edges.json'), fetchJson('data/gaps.json'),
  ]);
  store.lanes = lanes; store.depth = depth; store.edges = edges; store.gaps = gaps;
  // depth는 config(파일 직접 편집) — localStorage 병합·persist 안 함.

  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    try {
      const o = JSON.parse(saved);
      if (o.lanes) store.lanes = o.lanes;
      if (o.edges) store.edges = o.edges;
      if (o.gaps)  store.gaps = o.gaps;
    } catch { /* 손상 저장 무시 */ }
  }
}

export function persist() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    lanes: store.lanes, edges: store.edges, gaps: store.gaps,
  }));
}

export function exportFile(kind) {
  const map = { lanes: store.lanes, edges: store.edges, gaps: store.gaps };
  if (!map[kind]) return;
  downloadJson(`${kind}.json`, map[kind]);
}

// import — 파일 내용 형태로 종류 판별 후 해당 파생물만 교체(seed 덮어쓰기 금지) → persist().
export async function importFile(file) {
  let o;
  try { o = JSON.parse(await file.text()); } catch { return false; }
  if (o.tracks) store.lanes = o;
  else if (o.edges) store.edges = o;
  else if (o.gaps || o.threshold) store.gaps = o;
  else return false;
  persist();
  return true;
}
