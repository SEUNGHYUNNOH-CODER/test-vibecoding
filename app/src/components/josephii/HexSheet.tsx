"use client";

import { useState } from "react";
import type { GameState } from "@/lib/josephii/types";
import type { World } from "@/lib/josephii/world";
import { EDICT_BY_ID } from "@/lib/josephii/edicts";
import { POLITICAL_WEIGHT, reachScore, threeRoundSuccess } from "@/lib/josephii/rules";
import {
  conflictFor,
  diffusionFor,
  effectMultiplier,
  enforcementFor,
  politicalResistance,
  resistanceForEdict,
} from "@/lib/josephii/engine";
import { HEX_KIND_LABEL, HEX_KIND_NOTE } from "@/lib/josephii/map";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ESTATE_LABEL, ESTATE_ORDER, reachColor } from "./shared";

const BAND_LABEL = ["근거리", "중거리", "원거리"];

/**
 * §13.2 — 레이어는 밀도 문제를 풀고 비교 문제를 만든다. 헥스 상세 시트가
 * 모든 레이어의 정보를 카드 하나에 모아 그 비교 비용을 없앤다.
 */
export function HexSheet({
  world,
  state,
  hexId,
  onClose,
}: {
  world: World;
  state: GameState;
  hexId: string | null;
  onClose: () => void;
}) {
  const [openEstate, setOpenEstate] = useState<string | null>(null);
  if (!hexId) return null;
  const hex = world.hexById[hexId];
  const hs = state.hexes[hexId];
  const r = reachScore(hs.reach);
  const politicalAgg = politicalResistance(world, state, hex);

  const byEstate = ESTATE_ORDER.map((estate) => {
    const members = Object.entries(hex.composition)
      .filter(([id]) => world.factionById[id].estate === estate)
      .map(([id, share]) => ({
        id,
        share,
        labelKo: world.factionById[id].labelKo,
        resistance: hs.resistance[id],
        convergence: world.factionById[id].convergence,
      }))
      .sort((a, b) => b.resistance - a.resistance);
    const share = members.reduce((n, m) => n + m.share, 0);
    const weighted = share === 0 ? 0 : members.reduce((n, m) => n + m.share * m.resistance, 0) / share;
    return { estate, members, share, weighted, weight: POLITICAL_WEIGHT[estate] };
  }).filter((g) => g.members.length > 0);

  const inbound = state.active
    .map((a) => ({ active: a, prog: a.byHex[hexId], edict: EDICT_BY_ID[a.edictId] }))
    .filter((x) => x.prog.status !== "failed" || x.active.withdrawnFrom.length === 0)
    .filter((x) => x.prog.status !== "failed");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{hex.labelKo}</DialogTitle>
        </DialogHeader>

        <section className="rounded-md border bg-muted/40 p-3">
          <div className="text-xs font-medium">{HEX_KIND_LABEL[hex.kind]}</div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {HEX_KIND_NOTE[hex.kind]}
          </p>
        </section>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          <Row k="왕관령" v={hex.crownlandKo} />
          <Row k="중간계층" v={hex.regionKo} />
          <Row k="거리대" v={BAND_LABEL[hex.distanceBand]} />
          <Row k="빈에서 확산" v={`${diffusionFor(state, hex)}개월`} />
          <Row k="인구" v={`${(hex.population / 1000).toLocaleString()}천 명`} />
          <Row k="잠재 세수" v={String(hex.potentialRevenue)} />
          {hex.urbanity > 0 && (
            <Row
              k="도시성"
              v={`${hex.urbanity}등급${state.urbanityHalved ? " (개편으로 반감)" : ""}`}
            />
          )}
        </dl>

        <section>
          <h3 className="mb-1.5 text-xs font-medium">
            도달률 <span className="text-muted-foreground">R {r.toFixed(1)}</span>
          </h3>
          <div className="space-y-1.5">
            {(["p", "t", "f"] as const).map((k) => {
              const labelKo = k === "p" ? "인구 도달" : k === "t" ? "영역 도달" : "세수 도달";
              const v = hs.reach[k];
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] text-muted-foreground">{labelKo}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${v}%`, background: reachColor(v) }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-[11px] tabular-nums">
                    {v.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-1.5 text-xs font-medium">
            세력 저항{" "}
            <span className="text-muted-foreground">
              정치 가중 집계 {politicalAgg.toFixed(1)}
            </span>
          </h3>
          {/* §13.6 계층별 4줄로 접어서 표시하고, 펼치면 문화권별로 전개 */}
          <div className="divide-y rounded-md border">
            {byEstate.map((g) => (
              <div key={g.estate}>
                <button
                  onClick={() => setOpenEstate(openEstate === g.estate ? null : g.estate)}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-accent"
                >
                  <span className="w-12 shrink-0 text-xs font-medium">
                    {ESTATE_LABEL[g.estate]}
                  </span>
                  <span className="w-16 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    인구 {g.share}% ×{g.weight}
                  </span>
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-foreground/60"
                      style={{ width: `${g.weighted}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-[11px] tabular-nums">
                    {g.weighted.toFixed(0)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {openEstate === g.estate ? "▴" : "▾"}
                  </span>
                </button>
                {openEstate === g.estate && (
                  <div className="space-y-1 bg-muted/30 px-2.5 py-2">
                    {g.members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-28 shrink-0 truncate text-muted-foreground">
                          {m.labelKo}
                        </span>
                        <span className="w-8 shrink-0 tabular-nums text-muted-foreground">
                          {m.share}%
                        </span>
                        <div className="h-1 flex-1 rounded-full bg-muted">
                          <div
                            className="h-1 rounded-full bg-foreground/50"
                            style={{ width: `${m.resistance}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right tabular-nums">
                          {m.resistance.toFixed(0)}
                          <span className="text-muted-foreground">/{m.convergence}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
            인구 비중은 인구 도달률 계산에, 정치 배율(귀족 ×6 · 성직자 ×4 · 도시민 ×2 · 농민 ×1)은
            집행 저항 계산에 쓰인다. 오른쪽 숫자는 현재값/수렴값이다.
          </p>
        </section>

        {inbound.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-xs font-medium">이 헥스로 오는 칙령</h3>
            <div className="space-y-1.5">
              {inbound.map(({ prog, edict }) => {
                const p = enforcementFor(world, state, hex, edict);
                const applied = resistanceForEdict(world, state, hex, edict);
                const mult = effectMultiplier(state, hex);
                return (
                  <div key={edict.id} className="rounded-md border p-2 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{edict.labelKo}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {prog.status === "in-transit" && `도착 R${prog.arrivalRound}`}
                        {prog.status === "pending" && `판정 ${prog.attemptsLeft}회 남음`}
                        {prog.status === "enacted" && "반포완료"}
                      </span>
                    </div>
                    {prog.status !== "enacted" && (
                      // §13.5 "이 값이 왜 이런가"를 한 줄로 분해해 보여준다
                      <div className="mt-1 tabular-nums text-muted-foreground">
                        도달률 {r.toFixed(0)} × 저항 {applied.toFixed(0)} 반영{" "}
                        {mult !== 1 && `× 판무관 ${mult.toFixed(1)} `}→ 매달 {(p * 100).toFixed(1)}%
                        {prog.status === "pending" &&
                          ` · ${prog.attemptsLeft}회 중 한 번이라도 성공할 확률 ${(
                            (1 - Math.pow(1 - p, prog.attemptsLeft)) * 100
                          ).toFixed(0)}%`}
                        {prog.status === "in-transit" &&
                          ` · 도착 시 3회 판정 ${(threeRoundSuccess(p) * 100).toFixed(0)}%`}
                      </div>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-muted-foreground">
                      {Object.entries(hex.composition)
                        .map(([id]) => ({ id, c: conflictFor(world, edict, id) }))
                        .filter((x) => x.c !== 0)
                        .sort((a, b) => b.c - a.c)
                        .slice(0, 5)
                        .map((x) => (
                          <span key={x.id} className={x.c > 0 ? "text-destructive" : ""}>
                            {world.factionById[x.id].labelKo} {x.c > 0 ? `+${x.c}` : x.c}
                          </span>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-dashed pb-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}
