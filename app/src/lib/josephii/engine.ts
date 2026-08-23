/**
 * §1.1 4국면 라운드 루프. 지도에 의존하지 않는다 — World 를 인자로 받는다.
 * 난수는 state.rngState 에 담긴 시드 고정 RNG 뿐이다 (§14.2 리플레이 전제).
 */
import type {
  ActiveEdict,
  ActiveEffect,
  Axes,
  Edict,
  GameState,
  Hex,
  LogEntry,
} from "./types.ts";
import { EDICT_BY_ID, URBANITY_PENALTY_EDICT } from "./edicts.ts";
import type { World } from "./world.ts";
import {
  AUTHORITY_ON_ENACT,
  AUTHORITY_ON_WITHDRAW,
  AUTHORITY_START,
  CAPACITY_CAP,
  CONVERGENCE_SPEED,
  EDICT_COST,
  EDICT_UPKEEP,
  ENACTMENT_THRESHOLD,
  ENACT_ATTEMPTS,
  GAIN_SCALE,
  K_RESISTANCE,
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

export const TOTAL_ROUNDS = 111; // §0.2 1780.12 ~ 1790.2

// ─────────────────────────────────────── 난수 (시드 고정)

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** state 에 담긴 난수 상태를 한 칸 진행시킨다 — 저장/복원이 가능하다 */
function nextRandom(state: GameState): number {
  const a = (state.rngState + 0x6d2b79f5) >>> 0;
  state.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ─────────────────────────────────────── 달력

const START_YEAR = 1780;
const START_MONTH = 12;

export function calendarOf(round: number): { year: number; month: number } {
  const idx = (START_YEAR * 12 + START_MONTH - 1) + (round - 1);
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function calendarLabel(round: number): string {
  const { year, month } = calendarOf(round);
  return `${year}년 ${month}월`;
}

// ─────────────────────────────────────── 초기화

export function createGame(
  world: World,
  opts: {
    seed?: number;
    resistanceStart?: "zero" | "convergence";
    resistanceScope?: "hex" | "opposed";
    k?: number;
    gainScale?: Partial<Axes>;
  } = {},
): GameState {
  const mode = opts.resistanceStart ?? RESISTANCE_START;
  const hexes: GameState["hexes"] = {};
  for (const hex of world.hexes) {
    const resistance: Record<string, number> = {};
    for (const factionId of Object.keys(hex.composition)) {
      resistance[factionId] = mode === "zero" ? 0 : world.factionById[factionId].convergence;
    }
    hexes[hex.id] = { reach: { ...hex.initialReach }, resistance };
  }
  const state: GameState = {
    worldId: world.id,
    round: 1,
    authority: AUTHORITY_START,
    capacity: 0,
    hexes,
    active: [],
    effects: [],
    national: { p: 0, t: 0, f: 0 },
    resistanceScope: opts.resistanceScope ?? RESISTANCE_SCOPE,
    k: opts.k ?? K_RESISTANCE,
    gainScale: { ...GAIN_SCALE, ...opts.gainScale },
    urbanityHalved: false,
    authorityDelta: { drift: 0, events: 0 },
    rngState: (opts.seed ?? Math.floor(Math.random() * 2 ** 31)) >>> 0,
    log: [
      {
        round: 1,
        text: "마리아 테레지아가 11월 29일 세상을 떠났다. 이제 단독 통치다.",
        tone: "event",
      },
    ],
    gameOver: false,
  };
  state.national = aggregateNational(world, state);
  state.capacity = capacityInflow(state.authority);
  return state;
}

// ─────────────────────────────────────── 집계

/** §4.4 집계 가중치 — P는 인구, T는 헥스 수, F는 잠재 세수 */
export function aggregateNational(world: World, state: GameState): Axes {
  let popSum = 0, pAcc = 0, revSum = 0, fAcc = 0, tAcc = 0;
  for (const hex of world.hexes) {
    const s = state.hexes[hex.id];
    pAcc += s.reach.p * hex.population;
    popSum += hex.population;
    fAcc += s.reach.f * hex.potentialRevenue;
    revSum += hex.potentialRevenue;
    tAcc += s.reach.t;
  }
  return { p: pAcc / popSum, t: tAcc / world.hexes.length, f: fAcc / revSum };
}

/** §8.6 정치 배율로 집계한 헥스 저항 */
export function politicalResistance(world: World, state: GameState, hex: Hex): number {
  let num = 0, den = 0;
  for (const [factionId, share] of Object.entries(hex.composition)) {
    const w = share * POLITICAL_WEIGHT[world.factionById[factionId].estate];
    num += w * state.hexes[hex.id].resistance[factionId];
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

/** 그 칙령에 반대하는 세력(충돌도 > 0)만 정치 배율로 집계 */
export function opposedResistance(
  world: World,
  state: GameState,
  hex: Hex,
  edict: Edict,
): number {
  let num = 0, den = 0;
  for (const [factionId, share] of Object.entries(hex.composition)) {
    if (conflictFor(world, edict, factionId) <= 0) continue;
    const w = share * POLITICAL_WEIGHT[world.factionById[factionId].estate];
    num += w * state.hexes[hex.id].resistance[factionId];
    den += w;
  }
  return den === 0 ? 0 : num / den;
}

export function resistanceForEdict(
  world: World,
  state: GameState,
  hex: Hex,
  edict: Edict,
): number {
  return state.resistanceScope === "opposed"
    ? opposedResistance(world, state, hex, edict)
    : politicalResistance(world, state, hex);
}

/** §9.1 이해충돌도 — 세력 예외가 계층 기본값을 덮는다 */
export function conflictFor(world: World, edict: Edict, factionId: string): number {
  const byFaction = edict.conflict.byFaction?.[factionId];
  if (byFaction !== undefined) return byFaction;
  const estate = world.factionById[factionId].estate;
  return edict.conflict.byEstate?.[estate] ?? 0;
}

/** §3 + §2.5 — 도시 행정 개편이 관철되면 도시성 보정이 절반이 된다 */
export function diffusionFor(state: GameState, hex: Hex): number {
  const urbanity = state.urbanityHalved
    ? (Math.floor(hex.urbanity / 2) as 0 | 1 | 2 | 3)
    : hex.urbanity;
  return diffusionMonths(hex.crownlandDelay, hex.kind, hex.distanceBand, urbanity);
}

/** §11.2 지속 효과가 걸린 헥스의 집행률 배율 */
export function effectMultiplier(state: GameState, hex: Hex): number {
  let m = 1;
  for (const e of state.effects) {
    if (e.kind !== "commissioner") continue;
    if (e.targetId === hex.regionId && state.round <= e.untilRound) m *= e.multiplier;
  }
  return m;
}

/** 현재 헥스에서 그 칙령이 통과할 확률 (§7.1) */
export function enforcementFor(
  world: World,
  state: GameState,
  hex: Hex,
  edict: Edict,
): number {
  return enforcementRate(
    reachScore(state.hexes[hex.id].reach),
    resistanceForEdict(world, state, hex, edict),
    state.authority,
    effectMultiplier(state, hex),
  );
}

// ─────────────────────────────────────── 행동 (국면 3)

export function costOf(edictId: string): number {
  return EDICT_COST[EDICT_BY_ID[edictId].tier];
}

export function canPromulgate(state: GameState, edictId: string): boolean {
  if (state.gameOver) return false;
  const edict = EDICT_BY_ID[edictId];
  if (!edict) return false;
  if (state.active.some((a) => a.edictId === edictId)) return false;
  return state.capacity >= EDICT_COST[edict.tier];
}

export function promulgate(world: World, state: GameState, edictId: string): void {
  if (!canPromulgate(state, edictId)) return;
  const edict = EDICT_BY_ID[edictId];
  state.capacity -= EDICT_COST[edict.tier];
  const byHex: ActiveEdict["byHex"] = {};
  for (const hex of world.hexes) {
    byHex[hex.id] = {
      arrivalRound: state.round + diffusionFor(state, hex),
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
    withdrawnFrom: [],
  });
  log(state, `${edict.labelKo} 반포 (단계${edict.tier}, 여력 −${EDICT_COST[edict.tier]})`);
}

/** §11.2 재반포 — 실패한 헥스에 3라운드 판정을 다시 건다 */
export const REPROCLAIM_RATE = 0.6;

export function reproclaimCost(edictId: string): number {
  return Math.round(costOf(edictId) * REPROCLAIM_RATE);
}

export function canReproclaim(world: World, state: GameState, edictId: string): boolean {
  const active = state.active.find((a) => a.edictId === edictId);
  if (!active || state.gameOver) return false;
  if (state.capacity < reproclaimCost(edictId)) return false;
  return world.hexes.some((h) => active.byHex[h.id].status === "failed");
}

export function reproclaim(world: World, state: GameState, edictId: string): void {
  if (!canReproclaim(world, state, edictId)) return;
  const active = state.active.find((a) => a.edictId === edictId)!;
  state.capacity -= reproclaimCost(edictId);
  let n = 0;
  for (const hex of world.hexes) {
    const prog = active.byHex[hex.id];
    if (prog.status !== "failed") continue;
    prog.status = "pending";
    prog.attemptsLeft = ENACT_ATTEMPTS;
    n++;
  }
  active.inProgress = true;
  log(state, `${EDICT_BY_ID[edictId].labelKo} 재반포 — ${n}개 헥스에 재판정`);
}

/** §11.3 철회 / 부분 철회 */
export function withdraw(
  world: World,
  state: GameState,
  edictId: string,
  crownlandId?: string,
): void {
  const active = state.active.find((a) => a.edictId === edictId);
  if (!active || state.gameOver) return;
  const edict = EDICT_BY_ID[edictId];
  const targets = crownlandId
    ? world.hexes.filter((h) => h.crownlandId === crownlandId)
    : world.hexes;
  const alreadyGone = new Set(active.withdrawnFrom);
  const scope = targets.filter((h) => !alreadyGone.has(h.crownlandId));
  if (scope.length === 0) return;

  for (const hex of scope) {
    const prog = active.byHex[hex.id];
    if (prog.status === "enacted" && prog.appliedGain) {
      const s = state.hexes[hex.id];
      s.reach = {
        p: clamp01to100(s.reach.p - prog.appliedGain.p),
        t: clamp01to100(s.reach.t - prog.appliedGain.t),
        f: clamp01to100(s.reach.f - prog.appliedGain.f),
      };
    }
    prog.status = "failed";
    prog.attemptsLeft = 0;
  }
  const affected = new Set(scope.map((h) => h.crownlandId));
  active.withdrawnFrom = [...alreadyGone, ...affected];
  active.inProgress = false;

  const full = !crownlandId;
  const penalty = AUTHORITY_ON_WITHDRAW[edict.tier] * (full ? 1 : 0.5);
  applyAuthority(state, penalty);
  const where = full ? "전면" : world.hexes.find((h) => h.crownlandId === crownlandId)!.crownlandKo;
  log(state, `${edict.labelKo} ${where} 철회 (권위 ${penalty.toFixed(1)})`, "bad");
  if (edictId === URBANITY_PENALTY_EDICT && full) state.urbanityHalved = false;
}

// ─────────────────────────────────────── §11 액션

export const ACTIONS = [
  {
    id: "commissioner",
    labelKo: "왕실 판무관 파견",
    cost: 20,
    target: "region" as const,
    descKo: "지정 중간계층 내 전 헥스의 집행률 ×1.4, 3라운드 지속. 1785년 10개 관구 배치.",
  },
  {
    id: "progress",
    labelKo: "황제 순행",
    cost: 15,
    target: "crownland" as const,
    descKo: "대상 왕관령 전 헥스 도달률 +3, 권위 +2. 요제프는 '팔켄슈타인 백작' 가명으로 여러 차례 순회했다.",
  },
  {
    id: "petition",
    labelKo: "청원 접수",
    cost: 5,
    target: "none" as const,
    descKo: "농민 계열 전체 저항 −5, 전 헥스 인구 도달 +1. 공개 알현으로 수천 건을 받았다.",
  },
] as const;

export type ActionId = (typeof ACTIONS)[number]["id"];

export function actionCost(id: ActionId): number {
  return ACTIONS.find((a) => a.id === id)!.cost;
}

export function canAct(state: GameState, id: ActionId): boolean {
  return !state.gameOver && state.capacity >= actionCost(id);
}

export function act(world: World, state: GameState, id: ActionId, targetId?: string): void {
  if (!canAct(state, id)) return;
  const spec = ACTIONS.find((a) => a.id === id)!;
  if (spec.target !== "none" && !targetId) return;
  state.capacity -= spec.cost;

  if (id === "commissioner") {
    const region = world.hexes.find((h) => h.regionId === targetId);
    if (!region) return;
    const effect: ActiveEffect = {
      id: `commissioner-${state.round}-${targetId}`,
      kind: "commissioner",
      labelKo: "왕실 판무관",
      targetId: targetId!,
      targetKo: region.regionKo,
      multiplier: 1.4,
      untilRound: state.round + 2,
    };
    state.effects.push(effect);
    log(state, `${region.regionKo}에 왕실 판무관 파견 — 3라운드간 집행률 ×1.4`);
    return;
  }

  if (id === "progress") {
    const hexes = world.hexes.filter((h) => h.crownlandId === targetId);
    if (hexes.length === 0) return;
    for (const hex of hexes) {
      const s = state.hexes[hex.id];
      s.reach = {
        p: clamp01to100(s.reach.p + 3),
        t: clamp01to100(s.reach.t + 3),
        f: clamp01to100(s.reach.f + 3),
      };
    }
    applyAuthority(state, 2);
    log(state, `${hexes[0].crownlandKo} 순행 — 도달률 +3, 권위 +2`, "good");
    return;
  }

  // petition
  for (const hex of world.hexes) {
    const s = state.hexes[hex.id];
    s.reach = { ...s.reach, p: clamp01to100(s.reach.p + 1) };
    for (const factionId of Object.keys(hex.composition)) {
      if (world.factionById[factionId].estate !== "peasant") continue;
      s.resistance[factionId] = clamp01to100(s.resistance[factionId] - 5);
    }
  }
  log(state, "청원 접수 — 농민 저항 −5, 인구 도달 +1", "good");
}

// ─────────────────────────────────────── 라운드 진행

export interface RoundOutcome {
  enacted: Array<{ edictId: string; hexId: string }>;
  failed: Array<{ edictId: string; hexId: string }>;
}

/**
 * 정산(당월) → 라운드 증가 → 도달 → 반응 → 이벤트.
 * 반환 시점에 플레이어는 새 라운드의 "행동" 국면에 서 있다.
 */
export function advanceRound(world: World, state: GameState): RoundOutcome {
  const outcome: RoundOutcome = { enacted: [], failed: [] };
  if (state.gameOver) return outcome;

  // ── 국면 4 (당월 정산)
  let upkeep = 0;
  for (const active of state.active) {
    if (!active.inProgress) continue;
    const moving = world.hexes.some((h) => {
      const s = active.byHex[h.id].status;
      return s === "in-transit" || s === "pending";
    });
    if (moving) upkeep += EDICT_UPKEEP[EDICT_BY_ID[active.edictId].tier];
    else active.inProgress = false;
  }
  const drift = authorityDrift(state.authority);
  state.authority = clamp01to100(state.authority + drift);
  state.authorityDelta = { drift, events: 0 };
  settleEnactments(world, state);
  state.capacity = Math.max(
    0,
    Math.min(CAPACITY_CAP, state.capacity + capacityInflow(state.authority) - upkeep),
  );
  state.national = aggregateNational(world, state);

  if (state.round >= TOTAL_ROUNDS) {
    state.gameOver = true;
    log(state, "1790년 2월 20일. 요제프 2세가 세상을 떠났다.", "event");
    return outcome;
  }

  state.round += 1;
  state.effects = state.effects.filter((e) => state.round <= e.untilRound);

  // ── 국면 1. 도달
  for (const active of state.active) {
    for (const hex of world.hexes) {
      const prog = active.byHex[hex.id];
      if (prog.status === "in-transit" && state.round >= prog.arrivalRound) {
        prog.status = "pending";
      }
    }
  }

  // ── 국면 2. 반응
  for (const active of state.active) {
    const edict = EDICT_BY_ID[active.edictId];
    for (const hex of world.hexes) {
      const prog = active.byHex[hex.id];
      if (prog.status !== "pending") continue;
      const p = enforcementFor(world, state, hex, edict);
      if (nextRandom(state) < p) {
        prog.status = "enacted";
        prog.appliedGain = applyEnactment(world, state, hex, edict);
        outcome.enacted.push({ edictId: edict.id, hexId: hex.id });
        if (edict.id === URBANITY_PENALTY_EDICT) state.urbanityHalved = true;
      } else {
        prog.attemptsLeft -= 1;
        if (prog.attemptsLeft <= 0) {
          prog.status = "failed";
          outcome.failed.push({ edictId: edict.id, hexId: hex.id });
        }
      }
    }
  }
  updateResistanceTracks(world, state);
  state.national = aggregateNational(world, state);
  runEvents(state);
  return outcome;
}

/** 관철된 헥스에만 도달률 가산 + 저항 상승 */
function applyEnactment(world: World, state: GameState, hex: Hex, edict: Edict): Axes {
  const s = state.hexes[hex.id];
  const g = state.gainScale;
  const before = { ...s.reach };
  s.reach = {
    p: clamp01to100(s.reach.p + edict.gain.p * g.p),
    t: clamp01to100(s.reach.t + edict.gain.t * g.t),
    f: clamp01to100(s.reach.f + edict.gain.f * g.f),
  };
  for (const factionId of Object.keys(hex.composition)) {
    const conflict = conflictFor(world, edict, factionId);
    if (conflict === 0) continue;
    s.resistance[factionId] = clamp01to100(
      s.resistance[factionId] + resistanceRise(edict.tier, conflict, state.k),
    );
  }
  return {
    p: s.reach.p - before.p,
    t: s.reach.t - before.t,
    f: s.reach.f - before.f,
  };
}

/** §8.4 수렴 + 연대. 전 헥스 평균은 갱신 전 값으로 잡아 동시 갱신한다. */
function updateResistanceTracks(world: World, state: GameState): void {
  const sum: Record<string, number> = {};
  const count: Record<string, number> = {};
  for (const hex of world.hexes) {
    for (const factionId of Object.keys(hex.composition)) {
      sum[factionId] = (sum[factionId] ?? 0) + state.hexes[hex.id].resistance[factionId];
      count[factionId] = (count[factionId] ?? 0) + 1;
    }
  }
  for (const hex of world.hexes) {
    for (const factionId of Object.keys(hex.composition)) {
      const faction = world.factionById[factionId];
      const current = state.hexes[hex.id].resistance[factionId];
      const mean = sum[factionId] / count[factionId];
      const delta =
        (faction.convergence - current) * CONVERGENCE_SPEED[faction.estate] +
        (mean - current) * SOLIDARITY[faction.estate];
      state.hexes[hex.id].resistance[factionId] = clamp01to100(current + delta);
    }
  }
}

function settleEnactments(world: World, state: GameState): void {
  for (const active of state.active) {
    if (active.inProgress || active.settled) continue;
    active.settled = true;
    if (active.withdrawnFrom.length > 0) continue;
    const ratio = enactedWeightedRatio(world, active);
    if (ratio >= ENACTMENT_THRESHOLD) {
      const tier = EDICT_BY_ID[active.edictId].tier;
      applyAuthority(state, AUTHORITY_ON_ENACT[tier]);
      log(
        state,
        `${EDICT_BY_ID[active.edictId].labelKo} 관철 — 인구의 ${(ratio * 100).toFixed(0)}%에 도달 (권위 +${AUTHORITY_ON_ENACT[tier]})`,
        "good",
      );
    } else {
      log(
        state,
        `${EDICT_BY_ID[active.edictId].labelKo} 확산 종료 — 인구의 ${(ratio * 100).toFixed(0)}%에만 관철`,
        "bad",
      );
    }
  }
}

export function enactedWeightedRatio(world: World, active: ActiveEdict): number {
  let num = 0, den = 0;
  for (const hex of world.hexes) {
    den += hex.population;
    if (active.byHex[hex.id].status === "enacted") num += hex.population;
  }
  return den === 0 ? 0 : num / den;
}

// ─────────────────────────────────────── §12 이벤트

interface TimelineEvent {
  round: number;
  text: string;
  authority?: number;
}

/** §12.1 고정 이벤트 + §12.2 역사 참조 타임라인 */
const TIMELINE: TimelineEvent[] = [
  { round: 87, text: "오스만 제국과 전쟁이 시작되었다. 군대가 남쪽으로 향한다." },
  { round: 107, text: "베오그라드가 함락되었다. 오랜만의 승전보다.", authority: 14 },
  { round: 110, text: "1790년 1월. 무엇을 남길 것인가를 정해야 할 때다." },
];

function runEvents(state: GameState): void {
  for (const e of TIMELINE) {
    if (e.round !== state.round) continue;
    if (e.authority) {
      applyAuthority(state, e.authority);
      log(state, `${e.text} (권위 +${e.authority})`, "event");
    } else {
      log(state, e.text, "event");
    }
  }
}

// ─────────────────────────────────────── 보조

function applyAuthority(state: GameState, delta: number): void {
  state.authority = clamp01to100(state.authority + delta);
  state.authorityDelta = {
    ...state.authorityDelta,
    events: state.authorityDelta.events + delta,
  };
}

function log(state: GameState, text: string, tone?: LogEntry["tone"]): void {
  state.log.unshift({ round: state.round, text, tone });
  if (state.log.length > 300) state.log.length = 300;
}

// ─────────────────────────────────────── 최종 판정 (§4.5)

export interface FinalReport {
  r: number;
  delta: number;
  national: Axes;
  gradeKo: string;
  verdictKo: string;
}

export function finalReport(world: World, state: GameState, startR: number): FinalReport {
  const r = reachScore(state.national);
  const delta = r - startR;
  let gradeKo: string;
  let verdictKo: string;
  if (delta <= -4) {
    gradeKo = "붕괴";
    verdictKo = "군주국은 재위 시작보다 후퇴했다. 요제프가 실제로 겪은 것보다 나쁜 결말이다.";
  } else if (delta < 4) {
    gradeKo = "정체";
    verdictKo = "칙령은 반포되었으나 관철되지 않았다. 반란으로 무너진 것이 아니라, 아무것도 자리잡지 못한 채 10년이 지나갔다.";
  } else if (delta < 10) {
    gradeKo = "역사적 실제";
    verdictKo = "요제프 2세가 실제로 도달한 지점이다. 관용령과 농노제 폐지는 살아남았고 나머지는 대부분 거두어졌다.";
  } else if (delta < 20) {
    gradeKo = "부분 성공";
    verdictKo = "역사보다 나은 결과다. 개혁의 상당 부분이 지역에 자리잡았다.";
  } else {
    gradeKo = "균형 성공";
    verdictKo = "요제프가 하지 못한 일을 해냈다. 개혁이 군주국 전역에 실제로 도달했다.";
  }
  return { r, delta, national: state.national, gradeKo, verdictKo };
}
