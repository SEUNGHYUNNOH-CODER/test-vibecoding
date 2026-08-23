/**
 * §1.1 4국면 라운드 루프. 지도에 의존하지 않는다 — World 를 인자로 받는다.
 * 난수는 state.rngState 에 담긴 시드 고정 RNG 뿐이다 (§14.2 리플레이 전제).
 */
import type {
  ActiveEdict,
  Axes,
  Edict,
  GameState,
  Hex,
  LogEntry,
  Revolt,
} from "./types.ts";
import { EDICT_BY_ID, URBANITY_PENALTY_EDICT } from "./edicts.ts";
import type { World } from "./world.ts";
import {
  AUTHORITY_ON_ENACT,
  AUTHORITY_ON_WITHDRAW,
  AUTHORITY_START,
  BETRAYAL_RESISTANCE,
  BURGHER_REVOLT,
  CAPACITY_CAP,
  CAPACITY_START,
  CLERGY_BLOCK,
  PEASANT_REVOLT,
  SUPPRESS,
  CONVERGENCE_SPEED,
  EDICT_COST,
  EDICT_UPKEEP,
  ENACTMENT_THRESHOLD,
  ENACT_ATTEMPTS,
  GAIN_SCALE,
  PARTIAL_GAMMA,
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
    hexes[hex.id] = {
      reach: { ...hex.initialReach },
      resistance,
      shock: [],
      shockPending: 0,
      burgherHigh: 0,
    };
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
    cumulativeR: 0,
    cumulativeRounds: 0,
    startR: 0,
    revolts: [],
    lastTrigger: {},
    revoltCooldown: {},
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
  state.startR = reachScore(state.national);
  state.capacity = CAPACITY_START;
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

/**
 * §7.5 우호지지 — 그 칙령의 수혜 세력이 인구에서 차지하는 비중을,
 * 수혜의 강도와 그들의 현재 저항으로 할인한 값. 정치 배율을 쓰지 않는다.
 */
export function goodwill(world: World, state: GameState, hex: Hex, edict: Edict): number {
  let acc = 0;
  for (const [factionId, share] of Object.entries(hex.composition)) {
    const conflict = conflictFor(world, edict, factionId);
    if (conflict >= 0) continue;
    const resistance = state.hexes[hex.id].resistance[factionId];
    acc += (share / 100) * (Math.abs(conflict) / 3) * ((100 - resistance) / 100);
  }
  return acc * 100;
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
  const base = diffusionMonths(hex.crownlandDelay, hex.kind, hex.distanceBand, urbanity);
  const resident = state.effects.some(
    (e) => e.kind === "commissioner" && e.targetId === hex.commandId,
  );
  return Math.max(1, base - (resident ? COMMISSIONER_SPEEDUP : 0));
}

/** §11 액션 지속 효과 */
export function effectMultiplier(state: GameState, hex: Hex): number {
  let m = 1;
  for (const e of state.effects) {
    if (e.untilRound > 0 && state.round > e.untilRound) continue;
    if (e.kind === "commissioner" && e.targetId === hex.commandId) m *= e.multiplier;
    if (e.kind === "official" && e.targetId === hex.id) m *= e.multiplier;
  }
  return m;
}

/** §9 반란 중인 헥스의 집행률 배율 */
export function revoltMultiplier(state: GameState, hex: Hex): number {
  let m = 1;
  for (const r of state.revolts) {
    if (!r.hexIds.includes(hex.id)) continue;
    m *= r.kind === "peasant" ? PEASANT_REVOLT.enforcement : BURGHER_REVOLT.enforcement;
  }
  return m;
}

/** §9.3 성직자 영역 차단 — 반란이 아니라 종교 칙령만 막는다 */
export function clergyBlockMultiplier(
  world: World,
  state: GameState,
  hex: Hex,
  edict: Edict,
): number {
  if (edict.area !== CLERGY_BLOCK.area) return 1;
  for (const factionId of Object.keys(hex.composition)) {
    if (world.factionById[factionId].estate !== "clergy") continue;
    if (state.hexes[hex.id].resistance[factionId] >= CLERGY_BLOCK.level) {
      return CLERGY_BLOCK.enforcement;
    }
  }
  return 1;
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
    effectMultiplier(state, hex) *
      revoltMultiplier(state, hex) *
      clergyBlockMultiplier(world, state, hex, edict),
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
    const s = state.hexes[hex.id];
    if (prog.status === "enacted" && prog.appliedGain) {
      s.reach = {
        p: clamp01to100(s.reach.p - prog.appliedGain.p),
        t: clamp01to100(s.reach.t - prog.appliedGain.t),
        f: clamp01to100(s.reach.f - prog.appliedGain.f),
      };
    }
    // §7.5 배신 — 부분 효과로 기대를 올려놓고 거두면 농민이 등을 돌린다
    if (prog.partialGain) {
      s.reach = { ...s.reach, p: clamp01to100(s.reach.p - prog.partialGain) };
      for (const factionId of Object.keys(hex.composition)) {
        if (world.factionById[factionId].estate !== "peasant") continue;
        if (conflictFor(world, edict, factionId) >= 0) continue;
        s.resistance[factionId] = clamp01to100(s.resistance[factionId] + BETRAYAL_RESISTANCE);
      }
      s.shockPending += BETRAYAL_RESISTANCE;
      state.lastTrigger[hex.id] = edictId;
      prog.partialGain = 0;
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
  resolveRevoltsAfterWithdrawal(world, state, edictId, active.withdrawnFrom);
  const where = full ? "전면" : world.hexes.find((h) => h.crownlandId === crownlandId)!.crownlandKo;
  log(state, `${edict.labelKo} ${where} 철회 (권위 ${penalty.toFixed(1)})`, "bad");
  if (edictId === URBANITY_PENALTY_EDICT && full) state.urbanityHalved = false;
}

/**
 * §9.1 부분 철회로 농민 반란이, §9.2 도시민 적대 칙령 철회로 혁명이 끝난다.
 * 진압은 저항을 오히려 올리므로, 물러서는 것이 실제로 더 싼 경로다.
 */
function resolveRevoltsAfterWithdrawal(
  world: World,
  state: GameState,
  edictId: string,
  withdrawnFrom: string[],
): void {
  const survived: Revolt[] = [];
  for (const revolt of state.revolts) {
    if (!withdrawnFrom.includes(revolt.crownlandId)) {
      survived.push(revolt);
      continue;
    }
    if (revolt.kind === "peasant") {
      if (revolt.triggerEdictId !== edictId) {
        survived.push(revolt);
        continue;
      }
      for (const hexId of revolt.hexIds) {
        const hex = world.hexById[hexId];
        for (const factionId of Object.keys(hex.composition)) {
          if (world.factionById[factionId].estate !== "peasant") continue;
          state.hexes[hexId].resistance[factionId] = clamp01to100(
            state.hexes[hexId].resistance[factionId] - 15,
          );
        }
        state.revoltCooldown[hexId] = state.round + PEASANT_REVOLT.cooldown;
      }
      log(state, `${EDICT_BY_ID[edictId].labelKo} 철회로 농민 반란이 끝났다`, "good");
      continue;
    }
    // 혁명: 도시민 적대 칙령이 하나도 남지 않아야 끝난다
    if (revolutionBlockers(world, state, revolt.crownlandId).length > 0) {
      survived.push(revolt);
      continue;
    }
    log(state, `${world.hexById[revolt.hexIds[0]].crownlandKo}의 혁명이 수습되었다`, "good");
  }
  state.revolts = survived;
}

// ─────────────────────────────────────── §11 액션

/**
 * §11.3 은 액션 목표를 "칙령 여력당 1.29 대비 0.6~1.2"로 잡았으나, 1.29 는
 * 저항이 아직 낮을 때 첫 칙령 하나가 내는 한계값이다. 재위 전체로 실측하면
 * 칙령의 평균 여력당 ΔR 은 0.47 이다(다 던지기 ΔR 7.05 / 소모 여력 1,514).
 * 목표대를 그 기준으로 다시 잡으면 0.28~0.56 이고, 아래 값이 그 안에 든다.
 */
export const COMMISSIONER_UPKEEP = 1;
export const COMMISSIONER_MULTIPLIER = 2.0;

/**
 * 판무관이 있는 관구는 침투가 이만큼 빨라진다.
 * 집행률 배율만으로는 §15.1 2차 기준(여력당 0.6~1.2)에 어떤 조합으로도 닿지
 * 못했다 — 배율은 이미 관철될 것을 조금 더 관철시킬 뿐이고, 칙령은 새
 * 도달률을 통째로 가져오기 때문이다. 확산 단축은 성격이 다르다: 후반
 * 반포분이 착지하고, 유지비 부담 기간이 줄고, 재판정 기회가 늘어난다.
 * 왕실 판무관의 실제 기능도 왕명을 부군을 우회해 직접 집행하는 것이었다.
 */
export const COMMISSIONER_SPEEDUP = 2;

export const ACTIONS = [
  {
    id: "commissioner",
    labelKo: "왕실 판무관 배치",
    cost: 20,
    target: "command" as const,
    descKo:
      "관구 전 헥스의 집행률 ×2, 확산 2개월 단축. 해제할 때까지 상주하며 월 1의 유지비가 든다. 1785년 10개 관구에 배치되어 계속 있었다.",
  },
  {
    id: "official",
    labelKo: "관리 교체",
    cost: 12,
    target: "hex" as const,
    descKo:
      "지정 헥스의 집행률 ×1.5, 영구. 해당 헥스 귀족 저항 +4. 선출직을 임명직으로 갈아치우는 것이다.",
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

/** §11.1 해제는 즉시·무료·페널티 없음. 유지비만 멈춘다 */
export function dismissEffect(state: GameState, effectId: string): void {
  const effect = state.effects.find((e) => e.id === effectId);
  if (!effect || effect.kind !== "commissioner") return;
  state.effects = state.effects.filter((e) => e.id !== effectId);
  log(state, `${effect.targetKo} 판무관 철수`);
}

/** 진행 중 지속 효과의 월 유지비 합계 */
export function effectUpkeep(state: GameState): number {
  return state.effects.reduce((n, e) => n + (e.upkeep ?? 0), 0);
}

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
    const sample = world.hexes.find((h) => h.commandId === targetId);
    if (!sample) return;
    if (state.effects.some((e) => e.kind === "commissioner" && e.targetId === targetId)) return;
    // untilRound 0 = 무기한 상주. 3라운드 일회성은 확산이 6~11개월이라
    // 칙령 도착 시점과 어긋나 대부분의 파견이 빈 창을 덮었다.
    state.effects.push({
      id: `commissioner-${targetId}`,
      kind: "commissioner",
      labelKo: "왕실 판무관",
      targetId: targetId!,
      targetKo: sample.commandKo,
      multiplier: COMMISSIONER_MULTIPLIER,
      untilRound: 0,
      upkeep: COMMISSIONER_UPKEEP,
    });
    log(state, `${sample.commandKo}에 왕실 판무관 배치 — 집행률 ×1.4, 유지 월 ${COMMISSIONER_UPKEEP}`);
    return;
  }

  if (id === "official") {
    const hex = world.hexById[targetId!];
    if (!hex) return;
    if (state.effects.some((e) => e.kind === "official" && e.targetId === targetId)) return;
    state.effects.push({
      id: `official-${targetId}`,
      kind: "official",
      labelKo: "임명 관리",
      targetId: targetId!,
      targetKo: hex.labelKo,
      multiplier: 1.5,
      untilRound: 0,
      upkeep: 0,
    });
    const s = state.hexes[hex.id];
    for (const factionId of Object.keys(hex.composition)) {
      if (world.factionById[factionId].estate !== "noble") continue;
      s.resistance[factionId] = clamp01to100(s.resistance[factionId] + 4);
    }
    log(state, `${hex.labelKo} 관리 교체 — 집행률 ×1.5 영구, 귀족 저항 +4`);
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
  upkeep += effectUpkeep(state);
  applyRevoltDrain(world, state);
  const drift = authorityDrift(state.authority);
  state.authority = clamp01to100(state.authority + drift);
  state.authorityDelta = { drift, events: 0 };
  settleEnactments(world, state);
  state.capacity = Math.max(
    0,
    Math.min(CAPACITY_CAP, state.capacity + capacityInflow(state.authority) - upkeep),
  );
  state.national = aggregateNational(world, state);
  // §14.2 누적 판정 — 종료 시점만 보면 R100 이후 반포분이 전혀 반영되지 않는다
  state.cumulativeR += reachScore(state.national);
  state.cumulativeRounds += 1;

  if (state.round >= TOTAL_ROUNDS) {
    state.gameOver = true;
    log(state, "1790년 2월 20일. 요제프 2세가 세상을 떠났다.", "event");
    return outcome;
  }

  state.round += 1;
  state.effects = state.effects.filter((e) => e.untilRound === 0 || state.round <= e.untilRound);

  // ── 국면 1. 도달
  // 저항은 관철이 아니라 **도달**에 반응한다. 부군이 공포를 거부해도 그 지역은
  // 칙령이 나왔다는 것을 알고 반발한다 — 관철된 곳에서만 저항이 오르면
  // 헝가리처럼 착지율이 낮은 지역에서 반란이 구조적으로 불가능해진다.
  // 원칙 4("도달이 곧 노출")는 그대로다: 닿지 않은 헥스는 여전히 무반응이다.
  for (const active of state.active) {
    const edict = EDICT_BY_ID[active.edictId];
    for (const hex of world.hexes) {
      const prog = active.byHex[hex.id];
      if (prog.status === "in-transit" && state.round >= prog.arrivalRound) {
        prog.status = "pending";
        applyResistanceRise(world, state, hex, edict);
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
        prog.appliedGain = applyReachGain(state, hex, edict);
        outcome.enacted.push({ edictId: edict.id, hexId: hex.id });
        if (edict.id === URBANITY_PENALTY_EDICT) state.urbanityHalved = true;
      } else {
        prog.attemptsLeft -= 1;
        if (prog.attemptsLeft <= 0) {
          prog.status = "failed";
          prog.partialGain = applyPartialEffect(world, state, hex, edict);
          outcome.failed.push({ edictId: edict.id, hexId: hex.id });
        }
      }
    }
  }
  updateResistanceTracks(world, state);
  checkRevolts(world, state);
  state.national = aggregateNational(world, state);
  runEvents(state);
  return outcome;
}

/** 관철된 헥스에만 도달률 가산 (§4.2 가산 모델) */
function applyReachGain(state: GameState, hex: Hex, edict: Edict): Axes {
  const s = state.hexes[hex.id];
  const g = state.gainScale;
  const before = { ...s.reach };
  s.reach = {
    p: clamp01to100(s.reach.p + edict.gain.p * g.p),
    t: clamp01to100(s.reach.t + edict.gain.t * g.t),
    f: clamp01to100(s.reach.f + edict.gain.f * g.f),
  };
  return { p: s.reach.p - before.p, t: s.reach.t - before.t, f: s.reach.f - before.f };
}

/**
 * §7.5 계열 C — 3라운드 판정을 전부 실패한 헥스에서 P축만 부분 가산한다.
 * 국가가 행정적·재정적으로 침투하지 못했고 인구만 알고 있는 상태이므로
 * T·F 는 오르지 않는다. 이 제약이 계열 C 의 전부다.
 *
 * 사양서의 "반대 저항 40%" 조항은 넣지 않았다 — 저항은 이미 도달 시점에
 * 100% 올랐으므로(설계 결정 B-1) 중복 계산이 된다.
 */
function applyPartialEffect(world: World, state: GameState, hex: Hex, edict: Edict): number {
  if (edict.gain.p <= 0) return 0;
  const support = goodwill(world, state, hex, edict);
  if (support <= 0) return 0;
  const s = state.hexes[hex.id];
  const before = s.reach.p;
  const gain = edict.gain.p * state.gainScale.p * (support / 100) * PARTIAL_GAMMA;
  s.reach = { ...s.reach, p: clamp01to100(before + gain) };
  return s.reach.p - before;
}

/** 도달한 헥스의 이해관계 세력 저항 상승 (§9.1) */
function applyResistanceRise(world: World, state: GameState, hex: Hex, edict: Edict): void {
  const s = state.hexes[hex.id];
  let peasantShock = 0;
  let peasantShare = 0;
  for (const [factionId, share] of Object.entries(hex.composition)) {
    const conflict = conflictFor(world, edict, factionId);
    if (conflict === 0) continue;
    const delta = resistanceRise(edict.tier, conflict, state.k);
    const before = s.resistance[factionId];
    s.resistance[factionId] = clamp01to100(before + delta);
    if (world.factionById[factionId].estate === "peasant" && delta > 0) {
      peasantShock += share * (s.resistance[factionId] - before);
      peasantShare += share;
    }
  }
  // §9.1 충격 창 갱신 — 방아쇠는 누적이 아니라 최근 6라운드의 상승분이다
  if (peasantShare > 0) {
    s.shockPending += peasantShock / peasantShare;
    state.lastTrigger[hex.id] = edict.id;
  }
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

// ─────────────────────────────────────── §9 반란

/** 헥스의 계층별 인구 가중 평균 저항 */
function estateResistance(
  world: World,
  state: GameState,
  hex: Hex,
  estate: "noble" | "clergy" | "burgher" | "peasant",
): number {
  let num = 0;
  let den = 0;
  for (const [factionId, share] of Object.entries(hex.composition)) {
    if (world.factionById[factionId].estate !== estate) continue;
    num += share * state.hexes[hex.id].resistance[factionId];
    den += share;
  }
  return den === 0 ? 0 : num / den;
}

function checkRevolts(world: World, state: GameState): void {
  // 충격 창 갱신
  for (const hex of world.hexes) {
    const s = state.hexes[hex.id];
    s.shock.push(s.shockPending);
    s.shockPending = 0;
    if (s.shock.length > PEASANT_REVOLT.window) s.shock.shift();
  }

  const inRevolt = new Set(state.revolts.flatMap((r) => r.hexIds));

  // ── §9.1 농민 반란. 충격 + 수준 두 조건을 다 요구한다
  for (const hex of world.hexes) {
    if (inRevolt.has(hex.id)) continue;
    if ((state.revoltCooldown[hex.id] ?? 0) > state.round) continue;
    const s = state.hexes[hex.id];
    const shock = s.shock.reduce((a, b) => a + b, 0);
    if (shock < PEASANT_REVOLT.shock) continue;
    if (estateResistance(world, state, hex, "peasant") < PEASANT_REVOLT.level) continue;

    // 범위: 같은 판무관 단위 안에서 농민 저항이 이미 임계 이상인 헥스가 함께 봉기한다
    const spread = world.hexes.filter(
      (h) =>
        h.commandId === hex.commandId &&
        !inRevolt.has(h.id) &&
        (state.revoltCooldown[h.id] ?? 0) <= state.round &&
        estateResistance(world, state, h, "peasant") >= PEASANT_REVOLT.level,
    );
    const hexIds = [...new Set([hex.id, ...spread.map((h) => h.id)])];
    state.revolts.push({
      id: `peasant-${state.round}-${hex.id}`,
      kind: "peasant",
      labelKo: "농민 반란",
      hexIds,
      crownlandId: hex.crownlandId,
      startRound: state.round,
      triggerEdictId: state.lastTrigger[hex.id],
    });
    for (const id of hexIds) inRevolt.add(id);
    applyAuthority(state, PEASANT_REVOLT.authorityHit);
    log(
      state,
      `${hex.labelKo}에서 농민 반란 — ${hexIds.length}개 헥스 봉기 (권위 ${PEASANT_REVOLT.authorityHit})`,
      "bad",
    );
  }

  // ── §9.2 도시민 혁명. 왕관령 전체가 이탈한다
  for (const hex of world.hexes) {
    const s = state.hexes[hex.id];
    const level = estateResistance(world, state, hex, "burgher");
    s.burgherHigh = level >= BURGHER_REVOLT.level ? s.burgherHigh + 1 : 0;
    if (s.burgherHigh < BURGHER_REVOLT.sustain) continue;
    if (state.revolts.some((r) => r.kind === "burgher" && r.crownlandId === hex.crownlandId)) {
      continue;
    }
    const hexIds = world.hexes
      .filter((h) => h.crownlandId === hex.crownlandId)
      .map((h) => h.id);
    state.revolts.push({
      id: `burgher-${state.round}-${hex.crownlandId}`,
      kind: "burgher",
      labelKo: "혁명",
      hexIds,
      crownlandId: hex.crownlandId,
      startRound: state.round,
    });
    applyAuthority(state, BURGHER_REVOLT.authorityHit);
    log(
      state,
      `${hex.crownlandKo} 전역에서 혁명 — 왕관령이 이탈했다 (권위 ${BURGHER_REVOLT.authorityHit})`,
      "bad",
    );
  }
}

/**
 * 반란의 지속 효과. 설계 결정 B-2 — 일회성 권위 충격만 국가 단위이고,
 * 지속 효과는 반란 지역에 국지화한다. 그러지 않으면 네덜란드 2헥스의 혁명이
 * 25헥스 전체를 마비시키고, §5.1이 차단했다는 죽음의 나선이 되돌아온다.
 */
function applyRevoltDrain(world: World, state: GameState): void {
  for (const revolt of state.revolts) {
    const drain = revolt.kind === "peasant" ? PEASANT_REVOLT.reachDrain : BURGHER_REVOLT.reachDrain;
    for (const hexId of revolt.hexIds) {
      const s = state.hexes[hexId];
      if (revolt.kind === "peasant") {
        s.reach = { ...s.reach, p: clamp01to100(s.reach.p + drain) };
      } else {
        s.reach = {
          ...s.reach,
          t: clamp01to100(s.reach.t + drain),
          f: clamp01to100(s.reach.f + drain),
        };
      }
    }
  }
  // §9.1 자연 소멸
  const survived: Revolt[] = [];
  for (const revolt of state.revolts) {
    if (revolt.kind === "peasant" && state.round - revolt.startRound >= PEASANT_REVOLT.duration) {
      for (const id of revolt.hexIds) {
        state.revoltCooldown[id] = state.round + PEASANT_REVOLT.cooldown;
      }
      log(state, `${world.hexById[revolt.hexIds[0]].labelKo}의 농민 반란이 잦아들었다`);
      continue;
    }
    survived.push(revolt);
  }
  state.revolts = survived;
}

/** §9.2 혁명 해소 판정 — 도시민을 적대한 칙령이 그 왕관령에 남아 있는가 */
export function revolutionBlockers(
  world: World,
  state: GameState,
  crownlandId: string,
): Edict[] {
  const sample = world.hexes.find((h) => h.crownlandId === crownlandId)!;
  const burghers = Object.keys(sample.composition).filter(
    (f) => world.factionById[f].estate === "burgher",
  );
  return state.active
    .filter((a) => !a.withdrawnFrom.includes(crownlandId))
    .map((a) => EDICT_BY_ID[a.edictId])
    .filter((e) =>
      burghers.some((f) => conflictFor(world, e, f) >= BURGHER_REVOLT.revokeConflict),
    );
}

/** §9.1 진압 */
export function canSuppress(state: GameState, revoltId: string): boolean {
  const revolt = state.revolts.find((r) => r.id === revoltId);
  return !!revolt && revolt.kind === "peasant" && state.capacity >= SUPPRESS.cost;
}

export function suppress(world: World, state: GameState, revoltId: string): void {
  if (!canSuppress(state, revoltId)) return;
  const revolt = state.revolts.find((r) => r.id === revoltId)!;
  state.capacity -= SUPPRESS.cost;
  for (const hexId of revolt.hexIds) {
    const hex = world.hexById[hexId];
    const s = state.hexes[hexId];
    for (const factionId of Object.keys(hex.composition)) {
      if (world.factionById[factionId].estate !== "peasant") continue;
      s.resistance[factionId] = clamp01to100(s.resistance[factionId] + SUPPRESS.resistance);
    }
    state.revoltCooldown[hexId] = state.round + PEASANT_REVOLT.cooldown;
  }
  // 같은 문화권 농민의 반발은 제국 전체로 번진다
  const cultures = new Set(
    revolt.hexIds.flatMap((id) =>
      Object.keys(world.hexById[id].composition).filter(
        (f) => world.factionById[f].estate === "peasant",
      ),
    ),
  );
  for (const hex of world.hexes) {
    if (revolt.hexIds.includes(hex.id)) continue;
    for (const factionId of Object.keys(hex.composition)) {
      if (!cultures.has(factionId)) continue;
      state.hexes[hex.id].resistance[factionId] = clamp01to100(
        state.hexes[hex.id].resistance[factionId] + SUPPRESS.backlash,
      );
    }
  }
  applyAuthority(state, SUPPRESS.authority);
  state.revolts = state.revolts.filter((r) => r.id !== revoltId);
  log(state, `${world.hexById[revolt.hexIds[0]].labelKo} 반란 진압 (권위 ${SUPPRESS.authority}, 같은 문화권 농민 저항 +${SUPPRESS.backlash})`, "bad");
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
  /** 최종 ΔR — 종료 시점과 누적 평균의 혼합 */
  delta: number;
  endDelta: number;
  meanDelta: number;
  national: Axes;
  gradeKo: string;
  verdictKo: string;
}

/**
 * 설계 결정 B-3 — 종료 시점 R 과 누적 평균의 5:5 혼합.
 * 순수 종료 시점 판정은 R100 이후 반포분(전체의 10%)을 전혀 반영하지 못하고,
 * 순수 누적 평균은 R10 의 상승을 R105 의 16.8배로 쳐서 초반 몰아치기를
 * 지배 전략으로 만든다. 혼합이 양쪽을 다 눌러준다.
 */
export const END_WEIGHT = 0.5;

export function finalReport(world: World, state: GameState, startR: number): FinalReport {
  const r = reachScore(state.national);
  const base = state.startR || startR;
  const endDelta = r - base;
  const meanDelta =
    state.cumulativeRounds > 0 ? state.cumulativeR / state.cumulativeRounds - base : 0;
  const delta = END_WEIGHT * endDelta + (1 - END_WEIGHT) * meanDelta;
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
  return { r, delta, endDelta, meanDelta, national: state.national, gradeKo, verdictKo };
}
