/**
 * §16.1 1단계 검증 하니스.
 * 실행: node --experimental-strip-types src/lib/josephii/verify.ts
 */
import { EDICTS, EDICT_AXES, EDICT_BY_ID, HUNGARY_SCENARIO } from "./edicts.ts";
import { HEXES } from "./map-3hex.ts";
import {
  EDICT_COST,
  authorityCoefficient,
  enforcementRate,
  reachScore,
  threeRoundSuccess,
  capacityInflow,
  EDICT_UPKEEP,
  diffusionMonths,
} from "./rules.ts";
import {
  TOTAL_ROUNDS,
  aggregateNational,
  createInitialState,
  makeRng,
  politicalResistance,
  populationResistance,
  runRound,
  type Policy,
} from "./engine.ts";
import type { GameState } from "./types.ts";

const f = (n: number, d = 1) => n.toFixed(d);
const line = (s = "") => console.log(s);
const rule = (t: string) => line(`\n──────── ${t}`);

// ═════════ 검산 0 — §10.9 총합 검산 재계산
rule("검산 0. §10.9 총합 검산 (사양서: P +82 / T +129 / F +99)");
{
  const total = { p: 0, t: 0, f: 0 };
  const byArea = new Map<number, { p: number; t: number; f: number }>();
  for (const row of EDICT_AXES) {
    total.p += row.gain.p;
    total.t += row.gain.t;
    total.f += row.gain.f;
    const a = byArea.get(row.area) ?? { p: 0, t: 0, f: 0 };
    a.p += row.gain.p;
    a.t += row.gain.t;
    a.f += row.gain.f;
    byArea.set(row.area, a);
  }
  line(`  칙령 수: ${EDICT_AXES.length}개`);
  for (const [area, a] of [...byArea].sort((x, y) => x[0] - y[0])) {
    line(`   영역${area}  P ${String(a.p).padStart(4)}  T ${String(a.t).padStart(4)}  F ${String(a.f).padStart(4)}`);
  }
  line(`  실제 합계   P ${total.p}  /  T ${total.t}  /  F ${total.f}`);
  line(`  사양서 값   P 82  /  T 129  /  F 99`);
  line(`  차이        P ${total.p - 82}  /  T ${total.t - 129}  /  F ${total.f - 99}`);
  line(`  T/P 비율: ${f(total.t / total.p, 2)}배 (사양서는 "30~50% 큼"으로 진단)`);

  const start = { p: 43, t: 49, f: 43 }; // §4.4 전체 시작값
  for (const eff of [0.4, 0.5, 0.6]) {
    const p = Math.min(100, start.p + total.p * eff);
    const t = Math.min(100, start.t + total.t * eff);
    const ff = Math.min(100, start.f + total.f * eff);
    line(
      `  실효 ${eff * 100}%: P ${f(p)} / T ${f(t)} / F ${f(ff)} → R ${f(reachScore({ p, t, f: ff }))}` +
        `   (§4.5 균형 성공 = 62.5)`,
    );
  }
}

// ═════════ 재현 검산 — §8.6 / §7.3
rule("검산 1. 사양서 기준 계산 재현 (저항 초기값 = 수렴값 기준)");
{
  const s = createInitialState({ resistanceStart: "convergence" });
  const varmegye = HEXES.find((h) => h.id === "varmegye")!;
  const pol = politicalResistance(s, varmegye);
  const pop = populationResistance(s, varmegye);
  line(`  §8.6 부군 저항 — 인구 가중 ${f(pop)} (사양서 27.9) / 정치 가중 ${f(pol)} (사양서 37.2)`);
  const R = reachScore(s.hexes.varmegye.reach);
  const p = enforcementRate(R, pol, 60);
  line(`  §7.3 부군 — R ${f(R)} (사양서 20.6), 권위계수 ${f(authorityCoefficient(60), 2)} (1.05)`);
  line(`             p ${f(p, 3)} (사양서 0.136) → 3라운드 ${f(threeRoundSuccess(p) * 100)}% (35.5%)`);
  const upper = reachScore({ p: 75, t: 80, f: 70 });
  const pUpper = enforcementRate(upper, 30, 60);
  line(
    `  §7.3 하오스트리아 피어텔 — R ${f(upper)} (74.9), p ${f(pUpper, 3)} (0.550) → ${f(threeRoundSuccess(pUpper) * 100)}% (90.9%)`,
  );
  line(`  §3.4 확산 개월: ${HEXES.map((h) => `${h.labelKo} ${diffusionMonths(h.crownlandDelay, h.kind, h.distanceBand)}`).join(" / ")}`);
}

// ═════════ 공통 실행기
type RunOpts = {
  resistanceStart?: "zero" | "convergence";
  resistanceScope?: "hex" | "opposed";
  k?: number;
  gainScale?: number;
};

function run(
  policy: Policy,
  seed: number,
  opts: RunOpts = {},
  onRound?: (s: GameState) => void,
): GameState {
  const state = createInitialState(opts);
  const rng = makeRng(seed);
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    runRound(state, policy, rng);
    onRound?.(state);
  }
  return state;
}

/** 미착수 칙령 중 가장 싼 것부터 반포 */
function greedyPolicy(pool: string[]): Policy {
  return (s) => {
    const started = new Set(s.active.map((a) => a.edictId));
    const candidates = pool
      .filter((id) => !started.has(id))
      .filter((id) => s.capacity >= EDICT_COST[EDICT_BY_ID[id].tier])
      .sort((a, b) => EDICT_COST[EDICT_BY_ID[a].tier] - EDICT_COST[EDICT_BY_ID[b].tier]);
    return candidates[0] ?? null;
  };
}

/** 지정 순서대로, 여력이 되는 대로 반포 */
function sequentialPolicy(order: string[]): Policy {
  return (s) => {
    const started = new Set(s.active.map((a) => a.edictId));
    const next = order.find((id) => !started.has(id));
    if (!next) return null;
    return s.capacity >= EDICT_COST[EDICT_BY_ID[next].tier] ? next : null;
  };
}

// ═════════ 확인 1 — T축 과잉
rule("확인 1. 도달률이 20라운드 만에 상한에 닿는가 (T축 과잉)");
{
  const pool = EDICTS.map((e) => e.id);
  const caps: Record<string, { t: number | null; p: number | null; f: number | null }> = {};
  for (const h of HEXES) caps[h.id] = { t: null, p: null, f: null };
  let r = 0;
  const final = run(greedyPolicy(pool), 1234, {}, (s) => {
    r = s.round - 1;
    for (const h of HEXES) {
      const x = s.hexes[h.id].reach;
      if (x.t >= 100 && caps[h.id].t === null) caps[h.id].t = r;
      if (x.p >= 100 && caps[h.id].p === null) caps[h.id].p = r;
      if (x.f >= 100 && caps[h.id].f === null) caps[h.id].f = r;
    }
  });
  for (const h of HEXES) {
    const c = caps[h.id];
    const x = final.hexes[h.id].reach;
    line(
      `  ${h.labelKo.padEnd(12)} 최종 P ${f(x.p).padStart(5)} T ${f(x.t).padStart(5)} F ${f(x.f).padStart(5)}` +
        `   상한 도달 R: T=${c.t ?? "-"} P=${c.p ?? "-"} F=${c.f ?? "-"}`,
    );
  }
  const n = final.national;
  line(`  국가 최종 P ${f(n.p)} / T ${f(n.t)} / F ${f(n.f)} → R ${f(reachScore(n))}  (${r}라운드)`);
  line(`  ※ 3헥스 9칙령 기준. 28칙령 전체의 T 편중은 검산 0을 볼 것.`);
}

// ═════════ 확인 2 — §9.3 저항 정체
rule("확인 2. 저항이 §9.3 추정대로 72~75에서 정체하는가 (헝가리 8칙령)");
for (const [mode, scope] of [
  ["zero", "hex"],
  ["convergence", "hex"],
  ["zero", "opposed"],
  ["convergence", "opposed"],
] as const) {
  const track: number[] = [];
  const final = run(
    sequentialPolicy(HUNGARY_SCENARIO),
    777,
    { resistanceStart: mode, resistanceScope: scope },
    (s) => {
      track.push(s.hexes.varmegye.resistance["hu-noble"]);
    },
  );
  const max = Math.max(...track);
  let enacted = 0;
  let attempted = 0;
  for (const a of final.active) {
    for (const h of HEXES) {
      if (h.id !== "varmegye") continue;
      attempted++;
      if (a.byHex[h.id].status === "enacted") enacted++;
    }
  }
  const label = `${mode === "zero" ? "초기값0" : "초기값=수렴값"}/${scope === "hex" ? "헥스집계" : "반대세력"}`;
  line(
    `  ${label.padEnd(22)} 귀족저항 최대 ${f(max).padStart(5)} 최종 ${f(track[track.length - 1]).padStart(5)}` +
      ` | 부군 착지 ${enacted}/${attempted} | 국가 R ${f(reachScore(final.national))}`,
  );
}
line(`  사양서 §9.3 추정: 72~75 정체, 착지율 15%`);
{
  // 순차 반포에서 각 칙령이 부군에 도달한 시점의 저항과 성공률
  line(`  — 부군 도착 시점별 (초기값 0, 헥스집계):`);
  const state = createInitialState();
  const rng = makeRng(777);
  const policy = sequentialPolicy(HUNGARY_SCENARIO);
  const seen = new Set<string>();
  const rows: string[] = [];
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    for (const a of state.active) {
      const prog = a.byHex.varmegye;
      // 국면 1 직전 관찰 — 이번 라운드에 도착하는 칙령
      if (prog.status === "in-transit" && state.round >= prog.arrivalRound && !seen.has(a.edictId)) {
        seen.add(a.edictId);
        const varmegye = HEXES.find((h) => h.id === "varmegye")!;
        const res = state.hexes.varmegye.resistance["hu-noble"];
        const pol = politicalResistance(state, varmegye);
        const pp = enforcementRate(reachScore(state.hexes.varmegye.reach), pol, state.authority);
        rows.push(
          `      R${String(state.round).padStart(3)} ${EDICT_BY_ID[a.edictId].labelKo.padEnd(16)}` +
            ` 귀족저항 ${f(res).padStart(5)} 정치가중 ${f(pol).padStart(5)}` +
            ` p ${f(pp, 3)} → 3라운드 ${f(threeRoundSuccess(pp) * 100).padStart(5)}%`,
        );
      }
    }
    runRound(state, policy, rng);
  }
  for (const row of rows) line(row);
}

// ═════════ 확인 3 — §11.4 왕실 판무관 vs 칙령 단계1
rule("확인 3. 왕실 판무관(20)이 칙령 단계1(15)보다 항상 우세한가");
{
  const s = createInitialState();
  const base = aggregateNational(s);
  const baseR = reachScore(base);

  // (a) 단계1 칙령 — 관용령. 각 헥스 3라운드 성공률만큼 기대 가산.
  const toleranz = EDICT_BY_ID["toleranz"];
  const expected = structuredClone(s);
  for (const h of HEXES) {
    const p = enforcementRate(reachScore(s.hexes[h.id].reach), politicalResistance(s, h), 60);
    const q = threeRoundSuccess(p);
    const x = expected.hexes[h.id].reach;
    x.p = Math.min(100, x.p + toleranz.gain.p * q);
    x.t = Math.min(100, x.t + toleranz.gain.t * q);
    x.f = Math.min(100, x.f + toleranz.gain.f * q);
  }
  const maxDiffusion = Math.max(
    ...HEXES.map((h) => diffusionMonths(h.crownlandDelay, h.kind, h.distanceBand)),
  );
  const edictCapacity = EDICT_COST[1] + EDICT_UPKEEP[1] * (maxDiffusion + 3);
  const edictGain = reachScore(aggregateNational(expected)) - baseR;

  // (b) 왕실 판무관 — 진행 중 단계4(부군 자치 정지)의 부군 판정에 ×1.4
  const suspend = EDICT_BY_ID["suspend-varmegye"];
  const varmegye = HEXES.find((h) => h.id === "varmegye")!;
  const pv = enforcementRate(reachScore(s.hexes.varmegye.reach), politicalResistance(s, varmegye), 60);
  const dq = threeRoundSuccess(pv * 1.4) - threeRoundSuccess(pv);
  const withCommissioner = structuredClone(s);
  const xv = withCommissioner.hexes.varmegye.reach;
  xv.p = Math.min(100, xv.p + suspend.gain.p * dq);
  xv.t = Math.min(100, xv.t + suspend.gain.t * dq);
  xv.f = Math.min(100, xv.f + suspend.gain.f * dq);
  const commissionerGain = reachScore(aggregateNational(withCommissioner)) - baseR;

  line(`  단계1 칙령 (관용령)    여력 ${edictCapacity} (반포15 + 유지1×${maxDiffusion + 3}) → 기대 국가 ΔR ${f(edictGain, 3)}  | 여력당 ${f((edictGain / edictCapacity) * 100, 3)}`);
  line(`  왕실 판무관 (부군 ×1.4) 여력 20                       → 기대 국가 ΔR ${f(commissionerGain, 3)}  | 여력당 ${f((commissionerGain / 20) * 100, 3)}`);
  line(`  부군 3라운드 성공률 ${f(threeRoundSuccess(pv) * 100)}% → ${f(threeRoundSuccess(pv * 1.4) * 100)}% (Δ${f(dq * 100)}p)`);
  line(`  ※ 판무관은 진행 중 칙령이 있어야만 가치가 생긴다 — 단독 우세는 성립 불가.`);
}

// ═════════ 확인 4 — §6.3 여력
rule("확인 4. 여력이 §6.3대로 대형 3개에서 축적이 멈추는가");
{
  for (const authority of [50, 60]) {
    const inflow = capacityInflow(authority);
    line(`  권위 ${authority}: 유입 ${f(inflow)}/월`);
    for (const combo of [
      { label: "단계1 × 3", upkeep: 3 },
      { label: "단계2 × 3 + 단계1 × 2", upkeep: 8 },
      { label: "단계4 × 3", upkeep: 12 },
      { label: "단계4 × 2 + 단계3 × 2", upkeep: 14 },
    ]) {
      line(`     ${combo.label.padEnd(22)} 유지 −${combo.upkeep}  순 축적 ${f(inflow - combo.upkeep, 1)}`);
    }
  }
  line(`  사양서 §6.1 표는 권위 20에서 유입 7.2로 적었으나 공식값은 ${f(capacityInflow(20))} (12 × 0.7)`);

  const order = ["suspend-varmegye", "tax-robot", "manorial-courts"];
  let minCap = Infinity;
  const final = run(sequentialPolicy(order), 42, {}, (s) => {
    if (s.active.length === 3) minCap = Math.min(minCap, s.capacity);
  });
  const starts = final.active.map((a) => a.promulgatedRound);
  line(`  실측: 단계4 3개 반포 라운드 ${starts.join(", ")} — 3개 동시 진행 중 최저 여력 ${f(minCap)}`);
}

// ═════════ 확인 5 — 기준선 대비 R 상승폭, k 손잡이의 유효 범위
rule("확인 5. 111라운드 R 상승폭이 §4.5 기준선(+6)과 맞는가");
{
  const start = reachScore(createInitialState().national);
  line(`  3헥스 지도 시작 R = ${f(start, 1)}  (사양서 전체 지도 시작값 44.8)`);
  line(`  §4.5 참고 목표선: 역사적 실제 +6.0 / 균형 성공 +17.7 / 붕괴 −6.6`);
  const pool = EDICTS.map((e) => e.id);
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const mean = (opts: RunOpts) =>
    seeds.reduce((acc, sd) => acc + reachScore(run(greedyPolicy(pool), sd, opts).national), 0) /
    seeds.length;
  line(`  전력 반포 전략(9칙령), 8시드 평균:`);
  line(`  ※ 3헥스 중 2개(크라이스 R66, 주 R43)가 쉬운 편이라 착지율이 190헥스보다 높다.`);
  line(`     ΔR 절대값은 과대. k의 무력함은 지도 크기와 무관한 구조적 성질이다.`);
  for (const scope of ["hex", "opposed"] as const) {
    for (const k of [1, 2, 4, 8]) {
      const r = mean({ resistanceScope: scope, k });
      line(
        `     ${scope === "hex" ? "헥스집계" : "반대세력"} k=${String(k).padEnd(2)} → 최종 R ${f(r, 1).padStart(5)}  (ΔR ${(r - start >= 0 ? "+" : "") + f(r - start, 1)})`,
      );
    }
  }
}

// ═════════ 확인 6 — §10 기여값을 얼마나 낮춰야 기준선에 닿는가
rule("확인 6. §10 P/T/F 기여값 보정 (결정 3의 손잡이)");
{
  const start = reachScore(createInitialState().national);
  const pool = EDICTS.map((e) => e.id);
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const mean = (opts: RunOpts) =>
    seeds.reduce((acc, sd) => acc + reachScore(run(greedyPolicy(pool), sd, opts).national), 0) /
    seeds.length;
  line(`  전력 반포(=§6.4 "다작" 전략) 8시드 평균 ΔR. 목표: 역사적 실제 +6.0`);
  line(`  기여 배율 | 헥스집계·초기0 | 반대세력·수렴값`);
  for (const g of [1.0, 0.7, 0.5, 0.35, 0.25, 0.15]) {
    const a = mean({ gainScale: g }) - start;
    const b =
      mean({ gainScale: g, resistanceScope: "opposed", resistanceStart: "convergence" }) - start;
    line(`     ×${f(g, 2)}   |     ${(a >= 0 ? "+" : "") + f(a).padStart(5)}     |     ${(b >= 0 ? "+" : "") + f(b).padStart(5)}`);
  }
}

// ═════════ 시드 안정성 (§7.4)
rule("검산 2. 시드별 편차 (§7.4 \"총량은 안정적, 지도 모양만 달라진다\")");
{
  const pool = EDICTS.map((e) => e.id);
  const rs: number[] = [];
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    rs.push(reachScore(run(greedyPolicy(pool), seed).national));
  }
  const mean = rs.reduce((a, b) => a + b, 0) / rs.length;
  const sd = Math.sqrt(rs.reduce((a, b) => a + (b - mean) ** 2, 0) / rs.length);
  line(`  8시드 최종 국가 R: 평균 ${f(mean, 2)}, 표준편차 ${f(sd, 2)}, 범위 ${f(Math.min(...rs), 1)}~${f(Math.max(...rs), 1)}`);
}
line();
