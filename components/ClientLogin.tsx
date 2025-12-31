
import React, { useState } from 'react';
import Logo from './Logo';
import { Shop } from '../types';

interface ClientLoginProps {
  onLogin: (phone: string) => void;
  onAdminAccess: () => void;
  shopInfo?: Shop | null;
}

const ClientLogin: React.FC<ClientLoginProps> = ({ onLogin, onAdminAccess, shopInfo }) => {
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 9) {
      onLogin(phone);
    } else {
      alert('Por favor, insira um número de telemóvel válido.');
    }
  };

  const displayName = shopInfo ? shopInfo.name.replace('Na Régua Barber - ', '') : 'Régua';

  return (
    <div className="max-w-md mx-auto px-6 py-20 animate-fade-in">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        <h2 className="text-3xl font-brand text-white uppercase tracking-widest">Bem-vindo à {displayName}</h2>
        <p className="text-slate-400 mt-2 italic">Insira seu telemóvel para agendar ou ver seus pontos.</p>
      </div>

      <div className="bg-slate-800/40 p-10 rounded-3xl border border-slate-700 shadow-2xl backdrop-blur-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Telemóvel / WhatsApp</label>
            <div className="relative">
              <i className="fa-solid fa-phone absolute left-5 top-1/2 -translate-y-1/2 text-slate-600"></i>
              <input 
                type="tel" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ex: 912 345 678"
                className="w-full bg-slate-950 border border-slate-700 rounded-2xl py-4 pl-12 pr-6 text-white focus:ring-2 focus:ring-amber-500 outline-none transition-all text-lg font-medium"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-5 rounded-2xl shadow-xl shadow-amber-500/10 transition-all active:scale-95 text-lg uppercase tracking-widest"
          >
            Acessar Minha Conta
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-700/50 text-center">
          <button 
            onClick={onAdminAccess}
            className="text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
          >
            <i className="fa-solid fa-user-tie"></i>
            Acesso Barbeiro
          </button>
        </div>
      </div>
      
      <div className="mt-12 flex justify-center gap-10 text-center">
        {shopInfo?.whatsapp && (
           <a href={`https://wa.me/${shopInfo.whatsapp.replace(/\s/g, '')}`} target="_blank" rel="noreferrer" className="group space-y-2 hover-lift">
              <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center group-hover:bg-green-600 group-hover:border-green-400 transition-all shadow-lg">
                <i className="fa-brands fa-whatsapp text-xl text-slate-400 group-hover:text-white transition-colors"></i>
              </div>
              <p className="text-[8px] uppercase font-black text-slate-500 group-hover:text-white transition-colors">WhatsApp</p>
           </a>
        )}
        {shopInfo?.instagram && (
           <a href={`https://instagram.com/${shopInfo.instagram}`} target="_blank" rel="noreferrer" className="group space-y-2 hover-lift">
              <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center group-hover:bg-pink-600 group-hover:border-pink-400 transition-all shadow-lg">
                <i className="fa-brands fa-instagram text-xl text-slate-400 group-hover:text-white transition-colors"></i>
              </div>
              <p className="text-[8px] uppercase font-black text-slate-500 group-hover:text-white transition-colors">Instagram</p>
           </a>
        )}
        {shopInfo?.facebook && (
           <a href={`https://facebook.com/${shopInfo.facebook}`} target="_blank" rel="noreferrer" className="group space-y-2 hover-lift">
              <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-400 transition-all shadow-lg">
                <i className="fa-brands fa-facebook text-xl text-slate-400 group-hover:text-white transition-colors"></i>
              </div>
              <p className="text-[8px] uppercase font-black text-slate-500 group-hover:text-white transition-colors">Facebook</p>
           </a>
        )}
      </div>
    </div>
  );
};

export default ClientLogin;
