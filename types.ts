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
  SWITCH = 9, // Activates gates when hit by beam
  GATE = 10,  // Blocked until a switch is hit
}

// 0: Up, 1: Right, 2: Down, 3: Left
export type Direction = 0 | 1 | 2 | 3;

export enum EntanglementGroup {
  NONE = 'none',
  ALPHA = 'alpha', // Blue
  BETA = 'beta',   // Pink
  GAMMA = 'gamma', // Green
}

export interface TileState {
  type: TileType;
  rotation: number; // 0-3
  fixed: boolean; // If true, player cannot rotate manually
  group: EntanglementGroup;
  id: string;
}

export interface GridPos {
  r: number;
  c: number;
}

export interface Enemy {
  id: string;
  r: number;
  c: number;
}

export interface LevelData {
  id: number;
  size: number; // Grid size (e.g., 5 for 5x5)
  tiles: TileState[][];
  par: number; // Target moves
  description?: string;
}

export interface BeamSegment {
  r: number;
  c: number;
  entryDir: Direction;
  exitDir: Direction | null;
  active: boolean; // Is this segment lit?
  isTeleport?: boolean; // For visual rendering of portals
  teleportTo?: GridPos;
}

export interface GameState {
  levelIndex: number;
  grid: TileState[][];
  enemies: Enemy[];
  moves: number;
  isComplete: boolean;
  history: TileState[][][]; // Simple undo history
}