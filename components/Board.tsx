import React, { useRef, useEffect, useState } from 'react';
import { TileState, BeamSegment, GridPos, Enemy } from '../types';
import Tile from './Tile';

interface BoardProps {
  grid: TileState[][];
  enemies?: Enemy[];
  beamPath: BeamSegment[];
  onRotate: (pos: GridPos) => void;
  isComplete: boolean;
}

const Board: React.FC<BoardProps> = ({ grid, enemies = [], beamPath, onRotate, isComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(0);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        // Limit max width to keep it square and fitting on screen
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

  // Render Beam SVG
  // Convert grid coordinates to SVG coordinates (center of tiles)
  const getCoord = (r: number, c: number) => {
    return {
      x: c * tileSize + tileSize / 2,
      y: r * tileSize + tileSize / 2
    };
  };

  const renderBeam = () => {
    if (beamPath.length < 2) return null;
    
    // Create path string
    // M startX startY L nextX nextY ...
    let d = "";
    
    beamPath.forEach((seg, index) => {
      const { x, y } = getCoord(seg.r, seg.c);
      if (index === 0) d += `M ${x} ${y}`;
      else d += ` L ${x} ${y}`;
    });

    const color = isComplete ? '#00ff41' : '#00f3ff';

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
        
        {/* Glow Layer */}
        <path 
          d={d} 
          stroke={color} 
          strokeWidth={6} 
          fill="none" 
          opacity="0.4"
          filter="url(#glow)"
        />
        
        {/* Core Beam */}
        <path 
          d={d} 
          stroke="white" 
          strokeWidth={2} 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Beam Head Pulse */}
        {beamPath.length > 0 && (
           <circle cx={getCoord(beamPath[beamPath.length-1].r, beamPath[beamPath.length-1].c).x} 
                   cy={getCoord(beamPath[beamPath.length-1].r, beamPath[beamPath.length-1].c).y} 
                   r={4} fill="white" className="animate-pulse" />
        )}
      </svg>
    );
  };

  const renderEnemies = () => {
    return enemies.map((enemy) => {
      return (
        <div
          key={enemy.id}
          className="absolute z-20 pointer-events-none transition-all duration-500 ease-in-out"
          style={{
            width: tileSize * 0.6,
            height: tileSize * 0.6,
            left: enemy.c * tileSize + tileSize * 0.2,
            top: enemy.r * tileSize + tileSize * 0.2,
          }}
        >
          <div className="w-full h-full bg-red-500 rounded-full animate-bounce shadow-[0_0_15px_rgba(239,68,68,0.8)] relative">
            <div className="absolute inset-0 bg-orange-500 rounded-full opacity-50 blur-sm animate-pulse"></div>
            {/* Glitch Eyes */}
            <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full"></div>
            <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-white rounded-full"></div>
          </div>
        </div>
      );
    });
  };

  return (
    <div 
      ref={containerRef}
      className="relative mx-auto"
      style={{ width: boardSize, height: boardSize }}
    >
      {/* Grid */}
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

      {/* Enemies Layer */}
      {renderEnemies()}

      {/* Light Overlay */}
      {renderBeam()}
    </div>
  );
};

export default Board;