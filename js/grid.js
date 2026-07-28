// grid.js — 화면1 격자 맵.
// 행 = 영역 레인, 열 = 학교급 1~4단계. CSS Grid가 위치 결정(좌표 계산 금지).
// 셀 = DOM 요소. 셀에 성취기준 개수 + 인지수준(색 농도) 표시.
// 클릭 시 detail 패널: 핵심 아이디어 / 내용 요소 3범주 / 성취기준.

import { store } from './store.js';
import { drawEdges } from './edges-svg.js';
// import { $, esc } from './util.js';

// TODO:
// 1) 레인(영역) 목록 구성 — seed.areas를 과목 경계 넘어 '같은 영역 계열'로 묶는 규칙 필요(스펙 확정 대기).
// 2) 셀 = (레인 × 단계). grid-template-areas 또는 grid-row/col로 배치.
// 3) 셀 요약: 성취기준 count, Bloom 최대값 → 색 농도(CSS 변수 --lane-hue + 명도).
// 4) 셀 클릭 → detail-panel 렌더 + URL 해시(#cell=데이터/4). 노드 클릭 → #node=12데과01-01.
// 5) 렌더 후 drawEdges() 호출. ResizeObserver로 리사이즈 시 drawEdges 재실행.

export function renderGrid() {
  // 스텁: 데이터 채워지면 구현.
}
