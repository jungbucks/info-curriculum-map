// sensitivity.mjs — 나선형 판정 감도분석.
// spiral.js 로직을 재현해 파라미터를 sweep: ① 구상하기 depth ② 반복 임계값 ③ 나선형 정의(끝점 vs 정점).
// 실행: node research/sensitivity.mjs  (콘솔 출력 = 논문 감도분석 원자료)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
const seed = load('seed.json'), lanes = load('lanes.json'), depthBase = load('depth.json');
const track = lanes.tracks[lanes.active];

const PRED = /([가-힣]+하기|[가-힣]+보기)$/;
const STOP = new Set(['등','및','통한','위한','대한','다양한','실제','기반','관련','중심','적절','수행','과정','방법','문제','해결']);
const terms = t => String(t).replace(/[(),·⋅‧・/]/g,' ').split(/\s+/)
  .map(w=>w.replace(/(하기|보기|하고|하여|으로|로써|로서|에서|에게|이나|은|는|이|가|을|를|의|에|과|와|도|만|들)$/,'').trim())
  .filter(w=>w.length>=2 && !STOP.has(w));
const catKeyOf = (a,p)=>Object.keys(a.elements||{}).find(k=>k.startsWith(p));
const elemsInLane = (a, prefix, lane) => {
  const k = catKeyOf(a, prefix); const els = k ? a.elements[k] : [];
  const split = (lanes.splits||{})[`${a.subject}#${a.area_no}`];
  return split ? els.filter(e=>(split[e]||[]).includes(lane)) : els;
};
const levels = [...new Set(Object.values(seed.levels))].sort((x,y)=>x-y);

function areasIn(lane, level) {
  const out = [];
  for (const [subj, arr] of Object.entries(seed.areas)) {
    if (seed.levels[subj] !== level) continue;
    for (const a of arr) { const v = track.assign[`${subj}#${a.area_no}`]; const ls = Array.isArray(v)?v:(v?[v]:[]); if (ls.includes(lane)) out.push({subject:subj, ...a}); }
  }
  return out;
}
const stdCount = (lane, lv) => areasIn(lane, lv).reduce((n,a)=>n + seed.standards.filter(s=>s.subject===a.subject && s.area_no===a.area_no).length, 0);
const cellTerms = (lane, lv) => { const s=new Set(); for (const a of areasIn(lane,lv)) for (const c of ['지식','과정','가치']) for (const el of elemsInLane(a,c,lane)) terms(el).forEach(t=>s.add(t)); return s; };
const cellDepth = (lane, lv, dict) => { let m=0; for (const a of areasIn(lane,lv)) for (const el of elemsInLane(a,'과정',lane)) { const x=String(el).match(PRED); if (x&&dict[x[1]]!=null) m=Math.max(m,dict[x[1]]); } return m; };

function classify(lane, dict, thRecur, def) {
  const present = levels.filter(lv=>stdCount(lane,lv)>0);
  if (present.length < 2) return { cls:'단발', traj:present.map(lv=>cellDepth(lane,lv,dict)), recur:0 };
  const ov=[]; for (let i=0;i<present.length-1;i++){ const A=cellTerms(lane,present[i]),B=cellTerms(lane,present[i+1]); ov.push([...A].filter(x=>B.has(x)).length/(Math.min(A.size,B.size)||1)); }
  const recur = +(ov.reduce((a,b)=>a+b,0)/ov.length).toFixed(2);
  const traj = present.map(lv=>cellDepth(lane,lv,dict));
  const dz = traj.filter(d=>d>0);
  let cls;
  if (recur < thRecur) cls='단절';
  else if (dz.length<2) cls='반복';
  else { const rising = def==='peak' ? Math.max(...dz)>dz[0] : dz[dz.length-1]>dz[0]; cls = rising?'나선형':'반복'; }
  return { cls, traj, recur };
}

const withGusang = d => ({ ...depthBase.predicates, '구상하기': d });
const LANES = track.lanes;
const emoji = { '나선형':'🌀', '반복':'🔁', '단발':'↗', '단절':'—' };

let out = `# 나선형 판정 감도분석 (${new Date().toISOString().slice(0,10)})\n\n활성 트랙: ${lanes.active} · 기준: 반복임계 0.15, 나선형정의=끝점(last>first), 구상하기=6\n\n`;

// 기준 판정
out += `## 기준선\n| 레인 | 판정 | 반복 | 심화 궤적 |\n|---|---|---|---|\n`;
for (const l of LANES){ const r=classify(l, withGusang(6), 0.15, 'end'); out += `| ${l} | ${emoji[r.cls]}${r.cls} | ${r.recur} | ${r.traj.join('→')} |\n`; }

// Sweep 1: 구상하기 depth (2~6), 끝점 정의
out += `\n## ① 구상하기 depth sweep (반복임계 0.15, 끝점정의)\n| 레인 | d=2 | d=3 | d=4 | d=5 | d=6 |\n|---|---|---|---|---|---|\n`;
for (const l of LANES){ out += `| ${l} | ` + [2,3,4,5,6].map(d=>emoji[classify(l,withGusang(d),0.15,'end').cls]).join(' | ') + ' |\n'; }

// Sweep 2: 반복 임계값
out += `\n## ② 반복 임계값 sweep (구상하기 6, 끝점정의)\n| 레인 | 0.10 | 0.15 | 0.20 | 0.25 | 0.30 |\n|---|---|---|---|---|---|\n`;
for (const l of LANES){ out += `| ${l} | ` + [0.10,0.15,0.20,0.25,0.30].map(r=>emoji[classify(l,withGusang(6),r,'end').cls]).join(' | ') + ' |\n'; }

// Sweep 3: 나선형 정의 (끝점 vs 정점)
out += `\n## ③ 나선형 정의 비교 (구상하기 6, 반복임계 0.15)\n| 레인 | 끝점(last>first) | 정점(peak>first) |\n|---|---|---|\n`;
for (const l of LANES){ out += `| ${l} | ${emoji[classify(l,withGusang(6),0.15,'end').cls]} | ${emoji[classify(l,withGusang(6),0.15,'peak').cls]} |\n`; }

console.log(out);
fs.writeFileSync(path.join(root, 'research', 'sensitivity-report.md'), out);
