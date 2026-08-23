/**
 * §10 칙령표.
 *
 * EDICT_AXES — 28개 전체의 P/T/F. §10.9 총합 검산을 다시 하기 위한 것으로,
 *   사양서 §10.2~§10.8 표를 그대로 옮겼다.
 * EDICTS — 3헥스 검증 시나리오에 쓰는 9개. 이해충돌도(§9.1)까지 채웠다.
 */
import type { Edict, Axes } from "./types.ts";

export interface EdictAxisRow {
  area: number;
  tier: 1 | 2 | 3 | 4;
  labelKo: string;
  gain: Axes;
}

/** §10.2 ~ §10.8 */
export const EDICT_AXES: EdictAxisRow[] = [
  // §10.2 영역 1 — 종교
  { area: 1, tier: 1, labelKo: "관용령", gain: { p: 6, t: 1, f: 0 } },
  { area: 1, tier: 2, labelKo: "수도원 해산", gain: { p: 2, t: 5, f: 7 } },
  { area: 1, tier: 3, labelKo: "교구 재편 + 총신학교", gain: { p: 7, t: 5, f: 1 } },
  { area: 1, tier: 4, labelKo: "예배·매장 규정", gain: { p: -4, t: 3, f: 1 } },
  // §10.3 영역 2 — 신민 지위
  { area: 2, tier: 1, labelKo: "농노제 칙령 (보헤미아)", gain: { p: 8, t: 2, f: 0 } },
  { area: 2, tier: 2, labelKo: "혼인 특허", gain: { p: 5, t: 3, f: 0 } },
  { area: 2, tier: 3, labelKo: "농노제 확대 (헝가리)", gain: { p: 9, t: 3, f: 1 } },
  { area: 2, tier: 4, labelKo: "영주 재판권 제한", gain: { p: 7, t: 6, f: 2 } },
  // §10.4 영역 3 — 법
  { area: 3, tier: 1, labelKo: "검열 완화", gain: { p: 3, t: 1, f: 0 } },
  { area: 3, tier: 2, labelKo: "형법전 (사형 폐지)", gain: { p: 4, t: 5, f: 0 } },
  { area: 3, tier: 3, labelKo: "민법전 1부", gain: { p: 3, t: 6, f: 1 } },
  { area: 3, tier: 4, labelKo: "신분별 법정 폐지", gain: { p: 4, t: 9, f: 2 } },
  // §10.5 영역 4 — 국가 파악
  { area: 4, tier: 1, labelKo: "가옥 번호 부여", gain: { p: 2, t: 4, f: 1 } },
  { area: 4, tier: 2, labelKo: "인구조사", gain: { p: 5, t: 6, f: 3 } },
  { area: 4, tier: 3, labelKo: "토지 측량", gain: { p: 2, t: 5, f: 9 } },
  { area: 4, tier: 4, labelKo: "관료 근무·평가 규정", gain: { p: 1, t: 7, f: 3 } },
  // §10.6 영역 5 — 지방 행정
  { area: 5, tier: 1, labelKo: "크라이스 개편", gain: { p: 1, t: 5, f: 2 } },
  { area: 5, tier: 2, labelKo: "총독부 부다 이전", gain: { p: 2, t: 4, f: 1 } },
  { area: 5, tier: 3, labelKo: "도시 행정 개편", gain: { p: 0, t: 5, f: 3 } },
  { area: 5, tier: 4, labelKo: "부군 자치 정지 + 10관구", gain: { p: 3, t: 12, f: 6 } },
  // §10.7 영역 6 — 조세
  { area: 6, tier: 1, labelKo: "관세 조정", gain: { p: 0, t: 1, f: 4 } },
  { area: 6, tier: 2, labelKo: "국가 전매 확대", gain: { p: -1, t: 2, f: 6 } },
  { area: 6, tier: 3, labelKo: "도시 과세 강화", gain: { p: 0, t: 2, f: 7 } },
  { area: 6, tier: 4, labelKo: "조세·부역 칙령", gain: { p: 4, t: 3, f: 18 } },
  // §10.8 영역 7 — 언어·교육
  { area: 7, tier: 1, labelKo: "초등학교 확대", gain: { p: 5, t: 2, f: 0 } },
  { area: 7, tier: 2, labelKo: "대학 개편", gain: { p: 2, t: 3, f: 0 } },
  { area: 7, tier: 3, labelKo: "독일어 행정어", gain: { p: -9, t: 10, f: 3 } },
  { area: 7, tier: 4, labelKo: "대학 교육어 독일어화", gain: { p: -3, t: 4, f: 0 } },
];

function axesOf(area: number, tier: number): Axes {
  const row = EDICT_AXES.find((r) => r.area === area && r.tier === tier);
  if (!row) throw new Error(`no edict row for ${area}-${tier}`);
  return row.gain;
}

/**
 * 시나리오용 9개. 충돌도는 §10의 서술을 계층 기본값 + 세력 예외로 옮긴 것이다.
 * 가짜 지도에 없는 문화권(티롤 독일계 농민, 유대계 도시민, 이탈리아계 등)은 생략했다.
 */
export const EDICTS: Edict[] = [
  {
    id: "toleranz",
    labelKo: "관용령",
    area: 1,
    tier: 1,
    gain: axesOf(1, 1),
    // §10.2 단계1: 가톨릭 성직자 +2 · 헝가리계 귀족 −1
    conflict: { byFaction: { "cath-clergy": 2, "hu-noble": -1 } },
  },
  {
    id: "serfdom-hu",
    labelKo: "농노제 확대 (헝가리)",
    area: 2,
    tier: 3,
    gain: axesOf(2, 3),
    // §10.3 단계3: 헝가리계 귀족 +3 · 기타 귀족 +1 · 헝가리권 농민 −3
    conflict: { byEstate: { noble: 1, peasant: -3 }, byFaction: { "hu-noble": 3 } },
  },
  {
    id: "manorial-courts",
    labelKo: "영주 재판권 제한",
    area: 2,
    tier: 4,
    gain: axesOf(2, 4),
    // §10.3 단계4: 귀족 전반 +3 · 성직자 전반 +1 · 농민 전반 −3
    conflict: { byEstate: { noble: 3, clergy: 1, peasant: -3 } },
  },
  {
    id: "abolish-estate-courts",
    labelKo: "신분별 법정 폐지",
    area: 3,
    tier: 4,
    gain: axesOf(3, 4),
    // §10.4 단계4: 귀족 +3 · 성직자 +3 · 도시민 +2 · 농민 −2
    conflict: { byEstate: { noble: 3, clergy: 3, burgher: 2, peasant: -2 } },
  },
  {
    id: "census",
    labelKo: "인구조사",
    area: 4,
    tier: 2,
    gain: axesOf(4, 2),
    // §10.5 단계2: 헝가리계 귀족 +3 · 기타 귀족 +2 · 농민 +2 · 도시민 +1 · 성직자 +1
    conflict: {
      byEstate: { noble: 2, clergy: 1, burgher: 1, peasant: 2 },
      byFaction: { "hu-noble": 3 },
    },
  },
  {
    id: "cadastre",
    labelKo: "토지 측량",
    area: 4,
    tier: 3,
    gain: axesOf(4, 3),
    // §10.5 단계3: 귀족 +3 · 성직자 +3 · 도시민 +1 · 농민 −1
    conflict: { byEstate: { noble: 3, clergy: 3, burgher: 1, peasant: -1 } },
  },
  {
    id: "suspend-varmegye",
    labelKo: "부군 자치 정지 + 10관구",
    area: 5,
    tier: 4,
    gain: axesOf(5, 4),
    // §10.6 단계4: 헝가리계 귀족 +3 · 기타 귀족 +2 · 헝가리계 도시민 −1
    conflict: { byEstate: { noble: 2, burgher: -1 }, byFaction: { "hu-noble": 3 } },
  },
  {
    id: "tax-robot",
    labelKo: "조세·부역 칙령",
    area: 6,
    tier: 4,
    gain: axesOf(6, 4),
    // §10.7 단계4: 귀족 +3 · 성직자 +3 · 도시민 +2 · 농민 −3
    conflict: { byEstate: { noble: 3, clergy: 3, burgher: 2, peasant: -3 } },
  },
  {
    id: "german-admin",
    labelKo: "독일어 행정어",
    area: 7,
    tier: 3,
    gain: axesOf(7, 3),
    // §10.8 단계3: 헝가리계 귀족 +3 · 벨기에 귀족 +3 · 체코계 귀족 +1 ·
    // 도시민 +2 (벨기에 +3 과 헝가리 +1 의 중간 — 가짜 지도에서 도시민이 하나이므로)
    conflict: {
      byEstate: { burgher: 2 },
      byFaction: { "hu-noble": 3, "be-noble": 3, "cz-noble": 1 },
    },
  },
];

export const EDICT_BY_ID: Record<string, Edict> = Object.fromEntries(
  EDICTS.map((e) => [e.id, e]),
);

/** §9.3 검산 시나리오 — 헝가리 지향 개혁 8개. 사양서 표의 순서 그대로. */
export const HUNGARY_SCENARIO: string[] = [
  "serfdom-hu",
  "suspend-varmegye",
  "cadastre",
  "manorial-courts",
  "tax-robot",
  "german-admin",
  "census",
  "abolish-estate-courts",
];
