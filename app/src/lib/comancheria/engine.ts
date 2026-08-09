import type { DrawCupState, GamePhase, GameState, WarDeckState } from "./game-state";
import { WAR_CARDS } from "./cards/war";

export function rollDie(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export type CupDrawResult = { kind: "success" } | { kind: "enemy-ap"; value: 2 | 3 | 4 };

/**
 * Draw one counter from the Success Check Draw Cup (9.1.1 / 2.9). Success
 * counters go straight back into the cup (no change to composition).
 * Enemy AP counters leave the cup and their face value is added to the
 * running "available enemy AP" total on the general record track — from
 * there, resolving which Enemy Instruction actually fires (6.2.2.A-C) is a
 * manual judgment call the player makes by reading the rulebook.
 */
export function drawFromCup(cup: DrawCupState): { result: CupDrawResult; cup: DrawCupState } {
  const total = cup.success + cup.enemyAp2 + cup.enemyAp3 + cup.enemyAp4;
  if (total <= 0) {
    return { result: { kind: "success" }, cup };
  }
  let r = Math.floor(Math.random() * total);
  if (r < cup.success) return { result: { kind: "success" }, cup };
  r -= cup.success;
  if (r < cup.enemyAp2) {
    return { result: { kind: "enemy-ap", value: 2 }, cup: { ...cup, enemyAp2: cup.enemyAp2 - 1 } };
  }
  r -= cup.enemyAp2;
  if (r < cup.enemyAp3) {
    return { result: { kind: "enemy-ap", value: 3 }, cup: { ...cup, enemyAp3: cup.enemyAp3 - 1 } };
  }
  r -= cup.enemyAp3;
  return { result: { kind: "enemy-ap", value: 4 }, cup: { ...cup, enemyAp4: cup.enemyAp4 - 1 } };
}

export function drawWarCard(deck: WarDeckState): { cardId: string; deck: WarDeckState } {
  let { drawPile, discardPile } = deck;
  if (drawPile.length === 0) {
    // reshuffle discard back into the draw pile
    drawPile = shuffle(discardPile);
    discardPile = [];
  }
  const [cardId, ...rest] = drawPile;
  return {
    cardId,
    deck: {
      drawPile: rest,
      discardPile: [...discardPile, cardId],
      warEventCardId: cardId,
    },
  };
}

export function getWarCard(id: string) {
  return WAR_CARDS.find((c) => c.id === id);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PHASE_ORDER: GamePhase[] = ["war-column", "task-selection", "task-execution", "cleanup"];

export function nextPhase(phase: GamePhase): GamePhase {
  const idx = PHASE_ORDER.indexOf(phase);
  return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
}

export const PHASE_LABEL: Record<GamePhase, string> = {
  "war-column": "1. War Column Phase",
  "task-selection": "2. 작업 선택 단계",
  "task-execution": "3. 작업 실행 단계",
  cleanup: "4. 작업 정리 단계",
};

export function withLog(state: GameState, message: string): GameState {
  return { ...state, log: [message, ...state.log].slice(0, 30) };
}
