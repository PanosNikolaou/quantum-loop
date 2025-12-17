import React, { useMemo } from 'react';
import { TileState, TileType, EntanglementGroup } from '../types';
import { Lock, Zap, Target, X, Infinity, Square, ShieldCheck, ShieldAlert } from 'lucide-react';

interface TileProps {
  tile: TileState;
  onClick: () => void;
  size: number;
}

const Tile: React.FC<TileProps> = ({ tile, onClick, size }) => {
  
  const rotationStyle = {
    transform: `rotate(${tile.rotation * 90}deg)`,
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  const isEntangled = tile.group !== EntanglementGroup.NONE;
  
  const groupColor = useMemo(() => {
    switch(tile.group) {
      case EntanglementGroup.ALPHA: return 'border-neon-blue shadow-[0_0_15px_rgba(76,201,240,0.4)] bg-neon-blue/10';
      case EntanglementGroup.BETA: return 'border-neon-pink shadow-[0_0_15px_rgba(247,37,133,0.4)] bg-neon-pink/10';
      case EntanglementGroup.GAMMA: return 'border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.4)] bg-neon-green/10';
      default: return 'border-white/20 bg-game-ui/50 hover:bg-game-ui/80';
    }
  }, [tile.group]);

  const innerColor = useMemo(() => {
     switch(tile.group) {
      case EntanglementGroup.ALPHA: return 'text-neon-blue';
      case EntanglementGroup.BETA: return 'text-neon-pink';
      case EntanglementGroup.GAMMA: return 'text-neon-green';
      default: return 'text-white/90';
    }
  }, [tile.group]);

  const renderIcon = () => {
    switch (tile.type) {
      case TileType.SOURCE:
        return <Zap className="w-2/3 h-2/3 text-neon-yellow fill-neon-yellow animate-pulse drop-shadow-[0_0_5px_rgba(255,214,10,0.8)]" />;
      case TileType.SINK:
        return <Target className="w-2/3 h-2/3 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />;
      case TileType.BLOCK:
        return <div className="w-full h-full bg-black/40 flex items-center justify-center"><X className="w-1/3 h-1/3 text-white/30" /></div>;
      case TileType.SWITCH:
        return <div className="w-full h-full flex items-center justify-center"><Square className="w-2/3 h-2/3 text-neon-yellow fill-neon-yellow/20" /></div>;
      case TileType.GATE:
        return (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-4/5 h-[6px] bg-white/10 rounded-full" />
             <div className="absolute w-2/3 h-2/3 border-2 border-white/20 border-dashed rounded-lg flex items-center justify-center">
                <ShieldAlert className="w-1/2 h-1/2 text-white/20" />
             </div>
          </div>
        );
      case TileType.PORTAL:
        return (
           <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
              <div className={`w-3/4 h-3/4 rounded-full border-4 ${innerColor.replace('text', 'border')} border-dashed opacity-80`} />
              <div className={`absolute w-1/2 h-1/2 rounded-full border-2 border-white opacity-40`} />
              <Infinity className={`absolute w-1/3 h-1/3 text-white`} />
           </div>
        );
      case TileType.CORNER:
        return (
          <div className="absolute inset-0 pointer-events-none">
             <div className={`absolute top-0 right-0 w-1/2 h-1/2 border-l-[6px] border-b-[6px] rounded-bl-2xl ${innerColor} border-current`} />
             {isEntangled && <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${innerColor.replace('text', 'bg')} animate-ping-slow`} />}
          </div>
        );
      case TileType.STRAIGHT:
         return (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
             <div className={`w-[6px] h-full ${innerColor.replace('text', 'bg')} rounded-full`} />
          </div>
        );
      case TileType.CROSS:
          return (
             <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className={`absolute w-[6px] h-full bg-white/20 rounded-full`} />
                <div className={`absolute h-[6px] w-full bg-white/20 rounded-full`} />
             </div>
          );
      default:
        return null;
    }
  };

  return (
    <div 
      className="relative p-1"
      style={{ width: size, height: size }}
    >
      <button
        onClick={onClick}
        disabled={tile.fixed || tile.type === TileType.BLOCK || tile.type === TileType.EMPTY || tile.type === TileType.SWITCH}
        className={`
          w-full h-full rounded-2xl border-2 
          flex items-center justify-center
          overflow-hidden
          active:scale-95 transition-all duration-150
          backdrop-blur-sm
          ${groupColor}
          ${tile.fixed ? 'opacity-90' : 'cursor-pointer shadow-lg'}
        `}
      >
        <div style={rotationStyle} className="w-full h-full flex items-center justify-center relative">
            {renderIcon()}
        </div>
        
        {tile.fixed && tile.type !== TileType.BLOCK && tile.type !== TileType.SOURCE && tile.type !== TileType.SINK && tile.type !== TileType.PORTAL && tile.type !== TileType.SWITCH && (
          <div className="absolute top-1 right-1">
             <Lock className="w-3 h-3 text-white/40" />
          </div>
        )}
      </button>
    </div>
  );
};

export default React.memo(Tile);