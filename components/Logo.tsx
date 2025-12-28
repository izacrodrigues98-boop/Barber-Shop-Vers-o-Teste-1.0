
import React from 'react';

const Logo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dimensions = {
    sm: 'h-10 w-4',
    md: 'h-16 w-6',
    lg: 'h-24 w-10'
  };

  const containerSizes = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  };

  return (
    <div className={`flex items-center ${containerSizes[size]}`}>
      {/* Barber Pole Graphic */}
      <div className={`relative ${dimensions[size]} bg-slate-200 rounded-full overflow-hidden border-2 border-slate-700 shadow-xl flex flex-col`}>
        {/* Top Cap */}
        <div className="absolute top-0 left-0 right-0 h-[15%] bg-gradient-to-b from-slate-400 to-slate-100 z-10 border-b border-slate-400"></div>
        
        {/* Animated Stripes */}
        <div className="absolute inset-0 z-0 barber-pole-animation">
          <div className="h-[200%] w-full flex flex-col">
            {[...Array(10)].map((_, i) => (
              <React.Fragment key={i}>
                <div className="h-6 w-full bg-red-600 -skew-y-12 transform origin-left"></div>
                <div className="h-6 w-full bg-white -skew-y-12 transform origin-left"></div>
                <div className="h-6 w-full bg-blue-700 -skew-y-12 transform origin-left"></div>
                <div className="h-6 w-full bg-white -skew-y-12 transform origin-left"></div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none z-20"></div>

        {/* Bottom Cap */}
        <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-gradient-to-t from-slate-400 to-slate-100 z-10 border-t border-slate-400"></div>
      </div>

      <div className="flex flex-col">
        <span className={`font-brand tracking-wider leading-none text-white ${size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-3xl' : 'text-2xl'}`}>
          NA RÉGUA
        </span>
        <span className={`font-medium text-amber-500 tracking-[0.2em] leading-none ${size === 'lg' ? 'text-2xl' : 'text-xs'}`}>
          BARBER SHOP
        </span>
      </div>

      <style>{`
        @keyframes barber-scroll {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        .barber-pole-animation {
          animation: barber-scroll 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Logo;
