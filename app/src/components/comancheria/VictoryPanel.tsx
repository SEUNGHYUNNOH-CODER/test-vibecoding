"use client";

import type { Dispatch, SetStateAction } from "react";
import type { GameState } from "@/lib/comancheria/game-state";
import { computeVictoryStatus, performVictoryCheck } from "@/lib/comancheria/victory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TERRITORY_LABEL: Record<string, string> = {
  "upper-arkansas": "Upper Arkansas",
  "llano-estacado": "Llano Estacado",
  "red-river": "Red River",
  "lower-arkansas": "Lower Arkansas",
  "brazos-colorado": "Brazos Colorado",
  "rio-grande": "Rio Grande",
};

export function VictoryPanel({
  gameState,
  setGameState,
}: {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
}) {
  const status = computeVictoryStatus(gameState);

  return (
    <section className="space-y-2 rounded-md border p-2 text-sm">
      <h4 className="font-medium">승리 확인 (규칙 2.10, H1 목표)</h4>
      <p className="text-xs text-muted-foreground">
        목표: Upper Arkansas를 통제하고, 다른 영토에 란체리아를 하나 이상 두고 있을 것.
      </p>
      <div className="flex flex-wrap gap-1">
        {Object.entries(status.territoryControl).map(([t, controlled]) => (
          <Badge key={t} variant={controlled ? "default" : "outline"}>
            {TERRITORY_LABEL[t] ?? t} {controlled ? "✓" : ""}
          </Badge>
        ))}
      </div>
      <p>
        란체리아 위치: {status.rancheriaTerritories.map((t) => TERRITORY_LABEL[t] ?? t).join(", ") || "없음"}
      </p>
      <p className="font-medium">현재 목표 달성 여부: {status.objectiveMet ? "달성" : "미달성"}</p>
      <Button
        size="sm"
        onClick={() => setGameState((prev) => (prev ? performVictoryCheck(prev) : prev))}
        disabled={!!gameState.gameOver}
      >
        승리 확인 수행 (시나리오 9.2는 이 확인이 곧 최종 결과입니다)
      </Button>
    </section>
  );
}
