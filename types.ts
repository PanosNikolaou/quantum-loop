export enum TileType {
  EMPTY = 0,
  STRAIGHT = 1,
  CORNER = 2,
  T_SHAPE = 3,
  CROSS = 4,
  SOURCE = 5,
  SINK = 6,
  BLOCK = 7,
  PORTAL = 8,
  SWITCH = 9,
  GATE = 10,
  SUPERPOSITION = 11,
}

export type Direction = 0 | 1 | 2 | 3;

export enum EntanglementGroup {
  NONE = 'none',
  ALPHA = 'alpha',
  BETA = 'beta',
  GAMMA = 'gamma',
}

export enum EnemyType {
  STALKER = 'stalker',     // Red - High disruption
  SPRINTER = 'sprinter',   // Yellow - Fast movement
  GLITCHER = 'glitcher',   // Green - Fixes tiles temporarily
  FLITTER = 'flitter',     // Purple - Jumps obstacles
}

export interface TileState {
  type: TileType;
  rotation: number;
  fixed: boolean;
  group: EntanglementGroup;
  id: string;
  tempFixedUntil?: number; // For Glitcher ability
}

export interface GridPos {
  r: number;
  c: number;
}

export interface Enemy {
  id: string;
  r: number;
  c: number;
  type: EnemyType;
  moveTick: number; // For varied speeds
}

export interface LevelData {
  id: number;
  size: number;
  tiles: TileState[][];
  par: number;
  description?: string;
}

export interface BeamSegment {
  r: number;
  c: number;
  entryDir: Direction;
  exitDir: Direction | null;
  active: boolean;
  isTeleport?: boolean;
  teleportTo?: GridPos;
}

export interface GameState {
  levelIndex: number;
  grid: TileState[][];
  enemies: Enemy[];
  moves: number;
  isComplete: boolean;
  history: TileState[][][];
  lastNoisePos: GridPos | null;
  tickCount: number;
}