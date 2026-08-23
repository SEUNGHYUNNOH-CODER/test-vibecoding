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

/** §2.3 헥스 유형 6종 */
export type HexKind =
  | "varmegye" // 부군 — 귀족 총회가 수장 선출. 왕권의 경쟁자
  | "kreis" // 크라이스·피어텔 — 중앙 임명. 왕권의 팔
  | "saxon-seat" // 작센 의석 — 단체 자치, 특허장 보유
  | "szekely-seat" // 세케이 의석 — 집단 귀족 신분, 병역 대가 면세
  | "military-frontier" // 국경연대구 — 군 직할. 민정 부재
  | "province"; // 주 — 신분제 의회, 헌장 보유

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
  /** §2.1 L1 왕관령 — 부분 철회·황제 순행의 단위 */
  crownlandId: string;
  crownlandKo: string;
  /**
   * §2.4 종교·문화권 구성의 해상도. 판무관 배치 단위와는 다르다 —
   * 구성은 세밀할수록 좋고, 배치 단위는 §2.6의 스케일 제약을 받는다.
   */
  regionId: string;
  regionKo: string;
  /** §2.6 판무관 배치 단위. 중간계층이 없는 왕관령은 왕관령 자체가 단위다. */
  commandId: string;
  commandKo: string;
  /** §2.5 도시성 0~3. 헝가리 권역만 유효, 그 밖은 0 */
  urbanity: 0 | 1 | 2 | 3;
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
  /** §10 표의 연도 — 서사 표시용 */
  year?: string;
  /** 사양서가 그 칙령에 붙인 설계 메모 */
  noteKo?: string;
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
  /** 실제로 가산된 도달률 — 철회 시 정확히 되돌리기 위해 기록한다 */
  appliedGain?: Axes;
  /** §7.5 계열 C 부분 효과로 가산된 P */
  partialGain?: number;
}

export interface ActiveEdict {
  edictId: string;
  promulgatedRound: number;
  byHex: Record<string, HexEdictProgress>;
  /** 모든 헥스의 판정이 끝나면 false — 유지비(§6.2)가 여기서 멈춘다 */
  inProgress: boolean;
  /** §5.3 관철 보너스를 이미 정산했는가 */
  settled: boolean;
  /** §11.3 철회된 왕관령 id 목록. 전면 철회면 모든 왕관령이 들어간다 */
  withdrawnFrom: string[];
}

/** §11.2 지속 효과 (왕실 판무관 등) */
export interface ActiveEffect {
  id: string;
  kind: "commissioner" | "official";
  labelKo: string;
  /** 판무관은 판무관 단위 id, 관리 교체는 헥스 id */
  targetId: string;
  targetKo: string;
  multiplier: number;
  /** 0 이면 무기한 상주 */
  untilRound: number;
  /** 월 유지비 */
  upkeep: number;
}

export interface LogEntry {
  round: number;
  text: string;
  tone?: "good" | "bad" | "event";
}

/** §5.1 — 자동 변동과 사건 변동을 분리해 보여줘야 하락이 벌로 오독되지 않는다 */
export interface AuthorityBreakdown {
  drift: number;
  events: number;
}

export interface HexState {
  reach: Axes;
  /** 세력 id → 저항 0~100 (§8.4) */
  resistance: Record<string, number>;
  /** §9.1 최근 6라운드 농민 저항 상승 — 충격이 방아쇠이지 누적이 아니다 */
  shock: number[];
  /** 이번 라운드에 쌓인 농민 저항 상승. 정산 때 shock 창으로 넘긴다 */
  shockPending: number;
  /** §9.2 도시민 저항이 임계 이상으로 유지된 연속 라운드 수 */
  burgherHigh: number;
}

/** §9 반란 — 계층마다 고저항의 결과가 다르다 */
export interface Revolt {
  id: string;
  kind: "peasant" | "burgher";
  labelKo: string;
  /** 봉기 중인 헥스. 도시민 혁명은 왕관령 전체 */
  hexIds: string[];
  crownlandId: string;
  startRound: number;
  /** 방아쇠가 된 칙령 — 부분 철회로 해소할 대상 */
  triggerEdictId?: string;
}

export interface GameState {
  worldId: string;
  round: number;
  authority: number;
  capacity: number;
  hexes: Record<string, HexState>;
  active: ActiveEdict[];
  effects: ActiveEffect[];
  /** 국가 집계 도달률 (§4.4 집계 가중치) */
  national: Axes;
  /** §7.1 저항 해석 (rules.ts RESISTANCE_SCOPE 참조) */
  resistanceScope: "hex" | "opposed";
  /** §9.1 난이도 상수 k */
  k: number;
  /** §10 도달률 기여 축별 배율 */
  gainScale: Axes;
  /** §2.5 적대 전환 — 도시 행정 개편이 관철되면 true, 도시성 보정이 반감된다 */
  urbanityHalved: boolean;
  authorityDelta: AuthorityBreakdown;
  /** §14.2 누적 판정 — 매 라운드 R 을 더한다 */
  cumulativeR: number;
  cumulativeRounds: number;
  /** 시작 시점 R — 판정 기준선 */
  startR: number;
  revolts: Revolt[];
  /** 헥스별 마지막으로 농민 저항을 올린 칙령 — 부분 철회 해소 대상 */
  lastTrigger: Record<string, string>;
  /** 헥스별 반란 재발 금지 해제 라운드 */
  revoltCooldown: Record<string, number>;
  /** 시드 고정 난수의 현재 상태 — 저장/복원에 필요 */
  rngState: number;
  log: LogEntry[];
  gameOver: boolean;
}
