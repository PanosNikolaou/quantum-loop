import React from 'react';
import { Zap, Target, Lock, Square, Ghost, ShieldAlert, Infinity, Bomb, Gift, RotateCcw, Ghost as DinoIcon, MousePointer2 } from 'lucide-react';

const SymbolCard = ({ icon: Icon, color, name, desc }: { icon: any, color: string, name: string, desc: string }) => (
  <div className={`p-4 rounded-2xl bg-game-panel/60 border-2 ${color} flex flex-col items-center text-center gap-2 shadow-lg glass-panel`}>
    <div className={`p-3 rounded-xl bg-black/40 ${color.replace('border', 'text')}`}>
       <Icon size={32} />
    </div>
    <div className="text-xs font-black uppercase tracking-widest">{name}</div>
    <div className="text-[10px] text-white/60 leading-relaxed font-bold">{desc}</div>
  </div>
);

const Instructions: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  return (
    <div className="h-screen w-full bg-game-bg flex flex-col overflow-hidden relative">
      <div className="h-20 flex items-center justify-between px-6 bg-game-panel/80 backdrop-blur-md z-40 border-b border-white/5">
        <button onClick={onBack} className="text-white/60 p-2 flex items-center gap-2">
           <RotateCcw size={24} /> 
           <span className="text-xs font-black uppercase">Exit Manual</span>
        </button>
        <div className="text-center">
            <div className="text-neon-pink font-black text-2xl italic uppercase tracking-tighter">Protocol Manual</div>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar pb-12">
        
        {/* Basic Goal */}
        <div className="space-y-4">
           <div className="text-neon-blue font-black uppercase tracking-[0.3em] text-sm border-b border-neon-blue/20 pb-2">Primary Objective</div>
           <div className="p-6 rounded-3xl bg-neon-blue/5 border-2 border-neon-blue/20 flex gap-4 items-center">
              <div className="flex -space-x-2">
                 <div className="p-2 bg-neon-yellow rounded-full shadow-[0_0_15px_#FFD60A]"><Zap size={24} className="text-black" /></div>
                 <div className="p-2 bg-white rounded-full shadow-[0_0_15px_white]"><Target size={24} className="text-black" /></div>
              </div>
              <p className="text-sm font-bold text-white/80">Connect the <span className="text-neon-yellow">Source</span> to the <span className="text-white">Sink</span> before the sector destabilizes. Tap tiles to rotate them and direct the beam.</p>
           </div>
        </div>

        {/* Symbols Grid */}
        <div className="space-y-4">
           <div className="text-neon-pink font-black uppercase tracking-[0.3em] text-sm border-b border-neon-pink/20 pb-2">Quantum Components</div>
           <div className="grid grid-cols-2 gap-4">
              <SymbolCard 
                icon={Lock} 
                color="border-white/20" 
                name="Fixed Tile" 
                desc="Indicated by a padlock. These structures cannot be rotated by the user." 
              />
              <SymbolCard 
                icon={Square} 
                color="border-neon-yellow" 
                name="Phase Switch" 
                desc="Direct the beam through this to toggle logic gates across the grid." 
              />
              <SymbolCard 
                icon={ShieldAlert} 
                color="border-white/40" 
                name="Logic Gate" 
                desc="Passage is blocked until a Phase Switch in the system is activated." 
              />
              <SymbolCard 
                icon={Infinity} 
                color="border-neon-blue" 
                name="Portal" 
                desc="Teleports the beam to the twin portal of the same color frequency." 
              />
              <SymbolCard 
                icon={Ghost} 
                color="border-white" 
                name="Superposition" 
                desc="Dual-Phase: Flips between STRAIGHT and CORNER shapes depending on its rotation value." 
              />
              <SymbolCard 
                icon={MousePointer2} 
                color="border-neon-green" 
                name="Entangled" 
                desc="Groups (Alpha/Beta) rotate in unison. Move one, you move them all." 
              />
           </div>
        </div>

        {/* Threats & Combat */}
        <div className="space-y-4">
           <div className="text-neon-yellow font-black uppercase tracking-[0.3em] text-sm border-b border-neon-yellow/20 pb-2">Sector Defense</div>
           <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-red-500/10 border-2 border-red-500/30 flex gap-4 items-start">
                 <div className="p-3 bg-red-600 rounded-2xl animate-pulse"><DinoIcon size={28} /></div>
                 <div>
                    <div className="font-black text-red-500 uppercase text-xs mb-1">Dino-Glitchers</div>
                    <p className="text-[10px] font-bold text-white/60 leading-normal">Enemies move when you make noise (rotations). If they land on a tile, they might rotate it, ruining your path!</p>
                 </div>
              </div>

              <div className="p-5 rounded-3xl bg-neon-pink/10 border-2 border-neon-pink/30 flex gap-4 items-start">
                 <div className="p-3 bg-neon-pink rounded-2xl"><Bomb size={28} /></div>
                 <div>
                    <div className="font-black text-neon-pink uppercase text-xs mb-1">Quantum Catapult</div>
                    <p className="text-[10px] font-bold text-white/60 leading-normal">Enter WEAPON MODE to aim. Adjust angle and power to blast dinosaurs. Bombs are limited!</p>
                 </div>
              </div>

              <div className="p-5 rounded-3xl bg-red-600/10 border-2 border-white/20 flex gap-4 items-start">
                 <div className="p-3 bg-red-600 rounded-2xl animate-bounce"><Gift size={28} /></div>
                 <div>
                    <div className="font-black text-white uppercase text-xs mb-1">Quantum Santa</div>
                    <p className="text-[10px] font-bold text-white/60 leading-normal">A giant glitch. Santa drops high-yield gift-bombs on random enemies. Listen for his funny Ho-Ho-Ho!</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Stability Phase */}
        <div className="space-y-4">
           <div className="text-neon-green font-black uppercase tracking-[0.3em] text-sm border-b border-neon-green/20 pb-2">Stability Phase</div>
           <div className="p-6 rounded-3xl bg-neon-green/5 border-2 border-neon-green/20">
              <p className="text-sm font-bold text-white/80 italic leading-relaxed">
                Every 5 sectors, you enter a <span className="text-neon-green">Neon Overdrive</span> race. Reach 100% progress without crashing into lane-walls to earn +3 bonus bombs.
              </p>
           </div>
        </div>

      </div>

      {/* Decorative background blur */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-game-bg to-transparent z-10 pointer-events-none" />
    </div>
  );
};

export default Instructions;