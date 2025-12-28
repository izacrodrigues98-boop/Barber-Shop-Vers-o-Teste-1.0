
import React, { useState, useEffect } from 'react';
import { ViewState, Shop, Barber } from './types';
import Header from './components/Header';
import ClientBooking from './components/ClientBooking';
import ClientLogin from './components/ClientLogin';
import BarberDashboard from './components/BarberDashboard';
import Login from './components/Login';
import BarberShopSelection from './components/BarberShopSelection';
import { notificationService } from './services/notificationService';
import { storageService } from './services/storageService';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('client_login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedBarberUser, setLoggedBarberUser] = useState<string | null>(null);
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);
  const [shopInfo, setShopInfo] = useState<Shop | null>(null);

  const refreshShopInfo = () => {
    setShopInfo(storageService.getShops()[0]);
  };

  useEffect(() => {
    notificationService.requestPermission();
    refreshShopInfo();

    const auth = localStorage.getItem('na_regua_auth');
    const user = localStorage.getItem('na_regua_barber_user');
    if (auth === 'true' && user) {
      setIsLoggedIn(true);
      setLoggedBarberUser(user);
    }
    
    const savedPhone = localStorage.getItem('na_regua_client_phone');
    if (savedPhone) {
      setClientPhone(savedPhone);
      setView('client_booking');
    }

    const handleNewBooking = (e: any) => {
      const app = e.detail;
      
      // Lógica de notificação para o Barbeiro
      if (isLoggedIn && loggedBarberUser) {
        const barbersList = storageService.getBarbers();
        const me = barbersList.find(b => b.username === loggedBarberUser);
        
        // Verifica se eu sou o barbeiro escolhido OU se sou o Admin Master
        if (me && (me.isAdmin || app.barberId === me.id)) {
          const barberTarget = barbersList.find(b => b.id === app.barberId);
          const targetedMsg = me.isAdmin && app.barberId !== me.id 
            ? `Novo agendamento para ${barberTarget?.name}: ${app.customerName}`
            : `Você tem um novo pedido de agendamento de ${app.customerName}!`;

          setToast({ message: targetedMsg, type: 'info' });
          notificationService.sendNativeNotification('Na Régua Barber: Novo Pedido!', targetedMsg);
        }
      }
    };

    const handleStatusUpdate = (e: any) => {
      const app = e.detail;
      if (clientPhone === app.customerPhone) {
        let statusMsg = '';
        switch(app.status) {
          case 'confirmed': statusMsg = 'Seu agendamento foi CONFIRMADO!'; break;
          case 'cancelled': statusMsg = 'Seu agendamento foi recusado ou cancelado.'; break;
          case 'completed': statusMsg = 'Serviço concluído! 1 ponto adicionado ao seu cartão.'; break;
        }
        if (statusMsg) {
          setToast({ message: statusMsg, type: 'success' });
          notificationService.sendNativeNotification('Na Régua Barber', statusMsg);
        }
      }
    };

    window.addEventListener('na_regua_new_booking', handleNewBooking);
    window.addEventListener('na_regua_status_update', handleStatusUpdate);

    return () => {
      window.removeEventListener('na_regua_new_booking', handleNewBooking);
      window.removeEventListener('na_regua_status_update', handleStatusUpdate);
    };
  }, [isLoggedIn, clientPhone, loggedBarberUser]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLogin = (success: boolean, username: string) => {
    if (success) {
      setIsLoggedIn(true);
      setLoggedBarberUser(username);
      localStorage.setItem('na_regua_auth', 'true');
      localStorage.setItem('na_regua_barber_user', username);
      setView('admin_shop_selection');
    }
  };

  const handleClientLogin = (phone: string) => {
    setClientPhone(phone);
    localStorage.setItem('na_regua_client_phone', phone);
    setView('client_booking');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedBarberUser(null);
    localStorage.removeItem('na_regua_auth');
    localStorage.removeItem('na_regua_barber_user');
    setView('client_login');
  };

  const handleClientLogout = () => {
    setClientPhone(null);
    localStorage.removeItem('na_regua_client_phone');
    setView('client_login');
  };

  const renderContent = () => {
    switch (view) {
      case 'client_login':
        return <ClientLogin onLogin={handleClientLogin} onAdminAccess={() => setView('admin_login')} shopName={shopInfo?.name} />;
      case 'admin_login':
        return isLoggedIn ? <BarberShopSelection onSelect={() => setView('admin_dashboard')} /> : <Login onLogin={handleLogin} onCancel={() => setView('client_login')} />;
      case 'admin_shop_selection':
        return <BarberShopSelection onSelect={() => setView('admin_dashboard')} />;
      case 'admin_dashboard':
        return isLoggedIn ? <BarberDashboard currentUser={loggedBarberUser || ''} onShopUpdate={refreshShopInfo} /> : <Login onLogin={handleLogin} onCancel={() => setView('client_login')} />;
      case 'client_booking':
      default:
        return clientPhone ? <ClientBooking clientPhone={clientPhone} /> : <ClientLogin onLogin={handleClientLogin} onAdminAccess={() => setView('admin_login')} shopName={shopInfo?.name} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50 selection:bg-amber-500 selection:text-slate-900">
      <Header currentView={view} setView={setView} isLoggedIn={isLoggedIn} isClientLoggedIn={!!clientPhone} onLogout={handleLogout} onClientLogout={handleClientLogout} />
      <main className="flex-1 relative">
        {toast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] animate-fade-in w-full max-w-sm px-4">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl border-2 flex items-center gap-4 ${toast.type === 'info' ? 'bg-slate-900 border-amber-500 text-white' : toast.type === 'warning' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-green-600 border-green-400 text-white'}`}>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <i className={`fa-solid ${toast.type === 'info' ? 'fa-calendar-check text-amber-500' : 'fa-check-double text-white'}`}></i>
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm tracking-tight leading-tight">{toast.message}</p>
                {toast.type === 'info' && <p className="text-[10px] opacity-70 mt-0.5">Acesse a Agenda para responder.</p>}
              </div>
              <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 p-2"><i className="fa-solid fa-xmark"></i></button>
            </div>
          </div>
        )}
        {renderContent()}
      </main>
      <footer className="bg-slate-950/50 py-16 mt-12 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="font-brand text-3xl text-white mb-6 tracking-widest">{shopInfo?.name.toUpperCase() || 'NA RÉGUA BARBER'}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12 text-slate-400">
             <div className="space-y-2">
                <i className="fa-solid fa-location-dot text-amber-500 text-xl mb-2"></i>
                <p className="text-xs font-bold uppercase tracking-widest">Endereço</p>
                <p className="text-sm">{shopInfo?.address}</p>
             </div>
             <div className="space-y-2">
                <i className="fa-brands fa-whatsapp text-green-500 text-xl mb-2"></i>
                <p className="text-xs font-bold uppercase tracking-widest">Contato</p>
                <p className="text-sm">{shopInfo?.phone}</p>
             </div>
             <div className="space-y-2">
                <div className="flex justify-center gap-6">
                   {shopInfo?.instagram && (
                      <a href={`https://instagram.com/${shopInfo.instagram}`} target="_blank" rel="noreferrer" className="hover:text-amber-500 transition-colors">
                         <i className="fa-brands fa-instagram text-2xl"></i>
                      </a>
                   )}
                   {shopInfo?.facebook && (
                      <a href={`https://facebook.com/${shopInfo.facebook}`} target="_blank" rel="noreferrer" className="hover:text-amber-500 transition-colors">
                         <i className="fa-brands fa-facebook text-2xl"></i>
                      </a>
                   )}
                </div>
                <p className="text-xs font-bold uppercase tracking-widest mt-4">Redes Sociais</p>
             </div>
          </div>
          
          <p className="text-[10px] text-slate-600 uppercase tracking-[0.4em]">© {new Date().getFullYear()} • Elevando o nível do seu corte</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
