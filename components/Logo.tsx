
import React, { useState } from 'react';

const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAnimate = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    // Tempo da animação sincronizado com as durações do CSS em index.html
    setTimeout(() => setIsAnimating(false), 1200);
  };

  const dimensions = {
    sm: 'h-10 w-3.5',
    md: 'h-16 w-6',
    lg: 'h-24 w-10'
  };

  const textSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl'
  };

  return (
    <div 
      className={`flex items-center gap-4 relative cursor-pointer select-none group ${isAnimating ? 'logo-animating' : ''}`}
      onClick={handleAnimate}
    >
      {/* Partículas de Cabelo Caindo */}
      {isAnimating && [...Array(15)].map((_, i) => (
        <div 
          key={i} 
          className="hair-part"
          style={{
            left: `${30 + Math.random() * 40}%`,
            top: '10%',
            animationDelay: `${Math.random() * 0.4}s`
          }}
        />
      ))}

      {/* Ícone de Tesoura Animado (SVG interativo) */}
      <div className={`absolute -left-8 top-1/2 -translate-y-1/2 transition-all duration-300 ${isAnimating ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-10'}`}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-amber-500 drop-shadow-lg">
          <path className="blade-top" d="M18 7L6 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <path className="blade-bottom" d="M18 13L6 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="19" cy="6" r="2.5" stroke="currentColor" strokeWidth="2.5"/>
          <circle cx="19" cy="14" r="2.5" stroke="currentColor" strokeWidth="2.5"/>
        </svg>
      </div>

      {/* Poste de Barbeiro Tradicional */}
      <div className={`relative ${dimensions[size]} bg-white rounded-full overflow-hidden border-2 border-slate-700 shadow-xl flex flex-col`}>
        <div className="absolute top-0 left-0 right-0 h-[12%] bg-gradient-to-b from-slate-400 to-slate-200 z-10 border-b border-slate-400"></div>
        <div className="absolute inset-0 z-0 barber-pole-scroll">
          <div className="h-[200%] w-full flex flex-col">
            {[...Array(8)].map((_, i) => (
              <React.Fragment key={i}>
                <div className="h-4 w-full bg-red-600 -skew-y-12"></div>
                <div className="h-4 w-full bg-white -skew-y-12"></div>
                <div className="h-4 w-full bg-blue-700 -skew-y-12"></div>
                <div className="h-4 w-full bg-white -skew-y-12"></div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none z-20"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[12%] bg-gradient-to-t from-slate-400 to-slate-200 z-10 border-t border-slate-400"></div>
      </div>

      {/* Nome da Marca */}
      <div className="flex flex-col transition-transform duration-300 group-hover:scale-105">
        <span className={`font-brand tracking-wider leading-none text-white ${textSizes[size]}`}>
          NA RÉGUA
        </span>
        <span className="font-medium text-amber-500 tracking-[0.25em] leading-none text-[10px] uppercase">
          Barber Shop
        </span>
      </div>

      <style>{`
        @keyframes pole-scroll { 
          from { transform: translateY(0); } 
          to { transform: translateY(-50%); } 
        }
        .barber-pole-scroll { animation: pole-scroll 3s linear infinite; }
      `}</style>
    </div>
  );
};

export default Logo;
