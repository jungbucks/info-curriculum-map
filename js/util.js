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

// 과정·기능 문장 끝 서술어 추출용.
export const PRED_RE = /([가-힣]+하기|[가-힣]+보기)$/;
