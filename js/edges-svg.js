// edges-svg.js — 격자 위 간선 오버레이(SVG 1장).
// position:absolute; pointer-events:none. getBoundingClientRect()로 측정해 path 생성.
// 좌표를 JSON에 하드코딩하지 않는다 — 항상 DOM 측정.
// 간선 구분은 색이 아니라 선 모양: hierarchy=실선 화살표, extension=점선, transition=곡선.

import { store } from './store.js';

// TODO:
// 1) edges.edges 각 항목의 from/to node id → 해당 DOM 요소 찾기.
// 2) getBoundingClientRect()로 두 요소 중심 좌표 측정(맵 컨테이너 기준 상대좌표).
// 3) kind별 <path>: hierarchy=직선+marker(화살표), extension=stroke-dasharray, transition=베지어 곡선.
// 4) ResizeObserver(맵 컨테이너) → 변할 때 drawEdges 재호출. main/grid에서 옵저버 연결.

export function drawEdges() {
  // 스텁: 격자 렌더 후 호출됨.
}
