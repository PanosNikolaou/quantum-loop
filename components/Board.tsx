import React, { useRef, useEffect, useState } from 'react';
import { TileState, BeamSegment, GridPos, Enemy, EnemyType } from '../types';
import Tile from './Tile';
import { Bomb, Gift } from 'lucide-react';

interface BoardProps {
  grid: TileState[][];
  enemies?: Enemy[];
  beamPath: BeamSegment[];
  onRotate: (pos: GridPos) => void;
  isComplete: boolean;
  lastNoisePos: GridPos | null;
  activeProjectile?: { target: GridPos; id: string; type: 'BOMB' | 'GIFT' } | null;
}

const Board: React.FC<BoardProps> = ({ grid, enemies = [], beamPath, onRotate, isComplete, lastNoisePos, activeProjectile }) => {
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

  const renderProjectile = () => {
    if (!activeProjectile) return null;
    const target = getCoord(activeProjectile.target.r, activeProjectile.target.c);
    const startX = activeProjectile.type === 'GIFT' ? target.x : boardSize / 2;
    const startY = activeProjectile.type === 'GIFT' ? -100 : boardSize + 100;
    
    return (
      <div key={activeProjectile.id} className="absolute inset-0 pointer-events-none z-50">
        <style>{`
          @keyframes arc {
            0% { transform: translate(${startX}px, ${startY}px) scale(1); opacity: 1; }
            50% { transform: translate(${(startX + target.x)/2}px, ${(startY + target.y)/2 - 50}px) scale(1.8); opacity: 1; }
            95% { opacity: 1; }
            100% { transform: translate(${target.x}px, ${target.y}px) scale(0.5); opacity: 0; }
          }
          .energy-burst {
            position: absolute;
            width: ${tileSize * 3}px;
            height: ${tileSize * 3}px;
            background: radial-gradient(circle, ${activeProjectile.type === 'GIFT' ? '#39ff14' : '#F72585'} 0%, transparent 80%);
            border-radius: 50%;
            left: ${target.x - tileSize * 1.5}px;
            top: ${target.y - tileSize * 1.5}px;
            animation: burst 0.6s cubic-bezier(0.1, 0.7, 0.3, 1) forwards;
            z-index: 60;
          }
          @keyframes burst {
            0% { transform: scale(0); opacity: 1; filter: blur(5px); }
            50% { transform: scale(1.2); opacity: 0.8; filter: blur(2px); }
            100% { transform: scale(2.2); opacity: 0; filter: blur(10px); }
          }
        `}</style>
        <div className={`absolute w-12 h-12 flex items-center justify-center rounded-full shadow-2xl ${activeProjectile.type === 'GIFT' ? 'bg-red-500 shadow-red-500/50' : 'bg-neon-pink shadow-neon-pink/40'}`} style={{ animation: 'arc 0.7s cubic-bezier(0.1, 0.7, 0.3, 1) forwards' }}>
          {activeProjectile.type === 'GIFT' ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <Gift size={24} className="text-white z-10" />
              <Bomb size={16} className="absolute bottom-0 right-0 text-black/50" />
            </div>
          ) : <Bomb size={24} className="text-white" />}
        </div>
        <div className="energy-burst" style={{ animationDelay: '0.7s' }} />
      </div>
    );
  };

  const DinosaurFaceIcon = ({ type, color }: { type: EnemyType, color: string }) => {
    return (
      <svg viewBox="0 0 100 100" fill={color} className="w-full h-full drop-shadow-xl">
        <path d="M20,40 Q20,10 60,10 T90,50 L90,80 Q90,90 70,90 L40,90 Q20,90 20,70 Z" />
        <circle cx="65" cy="35" r="8" fill="white" />
        <circle cx="68" cy="32" r="3" fill="black" />
        <path d="M40,75 L80,75" stroke="black" strokeWidth="3" strokeLinecap="round" />
        <path d="M50,75 L55,82 L60,75 L65,82 L70,75" fill="white" />
      </svg>
    );
  };

  return (
    <div ref={containerRef} className="relative mx-auto" style={{ width: boardSize, height: boardSize }}>
      <div className="grid absolute inset-0 z-0" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }}>
        {grid.map((row, r) => row.map((tile, c) => (
          <Tile key={`${tile.id}-${r}-${c}`} tile={tile} size={tileSize} onClick={() => onRotate({ r, c })} />
        )))}
      </div>
      {enemies.map((enemy) => {
        const { x, y } = getCoord(enemy.r, enemy.c);
        const color = enemy.type === EnemyType.SPRINTER ? '#FFD60A' : enemy.type === EnemyType.STALKER ? '#F72585' : enemy.type === EnemyType.GLITCHER ? '#39ff14' : '#7209B7';
        return (
          <div key={enemy.id} className="absolute z-20 transition-all duration-700 ease-in-out" style={{ width: tileSize * 0.9, height: tileSize * 0.9, left: x - tileSize * 0.45, top: y - tileSize * 0.45 }}>
            <div className="w-full h-full animate-bounce">
              <DinosaurFaceIcon type={enemy.type} color={color} />
            </div>
          </div>
        );
      })}
      {renderProjectile()}
      <svg className="absolute inset-0 pointer-events-none z-10 overflow-visible" width={boardSize} height={boardSize}>
        <path d={beamPath.length < 2 ? "" : beamPath.reduce((d, s, i) => d + (i===0?'M':'L') + `${getCoord(s.r,s.c).x} ${getCoord(s.r,s.c).y}`, "")} stroke={isComplete ? '#39ff14' : '#4CC9F0'} strokeWidth={6} fill="none" opacity="0.3" filter="url(#glow)" />
        <path d={beamPath.length < 2 ? "" : beamPath.reduce((d, s, i) => d + (i===0?'M':'L') + `${getCoord(s.r,s.c).x} ${getCoord(s.r,s.c).y}`, "")} stroke="white" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export default Board;