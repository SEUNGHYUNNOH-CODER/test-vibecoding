/**
 * §1.1 4국면 라운드 루프. 순수 함수 + 주입된 난수원으로만 동작한다.
 * 난수는 반드시 시드 고정 — §14.2 리플레이와 밸런싱 재현이 여기 걸려 있다.
 */
import type { ActiveEdict, Axes, Edict, GameState, Hex } from "./types.ts";
import { EDICT_BY_ID } from "./edicts.ts";
import { FACTION_BY_ID, HEXES, HEX_BY_ID } from "./map-3hex.ts";
import {
  AUTHORITY_ON_ENACT,
  K_RESISTANCE,
  AUTHORITY_START,
  CAPACITY_CAP,
  CONVERGENCE_SPEED,
  EDICT_COST,
  EDICT_UPKEEP,
  ENACTMENT_THRESHOLD,
  ENACT_ATTEMPTS,
  POLITICAL_WEIGHT,
  RESISTANCE_SCOPE,
  RESISTANCE_START,
  SOLIDARITY,
  authorityDrift,
  capacityInflow,
  clamp01to100,
  diffusionMonths,
  enforcementRate,
  reachScore,
  resistanceRise,
} from "./rules.ts";

export const TOTAL_ROUNDS = 111; // §0.2

/** 시드 고정 난수 (mulberry32) */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createInitialState(
  opts: {
    resistanceStart?: "zero" | "convergence";
    resistanceScope?: "hex" | "opposed";
    k?: number;
    /** §10 P/T/F 기여값 전역 배율 — 결정 3의 손잡이 */
    gainScale?: number;
  } = {},
): GameState {
  const mode = opts.resistanceStart ?? RESISTANCE_START;
  const hexes: GameState["hexes"] = {};
  for (const hex of HEXES) {
    const resistance: Record<string, number> = {};
    for (const factionId of Object.keys(hex.composition)) {
      resistance[factionId] = mode === "zero" ? 0 : FACTION_BY_ID[factionId].convergence;
    }
    hexes[hex.id] = { reach: { ...hex.initialReach }, resistance };
  }
  const state: GameState = {
    round: 1,
    authority: AUTHORITY_START,
    capacity: 0,
    hexes,
    active: [],
    national: { p: 0, t: 0, f: 0 },
    resistanceScope: opts.resistanceScope ?? RESISTANCE_SCOPE,
    k: opts.k ?? K_RESISTANCE,
    gainScale: opts.gainScale ?? 1,
    log: [],
  };
  state.national = aggregateNational(state);
  return state;
}

/** §4.4 집계 가중치 — P는 인구, T는 헥스 수, F는 잠재 세수 */
export function aggregateNational(state: GameState): Axes {
  let popSum = 0;
  let pAcc = 0;
  let revSum = 0;
  let fAcc = 0;
  let tAcc = 0;
  for (const hex of HEXES) {
    const s = state.hexes[hex.id];
    pAcc += s.reach.p * hex.population;
    popSum += hex.population;
    fAcc += s.reach.f * hex.potentialRevenue;
    revSum += hex.potentialRevenue;
    tAcc += s.reach.t;
  }
  return { p: pAcc / popSum, t: tAcc / HEXES.length, f: fAcc / revSum };
}

/** §8.6 정치 배율로 집계한 헥스 저항 — 집행률에 쓰는 쪽 */
export function politicalResistance(state: GameState, hex: Hex): number {
  let num = 0;
  let den = 0;
  for (const [factionId, share] of Object.entries(hex.composition)) {
    const w = share * POLITICAL_WEIGHT[FACTION_BY_ID[factionId].estate];
    num += w * state.hexes[hex.id].resistance[factionId];
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

/** §8.6 인구 비중 집계 — 비교용 */
export function populationResistance(state: GameState, hex: Hex): number {
  let num = 0;
  let den = 0;
  for (const [factionId, share] of Object.entries(hex.composition)) {
    num += share * state.hexes[hex.id].resistance[factionId];
    den += share;
  }
  return den === 0 ? 0 : num / den;
}

/**
 * 그 칙령에 반대하는 세력(충돌도 > 0)만 정치 배율로 집계한다.
 * §9.2/§9.3 이 전제하는 저항 해석. 반대 세력이 없으면 0.
 */
export function opposedResistance(state: GameState, hex: Hex, edict: Edict): number {
  let num = 0;
  let den = 0;
  for (const [factionId, share] of Object.entries(hex.composition)) {
    if (conflictFor(edict, factionId) <= 0) continue;
    const w = share * POLITICAL_WEIGHT[FACTION_BY_ID[factionId].estate];
    num += w * state.hexes[hex.id].resistance[factionId];
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

/** §9.1 이해충돌도 조회 — 세력 예외가 계층 기본값을 덮는다 */
export function conflictFor(edict: Edict, factionId: string): number {
  const byFaction = edict.conflict.byFaction?.[factionId];
  if (byFaction !== undefined) return byFaction;
  const estate = FACTION_BY_ID[factionId].estate;
  return edict.conflict.byEstate?.[estate] ?? 0;
}

export function canPromulgate(state: GameState, edictId: string): boolean {
  const edict = EDICT_BY_ID[edictId];
  if (!edict) return false;
  if (state.active.some((a) => a.edictId === edictId)) return false;
  return state.capacity >= EDICT_COST[edict.tier];
}

export function promulgate(state: GameState, edictId: string): void {
  const edict = EDICT_BY_ID[edictId];
  state.capacity -= EDICT_COST[edict.tier];
  const byHex: ActiveEdict["byHex"] = {};
  for (const hex of HEXES) {
    byHex[hex.id] = {
      arrivalRound:
        state.round + diffusionMonths(hex.crownlandDelay, hex.kind, hex.distanceBand),
      attemptsLeft: ENACT_ATTEMPTS,
      status: "in-transit",
    };
  }
  state.active.push({
    edictId,
    promulgatedRound: state.round,
    byHex,
    inProgress: true,
    settled: false,
  });
  state.log.push(`R${state.round} 반포: ${edict.labelKo} (단계${edict.tier})`);
}

export type Policy = (state: GameState) => string | null;

export interface RoundReport {
  round: number;
  enacted: Array<{ edictId: string; hexId: string }>;
  failed: Array<{ edictId: string; hexId: string }>;
}

export function runRound(state: GameState, policy: Policy, rng: () => number): RoundReport {
  const report: RoundReport = { round: state.round, enacted: [], failed: [] };

  // ── 국면 1. 도달 (§1.1)
  for (const active of state.active) {
    for (const hex of HEXES) {
      const prog = active.byHex[hex.id];
      if (prog.status === "in-transit" && state.round >= prog.arrivalRound) {
        prog.status = "pending";
      }
    }
  }

  // ── 국면 2. 반응 — 반포 성공 판정 + 세력 저항 갱신
  for (const active of state.active) {
    const edict = EDICT_BY_ID[active.edictId];
    for (const hex of HEXES) {
      const prog = active.byHex[hex.id];
      if (prog.status !== "pending") continue;
      const hexState = state.hexes[hex.id];
      const resistance =
        (state.resistanceScope ?? RESISTANCE_SCOPE) === "opposed"
          ? opposedResistance(state, hex, edict)
          : politicalResistance(state, hex);
      const p = enforcementRate(reachScore(hexState.reach), resistance, state.authority);
      if (rng() < p) {
        prog.status = "enacted";
        applyEnactment(state, hex, edict);
        report.enacted.push({ edictId: edict.id, hexId: hex.id });
      } else {
        prog.attemptsLeft -= 1;
        if (prog.attemptsLeft <= 0) {
          prog.status = "failed"; // §7.2 영구 실패 — 재반포 액션으로만 재시도
          report.failed.push({ edictId: edict.id, hexId: hex.id });
        }
      }
    }
  }
  updateResistanceTracks(state);

  // ── 국면 3. 행동
  const choice = policy(state);
  if (choice && canPromulgate(state, choice)) promulgate(state, choice);

  // ── 국면 4. 정산
  let upkeep = 0;
  for (const active of state.active) {
    if (!active.inProgress) continue;
    const stillMoving = HEXES.some((h) => {
      const s = active.byHex[h.id].status;
      return s === "in-transit" || s === "pending";
    });
    if (stillMoving) {
      upkeep += EDICT_UPKEEP[EDICT_BY_ID[active.edictId].tier];
    } else {
      active.inProgress = false;
    }
  }
  state.authority = clamp01to100(state.authority + authorityDrift(state.authority));
  settleEnactments(state);
  state.capacity = Math.max(
    0,
    Math.min(CAPACITY_CAP, state.capacity + capacityInflow(state.authority) - upkeep),
  );
  state.national = aggregateNational(state);
  state.round += 1;
  return report;
}

/** 관철된 헥스에만 도달률 가산 + 저항 상승 (설계 결정 A, §9.1) */
function applyEnactment(state: GameState, hex: Hex, edict: Edict): void {
  const s = state.hexes[hex.id];
  const g = state.gainScale;
  s.reach = {
    p: clamp01to100(s.reach.p + edict.gain.p * g),
    t: clamp01to100(s.reach.t + edict.gain.t * g),
    f: clamp01to100(s.reach.f + edict.gain.f * g),
  };
  for (const factionId of Object.keys(hex.composition)) {
    const conflict = conflictFor(edict, factionId);
    if (conflict === 0) continue;
    s.resistance[factionId] = clamp01to100(
      s.resistance[factionId] + resistanceRise(edict.tier, conflict, state.k),
    );
  }
}

/** §8.4 수렴 + 연대. 전 헥스 평균은 갱신 전 값으로 잡아 동시 갱신한다. */
function updateResistanceTracks(state: GameState): void {
  const meanByFaction: Record<string, number> = {};
  const countByFaction: Record<string, number> = {};
  for (const hex of HEXES) {
    for (const factionId of Object.keys(hex.composition)) {
      meanByFaction[factionId] =
        (meanByFaction[factionId] ?? 0) + state.hexes[hex.id].resistance[factionId];
      countByFaction[factionId] = (countByFaction[factionId] ?? 0) + 1;
    }
  }
  for (const factionId of Object.keys(meanByFaction)) {
    meanByFaction[factionId] /= countByFaction[factionId];
  }
  for (const hex of HEXES) {
    for (const factionId of Object.keys(hex.composition)) {
      const faction = FACTION_BY_ID[factionId];
      const current = state.hexes[hex.id].resistance[factionId];
      const delta =
        (faction.convergence - current) * CONVERGENCE_SPEED[faction.estate] +
        (meanByFaction[factionId] - current) * SOLIDARITY[faction.estate];
      state.hexes[hex.id].resistance[factionId] = clamp01to100(current + delta);
    }
  }
}

/**
 * §5.3 관철 보너스. §15.2가 미결로 둔 "관철 판정 기준"은
 * rules.ts 의 ENACTMENT_THRESHOLD (가중 헥스 비율) 로 잠정 처리한다.
 */
function settleEnactments(state: GameState): void {
  for (const active of state.active) {
    if (active.inProgress || active.settled) continue;
    active.settled = true;
    const ratio = enactedWeightedRatio(active);
    if (ratio >= ENACTMENT_THRESHOLD) {
      const tier = EDICT_BY_ID[active.edictId].tier;
      state.authority = clamp01to100(state.authority + AUTHORITY_ON_ENACT[tier]);
      state.log.push(
        `R${state.round} 관철: ${EDICT_BY_ID[active.edictId].labelKo} (${(ratio * 100).toFixed(0)}%)`,
      );
    }
  }
}

export function enactedWeightedRatio(active: ActiveEdict): number {
  let num = 0;
  let den = 0;
  for (const hex of HEXES) {
    den += hex.population;
    if (active.byHex[hex.id].status === "enacted") num += hex.population;
  }
  return den === 0 ? 0 : num / den;
}

export { HEXES, HEX_BY_ID };
