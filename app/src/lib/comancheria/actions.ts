import type { BandInstance, DrawCupState, GameState } from "./game-state";
import { getConnectedSpaces } from "./map-data";
import { drawFromCup, rollDie, withLog } from "./engine";

function findBand(state: GameState, bandId: string): BandInstance | undefined {
  for (const r of state.rancherias) {
    const b = r.bands.find((band) => band.id === bandId);
    if (b) return b;
  }
  return undefined;
}

function findBandRancheriaMahimianaMedicine(state: GameState, bandId: string): number | undefined {
  return state.rancherias.find((r) => r.bands.some((b) => b.id === bandId))?.mahimianaMedicine;
}

function updateBand(state: GameState, bandId: string, fn: (b: BandInstance) => BandInstance): GameState {
  return {
    ...state,
    rancherias: state.rancherias.map((r) => ({
      ...r,
      bands: r.bands.map((b) => (b.id === bandId ? fn(b) : b)),
    })),
  };
}

/**
 * Activates one band out of a rancheria's resource box (4.1 steps 1-2):
 * moves it onto the map at the rancheria's space, fully active. The real
 * rule stages bands onto the Paraibo's medicine track and activates them
 * off the rightmost slot; here any in-box band can be picked directly,
 * but the "at least one, then stop whenever you like" shape of the
 * procedure is preserved by activating one band per call instead of
 * dumping the whole box out at once.
 */
export function activateOneBand(state: GameState, rancheriaId: string): GameState {
  const rancheria = state.rancherias.find((r) => r.id === rancheriaId);
  if (!rancheria) return state;
  const target = rancheria.bands.find((b) => b.status === "in-box");
  if (!target) {
    return withLog(state, `란체리아 ${rancheriaId}: 자원 상자에 활성화할 밴드가 없습니다`);
  }
  const newState = updateBand(state, target.id, (b) => ({
    ...b,
    status: "active" as const,
    spaceId: rancheria.spaceId,
    mpRemaining: b.mpMax,
  }));
  const remaining = rancheria.bands.filter((b) => b.status === "in-box").length - 1;
  return withLog(
    newState,
    `란체리아 ${rancheriaId}: 밴드(강도 ${target.strength}) 활성화 — ${rancheria.spaceId} (자원 상자에 ${remaining}개 남음)`,
  );
}

/**
 * 4.1.1.A: an active band at its own rancheria's space can pick up the
 * rancheria's unowned Mahimiana counter (only one band may own it at a
 * time — the Mahimiana can wander off with that band per the rules).
 */
export function claimMahimiana(state: GameState, bandId: string): GameState {
  const rancheria = state.rancherias.find((r) => r.bands.some((b) => b.id === bandId));
  const band = rancheria?.bands.find((b) => b.id === bandId);
  if (!rancheria || !band) return state;
  if (band.spaceId !== rancheria.spaceId) {
    return withLog(state, "마히미아나 인수 실패: 밴드가 란체리아와 같은 공간에 있어야 합니다");
  }
  if (!rancheria.hasMahimiana) {
    return withLog(state, "마히미아나 인수 실패: 이 란체리아는 마히미아나를 보유하고 있지 않습니다");
  }
  if (rancheria.bands.some((b) => b.ownsMahimiana)) {
    return withLog(state, "마히미아나 인수 실패: 이미 다른 밴드가 소유 중입니다");
  }
  const s2 = updateBand(state, bandId, (b) => ({ ...b, ownsMahimiana: true }));
  return withLog(s2, `밴드가 마히미아나를 인수했습니다 (의약 등급 ${rancheria.mahimianaMedicine})`);
}

export function releaseMahimiana(state: GameState, bandId: string): GameState {
  const s2 = updateBand(state, bandId, (b) => ({ ...b, ownsMahimiana: false }));
  return withLog(s2, "밴드가 마히미아나를 반환했습니다");
}

export function finishBand(state: GameState, bandId: string): GameState {
  const s2 = updateBand(state, bandId, (b) => ({ ...b, status: "finished", mpRemaining: 0 }));
  return withLog(s2, `밴드 완료 처리`);
}

/** 5.2.1 Hunt — costs 2MP (owns Mahimiana) or 3MP, target space needs a Bison counter. */
export function huntAction(state: GameState, bandId: string): GameState {
  const band = findBand(state, bandId);
  if (!band || !band.spaceId) return state;
  const cost = band.ownsMahimiana ? 2 : 3;
  if (band.mpRemaining < cost) return withLog(state, `Hunt 실패: MP 부족 (필요 ${cost}, 보유 ${band.mpRemaining})`);
  if (!state.bisonSpaces.includes(band.spaceId)) {
    return withLog(state, `Hunt 실패: ${band.spaceId}에 들소가 없습니다`);
  }
  let s2 = updateBand(state, bandId, (b) => ({
    ...b,
    mpRemaining: b.mpRemaining - cost,
    resources: { ...b.resources, bison: b.resources.bison + 1 },
  }));
  s2 = { ...s2, bisonSpaces: s2.bisonSpaces.filter((id) => id !== band.spaceId) };
  return withLog(s2, `Hunt 성공: ${band.spaceId}에서 들소 획득 (MP -${cost})`);
}

/** 5.2.2 Move — 1MP with a Horses counter, 2MP without, to an adjacent connected space. */
export function moveAction(state: GameState, bandId: string, targetSpaceId: string): GameState {
  const band = findBand(state, bandId);
  if (!band || !band.spaceId) return state;
  const adjacent = getConnectedSpaces(band.spaceId);
  if (!adjacent.includes(targetSpaceId)) {
    return withLog(state, `이동 실패: ${targetSpaceId}는 ${band.spaceId}의 인접 공간이 아닙니다`);
  }
  const cost = band.resources.horses > 0 ? 1 : 2;
  if (band.mpRemaining < cost) return withLog(state, `이동 실패: MP 부족 (필요 ${cost})`);
  const s2 = updateBand(state, bandId, (b) => ({ ...b, mpRemaining: b.mpRemaining - cost, spaceId: targetSpaceId }));
  return withLog(s2, `밴드 이동: ${band.spaceId} → ${targetSpaceId} (MP -${cost})`);
}

/**
 * 2.9.2 — draws counters equal to the active band's strength. A band that
 * owns a Mahimiana rolls a bonus die: result <= half the Mahimiana's
 * medicine (rounded down) draws 2 bonus counters, result <= full medicine
 * draws 1, otherwise 0 (2.9.2 step 1 / Player Aid).
 */
export function successCheck(
  cup: DrawCupState,
  bandStrength: number,
  mahimianaMedicine?: number,
): { successes: number; cup: DrawCupState; enemyApGained: number; bonusDraws: number } {
  let bonusDraws = 0;
  if (mahimianaMedicine !== undefined) {
    const roll = rollDie();
    if (roll <= Math.floor(mahimianaMedicine / 2)) bonusDraws = 2;
    else if (roll <= mahimianaMedicine) bonusDraws = 1;
  }

  let currentCup = cup;
  let successes = 0;
  let enemyApGained = 0;
  for (let i = 0; i < bandStrength + bonusDraws; i++) {
    const { result, cup: newCup } = drawFromCup(currentCup);
    currentCup = newCup;
    if (result.kind === "success") successes++;
    else enemyApGained += result.value;
  }
  return { successes, cup: currentCup, enemyApGained, bonusDraws };
}

export type RaidReward = "horses" | "captives";

/**
 * 5.2.3 Raid — 1MP, target must be an enemy or peace space (approximated
 * here as a tribe space or one of the enemy squares, since Peace/Enemy
 * Instruction state isn't modeled yet). Draws a Success Check of size =
 * band strength; the player picks one resource type up front and every
 * success awards one of it (the rules technically let each individual
 * success be Horses or Captives independently — simplified to one choice
 * per raid).
 */
export function raidAction(state: GameState, bandId: string, reward: RaidReward): GameState {
  const band = findBand(state, bandId);
  if (!band || !band.spaceId) return state;
  if (band.mpRemaining < 1) return withLog(state, "Raid 실패: MP 부족 (필요 1)");
  const isValidTarget = state.tribeSpaces.includes(band.spaceId) || band.spaceId.startsWith("ENEMY_");
  if (!isValidTarget) {
    return withLog(state, `Raid 실패: ${band.spaceId}는 적/평화 공간이 아닙니다`);
  }
  const mahimianaMedicine = band.ownsMahimiana ? findBandRancheriaMahimianaMedicine(state, bandId) : undefined;
  const { successes, cup, enemyApGained, bonusDraws } = successCheck(state.drawCup, band.strength, mahimianaMedicine);
  let s2: GameState = {
    ...state,
    drawCup: cup,
    generalRecord: { ...state.generalRecord, enemyAP: state.generalRecord.enemyAP + enemyApGained },
  };
  s2 = updateBand(s2, bandId, (b) => ({
    ...b,
    mpRemaining: b.mpRemaining - 1,
    resources: { ...b.resources, [reward]: b.resources[reward] + successes },
  }));
  const rewardKo = reward === "horses" ? "말" : "포로";
  const bonusText = bonusDraws > 0 ? ` (마히미아나 보너스 드로우 +${bonusDraws})` : "";
  return withLog(
    s2,
    `Raid (강도 ${band.strength}${bonusText}만큼 드로우): Success ${successes}개 → ${rewardKo} +${successes}, 적 AP +${enemyApGained}`,
  );
}

export type TradeResource = "bison" | "horses" | "captives";

/** 5.2.4 Trade — 1MP per resource spent; non-Captive resources also cost 1 AP. */
export function tradeAction(state: GameState, bandId: string, resource: TradeResource): GameState {
  const band = findBand(state, bandId);
  if (!band || !band.spaceId) return state;
  if (band.resources[resource] <= 0) return withLog(state, `Trade 실패: ${resource} 보유량 없음`);
  if (band.mpRemaining < 1) return withLog(state, "Trade 실패: MP 부족 (필요 1)");
  const gain: "tradeGoods" | "food" = resource === "captives" ? "tradeGoods" : "food";
  const apCost = resource === "captives" ? 0 : 1;
  if (state.generalRecord.playerAP < apCost) return withLog(state, "Trade 실패: AP 부족");
  let s2 = updateBand(state, bandId, (b) => ({
    ...b,
    mpRemaining: b.mpRemaining - 1,
    resources: { ...b.resources, [resource]: b.resources[resource] - 1, [gain]: b.resources[gain] + 1 },
  }));
  s2 = { ...s2, generalRecord: { ...s2.generalRecord, playerAP: s2.generalRecord.playerAP - apCost } };
  return withLog(s2, `Trade: ${resource} 1개 소비 → ${gain} 1개 획득 (MP -1${apCost ? ", AP -1" : ""})`);
}
