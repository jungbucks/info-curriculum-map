// bloom.js — 화면2 인지수준 태깅.
// 내용 요소 210개를 개별 태깅하지 않는다. 과정·기능 요소의 문장 끝 서술어를
// 정규식으로 추출 → 고유 서술어 목록(수십 개)에만 Bloom 1~6 부여.

import { store, persist } from './store.js';
import { elemsByCat, PRED_RE } from './util.js';

export const PREDICATE_RE = PRED_RE;

// 과정·기능 요소에서 서술어 추출. 단일 서술어 → predicates 후보, 복합('~하고 ~하기') → compound.
export function extractPredicates() {
  const single = new Set();
  const compound = new Set();
  for (const [subject, areas] of Object.entries(store.seed.areas || {})) {
    for (const a of areas) {
      const items = elemsByCat(a, '과정');
      for (const raw of items) {
        const t = String(raw).trim();
        // 복합 서술어 판별: 문장 안에 '하기/보기'가 여러 번, 또는 '~하고 ~하기'
        const hits = t.match(/[가-힣]+(?:하기|보기)/g) || [];
        if (hits.length > 1) { compound.add(t); continue; }
        const m = t.match(PREDICATE_RE);
        if (m) single.add(m[1]); else compound.add(t); // 규칙 밖은 수동 처리로
      }
    }
  }
  return { single: [...single].sort(), compound: [...compound].sort() };
}

// TODO:
// 1) extractPredicates()로 목록 렌더. 각 서술어에 Bloom 1~6 선택 UI.
// 2) 선택 → store.bloom.predicates[서술어] = 수준, persist().
// 3) 복합 목록은 '수동 처리' 표시로 분리 렌더(store.bloom.compound).
// 4) 요소 → Bloom 조회 헬퍼(gaps가 사용): 서술어 매핑값. 복합은 수동 지정.

export function renderTagging() {
  // 스텁.
}
