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
  varmegye: 4,
  kreis: 2,
  province: 6,
};

/** §3 1단계 + 2단계 + 3단계 */
export function diffusionMonths(
  crownlandDelay: number,
  kind: HexKind,
  distanceBand: number,
): number {
  return crownlandDelay + PENETRATION_MONTHS[kind] + distanceBand;
}

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
 * 설계 결정 B: 저항 초기값 전부 0.
 * "convergence" 로 바꾸면 §7.3 기준 계산(헝가리 부군 37.2)이 그대로 재현된다.
 */
export const RESISTANCE_START: "zero" | "convergence" = "zero";

// ─────────────────────────────────────── §9 저항 상승

/** §9.1 규모계수 */
export const TIER_SCALE: Record<number, number> = { 1: 1.0, 2: 1.6, 3: 2.4, 4: 3.5 };

/** §9.1 저항 상승 = 규모계수 × 이해충돌도 × k */
export function resistanceRise(tier: number, conflict: number, k = K_RESISTANCE): number {
  return TIER_SCALE[tier] * conflict * k;
}

// ─────────────────────────────────────── §15.2 미결 항목의 잠정 기본값

/**
 * §7.1 "헥스 세력저항"의 해석. 사양서가 두 가지로 쓰고 있어 토글로 둔다.
 *   "hex"     — 헥스의 전 세력을 정치 배율로 집계 (§7.1/§7.3/§8.6 방식)
 *   "opposed" — 그 칙령에 충돌도 > 0 인 세력만 집계 (§9.2/§9.3 방식)
 * §9.2 는 `p = 0.206 × (1−0.60) × 1.05` 로 헝가리계 "귀족" 저항 60 을 헥스
 * 저항 자리에 그대로 넣는데, 같은 상태의 헥스 집계 저항은 §8.6 기준 37.2 다.
 * 두 값이 다르므로 §9.2·§9.3·§17 의 결론은 "opposed" 에서만 성립한다.
 */
export const RESISTANCE_SCOPE: "hex" | "opposed" = "hex";

/**
 * 관철 판정 기준 (§15.2 미정). 확산이 끝난 시점에 가중 헥스의 이 비율 이상이
 * 반포완료면 "관철"로 보고 §5.3 권위 보너스를 1회 지급한다. 네덜란드 10~11개월
 * 때문에 전부-아니면-전무는 위험하다는 사양서 지적에 따라 비율 방식을 쓴다.
 */
export const ENACTMENT_THRESHOLD = 0.5;
