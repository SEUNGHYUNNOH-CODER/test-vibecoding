/**
 * 사양서의 상수와 공식을 그대로 옮긴 층. 모든 항목에 § 출처를 단다.
 * 잠정치이므로 3헥스 검증 결과에 따라 여기만 고치면 된다.
 */
import type { Axes, Estate, HexKind } from "./types.ts";

/** §9.1 전체 난이도 조정 상수 — 사양서가 지정한 유일한 손잡이 */
export const K_RESISTANCE = 1.0;

/**
 * §4.2 통합 공식. 사양서 본문은 ((P+2)(T+2)(F+2))^(1/3) − 2 로 적혀 있으나
 * §4.2 표·§4.4·§7.3·§9.2의 모든 수치는 완충 없는 (P·T·F)^(1/3) 로 계산되어
 * 있다 (100/100/10 에서 47.98 vs 46.4 로 갈린다). 실제 사용되는 쪽을 채택하고
 * 완충 변형은 상수로 남긴다.
 */
export const REACH_BUFFER = 0;

export function reachScore(a: Axes): number {
  const b = REACH_BUFFER;
  const p = clamp01to100(a.p) + b;
  const t = clamp01to100(a.t) + b;
  const f = clamp01to100(a.f) + b;
  return Math.cbrt(p * t * f) - b;
}

export function clamp01to100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// ─────────────────────────────────────── §3 확산

/** §3.2 행정 중심 → 헥스 침투 (개월) */
export const PENETRATION_MONTHS: Record<HexKind, number> = {
  "military-frontier": 1,
  kreis: 2,
  varmegye: 4,
  "saxon-seat": 6,
  "szekely-seat": 6,
  province: 6,
};

/** §2.5 도시성에 따른 부군 침투 단축 (헝가리 권역 한정) */
const URBANITY_PENETRATION: Record<number, number> = { 0: 4, 1: 3.5, 2: 3, 3: 2 };

/** §3 1단계 + 2단계 + 3단계. 부군만 도시성 보정을 받는다. */
export function diffusionMonths(
  crownlandDelay: number,
  kind: HexKind,
  distanceBand: number,
  urbanity = 0,
): number {
  const penetration =
    kind === "varmegye" ? URBANITY_PENETRATION[urbanity] : PENETRATION_MONTHS[kind];
  return Math.ceil(crownlandDelay + penetration + distanceBand);
}

/** §2.5 도시성에 따른 도달률 기초값 보정 */
export const URBANITY_REACH_BONUS: Record<number, Axes> = {
  0: { p: 0, t: 0, f: 0 },
  1: { p: 0, t: 0, f: 8 },
  2: { p: 3, t: 0, f: 15 },
  3: { p: 6, t: 5, f: 25 },
};

// ─────────────────────────────────────── §5 권위

export const AUTHORITY_START = 60;
/** §5.1 매월 변동 = (50 − 현재) × 0.025 */
export const AUTHORITY_ANCHOR = 50;
export const AUTHORITY_PULL = 0.025;

export function authorityDrift(authority: number): number {
  return (AUTHORITY_ANCHOR - authority) * AUTHORITY_PULL;
}

/**
 * §5.2 집행률 계수. 표의 5개 기준점은 단일 직선으로 이어지지 않으므로
 * (50→1.0 과 60→1.05 의 기울기는 100→1.3 과 맞지 않는다) 구간별 선형
 * 보간으로 표를 그대로 재현한다.
 */
const AUTHORITY_COEF_ANCHORS: Array<[number, number]> = [
  [0, 0.4],
  [20, 0.6],
  [50, 1.0],
  [60, 1.05],
  [100, 1.3],
];

export function authorityCoefficient(authority: number): number {
  const a = clamp01to100(authority);
  for (let i = 1; i < AUTHORITY_COEF_ANCHORS.length; i++) {
    const [x1, y1] = AUTHORITY_COEF_ANCHORS[i - 1];
    const [x2, y2] = AUTHORITY_COEF_ANCHORS[i];
    if (a <= x2) return y1 + ((a - x1) / (x2 - x1)) * (y2 - y1);
  }
  return 1.3;
}

/** §5.3 칙령 관철 / 철회 시 권위 변동 */
export const AUTHORITY_ON_ENACT: Record<number, number> = { 1: 2, 2: 4, 3: 6, 4: 9 };
export const AUTHORITY_ON_WITHDRAW: Record<number, number> = { 1: -4, 2: -7, 3: -11, 4: -16 };

// ─────────────────────────────────────── §6 여력

export const CAPACITY_CAP = 100;

/**
 * §6.1 시작 재고. 유입만으로는 13.2 < 단계1 비용 15 라서 첫 달에 아무것도
 * 할 수 없었다. 요제프는 단독 통치 첫 12개월에 400건 이상을 발부했으므로
 * 즉시 행동 가능한 것이 맞다.
 */
export const CAPACITY_START = 28;

/** §6.1 매월 유입 = 12 × (0.5 + 권위/100) */
export function capacityInflow(authority: number): number {
  return 12 * (0.5 + clamp01to100(authority) / 100);
}

/** §6.2 반포 비용 / 진행 중 월 유지비 */
export const EDICT_COST: Record<number, number> = { 1: 15, 2: 30, 3: 50, 4: 75 };
export const EDICT_UPKEEP: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4 };

// ─────────────────────────────────────── §7 집행률

/** §7.1 — 헥스유형계수·도시성보정은 §15.1에 따라 1.0 고정 */
export function enforcementRate(
  hexReach: number,
  hexResistance: number,
  authority: number,
  actionMultiplier = 1,
): number {
  const p =
    (hexReach / 100) *
    (1 - clamp01to100(hexResistance) / 100) *
    authorityCoefficient(authority) *
    actionMultiplier;
  return Math.max(0, Math.min(1, p));
}

/** §7.2 3라운드 성공률 = 1 − (1−p)³ */
export const ENACT_ATTEMPTS = 3;

export function threeRoundSuccess(p: number): number {
  return 1 - Math.pow(1 - p, ENACT_ATTEMPTS);
}

// ─────────────────────────────────────── §8 세력

/** §8.4 수렴속도 (계층별) */
export const CONVERGENCE_SPEED: Record<Estate, number> = {
  noble: 0.01,
  clergy: 0.015,
  burgher: 0.025,
  peasant: 0.04,
};

/** §8.4 연대계수 (지역 간 확산) */
export const SOLIDARITY: Record<Estate, number> = {
  noble: 0.03,
  clergy: 0.025,
  burgher: 0.012,
  peasant: 0.004,
};

/** §8.6 정치 배율 — 집행 저항 집계에만 쓴다. 인구 도달률에는 인구 비중을 쓴다. */
export const POLITICAL_WEIGHT: Record<Estate, number> = {
  noble: 6,
  clergy: 4,
  burgher: 2,
  peasant: 1,
};

/**
 * 저항 초기값 = 수렴값. 각 세력은 요제프 이전부터 고유한 구조적 긴장을 갖고
 * 있고 개혁은 그 위에 얹힌다는 해석이다. §7.3 기준 계산(부군 37.2)이 이 값에서
 * 나온다. "zero" 로 두면 귀족 반감기 69개월 때문에 재위 전반이 저저항 구간이
 * 되어 "위험한 칙령을 먼저 낸다"가 지배 전략이 된다.
 */
export const RESISTANCE_START: "zero" | "convergence" = "convergence";

// ─────────────────────────────────────── §9 저항 상승

/** §9.1 규모계수 */
export const TIER_SCALE: Record<number, number> = { 1: 1.0, 2: 1.6, 3: 2.4, 4: 3.5 };

/** §9.1 저항 상승 = 규모계수 × 이해충돌도 × k */
export function resistanceRise(tier: number, conflict: number, k = K_RESISTANCE): number {
  return TIER_SCALE[tier] * conflict * k;
}

/**
 * §10 P/T/F 기여값의 축별 배율. 사양서 원값으로는 전력 반포 시 ΔR 이 §4.5
 * 기준선(+6)의 4배에 이르고, k 로는 교정되지 않는다(§9.2 자기제한이 k 를
 * 상쇄한다). T 를 더 깎아 §10.9 의 T축 편중(T/P 1.82배)도 함께 해소한다.
 *   축별 합계: P 68→20 / T 124→25 / F 81→24
 */
export const GAIN_SCALE: Axes = { p: 0.3, t: 0.2, f: 0.3 };

// ─────────────────────────────────────── §15.2 미결 항목의 잠정 기본값

/**
 * §7.1 "헥스 세력저항"의 해석. 사양서가 두 가지로 쓰고 있어 토글로 둔다.
 *   "hex"     — 헥스의 전 세력을 정치 배율로 집계 (§7.1/§7.3/§8.6 방식)
 *   "opposed" — 그 칙령에 충돌도 > 0 인 세력만 집계 (§9.2/§9.3 방식)
 * §9.2 는 `p = 0.206 × (1−0.60) × 1.05` 로 헝가리계 "귀족" 저항 60 을 헥스
 * 저항 자리에 그대로 넣는데, 같은 상태의 헥스 집계 저항은 §8.6 기준 37.2 다.
 * 두 값이 다르므로 §9.2·§9.3·§17 의 결론은 "opposed" 에서만 성립한다.
 */
export const RESISTANCE_SCOPE: "hex" | "opposed" = "opposed";

// ─────────────────────────────────────── §7.5 계열 C — 실패 헥스 부분 효과

/**
 * 집행 저지력은 정치 비중(귀족 ×6)으로, 소문 확산력은 인구 비중으로 잰다.
 * 같은 헥스에서 두 값이 정반대로 나온다 — 귀족이 공포를 거부해도 농민은
 * 이미 알고 있는 상태다. 요제프 시대에 실제로 벌어진 일이고, 1784년 호레아
 * 반란이 그 극단이다.
 *
 * 사양서의 "발동 임계 20"은 채택하지 않았다. 교구 재편·형법전·토지 측량이
 * 전부 20.5로 임계에 붙어 있어서, 다른 칙령이 농민 저항을 2만 올려도 부분
 * 효과가 통째로 꺼지는 절벽이 생긴다. 우호지지에 비례하는 연속 함수로 둔다.
 */
export const PARTIAL_GAMMA = 0.5;

/** 철회 시 배신 — 기대를 올렸다가 거두는 것이 처벌받는다 */
export const BETRAYAL_RESISTANCE = 8;

// ─────────────────────────────────────── §9 반란

/** §9.1 농민 반란 — 충격이 방아쇠다. 누적만으로는 반감기 17개월 때문에 안 터진다 */
export const PEASANT_REVOLT = {
  /** 최근 N라운드 */
  window: 6,
  /**
   * 그 안의 누적 저항 상승 임계.
   * 사양서 값 10 은 실측상 도달 불가였다 — 농민을 적대하는 칙령이 4개뿐이고
   * 최대 6라운드 충격이 7.2(예배·매장 규정 단독)에서 막힌다. 7 로 낮춰
   * 그 칙령 하나가 방아쇠가 되게 한다. §10.2 가 "단계4는 함정"이라 한 것과
   * 맞고, 관 재사용령이 6개월 만에 철회된 역사와도 맞다.
   */
  shock: 7,
  /**
   * 현재 저항 임계. 사양서 값 35 는 수렴값 25 바로 위라 거의 항상 충족되어
   * 조건으로 기능하지 못했다(실측 최대 56). 40 으로 올려 "이미 다른 이유로
   * 화가 나 있던 곳"에서만 터지게 한다.
   */
  level: 40,
  /** 발생 즉시 권위 (국가 단위, 일회성) */
  authorityHit: -8,
  /** 진행 중 반란 헥스 집행률 */
  enforcement: 0.2,
  /** 진행 중 반란 헥스 인구 도달 (월) */
  reachDrain: -1,
  /** 자연 소멸까지 */
  duration: 12,
  cooldown: 12,
} as const;

/** §9.2 도시민 혁명 — 브라반트형. 왕관령 전체가 이탈한다 */
export const BURGHER_REVOLT = {
  level: 75,
  /** 임계 이상 유지 필요 라운드 */
  sustain: 3,
  authorityHit: -18,
  enforcement: 0.1,
  reachDrain: -1,
  /** 해소 조건: 이 값 이상 충돌하는 칙령을 그 왕관령에서 전부 철회 */
  revokeConflict: 2,
} as const;

/** §9.3 성직자 — 반란이 아니라 영역 차단 */
export const CLERGY_BLOCK = { level: 70, enforcement: 0.3, area: 1 } as const;

/** §9.1 진압 */
export const SUPPRESS = { cost: 25, resistance: -20, authority: -6, backlash: 10 } as const;

/**
 * 관철 판정 기준 (§15.2 미정). 확산이 끝난 시점에 가중 헥스의 이 비율 이상이
 * 반포완료면 "관철"로 보고 §5.3 권위 보너스를 1회 지급한다. 네덜란드 10~11개월
 * 때문에 전부-아니면-전무는 위험하다는 사양서 지적에 따라 비율 방식을 쓴다.
 */
export const ENACTMENT_THRESHOLD = 0.5;
