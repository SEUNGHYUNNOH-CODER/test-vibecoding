import type { GameState } from "./game-state";
import type { Territory } from "./types";
import { getSpace } from "./map-data";
import { withLog } from "./engine";

const TERRITORIES: Territory[] = [
  "upper-arkansas",
  "llano-estacado",
  "red-river",
  "lower-arkansas",
  "brazos-colorado",
  "rio-grande",
];

export interface VictoryStatus {
  /** Comanche Controlled per territory (1.3.1.A) — a Band or Rancheria present. Enemy Settlements aren't modeled yet, so this ignores that half of the rule. */
  territoryControl: Record<Territory, boolean>;
  rancheriaTerritories: Territory[];
  /** H1 (scenario 9.2) objective: control Upper Arkansas and have a Rancheria in a second territory. */
  objectiveMet: boolean;
  /** 2.11.1: 0 military AND 0 culture points at the same time is an immediate loss. */
  isDefeated: boolean;
}

export function computeVictoryStatus(state: GameState): VictoryStatus {
  const activeBands = state.rancherias.flatMap((r) => r.bands).filter((b) => b.status !== "in-box" && b.spaceId);

  const territoryControl = Object.fromEntries(
    TERRITORIES.map((t) => {
      const hasBand = activeBands.some((b) => getSpace(b.spaceId!)?.territory === t);
      const hasRancheria = state.rancherias.some((r) => getSpace(r.spaceId)?.territory === t);
      return [t, hasBand || hasRancheria];
    }),
  ) as Record<Territory, boolean>;

  const rancheriaTerritories = state.rancherias
    .map((r) => getSpace(r.spaceId)?.territory)
    .filter((t): t is Territory => !!t);

  const upperArkansasControlled = territoryControl["upper-arkansas"];
  const hasSecondTerritoryRancheria = rancheriaTerritories.some((t) => t !== "upper-arkansas");
  const objectiveMet = upperArkansasControlled && hasSecondTerritoryRancheria;

  const isDefeated = state.generalRecord.militaryPoints === 0 && state.generalRecord.culturePoints === 0;

  return { territoryControl, rancheriaTerritories, objectiveMet, isDefeated };
}

/**
 * 2.10 victory check (triggered manually, matching Passage of Time step
 * 15). Scenario 9.2 is a single historical period, so meeting the H1
 * objective here is an outright win; missing it is an outright loss.
 */
export function performVictoryCheck(state: GameState): GameState {
  if (state.gameOver) return state;
  const status = computeVictoryStatus(state);
  if (status.objectiveMet) {
    return withLog({ ...state, gameOver: "win" }, "승리 확인: 목표 달성 — 승리!");
  }
  return withLog({ ...state, gameOver: "lose" }, "승리 확인: 목표 미달성 — 패배");
}
