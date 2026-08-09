"use client";

import type { Dispatch, SetStateAction } from "react";
import type { GameState } from "@/lib/comancheria/game-state";
import {
  discardInPlayCard,
  discardSlotCard,
  fillEmptyDevSlots,
  getDevCard,
  playHandCard,
  takeDevCardToHand,
} from "@/lib/comancheria/cards-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DevelopmentCardsPanel({
  gameState,
  setGameState,
}: {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
}) {
  function update(fn: (s: GameState) => GameState) {
    setGameState((prev) => (prev ? fn(prev) : prev));
  }

  const { layout, hand, inPlay, drawPile } = gameState.developmentDeck;

  return (
    <div className="space-y-3 text-sm">
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">개발 카드 슬롯</h4>
          <Button size="sm" variant="outline" onClick={() => update(fillEmptyDevSlots)}>
            빈 슬롯 채우기 ({drawPile.length}장 남음)
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          {layout.map((num, i) => {
            if (num === null) {
              return (
                <div key={i} className="rounded-md border border-dashed p-2 text-muted-foreground">
                  (빈 슬롯)
                </div>
              );
            }
            const card = getDevCard(num);
            return (
              <div key={i} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">#{num}</Badge>
                  <span className="font-medium">{card?.titleKo}</span>
                  <Badge variant="outline">{card?.timing}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{card?.effectKo}</p>
                <div className="mt-1 flex gap-2">
                  {card?.timing === "play-from-hand" && (
                    <Button size="sm" onClick={() => update((s) => takeDevCardToHand(s, i))}>
                      손으로 가져오기 (AP {card.apCost})
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => update((s) => discardSlotCard(s, i))}>
                    제거
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-1.5">
        <h4 className="font-medium">손패 ({hand.length}장)</h4>
        {hand.length === 0 && <p className="text-muted-foreground">손패가 비어 있습니다.</p>}
        {hand.map((num) => {
          const card = getDevCard(num);
          return (
            <div key={num} className="rounded-md border p-2">
              <p className="font-medium">
                #{num} {card?.titleKo}
              </p>
              <p className="text-xs text-muted-foreground">{card?.effectKo}</p>
              <Button size="sm" className="mt-1" onClick={() => update((s) => playHandCard(s, num))}>
                플레이
              </Button>
            </div>
          );
        })}
      </section>

      {inPlay.length > 0 && (
        <section className="space-y-1.5">
          <h4 className="font-medium">인플레이 (지속 효과)</h4>
          {inPlay.map((num) => {
            const card = getDevCard(num);
            return (
              <div key={num} className="rounded-md border p-2">
                <p className="font-medium">
                  #{num} {card?.titleKo}
                </p>
                <p className="text-xs text-muted-foreground">{card?.effectKo}</p>
                <Button size="sm" variant="outline" className="mt-1" onClick={() => update((s) => discardInPlayCard(s, num))}>
                  제거
                </Button>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
