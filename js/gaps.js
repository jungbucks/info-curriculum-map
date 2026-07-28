// gaps.js — 화면3 결손 리포트.
// 각 레인을 학교급 순으로 훑어 3종 판정 + 판정 근거 문자열을 반드시 기록.
//   by_design       : 해당 학교급에 그 영역 자체가 편제 안 됨 (기본 필터 제외 = 노이즈)
//   stagnant        : 학교급이 올라가는데 레인 Bloom 최대값이 같거나 낮음
//   naming_mismatch : 인접 학교급 레인 간 내용 요소 용어 중복률이 임계값 이하
// 임계값(naming_overlap) UI 조정 → 즉시 재계산. 전체 gaps.json export.

import { store, persist } from './store.js';

// 근거 예시: "중2→고3: Bloom max 4→4, 서술어 '탐구하기'→'탐색하기'"
export function computeGaps(threshold = store.gaps.threshold) {
  const gaps = [];
  // TODO:
  // 1) 레인(영역 계열) × 단계(1~4) 매트릭스 구성.
  // 2) 인접 단계쌍 순회:
  //    - 상위 단계에 레인 없음 → by_design (evidence: 편제 없음)
  //    - Bloom max 비증가 → stagnant (evidence: max A→B + 대표 서술어 변화)
  //    - 내용요소 용어 중복률 < threshold.naming_overlap → naming_mismatch (evidence: 중복률·용어쌍)
  // 3) 각 gap에 params(임계값 스냅샷) 첨부.
  return gaps;
}

export function recompute() {
  store.gaps.gaps = computeGaps();
  store.gaps.generated_at = new Date().toISOString();
  persist();
}

export function renderGaps() {
  // 스텁: 임계값 슬라이더 + by_design 필터 + 근거 테이블.
}
