
import React from 'react';
import Logo from './Logo';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isLoggedIn: boolean;
  isClientLoggedIn: boolean;
  onLogout: () => void;
  onClientLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView, isLoggedIn, isClientLoggedIn, onLogout, onClientLogout }) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="cursor-pointer" onClick={() => setView(isClientLoggedIn ? 'client_booking' : 'client_login')}>
          <Logo size="sm" />
        </div>
        
        <nav className="flex gap-4 items-center">
          {(!isLoggedIn && !isClientLoggedIn) && (
            <button 
              onClick={() => setView('admin_login')}
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
            >
              <i className="fa-solid fa-user-tie"></i>
              <span>Barbeiro</span>
            </button>
          )}

          {isClientLoggedIn && currentView !== 'admin_dashboard' && !isLoggedIn && (
            <button 
              onClick={onClientLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-700 flex items-center gap-2"
            >
              <i className="fa-solid fa-right-from-bracket"></i>
              Trocar Conta
            </button>
          )}
          
          {(currentView === 'admin_dashboard' || (currentView === 'admin_login' && isLoggedIn)) && (
            <div className="flex items-center gap-4">
               <button 
                onClick={() => setView(isClientLoggedIn ? 'client_booking' : 'client_login')}
                className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
              >
                Ver Site
              </button>
              <button 
                onClick={onLogout}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 border border-red-500/30"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                Sair
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
