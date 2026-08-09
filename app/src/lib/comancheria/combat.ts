import type { BandInstance, GameState, WarColumnState } from "./game-state";
import { rollDie, withLog } from "./engine";

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

export function addWarColumn(
  state: GameState,
  params: { enemy: WarColumnState["enemy"]; strength: number; combatDrm: number; spaceId: string },
): GameState {
  const wc: WarColumnState = { id: `wc-${crypto.randomUUID()}`, ...params };
  return withLog(
    { ...state, warColumns: [...state.warColumns, wc] },
    `War Column 배치: ${params.enemy} 강도 ${params.strength} @ ${params.spaceId}`,
  );
}

export function removeWarColumn(state: GameState, warColumnId: string): GameState {
  return withLog(
    { ...state, warColumns: state.warColumns.filter((w) => w.id !== warColumnId) },
    `War Column 제거`,
  );
}

export function adjustWarColumnStrength(state: GameState, warColumnId: string, delta: number): GameState {
  return {
    ...state,
    warColumns: state.warColumns.map((w) =>
      w.id === warColumnId ? { ...w, strength: Math.max(0, Math.min(8, w.strength + delta)) } : w,
    ),
  };
}

export interface CombatRoundResult {
  diceRolled: number[];
  usedRoll: number;
  modifiers: { label: string; value: number }[];
  totalModifier: number;
  modifiedResult: number;
  outcome: "comanche" | "enemy";
}

/**
 * 7.1 combat resolution for the "Comanche unit is a Band" case (Allied
 * Tribe defenders aren't modeled yet). Rolls 2d6-take-higher if the band
 * owns Guns, otherwise 1d6. An unmodified 1 always loses regardless of
 * modifiers; otherwise modified total >= 6 wins for the Comanche.
 */
export function resolveCombatRound(band: BandInstance, warColumn: WarColumnState): CombatRoundResult {
  const usesGuns = band.resources.guns > 0;
  const d1 = rollDie();
  const d2 = usesGuns ? rollDie() : null;
  const usedRoll = d2 !== null ? Math.max(d1, d2) : d1;

  const modifiers = [
    { label: "밴드 강도", value: band.strength },
    ...(band.ownsMahimiana ? [{ label: "마히미아나 참전", value: 1 }] : []),
    ...(band.status === "finished" ? [{ label: "완료 상태 밴드", value: -1 }] : []),
    { label: "War Column Battle DRM", value: warColumn.combatDrm },
  ];
  const totalModifier = modifiers.reduce((sum, m) => sum + m.value, 0);
  const modifiedResult = usedRoll + totalModifier;
  const outcome: "comanche" | "enemy" = usedRoll === 1 ? "enemy" : modifiedResult >= 6 ? "comanche" : "enemy";

  return {
    diceRolled: d2 !== null ? [d1, d2] : [d1],
    usedRoll,
    modifiers,
    totalModifier,
    modifiedResult,
    outcome,
  };
}

/** 7.2 combat results, band-vs-column case. */
export function applyCombatResult(
  state: GameState,
  bandId: string,
  warColumnId: string,
  outcome: "comanche" | "enemy",
): GameState {
  const band = findBand(state, bandId);
  const warColumn = state.warColumns.find((w) => w.id === warColumnId);
  if (!band || !warColumn) return state;

  if (outcome === "comanche") {
    const newStrength = warColumn.strength - 1;
    if (newStrength <= 0) {
      let s2: GameState = { ...state, warColumns: state.warColumns.filter((w) => w.id !== warColumnId) };
      const homeRancheria = s2.rancherias.find((r) => r.spaceId === band.spaceId);
      if (homeRancheria) {
        s2 = updateBand(s2, bandId, (b) => ({ ...b, status: "in-box", spaceId: null }));
      }
      return withLog(s2, `전투 승리 — War Column 격파, 전쟁 종료`);
    }
    const s2 = {
      ...state,
      warColumns: state.warColumns.map((w) => (w.id === warColumnId ? { ...w, strength: newStrength } : w)),
    };
    return withLog(s2, `전투 승리 — War Column 강도 ${warColumn.strength} → ${newStrength} (전투 계속 가능)`);
  }

  const newStrength = band.strength - 1;
  if (newStrength <= 0) {
    const s2: GameState = {
      ...state,
      rancherias: state.rancherias.map((r) => ({ ...r, bands: r.bands.filter((b) => b.id !== bandId) })),
    };
    return withLog(s2, `전투 패배 — 밴드 전멸`);
  }
  const s2 = updateBand(state, bandId, (b) => ({ ...b, strength: newStrength }));
  return withLog(s2, `전투 패배 — 밴드 강도 ${band.strength} → ${newStrength}`);
}
