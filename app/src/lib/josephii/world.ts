/**
 * 지도·세력 묶음. 엔진은 특정 지도에 의존하지 않는다.
 * 검증용 3헥스 지도(§16.1)와 플레이용 25헥스 축약 지도가 같은 엔진을 쓴다.
 */
import type { Faction, Hex } from "./types.ts";

export interface World {
  id: string;
  labelKo: string;
  hexes: Hex[];
  factions: Faction[];
  hexById: Record<string, Hex>;
  factionById: Record<string, Faction>;
}

export function makeWorld(
  id: string,
  labelKo: string,
  hexes: Hex[],
  factions: Faction[],
): World {
  return {
    id,
    labelKo,
    hexes,
    factions,
    hexById: Object.fromEntries(hexes.map((h) => [h.id, h])),
    factionById: Object.fromEntries(factions.map((f) => [f.id, f])),
  };
}
