"use client";

import type { GameState } from "@/lib/josephii/types";
import type { World } from "@/lib/josephii/world";
import { reachScore } from "@/lib/josephii/rules";
import { CROWNLANDS, HEX_KIND_LABEL } from "@/lib/josephii/map";
import { reachColor, weakestAxis } from "./shared";

/**
 * §13.3 — 지도는 가장 약한 축을 칠해 병목을 즉시 노출하고,
 * 헥스를 탭하면 3축 분해를 보여준다.
 * 실제 지리 좌표 대신 왕관령별 묶음으로 배치했다 — §3의 확산이 행정 경로를
 * 따르므로 물리적 인접이 필요 없다(§15.2).
 */
export function HexMap({
  world,
  state,
  onSelect,
}: {
  world: World;
  state: GameState;
  onSelect: (hexId: string) => void;
}) {
  return (
    <div className="space-y-4 p-4">
      {CROWNLANDS.filter((c) => c.hexIds.length > 0).map((crownland) => (
        <section key={crownland.id}>
          <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">
            {crownland.labelKo}
          </h3>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {crownland.hexIds.map((hexId) => {
              const hex = world.hexById[hexId];
              const reach = state.hexes[hexId].reach;
              const weak = weakestAxis(reach);
              const arriving = state.active.filter(
                (a) => a.byHex[hexId].status === "in-transit",
              ).length;
              const pending = state.active.filter(
                (a) => a.byHex[hexId].status === "pending",
              ).length;
              return (
                <button
                  key={hexId}
                  onClick={() => onSelect(hexId)}
                  className="rounded-md border bg-card p-2 text-left transition-colors hover:bg-accent"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-0.5 h-8 w-1.5 shrink-0 rounded-full"
                      style={{ background: reachColor(weak.value) }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium leading-tight">
                        {hex.labelKo}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {HEX_KIND_LABEL[hex.kind]}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] tabular-nums">
                        <span className="text-muted-foreground">{weak.labelKo}</span>
                        <span className="font-medium">{weak.value.toFixed(0)}</span>
                        <span className="text-muted-foreground">
                          · R {reachScore(reach).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(arriving > 0 || pending > 0) && (
                    <div className="mt-1.5 flex gap-1 text-[10px]">
                      {pending > 0 && (
                        <span className="rounded bg-primary px-1.5 py-0.5 text-primary-foreground">
                          판정 {pending}
                        </span>
                      )}
                      {arriving > 0 && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                          이동 중 {arriving}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
        색은 <b>가장 약한 축</b>이다. 세 축 중 무엇이 병목인지 지도에서 바로 보이도록 한 것이며,
        헥스를 누르면 3축 분해와 세력 저항을 볼 수 있다.
      </p>
    </div>
  );
}
