/**
 * §16.1 1단계 — 3헥스 가짜 지도. 부군 1 + 크라이스 1 + 주 1, 세력 6개.
 * 실제 190헥스 데이터(§16.2)는 계산 코어 검증이 끝난 뒤에 만든다.
 *
 * 세력은 문화권 × 계층(§8.1)이지만, 가짜 지도에서는 도시민·농민을 문화권
 * 구분 없이 각 1개로 뭉쳤다. 그래서 "헝가리 농민만 −3" 같은 문화권 한정
 * 충돌도(§10.3 단계3)가 3헥스 전체에 걸린다 — 190헥스 데이터에서는 문화권별로
 * 갈라진다.
 */
import type { Faction, Hex } from "./types.ts";
import { makeWorld } from "./world.ts";

/** §8.5 수렴값(대표값, 잠정). 도시민 22는 §8.6 검산에서 역산했다 — 아래 주석 참조. */
export const FACTIONS: Faction[] = [
  { id: "hu-noble", labelKo: "헝가리계 귀족", estate: "noble", convergence: 60 },
  { id: "cz-noble", labelKo: "체코계 귀족", estate: "noble", convergence: 40 },
  { id: "be-noble", labelKo: "벨기에 귀족", estate: "noble", convergence: 55 },
  { id: "cath-clergy", labelKo: "가톨릭 성직자", estate: "clergy", convergence: 52 },
  { id: "burgher", labelKo: "도시민", estate: "burgher", convergence: 22 },
  { id: "peasant", labelKo: "농민", estate: "peasant", convergence: 25 },
];

export const FACTION_BY_ID: Record<string, Faction> = Object.fromEntries(
  FACTIONS.map((f) => [f.id, f]),
);

/**
 * 부군의 인구 구성은 §8.6의 두 검산값을 재현하도록 맞췄다:
 *   인구 가중 저항 28.2 (사양서 27.9) / 정치 가중 저항 37.2 (사양서 37.2)
 * — 저항이 수렴값에 있을 때 기준. §8.6이 "농민 84%"라고 밝힌 것과도 일치한다.
 */
export const HEXES: Hex[] = [
  {
    id: "varmegye",
    labelKo: "헝가리 부군",
    kind: "varmegye",
    crownlandId: "hungary",
    crownlandKo: "헝가리 왕국",
    regionId: "hungary",
    regionKo: "헝가리 본토",
    urbanity: 0,
    crownlandDelay: 2, // §3.1 헝가리 = 포조니/부다 2개월
    distanceBand: 1, // 중거리 → 총 7개월 (§3.4 헝가리 부군 6~8)
    population: 350_000,
    potentialRevenue: 60,
    initialReach: { p: 25, t: 35, f: 10 }, // §4.4 헝가리 본토
    composition: { "hu-noble": 8, "cath-clergy": 2, burgher: 6, peasant: 84 },
  },
  {
    id: "kreis",
    labelKo: "보헤미아 크라이스",
    kind: "kreis",
    crownlandId: "bohemia",
    crownlandKo: "보헤미아 왕관령",
    regionId: "bohemia",
    regionKo: "보헤미아",
    urbanity: 0,
    crownlandDelay: 1, // §3.1 프라하
    distanceBand: 0, // → 총 3개월 (§3.4 보헤미아 크라이스 3~4)
    population: 250_000,
    potentialRevenue: 120,
    initialReach: { p: 60, t: 75, f: 60 }, // §4.4 보헤미아·모라비아
    composition: { "cz-noble": 5, "cath-clergy": 2, burgher: 13, peasant: 80 },
  },
  {
    id: "province",
    labelKo: "네덜란드 주",
    kind: "province",
    crownlandId: "netherlands",
    crownlandKo: "오스트리아령 네덜란드",
    regionId: "netherlands",
    regionKo: "오스트리아령 네덜란드",
    urbanity: 0,
    crownlandDelay: 4, // §3.1 브뤼셀
    distanceBand: 0, // → 총 10개월 (§3.4 네덜란드 주 10~11)
    population: 200_000,
    potentialRevenue: 150,
    initialReach: { p: 30, t: 40, f: 65 }, // §4.4 오스트리아령 네덜란드
    composition: { "be-noble": 3, "cath-clergy": 3, burgher: 24, peasant: 70 },
  },
];

export const HEX_BY_ID: Record<string, Hex> = Object.fromEntries(HEXES.map((h) => [h.id, h]));

export const THREE_HEX = makeWorld("three-hex", "3헥스 검증 지도", HEXES, FACTIONS);
