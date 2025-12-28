
import React, { useState } from 'react';
import { storageService } from '../services/storageService';

interface LoginProps {
  onLogin: (success: boolean, username: string) => void;
  onCancel: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const barbers = storageService.getBarbers();
    const user = barbers.find(b => b.username === username && b.password === password);

    if (user) {
      onLogin(true, username);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-600">
            <i className="fa-solid fa-lock text-amber-500 text-2xl"></i>
          </div>
          <h2 className="text-2xl font-brand mb-1">Área do Profissional</h2>
          <p className="text-sm text-slate-400">Insira suas credenciais para acessar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Usuário</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-white"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all text-white"
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-xl text-xs font-bold text-center animate-shake">
              Usuário ou senha incorretos.
            </div>
          )}

          <div className="pt-2 flex flex-col gap-3">
            <button 
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-amber-500/10 uppercase tracking-widest"
            >
              Entrar no Painel
            </button>
            <button 
              type="button"
              onClick={onCancel}
              className="w-full text-slate-400 hover:text-white text-[10px] font-bold py-2 uppercase tracking-widest"
            >
              Voltar ao Início
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
