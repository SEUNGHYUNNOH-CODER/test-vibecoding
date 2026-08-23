"use client";

import type { GameState } from "@/lib/josephii/types";
import { EDICT_BY_ID } from "@/lib/josephii/edicts";
import { EDICT_UPKEEP, capacityInflow, reachScore } from "@/lib/josephii/rules";
import { TOTAL_ROUNDS, calendarLabel } from "@/lib/josephii/engine";
import { reachColor } from "./shared";

export function StatusBar({ state }: { state: GameState }) {
  const upkeep = state.active
    .filter((a) => a.inProgress)
    .reduce((n, a) => n + EDICT_UPKEEP[EDICT_BY_ID[a.edictId].tier], 0);
  const inflow = capacityInflow(state.authority);
  const net = inflow - upkeep;
  const r = reachScore(state.national);
  const { drift, events } = state.authorityDelta;

  return (
    <div className="border-b bg-card">
      <div className="flex items-baseline justify-between px-4 pt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tabular-nums">{calendarLabel(state.round)}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            R{state.round} / {TOTAL_ROUNDS}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
            남은 {TOTAL_ROUNDS - state.round}개월
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/60 mt-3">
        <Stat
          labelKo="권위"
          value={state.authority.toFixed(1)}
          // §5.1 자동 변동과 사건 변동을 분리하지 않으면 하락이 벌로 오독된다
          sub={`자동 ${fmtSigned(drift)}${events !== 0 ? ` · 사건 ${fmtSigned(events)}` : ""}`}
        />
        <Stat
          labelKo="여력"
          value={state.capacity.toFixed(0)}
          sub={`유입 +${inflow.toFixed(1)}${upkeep > 0 ? ` · 유지 −${upkeep}` : ""} → ${fmtSigned(net)}`}
          warn={net < 0}
        />
        <Stat labelKo="도달률 R" value={r.toFixed(1)} sub="세 축의 기하평균" />
      </div>

      <div className="flex gap-px bg-border/60">
        {(["p", "t", "f"] as const).map((k) => {
          const labelKo = k === "p" ? "인구" : k === "t" ? "영역" : "세수";
          const v = state.national[k];
          return (
            <div key={k} className="flex-1 bg-card px-3 py-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-muted-foreground">{labelKo} 도달</span>
                <span className="text-xs font-medium tabular-nums">{v.toFixed(1)}</span>
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-muted">
                <div
                  className="h-1 rounded-full transition-all"
                  style={{ width: `${v}%`, background: reachColor(v) }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
}

function Stat({
  labelKo,
  value,
  sub,
  warn,
}: {
  labelKo: string;
  value: string;
  sub: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-card px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{labelKo}</div>
      <div className="text-xl font-semibold tabular-nums leading-tight">{value}</div>
      <div className={`text-[11px] tabular-nums ${warn ? "text-destructive" : "text-muted-foreground"}`}>
        {sub}
      </div>
    </div>
  );
}
