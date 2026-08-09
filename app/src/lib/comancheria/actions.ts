import type { BandInstance, DrawCupState, GameState } from "./game-state";
import { getConnectedSpaces } from "./map-data";
import { drawFromCup, withLog } from "./engine";

function findBand(state: GameState, bandId: string): BandInstance | undefined {
  for (const r of state.rancherias) {
    const b = r.bands.find((band) => band.id === bandId);
    if (b) return b;
  }
  return undefined;
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

export function successCheck(
  cup: DrawCupState,
  count: number,
): { successes: number; cup: DrawCupState; enemyApGained: number } {
  let currentCup = cup;
  let successes = 0;
  let enemyApGained = 0;
  for (let i = 0; i < count; i++) {
    const { result, cup: newCup } = drawFromCup(currentCup);
    currentCup = newCup;
    if (result.kind === "success") successes++;
    else enemyApGained += result.value;
  }
  return { successes, cup: currentCup, enemyApGained };
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
  const { successes, cup, enemyApGained } = successCheck(state.drawCup, band.strength);
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
  return withLog(
    s2,
    `Raid (강도 ${band.strength}만큼 드로우): Success ${successes}개 → ${rewardKo} +${successes}, 적 AP +${enemyApGained}`,
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
