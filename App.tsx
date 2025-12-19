import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Menu, Star, ChevronRight, Lock, Timer, AlertTriangle, Volume2, VolumeX, Ghost, Bomb, Crosshair, Target, Gift, BookOpen } from 'lucide-react';
import { LEVELS } from './constants';
import { GameState, EntanglementGroup, GridPos, Enemy, TileType, EnemyType } from './types';
import { calculateBeam } from './utils/gameLogic';
import Board from './components/Board';
import RacingGame from './components/RacingGame';
import Instructions from './components/Instructions';
import { audioManager } from './utils/audio';

type Screen = 'MENU' | 'GAME' | 'LEVEL_SELECT' | 'WIN' | 'GAME_OVER' | 'RACING' | 'INSTRUCTIONS';

const vibrate = (ms: number | number[]) => {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms); } catch (e) { }
};

const App: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('MENU');
  const [currentLevelId, setCurrentLevelId] = useState(1);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [beamPath, setBeamPath] = useState<any[]>([]);
  const [unlockedLevels, setUnlockedLevels] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [bombs, setBombs] = useState(3);
  
  // Catapult State
  const [bombMode, setBombMode] = useState(false);
  const [aimAngle, setAimAngle] = useState(0); 
  const [aimPower, setAimPower] = useState(50); 
  const [activeProjectile, setActiveProjectile] = useState<{target: GridPos, id: string, type: 'BOMB' | 'GIFT'} | null>(null);
  const [santaActive, setSantaActive] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startLevel = useCallback((levelId: number) => {
    audioManager.init();
    audioManager.resume();
    const levelData = LEVELS.find(l => l.id === levelId);
    if (!levelData) return;

    const calculatedTime = Math.max(15, 90 - (levelId * 2));
    setMaxTime(calculatedTime);
    setTimeLeft(calculatedTime);

    const initialEnemies: Enemy[] = [];
    if (levelId >= 5) {
      const numEnemies = Math.min(6, Math.floor(levelId / 3)); 
      const types = [EnemyType.STALKER, EnemyType.SPRINTER, EnemyType.GLITCHER, EnemyType.FLITTER];
      const occupied = new Set<string>();
      for (let i = 0; i < numEnemies; i++) {
        let r, c;
        let tries = 0;
        do { r = Math.floor(Math.random() * levelData.size); c = Math.floor(Math.random() * levelData.size); tries++; } while (occupied.has(`${r},${c}`) && tries < 20);
        occupied.add(`${r},${c}`);
        initialEnemies.push({ id: `enemy-${i}-${Date.now()}`, r, c, type: types[i % types.length], moveTick: 0 });
      }
    }

    setGameState({
      levelIndex: levelId,
      grid: levelData.tiles.map(row => row.map(tile => ({ ...tile }))),
      enemies: initialEnemies,
      moves: 0,
      isComplete: false,
      history: [],
      lastNoisePos: null,
      tickCount: 0,
      bombs: bombs
    });
    setScreen('GAME');
    setBombMode(false);
    setCurrentLevelId(levelId);
  }, [bombs]);

  // Quantum Santa Random Event
  useEffect(() => {
    if (screen !== 'GAME' || !gameState || gameState.isComplete || santaActive) return;

    const santaInterval = setInterval(() => {
      if (gameState.enemies.length > 0 && Math.random() < 0.05) {
        triggerSanta();
      }
    }, 15000);

    return () => clearInterval(santaInterval);
  }, [screen, gameState?.enemies.length, santaActive]);

  const triggerSanta = () => {
    setSantaActive(true);
    vibrate(50);
    audioManager.playSanta();
    setTimeout(() => {
      if (!gameState || gameState.enemies.length === 0) {
        setSantaActive(false);
        return;
      }
      const randomEnemy = gameState.enemies[Math.floor(Math.random() * gameState.enemies.length)];
      setActiveProjectile({ target: { r: randomEnemy.r, c: randomEnemy.c }, id: 'santa-gift', type: 'GIFT' });
      audioManager.playPortal();
      
      setTimeout(() => {
        setGameState(prev => {
          if (!prev) return null;
          return { ...prev, enemies: prev.enemies.filter(e => e.id !== randomEnemy.id) };
        });
        setActiveProjectile(null);
        setSantaActive(false);
      }, 700);
    }, 2500); 
  };

  useEffect(() => {
    if (screen === 'GAME' && !gameState?.isComplete && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); setScreen('GAME_OVER'); audioManager.playFail(); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen, gameState?.isComplete]);

  // Dinosaur AI
  useEffect(() => {
    if (screen !== 'GAME' || !gameState || gameState.isComplete) return;
    const tickInterval = setInterval(() => {
      setGameState(prev => {
        if (!prev || prev.isComplete) return prev;
        const newTick = prev.tickCount + 1;
        const newEnemies: Enemy[] = [];
        const occupied = new Set<string>();
        prev.enemies.forEach(e => {
          if (!(e.type === EnemyType.SPRINTER || newTick % 2 === 0)) { newEnemies.push(e); occupied.add(`${e.r},${e.c}`); return; }
          const candidates = [{r:e.r-1,c:e.c},{r:e.r+1,c:e.c},{r:e.r,c:e.c-1},{r:e.r,c:e.c+1}].filter(p => p.r>=0 && p.r<prev.grid.length && p.c>=0 && p.c<prev.grid[0].length);
          let move = candidates[Math.floor(Math.random() * candidates.length)];
          if (prev.lastNoisePos) move = candidates.reduce((best, curr) => (Math.abs(curr.r-prev.lastNoisePos!.r)+Math.abs(curr.c-prev.lastNoisePos!.c)) < (Math.abs(best.r-prev.lastNoisePos!.r)+Math.abs(best.c-prev.lastNoisePos!.c)) ? curr : best, move);
          if (occupied.has(`${move.r},${move.c}`)) { newEnemies.push(e); occupied.add(`${e.r},${e.c}`); } 
          else { newEnemies.push({ ...e, r: move.r, c: move.c }); occupied.add(`${move.r},${move.c}`); }
        });
        const newGrid = prev.grid.map(row => row.map(t => ({ ...t })));
        let changed = false;
        newEnemies.forEach(e => {
          const tile = newGrid[e.r][e.c];
          if (!tile.fixed && tile.type !== TileType.EMPTY && tile.type !== TileType.BLOCK && tile.type !== TileType.SINK) {
            if (Math.random() < ((prev.lastNoisePos && e.r === prev.lastNoisePos.r && e.c === prev.lastNoisePos.c) ? 0.6 : 0.05)) { tile.rotation = (tile.rotation + 1) % 4; changed = true; }
          }
        });
        if (changed) audioManager.playEnemyEffect();
        return { ...prev, enemies: newEnemies, grid: newGrid, tickCount: newTick };
      });
    }, 1200);
    return () => clearInterval(tickInterval);
  }, [screen, gameState?.isComplete]); 

  const launchBomb = () => {
    if (bombs <= 0 || !gameState) return;
    
    const gridRows = gameState.grid.length;
    const gridCols = gameState.grid[0].length;
    const maxDist = gridRows * 0.95;
    const dist = (aimPower / 100) * maxDist;
    const angleRad = (aimAngle - 90) * (Math.PI / 180);
    
    const targetR = Math.round(gridRows - 1 + Math.sin(angleRad) * dist);
    const targetC = Math.round((gridCols / 2) + Math.cos(angleRad) * dist);
    
    const clampedR = Math.max(0, Math.min(gridRows - 1, targetR));
    const clampedC = Math.max(0, Math.min(gridCols - 1, targetC));
    const targetPos = { r: clampedR, c: clampedC };
    
    setBombMode(false);
    setActiveProjectile({ target: targetPos, id: Math.random().toString(), type: 'BOMB' });
    audioManager.playPortal();
    vibrate([100, 50, 100]);

    setTimeout(() => {
      setBombs(prev => prev - 1);
      setGameState(prev => {
        if (!prev) return null;
        const enemyIndex = prev.enemies.findIndex(e => e.r === targetPos.r && e.c === targetPos.c);
        if (enemyIndex !== -1) return { ...prev, enemies: prev.enemies.filter((_, i) => i !== enemyIndex) };
        return prev;
      });
      setActiveProjectile(null);
    }, 700);
  };

  const handleTileClick = useCallback((pos: GridPos) => {
    if (!gameState || gameState.isComplete || bombMode) return;
    const { grid } = gameState;
    const tile = grid[pos.r][pos.c];
    if (tile.fixed || tile.tempFixedUntil || tile.type === TileType.EMPTY || tile.type === TileType.BLOCK) return;
    vibrate(10); audioManager.playRotate();
    const newGrid = grid.map(row => row.map(t => ({ ...t })));
    newGrid.forEach((row, r) => row.forEach((t, c) => {
      if ((r === pos.r && c === pos.c) || (tile.group !== EntanglementGroup.NONE && t.group === tile.group)) {
        if (!t.fixed && !t.tempFixedUntil) t.rotation = (t.rotation + 1) % 4;
      }
    }));
    setGameState(prev => ({ ...prev!, grid: newGrid, moves: prev!.moves + 1, lastNoisePos: pos }));
  }, [gameState, bombMode]);

  useEffect(() => {
    if (!gameState) return;
    const { path, isComplete } = calculateBeam(gameState.grid);
    setBeamPath(path);
    if (isComplete && !gameState.isComplete) {
       audioManager.playWin();
       setGameState(prev => ({ ...prev!, isComplete: true }));
       setTimeout(() => {
         if (currentLevelId % 5 === 0) setScreen('RACING');
         else { if (currentLevelId >= unlockedLevels && currentLevelId < 30) setUnlockedLevels(currentLevelId + 1); setScreen('WIN'); }
       }, 800);
    }
  }, [gameState?.grid, currentLevelId, unlockedLevels]);

  if (screen === 'MENU') {
    return (
      <div className="h-screen w-full bg-game-bg flex flex-col items-center justify-center p-6 text-center space-y-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neon-purple/20 via-transparent to-transparent opacity-50" />
        <h1 className="text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-neon-blue via-neon-pink to-neon-purple animate-pulse-fast drop-shadow-2xl z-10">QUANTUM<br/>LOOP</h1>
        
        <div className="flex flex-col gap-4 w-full max-w-xs z-10">
          <button onClick={() => setScreen('LEVEL_SELECT')} className="px-12 py-6 bg-gradient-to-r from-neon-blue to-neon-purple rounded-3xl text-2xl font-black text-white shadow-[0_0_30px_rgba(76,201,240,0.4)] hover:scale-105 active:scale-95 transition-all">
            INITIATE
          </button>
          <button onClick={() => setScreen('INSTRUCTIONS')} className="px-8 py-4 bg-game-ui/40 border border-white/10 rounded-2xl text-lg font-bold text-white flex items-center justify-center gap-2 hover:bg-game-ui/60 transition-all">
            <BookOpen size={24} className="text-neon-pink" /> HOW TO PLAY
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'INSTRUCTIONS') return <Instructions onBack={() => setScreen('MENU')} />;

  if (screen === 'RACING') return <RacingGame onWin={() => { setBombs(b => b + 3); if (currentLevelId >= unlockedLevels && currentLevelId < 30) setUnlockedLevels(currentLevelId + 1); setScreen('WIN'); }} onLose={() => setScreen('GAME_OVER')} />;

  if (screen === 'LEVEL_SELECT') {
    return (
      <div className="h-screen w-full bg-game-bg flex flex-col p-6">
        <div className="flex justify-between items-center mb-8">
           <button onClick={() => setScreen('MENU')} className="p-3 bg-game-panel border border-white/10 text-white rounded-2xl"><RotateCcw size={24}/></button>
           <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase">Sectors</h2>
           <button onClick={() => setIsMuted(audioManager.toggleMute())} className="p-3 bg-game-panel border border-white/10 text-white rounded-2xl">{isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}</button>
        </div>
        <div className="flex-1 overflow-y-auto grid grid-cols-4 gap-4 pb-8">
          {LEVELS.map(l => (
            <button key={l.id} disabled={l.id > unlockedLevels} onClick={() => startLevel(l.id)} className={`aspect-square rounded-3xl border-2 flex flex-col items-center justify-center transition-all ${l.id > unlockedLevels ? 'border-game-panel text-white/5' : 'border-neon-blue/30 bg-game-panel/50 text-white shadow-xl hover:border-neon-pink'}`}>
              <span className="text-2xl font-black">{l.id}</span>
              {l.id > unlockedLevels && <Lock size={18} className="opacity-40" />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'GAME_OVER' || screen === 'WIN') {
     const isWin = screen === 'WIN';
     return (
      <div className="h-screen w-full bg-game-bg flex flex-col items-center justify-center p-8 space-y-8 text-center relative overflow-hidden">
        <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center ${isWin ? 'border-neon-green bg-neon-green/10' : 'border-red-500 bg-red-500/10'}`}>
          {isWin ? <Star size={64} className="text-neon-green fill-neon-green" /> : <AlertTriangle size={64} className="text-red-500" />}
        </div>
        <h2 className="text-5xl font-black text-white italic uppercase tracking-tighter">{isWin ? 'Stabilized' : 'Destabilized'}</h2>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {isWin && currentLevelId < 30 ? <button onClick={() => startLevel(currentLevelId + 1)} className="px-8 py-4 bg-neon-green text-black rounded-2xl font-black text-lg">NEXT SECTOR</button> : <button onClick={() => startLevel(currentLevelId)} className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-lg">RETRY SECTOR</button>}
          <button onClick={() => setScreen('LEVEL_SELECT')} className="text-white/40 font-bold uppercase tracking-widest">Sector Map</button>
        </div>
      </div>
     );
  }

  return (
    <div className="h-screen w-full bg-game-bg flex flex-col overflow-hidden relative">
      {santaActive && (
        <div className="absolute top-8 left-0 w-full pointer-events-none z-50 overflow-hidden h-40">
          <style>{`
            @keyframes fly { 
              0% { transform: translateX(-300px); } 
              100% { transform: translateX(calc(100vw + 300px)); } 
            }
          `}</style>
          <div className="absolute flex flex-col items-center gap-1" style={{ animation: 'fly 3.5s linear forwards' }}>
             <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-32 h-20 bg-gradient-to-br from-red-600 to-red-900 rounded-[40px_10px_40px_10px] border-4 border-white flex flex-col items-center justify-center shadow-[0_0_40px_rgba(255,0,0,0.6)]">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-4 border-black">
                      <div className="w-2 h-2 bg-black rounded-full mx-1" />
                      <div className="w-2 h-2 bg-black rounded-full mx-1" />
                    </div>
                    <span className="text-xs font-black italic text-white mt-1 uppercase tracking-tighter">QUANTUM CLAWS</span>
                  </div>
                  <div className="absolute -top-4 -left-4 w-10 h-10 bg-white rounded-full border-2 border-red-500 animate-pulse" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-neon-pink font-black italic text-xl animate-bounce bg-black/60 px-4 py-2 rounded-2xl border border-neon-pink/50 shadow-lg">HO! HO! HO!</div>
                  <div className="text-white font-bold text-[10px] bg-red-600 px-2 rounded-full text-center">DROPPING BOMBS</div>
                </div>
             </div>
             <div className="w-4 h-16 bg-gradient-to-b from-white to-transparent opacity-40 animate-pulse mt-2" />
          </div>
        </div>
      )}

      <div className="h-20 flex items-center justify-between px-6 bg-game-panel/80 backdrop-blur-md z-40">
        <button onClick={() => setScreen('LEVEL_SELECT')} className="text-white/60"><Menu size={28} /></button>
        <div className="text-center">
            <div className="text-neon-blue font-black text-2xl italic uppercase tracking-tighter">Level {currentLevelId}</div>
            <div className="text-white/30 text-[10px] uppercase font-bold tracking-widest">Quantum Grid</div>
        </div>
        <button onClick={() => startLevel(currentLevelId)} className="text-white/60"><RotateCcw size={28} /></button>
      </div>

      <div className="w-full h-1.5 bg-game-ui"><div className={`h-full transition-all duration-1000 ${timeLeft <= 10 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-neon-blue shadow-[0_0_10px_#4CC9F0]'}`} style={{ width: `${(timeLeft/maxTime)*100}%` }} /></div>

      <div className="flex-1 flex items-center justify-center p-4 relative bg-[#0a001a]">
        {gameState && <Board grid={gameState.grid} enemies={gameState.enemies} beamPath={beamPath} onRotate={handleTileClick} isComplete={gameState.isComplete} lastNoisePos={gameState.lastNoisePos} activeProjectile={activeProjectile} />}
        {bombMode && <div className="absolute inset-0 pointer-events-none flex items-center justify-center"><Crosshair size={320} className="text-neon-pink opacity-10 animate-pulse" /></div>}
      </div>

      {/* Manual Catapult HUD */}
      <div className="h-48 bg-game-panel/95 border-t-4 border-neon-blue/20 px-6 pt-4 pb-8 flex flex-col gap-4 shadow-2xl z-40">
        {!bombMode ? (
          <div className="grid grid-cols-3 h-full items-center">
             <div className="flex flex-col items-center">
               <div className="text-white/40 text-[9px] font-black uppercase mb-1">Noise Level</div>
               <div className="text-white text-3xl font-mono font-black flex items-center gap-2 drop-shadow-neon">
                  <Ghost size={24} className="text-neon-pink" /> {gameState?.moves}
               </div>
             </div>
             <div className="flex flex-col items-center">
                <button onClick={() => bombs > 0 && setBombMode(true)} disabled={bombs <= 0 || gameState?.isComplete} className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all bg-game-ui border-4 border-neon-pink shadow-lg relative ${bombs <= 0 ? 'opacity-30 grayscale' : 'hover:scale-105 active:scale-90'}`}>
                  <Bomb size={42} className="text-neon-pink" />
                  <div className="absolute -top-1 -right-1 bg-neon-pink text-white text-xs font-black w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md">{bombs}</div>
                </button>
                <span className="text-[10px] font-black text-neon-blue mt-2 uppercase tracking-widest">Weaponized Bomb</span>
             </div>
             <div className="flex flex-col items-center">
               <div className="text-white/40 text-[9px] font-black uppercase mb-1">Stability</div>
               <div className={`text-3xl font-mono font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-neon-green'}`}>{timeLeft}s</div>
             </div>
          </div>
        ) : (
          <div className="flex flex-col h-full gap-4">
            <div className="flex justify-between items-center text-white/60">
                <span className="text-xs font-black uppercase text-neon-pink flex items-center gap-2"><Crosshair size={14} /> Adjusting Quantum Arc...</span>
                <button onClick={() => setBombMode(false)} className="text-[10px] font-bold uppercase underline">Abort</button>
            </div>
            <div className="flex gap-6 items-center flex-1">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex justify-between text-[10px] font-black uppercase text-neon-blue"><span>Angle: {aimAngle}°</span></div>
                <input type="range" min="-45" max="45" value={aimAngle} onChange={(e) => setAimAngle(Number(e.target.value))} className="w-full h-3 bg-game-ui rounded-full appearance-none cursor-pointer accent-neon-pink" />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex justify-between text-[10px] font-black uppercase text-neon-blue"><span>Power: {aimPower}%</span></div>
                <input type="range" min="10" max="100" value={aimPower} onChange={(e) => setAimPower(Number(e.target.value))} className="w-full h-3 bg-game-ui rounded-full appearance-none cursor-pointer accent-neon-pink" />
              </div>
              <button onClick={launchBomb} className="w-24 h-20 bg-neon-pink rounded-3xl flex items-center justify-center shadow-[0_0_30px_#F72585] active:scale-90 transition-all border-4 border-white/20">
                <span className="text-lg font-black text-white italic -rotate-12">FIRE!</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;