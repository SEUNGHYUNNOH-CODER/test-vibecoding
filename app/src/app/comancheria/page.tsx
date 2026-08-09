"use client";

import { useState } from "react";
import { GameMap } from "@/components/comancheria/GameMap";
import { GameStatusPanel } from "@/components/comancheria/GameStatusPanel";
import { TurnFlow } from "@/components/comancheria/TurnFlow";
import { createScenario92State, type GameState } from "@/lib/comancheria/game-state";
import { computeVictoryStatus } from "@/lib/comancheria/victory";
import { Button } from "@/components/ui/button";

export default function ComancheriaPage() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedBandId, setSelectedBandId] = useState<string | null>(null);

  // 2.11.1: 0 military AND 0 culture points at the same time is an immediate
  // loss — derived at render time rather than synced into state via an effect.
  const gameOver =
    gameState?.gameOver ?? (gameState && computeVictoryStatus(gameState).isDefeated ? "lose" : null);

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
      <main className="relative min-h-0 flex-[3]">
        <GameMap gameState={gameState} selectedBandId={selectedBandId} onSelectBand={setSelectedBandId} />
        {gameOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center">
            <p className="text-2xl font-semibold">{gameOver === "win" ? "승리!" : "패배"}</p>
            <p className="text-sm text-muted-foreground">
              {gameOver === "win"
                ? "H1 승리 확인 목표를 달성했습니다."
                : "승리 확인 목표를 달성하지 못했거나, 군사·문화 점수가 모두 0이 되었습니다."}
            </p>
            <Button onClick={() => setGameState(createScenario92State())}>새 게임 시작</Button>
          </div>
        )}
      </main>
      {gameState && (
        <>
          <GameStatusPanel gameState={gameState} />
          <div className="min-h-0 flex-[2] overflow-y-auto border-t">
            <TurnFlow
              gameState={gameState}
              setGameState={setGameState}
              selectedBandId={selectedBandId}
              setSelectedBandId={setSelectedBandId}
            />
          </div>
        </>
      )}
    </div>
  );
}
