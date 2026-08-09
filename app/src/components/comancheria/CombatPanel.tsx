"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { GameState, WarColumnState } from "@/lib/comancheria/game-state";
import { addWarColumn, adjustWarColumnStrength, applyCombatResult, removeWarColumn, resolveCombatRound } from "@/lib/comancheria/combat";
import { getSpace } from "@/lib/comancheria/map-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ENEMY_LABEL: Record<WarColumnState["enemy"], string> = {
  north: "북쪽 (부족)",
  south: "남쪽",
  east: "동쪽",
  west: "서쪽",
};

export function CombatPanel({
  gameState,
  setGameState,
}: {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
}) {
  const [enemy, setEnemy] = useState<WarColumnState["enemy"]>("west");
  const [strength, setStrength] = useState(4);
  const [combatDrm, setCombatDrm] = useState(0);
  const [spaceId, setSpaceId] = useState("UA1");
  const [lastRoundBySpace, setLastRoundBySpace] = useState<Record<string, ReturnType<typeof resolveCombatRound>>>({});

  function update(fn: (s: GameState) => GameState) {
    setGameState((prev) => (prev ? fn(prev) : prev));
  }

  const allBands = gameState.rancherias.flatMap((r) => r.bands);

  const combatSpaces = gameState.warColumns
    .map((wc) => ({
      warColumn: wc,
      band: allBands.find((b) => b.spaceId === wc.spaceId && b.status !== "in-box"),
    }))
    .filter((c) => c.band);

  return (
    <div className="space-y-3 text-sm">
      <section className="space-y-1.5">
        <h4 className="font-medium">War Column 배치/관리</h4>
        <p className="text-xs text-muted-foreground">
          적 진영 판단(누가, 어디에, 얼마나 강하게)은 규칙서로 직접 정하고, 여기서는 그 결과만 기록하세요. Battle
          DRM(카운터 우측 하단 수정치)은 실물 카운터를 보고 입력하세요.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">적</Label>
            <select
              className="block h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={enemy}
              onChange={(e) => setEnemy(e.target.value as WarColumnState["enemy"])}
            >
              {(Object.keys(ENEMY_LABEL) as WarColumnState["enemy"][]).map((k) => (
                <option key={k} value={k}>
                  {ENEMY_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">강도</Label>
            <Input type="number" min={1} max={8} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="w-16" />
          </div>
          <div>
            <Label className="text-xs">Battle DRM</Label>
            <Input type="number" value={combatDrm} onChange={(e) => setCombatDrm(Number(e.target.value))} className="w-16" />
          </div>
          <div>
            <Label className="text-xs">공간 ID</Label>
            <Input value={spaceId} onChange={(e) => setSpaceId(e.target.value.toUpperCase())} className="w-20" />
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (!getSpace(spaceId)) return;
              update((s) => addWarColumn(s, { enemy, strength, combatDrm, spaceId }));
            }}
          >
            배치
          </Button>
        </div>

        {gameState.warColumns.length > 0 && (
          <ul className="space-y-1">
            {gameState.warColumns.map((wc) => (
              <li key={wc.id} className="flex flex-wrap items-center gap-2 rounded-md border p-1.5">
                <span>
                  {ENEMY_LABEL[wc.enemy]} 강도 {wc.strength} (DRM {wc.combatDrm}) @ {wc.spaceId}
                </span>
                <Button size="sm" variant="outline" onClick={() => update((s) => adjustWarColumnStrength(s, wc.id, -1))}>
                  -1
                </Button>
                <Button size="sm" variant="outline" onClick={() => update((s) => adjustWarColumnStrength(s, wc.id, 1))}>
                  +1
                </Button>
                <Button size="sm" variant="destructive" onClick={() => update((s) => removeWarColumn(s, wc.id))}>
                  제거
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h4 className="font-medium">전투 (규칙 7)</h4>
        {combatSpaces.length === 0 && (
          <p className="text-muted-foreground">밴드와 War Column이 같은 공간에 있어야 전투가 발생합니다.</p>
        )}
        {combatSpaces.map(({ warColumn, band }) => {
          if (!band) return null;
          const last = lastRoundBySpace[warColumn.id];
          return (
            <div key={warColumn.id} className="space-y-1.5 rounded-md border p-2">
              <p>
                {warColumn.spaceId} — 밴드(강도 {band.strength}) vs {ENEMY_LABEL[warColumn.enemy]} War Column(강도{" "}
                {warColumn.strength})
              </p>
              <Button
                size="sm"
                onClick={() => {
                  const result = resolveCombatRound(band, warColumn);
                  setLastRoundBySpace((prev) => ({ ...prev, [warColumn.id]: result }));
                  update((s) => applyCombatResult(s, band.id, warColumn.id, result.outcome));
                }}
              >
                전투 라운드 진행
              </Button>
              {last && (
                <div className="text-xs text-muted-foreground">
                  <p>
                    주사위: {last.diceRolled.join(", ")} → 사용 {last.usedRoll} / 수정치 합계 {last.totalModifier >= 0 ? "+" : ""}
                    {last.totalModifier} = {last.modifiedResult}
                  </p>
                  <p>{last.modifiers.map((m) => `${m.label} ${m.value >= 0 ? "+" : ""}${m.value}`).join(", ")}</p>
                  <p className="font-medium text-foreground">
                    결과: {last.outcome === "comanche" ? "Comanche 승리" : "적 승리"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
