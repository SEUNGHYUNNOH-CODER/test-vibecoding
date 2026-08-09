import { MAP_SPACES } from "./map-data";
import { WAR_CARDS } from "./cards/war";

export interface BandResources {
  bison: number;
  captives: number;
  horses: number;
  food: number;
  tradeGoods: number;
  guns: number;
}

export function emptyBandResources(): BandResources {
  return { bison: 0, captives: 0, horses: 0, food: 0, tradeGoods: 0, guns: 0 };
}

/**
 * A single Band counter. `mpMax` (4-6 on the physical counter) isn't in our
 * source material, so newly created bands default to 6 MP — a simplification
 * worth revisiting once the actual counter values are available.
 */
export interface BandInstance {
  id: string;
  strength: number;
  mpMax: number;
  mpRemaining: number;
  status: "in-box" | "active" | "finished";
  /** map space the band currently occupies; null while sitting in a rancheria's resource box */
  spaceId: string | null;
  resources: BandResources;
  ownsMahimiana: boolean;
}

export interface RancheriaState {
  id: string; // "A".."E"
  spaceId: string;
  paraiboMedicine: number;
  mahimianaMedicine: number;
  bands: BandInstance[];
  horses: number;
  hasMahimiana: boolean;
}

export interface DrawCupState {
  success: number;
  enemyAp2: number;
  enemyAp3: number;
  enemyAp4: number;
}

export interface DevelopmentDeckState {
  /** card numbers face-up on the 3 development card spaces at top of map */
  layout: number[];
  drawPile: number[];
  discardPile: number[];
  inPlay: number[];
  hand: number[];
}

export interface GeneralRecordState {
  militaryPoints: number;
  culturePoints: number;
  playerAP: number;
  enemyAP: number;
}

export type GamePhase = "war-column" | "task-selection" | "task-execution" | "cleanup";

export type PlayerTask = "actions" | "culture" | "planning" | "passage-of-time";

export interface WarDeckState {
  drawPile: string[]; // WarCard ids
  discardPile: string[];
  warEventCardId: string | null;
}

/**
 * An enemy War Column on the map. The physical counter's printed Battle DRM
 * isn't in our source material, so it's entered by hand when the column is
 * placed (default 0) — see the note on `combatDrm`.
 */
export interface WarColumnState {
  id: string;
  enemy: "north" | "south" | "east" | "west";
  strength: number;
  /** printed Battle DRM on the physical War Column counter; user-entered, default 0 */
  combatDrm: number;
  spaceId: string;
}

export interface GameState {
  scenarioId: string;
  tribeSpaces: string[];
  bisonSpaces: string[];
  rancherias: RancheriaState[];
  generalRecord: GeneralRecordState;
  developmentDeck: DevelopmentDeckState;
  /** ids of the acquired (owned) culture cards; the rest are available to buy */
  acquiredCultureCards: string[];
  historyCardId: string;
  drawCup: DrawCupState;
  phase: GamePhase;
  selectedTask: PlayerTask | null;
  warDeck: WarDeckState;
  warColumns: WarColumnState[];
  log: string[];
  selectedBandId: string | null;
}

const CIRCLE_SPACE_IDS = MAP_SPACES.filter((s) => s.type === "circle").map((s) => s.id);

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Scenario 9.2 "The Path to the Plains" (평원까지 길이) — the easiest
 * scenario, single historical period (1700-1749). Setup per rulebook 9.2.
 */
export function createScenario92State(): GameState {
  const rancheriaSpace = "UA1";
  const tribeSpaces = [
    "UA4",
    "UA5",
    "LE2",
    "LE6",
    "RG1",
    "RG2",
    "RG6",
    "BC2",
    "BC4",
    "RR1",
    "RR2",
    "RR3",
    "LA1",
    "LA2",
    "LA3",
  ];
  const occupied = new Set([rancheriaSpace, ...tribeSpaces]);
  const bisonSpaces = CIRCLE_SPACE_IDS.filter((id) => !occupied.has(id));

  return {
    scenarioId: "9.2",
    tribeSpaces,
    bisonSpaces,
    rancherias: [
      {
        id: "A",
        spaceId: rancheriaSpace,
        paraiboMedicine: 2,
        mahimianaMedicine: 2,
        bands: [2, 2, 2].map((strength, i) => ({
          id: `A-band-${i + 1}`,
          strength,
          mpMax: 6,
          mpRemaining: 6,
          status: "in-box" as const,
          spaceId: null,
          resources: emptyBandResources(),
          ownsMahimiana: false,
        })),
        horses: 4,
        hasMahimiana: true,
      },
    ],
    generalRecord: {
      militaryPoints: 3,
      culturePoints: 3,
      playerAP: 1,
      enemyAP: 0,
    },
    developmentDeck: {
      layout: [1, 2, 3],
      drawPile: shuffle(Array.from({ length: 18 }, (_, i) => i + 4)), // #4-21
      discardPile: [],
      inPlay: [],
      hand: [],
    },
    acquiredCultureCards: [],
    historyCardId: "H1",
    drawCup: {
      success: 10,
      enemyAp2: 3,
      enemyAp3: 4,
      enemyAp4: 5,
    },
    phase: "war-column",
    selectedTask: null,
    warDeck: {
      drawPile: shuffle(WAR_CARDS.map((c) => c.id)),
      discardPile: [],
      warEventCardId: null,
    },
    warColumns: [],
    log: ["시나리오 9.2 게임을 시작했습니다."],
    selectedBandId: null,
  };
}
