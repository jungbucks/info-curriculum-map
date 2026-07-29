# 정보과 교육과정 온톨로지 (OWL)

2022 개정 정보과 계열 교육과정의 **형식 온톨로지**. `data/*.json` → Turtle 자동 생성.
> 개념도/지식그래프가 아니라 **클래스·속성·공리**를 갖춘 온톨로지(Protégé·추론기에서 검증 가능).

## 파일
- `build-owl.mjs` — 빌드 스크립트. 실행: `node ontology/build-owl.mjs`
- `info-curriculum.ttl` — 생성물(TBox 스키마 + ABox 인스턴스, 한 파일). Protégé로 열기.

## 스키마(TBox)

### 클래스 (11)
`Subject`(과목) · `SchoolLevel`(학교급) · `Area`(영역) · `AchievementStandard`(성취기준) ·
`CoreIdea`(핵심 아이디어) · `ContentElement`(내용 요소) └ `KnowledgeElement`/`ProcessElement`/`ValueElement`(지식·이해/과정·기능/가치·태도) ·
`Concept`(핵심 개념=계열) · `StrandNode`(계열 노드 = 개념×학교급).

### 객체 속성
`hasArea`↔`areaOf`(inverse) · `inArea` · `hasStandard` · `hasContentElement` · `hasCoreIdea` ·
`atSchoolLevel` · `belongsToStrand` · `coversArea` ·
**계열**: `precedes`(상위·**이행적**) ⊃ `prerequisiteOf`(위계)·`extendedBy`(확장)·`transitionsTo`(전이).

### 데이터 속성
`code` · `hasText` · `levelNo`(1~4) · `areaNo` · `sequenceNo` · `cognitiveDepth`(과정·기능 서술어 심화 1~6, depth.json 자동).

### 공리(제약) — "그래프가 아니라 온톨로지"인 근거
- `KnowledgeElement`/`ProcessElement`/`ValueElement` **서로소**(AllDisjointClasses). 주요 7클래스도 서로소.
- `precedes` **TransitiveProperty** + 위계·확장·전이가 하위 속성 → 추론기가 **계열 사슬을 이행 추론**.
- 존재 제약: 모든 성취기준은 `inArea some Area`·`atSchoolLevel some SchoolLevel`, 모든 영역은 `areaOf some Subject`.

## 인스턴스(ABox) 규모 (활성 트랙: integrated)
과목 6 · 개념 5 · 영역 24 · 핵심아이디어 53 · 내용요소 210(심화 부여 77) · 성취기준 110 · 계열노드 19 · 계열관계 11. (총 ~860 트리플)

## 사용
1. **Protégé**로 `info-curriculum.ttl` 열기.
2. **추론기(HermiT/ELK)** 실행 → 논리적 **일관성 검증**(논문 검증 절의 근거).
3. SPARQL로 질의 예: "데이터 계열의 학교급별 성취기준", "위계로 이어진 성취기준 사슬".

## 재생성 / 주의
- 데이터(seed·lanes·edges·depth) 수정 후 `node ontology/build-owl.mjs`로 재빌드.
- **계열 관계(precedes 계열)는 현재 `edges.json` 수동 시드 기반**(초등→중·중→고 위계 + 데이터·인공지능 확장 등). 연구자가 edges 보강하면 온톨로지도 풍부해짐.
- ⚠️ 초등#5는 4개념 다중배정(◐) 상태 → L1 계열노드에 초등 영역이 복제 참조됨. **초등 개념 분해 후 정밀화 예정**([[FUTURE_RESEARCH]]).
- IRI 베이스: `https://jungbucks.github.io/info-curriculum-map/onto#` (prefix `ic:`).
