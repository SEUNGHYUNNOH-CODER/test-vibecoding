"use client";

import { useState } from "react";
import type { GameState } from "@/lib/josephii/types";
import type { World } from "@/lib/josephii/world";
import { EDICT_BY_ID } from "@/lib/josephii/edicts";
import { AUTHORITY_ON_WITHDRAW } from "@/lib/josephii/rules";
import {
  ACTIONS,
  type ActionId,
  canAct,
  canReproclaim,
  canSuppress,
  enactedWeightedRatio,
  reproclaimCost,
  revolutionBlockers,
} from "@/lib/josephii/engine";
import { SUPPRESS } from "@/lib/josephii/rules";
import { CROWNLANDS, COMMANDS } from "@/lib/josephii/map";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ActivePanel({
  world,
  state,
  onReproclaim,
  onWithdraw,
  onAct,
  onDismiss,
  onSuppress,
}: {
  world: World;
  state: GameState;
  onReproclaim: (edictId: string) => void;
  onWithdraw: (edictId: string, crownlandId?: string) => void;
  onAct: (id: ActionId, targetId?: string) => void;
  onDismiss: (effectId: string) => void;
  onSuppress: (revoltId: string) => void;
}) {
  const [withdrawTarget, setWithdrawTarget] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionId | null>(null);
  const running = state.active.filter((a) => a.inProgress);
  const finished = state.active.filter((a) => !a.inProgress);

  return (
    <div className="space-y-5 p-4">
      {state.revolts.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-medium text-destructive">
            진행 중인 봉기 {state.revolts.length}건
          </h3>
          <div className="space-y-1.5">
            {state.revolts.map((r) => {
              const blockers = r.kind === "burgher"
                ? revolutionBlockers(world, state, r.crownlandId)
                : [];
              return (
                <div key={r.id} className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-medium">
                      {r.labelKo} · {world.hexById[r.hexIds[0]].crownlandKo}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      R{r.startRound} 발생 · {r.hexIds.length}헥스
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {r.kind === "peasant"
                      ? `집행률 ×0.2, 인구 도달이 매달 깎인다. 방아쇠가 된 ${
                          r.triggerEdictId ? EDICT_BY_ID[r.triggerEdictId].labelKo : "칙령"
                        }을 이 왕관령에서 철회하면 즉시 끝난다.`
                      : blockers.length > 0
                        ? `집행률 ×0.1. 진압할 수 없다. 도시민을 적대한 칙령 ${blockers.length}건을 이 왕관령에서 모두 철회해야 끝난다 — ${blockers.map((e) => e.labelKo).join(", ")}`
                        : "집행률 ×0.1. 도시민 적대 칙령이 모두 철회되었다."}
                  </p>
                  {r.kind === "peasant" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-[11px]"
                      disabled={!canSuppress(state, r.id)}
                      onClick={() => onSuppress(r.id)}
                    >
                      진압 (여력 {SUPPRESS.cost} · 권위 {SUPPRESS.authority} · 같은 문화권 농민 저항 +{SUPPRESS.backlash})
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-1.5 text-xs font-medium">액션</h3>
        <div className="space-y-1.5">
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              disabled={!canAct(state, a.id)}
              onClick={() => (a.target === "none" ? onAct(a.id) : setActionTarget(a.id))}
              className="w-full rounded-md border bg-card p-2.5 text-left transition-colors hover:bg-accent disabled:opacity-50"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium">{a.labelKo}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  여력 {a.cost}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                {a.descKo}
              </p>
            </button>
          ))}
        </div>
        {state.effects.length > 0 && (
          <div className="mt-2 space-y-1">
            {state.effects.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px]"
              >
                <span>
                  {e.targetKo} · {e.labelKo} — 집행률 ×{e.multiplier}
                  {e.upkeep > 0 && ` · 유지 월 ${e.upkeep}`}
                </span>
                {e.kind === "commissioner" && (
                  <button
                    onClick={() => onDismiss(e.id)}
                    className="shrink-0 text-muted-foreground underline"
                  >
                    철수
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1.5 text-xs font-medium">
          확산 중 <span className="text-muted-foreground">{running.length}건</span>
        </h3>
        {running.length === 0 && (
          <p className="text-[11px] text-muted-foreground">진행 중인 칙령이 없다.</p>
        )}
        <div className="space-y-1.5">
          {running.map((a) => (
            <EdictRow
              key={a.edictId}
              world={world}
              state={state}
              edictId={a.edictId}
              onReproclaim={onReproclaim}
              onWithdrawFull={() => onWithdraw(a.edictId)}
              onWithdrawPartial={() => setWithdrawTarget(a.edictId)}
            />
          ))}
        </div>
      </section>

      {finished.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-medium">
            확산 종료 <span className="text-muted-foreground">{finished.length}건</span>
          </h3>
          <div className="space-y-1.5">
            {finished.map((a) => (
              <EdictRow
                key={a.edictId}
                world={world}
                state={state}
                edictId={a.edictId}
                onReproclaim={onReproclaim}
                onWithdrawFull={() => onWithdraw(a.edictId)}
                onWithdrawPartial={() => setWithdrawTarget(a.edictId)}
              />
            ))}
          </div>
        </section>
      )}

      {withdrawTarget && (
        <PickerDialog
          titleKo={`${EDICT_BY_ID[withdrawTarget].labelKo} — 부분 철회`}
          noteKo="1790년 1월 요제프가 한 것이 정확히 이것이다. 관용령과 농노제 폐지는 남기고 나머지를 거뒀다. 권위 손실은 절반이고, 그 왕관령의 도달률 기여만 사라진다."
          options={CROWNLANDS.map((c) => ({
            id: c.id,
            labelKo: c.labelKo,
            subKo: `${c.hexIds.length}헥스`,
          }))}
          onPick={(id) => {
            onWithdraw(withdrawTarget, id);
            setWithdrawTarget(null);
          }}
          onClose={() => setWithdrawTarget(null)}
        />
      )}

      {actionTarget && (
        <PickerDialog
          titleKo={ACTIONS.find((a) => a.id === actionTarget)!.labelKo}
          noteKo={ACTIONS.find((a) => a.id === actionTarget)!.descKo}
          options={
            actionTarget === "commissioner"
              ? COMMANDS.map((x) => ({
                  id: x.id,
                  labelKo: x.labelKo,
                  subKo: `${x.hexIds.length}헥스`,
                }))
              : actionTarget === "official"
                ? world.hexes.map((h) => ({
                    id: h.id,
                    labelKo: h.labelKo,
                    subKo: h.crownlandKo,
                  }))
                : CROWNLANDS.map((x) => ({
                    id: x.id,
                    labelKo: x.labelKo,
                    subKo: `${x.hexIds.length}헥스`,
                  }))
          }
          onPick={(id) => {
            onAct(actionTarget, id);
            setActionTarget(null);
          }}
          onClose={() => setActionTarget(null)}
        />
      )}
    </div>
  );
}

function EdictRow({
  world,
  state,
  edictId,
  onReproclaim,
  onWithdrawFull,
  onWithdrawPartial,
}: {
  world: World;
  state: GameState;
  edictId: string;
  onReproclaim: (id: string) => void;
  onWithdrawFull: () => void;
  onWithdrawPartial: () => void;
}) {
  const active = state.active.find((a) => a.edictId === edictId)!;
  const edict = EDICT_BY_ID[edictId];
  const counts = { "in-transit": 0, pending: 0, enacted: 0, failed: 0 };
  for (const hex of world.hexes) counts[active.byHex[hex.id].status]++;
  const ratio = enactedWeightedRatio(world, active);
  const canRe = canReproclaim(world, state, edictId);
  const withdrawn = active.withdrawnFrom.length > 0;

  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium">{edict.labelKo}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          인구 {(ratio * 100).toFixed(0)}% 관철
        </span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
        <Seg n={counts.enacted} total={world.hexes.length} className="bg-foreground/70" />
        <Seg n={counts.pending} total={world.hexes.length} className="bg-foreground/40" />
        <Seg n={counts["in-transit"]} total={world.hexes.length} className="bg-foreground/15" />
      </div>
      <div className="mt-1 flex flex-wrap gap-x-2.5 text-[11px] tabular-nums text-muted-foreground">
        <span>완료 {counts.enacted}</span>
        <span>판정 {counts.pending}</span>
        <span>이동 {counts["in-transit"]}</span>
        <span className={counts.failed > 0 ? "text-destructive" : ""}>실패 {counts.failed}</span>
      </div>
      {withdrawn && (
        <div className="mt-1 text-[11px] text-destructive">
          철회됨: {active.withdrawnFrom.join(", ")}
        </div>
      )}
      <div className="mt-2 flex gap-1.5">
        {canRe && (
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => onReproclaim(edictId)}>
            재반포 (여력 {reproclaimCost(edictId)})
          </Button>
        )}
        {!withdrawn && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onWithdrawPartial}>
              부분 철회
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive" onClick={onWithdrawFull}>
              전면 철회 ({AUTHORITY_ON_WITHDRAW[edict.tier]})
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Seg({ n, total, className }: { n: number; total: number; className: string }) {
  if (n === 0) return null;
  return <div className={className} style={{ width: `${(n / total) * 100}%` }} />;
}

function PickerDialog({
  titleKo,
  noteKo,
  options,
  onPick,
  onClose,
}: {
  titleKo: string;
  noteKo: string;
  options: Array<{ id: string; labelKo: string; subKo: string }>;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{titleKo}</DialogTitle>
        </DialogHeader>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{noteKo}</p>
        <div className="space-y-1">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => onPick(o.id)}
              className="flex w-full items-baseline justify-between rounded-md border px-2.5 py-2 text-left hover:bg-accent"
            >
              <span className="text-[13px]">{o.labelKo}</span>
              <span className="text-[11px] text-muted-foreground">{o.subKo}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
