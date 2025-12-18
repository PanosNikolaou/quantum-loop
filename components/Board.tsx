import React, { useRef, useEffect, useState } from 'react';
import { TileState, BeamSegment, GridPos, Enemy, EnemyType } from '../types';
import Tile from './Tile';

interface BoardProps {
  grid: TileState[][];
  enemies?: Enemy[];
  beamPath: BeamSegment[];
  onRotate: (pos: GridPos) => void;
  isComplete: boolean;
  lastNoisePos: GridPos | null;
}

const Board: React.FC<BoardProps> = ({ grid, enemies = [], beamPath, onRotate, isComplete, lastNoisePos }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = Math.min(window.innerWidth - 32, 500); 
        setBoardSize(w);
      }
    };
    
    window.addEventListener('resize', updateSize);
    updateSize();
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const gridSize = grid.length;
  const tileSize = boardSize / gridSize;

  const getCoord = (r: number, c: number) => {
    return {
      x: c * tileSize + tileSize / 2,
      y: r * tileSize + tileSize / 2
    };
  };

  const renderBeam = () => {
    if (beamPath.length < 2) return null;
    let d = "";
    beamPath.forEach((seg, index) => {
      const { x, y } = getCoord(seg.r, seg.c);
      if (index === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    });

    const color = isComplete ? '#39ff14' : '#4CC9F0';

    return (
      <svg className="absolute inset-0 pointer-events-none z-10 overflow-visible" width={boardSize} height={boardSize}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <path d={d} stroke={color} strokeWidth={6} fill="none" opacity="0.4" filter="url(#glow)" />
        <path d={d} stroke="white" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {beamPath.length > 0 && (
           <circle cx={getCoord(beamPath[beamPath.length-1].r, beamPath[beamPath.length-1].c).x} 
                   cy={getCoord(beamPath[beamPath.length-1].r, beamPath[beamPath.length-1].c).y} 
                   r={4} fill="white" className="animate-pulse" />
        )}
      </svg>
    );
  };

  const DinosaurFaceIcon = ({ type, color }: { type: EnemyType, color: string }) => {
    const renderFeatures = () => {
      switch (type) {
        case EnemyType.SPRINTER:
          return <path d="M20,30 L10,20 M20,40 L5,35" stroke={color} strokeWidth="3" />; // Feathers/Speed lines
        case EnemyType.STALKER:
          return <path d="M40,10 L50,0 L60,10" fill={color} />; // Horn
        case EnemyType.GLITCHER:
          return <circle cx="45" cy="45" r="5" fill="#39ff14" className="animate-ping" />; // Glowing eye
        case EnemyType.FLITTER:
          return <path d="M10,40 Q0,20 20,20 T40,40" fill={color} opacity="0.6" />; // Wings
        default: return null;
      }
    };

    return (
      <svg viewBox="0 0 100 100" fill={color} className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
        {renderFeatures()}
        <path d="M20,40 Q20,10 60,10 T90,50 L90,80 Q90,90 70,90 L40,90 Q20,90 20,70 Z" />
        <circle cx="65" cy="35" r="8" fill="white" />
        <circle cx="68" cy="32" r="3" fill="black" />
        <path d="M40,75 L80,75" stroke="black" strokeWidth="3" strokeLinecap="round" />
        <path d="M50,75 L55,82 L60,75 L65,82 L70,75" fill="white" />
      </svg>
    );
  };

  const getDinoMeta = (type: EnemyType) => {
    switch (type) {
      case EnemyType.SPRINTER: return { color: '#FFD60A', label: 'RAPTOR' };
      case EnemyType.STALKER: return { color: '#F72585', label: 'T-REX' };
      case EnemyType.GLITCHER: return { color: '#39ff14', label: 'SPITTER' };
      case EnemyType.FLITTER: return { color: '#7209B7', label: 'PTERO' };
      default: return { color: '#ef4444', label: 'STALKER' };
    }
  };

  const renderEnemies = () => {
    return enemies.map((enemy) => {
      const { x, y } = getCoord(enemy.r, enemy.c);
      const meta = getDinoMeta(enemy.type);
      return (
        <div
          key={enemy.id}
          className="absolute z-20 pointer-events-none transition-all duration-700 ease-in-out"
          style={{
            width: tileSize * 0.9,
            height: tileSize * 0.9,
            left: x - tileSize * 0.45,
            top: y - tileSize * 0.45,
          }}
        >
          <div className="w-full h-full animate-bounce">
            <DinosaurFaceIcon type={enemy.type} color={meta.color} />
            <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 text-[7px] font-black text-white bg-black/60 px-1.5 py-0.5 rounded-full border border-white/20 whitespace-nowrap uppercase tracking-tighter">
              {meta.label}
            </div>
          </div>
        </div>
      );
    });
  };

  const renderNoiseRipple = () => {
    if (!lastNoisePos) return null;
    const { x, y } = getCoord(lastNoisePos.r, lastNoisePos.c);
    return (
      <div 
        key={`ripple-${lastNoisePos.r}-${lastNoisePos.c}-${Date.now()}`}
        className="absolute pointer-events-none z-30 w-12 h-12 rounded-full border-2 border-neon-pink/40 animate-ping"
        style={{ left: x - 24, top: y - 24 }}
      />
    );
  };

  return (
    <div 
      ref={containerRef}
      className="relative mx-auto"
      style={{ width: boardSize, height: boardSize }}
    >
      <div 
        className="grid absolute inset-0 z-0"
        style={{ 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`
        }}
      >
        {grid.map((row, r) => (
          row.map((tile, c) => (
            <Tile 
              key={`${tile.id}-${r}-${c}`}
              tile={tile} 
              size={tileSize} 
              onClick={() => onRotate({ r, c })} 
            />
          ))
        ))}
      </div>

      {renderNoiseRipple()}
      {renderEnemies()}
      {renderBeam()}
    </div>
  );
};

export default Board;