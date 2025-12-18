import { TileState, TileType, Direction, BeamSegment, GridPos } from '../types';
import { DIRECTIONS } from '../constants';

const getNextPosition = (pos: GridPos, dir: Direction): GridPos => {
  switch (dir) {
    case DIRECTIONS.UP: return { r: pos.r - 1, c: pos.c };
    case DIRECTIONS.RIGHT: return { r: pos.r, c: pos.c + 1 };
    case DIRECTIONS.DOWN: return { r: pos.r + 1, c: pos.c };
    case DIRECTIONS.LEFT: return { r: pos.r, c: pos.c - 1 };
  }
};

const getExitDirection = (tile: TileState, entryDir: Direction, gatesOpen: boolean): Direction | null => {
  let { type, rotation } = tile;

  // Quantum Superposition Logic:
  // If it's a superposition tile, it "collapses" into a fixed state when observed by the beam.
  // We determine its state based on its current rotation mod 2.
  if (type === TileType.SUPERPOSITION) {
    type = (rotation % 2 === 0) ? TileType.STRAIGHT : TileType.CORNER;
  }

  switch (type) {
    case TileType.EMPTY:
    case TileType.BLOCK:
    case TileType.SOURCE: 
      return null;
    
    case TileType.GATE:
      if (!gatesOpen) return null;
      if (rotation % 2 === 0) {
        if (entryDir === DIRECTIONS.UP || entryDir === DIRECTIONS.DOWN) return entryDir;
      } else {
        if (entryDir === DIRECTIONS.LEFT || entryDir === DIRECTIONS.RIGHT) return entryDir;
      }
      return null;

    case TileType.SWITCH:
    case TileType.PORTAL:
    case TileType.CROSS:
      return entryDir; 

    case TileType.STRAIGHT:
      if (rotation % 2 === 0) {
        if (entryDir === DIRECTIONS.UP || entryDir === DIRECTIONS.DOWN) return entryDir;
      } else {
        if (entryDir === DIRECTIONS.LEFT || entryDir === DIRECTIONS.RIGHT) return entryDir;
      }
      return null;

    case TileType.CORNER:
      const r = rotation % 4;
      if (r === 0) {
        if (entryDir === DIRECTIONS.DOWN) return DIRECTIONS.RIGHT;
        if (entryDir === DIRECTIONS.LEFT) return DIRECTIONS.UP;
      } else if (r === 1) {
        if (entryDir === DIRECTIONS.LEFT) return DIRECTIONS.DOWN;
        if (entryDir === DIRECTIONS.UP) return DIRECTIONS.RIGHT;
      } else if (r === 2) {
        if (entryDir === DIRECTIONS.UP) return DIRECTIONS.LEFT;
        if (entryDir === DIRECTIONS.RIGHT) return DIRECTIONS.DOWN;
      } else if (r === 3) {
        if (entryDir === DIRECTIONS.RIGHT) return DIRECTIONS.UP;
        if (entryDir === DIRECTIONS.DOWN) return DIRECTIONS.LEFT;
      }
      return null;

    default:
      return null;
  }
};

const trace = (grid: TileState[][], gatesOpen: boolean): { path: BeamSegment[], isComplete: boolean, switchHit: boolean } => {
  const path: BeamSegment[] = [];
  let isComplete = false;
  let switchHit = false;

  let startNode: GridPos | null = null;
  let currentDir: Direction = DIRECTIONS.RIGHT;

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].type === TileType.SOURCE) {
        startNode = { r, c };
        currentDir = grid[r][c].rotation as Direction; 
        break;
      }
    }
    if (startNode) break;
  }

  if (!startNode) return { path, isComplete: false, switchHit: false };

  let currentPos = startNode;
  let steps = 0;
  const MAX_STEPS = 100;

  path.push({ r: currentPos.r, c: currentPos.c, entryDir: currentDir, exitDir: currentDir, active: true });

  while (steps < MAX_STEPS) {
    const nextPos = getNextPosition(currentPos, currentDir);
    if (nextPos.r < 0 || nextPos.r >= grid.length || nextPos.c < 0 || nextPos.c >= grid[0].length) break;

    const tile = grid[nextPos.r][nextPos.c];
    
    if (tile.type === TileType.SINK) {
       path.push({ r: nextPos.r, c: nextPos.c, entryDir: currentDir, exitDir: null, active: true });
       isComplete = true; 
       break;
    }

    if (tile.type === TileType.SWITCH) {
      switchHit = true;
    }
    
    if (tile.type === TileType.PORTAL) {
      let destination: GridPos | null = null;
      for(let r=0; r<grid.length; r++) {
        for(let c=0; c<grid[r].length; c++) {
          const candidate = grid[r][c];
          if (candidate.type === TileType.PORTAL && candidate.group === tile.group && (r !== nextPos.r || c !== nextPos.c)) {
            destination = { r, c };
            break;
          }
        }
        if (destination) break;
      }

      if (destination) {
        path.push({ r: nextPos.r, c: nextPos.c, entryDir: currentDir, exitDir: null, active: true, isTeleport: true, teleportTo: destination });
        currentPos = destination;
        path.push({ r: destination.r, c: destination.c, entryDir: currentDir, exitDir: currentDir, active: true });
        steps++;
        continue;
      }
    }

    const exitDir = getExitDirection(tile, currentDir, gatesOpen);

    if (exitDir === null) {
      path.push({ r: nextPos.r, c: nextPos.c, entryDir: currentDir, exitDir: null, active: false });
      break;
    }

    path.push({ r: nextPos.r, c: nextPos.c, entryDir: currentDir, exitDir: exitDir, active: true });
    currentPos = nextPos;
    currentDir = exitDir;
    steps++;
  }

  return { path, isComplete, switchHit };
};

export const calculateBeam = (grid: TileState[][]): { path: BeamSegment[], isComplete: boolean, gatesOpen: boolean } => {
  let result = trace(grid, false);
  if (result.switchHit) {
    const finalResult = trace(grid, true);
    return { ...finalResult, gatesOpen: true };
  }
  return { ...result, gatesOpen: false };
};