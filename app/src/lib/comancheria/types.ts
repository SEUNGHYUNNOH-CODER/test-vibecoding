export type Territory =
  | "upper-arkansas"
  | "llano-estacado"
  | "red-river"
  | "lower-arkansas"
  | "brazos-colorado"
  | "rio-grande";

export type SpaceType = "circle" | "hex" | "square" | "reservation";

export interface MapSpace {
  id: string;
  territory: Territory | null;
  type: SpaceType;
  /** 1-6 area/strength value printed on circular spaces. null for hex/square/reservation. */
  areaValue: number | null;
  label: string;
  /** position as percent (0-100) of the map image, top-left origin */
  x: number;
  y: number;
}

export type ConnectionType = "solid" | "dashed" | "special";

export interface MapConnection {
  from: string;
  to: string;
  type: ConnectionType;
  /** for "special" connections: which card/event enables or changes them */
  note?: string;
}

export type DevCardTiming = "when-revealed" | "play-from-hand" | "while-in-play";

export interface DevelopmentCard {
  id: string;
  number: number;
  period: 1 | 2 | 3 | 4;
  titleEn: string;
  titleKo: string;
  flavorKo: string;
  timing: DevCardTiming;
  apCost: number | null;
  effectKo: string;
}

export interface CultureCard {
  id: string;
  set: string;
  setKo: string;
  level: 1 | 2 | 3;
  cost: number;
  requiresKo: string;
  effectKo: string;
}

export interface WarCard {
  id: string;
  number: number;
  movement: Partial<Record<"east" | "west" | "south" | "north", number>>;
  titleKo: string;
  eventTimingKo: string;
  effectKo: string;
}
