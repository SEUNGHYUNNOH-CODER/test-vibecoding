import type { GameState } from "./game-state";
import { withLog } from "./engine";
import { DEVELOPMENT_CARDS_PERIOD_1 } from "./cards/development-period1";
import { CULTURE_CARDS } from "./cards/culture";

export function getDevCard(number: number) {
  return DEVELOPMENT_CARDS_PERIOD_1.find((c) => c.number === number);
}

export function getCultureCard(id: string) {
  return CULTURE_CARDS.find((c) => c.id === id);
}

/**
 * Fills any empty development card slot by drawing the top of the deck
 * (rulebook 4.4 step 12). "When revealed" cards resolve immediately — their
 * effect text is logged for the player to apply by hand — and go straight
 * to the discard pile instead of sitting face-up, leaving the slot empty
 * for another attempt.
 */
export function fillEmptyDevSlots(state: GameState): GameState {
  let deck = state.developmentDeck;
  let drawPile = deck.drawPile;
  let discardPile = deck.discardPile;
  const layout = [...deck.layout];
  const logs: string[] = [];

  for (let i = 0; i < layout.length; i++) {
    if (layout[i] !== null) continue;
    if (drawPile.length === 0) {
      logs.push("개발 카드 드로우 더미가 비었습니다.");
      break;
    }
    const [num, ...rest] = drawPile;
    drawPile = rest;
    const card = getDevCard(num);
    if (card?.timing === "when-revealed") {
      discardPile = [...discardPile, num];
      logs.push(`개발 카드 #${num} 공개: ${card.titleKo} — ${card.effectKo}`);
    } else {
      layout[i] = num;
      logs.push(`개발 카드 슬롯 채움: #${num} ${card?.titleKo ?? ""}`);
    }
  }

  deck = { ...deck, layout, drawPile, discardPile };
  let s2: GameState = { ...state, developmentDeck: deck };
  for (const l of logs) s2 = withLog(s2, l);
  return s2;
}

export function takeDevCardToHand(state: GameState, slotIndex: number): GameState {
  const num = state.developmentDeck.layout[slotIndex];
  if (num === null || num === undefined) return state;
  const card = getDevCard(num);
  const cost = card?.apCost ?? 0;
  if (state.generalRecord.playerAP < cost) {
    return withLog(state, `카드 #${num} 손으로 가져오기 실패: AP 부족 (필요 ${cost})`);
  }
  const layout = [...state.developmentDeck.layout];
  layout[slotIndex] = null;
  const s2: GameState = {
    ...state,
    generalRecord: { ...state.generalRecord, playerAP: state.generalRecord.playerAP - cost },
    developmentDeck: { ...state.developmentDeck, layout, hand: [...state.developmentDeck.hand, num] },
  };
  return withLog(s2, `카드 #${num} (${card?.titleKo ?? ""}) 손으로 가져옴 (AP -${cost})`);
}

/** Plays a card out of hand. `while-in-play` cards move to the in-play row; everything else is one-shot and discards. */
export function playHandCard(state: GameState, num: number): GameState {
  const hand = state.developmentDeck.hand;
  if (!hand.includes(num)) return state;
  const card = getDevCard(num);
  const newHand = hand.filter((n) => n !== num);
  const deck =
    card?.timing === "while-in-play"
      ? { ...state.developmentDeck, hand: newHand, inPlay: [...state.developmentDeck.inPlay, num] }
      : { ...state.developmentDeck, hand: newHand, discardPile: [...state.developmentDeck.discardPile, num] };
  return withLog(
    { ...state, developmentDeck: deck },
    `카드 #${num} 플레이: ${card?.titleKo ?? ""} — ${card?.effectKo ?? ""}`,
  );
}

export function discardSlotCard(state: GameState, slotIndex: number): GameState {
  const num = state.developmentDeck.layout[slotIndex];
  if (num === null || num === undefined) return state;
  const layout = [...state.developmentDeck.layout];
  layout[slotIndex] = null;
  return withLog(
    { ...state, developmentDeck: { ...state.developmentDeck, layout, discardPile: [...state.developmentDeck.discardPile, num] } },
    `카드 #${num} 슬롯에서 제거`,
  );
}

export function discardInPlayCard(state: GameState, num: number): GameState {
  const inPlay = state.developmentDeck.inPlay.filter((n) => n !== num);
  return withLog(
    { ...state, developmentDeck: { ...state.developmentDeck, inPlay, discardPile: [...state.developmentDeck.discardPile, num] } },
    `인플레이 카드 #${num} 제거`,
  );
}

function cultureLevelOwned(state: GameState, set: string, level: number): boolean {
  return state.acquiredCultureCards.some((id) => {
    const c = getCultureCard(id);
    return c && c.set === set && c.level === level;
  });
}

export function claimFreeStartingCultureCard(state: GameState, cardId: string): GameState {
  if (state.acquiredCultureCards.length > 0) return state;
  const card = getCultureCard(cardId);
  if (!card || card.level !== 1) return state;
  return withLog(
    { ...state, acquiredCultureCards: [...state.acquiredCultureCards, cardId] },
    `시작 무료 문화 카드: ${card.setKo} 레벨 1 획득`,
  );
}

/** Purchases a culture card during Passage of Time (4.4 step 13); requires owning the prior level in the same set. */
export function purchaseCultureCard(state: GameState, cardId: string): GameState {
  const card = getCultureCard(cardId);
  if (!card) return state;
  if (state.acquiredCultureCards.includes(cardId)) {
    return withLog(state, `문화 카드 구매 실패: 이미 보유 중`);
  }
  if (card.level > 1 && !cultureLevelOwned(state, card.set, card.level - 1)) {
    return withLog(state, `문화 카드 구매 실패: ${card.setKo} 레벨 ${card.level - 1}을 먼저 보유해야 합니다`);
  }
  if (state.generalRecord.culturePoints < card.cost) {
    return withLog(state, `문화 카드 구매 실패: 문화 점수 부족 (필요 ${card.cost})`);
  }
  const s2: GameState = {
    ...state,
    generalRecord: { ...state.generalRecord, culturePoints: state.generalRecord.culturePoints - card.cost },
    acquiredCultureCards: [...state.acquiredCultureCards, cardId],
  };
  return withLog(s2, `문화 카드 구매: ${card.setKo} 레벨 ${card.level} (문화 점수 -${card.cost})`);
}
