"use client";

import { useState } from "react";
import { GameMap } from "@/components/comancheria/GameMap";
import { GameStatusPanel } from "@/components/comancheria/GameStatusPanel";
import { createScenario92State, type GameState } from "@/lib/comancheria/game-state";
import { Button } from "@/components/ui/button";

export default function ComancheriaPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  return (
    <div className="flex h-dvh w-full flex-col">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">Comancheria</h1>
        {!gameState && (
          <Button size="sm" onClick={() => setGameState(createScenario92State())}>
            새 게임 시작 (시나리오 9.2)
          </Button>
        )}
        {gameState && (
          <span className="text-xs text-muted-foreground">시나리오 {gameState.scenarioId}</span>
        )}
      </header>
      <main className="min-h-0 flex-1">
        <GameMap gameState={gameState} />
      </main>
      {gameState && <GameStatusPanel gameState={gameState} />}
    </div>
  );
}
