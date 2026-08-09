"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { GameState, PlayerTask } from "@/lib/comancheria/game-state";
import {
  PHASE_LABEL,
  drawFromCup,
  drawWarCard,
  getWarCard,
  nextPhase,
  rollDie,
  withLog,
} from "@/lib/comancheria/engine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TASK_LABEL: Record<PlayerTask, string> = {
  actions: "조치 수행",
  culture: "문화",
  planning: "계획",
  "passage-of-time": "시간 경과",
};

const TASK_DESC: Record<PlayerTask, string> = {
  actions: "밴드를 활성화해 Hunt / Trade / Raid / Warpath 등 액션을 수행합니다 (규칙 4.1, 5장).",
  culture: "코만치 문화 등급을 향상시킵니다 (규칙 4.2).",
  planning: "우두머리 의약을 개선하고, 란체리아를 이동하고, AP를 획득하고, 개발 카드를 손에 넣습니다 (규칙 4.3).",
  "passage-of-time": "작업 카운터를 트랙에서 전진시킵니다. 승리 확인이 발생할 수 있습니다 (규칙 4.4).",
};

export function TurnFlow({
  gameState,
  setGameState,
}: {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
}) {
  const [lastCupResult, setLastCupResult] = useState<string | null>(null);
  const [lastDie, setLastDie] = useState<number | null>(null);

  function update(fn: (s: GameState) => GameState) {
    setGameState((prev) => (prev ? fn(prev) : prev));
  }

  function handleDrawWarCard() {
    update((s) => {
      const { cardId, deck } = drawWarCard(s.warDeck);
      const card = getWarCard(cardId);
      const moveText = card
        ? Object.entries(card.movement)
            .map(([dir, v]) => `${dir}:${v}`)
            .join(", ") || "이동 없음"
        : "?";
      return withLog(
        { ...s, warDeck: deck },
        `전쟁 카드 ${cardId} 뽑음 — ${card?.titleKo ?? ""} (이동 ${moveText})`,
      );
    });
  }

  function handleDrawCup() {
    const { result, cup } = drawFromCup(gameState.drawCup);
    if (result.kind === "success") {
      setLastCupResult("Success!");
      update((s) => withLog({ ...s, drawCup: cup }, "드로우 컵: Success — 규칙 6.2.2.A로 지시 해결 필요"));
      return;
    }
    setLastCupResult(`적 AP +${result.value}`);
    update((s) =>
      withLog(
        {
          ...s,
          drawCup: cup,
          generalRecord: { ...s.generalRecord, enemyAP: s.generalRecord.enemyAP + result.value },
        },
        `드로우 컵: 적 AP 카운터(${result.value}) — 사용 가능한 적 AP에 추가`,
      ),
    );
  }

  function handleRollDie() {
    const v = rollDie();
    setLastDie(v);
    update((s) => withLog(s, `주사위: ${v}`));
  }

  function handleSelectTask(task: PlayerTask) {
    update((s) => withLog({ ...s, selectedTask: task, phase: "task-execution" }, `작업 선택: ${TASK_LABEL[task]}`));
  }

  function handleNextPhase() {
    update((s) => withLog({ ...s, phase: nextPhase(s.phase) }, `${PHASE_LABEL[nextPhase(s.phase)]}로 진행`));
  }

  const warEventCard = gameState.warDeck.warEventCardId ? getWarCard(gameState.warDeck.warEventCardId) : null;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {(["war-column", "task-selection", "task-execution", "cleanup"] as const).map((p) => (
          <Badge key={p} variant={gameState.phase === p ? "default" : "outline"}>
            {PHASE_LABEL[p]}
          </Badge>
        ))}
      </div>

      {gameState.phase === "war-column" && (
        <section className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            사용 중인 War Column이 있으면 전쟁 카드를 뽑아 이동/이벤트를 확인하고, 지도 위 War Column을 직접
            옮기세요 (규칙 3.1). 사용 중인 War Column이 없으면 바로 다음 단계로 넘어가세요.
          </p>
          <Button size="sm" variant="outline" onClick={handleDrawWarCard}>
            전쟁 카드 뽑기 ({gameState.warDeck.drawPile.length}장 남음)
          </Button>
          {warEventCard && (
            <div className="rounded-md border p-2">
              <p className="font-medium">
                {warEventCard.id} — {warEventCard.titleKo}
              </p>
              <p className="text-xs text-muted-foreground">
                이동:{" "}
                {Object.entries(warEventCard.movement)
                  .map(([dir, v]) => `${dir} ${v}`)
                  .join(", ") || "없음"}
              </p>
              <p className="mt-1">{warEventCard.effectKo}</p>
            </div>
          )}
        </section>
      )}

      {gameState.phase === "task-selection" && (
        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">이번 라운드에 수행할 작업을 하나 선택하세요 (규칙 3.2).</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(TASK_LABEL) as PlayerTask[]).map((task) => (
              <Button key={task} variant="outline" onClick={() => handleSelectTask(task)} className="h-auto flex-col items-start gap-1 whitespace-normal p-3 text-left">
                <span className="font-medium">{TASK_LABEL[task]}</span>
                <span className="text-xs font-normal text-muted-foreground">{TASK_DESC[task]}</span>
              </Button>
            ))}
          </div>
        </section>
      )}

      {gameState.phase === "task-execution" && (
        <section className="space-y-2 text-sm">
          <p>
            선택한 작업: <b>{gameState.selectedTask ? TASK_LABEL[gameState.selectedTask] : "-"}</b>
          </p>
          <p className="text-muted-foreground">
            {gameState.selectedTask ? TASK_DESC[gameState.selectedTask] : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleDrawCup}>
              Success Check 뽑기
            </Button>
            <Button size="sm" variant="outline" onClick={handleRollDie}>
              주사위 굴리기
            </Button>
          </div>
          {lastCupResult && <p>드로우 결과: {lastCupResult}</p>}
          {lastDie !== null && <p>주사위 결과: {lastDie}</p>}
        </section>
      )}

      {gameState.phase === "cleanup" && (
        <section className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            규칙 3.4 절차: 1) 적재 한도 정리 2) 완료된 밴드 있는 란체리아마다 주사위로 무료 명령 여부 확인 3) Success
            Check 드로우 컵에서 1개 뽑아 해결 4) Santa Fé Trail 조건 확인. 자동화되지 않는 판정은 규칙서를 참고해
            직접 진행하세요.
          </p>
          <Button size="sm" variant="outline" onClick={handleDrawCup}>
            정리 단계 Success Check 뽑기
          </Button>
          {lastCupResult && <p>드로우 결과: {lastCupResult}</p>}
        </section>
      )}

      <Button onClick={handleNextPhase} className="mt-1">
        다음 단계: {PHASE_LABEL[nextPhase(gameState.phase)]} →
      </Button>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">최근 로그</summary>
        <ul className="mt-1 space-y-0.5">
          {gameState.log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
