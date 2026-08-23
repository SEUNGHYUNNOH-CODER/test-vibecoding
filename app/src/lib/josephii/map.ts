/**
 * 플레이용 축약 지도 — 25헥스 / 14 중간계층 / 33 세력.
 *
 * §2.2의 실제 규모는 약 190헥스이고 그 데이터 작성은 §16.2(20~35시간)로
 * 남아 있다. 이 지도는 전 왕관령 8개와 헥스 유형 6종을 모두 포함하도록
 * 축약한 것으로, 메커니즘은 실제 지도와 동일하게 돌아간다. 헥스를 늘리는
 * 작업은 이 파일에 행을 추가하는 것뿐이다.
 *
 * 인구는 1787년 조사 규모(약 2,300만)에 맞춘 근사치(단위 천 명), 잠재 세수는
 * 인구 × 왕관령별 부유도의 상대값이다. 확정치가 아니다.
 *
 * 세력은 §8.3의 45개 조합을 33개로 줄였다. 가톨릭 성직자를 문화권별로
 * 쪼개지 않고 하나로 합친 것이 가장 큰 축약이다 — §8.5에서 전 문화권이
 * 같은 수렴값(50~55)을 갖고 §10의 충돌도도 동일하기 때문이다.
 */
import type { Axes, Faction, Hex, HexKind } from "./types.ts";
import { URBANITY_REACH_BONUS, clamp01to100 } from "./rules.ts";
import { makeWorld } from "./world.ts";

export const FACTIONS: Faction[] = [
  // 귀족 (§8.3 7개)
  { id: "de-noble", labelKo: "독일계 귀족", estate: "noble", convergence: 35 },
  { id: "cz-noble", labelKo: "체코계 귀족", estate: "noble", convergence: 40 },
  { id: "hu-noble", labelKo: "헝가리계 귀족", estate: "noble", convergence: 60 },
  { id: "hr-noble", labelKo: "크로아티아계 귀족", estate: "noble", convergence: 50 },
  { id: "pl-noble", labelKo: "폴란드계 귀족", estate: "noble", convergence: 55 },
  { id: "it-noble", labelKo: "이탈리아계 귀족", estate: "noble", convergence: 42 },
  { id: "be-noble", labelKo: "벨기에 귀족", estate: "noble", convergence: 55 },
  // 도시민 (§8.3 8개 → 6개)
  { id: "de-burgher", labelKo: "독일계 도시민", estate: "burgher", convergence: 22 },
  { id: "cz-burgher", labelKo: "체코계 도시민", estate: "burgher", convergence: 22 },
  { id: "hu-burgher", labelKo: "헝가리계 도시민", estate: "burgher", convergence: 22 },
  { id: "it-burgher", labelKo: "이탈리아계 도시민", estate: "burgher", convergence: 42 },
  { id: "be-burgher", labelKo: "벨기에 도시민", estate: "burgher", convergence: 55 },
  { id: "jew-burgher", labelKo: "유대계 도시민", estate: "burgher", convergence: 18 },
  // 농민 (§8.3 13개)
  { id: "de-peasant", labelKo: "독일계 농민", estate: "peasant", convergence: 25 },
  { id: "tirol-peasant", labelKo: "티롤 농민", estate: "peasant", convergence: 55 },
  { id: "cz-peasant", labelKo: "체코계 농민", estate: "peasant", convergence: 25 },
  { id: "hu-peasant", labelKo: "헝가리계 농민", estate: "peasant", convergence: 25 },
  { id: "sk-peasant", labelKo: "슬로바키아계 농민", estate: "peasant", convergence: 25 },
  { id: "hr-peasant", labelKo: "크로아티아계 농민", estate: "peasant", convergence: 25 },
  { id: "sr-peasant", labelKo: "세르비아계 농민", estate: "peasant", convergence: 28 },
  { id: "ro-peasant", labelKo: "루마니아계 농민", estate: "peasant", convergence: 28 },
  { id: "ru-peasant", labelKo: "루테니아계 농민", estate: "peasant", convergence: 25 },
  { id: "pl-peasant", labelKo: "폴란드계 농민", estate: "peasant", convergence: 25 },
  { id: "sl-peasant", labelKo: "슬로베니아계 농민", estate: "peasant", convergence: 25 },
  { id: "it-peasant", labelKo: "이탈리아계 농민", estate: "peasant", convergence: 25 },
  { id: "fl-peasant", labelKo: "플라망계 농민", estate: "peasant", convergence: 30 },
  // 성직자 (§8.3 17개 → 7개. 가톨릭은 문화권 통합)
  { id: "cath-clergy", labelKo: "가톨릭 성직자", estate: "clergy", convergence: 52 },
  { id: "luth-clergy", labelKo: "루터파 성직자", estate: "clergy", convergence: 25 },
  { id: "calv-clergy", labelKo: "칼뱅파 성직자", estate: "clergy", convergence: 25 },
  { id: "unit-clergy", labelKo: "유니테리언 성직자", estate: "clergy", convergence: 25 },
  { id: "ortho-clergy", labelKo: "정교회 성직자", estate: "clergy", convergence: 30 },
  { id: "gcath-clergy", labelKo: "그리스가톨릭 성직자", estate: "clergy", convergence: 35 },
  { id: "jew-clergy", labelKo: "유대교 성직자", estate: "clergy", convergence: 18 },
];

/**
 * §2.4 — 종교·언어 구성은 중간계층 해상도로 근사한다.
 * 값은 인구 비중(%)이며 각 지역 합이 100이다.
 */
const REGION_COMPOSITION: Record<string, Record<string, number>> = {
  "lower-austria": { "de-noble": 3, "cath-clergy": 2, "de-burgher": 16, "jew-burgher": 1, "de-peasant": 78 },
  "upper-austria": { "de-noble": 3, "cath-clergy": 2, "de-burgher": 10, "de-peasant": 85 },
  bohemia: { "cz-noble": 2, "de-noble": 1, "cath-clergy": 2, "cz-burgher": 8, "de-burgher": 4, "jew-burgher": 1, "cz-peasant": 70, "de-peasant": 12 },
  moravia: { "cz-noble": 2, "de-noble": 1, "cath-clergy": 2, "cz-burgher": 6, "de-burgher": 4, "jew-burgher": 1, "cz-peasant": 65, "de-peasant": 19 },
  "inner-austria": { "de-noble": 2, "cath-clergy": 2, "de-burgher": 8, "sl-peasant": 50, "de-peasant": 38 },
  tirol: { "de-noble": 1, "cath-clergy": 3, "de-burgher": 8, "tirol-peasant": 78, "it-peasant": 10 },
  "hungary-west": { "hu-noble": 6, "cath-clergy": 2, "hu-burgher": 6, "de-burgher": 3, "jew-burgher": 1, "hu-peasant": 55, "sk-peasant": 15, "hr-peasant": 7, "de-peasant": 5 },
  "hungary-east": { "hu-noble": 8, "cath-clergy": 1, "calv-clergy": 1, "hu-burgher": 5, "jew-burgher": 1, "hu-peasant": 60, "sk-peasant": 10, "ro-peasant": 8, "ru-peasant": 6 },
  croatia: { "hr-noble": 5, "cath-clergy": 2, "ortho-clergy": 2, "hu-burgher": 2, "hr-peasant": 70, "sr-peasant": 19 },
  "military-frontier": { "hr-noble": 1, "cath-clergy": 2, "ortho-clergy": 4, "hr-peasant": 40, "sr-peasant": 45, "ro-peasant": 8 },
  transylvania: { "hu-noble": 4, "cath-clergy": 1, "calv-clergy": 2, "unit-clergy": 1, "ortho-clergy": 2, "gcath-clergy": 2, "hu-burgher": 3, "de-burgher": 3, "jew-burgher": 1, "hu-peasant": 20, "ro-peasant": 55, "de-peasant": 6 },
  galicia: { "pl-noble": 6, "cath-clergy": 2, "gcath-clergy": 2, "jew-clergy": 1, "jew-burgher": 6, "pl-peasant": 45, "ru-peasant": 38 },
  lombardy: { "it-noble": 3, "cath-clergy": 3, "it-burgher": 20, "it-peasant": 74 },
  netherlands: { "be-noble": 2, "cath-clergy": 4, "be-burgher": 30, "fl-peasant": 64 },
};

export const REGION_LABEL: Record<string, string> = {
  "lower-austria": "하오스트리아",
  "upper-austria": "상오스트리아",
  bohemia: "보헤미아",
  moravia: "모라비아·슐레지엔",
  "inner-austria": "내오스트리아",
  tirol: "티롤",
  "hungary-west": "헝가리 서부",
  "hungary-east": "헝가리 동부",
  croatia: "크로아티아·슬라보니아",
  "military-frontier": "군사국경",
  transylvania: "트란실바니아",
  galicia: "갈리치아",
  lombardy: "롬바르디아",
  netherlands: "오스트리아령 네덜란드",
};

/** §4.4 왕관령별 시작 도달률 */
const CROWNLAND_REACH: Record<string, Axes> = {
  austria: { p: 75, t: 80, f: 70 },
  bohemia: { p: 60, t: 75, f: 60 },
  hungary: { p: 25, t: 35, f: 10 },
  frontier: { p: 70, t: 75, f: 5 },
  transylvania: { p: 20, t: 25, f: 12 },
  galicia: { p: 25, t: 30, f: 25 },
  lombardy: { p: 45, t: 50, f: 55 },
  netherlands: { p: 30, t: 40, f: 65 },
};

const CROWNLAND_LABEL: Record<string, string> = {
  austria: "오스트리아 세습령",
  bohemia: "보헤미아 왕관령",
  hungary: "헝가리 왕국",
  frontier: "군사국경지대",
  transylvania: "트란실바니아 대공국",
  galicia: "갈리치아",
  lombardy: "롬바르디아",
  netherlands: "오스트리아령 네덜란드",
};

/**
 * §2.6 판무관 배치 단위. 원안 190헥스에서 중간계층 30개 = 계층당 6.33헥스였다.
 * 1785년 10개 관구는 헝가리 재편의 산물이고 왕실 판무관은 거기 배치되었다 —
 * 다른 왕관령에는 없었다. 따라서 전 왕관령에 둘 필요가 없다.
 *
 * 헝가리 2개(3헥스씩) + 보헤미아 1개(4) + 오스트리아 1개(6) = 4개 / 16헥스,
 * 계층당 4.0. 나머지 9헥스는 왕관령 자체가 단위(1~3헥스)다.
 */
const COMMAND_LABEL: Record<string, string> = {
  "hu-command-west": "헝가리 서부 관구",
  "hu-command-east": "헝가리 동부 관구",
  "bohemia-command": "보헤미아 관구",
  "austria-command": "오스트리아 관구",
};

interface Row {
  id: string;
  labelKo: string;
  kind: HexKind;
  crownlandId: string;
  regionId: string;
  /** 생략하면 왕관령 자체가 판무관 단위가 된다 */
  command?: string;
  /** §3.1 빈 → 왕관령 행정 중심 지연 */
  delay: number;
  band: 0 | 1 | 2;
  urbanity: 0 | 1 | 2 | 3;
  /** 천 명 */
  pop: number;
  rev: number;
}

const ROWS: Row[] = [
  { id: "no-1", labelKo: "빈 운터비너발트", kind: "kreis", crownlandId: "austria", regionId: "lower-austria", delay: 0, band: 0, urbanity: 0, pop: 500, rev: 600, command: "austria-command" },
  { id: "no-2", labelKo: "빈 오버비너발트", kind: "kreis", crownlandId: "austria", regionId: "lower-austria", delay: 0, band: 0, urbanity: 0, pop: 500, rev: 600, command: "austria-command" },
  { id: "oo-1", labelKo: "상오스트리아 하우스루크", kind: "kreis", crownlandId: "austria", regionId: "upper-austria", delay: 0, band: 1, urbanity: 0, pop: 600, rev: 700, command: "austria-command" },
  { id: "bo-1", labelKo: "프라하 크라이스", kind: "kreis", crownlandId: "bohemia", regionId: "bohemia", delay: 1, band: 0, urbanity: 0, pop: 970, rev: 1100, command: "bohemia-command" },
  { id: "bo-2", labelKo: "필젠 크라이스", kind: "kreis", crownlandId: "bohemia", regionId: "bohemia", delay: 1, band: 1, urbanity: 0, pop: 970, rev: 1050, command: "bohemia-command" },
  { id: "bo-3", labelKo: "쾨니히그레츠 크라이스", kind: "kreis", crownlandId: "bohemia", regionId: "bohemia", delay: 1, band: 1, urbanity: 0, pop: 960, rev: 1050, command: "bohemia-command" },
  { id: "ma-1", labelKo: "모라비아·슐레지엔 크라이스", kind: "kreis", crownlandId: "bohemia", regionId: "moravia", delay: 1, band: 1, urbanity: 0, pop: 1300, rev: 1400, command: "bohemia-command" },
  { id: "io-1", labelKo: "슈타이어마르크 크라이스", kind: "kreis", crownlandId: "austria", regionId: "inner-austria", delay: 1, band: 0, urbanity: 0, pop: 550, rev: 620, command: "austria-command" },
  { id: "io-2", labelKo: "크라인·케른텐 크라이스", kind: "kreis", crownlandId: "austria", regionId: "inner-austria", delay: 1, band: 1, urbanity: 0, pop: 550, rev: 600, command: "austria-command" },
  { id: "ti-1", labelKo: "티롤 구역", kind: "kreis", crownlandId: "austria", regionId: "tirol", delay: 1, band: 2, urbanity: 0, pop: 600, rev: 650, command: "austria-command" },
  { id: "hu-1", labelKo: "포조니 부군", kind: "varmegye", crownlandId: "hungary", regionId: "hungary-west", delay: 2, band: 0, urbanity: 3, pop: 1300, rev: 900, command: "hu-command-west" },
  { id: "hu-2", labelKo: "페슈트 부군", kind: "varmegye", crownlandId: "hungary", regionId: "hungary-west", delay: 2, band: 1, urbanity: 3, pop: 1300, rev: 900, command: "hu-command-west" },
  { id: "hu-3", labelKo: "셀메츠바냐 광산부군", kind: "varmegye", crownlandId: "hungary", regionId: "hungary-west", delay: 2, band: 1, urbanity: 2, pop: 1300, rev: 950, command: "hu-command-west" },
  { id: "hu-4", labelKo: "데브레첸 부군", kind: "varmegye", crownlandId: "hungary", regionId: "hungary-east", delay: 2, band: 2, urbanity: 2, pop: 1300, rev: 850, command: "hu-command-east" },
  { id: "hu-5", labelKo: "티서 좌안 부군", kind: "varmegye", crownlandId: "hungary", regionId: "hungary-east", delay: 2, band: 2, urbanity: 0, pop: 1300, rev: 800, command: "hu-command-east" },
  { id: "hr-1", labelKo: "자그레브 부군", kind: "varmegye", crownlandId: "hungary", regionId: "croatia", delay: 2, band: 1, urbanity: 1, pop: 700, rev: 450, command: "hu-command-east" },
  { id: "mg-1", labelKo: "국경연대구", kind: "military-frontier", crownlandId: "frontier", regionId: "military-frontier", delay: 2, band: 1, urbanity: 0, pop: 700, rev: 200 },
  { id: "si-1", labelKo: "트란실바니아 부군", kind: "varmegye", crownlandId: "transylvania", regionId: "transylvania", delay: 3, band: 1, urbanity: 1, pop: 500, rev: 320 },
  { id: "si-2", labelKo: "작센 의석", kind: "saxon-seat", crownlandId: "transylvania", regionId: "transylvania", delay: 3, band: 1, urbanity: 2, pop: 500, rev: 350 },
  { id: "si-3", labelKo: "세케이 의석", kind: "szekely-seat", crownlandId: "transylvania", regionId: "transylvania", delay: 3, band: 2, urbanity: 0, pop: 500, rev: 300 },
  { id: "ga-1", labelKo: "서갈리치아 크라이스", kind: "kreis", crownlandId: "galicia", regionId: "galicia", delay: 3, band: 1, urbanity: 0, pop: 1500, rev: 900 },
  { id: "ga-2", labelKo: "동갈리치아 크라이스", kind: "kreis", crownlandId: "galicia", regionId: "galicia", delay: 3, band: 2, urbanity: 0, pop: 1500, rev: 850 },
  { id: "lo-1", labelKo: "롬바르디아 주", kind: "province", crownlandId: "lombardy", regionId: "lombardy", delay: 3, band: 0, urbanity: 0, pop: 1100, rev: 1750 },
  { id: "nl-1", labelKo: "브라반트 주", kind: "province", crownlandId: "netherlands", regionId: "netherlands", delay: 4, band: 0, urbanity: 0, pop: 1100, rev: 2000 },
  { id: "nl-2", labelKo: "플랑드르 주", kind: "province", crownlandId: "netherlands", regionId: "netherlands", delay: 4, band: 1, urbanity: 0, pop: 1100, rev: 1950 },
];

const HEXES: Hex[] = ROWS.map((r) => {
  const base = CROWNLAND_REACH[r.crownlandId];
  const bonus = URBANITY_REACH_BONUS[r.urbanity];
  return {
    id: r.id,
    labelKo: r.labelKo,
    kind: r.kind,
    crownlandId: r.crownlandId,
    crownlandKo: CROWNLAND_LABEL[r.crownlandId],
    regionId: r.regionId,
    regionKo: REGION_LABEL[r.regionId],
    commandId: r.command ?? r.crownlandId,
    commandKo: r.command ? COMMAND_LABEL[r.command] : CROWNLAND_LABEL[r.crownlandId],
    urbanity: r.urbanity,
    crownlandDelay: r.delay,
    distanceBand: r.band,
    population: r.pop * 1000,
    potentialRevenue: r.rev,
    initialReach: {
      p: clamp01to100(base.p + bonus.p),
      t: clamp01to100(base.t + bonus.t),
      f: clamp01to100(base.f + bonus.f),
    },
    composition: REGION_COMPOSITION[r.regionId],
  };
});

const HEX_BY_ID_LOCAL: Record<string, Hex> = Object.fromEntries(HEXES.map((h) => [h.id, h]));

export const MONARCHY = makeWorld("monarchy-25", "합스부르크 군주국 (축약 25헥스)", HEXES, FACTIONS);

/** 왕관령 목록 — 부분 철회·황제 순행의 대상 */
export const CROWNLANDS = Object.entries(CROWNLAND_LABEL).map(([id, labelKo]) => ({
  id,
  labelKo,
  hexIds: HEXES.filter((h) => h.crownlandId === id).map((h) => h.id),
}));

/** 구성 해상도 단위 — 표시용 */
export const REGIONS = Object.entries(REGION_LABEL).map(([id, labelKo]) => ({
  id,
  labelKo,
  hexIds: HEXES.filter((h) => h.regionId === id).map((h) => h.id),
}));

/** §2.6 판무관 배치 단위 — 중간계층 4개 + 나머지 왕관령 */
export const COMMANDS = [...new Set(HEXES.map((h) => h.commandId))].map((id) => {
  const hexIds = HEXES.filter((h) => h.commandId === id).map((h) => h.id);
  return { id, labelKo: HEX_BY_ID_LOCAL[hexIds[0]].commandKo, hexIds };
});

export const HEX_KIND_LABEL: Record<HexKind, string> = {
  varmegye: "부군",
  kreis: "크라이스·피어텔",
  "saxon-seat": "작센 의석",
  "szekely-seat": "세케이 의석",
  "military-frontier": "국경연대구",
  province: "주",
};

/** §2.3 — 지도상 같은 칸으로 보이지만 왕권과의 관계가 정반대다 */
export const HEX_KIND_NOTE: Record<HexKind, string> = {
  varmegye: "귀족 총회가 수장을 선출한다. 왕명이 법에 어긋난다고 판단하면 공포를 거부할 관습적 권리(vis inertiae)를 갖는다.",
  kreis: "중앙이 장관(Kreishauptmann)을 임명한다. 왕권의 팔이다.",
  "saxon-seat": "단체 자치(Universitas)와 특허장을 보유한다.",
  "szekely-seat": "집단 귀족 신분. 병역 대가로 면세를 누린다.",
  "military-frontier": "궁정군사회의 직할. 민정이 없고 세금 대신 병역을 낸다.",
  province: "신분제 의회가 헌장을 보유한다. 협상 대상이다.",
};
