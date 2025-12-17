import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Menu, Star, ChevronRight, Lock, Timer, AlertTriangle, Volume2, VolumeX } from 'lucide-react';
import { LEVELS } from './constants';
import { GameState, EntanglementGroup, GridPos, Enemy, TileType } from './types';
import { calculateBeam } from './utils/gameLogic';
import Board from './components/Board';
import { audioManager } from './utils/audio';

// Types
type Screen = 'MENU' | 'GAME' | 'LEVEL_SELECT' | 'WIN' | 'GAME_OVER';

const vibrate = (ms: number | number[]) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch (e) {
    // Ignore vibration errors
  }
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('MENU');
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [beamPath, setBeamPath] = useState<any[]>([]);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Initialize Game
  const startLevel = useCallback((levelId: number) => {
    // Ensure audio context is running
    audioManager.init();
    audioManager.resume();

    const levelData = LEVELS.find(l => l.id === levelId);
    if (!levelData) return;

    // Deep copy tiles to avoid mutating constants
    const initialGrid = levelData.tiles.map(row => 
      row.map(tile => ({ ...tile }))
    );

    // Calculate Time Limit: Gets shorter as levels go up
    const calculatedTime = Math.max(15, 90 - (levelId * 2));
    setMaxTime(calculatedTime);
    setTimeLeft(calculatedTime);

    // Spawn Enemies
    const initialEnemies: Enemy[] = [];
    if (levelId >= 5) {
      // More enemies in higher levels
      const numEnemies = Math.min(4, Math.floor(levelId / 4)); 
      for (let i = 0; i < numEnemies; i++) {
        const r = Math.floor(Math.random() * levelData.size);
        const c = Math.floor(Math.random() * levelData.size);
        initialEnemies.push({
           id: `enemy-${i}`,
           r,
           c
        });
      }
    }

    setGameState({
      levelIndex: levelId,
      grid: initialGrid,
      enemies: initialEnemies,
      moves: 0,
      isComplete: false,
      history: []
    });
    setScreen('GAME');
    setCurrentLevelId(levelId);
  }, []);

  const handleMuteToggle = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  };

  const handleInitGame = () => {
    audioManager.init();
    setScreen('LEVEL_SELECT');
  };

  // Timer Logic
  useEffect(() => {
    if (screen === 'GAME' && !gameState?.isComplete && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
             if (timerRef.current) clearInterval(timerRef.current);
             setScreen('GAME_OVER');
             vibrate([200, 100, 200]);
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

  // Enemy AI Loop
  useEffect(() => {
    if (screen !== 'GAME' || !gameState || gameState.isComplete) return;

    const enemyInterval = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.isComplete) return prev;
        
        // Calculate current beam path to attract enemies
        const { path: currentBeam } = calculateBeam(prev.grid);

        // Move enemies
        const newEnemies = prev.enemies.map(e => {
          const candidates = [
            { r: e.r - 1, c: e.c },
            { r: e.r + 1, c: e.c },
            { r: e.r, c: e.c - 1 },
            { r: e.r, c: e.c + 1 },
          ].filter(pos => 
            pos.r >= 0 && pos.r < prev.grid.length && 
            pos.c >= 0 && pos.c < prev.grid[0].length
          );

          if (candidates.length === 0) return e;

          // Smart Movement: Attracted to light beam
          let move = candidates[Math.floor(Math.random() * candidates.length)];
          
          if (currentBeam.length > 0) {
             const targetSegment = currentBeam.find(seg => 
               Math.abs(seg.r - e.r) + Math.abs(seg.c - e.c) < 3
             );
             
             if (targetSegment) {
                const bestMove = candidates.reduce((best, curr) => {
                   const currDist = Math.abs(curr.r - targetSegment.r) + Math.abs(curr.c - targetSegment.c);
                   const bestDist = Math.abs(best.r - targetSegment.r) + Math.abs(best.c - targetSegment.c);
                   return currDist < bestDist ? curr : best;
                }, move);
                
                if (Math.random() < 0.7) {
                   move = bestMove;
                }
             }
          }

          return { ...e, r: move.r, c: move.c };
        });

        // Check for interactions (Destruction)
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
        let gridChanged = false;

        newEnemies.forEach(e => {
          const tile = newGrid[e.r][e.c];
          // 50% chance to rotate if it lands on a non-fixed tile
          if (!tile.fixed && tile.type !== TileType.EMPTY && tile.type !== TileType.BLOCK) {
            if (Math.random() > 0.5) {
               tile.rotation = (tile.rotation + 1) % 4;
               gridChanged = true;
            }
          }
        });
        
        if (gridChanged) {
          vibrate(30);
          audioManager.playEnemyEffect();
        }

        return {
          ...prev,
          enemies: newEnemies,
          grid: gridChanged ? newGrid : prev.grid
        };
      });
    }, 2000); // Move every 2 seconds

    return () => clearInterval(enemyInterval);
  }, [screen, gameState?.isComplete]); 

  // Handle Rotation (The Core Mechanic)
  const handleRotate = useCallback((pos: GridPos) => {
    if (!gameState || gameState.isComplete || screen !== 'GAME') return;

    const { grid } = gameState;
    const clickedTile = grid[pos.r][pos.c];

    if (clickedTile.fixed) return;

    // Vibration feedback
    vibrate(10);
    audioManager.playRotate();

    const newGrid = grid.map(row => row.map(t => ({ ...t })));
    const targetGroup = clickedTile.group;

    // Rotate Logic
    // If tile belongs to a group, rotate ALL tiles in that group
    newGrid.forEach((row, r) => {
      row.forEach((tile, c) => {
        const isTarget = (r === pos.r && c === pos.c);
        const isGroupMember = targetGroup !== EntanglementGroup.NONE && tile.group === targetGroup;
        
        if (isTarget || isGroupMember) {
          if (!tile.fixed) {
             tile.rotation = (tile.rotation + 1) % 4;
          }
        }
      });
    });

    setGameState(prev => ({
      ...prev!,
      grid: newGrid,
      moves: prev!.moves + 1,
    }));

  }, [gameState, screen]);

  // Beam Tracing Effect
  useEffect(() => {
    if (!gameState) return;

    const { path, isComplete } = calculateBeam(gameState.grid);
    setBeamPath(path);

    if (isComplete && !gameState.isComplete) {
       // Level Completed!
       vibrate([50, 50, 100]);
       audioManager.playWin();
       
       setGameState(prev => ({ ...prev!, isComplete: true }));
       
       // Delay for animation then show win
       setTimeout(() => {
         if (currentLevelId >= unlockedLevels && currentLevelId < 30) {
           setUnlockedLevels(currentLevelId + 1);
         }
         setScreen('WIN');
       }, 1000);
    }
  }, [gameState?.grid, currentLevelId, unlockedLevels]);


  // Render Functions
  if (screen === 'MENU') {
    return (
      <div className="h-screen w-full bg-game-bg flex flex-col items-center justify-center p-6 text-center space-y-12 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-neon-purple rounded-full blur-[120px] opacity-20 animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-neon-blue rounded-full blur-[120px] opacity-20 animate-pulse"></div>

        <div className="space-y-4 relative z-10">
          <h1 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink animate-pulse-fast drop-shadow-[0_0_15px_rgba(247,37,133,0.5)]">
            QUANTUM<br/>LOOP
          </h1>
          <p className="text-neon-blue font-mono text-sm tracking-[0.3em] uppercase">Entangled Puzzle System</p>
        </div>
        
        <button 
          onClick={handleInitGame}
          className="group relative px-10 py-5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full text-xl font-bold text-white shadow-[0_0_20px_rgba(76,201,240,0.4)] hover:shadow-[0_0_40px_rgba(76,201,240,0.6)] transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <span className="relative flex items-center justify-center gap-3"><Play size={24} fill="white" /> INITIATE</span>
        </button>
      </div>
    );
  }

  if (screen === 'LEVEL_SELECT') {
    return (
      <div className="h-screen w-full bg-game-bg flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => setScreen('MENU')} className="p-2 rounded-full bg-game-panel border border-white/10 text-white hover:bg-neon-pink hover:border-neon-pink transition-colors"><RotateCcw size={20}/></button>
           <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink tracking-widest">SECTOR SELECT</h2>
           <button onClick={handleMuteToggle} className="p-2 rounded-full bg-game-panel border border-white/10 text-white hover:bg-neon-blue transition-colors">
              {isMuted ? <VolumeX size={20}/> : <Volume2 size={20}/>}
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pb-20 grid grid-cols-4 gap-3 content-start">
          {LEVELS.map((level) => {
            const isLocked = level.id > unlockedLevels;
            return (
              <button
                key={level.id}
                disabled={isLocked}
                onClick={() => startLevel(level.id)}
                className={`
                  aspect-square rounded-2xl flex flex-col items-center justify-center relative
                  border-2 transition-all duration-200
                  ${isLocked 
                    ? 'border-game-panel bg-game-panel/50 text-white/20' 
                    : 'border-neon-blue/30 bg-game-panel hover:bg-neon-purple/20 hover:border-neon-pink text-white hover:shadow-[0_0_15px_rgba(247,37,133,0.3)]'}
                `}
              >
                <span className={`text-xl font-bold ${isLocked ? '' : 'text-neon-blue'}`}>{level.id}</span>
                {!isLocked && level.id < unlockedLevels && (
                   <div className="absolute bottom-1 right-1"><Star size={12} className="text-neon-yellow fill-neon-yellow"/></div>
                )}
                {isLocked && <Lock size={16} className="absolute opacity-40"/>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (screen === 'GAME_OVER') {
    return (
      <div className="h-screen w-full bg-game-bg flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in zoom-in duration-300 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/10 animate-pulse"></div>
        
        <div className="relative z-10 w-32 h-32 rounded-full bg-red-500/20 flex items-center justify-center border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]">
          <AlertTriangle size={64} className="text-red-500" />
        </div>
        
        <div className="relative z-10">
           <h2 className="text-5xl font-black text-red-500 drop-shadow-lg mb-2">CRITICAL<br/>FAILURE</h2>
           <p className="text-red-300 font-mono">Time Destabilized</p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs relative z-10">
          <button 
            onClick={() => startLevel(currentLevelId)}
            className="px-8 py-4 bg-red-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg"
          >
            <RotateCcw /> RETRY SECTOR
          </button>
          
          <button 
             onClick={() => setScreen('LEVEL_SELECT')}
             className="text-white/60 hover:text-white py-2"
          >
            Abort Mission
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'WIN') {
    return (
      <div className="h-screen w-full bg-game-bg flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-500">
        <div className="w-32 h-32 rounded-full bg-neon-green/20 flex items-center justify-center border-4 border-neon-green shadow-[0_0_50px_rgba(57,255,20,0.5)]">
          <Star size={64} className="text-neon-green fill-neon-green animate-bounce" />
        </div>
        
        <div>
          <h2 className="text-4xl font-black text-white mb-2">SYNCHRONIZED</h2>
          <div className="h-1 w-24 bg-neon-green mx-auto rounded-full"></div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 text-left bg-game-panel p-6 rounded-2xl border border-white/10">
          <div>
            <p className="text-white/40 text-xs font-bold uppercase">Moves</p>
            <p className="text-white font-mono text-2xl">{gameState?.moves}</p>
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase">Time Left</p>
            <p className="text-neon-green font-mono text-2xl">{timeLeft}s</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          {currentLevelId < 30 ? (
            <button 
              onClick={() => startLevel(currentLevelId + 1)}
              className="px-8 py-4 bg-gradient-to-r from-neon-green to-emerald-500 text-black rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(57,255,20,0.4)]"
            >
              NEXT SECTOR <ChevronRight />
            </button>
          ) : (
             <div className="text-neon-blue text-lg font-bold animate-pulse">ALL SYSTEMS OPERATIONAL</div>
          )}
          
          <button 
             onClick={() => setScreen('LEVEL_SELECT')}
             className="text-white/50 hover:text-white py-2"
          >
            Return to Map
          </button>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  const currentLevel = LEVELS.find(l => l.id === currentLevelId);
  const timePercent = (timeLeft / maxTime) * 100;
  const isTimeLow = timeLeft <= 10;

  return (
    <div className="h-screen w-full bg-game-bg flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 bg-game-panel border-b border-white/5 z-20 shadow-lg">
        <button onClick={() => setScreen('LEVEL_SELECT')} className="text-white/60 hover:text-white">
          <Menu size={24} />
        </button>
        <div className="text-center">
          <div className="text-neon-blue font-bold text-xl tracking-wider drop-shadow-md">LEVEL {currentLevelId}</div>
        </div>
        <div className="flex gap-4">
           <button onClick={handleMuteToggle} className="text-white/60 hover:text-white">
              {isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
           </button>
           <button onClick={() => startLevel(currentLevelId)} className="text-white/60 hover:text-white">
            <RotateCcw size={24} />
          </button>
        </div>
      </div>

      {/* Progress Bar (Timer) */}
      <div className="w-full h-1 bg-game-ui">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${isTimeLow ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-neon-blue shadow-[0_0_10px_#4CC9F0]'}`}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {/* Description Toast */}
      {currentLevel?.description && (
        <div className="w-full bg-neon-purple/20 text-center py-2 text-xs text-neon-blue font-semibold border-b border-neon-purple/30 backdrop-blur-md">
          {currentLevel.description}
        </div>
      )}

      {/* Game Board */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-b from-game-bg to-[#0a001a] relative">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-purple/10 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-neon-blue/10 rounded-full blur-[80px]"></div>

        {gameState && (
          <Board 
            grid={gameState.grid} 
            enemies={gameState.enemies}
            beamPath={beamPath} 
            onRotate={handleRotate} 
            isComplete={gameState.isComplete}
          />
        )}
      </div>

      {/* Footer Controls / Status */}
      <div className="h-24 bg-game-panel/90 backdrop-blur-md border-t border-white/5 grid grid-cols-2 px-6">
         <div className="flex flex-col justify-center border-r border-white/5 pr-6">
           <div className="text-white/40 text-xs font-bold uppercase mb-1">Stability</div>
           <div className="text-white text-2xl font-mono">{gameState?.moves} <span className="text-sm text-white/30">/ {currentLevel?.par}</span></div>
         </div>
         <div className="flex flex-col justify-center pl-6">
           <div className="text-white/40 text-xs font-bold uppercase mb-1 flex items-center gap-1">
             <Timer size={12} /> Time Remaining
           </div>
           <div className={`text-3xl font-mono font-bold ${isTimeLow ? 'text-red-500 animate-pulse' : 'text-neon-pink'}`}>
             {timeLeft}s
           </div>
         </div>
      </div>
    </div>
  );
};

export default App;