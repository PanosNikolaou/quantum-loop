import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Menu, Star, ChevronRight, Lock, Timer, AlertTriangle, Volume2, VolumeX, Ghost } from 'lucide-react';
import { LEVELS } from './constants';
import { GameState, EntanglementGroup, GridPos, Enemy, TileType, EnemyType } from './types';
import { calculateBeam } from './utils/gameLogic';
import Board from './components/Board';
import { audioManager } from './utils/audio';

type Screen = 'MENU' | 'GAME' | 'LEVEL_SELECT' | 'WIN' | 'GAME_OVER';

const vibrate = (ms: number | number[]) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch (e) {
    // Ignore
  }
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('MENU');
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [beamPath, setBeamPath] = useState<any[]>([]);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startLevel = useCallback((levelId: number) => {
    audioManager.init();
    audioManager.resume();

    const levelData = LEVELS.find(l => l.id === levelId);
    if (!levelData) return;

    const initialGrid = levelData.tiles.map(row => 
      row.map(tile => ({ ...tile }))
    );

    const calculatedTime = Math.max(15, 90 - (levelId * 2));
    setMaxTime(calculatedTime);
    setTimeLeft(calculatedTime);

    const initialEnemies: Enemy[] = [];
    if (levelId >= 5) {
      const numEnemies = Math.min(6, Math.floor(levelId / 3)); 
      const types = [EnemyType.STALKER, EnemyType.SPRINTER, EnemyType.GLITCHER, EnemyType.FLITTER];
      
      const occupiedInitial = new Set<string>();
      for (let i = 0; i < numEnemies; i++) {
        let r, c;
        let attempts = 0;
        do {
          r = Math.floor(Math.random() * levelData.size);
          c = Math.floor(Math.random() * levelData.size);
          attempts++;
        } while (occupiedInitial.has(`${r},${c}`) && attempts < 20);
        
        occupiedInitial.add(`${r},${c}`);
        const type = types[i % types.length];
        initialEnemies.push({ 
          id: `enemy-${i}`, 
          r, 
          c, 
          type, 
          moveTick: 0 
        });
      }
    }

    setGameState({
      levelIndex: levelId,
      grid: initialGrid,
      enemies: initialEnemies,
      moves: 0,
      isComplete: false,
      history: [],
      lastNoisePos: null,
      tickCount: 0
    });
    setScreen('GAME');
    setCurrentLevelId(levelId);
  }, []);

  const handleMuteToggle = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  useEffect(() => {
    if (screen === 'GAME' && !gameState?.isComplete && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
             if (timerRef.current) clearInterval(timerRef.current);
             setScreen('GAME_OVER');
             audioManager.playFail();
             return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [screen, gameState?.isComplete]);

  // Unified Tick for AI with Collision
  useEffect(() => {
    if (screen !== 'GAME' || !gameState || gameState.isComplete) return;

    const tickInterval = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.isComplete) return prev;
        
        const newTick = prev.tickCount + 1;
        const newEnemies: Enemy[] = [];
        const occupiedInNewState = new Set<string>();

        // We resolve enemies in order. This naturally prevents collisions as we track occupied tiles.
        prev.enemies.forEach(e => {
          const shouldMove = e.type === EnemyType.SPRINTER || newTick % 2 === 0;
          
          if (!shouldMove) {
            newEnemies.push(e);
            occupiedInNewState.add(`${e.r},${e.c}`);
            return;
          }

          const candidates = [
            { r: e.r - 1, c: e.c },
            { r: e.r + 1, c: e.c },
            { r: e.r, c: e.c - 1 },
            { r: e.r, c: e.c + 1 },
          ].filter(pos => 
            pos.r >= 0 && pos.r < prev.grid.length && 
            pos.c >= 0 && pos.c < prev.grid[0].length
          );

          if (candidates.length === 0) {
            newEnemies.push(e);
            occupiedInNewState.add(`${e.r},${e.c}`);
            return;
          }

          let targetPos = prev.lastNoisePos;
          let move = candidates[Math.floor(Math.random() * candidates.length)];

          if (targetPos) {
            const bestMove = candidates.reduce((best, curr) => {
               const currDist = Math.abs(curr.r - targetPos!.r) + Math.abs(curr.c - targetPos!.c);
               const bestDist = Math.abs(best.r - targetPos!.r) + Math.abs(best.c - targetPos!.c);
               return currDist < bestDist ? curr : best;
            }, move);
            
            const aggro = e.type === EnemyType.STALKER ? 0.95 : 0.8;
            if (Math.random() < aggro) {
               move = bestMove;
            }
          }

          // COLLISION DETECTION: Check if target tile is occupied
          if (occupiedInNewState.has(`${move.r},${move.c}`)) {
            // Stay put if blocked
            newEnemies.push(e);
            occupiedInNewState.add(`${e.r},${e.c}`);
          } else {
            // Move successful
            newEnemies.push({ ...e, r: move.r, c: move.c });
            occupiedInNewState.add(`${move.r},${move.c}`);
          }
        });

        // Resolve Abiltiies and Disruption on the new positions
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
        let gridChanged = false;

        newEnemies.forEach(e => {
          const tile = newGrid[e.r][e.c];
          
          if (!tile.fixed && tile.type !== TileType.EMPTY && tile.type !== TileType.BLOCK) {
            if (tile.type === TileType.SWITCH) return;
            
            const isAtTarget = prev.lastNoisePos && e.r === prev.lastNoisePos.r && e.c === prev.lastNoisePos.c;
            const chance = isAtTarget ? 0.9 : 0.2;

            if (Math.random() < chance) {
               if (e.type === EnemyType.GLITCHER) {
                  tile.tempFixedUntil = newTick + 10;
               } else if (e.type === EnemyType.STALKER) {
                  tile.rotation = (tile.rotation + 1) % 4;
                  gridChanged = true;
               } else {
                  tile.rotation = (tile.rotation + 1) % 4;
                  gridChanged = true;
               }
            }
          }
        });

        newGrid.forEach(row => row.forEach(tile => {
          if (tile.tempFixedUntil && tile.tempFixedUntil <= newTick) {
            delete tile.tempFixedUntil;
          }
        }));
        
        if (gridChanged) {
          audioManager.playEnemyEffect();
        }

        return { ...prev, enemies: newEnemies, grid: newGrid, tickCount: newTick };
      });
    }, 750);

    return () => clearInterval(tickInterval);
  }, [screen, gameState?.isComplete]); 

  const handleRotate = useCallback((pos: GridPos) => {
    if (!gameState || gameState.isComplete || screen !== 'GAME') return;

    const { grid } = gameState;
    const clickedTile = grid[pos.r][pos.c];
    if (clickedTile.fixed || clickedTile.tempFixedUntil) return;

    vibrate(10);
    audioManager.playRotate();

    const newGrid = grid.map(row => row.map(t => ({ ...t })));
    const targetGroup = clickedTile.group;

    newGrid.forEach((row, r) => {
      row.forEach((tile, c) => {
        const isTarget = (r === pos.r && c === pos.c);
        const isGroupMember = targetGroup !== EntanglementGroup.NONE && tile.group === targetGroup;
        if (isTarget || isGroupMember) {
          if (!tile.fixed && !tile.tempFixedUntil) {
             tile.rotation = (tile.rotation + 1) % 4;
          }
        }
      });
    });

    setGameState(prev => ({
      ...prev!,
      grid: newGrid,
      moves: prev!.moves + 1,
      lastNoisePos: pos 
    }));

  }, [gameState, screen]);

  useEffect(() => {
    if (!gameState) return;
    const { path, isComplete } = calculateBeam(gameState.grid);
    setBeamPath(path);

    if (isComplete && !gameState.isComplete) {
       vibrate([50, 50, 100]);
       audioManager.playWin();
       setGameState(prev => ({ ...prev!, isComplete: true }));
       setTimeout(() => {
         if (currentLevelId >= unlockedLevels && currentLevelId < 30) {
           setUnlockedLevels(currentLevelId + 1);
         }
         setScreen('WIN');
       }, 1000);
    }
  }, [gameState?.grid, currentLevelId, unlockedLevels]);

  if (screen === 'MENU') {
    return (
      <div className="h-screen w-full bg-game-bg flex flex-col items-center justify-center p-6 text-center space-y-12 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-neon-purple rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-neon-blue rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="space-y-4 relative z-10">
          <h1 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink animate-pulse-fast drop-shadow-[0_0_15px_rgba(247,37,133,0.5)]">
            QUANTUM<br/>LOOP
          </h1>
          <p className="text-neon-blue font-mono text-sm tracking-[0.3em] uppercase">Observation Collapses Reality</p>
        </div>
        <button onClick={() => setScreen('LEVEL_SELECT')} className="group relative px-10 py-5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full text-xl font-bold text-white shadow-[0_0_20px_rgba(76,201,240,0.4)] hover:shadow-[0_0_40px_rgba(76,201,240,0.6)] transition-all duration-300 transform hover:scale-105 active:scale-95">
          <span className="relative flex items-center justify-center gap-3"><Play size={24} fill="white" /> INITIATE</span>
        </button>
      </div>
    );
  }

  if (screen === 'LEVEL_SELECT') {
    return (
      <div className="h-screen w-full bg-game-bg flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => setScreen('MENU')} className="p-2 rounded-full bg-game-panel border border-white/10 text-white hover:bg-neon-pink transition-colors"><RotateCcw size={20}/></button>
           <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink tracking-widest uppercase">Select Sector</h2>
           <button onClick={handleMuteToggle} className="p-2 rounded-full bg-game-panel border border-white/10 text-white hover:bg-neon-blue transition-colors">
              {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
           </button>
        </div>
        <div className="flex-1 overflow-y-auto pb-20 grid grid-cols-4 gap-3 content-start">
          {LEVELS.map((level) => {
            const isLocked = level.id > unlockedLevels;
            return (
              <button key={level.id} disabled={isLocked} onClick={() => startLevel(level.id)} className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative border-2 transition-all duration-200 ${isLocked ? 'border-game-panel bg-game-panel/50 text-white/20' : 'border-neon-blue/30 bg-game-panel hover:bg-neon-purple/20 hover:border-neon-pink text-white hover:shadow-[0_0_15px_rgba(247,37,133,0.3)]'}`}>
                <span className={`text-xl font-bold ${isLocked ? '' : 'text-neon-blue'}`}>{level.id}</span>
                {!isLocked && level.id < unlockedLevels && <div className="absolute bottom-1 right-1"><Star size={12} className="text-neon-yellow fill-neon-yellow"/></div>}
                {isLocked && <Lock size={16} className="absolute opacity-40"/>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (screen === 'GAME_OVER' || screen === 'WIN') {
     const isWin = screen === 'WIN';
     return (
      <div className="h-screen w-full bg-game-bg flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-500 relative">
        <div className={`w-32 h-32 rounded-full ${isWin ? 'bg-neon-green/20 border-neon-green' : 'bg-red-500/20 border-red-500'} flex items-center justify-center border-4 shadow-2xl`}>
          {isWin ? <Star size={64} className="text-neon-green fill-neon-green animate-bounce" /> : <AlertTriangle size={64} className="text-red-500" />}
        </div>
        <h2 className="text-5xl font-black text-white">{isWin ? 'STABILIZED' : 'DESTABILIZED'}</h2>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {isWin && currentLevelId < 30 ? (
            <button onClick={() => startLevel(currentLevelId + 1)} className="px-8 py-4 bg-gradient-to-r from-neon-green to-emerald-500 text-black rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg">NEXT SECTOR <ChevronRight /></button>
          ) : (
            <button onClick={() => startLevel(currentLevelId)} className={`px-8 py-4 ${isWin ? 'bg-neon-blue' : 'bg-red-600'} text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg`}>RETRY SECTOR <RotateCcw /></button>
          )}
          <button onClick={() => setScreen('LEVEL_SELECT')} className="text-white/50 hover:text-white py-2">Sector Map</button>
        </div>
      </div>
     );
  }

  const currentLevel = LEVELS.find(l => l.id === currentLevelId);
  const timePercent = (timeLeft / maxTime) * 100;
  const isTimeLow = timeLeft <= 10;

  return (
    <div className="h-screen w-full bg-game-bg flex flex-col overflow-hidden">
      <div className="h-16 flex items-center justify-between px-6 bg-game-panel border-b border-white/5 z-20 shadow-lg">
        <button onClick={() => setScreen('LEVEL_SELECT')} className="text-white/60 hover:text-white"><Menu size={24} /></button>
        <div className="text-center">
          <div className="text-neon-blue font-bold text-xl tracking-wider uppercase">Level {currentLevelId}</div>
        </div>
        <div className="flex gap-4">
           <button onClick={handleMuteToggle} className="text-white/60 hover:text-white">{isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}</button>
           <button onClick={() => startLevel(currentLevelId)} className="text-white/60 hover:text-white"><RotateCcw size={24} /></button>
        </div>
      </div>
      <div className="w-full h-1 bg-game-ui">
        <div className={`h-full transition-all duration-1000 ease-linear ${isTimeLow ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-neon-blue shadow-[0_0_10px_#4CC9F0]'}`} style={{ width: `${timePercent}%` }} />
      </div>
      {currentLevel?.description && <div className="w-full bg-neon-purple/20 text-center py-2 text-xs text-neon-blue font-semibold border-b border-neon-purple/30 backdrop-blur-md uppercase tracking-widest">{currentLevel.description}</div>}
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-game-bg to-[#0a001a] relative">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-purple/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-blue/10 rounded-full blur-[80px]"></div>
        {gameState && (
          <Board 
            grid={gameState.grid} 
            enemies={gameState.enemies} 
            beamPath={beamPath} 
            onRotate={handleRotate} 
            isComplete={gameState.isComplete}
            lastNoisePos={gameState.lastNoisePos}
          />
        )}
      </div>
      <div className="h-24 bg-game-panel/90 backdrop-blur-md border-t border-white/5 grid grid-cols-2 px-6">
         <div className="flex flex-col justify-center border-r border-white/5 pr-6">
           <div className="text-white/40 text-[10px] font-bold uppercase mb-1">Observation Noise</div>
           <div className="text-white text-2xl font-mono flex items-center gap-2">
              {gameState?.lastNoisePos ? <Ghost className="w-4 h-4 text-neon-pink animate-pulse" /> : <Lock className="w-4 h-4 text-white/20" />}
              {gameState?.moves}
           </div>
         </div>
         <div className="flex flex-col justify-center pl-6">
           <div className="text-white/40 text-[10px] font-bold uppercase mb-1 flex items-center gap-1"><Timer size={12} /> Temporal Link</div>
           <div className={`text-3xl font-mono font-bold ${isTimeLow ? 'text-red-500 animate-pulse' : 'text-neon-pink'}`}>{timeLeft}s</div>
         </div>
      </div>
    </div>
  );
};

export default App;