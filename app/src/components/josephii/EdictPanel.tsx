"use client";

import { useState } from "react";
import type { GameState } from "@/lib/josephii/types";
import type { World } from "@/lib/josephii/world";
import { AREA_LABEL, AREA_NOTE, EDICTS, EDICT_BY_ID } from "@/lib/josephii/edicts";
import { EDICT_COST, EDICT_UPKEEP, TIER_SCALE, threeRoundSuccess } from "@/lib/josephii/rules";
import { canPromulgate, conflictFor, diffusionFor, enforcementFor } from "@/lib/josephii/engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { conflictLabel } from "./shared";

export function EdictPanel({
  world,
  state,
  onPromulgate,
}: {
  world: World;
  state: GameState;
  onPromulgate: (edictId: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const statusOf = (id: string) => {
    const a = state.active.find((x) => x.edictId === id);
    if (!a) return "none" as const;
    return a.inProgress ? ("running" as const) : ("done" as const);
  };

  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4, 5, 6, 7].map((area) => (
        <section key={area}>
          <h3 className="text-xs font-medium">
            영역 {area} · {AREA_LABEL[area]}
          </h3>
          <p className="mb-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {AREA_NOTE[area]}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {EDICTS.filter((e) => e.area === area).map((e) => {
              const st = statusOf(e.id);
              const affordable = canPromulgate(state, e.id);
              return (
                <button
                  key={e.id}
                  onClick={() => setOpenId(e.id)}
                  className={`rounded-md border p-2 text-left transition-colors hover:bg-accent ${
                    st === "none" ? "bg-card" : "bg-muted/50"
                  } ${st === "none" && !affordable ? "opacity-55" : ""}`}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      단계{e.tier}
                    </span>
                    <span className="truncate text-[13px] font-medium leading-tight">
                      {e.labelKo}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] tabular-nums text-muted-foreground">
                    <span>여력 {EDICT_COST[e.tier]}</span>
                    <span>
                      P{fmt(e.gain.p)} T{fmt(e.gain.t)} F{fmt(e.gain.f)}
                    </span>
                  </div>
                  {st !== "none" && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {st === "running" ? "확산 중" : "확산 종료"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {openId && (
        <EdictDialog
          world={world}
          state={state}
          edictId={openId}
          onClose={() => setOpenId(null)}
          onPromulgate={(id) => {
            onPromulgate(id);
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}

function fmt(n: number) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function EdictDialog({
  world,
  state,
  edictId,
  onClose,
  onPromulgate,
}: {
  world: World;
  state: GameState;
  edictId: string;
  onClose: () => void;
  onPromulgate: (id: string) => void;
}) {
  const edict = EDICT_BY_ID[edictId];
  const active = state.active.find((a) => a.edictId === edictId);
  const affordable = canPromulgate(state, edictId);

  // 이 칙령이 지금 반포되면 각 헥스에서 어떻게 될지 미리 계산한다
  const preview = world.hexes
    .map((hex) => ({
      hex,
      months: diffusionFor(state, hex),
      q: threeRoundSuccess(enforcementFor(world, state, hex, edict)),
    }))
    .sort((a, b) => a.months - b.months);
  const popWeighted =
    preview.reduce((n, x) => n + x.q * x.hex.population, 0) /
    world.hexes.reduce((n, h) => n + h.population, 0);

  const conflicts = world.factions
    .map((fa) => ({ fa, c: conflictFor(world, edict, fa.id) }))
    .filter((x) => x.c !== 0)
    .sort((a, b) => b.c - a.c);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {edict.labelKo}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              단계{edict.tier} · {edict.year}
            </span>
          </DialogTitle>
        </DialogHeader>

        {edict.noteKo && (
          <p className="rounded-md bg-muted/50 p-2.5 text-[11px] leading-relaxed">
            {edict.noteKo}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <Row k="반포 비용" v={`여력 ${EDICT_COST[edict.tier]}`} />
          <Row k="확산 중 유지" v={`월 ${EDICT_UPKEEP[edict.tier]}`} />
          <Row
            k="도달률 기여"
            v={`P${fmt(edict.gain.p)} T${fmt(edict.gain.t)} F${fmt(edict.gain.f)}`}
          />
          <Row k="저항 규모계수" v={`×${TIER_SCALE[edict.tier]}`} />
        </dl>

        <section>
          <h3 className="mb-1 text-xs font-medium">
            예상 관철{" "}
            <span className="text-muted-foreground">
              인구 가중 {(popWeighted * 100).toFixed(0)}%
            </span>
          </h3>
          <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-md border p-2">
            {preview.map(({ hex, months, q }) => (
              <div key={hex.id} className="flex items-center gap-2 text-[11px]">
                <span className="w-28 shrink-0 truncate text-muted-foreground">{hex.labelKo}</span>
                <span className="w-11 shrink-0 tabular-nums text-muted-foreground">{months}개월</span>
                <div className="h-1 flex-1 rounded-full bg-muted">
                  <div className="h-1 rounded-full bg-foreground/60" style={{ width: `${q * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right tabular-nums">{(q * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            도착 후 3라운드 안에 한 번이라도 성공할 확률. 지금 저항 기준이며, 도착할 때쯤이면
            달라져 있다.
          </p>
        </section>

        <section>
          <h3 className="mb-1 text-xs font-medium">이해충돌</h3>
          <div className="space-y-0.5">
            {conflicts.map(({ fa, c }) => (
              <div key={fa.id} className="flex items-center justify-between gap-2 text-[11px]">
                <span className={c > 0 ? "text-destructive" : "text-muted-foreground"}>
                  {fa.labelKo}
                </span>
                <span className="tabular-nums">
                  {c > 0 ? `+${c}` : c}{" "}
                  <span className="text-muted-foreground">{conflictLabel(c)}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {active ? (
          <p className="text-xs text-muted-foreground">
            {active.promulgatedRound}라운드에 반포되었다.
            {active.inProgress ? " 아직 확산 중이다." : " 확산이 끝났다."}
          </p>
        ) : (
          <Button onClick={() => onPromulgate(edictId)} disabled={!affordable} className="w-full">
            {affordable
              ? `반포 (여력 ${EDICT_COST[edict.tier]} 소모)`
              : `여력 부족 — ${EDICT_COST[edict.tier]} 필요, ${state.capacity.toFixed(0)} 보유`}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-dashed pb-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium tabular-nums">{v}</dd>
    </div>
  );
}
