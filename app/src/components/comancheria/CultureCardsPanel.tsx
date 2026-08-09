"use client";

import type { Dispatch, SetStateAction } from "react";
import type { GameState } from "@/lib/comancheria/game-state";
import { claimFreeStartingCultureCard, purchaseCultureCard } from "@/lib/comancheria/cards-actions";
import { CULTURE_CARDS } from "@/lib/comancheria/cards/culture";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function CultureCardsPanel({
  gameState,
  setGameState,
}: {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
}) {
  function update(fn: (s: GameState) => GameState) {
    setGameState((prev) => (prev ? fn(prev) : prev));
  }

  const owned = new Set(gameState.acquiredCultureCards);
  const bySet = new Map<string, typeof CULTURE_CARDS>();
  for (const c of CULTURE_CARDS) {
    if (!bySet.has(c.set)) bySet.set(c.set, []);
    bySet.get(c.set)!.push(c);
  }

  const needsFreeStartingPick = gameState.acquiredCultureCards.length === 0;

  return (
    <div className="space-y-3 text-sm">
      {needsFreeStartingPick && (
        <p className="rounded-md border border-dashed p-2 text-muted-foreground">
          시나리오 9.2 설정: 레벨 1 문화 카드 1장을 무료로 선택하세요 (아래에서 &quot;무료 획득&quot; 버튼).
        </p>
      )}
      {[...bySet.entries()].map(([set, cards]) => (
        <section key={set} className="space-y-1">
          <h4 className="font-medium">{cards[0].setKo}</h4>
          <div className="flex flex-col gap-1.5">
            {cards
              .sort((a, b) => a.level - b.level)
              .map((c) => {
                const isOwned = owned.has(c.id);
                const prereqCard = c.level > 1 ? cards.find((other) => other.level === c.level - 1) : null;
                const prereqOk = c.level === 1 || (prereqCard && owned.has(prereqCard.id));
                return (
                  <div key={c.id} className={`rounded-md border p-2 ${isOwned ? "border-primary" : ""}`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={isOwned ? "default" : "outline"}>Lv.{c.level}</Badge>
                      <span>비용 {c.cost}</span>
                      {isOwned && <Badge variant="secondary">보유</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.effectKo}</p>
                    {!isOwned && needsFreeStartingPick && c.level === 1 && (
                      <Button size="sm" className="mt-1" onClick={() => update((s) => claimFreeStartingCultureCard(s, c.id))}>
                        무료 획득
                      </Button>
                    )}
                    {!isOwned && !needsFreeStartingPick && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-1"
                        disabled={!prereqOk || gameState.generalRecord.culturePoints < c.cost}
                        onClick={() => update((s) => purchaseCultureCard(s, c.id))}
                      >
                        구매 (문화 {c.cost})
                      </Button>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
