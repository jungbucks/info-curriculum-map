// build-owl.mjs — data/*.json → 정보과 교육과정 온톨로지(Turtle/OWL) 생성.
// 실행: node ontology/build-owl.mjs  → ontology/info-curriculum.ttl
// TBox(스키마=클래스·속성·공리)는 아래 상수, ABox(인스턴스)는 데이터에서 자동 생성.
// 좌표·시각화 아님 — Protégé/추론기에서 열리는 형식 온톨로지.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(dir, '..');
const load = f => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf8'));
const seed = load('seed.json'), lanes = load('lanes.json'), edges = load('edges.json'), depth = load('depth.json');

// ── 헬퍼 ──
const esc = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ').trim();
const lit = s => `"${esc(s)}"@ko`;
const id = s => String(s).replace(/[\[\]()]/g, '').replace(/[\s·⋅‧・/.,]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
const PRED_RE = /([가-힣]+하기|[가-힣]+보기)$/;
const catCode = k => k.startsWith('지식') ? 'K' : k.startsWith('과정') ? 'P' : 'V';
const catClass = k => k.startsWith('지식') ? 'ic:KnowledgeElement' : k.startsWith('과정') ? 'ic:ProcessElement' : 'ic:ValueElement';

const track = lanes.tracks[lanes.active];               // 계열(레인) = 개념. 활성 트랙 기준.
const levelName = { 1: '초등 실과', 2: '중학교 정보', 3: '고등 정보', 4: '진로·융합선택' };

// ── TBox (스키마) ──
const TBOX = `@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix ic:   <https://jungbucks.github.io/info-curriculum-map/onto#> .
@base         <https://jungbucks.github.io/info-curriculum-map/onto#> .

ic: a owl:Ontology ;
  rdfs:label "정보과 교육과정 온톨로지"@ko ;
  rdfs:comment "2022 개정 정보과 계열(초 실과→중→고→진로·융합) 교육과정의 개념·관계·계열 온톨로지. 자동 생성(build-owl.mjs)."@ko .

# ── 클래스 ──
ic:Subject            a owl:Class ; rdfs:label "과목"@ko .
ic:SchoolLevel        a owl:Class ; rdfs:label "학교급"@ko .
ic:Area               a owl:Class ; rdfs:label "영역"@ko .
ic:AchievementStandard a owl:Class ; rdfs:label "성취기준"@ko .
ic:CoreIdea           a owl:Class ; rdfs:label "핵심 아이디어"@ko .
ic:ContentElement     a owl:Class ; rdfs:label "내용 요소"@ko .
ic:KnowledgeElement   a owl:Class ; rdfs:subClassOf ic:ContentElement ; rdfs:label "지식·이해"@ko .
ic:ProcessElement     a owl:Class ; rdfs:subClassOf ic:ContentElement ; rdfs:label "과정·기능"@ko .
ic:ValueElement       a owl:Class ; rdfs:subClassOf ic:ContentElement ; rdfs:label "가치·태도"@ko .
ic:Concept            a owl:Class ; rdfs:label "핵심 개념(계열)"@ko .
ic:StrandNode         a owl:Class ; rdfs:label "계열 노드(개념×학교급)"@ko .

[] a owl:AllDisjointClasses ; owl:members ( ic:KnowledgeElement ic:ProcessElement ic:ValueElement ) .
[] a owl:AllDisjointClasses ; owl:members ( ic:Subject ic:SchoolLevel ic:Area ic:AchievementStandard ic:CoreIdea ic:ContentElement ic:Concept ) .

# ── 객체 속성 ──
ic:hasArea         a owl:ObjectProperty ; rdfs:domain ic:Subject ; rdfs:range ic:Area ; rdfs:label "영역 보유"@ko .
ic:areaOf          a owl:ObjectProperty ; owl:inverseOf ic:hasArea ; rdfs:label "소속 과목"@ko .
ic:inArea          a owl:ObjectProperty ; rdfs:range ic:Area ; rdfs:label "소속 영역"@ko .
ic:hasStandard     a owl:ObjectProperty ; rdfs:domain ic:Area ; rdfs:range ic:AchievementStandard ; rdfs:label "성취기준 보유"@ko .
ic:hasContentElement a owl:ObjectProperty ; rdfs:domain ic:Area ; rdfs:range ic:ContentElement ; rdfs:label "내용요소 보유"@ko .
ic:hasCoreIdea     a owl:ObjectProperty ; rdfs:domain ic:Area ; rdfs:range ic:CoreIdea ; rdfs:label "핵심아이디어 보유"@ko .
ic:atSchoolLevel   a owl:ObjectProperty ; rdfs:range ic:SchoolLevel ; rdfs:label "학교급"@ko .
ic:belongsToStrand a owl:ObjectProperty ; rdfs:range ic:Concept ; rdfs:label "계열 소속"@ko .
ic:coversArea      a owl:ObjectProperty ; rdfs:domain ic:StrandNode ; rdfs:range ic:Area ; rdfs:label "포함 영역"@ko .
ic:precedes        a owl:ObjectProperty, owl:TransitiveProperty ; rdfs:label "선행(계열)"@ko ;
  rdfs:comment "학습 위계상 앞섬. 하위 속성(위계·확장·전이)의 상위. 이행적(transitive) → 계열 사슬 추론."@ko .
ic:prerequisiteOf  a owl:ObjectProperty ; rdfs:subPropertyOf ic:precedes ; rdfs:label "위계"@ko .
ic:extendedBy      a owl:ObjectProperty ; rdfs:subPropertyOf ic:precedes ; rdfs:label "확장"@ko .
ic:transitionsTo   a owl:ObjectProperty ; rdfs:subPropertyOf ic:precedes ; rdfs:label "전이"@ko .

# ── 데이터 속성 ──
ic:code           a owl:DatatypeProperty ; rdfs:domain ic:AchievementStandard ; rdfs:range xsd:string ; rdfs:label "성취기준 코드"@ko .
ic:hasText        a owl:DatatypeProperty ; rdfs:range xsd:string ; rdfs:label "본문"@ko .
ic:levelNo        a owl:DatatypeProperty ; rdfs:range xsd:integer ; rdfs:label "학교급 단계(1~4)"@ko .
ic:areaNo         a owl:DatatypeProperty ; rdfs:domain ic:Area ; rdfs:range xsd:integer ; rdfs:label "영역 번호"@ko .
ic:sequenceNo     a owl:DatatypeProperty ; rdfs:range xsd:integer ; rdfs:label "순번"@ko .
ic:cognitiveDepth a owl:DatatypeProperty ; rdfs:domain ic:ProcessElement ; rdfs:range xsd:integer ;
  rdfs:label "심화(깊이 1~6)"@ko ; rdfs:comment "과정·기능 서술어 자동 사전(depth.json) 기반. 1 기억~6 창안."@ko .

# ── 공리(제약) ──
ic:AchievementStandard rdfs:subClassOf [ a owl:Restriction ; owl:onProperty ic:inArea ; owl:someValuesFrom ic:Area ] .
ic:AchievementStandard rdfs:subClassOf [ a owl:Restriction ; owl:onProperty ic:atSchoolLevel ; owl:someValuesFrom ic:SchoolLevel ] .
ic:Area rdfs:subClassOf [ a owl:Restriction ; owl:onProperty ic:areaOf ; owl:someValuesFrom ic:Subject ] .
`;

// ── ABox (인스턴스) ──
let A = '\n# ══════════ 인스턴스(ABox) ══════════\n';

// 학교급
const levels = [...new Set(Object.values(seed.levels))].sort((a, b) => a - b);
A += '\n# 학교급\n';
for (const lv of levels) A += `ic:Level${lv} a ic:SchoolLevel ; ic:levelNo ${lv} ; rdfs:label ${lit(levelName[lv] || 'L' + lv)} .\n`;

// 개념(계열)
A += '\n# 핵심 개념(계열)\n';
for (const c of track.lanes) A += `ic:CONCEPT_${id(c)} a ic:Concept ; rdfs:label ${lit(c)} .\n`;

// 과목
A += '\n# 과목\n';
for (const [subj, lv] of Object.entries(seed.levels)) {
  A += `ic:SUBJ_${id(subj)} a ic:Subject ; rdfs:label ${lit(subj)} ; ic:atSchoolLevel ic:Level${lv} .\n`;
}

// 영역 + 핵심아이디어 + 내용요소
const areaIri = (subj, no) => `ic:AREA_${id(subj)}_${no}`;
let coreN = 0, elemN = 0, depthN = 0;
A += '\n# 영역 · 핵심아이디어 · 내용요소\n';
for (const [subj, arr] of Object.entries(seed.areas)) {
  const lv = seed.levels[subj];
  for (const a of arr) {
    const aI = areaIri(subj, a.area_no);
    const strands = (() => { const v = track.assign[`${subj}#${a.area_no}`]; return Array.isArray(v) ? v : (v ? [v] : []); })();
    const strandTriple = strands.map(s => `ic:CONCEPT_${id(s)}`).join(', ');
    A += `${aI} a ic:Area ; rdfs:label ${lit(a.area)} ; ic:areaNo ${a.area_no} ; ic:areaOf ic:SUBJ_${id(subj)} ; ic:atSchoolLevel ic:Level${lv}` +
      (strandTriple ? ` ; ic:belongsToStrand ${strandTriple}` : '') + ' .\n';
    (a.core_ideas || []).forEach((c, i) => {
      coreN++;
      const cI = `ic:CI_${id(subj)}_${a.area_no}_${i + 1}`;
      A += `${cI} a ic:CoreIdea ; rdfs:label ${lit(c)} ; ic:hasText ${lit(c)} .\n${aI} ic:hasCoreIdea ${cI} .\n`;
    });
    for (const [k, items] of Object.entries(a.elements || {})) {
      items.forEach((el, i) => {
        elemN++;
        const eI = `ic:EL_${id(subj)}_${a.area_no}_${catCode(k)}${i + 1}`;
        let d = '';
        if (catCode(k) === 'P') { const m = String(el).match(PRED_RE); if (m && depth.predicates[m[1]] != null) { d = ` ; ic:cognitiveDepth ${depth.predicates[m[1]]}`; depthN++; } }
        A += `${eI} a ${catClass(k)} ; rdfs:label ${lit(el)} ; ic:hasText ${lit(el)}${d} .\n${aI} ic:hasContentElement ${eI} .\n`;
      });
    }
  }
}

// 성취기준
A += '\n# 성취기준\n';
for (const s of seed.standards) {
  const sI = `ic:AS_${id(s.id)}`;
  const aI = areaIri(s.subject, s.area_no);
  A += `${sI} a ic:AchievementStandard ; ic:code "${esc(s.id)}" ; rdfs:label ${lit(s.id)} ; ic:hasText ${lit(s.text)} ; ic:levelNo ${s.level}` +
    (s.seq != null ? ` ; ic:sequenceNo ${s.seq}` : '') +
    ` ; ic:inArea ${aI} ; ic:atSchoolLevel ic:Level${s.level} .\n${aI} ic:hasStandard ${sI} .\n`;
}

// 계열 노드(개념×학교급) + 계열 관계(edges)
A += '\n# 계열 노드 + 계열 관계\n';
const snIri = (lane, lv) => `ic:SN_${id(lane)}_L${lv}`;
const snSet = new Set();
for (const c of track.lanes) for (const lv of levels) {
  // 이 개념+단계에 배정된 영역
  const areasHere = [];
  for (const [subj, arr] of Object.entries(seed.areas)) {
    if (seed.levels[subj] !== lv) continue;
    for (const a of arr) { const v = track.assign[`${subj}#${a.area_no}`]; const ls = Array.isArray(v) ? v : (v ? [v] : []); if (ls.includes(c)) areasHere.push(areaIri(subj, a.area_no)); }
  }
  if (!areasHere.length) continue;
  const sn = snIri(c, lv); snSet.add(`${c}|${lv}`);
  A += `${sn} a ic:StrandNode ; rdfs:label ${lit(c + ' · ' + (levelName[lv] || lv))} ; ic:belongsToStrand ic:CONCEPT_${id(c)} ; ic:atSchoolLevel ic:Level${lv} ; ic:coversArea ${areasHere.join(', ')} .\n`;
}
const kindProp = { hierarchy: 'ic:prerequisiteOf', extension: 'ic:extendedBy', transition: 'ic:transitionsTo' };
let edgeN = 0;
for (const e of (edges.edges || [])) {
  if (!e.from || !e.to) continue;
  if (!snSet.has(`${e.from.lane}|${e.from.level}`) || !snSet.has(`${e.to.lane}|${e.to.level}`)) continue;
  A += `${snIri(e.from.lane, e.from.level)} ${kindProp[e.kind] || 'ic:precedes'} ${snIri(e.to.lane, e.to.level)} .\n`;
  edgeN++;
}

const out = TBOX + A;
fs.writeFileSync(path.join(dir, 'info-curriculum.ttl'), out);

console.log('생성: ontology/info-curriculum.ttl');
console.log(`과목 ${Object.keys(seed.levels).length} · 개념 ${track.lanes.length} · 영역 ${Object.values(seed.areas).flat().length} · 핵심아이디어 ${coreN} · 내용요소 ${elemN}(심화부여 ${depthN}) · 성취기준 ${seed.standards.length} · 계열노드 ${snSet.size} · 계열관계 ${edgeN}`);
console.log('트랙:', lanes.active, '/ 총 트리플 라인:', out.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length);
