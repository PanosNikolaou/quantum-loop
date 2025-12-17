import { LevelData, TileType, EntanglementGroup, TileState } from './types';

export const DIRECTIONS = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
} as const;

const T = (type: TileType, rotation = 0, fixed = false, group = EntanglementGroup.NONE): TileState => ({
  type,
  rotation,
  fixed,
  group,
  id: Math.random().toString(36).substr(2, 9),
});

const createLevel = (id: number, size: number, layout: string[], par: number, desc?: string): LevelData => {
  const tiles: TileState[][] = [];
  for (let r = 0; r < size; r++) {
    const row: TileState[] = [];
    const rowStr = layout[r] || "";
    for (let c = 0; c < size; c++) {
      const char = rowStr[c] || '.';
      let tile = T(TileType.EMPTY);
      
      // Map
      if (char === 'S') tile = T(TileType.SOURCE, 1, true); 
      if (char === 'V') tile = T(TileType.SOURCE, 2, true); 
      if (char === 'E') tile = T(TileType.SINK, 0, true);
      if (char === '-') tile = T(TileType.STRAIGHT, 0); 
      if (char === '|') tile = T(TileType.STRAIGHT, 1); 
      if (char === 'L') tile = T(TileType.CORNER, 0);
      if (char === 'J') tile = T(TileType.CORNER, 1);
      if (char === '7') tile = T(TileType.CORNER, 2); 
      if (char === 'F') tile = T(TileType.CORNER, 3);
      if (char === '+') tile = T(TileType.CROSS, 0, true); 
      if (char === 'X') tile = T(TileType.CROSS, 0, false); 
      if (char === '#') tile = T(TileType.BLOCK, 0, true);
      if (char === 'A') tile = T(TileType.CORNER, 0, false, EntanglementGroup.ALPHA);
      if (char === 'B') tile = T(TileType.CORNER, 0, false, EntanglementGroup.BETA);
      if (char === 'C') tile = T(TileType.STRAIGHT, 0, false, EntanglementGroup.ALPHA);
      if (char === 'D') tile = T(TileType.STRAIGHT, 0, false, EntanglementGroup.BETA);
      if (char === '@') tile = T(TileType.PORTAL, 0, true, EntanglementGroup.ALPHA);
      if (char === '&') tile = T(TileType.PORTAL, 0, true, EntanglementGroup.BETA);
      if (char === '*') tile = T(TileType.SWITCH, 0, true);
      if (char === 'G') tile = T(TileType.GATE, 0, false); 

      row.push(tile);
    }
    tiles.push(row);
  }
  return { id, size, tiles, par, description: desc };
};

export const LEVELS: LevelData[] = [
  createLevel(1, 4, ["....","S-L.","..LE","...."], 4, "Guide the light."),
  createLevel(2, 4, ["S-L.","..|.","..LE","...."], 6, "S-Bends."),
  createLevel(3, 5, ["SL...",".LL..","..LL.","...LL","....E"], 8, "Stairway."),
  createLevel(4, 5, ["S-L..","..L-L","....|","..L-L","..E.."], 10, "Zig Zag."),
  createLevel(5, 5, ["S-L..","..+..","..L-E",".....","....."], 8, "Crossovers."),
  createLevel(6, 5, ["S-A..","..|..","..L-A","....|","....E"], 8, "Quantum Sync."),
  createLevel(7, 5, ["....E","S-C-A",".....",".....","....."], 8, "Aligned Phases."),
  createLevel(8, 5, ["S-A..","..L-A","....|","....E","....."], 12, "Staircase Sync."),
  createLevel(9, 6, ["S-L...","..|...","..C...","..|...","..A-E.","......"], 14, "Quantum Tunneling."),
  createLevel(10, 6, ["S-L...","..|...","..L-L.","....+.","....LE","......"], 15, "Long Path."),

  // FIXED LEVEL 11
  createLevel(11, 6, [
    "S-J...",  // (0,2) is J (Turns R->D)
    "..@...",  // (1,2) is @
    "......",
    "..@...",  // (3,2) is @
    "..L-7.",  // (4,2) is L (Turns D->R), (4,4) is 7 (Turns R->D)
    "....E."
  ], 12, "Wormhole: Redesigned."),

  // FIXED LEVEL 12
  createLevel(12, 6, [
    "S---@.",  // (0,4) is @
    "....|.",
    ".@--J.",  // (2,1) is @, (2,4) is J
    ".|....",
    ".L--7.",  // (4,1) is L, (4,4) is 7
    "....E."
  ], 14, "Portal Maze."),

  // FIXED LEVEL 13
  createLevel(13, 6, [
    "S-A-@.",
    "....|.",
    "..@-J.",
    "..|...",
    "..L-7.",
    "....E."
  ], 16, "Alpha Jump."),

  // --- NEW MECHANICS (SWITCHES & GATES) ---
  createLevel(14, 6, [
    "S-*...", // (0,2) is * (Switch)
    "....|.",
    "..G-L.", // (2,2) is G (Gate)
    "..|...",
    "..L-E.",
    "......"
  ], 8, "Logic Gate: Hit the switch to open the fence."),

  createLevel(15, 6, [
    "S-L...",
    "..G-@.", // Gate blocking Portal
    "..*...", // Switch below gate
    "......",
    "..@-L.",
    "....E."
  ], 10, "Sequence."),

  createLevel(16, 6, [
    "S-J...",
    "..*...",
    "L-G-7.", // Must hit switch to pass through G
    "|.....",
    "L---E."
  ], 12, "U-Turn."),

  createLevel(17, 7, [
    "S-L...L",
    "..|...|",
    "..*-G.|",
    "....|.|",
    "L-G.|.|",
    "|...L-L",
    "L-L...E"
  ], 20, "Binary Path."),

  createLevel(18, 7, [
    "S-A-@.A",
    "..|...|",
    "..G-A.|",
    "..*...|",
    "A-A.|.|",
    "|...A-A",
    "A-A...E"
  ], 22, "Quantum Logic."),

  createLevel(19, 7, [
    "S-L....",
    "..A...*",
    "..L-G.|",
    "....|.|",
    "B...|.|",
    "L---B.|",
    "......E"
  ], 16, "Locked Sector."),

  createLevel(20, 7, [
    "S-*-G-D",
    "......|",
    "......D",
    "......|",
    "......D",
    "......|",
    "C-C-C-E"
  ], 14, "Power Grid."),

  createLevel(21, 7, [
    "S-L.L-L",
    "..|.|..",
    "..L+L..",
    "...*...",
    "..G+L..",
    "..|.|..",
    "L-L.L-E"
  ], 25, "System Core."),

  createLevel(22, 7, [
    "S-A.A-A",
    "..|.|..",
    "*-G.A-B",
    "|.....|",
    "B-A.A-B",
    "..|.|..",
    "..A.A-E"
  ], 30, "Firewall."),

  createLevel(23, 7, [
    "#.#V#.#",
    "#.#*#.#", 
    "#.G.B.#",
    "#.A.A.#",
    "#.B.B.#",
    "#.#A#.#",
    "#.#E#.#"
  ], 20, "Pressure Plate."),

  createLevel(24, 7, [
    "S-C-C-L",
    "|.....|",
    "*-G-C-C",
    "......|",
    "......C",
    "......|",
    "......E"
  ], 10, "Direct Current."),

  createLevel(25, 7, [
    "S...*...",
    "....G...",
    "....L-L.",
    "......|.",
    "L-L-L-L.",
    "|.......",
    "L-----E."
  ], 15, "Long Loop."),

  createLevel(26, 7, [
    "S-A-*-A",
    "|...G.|",
    "B.....B",
    "|.....|",
    "A.....A",
    "|.....|",
    "L.....E"
  ], 22, "Outer Logic."),

  createLevel(27, 7, [
    "S-A-*-C",
    "|.+.G.|",
    "C.+.+.C",
    "|.+.+.|",
    "B.+.+.B",
    "|.+.+.|",
    "L-C-D-E"
  ], 20, "Interference."),

  createLevel(28, 7, [
    "S-*-G-L",
    "|.....|",
    "L-C-C-L",
    "......|",
    "L-C-C-L",
    "|......",
    "L-C-C-E"
  ], 25, "The Spiral V2."),

  createLevel(29, 7, [
    "S-A-A-A",
    "|.B-*-|",
    "|.|.G.|",
    "|.L-C.|",
    "|...|.|",
    "|.B-B.|",
    "A-A-A-E"
  ], 30, "Deep Logic."),

  createLevel(30, 7, [
    "S.A.B.A",
    ".C.D.C.",
    "A.B.A.B",
    ".D.+.D.",
    "B.A.B.A",
    ".C.D.C.",
    "A.B.A.E"
  ], 40, "End of Loop.")
];