import type { MapConnection, MapSpace } from "./types";

/**
 * v1 draft — coordinates were digitized by eye from a photo of the physical
 * board (public/comancheria/map.jpg) and are NOT pixel-perfect. Expect to
 * nudge x/y a few percent after visually comparing markers to the real art
 * in the running app. Connections marked "special" are card/event-gated
 * (Santa Fe Trail, Indian Removal Act, Mexican War, etc.) and only matter
 * once those cards are relevant — not needed for the Period 1 / scenario 9.2
 * build.
 */
export const MAP_SPACES: MapSpace[] = [
  // Upper Arkansas
  { id: "UA1", territory: "upper-arkansas", type: "circle", areaValue: 1, label: "Upper Arkansas #1", x: 17.7, y: 28.6 },
  { id: "UA2", territory: "upper-arkansas", type: "circle", areaValue: 2, label: "Upper Arkansas #2", x: 27.5, y: 30.4 },
  { id: "UA3", territory: "upper-arkansas", type: "circle", areaValue: 3, label: "Upper Arkansas #3", x: 24.2, y: 39.4 },
  { id: "UA4", territory: "upper-arkansas", type: "circle", areaValue: 4, label: "Upper Arkansas #4", x: 30.3, y: 38.9 },
  { id: "UA5", territory: "upper-arkansas", type: "circle", areaValue: 5, label: "Upper Arkansas #5", x: 36.2, y: 33.5 },
  { id: "UA6", territory: "upper-arkansas", type: "circle", areaValue: 6, label: "Upper Arkansas #6", x: 42.6, y: 31.3 },

  // Llano Estacado
  { id: "LE1", territory: "llano-estacado", type: "circle", areaValue: 1, label: "Llano Estacado #1", x: 17.7, y: 39.9 },
  { id: "LE2", territory: "llano-estacado", type: "circle", areaValue: 2, label: "Llano Estacado #2", x: 17.3, y: 57.4 },
  { id: "LE3", territory: "llano-estacado", type: "circle", areaValue: 3, label: "Llano Estacado #3", x: 22.0, y: 50.5 },
  { id: "LE4", territory: "llano-estacado", type: "circle", areaValue: 4, label: "Llano Estacado #4", x: 20.0, y: 68.0 },
  { id: "LE5", territory: "llano-estacado", type: "circle", areaValue: 5, label: "Llano Estacado #5", x: 24.7, y: 76.5 },
  { id: "LE6", territory: "llano-estacado", type: "circle", areaValue: 6, label: "Llano Estacado #6", x: 29.3, y: 68.0 },

  // Red River
  { id: "RR1", territory: "red-river", type: "circle", areaValue: 1, label: "Red River #1", x: 61.5, y: 76.0 },
  { id: "RR2", territory: "red-river", type: "circle", areaValue: 2, label: "Red River #2", x: 54.8, y: 70.0 },
  { id: "RR3", territory: "red-river", type: "circle", areaValue: 3, label: "Red River #3", x: 52.0, y: 60.2 },
  { id: "RR4", territory: "red-river", type: "circle", areaValue: 4, label: "Red River #4", x: 45.0, y: 59.7 },
  { id: "RR5", territory: "red-river", type: "circle", areaValue: 5, label: "Red River #5", x: 38.5, y: 54.1 },
  { id: "RR6", territory: "red-river", type: "circle", areaValue: 6, label: "Red River #6", x: 34.5, y: 44.8 },

  // Lower Arkansas
  { id: "LA1", territory: "lower-arkansas", type: "circle", areaValue: 1, label: "Lower Arkansas #1", x: 59.5, y: 60.5 },
  { id: "LA2", territory: "lower-arkansas", type: "circle", areaValue: 2, label: "Lower Arkansas #2", x: 59.5, y: 51.8 },
  { id: "LA3", territory: "lower-arkansas", type: "circle", areaValue: 3, label: "Lower Arkansas #3", x: 52.7, y: 49.5 },
  { id: "LA4", territory: "lower-arkansas", type: "circle", areaValue: 4, label: "Lower Arkansas #4", x: 47.7, y: 47.1 },
  { id: "LA5", territory: "lower-arkansas", type: "circle", areaValue: 5, label: "Lower Arkansas #5", x: 39.7, y: 45.8 },
  { id: "LA6", territory: "lower-arkansas", type: "circle", areaValue: 6, label: "Lower Arkansas #6", x: 44.8, y: 37.8 },

  // Brazos Colorado
  { id: "BC1", territory: "brazos-colorado", type: "circle", areaValue: 1, label: "Brazos Colorado #1", x: 53.0, y: 74.9 },
  { id: "BC2", territory: "brazos-colorado", type: "circle", areaValue: 2, label: "Brazos Colorado #2", x: 50.3, y: 78.3 },
  { id: "BC3", territory: "brazos-colorado", type: "circle", areaValue: 3, label: "Brazos Colorado #3", x: 40.3, y: 63.9 },
  { id: "BC4", territory: "brazos-colorado", type: "circle", areaValue: 4, label: "Brazos Colorado #4", x: 45.7, y: 86.0 },
  { id: "BC5", territory: "brazos-colorado", type: "circle", areaValue: 5, label: "Brazos Colorado #5", x: 41.0, y: 76.7 },
  { id: "BC6", territory: "brazos-colorado", type: "circle", areaValue: 6, label: "Brazos Colorado #6", x: 35.3, y: 78.8 },

  // Rio Grande
  { id: "RG1", territory: "rio-grande", type: "circle", areaValue: 1, label: "Rio Grande #1", x: 10.8, y: 60.2 },
  { id: "RG2", territory: "rio-grande", type: "circle", areaValue: 2, label: "Rio Grande #2", x: 11.7, y: 69.0 },
  { id: "RG3", territory: "rio-grande", type: "circle", areaValue: 3, label: "Rio Grande #3", x: 15.0, y: 77.8 },
  { id: "RG4", territory: "rio-grande", type: "circle", areaValue: 4, label: "Rio Grande #4", x: 18.7, y: 86.0 },
  { id: "RG5", territory: "rio-grande", type: "circle", areaValue: 5, label: "Rio Grande #5", x: 25.3, y: 92.7 },
  { id: "RG6", territory: "rio-grande", type: "circle", areaValue: 6, label: "Rio Grande #6", x: 29.3, y: 84.4 },

  // Special spaces
  { id: "PALO_DURO", territory: null, type: "hex", areaValue: null, label: "Palo Duro Canyon", x: 28.8, y: 56.9 },
  { id: "RESERVATION", territory: null, type: "reservation", areaValue: null, label: "The Reservation", x: 55.0, y: 36.6 },
  { id: "ENEMY_WEST", territory: null, type: "square", areaValue: null, label: "West Enemy Space", x: 42.5, y: 22.9 },
  { id: "ENEMY_SOUTH", territory: null, type: "square", areaValue: null, label: "South Enemy Space", x: 64.7, y: 55.4 },
  // TODO: not yet verified against the board photo (not needed for scenario
  // 9.2, which only uses West + South colonial enemies) — placeholder only.
  { id: "ENEMY_EAST_1", territory: null, type: "square", areaValue: null, label: "East Enemy Space #1", x: 78.0, y: 60.0 },
  { id: "ENEMY_EAST_2", territory: null, type: "square", areaValue: null, label: "East Enemy Space #2", x: 64.0, y: 74.0 },
];

export const MAP_CONNECTIONS: MapConnection[] = [
  // Upper Arkansas internal
  { from: "UA1", to: "UA2", type: "solid" },
  { from: "UA2", to: "UA5", type: "solid" },
  { from: "UA2", to: "UA4", type: "solid" },
  { from: "UA4", to: "UA3", type: "solid" },
  { from: "UA5", to: "UA6", type: "solid" },
  { from: "UA5", to: "LA6", type: "solid" },
  { from: "UA3", to: "LE1", type: "solid" },
  { from: "UA1", to: "LE1", type: "dashed" },

  // Llano Estacado internal + Palo Duro hub (dashed = Comanche/North-only)
  { from: "LE1", to: "LE2", type: "solid" },
  { from: "LE2", to: "LE3", type: "solid" },
  { from: "LE2", to: "LE4", type: "solid" },
  { from: "LE2", to: "RG1", type: "solid" },
  { from: "LE4", to: "LE5", type: "solid" },
  { from: "LE3", to: "PALO_DURO", type: "dashed" },
  { from: "LE4", to: "PALO_DURO", type: "dashed" },
  { from: "LE6", to: "PALO_DURO", type: "dashed" },
  { from: "RR5", to: "PALO_DURO", type: "dashed" },
  { from: "BC3", to: "PALO_DURO", type: "dashed" },
  { from: "LE6", to: "RR5", type: "solid" },
  { from: "LE6", to: "BC3", type: "dashed" },
  { from: "LE6", to: "RG6", type: "special", note: "Treat as Enemy Connections until Mexican War card is Revealed" },

  // Red River internal
  { from: "RR5", to: "RR6", type: "solid" },
  { from: "RR6", to: "LA5", type: "solid" },
  { from: "RR5", to: "RR4", type: "solid" },
  { from: "RR4", to: "RR3", type: "solid" },
  { from: "RR3", to: "LA2", type: "solid" },
  { from: "RR3", to: "RR2", type: "solid" },
  { from: "RR2", to: "RR1", type: "solid" },
  { from: "RR4", to: "BC3", type: "solid" },
  { from: "RR2", to: "BC1", type: "solid" },

  // Lower Arkansas internal
  { from: "LA6", to: "LA5", type: "solid" },
  { from: "LA5", to: "LA4", type: "solid" },
  { from: "LA4", to: "LA3", type: "solid" },
  { from: "LA3", to: "LA2", type: "solid" },
  { from: "LA2", to: "LA1", type: "solid" },
  { from: "LA1", to: "ENEMY_SOUTH", type: "solid" },
  { from: "LA6", to: "ENEMY_WEST", type: "special", note: "Trade only until Santa Fe Trail card Revealed" },
  { from: "LA6", to: "LA3", type: "special", note: "Treat as Enemy Connections until Indian Removal Act card is Revealed" },

  // Brazos Colorado internal
  { from: "BC3", to: "BC5", type: "solid" },
  { from: "BC5", to: "BC6", type: "solid" },
  { from: "BC5", to: "BC2", type: "solid" },
  { from: "BC2", to: "BC1", type: "solid" },
  { from: "BC2", to: "BC4", type: "solid" },
  { from: "BC6", to: "RG6", type: "solid" },
  { from: "BC4", to: "ENEMY_EAST_2", type: "special", note: "Both South and East may Settle/Subjugate across this connection" },
  { from: "BC1", to: "RR1", type: "solid" },

  // Rio Grande internal
  { from: "RG1", to: "RG2", type: "solid" },
  { from: "RG2", to: "RG3", type: "dashed" },
  { from: "RG3", to: "RG4", type: "solid" },
  { from: "RG4", to: "RG5", type: "solid" },
  { from: "RG5", to: "RG6", type: "solid" },
  { from: "RG5", to: "BC6", type: "solid" },
];

export function getSpace(id: string): MapSpace | undefined {
  return MAP_SPACES.find((s) => s.id === id);
}

export function getConnectedSpaces(id: string): string[] {
  return MAP_CONNECTIONS.filter((c) => c.from === id || c.to === id).map((c) =>
    c.from === id ? c.to : c.from,
  );
}
