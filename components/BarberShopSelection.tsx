
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { storageService } from '../services/storageService';
import { Shop } from '../types';

interface BarberShopSelectionProps {
  onSelect: () => void;
}

const BarberShopSelection: React.FC<BarberShopSelectionProps> = ({ onSelect }) => {
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    setShops(storageService.getShops());
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 animate-fade-in">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        <h2 className="text-3xl font-brand text-white uppercase tracking-widest">Painel Administrativo</h2>
        <p className="text-slate-400 mt-2 italic">Selecione a unidade que deseja gerenciar agora.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {shops.map(shop => (
          <button
            key={shop.id}
            onClick={onSelect}
            className="group bg-slate-800/40 p-8 rounded-3xl border border-slate-700 hover:border-amber-500 transition-all text-left flex justify-between items-center shadow-2xl hover:shadow-amber-500/10"
          >
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-2xl font-brand text-white uppercase group-hover:text-amber-500 transition-colors">{shop.name}</h3>
                {shop.active && (
                  <span className="bg-green-500/10 text-green-500 text-[10px] px-2 py-1 rounded-full font-black uppercase tracking-tighter border border-green-500/20">
                    Ativa
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <i className="fa-solid fa-location-dot"></i>
                {shop.address}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 group-hover:bg-amber-500 group-hover:text-slate-900 transition-all">
              <i className="fa-solid fa-arrow-right"></i>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BarberShopSelection;
