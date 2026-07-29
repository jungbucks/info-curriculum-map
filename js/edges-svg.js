// edges-svg.js — 격자 위 간선 오버레이(SVG 1장).
// position:absolute; pointer-events:none. getBoundingClientRect()로 측정해 path 생성.
// 좌표를 JSON에 하드코딩하지 않는다 — 항상 DOM 측정. ResizeObserver로 재계산.
// 간선 구분은 색이 아니라 선 모양: hierarchy=실선 화살표, extension=점선, transition=곡선.
// 노드 단위 = 셀(레인×단계). edges.json의 from/to = { lane, level }.

import { store } from './store.js';

let _ro = null, _bound = false;
const STROKE = '#555';

// 활성 트랙에 렌더된 셀만 존재 → 트랙에 없는 레인 간선은 자동 skip.
function cellEl(lane, level) {
  return [...document.querySelectorAll('.gm-cell')]
    .find(c => c.dataset.lane === lane && +c.dataset.level === level);
}

// 두 사각형의 마주보는 변 중점을 앵커로. (host 원점 기준 상대좌표)
function anchors(ra, rb, base) {
  const sMidY = ra.top + ra.height / 2 - base.top, tMidY = rb.top + rb.height / 2 - base.top;
  const sMidX = ra.left + ra.width / 2 - base.left, tMidX = rb.left + rb.width / 2 - base.left;
  if (rb.left >= ra.right - 1)  return { sx: ra.right - base.left, sy: sMidY, tx: rb.left - base.left, ty: tMidY, axis: 'h' };
  if (rb.right <= ra.left + 1)  return { sx: ra.left - base.left,  sy: sMidY, tx: rb.right - base.left, ty: tMidY, axis: 'h' };
  if (rb.top >= ra.bottom - 1)  return { sx: sMidX, sy: ra.bottom - base.top, tx: tMidX, ty: rb.top - base.top, axis: 'v' };
  return { sx: sMidX, sy: ra.top - base.top, tx: tMidX, ty: rb.bottom - base.top, axis: 'v' };
}

function pathFor(kind, a) {
  const { sx, sy, tx, ty } = a;
  if (kind === 'transition') {
    // 곡선(전이): 축 방향으로 제어점 오프셋
    const cx1 = a.axis === 'h' ? sx + (tx - sx) * 0.45 : sx;
    const cy1 = a.axis === 'h' ? sy : sy + (ty - sy) * 0.45;
    const cx2 = a.axis === 'h' ? sx + (tx - sx) * 0.55 : tx;
    const cy2 = a.axis === 'h' ? ty : sy + (ty - sy) * 0.55;
    return `<path d="M${sx},${sy} C${cx1},${cy1} ${cx2},${cy2} ${tx},${ty}" fill="none" stroke="${STROKE}" stroke-width="1.6" marker-end="url(#arrow)"/>`;
  }
  const dash = kind === 'extension' ? ' stroke-dasharray="5 4"' : '';   // 점선(확장)
  return `<path d="M${sx},${sy} L${tx},${ty}" fill="none" stroke="${STROKE}" stroke-width="1.6"${dash} marker-end="url(#arrow)"/>`;
}

export function drawEdges() {
  const svg = document.getElementById('edge-layer');
  const map = document.getElementById('grid-map');
  const host = document.getElementById('screen-grid');
  if (!svg || !map || !host) return;

  const base = host.getBoundingClientRect();
  svg.setAttribute('width', base.width);
  svg.setAttribute('height', base.height);
  svg.style.width = base.width + 'px';
  svg.style.height = base.height + 'px';

  let paths = '';
  for (const e of (store.edges.edges || [])) {
    if (!e || !e.from || !e.to) continue;
    const a = cellEl(e.from.lane, e.from.level), b = cellEl(e.to.lane, e.to.level);
    if (!a || !b) continue;   // 빈 셀·비활성 트랙 레인 → 그리지 않음
    paths += pathFor(e.kind, anchors(a.getBoundingClientRect(), b.getBoundingClientRect(), base));
  }

  svg.innerHTML =
    `<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="7.5" refY="4" orient="auto" markerUnits="userSpaceOnUse">
       <path d="M0,0 L9,4 L0,8 z" fill="${STROKE}"/></marker></defs>` + paths;

  // 리사이즈 시 재계산(격자 크기 변화 측정) — 한 번만 연결.
  if (!_ro) { _ro = new ResizeObserver(() => drawEdges()); _ro.observe(map); }
  if (!_bound) { window.addEventListener('resize', () => drawEdges()); _bound = true; }
}
