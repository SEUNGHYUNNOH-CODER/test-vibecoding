/**
 * 요제프 2세 개혁 시뮬레이션 — 계산 코어 타입 (설계 사양서 버전1)
 *
 * 설계 결정 A (사양서 §4.1 vs §10 모순 해소):
 *   사양서 §4.1은 P/T/F를 비율("도달한 헥스 / 전체 헥스")로 정의하지만
 *   §10은 칙령마다 가산값(T +12, P −9)을 부여한다. 비율 정의에서는 가산도
 *   음수도 성립하지 않으므로, 실제로 모든 계산(§4.4/§7.3/§9.2/§10.9)이
 *   전제하는 가산 모델로 확정한다.
 *     - 칙령이 헥스에서 관철되면 그 헥스의 P/T/F에 명목값을 가산 (0~100 클램프)
 *     - 국가 P/T/F = 헥스값의 가중평균 (P는 인구, T는 헥스 수, F는 잠재 세수)
 *   이 구조에서 §10.9의 "실효 도달 40~60%"는 별도 규칙 없이 도출된다.
 *
 * 설계 결정 B: (헥스 × 세력) 저항 초기값은 전부 0.
 *   사양서 §7.3의 기준 계산(헝가리 부군 저항 37.2)은 초기값 = 수렴값을
 *   전제하므로, 0 초기값은 그 기준선과 어긋난다. RESISTANCE_START 상수로
 *   두 방식을 전환할 수 있게 해 두었다 (rules.ts).
 */

/** 도달률 3축 (§4.1) — 가산 모델. 각 0~100. */
export interface Axes {
  p: number;
  t: number;
  f: number;
}

/** §8.1 계층. 수렴속도(§8.4)·연대계수(§8.4)·정치배율(§8.6)이 여기에 걸린다. */
export type Estate = "noble" | "clergy" | "burgher" | "peasant";

/** §2.3 헥스 유형. 3헥스 검증에 필요한 3종만. */
export type HexKind = "varmegye" | "kreis" | "province";

/** §8.1 세력 = 문화권 × 계층. */
export interface Faction {
  id: string;
  labelKo: string;
  estate: Estate;
  /** §8.5 저항 수렴값 */
  convergence: number;
}

export interface Hex {
  id: string;
  labelKo: string;
  kind: HexKind;
  /** §3.1 빈 → 왕관령 행정 중심 지연 (개월) */
  crownlandDelay: number;
  /** §3.3 거리대 보정: 근 0 / 중 1 / 원 2 (개월) */
  distanceBand: 0 | 1 | 2;
  population: number;
  potentialRevenue: number;
  /** §4.4 왕관령별 시작 도달률 */
  initialReach: Axes;
  /** 세력별 인구 비중 (%). 합 100. */
  composition: Record<string, number>;
}

/** §9.1 이해충돌도. 계층 기본값 위에 세력별 예외를 덮는다. */
export interface ConflictSpec {
  byEstate?: Partial<Record<Estate, number>>;
  byFaction?: Record<string, number>;
}

export interface Edict {
  id: string;
  labelKo: string;
  /** §10 영역 1~7 */
  area: number;
  /** §10 단계 1~4 — 비용(§6.2)·규모계수(§9.1)·권위 변동(§5.3)의 기준 */
  tier: 1 | 2 | 3 | 4;
  /** §10 P/T/F 명목 기여 */
  gain: Axes;
  conflict: ConflictSpec;
}

/** 한 헥스에서의 칙령 진행 상태 (§7.2 3라운드 판정) */
export interface HexEdictProgress {
  arrivalRound: number;
  attemptsLeft: number;
  status: "in-transit" | "pending" | "enacted" | "failed";
}

export interface ActiveEdict {
  edictId: string;
  promulgatedRound: number;
  byHex: Record<string, HexEdictProgress>;
  /** 모든 헥스의 판정이 끝나면 false — 유지비(§6.2)가 여기서 멈춘다 */
  inProgress: boolean;
  /** §5.3 관철 보너스를 이미 정산했는가 */
  settled: boolean;
}

export interface HexState {
  reach: Axes;
  /** 세력 id → 저항 0~100 (§8.4) */
  resistance: Record<string, number>;
}

export interface GameState {
  round: number;
  authority: number;
  capacity: number;
  hexes: Record<string, HexState>;
  active: ActiveEdict[];
  /** 국가 집계 도달률 (§4.4 집계 가중치) */
  national: Axes;
  /** §7.1 저항 해석 (rules.ts RESISTANCE_SCOPE 참조) */
  resistanceScope: "hex" | "opposed";
  /** §9.1 난이도 상수 k */
  k: number;
  /** §10 도달률 기여 축별 배율 */
  gainScale: Axes;
  log: string[];
}
