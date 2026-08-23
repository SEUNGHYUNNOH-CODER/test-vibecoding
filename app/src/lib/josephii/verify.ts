/**
 * §16.1 1단계 검증 하니스.
 * 실행: node --experimental-strip-types src/lib/josephii/verify.ts  (app/ 에서)
 */
import { EDICTS, EDICT_BY_ID, HISTORICAL_ORDER, HUNGARY_SCENARIO } from "./edicts.ts";
import { THREE_HEX } from "./map-3hex.ts";
import { MONARCHY } from "./map.ts";
import type { World } from "./world.ts";
import {
  EDICT_COST,
  EDICT_UPKEEP,
  GAIN_SCALE,
  authorityCoefficient,
  capacityInflow,
  diffusionMonths,
  enforcementRate,
  reachScore,
  threeRoundSuccess,
} from "./rules.ts";
import {
  TOTAL_ROUNDS,
  advanceRound,
  finalReport,
  aggregateNational,
  conflictFor,
  createGame,
  politicalResistance,
  promulgate,
  resistanceForEdict,
} from "./engine.ts";
import type { Axes, GameState } from "./types.ts";

const f = (n: number, d = 1) => n.toFixed(d);
const line = (s = "") => console.log(s);
const rule = (t: string) => line(`\n──────── ${t}`);

type Opts = Parameters<typeof createGame>[1];
type Policy = (s: GameState) => string | null;

function run(world: World, policy: Policy, seed: number, opts: Opts = {}, onRound?: (s: GameState) => void) {
  const state = createGame(world, { seed, ...opts });
  for (let i = 0; i < TOTAL_ROUNDS; i++) {
    const choice = policy(state);
    if (choice) promulgate(world, state, choice);
    advanceRound(world, state);
    onRound?.(state);
  }
  return state;
}

/** 미착수 칙령 중 가장 싼 것부터 */
function greedy(pool: string[]): Policy {
  return (s) => {
    const started = new Set(s.active.map((a) => a.edictId));
    return (
      pool
        .filter((id) => !started.has(id) && s.capacity >= EDICT_COST[EDICT_BY_ID[id].tier])
        .sort((a, b) => EDICT_COST[EDICT_BY_ID[a].tier] - EDICT_COST[EDICT_BY_ID[b].tier])[0] ?? null
    );
  };
}

/** 지정 순서대로 */
function sequential(order: string[]): Policy {
  return (s) => {
    const started = new Set(s.active.map((a) => a.edictId));
    const next = order.find((id) => !started.has(id));
    if (!next) return null;
    return s.capacity >= EDICT_COST[EDICT_BY_ID[next].tier] ? next : null;
  };
}

// ═════════ 검산 0 — §10.9 총합
rule("검산 0. §10.9 총합 검산 (사양서: P +82 / T +129 / F +99)");
{
  const total = { p: 0, t: 0, f: 0 };
  const byArea = new Map<number, Axes>();
  for (const e of EDICTS) {
    total.p += e.gain.p; total.t += e.gain.t; total.f += e.gain.f;
    const a = byArea.get(e.area) ?? { p: 0, t: 0, f: 0 };
    a.p += e.gain.p; a.t += e.gain.t; a.f += e.gain.f;
    byArea.set(e.area, a);
  }
  line(`  칙령 수: ${EDICTS.length}개`);
  for (const [area, a] of [...byArea].sort((x, y) => x[0] - y[0])) {
    line(`   영역${area}  P ${String(a.p).padStart(4)}  T ${String(a.t).padStart(4)}  F ${String(a.f).padStart(4)}`);
  }
  line(`  실제 합계   P ${total.p}  /  T ${total.t}  /  F ${total.f}`);
  line(`  사양서 값   P 82  /  T 129  /  F 99   → 차이 P ${total.p - 82} / T ${total.t - 129} / F ${total.f - 99}`);
  line(`  T/P 비율 ${f(total.t / total.p, 2)}배 (사양서 진단 "30~50% 큼")`);
  const scaled = { p: total.p * GAIN_SCALE.p, t: total.t * GAIN_SCALE.t, f: total.f * GAIN_SCALE.f };
  line(`  축별 배율 P×${GAIN_SCALE.p} T×${GAIN_SCALE.t} F×${GAIN_SCALE.f} → P ${f(scaled.p)} / T ${f(scaled.t)} / F ${f(scaled.f)}  (T/P ${f(scaled.t / scaled.p, 2)}배)`);
}

// ═════════ 검산 1 — 사양서 기준 계산 재현
rule("검산 1. 사양서 기준 계산 재현 (3헥스 지도, 저항 = 수렴값)");
{
  const s = createGame(THREE_HEX, { seed: 1, resistanceStart: "convergence" });
  const varmegye = THREE_HEX.hexById.varmegye;
  const pol = politicalResistance(THREE_HEX, s, varmegye);
  line(`  §8.6 부군 저항 — 정치 가중 ${f(pol)} (사양서 37.2)`);
  const R = reachScore(s.hexes.varmegye.reach);
  const p = enforcementRate(R, pol, 60);
  line(`  §7.3 부군 — R ${f(R)} (20.6), 권위계수 ${f(authorityCoefficient(60), 2)} (1.05), p ${f(p, 3)} (0.136) → ${f(threeRoundSuccess(p) * 100)}% (35.5%)`);
  const up = reachScore({ p: 75, t: 80, f: 70 });
  const pu = enforcementRate(up, 30, 60);
  line(`  §7.3 하오스트리아 — R ${f(up)} (74.9), p ${f(pu, 3)} (0.550) → ${f(threeRoundSuccess(pu) * 100)}% (90.9%)`);
}

// ═════════ 검산 2 — 25헥스 지도 확산 (§3.4)
rule("검산 2. 축약 25헥스 지도 — §3.4 확산 개월 대조");
{
  const want: Record<string, string> = {
    "no-1": "2 (하오스트리아 2)", "bo-1": "3 (보헤미아 3~4)", "hu-1": "4 (도시성3 부군 4~6)",
    "hu-5": "8 (부군 6~8)", "mg-1": "4 (군사국경 3~4)", "si-1": "8 (트란실바니아 부군 7~8)",
    "si-2": "10 (작센 의석 9~10)", "ga-1": "6 (갈리치아 5~6)", "nl-1": "10 (네덜란드 10~11)",
  };
  for (const [id, expect] of Object.entries(want)) {
    const h = MONARCHY.hexById[id];
    const m = diffusionMonths(h.crownlandDelay, h.kind, h.distanceBand, h.urbanity);
    line(`  ${h.labelKo.padEnd(18)} ${String(m).padStart(2)}개월   기대 ${expect}`);
  }
  const s = createGame(MONARCHY, { seed: 1 });
  const n = s.national;
  line(`  시작 국가 도달률 P ${f(n.p)} / T ${f(n.t)} / F ${f(n.f)} → R ${f(reachScore(n))}  (사양서 44.8)`);
}

// ═════════ 확인 1 — T축 과잉
rule("확인 1. 도달률이 상한에 닿는가 (T축 과잉)");
{
  const pool = EDICTS.map((e) => e.id);
  let capped = 0;
  const final = run(MONARCHY, greedy(pool), 1234);
  for (const h of MONARCHY.hexes) {
    const x = final.hexes[h.id].reach;
    if (x.t >= 100 || x.p >= 100 || x.f >= 100) capped++;
  }
  const n = final.national;
  line(`  25헥스 전력 반포 — 국가 P ${f(n.p)} / T ${f(n.t)} / F ${f(n.f)} → R ${f(reachScore(n))}`);
  line(`  축이 상한에 닿은 헥스: ${capped} / ${MONARCHY.hexes.length}`);
  line(`  반포 완료 칙령 ${final.active.length}개 / 28개`);
}

// ═════════ 확인 2 — §9.3 저항 정체
rule("확인 2. 저항이 §9.3대로 72~75에서 정체하는가 (헝가리 8칙령)");
for (const [start, scope] of [["convergence", "opposed"], ["zero", "hex"]] as const) {
  const track: number[] = [];
  const final = run(THREE_HEX, sequential(HUNGARY_SCENARIO), 777, { resistanceStart: start, resistanceScope: scope }, (s) => {
    track.push(s.hexes.varmegye.resistance["hu-noble"]);
  });
  let enacted = 0;
  for (const a of final.active) if (a.byHex.varmegye.status === "enacted") enacted++;
  const label = `${start === "convergence" ? "수렴값" : "초기값0"}/${scope === "opposed" ? "반대세력" : "헥스집계"}`;
  line(`  ${label.padEnd(18)} 귀족저항 최대 ${f(Math.max(...track)).padStart(5)} 최종 ${f(track[track.length - 1]).padStart(5)} | 부군 착지 ${enacted}/8`);
}
line(`  사양서 §9.3 추정: 72~75 정체, 착지율 15%`);

// ═════════ 확인 3 — §11.4 판무관 vs 칙령 단계1
rule("확인 3. 왕실 판무관(20)이 칙령 단계1(15)보다 항상 우세한가");
{
  const s = createGame(MONARCHY, { seed: 1 });
  const baseR = reachScore(aggregateNational(MONARCHY, s));
  const toleranz = EDICT_BY_ID["toleranz"];

  const withEdict = structuredClone(s);
  for (const h of MONARCHY.hexes) {
    const q = threeRoundSuccess(enforcementRate(reachScore(s.hexes[h.id].reach), resistanceForEdict(MONARCHY, s, h, toleranz), 60));
    const x = withEdict.hexes[h.id].reach;
    x.p = Math.min(100, x.p + toleranz.gain.p * GAIN_SCALE.p * q);
    x.t = Math.min(100, x.t + toleranz.gain.t * GAIN_SCALE.t * q);
    x.f = Math.min(100, x.f + toleranz.gain.f * GAIN_SCALE.f * q);
  }
  const maxDiff = Math.max(...MONARCHY.hexes.map((h) => diffusionMonths(h.crownlandDelay, h.kind, h.distanceBand, h.urbanity)));
  const edictCost = EDICT_COST[1] + EDICT_UPKEEP[1] * (maxDiff + 3);
  const edictGain = reachScore(aggregateNational(MONARCHY, withEdict)) - baseR;

  // 판무관: 헝가리 서부 3헥스에 진행 중인 부군 자치 정지의 판정을 ×1.4
  const suspend = EDICT_BY_ID["suspend-varmegye"];
  const region = MONARCHY.hexes.filter((h) => h.regionId === "hungary-west");
  const withComm = structuredClone(s);
  for (const h of region) {
    const p0 = enforcementRate(reachScore(s.hexes[h.id].reach), resistanceForEdict(MONARCHY, s, h, suspend), 60);
    const dq = threeRoundSuccess(p0 * 1.4) - threeRoundSuccess(p0);
    const x = withComm.hexes[h.id].reach;
    x.p = Math.min(100, x.p + suspend.gain.p * GAIN_SCALE.p * dq);
    x.t = Math.min(100, x.t + suspend.gain.t * GAIN_SCALE.t * dq);
    x.f = Math.min(100, x.f + suspend.gain.f * GAIN_SCALE.f * dq);
  }
  const commGain = reachScore(aggregateNational(MONARCHY, withComm)) - baseR;
  line(`  단계1 칙령 (관용령, 전 25헥스) 여력 ${edictCost} → 국가 ΔR ${f(edictGain, 3)}  | 여력당 ${f((edictGain / edictCost) * 100, 2)}`);
  line(`  왕실 판무관 (헝가리 서부 ${region.length}헥스) 여력 20 → 국가 ΔR ${f(commGain, 3)}  | 여력당 ${f((commGain / 20) * 100, 2)}`);
}

// ═════════ 확인 4 — §6.3 여력
rule("확인 4. 여력이 §6.3대로 대형 3개에서 축적이 멈추는가");
{
  for (const authority of [50, 60]) {
    const inflow = capacityInflow(authority);
    const rows = [["단계1 × 3", 3], ["단계2 × 3 + 단계1 × 2", 8], ["단계4 × 3", 12], ["단계4 × 2 + 단계3 × 2", 14]] as const;
    line(`  권위 ${authority} (유입 ${f(inflow)}/월): ` + rows.map(([l, u]) => `${l} → ${f(inflow - u, 1)}`).join("  |  "));
  }
  line(`  §6.1 표는 권위 20에서 유입 7.2로 적었으나 공식값은 ${f(capacityInflow(20))}`);
}

// ═════════ 확인 5b — §4.6 전략별 목표선
rule("확인 5. §4.6 전략별 목표선");
{
  const CHOSEN15 = [
    "toleranz", "serfdom-cz", "censorship", "kreis-reform", "tariff", "primary-school",
    "monastery", "marriage", "penal-code",
    "parish", "civil-code", "cadastre", "serfdom-hu",
    "suspend-varmegye", "tax-robot",
  ];
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const avg = (policy: Policy) =>
    seeds.reduce((acc, sd) => {
      const st = createGame(MONARCHY, { seed: sd });
      for (let i = 0; i < TOTAL_ROUNDS; i++) {
        const c = policy(st);
        if (c) promulgate(MONARCHY, st, c);
        advanceRound(MONARCHY, st);
      }
      return acc + finalReport(MONARCHY, st, st.startR).delta;
    }, 0) / seeds.length;

  line(`  무행동                  ΔR ${f(avg(() => null), 2).padStart(6)}   목표 −3 ~ 0`);
  line(`  요제프의 실제 순서 (28개)  ΔR ${f(avg(sequential(HISTORICAL_ORDER)), 2).padStart(6)}   목표 +6 이하`);
  line(`  잘 고른 15개             ΔR ${f(avg(greedy(CHOSEN15)), 2).padStart(6)}   목표 +12 ~ +18`);
  line(`  ※ 싼 것부터 내는 정책은 단계1 을 먼저 소진해 사실상 신중한 플레이가 된다.`);
  line(`     "다 던지기" 기준선은 §12.2 역사 순서로 재야 한다.`);
}

// ═════════ 확인 6 — 기준선 대비 ΔR
rule("확인 6. 기여 배율 스윕");
{
  const start = reachScore(createGame(MONARCHY, { seed: 1 }).national);
  const pool = EDICTS.map((e) => e.id);
  const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
  const mean = (opts: Opts) =>
    seeds.reduce((acc, sd) => acc + reachScore(run(MONARCHY, greedy(pool), sd, opts).national), 0) / seeds.length;
  line(`  25헥스 시작 R ${f(start)}. §4.5 목표선: 역사적 실제 +6.0 / 균형 성공 +17.7`);
  line(`  채택 배율 P×${GAIN_SCALE.p} T×${GAIN_SCALE.t} F×${GAIN_SCALE.f} 을 1.00 으로 두고 스윕 (8시드 평균):`);
  for (const m of [1.5, 1.25, 1.0, 0.8, 0.6]) {
    const r = mean({ gainScale: { p: GAIN_SCALE.p * m, t: GAIN_SCALE.t * m, f: GAIN_SCALE.f * m } });
    line(`     ×${f(m, 2)} → 최종 R ${f(r).padStart(5)}  (ΔR ${(r - start >= 0 ? "+" : "") + f(r - start)})`);
  }
  const rs = seeds.map((sd) => reachScore(run(MONARCHY, greedy(pool), sd).national));
  const mu = rs.reduce((a, b) => a + b, 0) / rs.length;
  const sd = Math.sqrt(rs.reduce((a, b) => a + (b - mu) ** 2, 0) / rs.length);
  line(`  시드 편차: 표준편차 ${f(sd, 2)}, 범위 ${f(Math.min(...rs))}~${f(Math.max(...rs))}`);
}

// ═════════ 확인 6 — 충돌도 매트릭스 커버리지
rule("검산 3. 28칙령 × 33세력 이해충돌도 커버리지");
{
  let filled = 0;
  const total = EDICTS.length * MONARCHY.factions.length;
  for (const e of EDICTS) {
    for (const fa of MONARCHY.factions) if (conflictFor(MONARCHY, e, fa.id) !== 0) filled++;
  }
  line(`  0이 아닌 칸 ${filled} / ${total} (${f((filled / total) * 100)}%)`);
  const noOpposition = EDICTS.filter((e) =>
    MONARCHY.factions.every((fa) => conflictFor(MONARCHY, e, fa.id) <= 0),
  );
  line(`  반대 세력이 하나도 없는 칙령: ${noOpposition.length === 0 ? "없음" : noOpposition.map((e) => e.labelKo).join(", ")}`);
}
line();
