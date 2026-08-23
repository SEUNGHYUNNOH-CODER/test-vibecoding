import type { Axes } from "@/lib/josephii/types";

/** §13.3 — 지도는 가장 약한 축을 칠해 병목을 즉시 노출한다 */
export function weakestAxis(a: Axes): { key: "p" | "t" | "f"; labelKo: string; value: number } {
  const entries = [
    { key: "p" as const, labelKo: "인구", value: a.p },
    { key: "t" as const, labelKo: "영역", value: a.t },
    { key: "f" as const, labelKo: "세수", value: a.f },
  ];
  return entries.reduce((min, e) => (e.value < min.value ? e : min));
}

/** 0(붉음) → 50(호박) → 100(초록) 램프. 라이트/다크 모두에서 읽히는 명도로 고정. */
export function reachColor(v: number): string {
  const t = Math.max(0, Math.min(100, v)) / 100;
  const stops: Array<[number, number, number, number]> = [
    [0, 0.62, 0.17, 25],
    [0.5, 0.76, 0.14, 80],
    [1, 0.66, 0.15, 150],
  ];
  let i = 0;
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
  const [t0, l0, c0, h0] = stops[i];
  const [t1, l1, c1, h1] = stops[i + 1];
  const k = (t - t0) / (t1 - t0);
  const mix = (a: number, b: number) => a + (b - a) * k;
  return `oklch(${mix(l0, l1).toFixed(3)} ${mix(c0, c1).toFixed(3)} ${mix(h0, h1).toFixed(1)})`;
}

export const ESTATE_LABEL: Record<string, string> = {
  noble: "귀족",
  clergy: "성직자",
  burgher: "도시민",
  peasant: "농민",
};

export const ESTATE_ORDER = ["noble", "clergy", "burgher", "peasant"] as const;

export function conflictLabel(v: number): string {
  if (v >= 3) return "권리·재산 직접 박탈";
  if (v === 2) return "주요 이권 침해";
  if (v === 1) return "간접 손실, 위신 손상";
  if (v === -1) return "간접 수혜";
  if (v === -2) return "명확한 수혜";
  if (v <= -3) return "결정적 수혜";
  return "무관";
}
