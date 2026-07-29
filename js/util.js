// util.js — 공용 헬퍼. DOM·이스케이프·다운로드·상태표시.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export function setStatus(msg, isErr = false) {
  const el = $('#status');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('err', isErr);
}

// 내용요소 3범주 접근. seed의 구분점 문자(·/⋅) 변형을 접두어 매칭으로 흡수.
// prefix: '지식' | '과정' | '가치'
export function elemsByCat(area, prefix) {
  const el = (area && area.elements) || {};
  const k = Object.keys(el).find(key => key.startsWith(prefix));
  return k ? el[k] : [];
}
export function catKey(area, prefix) {
  return Object.keys((area && area.elements) || {}).find(key => key.startsWith(prefix)) || prefix;
}

// 내용요소 문장 → 내용어 토큰. 조사·어미 접미 제거 후 2글자↑. 투명·수정가능.
// 계열 대조(새 용어 강조)와 결손(naming 중복률)이 공유.
export const STOP_TERMS = new Set(['등', '및', '통한', '위한', '대한', '다양한', '실제', '기반', '관련', '중심', '적절', '수행', '과정', '방법', '문제', '해결']);
export function terms(text) {
  return String(text).replace(/[(),·⋅‧・/]/g, ' ').split(/\s+/)
    .map(w => w.replace(/(하기|보기|하고|하여|으로|로써|로서|에서|에게|이나|은|는|이|가|을|를|의|에|과|와|도|만|들)$/, '').trim())
    .filter(w => w.length >= 2 && !STOP_TERMS.has(w));
}

// 과정·기능 문장 끝 서술어 추출용(심화 depth 산출에 사용).
export const PRED_RE = /([가-힣]+하기|[가-힣]+보기)$/;
