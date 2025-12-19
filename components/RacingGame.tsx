import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Zap, Trophy, Flame, AlertTriangle, Radiation, Bomb } from 'lucide-react';

interface RacingGameProps {
  onWin: () => void;
  onLose: () => void;
}

interface Obstacle {
  id: number;
  lane: number;
  y: number;
  type: 'CAR' | 'TRUCK' | 'DRONE' | 'BUS' | 'LASER_GATE' | 'BLOCKADE';
  color: string;
  speedMod: number;
}

const RacingGame: React.FC<RacingGameProps> = ({ onWin, onLose }) => {
  const [lane, setLane] = useState(1);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(6.5);
  const [offset, setOffset] = useState(0);
  const [shake, setShake] = useState(false);
  const gameRef = useRef<number>();
  const obstacleId = useRef(0);

  const WIN_DISTANCE = 100;
  const COLORS = ['#F72585', '#4CC9F0', '#39ff14', '#FFD60A', '#7209B7'];

  const moveObstacles = useCallback(() => {
    setObstacles(prev => {
      const next = prev.map(o => ({ ...o, y: o.y + (speed * o.speedMod) })).filter(o => o.y < 950);
      
      const playerY = 550;
      const collision = next.find(o => {
        const isSameLane = o.lane === lane;
        // Adjust hitboxes based on type
        let hitZoneYStart = -60;
        let hitZoneYEnd = 40;
        
        if (o.type === 'LASER_GATE') {
          hitZoneYStart = -20;
          hitZoneYEnd = 20;
          return o.y > playerY + hitZoneYStart && o.y < playerY + hitZoneYEnd; // Laser gates span the whole width logic?
          // Actually Laser Gates currently have a lane in the state but the visual is full width.
          // Let's make LASER_GATE hit all lanes if not handled carefully, 
          // but for simplicity in current code, if lane matches. 
          // Actually, let's fix Laser Gate to be a full line obstacle where you must wait or pass? 
          // Usually in these games laser gates have a flicker.
        } else if (o.type === 'BLOCKADE') {
          hitZoneYStart = -80;
          hitZoneYEnd = 50;
        } else if (o.type === 'TRUCK' || o.type === 'BUS') {
          hitZoneYStart = -100;
        }

        return isSameLane && o.y > playerY + hitZoneYStart && o.y < playerY + hitZoneYEnd;
      });

      if (collision) {
        setShake(true);
        // CRITICAL: Crashing calls onLose which in App.tsx sets screen to GAME_OVER WITHOUT granting bombs.
        setTimeout(() => onLose(), 150);
        return prev;
      }
      return next;
    });

    setOffset(prev => (prev + speed) % 1000);
    setProgress(p => p + 0.16);
    if (progress >= WIN_DISTANCE) {
      onWin();
    }
  }, [lane, speed, progress, onWin, onLose]);

  useEffect(() => {
    const loop = () => {
      moveObstacles();
      gameRef.current = requestAnimationFrame(loop);
    };
    gameRef.current = requestAnimationFrame(loop);

    const spawn = setInterval(() => {
      // Logic for "obstacles in lines" - occasionally spawn a "wall" with one gap
      const isWall = Math.random() < 0.3; // 30% chance for a line pattern
      
      if (isWall) {
        const gapLane = Math.floor(Math.random() * 3);
        const wallType = Math.random() < 0.5 ? 'CAR' : 'BLOCKADE';
        const newObs: Obstacle[] = [];
        for(let i=0; i<3; i++) {
          if (i !== gapLane) {
            newObs.push({
              id: obstacleId.current++,
              lane: i,
              y: -250,
              type: wallType,
              color: COLORS[Math.floor(Math.random() * COLORS.length)],
              speedMod: 1.0
            });
          }
        }
        setObstacles(prev => [...prev, ...newObs]);
      } else {
        const types: Obstacle['type'][] = ['CAR', 'TRUCK', 'DRONE', 'BUS', 'LASER_GATE'];
        const type = types[Math.floor(Math.random() * types.length)];
        setObstacles(prev => [
          ...prev,
          { 
            id: obstacleId.current++, 
            lane: Math.floor(Math.random() * 3), 
            y: -200,
            type,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            speedMod: type === 'DRONE' ? 1.7 : type === 'LASER_GATE' ? 0.9 : type === 'TRUCK' ? 0.8 : 1.1
          }
        ]);
      }
      setSpeed(s => Math.min(s + 0.05, 17));
    }, 600);

    return () => {
      cancelAnimationFrame(gameRef.current!);
      clearInterval(spawn);
    };
  }, [moveObstacles]);

  const VehicleIcon = ({ obs }: { obs: Obstacle }) => {
    switch (obs.type) {
      case 'LASER_GATE':
        return (
          <div className="w-full h-12 flex flex-col items-center justify-center relative">
            <div className="absolute inset-0 bg-red-600 animate-pulse opacity-40 blur-sm" />
            <div className="w-full h-2 bg-red-500 shadow-[0_0_15px_red]" />
            <div className="text-[10px] font-black text-white bg-red-600 px-2 py-0.5 rounded-full mt-1 animate-bounce">LASER</div>
          </div>
        );
      case 'BLOCKADE':
        return (
          <div className="w-full h-full bg-slate-800 border-4 border-neon-yellow flex flex-col items-center justify-center gap-2 p-2 rounded-lg">
             <AlertTriangle className="text-neon-yellow" size={24} />
             <div className="w-full h-1 bg-neon-yellow/30 rounded-full overflow-hidden">
               <div className="w-1/2 h-full bg-neon-yellow animate-ping" />
             </div>
          </div>
        );
      case 'TRUCK':
        return (
          <div className="w-full h-full rounded-md border-2 border-white/20 flex flex-col gap-1 p-1 shadow-lg" style={{ backgroundColor: obs.color }}>
            <div className="w-full h-1/4 bg-black/40 rounded-sm" />
            <div className="w-full h-1/2 bg-white/10 rounded-sm" />
          </div>
        );
      case 'BUS':
        return (
          <div className="w-full h-full rounded-lg border-2 border-white/30 flex flex-col items-center p-1" style={{ backgroundColor: obs.color }}>
            {[...Array(5)].map((_, i) => <div key={i} className="w-full h-1.5 bg-white/20 my-0.5 rounded-sm" />)}
          </div>
        );
      case 'DRONE':
        return (
          <div className="w-full h-full flex items-center justify-center animate-pulse">
            <div className="w-10 h-10 rounded-full border-4 border-white shadow-[0_0_20px_white]" style={{ backgroundColor: obs.color }} />
            <div className="absolute w-20 h-1 bg-white/40 rotate-45" />
            <div className="absolute w-20 h-1 bg-white/40 -rotate-45" />
          </div>
        );
      default:
        return (
          <div className="w-full h-full rounded-2xl border-2 border-white shadow-md relative" style={{ backgroundColor: obs.color }}>
            <div className="absolute top-2 left-2 right-2 h-1/2 bg-black/30 rounded-lg" />
            <div className="absolute bottom-2 left-2 w-3 h-1.5 bg-yellow-400 rounded-full" />
            <div className="absolute bottom-2 right-2 w-3 h-1.5 bg-yellow-400 rounded-full" />
          </div>
        );
    }
  };

  return (
    <div className={`h-full w-full bg-game-bg flex flex-col items-center justify-center relative overflow-hidden font-black transition-transform duration-75 ${shake ? 'translate-x-4' : ''}`}>
      {/* Background Parallax Neon City */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#10002B] via-[#240046] to-black" />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute w-32 bg-game-panel/20 border-t-2 border-neon-blue/10" 
            style={{ 
              height: `${Math.random() * 400 + 200}px`, 
              left: `${(i * 12) % 100}%`, 
              bottom: `${(offset * (0.1 + (i % 4) * 0.08)) % 150 - 50}%`,
              transition: 'bottom 0.1s linear'
            }} 
          >
            <div className="grid grid-cols-2 gap-2 p-2 opacity-10">
              {[...Array(10)].map((_, j) => <div key={j} className="w-full aspect-square bg-white" />)}
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-10 flex flex-col items-center gap-1 z-20">
        <div className="text-neon-blue text-5xl italic tracking-tighter drop-shadow-[0_0_15px_#4CC9F0] animate-pulse">NEON OVERDRIVE</div>
        <div className="flex items-center gap-2 bg-neon-pink/20 border border-neon-pink/40 px-4 py-1 rounded-full text-neon-pink text-[10px] tracking-widest uppercase font-bold mt-2">
           <Bomb size={12} /> REWARD: +3 QUANTUM BOMBS
        </div>
      </div>
      
      <div className="w-full max-w-sm h-[650px] bg-black/50 backdrop-blur-md relative border-x-4 border-neon-blue/20 overflow-hidden shadow-2xl">
        {/* Road markings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/3 w-2 h-full border-r-4 border-dashed border-white/10" style={{ backgroundPositionY: offset }} />
          <div className="absolute left-2/3 w-2 h-full border-r-4 border-dashed border-white/10" style={{ backgroundPositionY: offset }} />
        </div>

        {/* Static Hazard Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(76,201,240,0.1)_0%,_transparent_70%)]" />

        {/* Obstacles */}
        {obstacles.map(o => (
          <div 
            key={o.id}
            className={`absolute transition-transform duration-100 ${o.type === 'BLOCKADE' ? 'w-[30%] h-32' : o.type === 'LASER_GATE' ? 'w-[30%] h-12' : o.type === 'TRUCK' || o.type === 'BUS' ? 'w-[28%] h-40' : o.type === 'DRONE' ? 'w-[25%] h-20' : 'w-[25%] h-28'}`}
            style={{ 
              left: `${o.lane * 33.33 + 4}%`, 
              top: o.y,
              zIndex: o.type === 'DRONE' ? 30 : 10
            }}
          >
            <VehicleIcon obs={o} />
          </div>
        ))}

        {/* Player Car */}
        <div 
          className="absolute w-24 h-32 transition-all duration-150 ease-out z-40"
          style={{ left: `${lane * 33.33 + 4}%`, top: 520 }}
        >
          <div className="w-full h-full bg-neon-green rounded-2xl border-4 border-white shadow-[0_0_35px_#39ff14] flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="w-16 h-10 bg-slate-900 rounded-lg mt-2 relative overflow-hidden">
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-neon-green/60 animate-pulse" />
            </div>
            <Zap className="text-white fill-white animate-bounce mt-2" size={36} />
            <div className="absolute -bottom-4 flex gap-4 w-full justify-center">
              <Flame className="text-orange-500 animate-pulse" fill="currentColor" size={28} />
              <Flame className="text-orange-500 animate-pulse delay-75" fill="currentColor" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex gap-8 w-full max-w-sm px-6 z-50">
        <button 
          onPointerDown={() => setLane(l => Math.max(0, l - 1))} 
          className="flex-1 py-8 bg-game-panel/80 border-2 border-neon-blue/40 text-white rounded-3xl flex items-center justify-center active:bg-neon-blue/50 active:scale-95 transition-all shadow-xl backdrop-blur-sm"
        >
          <ChevronLeft size={64} />
        </button>
        <button 
          onPointerDown={() => setLane(l => Math.min(2, l + 1))} 
          className="flex-1 py-8 bg-game-panel/80 border-2 border-neon-blue/40 text-white rounded-3xl flex items-center justify-center active:bg-neon-blue/50 active:scale-95 transition-all shadow-xl backdrop-blur-sm"
        >
          <ChevronRight size={64} />
        </button>
      </div>

      <div className="absolute top-6 right-6 text-neon-green font-mono flex items-center gap-3 bg-black/60 p-4 rounded-2xl border-2 border-neon-green/30 backdrop-blur-md shadow-[0_0_20px_rgba(57,255,20,0.2)]">
        <Trophy size={24} className="text-neon-yellow" />
        <span className="text-2xl font-black">{Math.floor(progress)}%</span>
      </div>

      <div className="absolute bottom-6 left-6 text-neon-blue font-mono flex items-center gap-2 bg-black/60 p-3 rounded-xl border border-neon-blue/20">
        <Radiation size={16} className="animate-spin-slow" />
        <span className="text-xs font-bold">STABILITY: {(speed * 10).toFixed(0)} GHz</span>
      </div>
    </div>
  );
};

export default RacingGame;