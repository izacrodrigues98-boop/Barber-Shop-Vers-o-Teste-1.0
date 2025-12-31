
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Service, BarberConfig, Barber, Shop, LoyaltyProfile, Message } from '../types';
import { storageService } from '../services/storageService';
import { BARBER_CREDENTIALS } from '../constants';

interface BarberDashboardProps {
  currentUser: string;
  onShopUpdate?: () => void;
}

const BarberDashboard: React.FC<BarberDashboardProps> = ({ currentUser, onShopUpdate }) => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const myProfile = useMemo(() => barbers.find(b => b.username === currentUser), [barbers, currentUser]);
  const isAdmin = myProfile?.isAdmin || currentUser === BARBER_CREDENTIALS.username;
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [profiles, setProfiles] = useState<LoyaltyProfile[]>([]);
  const [config, setConfig] = useState<BarberConfig>(storageService.getConfig());
  
  // Fix: Initializing missing state variables for filters and searches
  const [statusFilter, setStatusFilter] = useState<'pending' | 'confirmed' | 'all'>('pending');
  const [agendaBarberFilter, setAgendaBarberFilter] = useState('all');
  const [selectedBarberFilter, setSelectedBarberFilter] = useState('all');
  const [clientSearch, setClientSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const [activeTab, setActiveTabState] = useState<'agenda' | 'historico' | 'clientes' | 'faturamento' | 'equipe' | 'perfil' | 'cortes' | 'lojas' | 'redes'>(
    (sessionStorage.getItem('barber_active_tab') as any) || 'agenda'
  );

  const setActiveTab = (tab: typeof activeTab) => {
    sessionStorage.setItem('barber_active_tab', tab);
    setActiveTabState(tab);
  };

  const [localToast, setLocalToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const notifyAndReload = (msg: string, type: 'success' | 'error' = 'success') => {
    setLocalToast({ msg, type });
    setTimeout(() => { 
      setLocalToast(null);
      loadData();
    }, 2000);
  };

  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const [isAddingAppointment, setIsAddingAppointment] = useState(false);
  const [newApp, setNewApp] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    barberId: '',
    date: '',
    time: '',
    observations: ''
  });

  const [isFinishingAppId, setIsFinishingAppId] = useState<string | null>(null);
  const [productSaleValue, setProductSaleValue] = useState<string>('0');
  const currentFinishingApp = useMemo(() => appointments.find(a => a.id === isFinishingAppId), [appointments, isFinishingAppId]);

  const [transferAppId, setTransferAppId] = useState<string | null>(null);
  const [chatAppId, setChatAppId] = useState<string | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  const activeChatApp = useMemo(() => appointments.find(a => a.id === chatAppId), [appointments, chatAppId]);

  const [isEditingBarber, setIsEditingBarber] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Partial<Barber>>({ name: '', username: '', password: '', assignedServices: [], active: true, isAdmin: false });
  
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service>>({ name: '', price: 0, durationMinutes: 30, description: '' });
  
  const [masterNoticeText, setMasterNoticeText] = useState(config.masterNotice || '');

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('na_regua_status_update', handleRefresh);
    window.addEventListener('na_regua_shop_update', handleRefresh);
    return () => {
      window.removeEventListener('na_regua_status_update', handleRefresh);
      window.removeEventListener('na_regua_shop_update', handleRefresh);
    };
  }, [currentUser]);

  useEffect(() => {
    if (myProfile && !localToast) {
      setProfileName(myProfile.name);
      setProfileAvatar(myProfile.avatar || null);
    }
  }, [myProfile, localToast]);

  const loadData = () => {
    const apps = storageService.getAppointments();
    setAppointments(apps.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
    setServices(storageService.getServices());
    const bs = storageService.getBarbers();
    setBarbers(bs);
    setShops(storageService.getShops());
    setProfiles(storageService.getAllLoyaltyProfiles());
    const cfg = storageService.getConfig();
    setConfig(cfg);
    setMasterNoticeText(cfg.masterNotice || '');
  };

  const handleStatusChange = (id: string, status: Appointment['status'], productsRev: number = 0) => {
    storageService.updateAppointmentStatus(id, status, productsRev);
    setIsFinishingAppId(null);
    setProductSaleValue('0');
    notifyAndReload(`Agenda atualizada.`);
  };

  const handleTransfer = (targetBarberId: string) => {
    if (!transferAppId) return;
    storageService.transferAppointment(transferAppId, targetBarberId);
    setTransferAppId(null);
    notifyAndReload("Cliente transferido.");
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatAppId || !chatMsg.trim()) return;
    storageService.addMessage(chatAppId, 'barber', chatMsg);
    setChatMsg('');
  };

  const handleSaveMasterNotice = () => {
    const updatedConfig = { ...config, masterNotice: masterNoticeText };
    storageService.saveConfig(updatedConfig);
    notifyAndReload("Aviso global atualizado.");
  };

  const handleSaveProfileHeader = () => {
    if (myProfile) {
      const updatedBarber = storageService.updateBarberProfile(myProfile.username, { 
        name: profileName, 
        avatar: profileAvatar || undefined 
      });
      if (updatedBarber) {
        setBarbers(prev => prev.map(b => b.username === currentUser ? { ...b, name: profileName, avatar: profileAvatar || undefined } : b));
        notifyAndReload("Perfil atualizado com sucesso.");
      } else {
        setLocalToast({ msg: "Erro ao salvar perfil", type: 'error' });
      }
    }
  };

  const handleBarberAddAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApp.customerName || !newApp.customerPhone || !newApp.serviceId || !newApp.barberId || !newApp.date || !newApp.time) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    storageService.addAppointment({
      id: crypto.randomUUID(),
      customerName: newApp.customerName,
      customerPhone: newApp.customerPhone,
      serviceId: newApp.serviceId,
      barberId: newApp.barberId,
      dateTime: `${newApp.date}T${newApp.time}:00`,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      messages: [],
      observations: newApp.observations || 'Agendamento manual via painel'
    });
    setIsAddingAppointment(false);
    setNewApp({ customerName: '', customerPhone: '', serviceId: '', barberId: '', date: '', time: '', observations: '' });
    notifyAndReload("Agendamento adicionado com sucesso.");
  };

  const handleSaveBarber = (e: React.FormEvent) => {
    e.preventDefault();
    const barbersList = storageService.getBarbers();
    if (editingBarber.id) {
      const index = barbersList.findIndex(b => b.id === editingBarber.id);
      if (index !== -1) barbersList[index] = { ...barbersList[index], ...editingBarber } as Barber;
    } else {
      const newBarber: Barber = {
        id: crypto.randomUUID(),
        name: editingBarber.name || '',
        username: editingBarber.username || '',
        password: editingBarber.password || '',
        assignedServices: editingBarber.assignedServices || services.map(s => s.id),
        active: editingBarber.active ?? true,
        isAdmin: editingBarber.isAdmin ?? false
      };
      barbersList.push(newBarber);
    }
    storageService.saveBarbers(barbersList);
    setIsEditingBarber(false);
    notifyAndReload("Profissional salvo.");
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    const servicesList = storageService.getServices();
    if (editingService.id) {
      const index = servicesList.findIndex(s => s.id === editingService.id);
      if (index !== -1) servicesList[index] = { ...servicesList[index], ...editingService } as Service;
    } else {
      const newService: Service = {
        id: crypto.randomUUID(),
        name: editingService.name || '',
        price: Number(editingService.price) || 0,
        durationMinutes: Number(editingService.durationMinutes) || 30,
        description: editingService.description || ''
      };
      servicesList.push(newService);
    }
    storageService.saveServices(servicesList);
    setIsEditingService(false);
    notifyAndReload("Serviço salvo.");
  };

  const handleUpdateShop = (shopId: string, field: keyof Shop, value: any) => {
    const updatedShops = shops.map(s => s.id === shopId ? { ...s, [field]: value } : s);
    setShops(updatedShops);
  };

  const handleSaveShopSettings = () => {
    storageService.saveShops(shops);
    if (onShopUpdate) onShopUpdate();
    notifyAndReload("Dados atualizados com sucesso.");
  };

  const billingData = useMemo(() => {
    const completed = appointments.filter(a => a.status === 'completed');
    const filteredByAccess = isAdmin 
      ? (selectedBarberFilter === 'all' ? completed : completed.filter(a => a.barberId === selectedBarberFilter))
      : completed.filter(a => a.barberId === myProfile?.id);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let daily = 0, monthly = 0, yearly = 0;
    const dailyChartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      dailyChartData.push({ label: d.toLocaleDateString([], {day:'2-digit', month:'2-digit'}), date: d.toISOString().split('T')[0], value: 0 });
    }

    filteredByAccess.forEach(app => {
      const appDate = new Date(app.dateTime);
      const appDateStr = app.dateTime.split('T')[0];
      const srv = services.find(s => s.id === app.serviceId);
      const totalRev = ((srv?.price || 0) - (app.discountApplied || 0)) + (app.productsRevenue || 0);
      
      if (appDateStr === todayStr) daily += totalRev;
      if (appDate.getMonth() === currentMonth && appDate.getFullYear() === currentYear) monthly += totalRev;
      if (appDate.getFullYear() === currentYear) yearly += totalRev;

      const dayIdx = dailyChartData.findIndex(d => d.date === appDateStr);
      if (dayIdx !== -1) dailyChartData[dayIdx].value += totalRev;
    });
    return { daily, monthly, yearly, dailyChartData };
  }, [appointments, services, isAdmin, myProfile, selectedBarberFilter]);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    const statusFilterLocal = statusFilter;
    if (statusFilterLocal !== 'all') filtered = filtered.filter(a => a.status === statusFilterLocal);
    if (!isAdmin) filtered = filtered.filter(a => a.barberId === myProfile?.id);
    else if (agendaBarberFilter !== 'all') filtered = filtered.filter(a => a.barberId === agendaBarberFilter);
    return filtered;
  }, [appointments, statusFilter, isAdmin, myProfile, agendaBarberFilter]);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return profiles;
    const s = clientSearch.toLowerCase();
    return profiles.filter(p => (p.name?.toLowerCase().includes(s)) || p.phone.includes(s));
  }, [profiles, clientSearch]);

  const historyAppointments = useMemo(() => {
    let filtered = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');
    if (!isAdmin) filtered = filtered.filter(a => a.barberId === myProfile?.id);
    if (historySearch) {
      const s = historySearch.toLowerCase();
      filtered = filtered.filter(a => a.customerName.toLowerCase().includes(s) || a.customerPhone.includes(s));
    }
    return filtered.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [appointments, isAdmin, myProfile, historySearch]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      {localToast && (
        <div className="fixed top-24 right-4 z-[200] animate-card">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl border-2 flex items-center gap-3 ${localToast.type === 'success' ? 'bg-green-600 border-green-400 text-white' : 'bg-red-600 border-red-400 text-white'}`}>
             <i className="fa-solid fa-check-circle"></i>
             <p className="font-bold text-xs uppercase tracking-widest">{localToast.msg}</p>
          </div>
        </div>
      )}

      {/* Header Profile & Tabs */}
      <div className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6 animate-view">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shadow-xl">
             {myProfile?.avatar ? <img src={myProfile.avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user-tie text-amber-500 text-3xl"></i>}
           </div>
           <div>
              <h1 className="text-4xl font-brand text-white uppercase leading-none tracking-tight">{myProfile?.name}</h1>
              <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">{isAdmin ? 'Administrador Master' : 'Profissional'}</p>
           </div>
        </div>
        <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700 shadow-2xl overflow-x-auto no-scrollbar w-full lg:w-auto">
          {['agenda', 'historico', 'clientes', 'faturamento', 'equipe', 'perfil', 'cortes', 'redes', 'lojas'].map(tab => (
            (!['equipe', 'cortes', 'lojas', 'faturamento', 'redes'].includes(tab) || isAdmin) && (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${activeTab === tab ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                {tab === 'equipe' ? 'Equipa' : tab === 'lojas' ? 'Unidade' : tab === 'cortes' ? 'Serviços' : tab === 'redes' ? 'Redes Sociais' : tab === 'historico' ? 'Histórico' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          ))}
        </div>
      </div>

      <div key={activeTab} className="animate-view">
        {activeTab === 'agenda' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-brand text-white uppercase tracking-widest">Próximos Clientes</h2>
                  <button onClick={() => { setNewApp({...newApp, barberId: myProfile?.id || ''}); setIsAddingAppointment(true); }} className="bg-amber-500 text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover-lift shadow-lg">Agendar Novo Cliente</button>
               </div>
               <div className="flex gap-2 w-full md:w-auto">
                  {isAdmin && (
                    <select value={agendaBarberFilter} onChange={(e) => setAgendaBarberFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase p-2 rounded-xl text-slate-300 outline-none flex-1">
                      <option value="all">Todos Barbeiros</option>
                      {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  )}
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase p-2 rounded-xl text-slate-300 outline-none flex-1">
                    <option value="pending">Pendentes</option><option value="confirmed">Confirmados</option><option value="all">Tudo</option>
                  </select>
               </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredAppointments.map(app => (
                <div key={app.id} className={`bg-slate-800/40 p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-center gap-6 animate-card hover:bg-slate-800/60 transition-all ${app.status === 'pending' ? 'border-amber-500/30' : 'border-slate-700'}`}>
                  <div className="flex gap-4 items-center flex-1 w-full text-left">
                     <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center font-brand text-2xl text-amber-500 border border-slate-700">{app.customerName.charAt(0)}</div>
                     <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <h4 className="font-bold text-white uppercase text-sm">{app.customerName}</h4>
                           <span className="text-[9px] text-slate-500 font-bold">({app.customerPhone})</span>
                        </div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                           {services.find(s => s.id === app.serviceId)?.name} • {new Date(app.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        </p>
                        {app.observations && (
                           <div className="mt-3 bg-slate-950/40 p-3 rounded-xl border border-slate-700/50">
                              <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mb-1">Nota:</p>
                              <p className="text-xs text-slate-400 italic">"{app.observations}"</p>
                           </div>
                        )}
                     </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto justify-end">
                     <button onClick={() => setChatAppId(app.id)} title="Chat" className="bg-slate-700 text-white p-3 rounded-xl hover:bg-amber-500 hover:text-slate-900 transition-all shadow-md"><i className="fa-solid fa-comment"></i></button>
                     {isAdmin && <button onClick={() => setTransferAppId(app.id)} title="Transferir" className="bg-slate-700 text-white p-3 rounded-xl hover:bg-blue-600 transition-all shadow-md"><i className="fa-solid fa-right-left"></i></button>}
                     {app.status === 'pending' && <button onClick={() => handleStatusChange(app.id, 'confirmed')} className="bg-green-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover-lift">Aceitar</button>}
                     {app.status === 'confirmed' && <button onClick={() => setIsFinishingAppId(app.id)} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover-lift">Concluir</button>}
                     <button onClick={() => handleStatusChange(app.id, 'cancelled')} className="bg-red-600/10 text-red-500 px-5 py-2 rounded-xl text-[10px] font-bold border border-red-500/20 hover:bg-red-600 transition-all">Recusar</button>
                  </div>
                </div>
              ))}
              {filteredAppointments.length === 0 && <p className="text-center py-20 text-slate-600 italic">Sem registros no momento.</p>}
            </div>
          </div>
        )}

        {activeTab === 'redes' && isAdmin && (
          <div className="max-w-2xl mx-auto space-y-10 pt-10 animate-view">
             <div className="text-center mb-8">
               <h2 className="text-3xl font-brand text-white uppercase tracking-widest">Redes Sociais</h2>
               <p className="text-slate-400 text-xs italic mt-2">Estes links aparecem na tela de entrada dos seus clientes.</p>
             </div>
             {shops.map(shop => (
              <div key={shop.id} className="bg-slate-800/40 p-10 rounded-[40px] border border-slate-700 shadow-2xl space-y-8">
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest flex items-center gap-2">
                         <i className="fa-brands fa-whatsapp text-green-500"></i> WhatsApp
                       </label>
                       <input type="text" value={shop.whatsapp} onChange={e => handleUpdateShop(shop.id, 'whatsapp', e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500" placeholder="Ex: 912345678" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest flex items-center gap-2">
                         <i className="fa-brands fa-instagram text-pink-500"></i> Instagram (Usuário)
                       </label>
                       <input type="text" value={shop.instagram} onChange={e => handleUpdateShop(shop.id, 'instagram', e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500" placeholder="Ex: naregua_barber" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest flex items-center gap-2">
                         <i className="fa-brands fa-facebook text-blue-500"></i> Facebook (Usuário)
                       </label>
                       <input type="text" value={shop.facebook} onChange={e => handleUpdateShop(shop.id, 'facebook', e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500" placeholder="Ex: naregua.oficial" />
                    </div>
                 </div>
                 <button onClick={handleSaveShopSettings} className="w-full bg-amber-500 text-slate-900 font-black py-5 rounded-2xl uppercase tracking-widest hover-lift shadow-xl">Salvar Informações de Rede</button>
              </div>
             ))}
          </div>
        )}

        {/* ... outras tabs (historico, clientes, faturamento, equipe, perfil, cortes, lojas) seguem o mesmo padrão ... */}
        {activeTab === 'historico' && (
          <div className="space-y-8">
             <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <h2 className="text-2xl font-brand text-white uppercase tracking-widest">Histórico</h2>
                <div className="relative w-full md:w-72">
                   <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
                   <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Buscar por cliente..." className="w-full bg-slate-800 border border-slate-700 p-3 pl-12 rounded-xl text-white text-xs outline-none focus:border-amber-500" />
                </div>
             </div>
             <div className="grid grid-cols-1 gap-4">
                {historyAppointments.length > 0 ? historyAppointments.map(app => (
                  <div key={app.id} className="bg-slate-800/20 p-6 rounded-3xl border border-slate-800 flex justify-between items-center hover-scale transition-all">
                    <div className="flex gap-4 items-center">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-brand text-2xl border ${app.status === 'completed' ? 'text-green-500 border-green-500/20' : 'text-red-500 border-red-500/20'}`}>{app.customerName.charAt(0)}</div>
                      <div>
                        <h4 className="font-bold text-white uppercase text-sm">{app.customerName}</h4>
                        <p className="text-[10px] text-slate-500 uppercase">{services.find(s => s.id === app.serviceId)?.name} • {new Date(app.dateTime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`text-[8px] font-black uppercase mb-1 ${app.status === 'completed' ? 'text-green-500' : 'text-red-500'}`}>{app.status === 'completed' ? 'Finalizado' : 'Cancelado'}</p>
                       <p className="font-brand text-xl text-white">€ {((services.find(s => s.id === app.serviceId)?.price || 0) + (app.productsRevenue || 0)).toFixed(2)}</p>
                    </div>
                  </div>
                )) : <p className="text-center py-20 text-slate-600 italic">Nenhum registro encontrado.</p>}
             </div>
          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="space-y-8">
             <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <h2 className="text-2xl font-brand text-white uppercase tracking-widest">Clientes</h2>
                <input type="text" value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Buscar cliente..." className="bg-slate-800 border border-slate-700 p-3 rounded-xl text-white text-xs outline-none w-full md:w-72 focus:border-amber-500" />
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClients.length > 0 ? filteredClients.map(profile => (
                  <div key={profile.phone} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 hover:border-amber-500/30 transition-all">
                     <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center">
                          {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-slate-700 text-xl"></i>}
                        </div>
                        <div className="flex-1">
                           <h4 className="font-bold text-white uppercase text-sm">{profile.name || 'Cliente'}</h4>
                           <p className="text-[10px] text-slate-500 font-bold">{profile.phone}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-950/50 p-2 rounded-xl text-center">
                           <p className="text-[8px] font-black text-slate-500 uppercase">Pontos</p>
                           <p className="text-lg font-brand text-amber-500">{profile.points}</p>
                        </div>
                        <div className="bg-slate-950/50 p-2 rounded-xl text-center">
                           <p className="text-[8px] font-black text-slate-500 uppercase">Visitas</p>
                           <p className="text-lg font-brand text-white">{profile.totalAppointments}</p>
                        </div>
                     </div>
                  </div>
                )) : <p className="text-center py-20 text-slate-600 italic col-span-full">Nenhum cliente registrado.</p>}
             </div>
          </div>
        )}

        {activeTab === 'faturamento' && isAdmin && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-brand text-white uppercase tracking-widest">Financeiro</h2>
              <select value={selectedBarberFilter} onChange={(e) => setSelectedBarberFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-[10px] font-black uppercase p-3 rounded-xl text-slate-300 outline-none">
                <option value="all">Faturamento Total</option>
                {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/40 p-8 rounded-[40px] border border-slate-700 shadow-xl">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Hoje</p>
                <p className="text-4xl font-brand text-white leading-none">€ {billingData.daily.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/40 p-8 rounded-[40px] border border-slate-700 shadow-xl">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Mês</p>
                <p className="text-4xl font-brand text-white leading-none">€ {billingData.monthly.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/40 p-8 rounded-[40px] border border-amber-500/20 shadow-2xl shadow-amber-500/5">
                <p className="text-[10px] font-black text-amber-500 uppercase mb-2 tracking-widest">Ano</p>
                <p className="text-4xl font-brand text-amber-500 leading-none">€ {billingData.yearly.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="bg-slate-800/20 p-8 rounded-[40px] border border-slate-700">
               <h3 className="text-xl font-brand text-white uppercase mb-8">Performance Semanal</h3>
               <div className="flex items-end justify-between h-40 gap-3">
                  {billingData.dailyChartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                       <div className="w-full bg-slate-700/50 rounded-lg relative overflow-hidden h-full flex items-end">
                          <div 
                            className="bg-amber-500 w-full transition-all duration-700" 
                            style={{ height: `${Math.min(100, (d.value / (Math.max(...billingData.dailyChartData.map(v => v.value)) || 1)) * 100)}%` }}
                          />
                       </div>
                       <p className="text-[8px] font-black text-slate-500 uppercase">{d.label}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'equipe' && isAdmin && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-brand text-white uppercase tracking-widest">Equipa</h2>
               <button onClick={() => { setEditingBarber({ name: '', username: '', password: '', active: true, assignedServices: services.map(s => s.id) }); setIsEditingBarber(true); }} className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover-lift shadow-lg shadow-amber-500/20">Novo Barbeiro</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {barbers.map(barber => (
                 <div key={barber.id} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
                          {barber.avatar ? <img src={barber.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-amber-500 font-brand text-xl">{barber.name.charAt(0)}</div>}
                       </div>
                       <div>
                          <h4 className="font-bold text-white text-sm">{barber.name}</h4>
                          <p className="text-[10px] text-slate-500 font-black uppercase">@{barber.username}</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingBarber(barber); setIsEditingBarber(true); }} className="flex-1 bg-slate-700 text-white py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-slate-600 transition-all">Editar</button>
                       <button onClick={() => { const updated = barbers.map(b => b.id === barber.id ? {...b, active: !b.active} : b); storageService.saveBarbers(updated); loadData(); }} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${barber.active ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>{barber.active ? 'Desativar' : 'Ativar'}</button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'cortes' && isAdmin && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-brand text-white uppercase tracking-widest">Serviços</h2>
               <button onClick={() => { setEditingService({ name: '', price: 0, durationMinutes: 30 }); setIsEditingService(true); }} className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover-lift shadow-lg">Novo Serviço</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {services.map(srv => (
                 <div key={srv.id} className="bg-slate-800/20 p-6 rounded-3xl border border-slate-700 flex flex-col justify-between group hover:border-amber-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                       <h4 className="font-bold text-white uppercase text-sm">{srv.name}</h4>
                       <p className="text-xl font-brand text-amber-500">€ {srv.price.toFixed(2)}</p>
                    </div>
                    <button onClick={() => { setEditingService(srv); setIsEditingService(true); }} className="w-full bg-slate-700/50 group-hover:bg-amber-500 group-hover:text-slate-900 text-white py-2.5 rounded-xl text-[9px] font-black uppercase transition-all tracking-widest">Configurar</button>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeTab === 'lojas' && isAdmin && (
          <div className="max-w-3xl mx-auto space-y-8 pt-10 animate-view">
            <h2 className="text-2xl font-brand text-white uppercase text-center tracking-widest">Unidade</h2>
            {shops.map(shop => (
              <div key={shop.id} className="bg-slate-800/40 p-8 rounded-[40px] border border-slate-700 space-y-6 shadow-2xl">
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Nome da Barbearia</label>
                   <input type="text" value={shop.name} onChange={e => handleUpdateShop(shop.id, 'name', e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-amber-500" placeholder="Nome" />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Morada / Endereço</label>
                   <input type="text" value={shop.address} onChange={e => handleUpdateShop(shop.id, 'address', e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-amber-500" placeholder="Rua..." />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Telemóvel</label>
                   <input type="text" value={shop.phone} onChange={e => handleUpdateShop(shop.id, 'phone', e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white outline-none focus:border-amber-500" placeholder="Número" />
                 </div>
                 <button onClick={handleSaveShopSettings} className="w-full bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase hover-lift shadow-xl tracking-widest">Salvar Alterações</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="max-w-2xl mx-auto space-y-10 pt-10 text-center animate-view">
             <div className="relative w-32 h-32 mx-auto">
                <div className="w-full h-full rounded-[40px] bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center shadow-2xl">
                   {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user-tie text-slate-600 text-5xl"></i>}
                </div>
                <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center cursor-pointer border-4 border-slate-900 shadow-xl text-slate-900 hover-lift transition-all"><i className="fa-solid fa-camera"></i><input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setProfileAvatar(r.result as string); r.readAsDataURL(f); } }} /></label>
             </div>
             <div className="bg-slate-800/20 p-8 rounded-[40px] border border-slate-700 shadow-2xl text-left space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Seu Nome Público</label>
                   <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500 font-bold" />
                </div>
                <button onClick={handleSaveProfileHeader} className="w-full bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover-lift shadow-xl">Guardar Perfil</button>
                {isAdmin && (
                  <div className="pt-6 border-t border-slate-800 space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-2 mb-2 block tracking-widest">Aviso Geral (Topo do Site)</label>
                    <textarea value={masterNoticeText} onChange={e => setMasterNoticeText(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none mb-4 resize-none h-24 focus:border-amber-500 text-xs" placeholder="Texto que aparecerá para todos os clientes..."></textarea>
                    <button onClick={handleSaveMasterNotice} className="w-full bg-slate-800 text-amber-500 border border-amber-500/30 py-3 rounded-2xl uppercase text-[10px] font-black tracking-widest">Publicar Aviso Master</button>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Modal: Adicionar Agendamento Manualmente */}
      {isAddingAppointment && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-view">
           <form onSubmit={handleBarberAddAppointment} className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-4 animate-card shadow-2xl overflow-y-auto max-h-[90vh]">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest mb-4">Novo Agendamento</h3>
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">Cliente</label>
                 <input type="text" value={newApp.customerName} onChange={e => setNewApp({...newApp, customerName: e.target.value})} placeholder="Nome completo" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">Telemóvel</label>
                 <input type="tel" value={newApp.customerPhone} onChange={e => setNewApp({...newApp, customerPhone: e.target.value})} placeholder="Número" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">Serviço</label>
                 <select value={newApp.serviceId} onChange={e => setNewApp({...newApp, serviceId: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required>
                    <option value="">Selecione...</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - €{s.price}</option>)}
                 </select>
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">Atribuir a</label>
                 <select value={newApp.barberId} onChange={e => setNewApp({...newApp, barberId: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required>
                    <option value="">Selecione...</option>
                    {barbers.filter(b => b.active).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                 </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1">Data</label>
                    <input type="date" value={newApp.date} onChange={e => setNewApp({...newApp, date: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1">Hora</label>
                    <input type="time" value={newApp.time} onChange={e => setNewApp({...newApp, time: e.target.value})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
                 </div>
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-slate-500 uppercase px-1">Notas</label>
                 <textarea value={newApp.observations} onChange={e => setNewApp({...newApp, observations: e.target.value})} placeholder="Opcional..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500 text-xs resize-none h-16" />
              </div>
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsAddingAppointment(false)} className="flex-1 text-slate-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                 <button type="submit" className="flex-2 bg-amber-500 text-slate-900 font-black py-4 px-6 rounded-2xl uppercase text-[10px] tracking-widest hover-lift shadow-xl">Confirmar</button>
              </div>
           </form>
        </div>
      )}

      {/* Modais Administrativos */}
      {isEditingBarber && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <form onSubmit={handleSaveBarber} className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-4 animate-card shadow-2xl">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest mb-4">Profissional</h3>
              <input type="text" value={editingBarber.name} onChange={e => setEditingBarber({...editingBarber, name: e.target.value})} placeholder="Nome de exibição" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
              <input type="text" value={editingBarber.username} onChange={e => setEditingBarber({...editingBarber, username: e.target.value})} placeholder="Login/Usuário" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
              <input type="password" value={editingBarber.password} onChange={e => setEditingBarber({...editingBarber, password: e.target.value})} placeholder="Senha de acesso" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsEditingBarber(false)} className="flex-1 text-slate-500 font-black uppercase text-[10px] tracking-widest">Sair</button>
                 <button type="submit" className="flex-2 bg-amber-500 text-slate-900 font-black py-4 px-8 rounded-2xl uppercase text-[10px] tracking-widest hover-lift">Salvar</button>
              </div>
           </form>
        </div>
      )}

      {isEditingService && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <form onSubmit={handleSaveService} className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-4 animate-card shadow-2xl">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest mb-4">Serviço</h3>
              <input type="text" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} placeholder="Nome do corte/serviço" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
              <div className="grid grid-cols-2 gap-3">
                 <input type="number" step="0.50" value={editingService.price} onChange={e => setEditingService({...editingService, price: Number(e.target.value)})} placeholder="Preço €" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
                 <input type="number" value={editingService.durationMinutes} onChange={e => setEditingService({...editingService, durationMinutes: Number(e.target.value)})} placeholder="Minutos" className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
              </div>
              <textarea value={editingService.description} onChange={e => setEditingService({...editingService, description: e.target.value})} placeholder="Breve descrição..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none h-20 text-xs focus:border-amber-500" />
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsEditingService(false)} className="flex-1 text-slate-500 font-black uppercase text-[10px] tracking-widest">Sair</button>
                 <button type="submit" className="flex-2 bg-amber-500 text-slate-900 font-black py-4 px-8 rounded-2xl uppercase text-[10px] tracking-widest hover-lift">Salvar</button>
              </div>
           </form>
        </div>
      )}

      {chatAppId && activeChatApp && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-md h-[550px] flex flex-col rounded-[40px] shadow-2xl animate-card overflow-hidden">
              <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                 <div>
                    <h3 className="font-brand text-xl text-white uppercase tracking-widest">{activeChatApp.customerName}</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-black">{activeChatApp.customerPhone}</p>
                 </div>
                 <button onClick={() => setChatAppId(null)} className="text-slate-500 hover:text-white transition-colors"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-950/20">
                 {(activeChatApp.messages || []).map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'barber' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-medium shadow-lg ${msg.sender === 'barber' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-white border border-slate-700'}`}>
                          {msg.text}
                          <p className={`text-[8px] mt-1 opacity-50 ${msg.sender === 'barber' ? 'text-slate-800' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                       </div>
                    </div>
                 ))}
                 {(activeChatApp.messages || []).length === 0 && <p className="text-center text-slate-600 italic py-20 text-xs">Sem mensagens para este agendamento.</p>}
              </div>
              <form onSubmit={handleSendChat} className="p-4 bg-slate-800 border-t border-slate-700 flex gap-3">
                 <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Digite sua resposta..." className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500 text-xs" />
                 <button type="submit" className="bg-amber-500 text-slate-900 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><i className="fa-solid fa-paper-plane"></i></button>
              </form>
           </div>
        </div>
      )}

      {isFinishingAppId && currentFinishingApp && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-6 animate-card shadow-2xl">
              <div className="text-center">
                 <h3 className="text-2xl font-brand text-white uppercase tracking-widest">Finalizar Atendimento</h3>
                 <p className="text-xs text-slate-400 mt-1">{currentFinishingApp.customerName}</p>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Produtos adicionais (€)</label>
                 <input type="number" step="0.50" value={productSaleValue} onChange={e => setProductSaleValue(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-xl text-white text-center font-brand text-2xl outline-none focus:border-amber-500" />
              </div>
              <div className="pt-4 space-y-3">
                 <button onClick={() => handleStatusChange(isFinishingAppId, 'completed', parseFloat(productSaleValue) || 0)} className="w-full bg-green-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-sm hover-lift shadow-xl">Concluir e Salvar</button>
                 <button onClick={() => setIsFinishingAppId(null)} className="w-full text-slate-500 text-[10px] font-black uppercase tracking-widest py-2">Voltar</button>
              </div>
           </div>
        </div>
      )}

      {transferAppId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-4 animate-card shadow-2xl">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest mb-4">Transferir Cliente</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-2">Selecione o novo profissional:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar pr-1">
                 {barbers.filter(b => b.active).map(b => (
                   <button key={b.id} onClick={() => handleTransfer(b.id)} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white text-xs font-bold uppercase hover:border-amber-500 transition-all text-left flex justify-between items-center group">
                      <span>{b.name}</span>
                      <i className="fa-solid fa-chevron-right opacity-0 group-hover:opacity-100 transition-all text-amber-500"></i>
                   </button>
                 ))}
              </div>
              <button onClick={() => setTransferAppId(null)} className="w-full text-slate-500 font-black uppercase text-[10px] tracking-widest pt-4">Cancelar</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default BarberDashboard;
