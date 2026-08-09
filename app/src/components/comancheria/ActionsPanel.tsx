"use client";

import type { Dispatch, SetStateAction } from "react";
import type { BandInstance, GameState } from "@/lib/comancheria/game-state";
import {
  activateOneBand,
  claimMahimiana,
  finishBand,
  huntAction,
  moveAction,
  raidAction,
  releaseMahimiana,
  tradeAction,
} from "@/lib/comancheria/actions";
import { getConnectedSpaces, getSpace } from "@/lib/comancheria/map-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const RESOURCE_LABEL: Record<string, string> = {
  bison: "들소",
  captives: "포로",
  horses: "말",
  food: "식량",
  tradeGoods: "무역품",
  guns: "총기",
};

function resourceSummary(b: BandInstance) {
  const parts = Object.entries(b.resources)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${RESOURCE_LABEL[k] ?? k} ${v}`);
  return parts.length ? parts.join(", ") : "없음";
}

export function ActionsPanel({
  gameState,
  setGameState,
  selectedBandId,
  setSelectedBandId,
}: {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState | null>>;
  selectedBandId: string | null;
  setSelectedBandId: (id: string | null) => void;
}) {
  function update(fn: (s: GameState) => GameState) {
    setGameState((prev) => (prev ? fn(prev) : prev));
  }

  const allBands = gameState.rancherias.flatMap((r) => r.bands.map((b) => ({ ...b, rancheriaId: r.id })));
  const selectedBand = allBands.find((b) => b.id === selectedBandId) ?? null;
  const boxRancherias = gameState.rancherias.filter((r) => r.bands.some((b) => b.status === "in-box"));
  const selectedBandRancheria = selectedBand
    ? gameState.rancherias.find((r) => r.id === selectedBand.rancheriaId)
    : null;
  const canClaimMahimiana =
    selectedBand &&
    selectedBandRancheria &&
    selectedBandRancheria.hasMahimiana &&
    !selectedBandRancheria.bands.some((b) => b.ownsMahimiana) &&
    selectedBand.spaceId === selectedBandRancheria.spaceId;

  return (
    <div className="space-y-3 text-sm">
      {boxRancherias.length > 0 && (
        <section className="space-y-1">
          <h4 className="font-medium">란체리아 활성화</h4>
          <p className="text-xs text-muted-foreground">
            밴드는 한 번에 하나씩 활성화됩니다 (규칙 4.1: 최소 1개, 원하는 만큼 반복 가능).
          </p>
          {boxRancherias.map((r) => (
            <Button key={r.id} size="sm" variant="outline" onClick={() => update((s) => activateOneBand(s, r.id))}>
              란체리아 {r.id}에서 밴드 1개 활성화 (자원 상자 {r.bands.filter((b) => b.status === "in-box").length}개, @
              {r.spaceId})
            </Button>
          ))}
        </section>
      )}

      <section className="space-y-1">
        <h4 className="font-medium">밴드 목록</h4>
        {allBands.length === 0 && <p className="text-muted-foreground">아직 활성화된 밴드가 없습니다.</p>}
        <div className="flex flex-col gap-1.5">
          {allBands.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBandId(b.id)}
              className={`rounded-md border p-2 text-left ${b.id === selectedBandId ? "border-primary ring-1 ring-primary" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={b.status === "finished" ? "outline" : "secondary"}>
                  {b.status === "in-box" ? "자원 상자" : b.status === "active" ? "활동 중" : "완료"}
                </Badge>
                <span>강도 {b.strength}</span>
                {b.status !== "in-box" && (
                  <span>
                    MP {b.mpRemaining}/{b.mpMax}
                  </span>
                )}
                {b.spaceId && <span>@ {b.spaceId}</span>}
                {b.ownsMahimiana && <Badge variant="secondary">마히미아나</Badge>}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">보유 자원: {resourceSummary(b)}</p>
            </button>
          ))}
        </div>
      </section>

      {selectedBand && selectedBand.status === "active" && selectedBand.spaceId && (
        <section className="space-y-2 rounded-md border p-2">
          <h4 className="font-medium">
            선택된 밴드 액션 — {selectedBand.spaceId} ({getSpace(selectedBand.spaceId)?.label})
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => update((s) => huntAction(s, selectedBand.id))}>
              Hunt
            </Button>
            <Button size="sm" onClick={() => update((s) => raidAction(s, selectedBand.id, "horses"))}>
              Raid (말 획득)
            </Button>
            <Button size="sm" onClick={() => update((s) => raidAction(s, selectedBand.id, "captives"))}>
              Raid (포로 획득)
            </Button>
            {(["bison", "horses", "captives"] as const)
              .filter((res) => selectedBand.resources[res] > 0)
              .map((res) => (
                <Button key={res} size="sm" variant="secondary" onClick={() => update((s) => tradeAction(s, selectedBand.id, res))}>
                  Trade: {RESOURCE_LABEL[res]}
                </Button>
              ))}
            <Button size="sm" variant="outline" onClick={() => update((s) => finishBand(s, selectedBand.id))}>
              완료 처리
            </Button>
            {canClaimMahimiana && (
              <Button size="sm" variant="secondary" onClick={() => update((s) => claimMahimiana(s, selectedBand.id))}>
                마히미아나 인수
              </Button>
            )}
            {selectedBand.ownsMahimiana && (
              <Button size="sm" variant="outline" onClick={() => update((s) => releaseMahimiana(s, selectedBand.id))}>
                마히미아나 반환
              </Button>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">이동 (인접 공간 탭):</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {getConnectedSpaces(selectedBand.spaceId).map((spaceId) => (
                <Button
                  key={spaceId}
                  size="sm"
                  variant="outline"
                  onClick={() => update((s) => moveAction(s, selectedBand.id, spaceId))}
                >
                  {spaceId}
                </Button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
