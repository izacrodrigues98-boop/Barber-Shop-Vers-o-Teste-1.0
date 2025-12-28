
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Service, BarberConfig, Barber, Shop } from '../types';
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
  const [config, setConfig] = useState<BarberConfig>(storageService.getConfig());
  const [activeTab, setActiveTab] = useState<'agenda' | 'faturamento' | 'equipe' | 'cortes' | 'lojas' | 'perfil'>('agenda');
  const [statusFilter, setStatusFilter] = useState<Appointment['status'] | 'all'>('pending');
  const [selectedBarbers, setSelectedBarbers] = useState<string[]>(['all']);
  
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);

  const [isFinishingApp, setIsFinishingApp] = useState<string | null>(null);
  const [productSaleValue, setProductSaleValue] = useState<string>('0');

  const [isEditingBarber, setIsEditingBarber] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Partial<Barber>>({ name: '', username: '', password: '', assignedServices: [], active: true });
  
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service>>({ name: '', price: 0, durationMinutes: 30 });

  const [isEditingShop, setIsEditingShop] = useState(false);
  const [editingShop, setEditingShop] = useState<Partial<Shop>>({ name: '', address: '', phone: '', whatsapp: '', instagram: '', facebook: '', active: true });

  const [showGoalEditor, setShowGoalEditor] = useState(false);

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('na_regua_new_booking', handleRefresh);
    window.addEventListener('na_regua_status_update', handleRefresh);
    return () => {
      window.removeEventListener('na_regua_new_booking', handleRefresh);
      window.removeEventListener('na_regua_status_update', handleRefresh);
    };
  }, [currentUser]);

  useEffect(() => {
    if (myProfile) {
      setEditName(myProfile.name);
      setEditUsername(myProfile.username);
      setEditAvatar(myProfile.avatar || null);
      if (!isAdmin) setSelectedBarbers([myProfile.id]);
    }
  }, [myProfile, isAdmin]);

  const loadData = () => {
    const apps = storageService.getAppointments();
    setAppointments(apps.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
    setServices(storageService.getServices());
    setBarbers(storageService.getBarbers());
    setShops(storageService.getShops());
    setConfig(storageService.getConfig());
  };

  const handleStatusChange = (id: string, status: Appointment['status'], productsRev: number = 0) => {
    storageService.updateAppointmentStatus(id, status, productsRev);
    setIsFinishingApp(null);
    setProductSaleValue('0');
    loadData();
  };

  const billingData = useMemo(() => {
    const completed = appointments.filter(a => a.status === 'completed');
    const filteredByAccess = isAdmin 
      ? (selectedBarbers.includes('all') ? completed : completed.filter(a => selectedBarbers.includes(a.barberId)))
      : completed.filter(a => a.barberId === myProfile?.id);
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const firstDayOfWeek = new Date(now);
    const day = now.getDay();
    firstDayOfWeek.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    firstDayOfWeek.setHours(0,0,0,0);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let daily = 0, weekly = 0, monthly = 0, productsMonthly = 0;
    const dailyChartData: { date: string, value: number }[] = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyChartData.push({ date: d.toISOString().split('T')[0], value: 0 });
    }

    filteredByAccess.forEach(app => {
      const appDateStr = app.dateTime.split('T')[0];
      const appDate = new Date(app.dateTime);
      const srv = services.find(s => s.id === app.serviceId);
      const srvRev = (srv?.price || 0) - (app.discountApplied || 0);
      const totalRevenue = srvRev + (app.productsRevenue || 0);
      
      if (appDateStr === todayStr) daily += totalRevenue;
      if (appDate >= firstDayOfWeek) weekly += totalRevenue;
      if (appDate >= firstDayOfMonth) {
        monthly += totalRevenue;
        productsMonthly += (app.productsRevenue || 0);
      }
      
      const chartIndex = dailyChartData.findIndex(d => d.date === appDateStr);
      if (chartIndex !== -1) dailyChartData[chartIndex].value += totalRevenue;
    });

    return { 
      daily, weekly, monthly, productsMonthly, dailyChartData,
      maxDailyValue: Math.max(...dailyChartData.map(d => d.value), 1)
    };
  }, [appointments, services, isAdmin, myProfile, selectedBarbers]);

  const currentFinishingApp = useMemo(() => isFinishingApp ? appointments.find(a => a.id === isFinishingApp) : null, [isFinishingApp, appointments]);
  const currentFinishingService = useMemo(() => currentFinishingApp ? services.find(s => s.id === currentFinishingApp.serviceId) : null, [currentFinishingApp, services]);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
    if (!isAdmin) filtered = filtered.filter(a => a.barberId === myProfile?.id);
    else if (!selectedBarbers.includes('all')) filtered = filtered.filter(a => selectedBarbers.includes(a.barberId));
    return filtered;
  }, [appointments, statusFilter, selectedBarbers, isAdmin, myProfile]);

  const pendingCount = appointments.filter(a => (isAdmin ? true : a.barberId === myProfile?.id) && a.status === 'pending').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in pb-32">
      <div className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-4">
           <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center">
             {myProfile?.avatar ? <img src={myProfile.avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user-tie text-amber-500 text-3xl"></i>}
           </div>
           <div>
              <h1 className="text-4xl font-brand text-white uppercase tracking-tight leading-none">{myProfile?.name}</h1>
              <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mt-1">{isAdmin ? 'Administrador Master' : 'Barbeiro Profissional'}</p>
           </div>
        </div>

        <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700 shadow-2xl overflow-x-auto no-scrollbar w-full lg:w-auto">
          {[
            { id: 'agenda', label: 'Agenda', adminOnly: false },
            { id: 'faturamento', label: 'Faturamento', adminOnly: false },
            { id: 'perfil', label: 'Meu Perfil', adminOnly: false },
            { id: 'equipe', label: 'Equipa', adminOnly: true },
            { id: 'cortes', label: 'Cortes', adminOnly: true },
            { id: 'lojas', label: 'Unidades', adminOnly: true }
          ].filter(t => !t.adminOnly || isAdmin).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`relative px-5 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${activeTab === tab.id ? 'bg-amber-500 text-slate-900' : 'text-slate-500 hover:text-white'}`}>
              {tab.label}
              {tab.id === 'agenda' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white flex items-center justify-center rounded-full text-[8px] border-2 border-slate-800 animate-pulse">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'agenda' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <h2 className="text-2xl font-brand text-white uppercase">Gestão de Horários</h2>
             <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase p-2 rounded-xl text-slate-300 outline-none w-full md:w-auto">
               <option value="pending">Pendentes</option>
               <option value="confirmed">Confirmados</option>
               <option value="all">Ver Tudo</option>
             </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredAppointments.length > 0 ? filteredAppointments.map(app => (
              <div key={app.id} className={`bg-slate-800/40 p-6 rounded-3xl border transition-all flex flex-col md:flex-row justify-between items-center gap-6 ${app.status === 'pending' ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700'}`}>
                <div className="flex gap-4 items-center">
                   <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center font-brand text-2xl text-amber-500 border border-slate-700">{app.customerName.charAt(0)}</div>
                   <div>
                      <h4 className="font-bold text-white">{app.customerName}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{services.find(s => s.id === app.serviceId)?.name} • {new Date(app.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   {app.status === 'pending' && <button onClick={() => handleStatusChange(app.id, 'confirmed')} className="flex-1 bg-green-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Aceitar</button>}
                   {app.status === 'confirmed' && <button onClick={() => setIsFinishingApp(app.id)} className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Finalizar</button>}
                   <button onClick={() => handleStatusChange(app.id, 'cancelled')} className="flex-1 bg-red-600/10 text-red-500 px-6 py-2 rounded-xl text-[10px] font-bold border border-red-500/20">Recusar</button>
                </div>
              </div>
            )) : <p className="text-center py-20 text-slate-600 italic">Nenhum agendamento encontrado.</p>}
          </div>
        </div>
      )}

      {activeTab === 'faturamento' && (
        <div className="space-y-10 animate-fade-in">
           <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <div>
                 <h2 className="text-2xl font-brand text-white uppercase tracking-wider">Performance de Faturamento</h2>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Metas e Receita Detalhada</p>
              </div>
           </div>

           <div className="bg-slate-800/40 border border-slate-700 p-8 rounded-[40px]">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-10">Gráfico de Faturamento (15 dias)</h3>
              <div className="h-48 flex items-end gap-2 md:gap-4">
                 {billingData.dailyChartData.map((d, i) => (
                   <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      <div className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg transition-all" style={{ height: `${(d.value / billingData.maxDailyValue) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}></div>
                      <p className="text-[7px] font-bold text-slate-600 uppercase mt-4 rotate-45">{new Date(d.date).toLocaleDateString([], {day:'2-digit'})}</p>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-slate-800/60 p-8 rounded-3xl border border-slate-700 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-brand text-white uppercase">Meta Mensal da Barbearia</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Objetivo: € {config.monthlyGoal.toFixed(2)}</p>
                 </div>
                 {isAdmin && <button onClick={() => setShowGoalEditor(!showGoalEditor)} className="text-amber-500 hover:text-white transition-colors"><i className="fa-solid fa-gear"></i></button>}
              </div>
              {showGoalEditor && isAdmin && (
                <div className="mb-8 p-6 bg-slate-950/50 rounded-2xl border border-slate-700 animate-fade-in flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-1">Nova Meta Financeira (€)</label>
                    <input type="number" value={config.monthlyGoal} onChange={e => setConfig({...config, monthlyGoal: parseFloat(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-amber-500" />
                  </div>
                  <button onClick={() => { storageService.saveConfig(config); setShowGoalEditor(false); }} className="bg-amber-500 text-slate-900 px-6 py-3 rounded-xl font-black uppercase text-[10px]">Atualizar Meta</button>
                </div>
              )}
              <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-700 p-0.5">
                 <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (billingData.monthly / (config.monthlyGoal || 1)) * 100)}%` }}></div>
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-black uppercase">
                <p className="text-slate-500">Progresso Atual: € {billingData.monthly.toFixed(2)}</p>
                <p className="text-amber-500">{((billingData.monthly / (config.monthlyGoal || 1)) * 100).toFixed(1)}%</p>
              </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { l: 'Hoje', v: billingData.daily, c: 'text-white' },
                { l: 'Semana', v: billingData.weekly, c: 'text-amber-500' },
                { l: 'Mês (Total)', v: billingData.monthly, c: 'text-green-500' },
                { l: 'Venda Produtos', v: billingData.productsMonthly, c: 'text-violet-400' }
              ].map((item, i) => (
                <div key={i} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 text-center hover:border-slate-500 transition-all">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">{item.l}</p>
                  <p className={`text-2xl font-brand ${item.c}`}>€ {item.v.toFixed(2)}</p>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'lojas' && isAdmin && (
        <div className="space-y-8 animate-fade-in">
           <div className="flex justify-between items-center">
              <div>
                 <h2 className="text-2xl font-brand text-white uppercase tracking-wider">Unidades & Lojas</h2>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Gerencie canais de atendimento e redes sociais</p>
              </div>
              <button onClick={() => { setEditingShop({ name: '', address: '', phone: '', whatsapp: '', instagram: '', facebook: '', active: true }); setIsEditingShop(true); }} className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/10">Adicionar Loja</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shops.map(shop => (
                 <div key={shop.id} className="bg-slate-800/40 p-8 rounded-3xl border border-slate-700 flex justify-between items-start group hover:border-amber-500/30 transition-all">
                    <div className="space-y-4">
                       <div>
                          <h3 className="text-2xl font-brand text-white uppercase mb-1">{shop.name}</h3>
                          <p className="text-[10px] text-slate-500 flex items-center gap-2"><i className="fa-solid fa-location-dot"></i> {shop.address}</p>
                       </div>
                       <div className="flex flex-wrap gap-4">
                          {shop.whatsapp && <div className="text-[10px] font-bold text-green-500 uppercase"><i className="fa-brands fa-whatsapp mr-1"></i> {shop.whatsapp}</div>}
                          {shop.instagram && <div className="text-[10px] font-bold text-amber-500 uppercase"><i className="fa-brands fa-instagram mr-1"></i> @{shop.instagram}</div>}
                          {shop.phone && <div className="text-[10px] font-bold text-slate-400 uppercase"><i className="fa-solid fa-phone mr-1"></i> {shop.phone}</div>}
                       </div>
                    </div>
                    <button onClick={() => { setEditingShop(shop); setIsEditingShop(true); }} className="text-slate-500 hover:text-amber-500 p-2"><i className="fa-solid fa-pen"></i></button>
                 </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'cortes' && isAdmin && (
        <div className="space-y-8 animate-fade-in">
           <div className="flex justify-between items-center">
              <h2 className="text-2xl font-brand text-white uppercase">Menu de Serviços</h2>
              <button onClick={() => { setEditingService({ name: '', price: 0, durationMinutes: 30 }); setIsEditingService(true); }} className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Novo Corte</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(s => (
                 <div key={s.id} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 flex justify-between items-center group">
                    <div>
                       <p className="font-bold text-white uppercase">{s.name}</p>
                       <p className="text-[11px] text-amber-500 font-black">€ {s.price.toFixed(2)} • {s.durationMinutes}m</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingService(s); setIsEditingService(true); }} className="text-slate-500 hover:text-white p-2"><i className="fa-solid fa-pen"></i></button>
                       <button onClick={() => { if(confirm('Tem certeza?')) { storageService.deleteService(s.id); loadData(); } }} className="text-slate-500 hover:text-red-500 p-2"><i className="fa-solid fa-trash"></i></button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* MODAL CHECKOUT REFINADO */}
      {isFinishingApp && currentFinishingApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-8 animate-fade-in shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20"><i className="fa-solid fa-basket-shopping text-blue-500 text-2xl"></i></div>
                <h3 className="text-3xl font-brand text-white uppercase tracking-widest leading-none">Finalizar & Checkout</h3>
                <div className="mt-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800 text-left">
                  <p className="text-[10px] text-slate-500 font-black uppercase">Cliente: <span className="text-white">{currentFinishingApp.customerName}</span></p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 font-black uppercase">{currentFinishingService?.name}</p>
                    <p className="text-amber-500 font-brand">€ {(currentFinishingService?.price || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase px-2">Produtos Extras (€)</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-brand text-amber-500">€</span>
                      <input type="number" step="0.01" autoFocus value={productSaleValue} onChange={e => setProductSaleValue(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 pl-8 rounded-2xl text-white font-brand text-3xl outline-none focus:border-amber-500 transition-colors" />
                   </div>
                   <p className="text-[9px] text-slate-600 px-2 italic">Ex: Pomadas, óleos ou shampoos vendidos agora.</p>
                </div>
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex justify-between items-center">
                   <p className="text-[10px] text-slate-400 font-black uppercase">Faturamento Total:</p>
                   <p className="text-2xl font-brand text-amber-500">€ {((currentFinishingService?.price || 0) + (parseFloat(productSaleValue) || 0)).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                 <button onClick={() => handleStatusChange(isFinishingApp, 'completed', parseFloat(productSaleValue) || 0)} className="w-full bg-green-600 text-white font-black py-5 rounded-2xl uppercase text-xs shadow-xl shadow-green-500/10 hover:brightness-110 transition-all">Concluir Atendimento</button>
                 <button onClick={() => setIsFinishingApp(null)} className="w-full text-slate-500 font-black uppercase text-[10px] tracking-widest pt-2 hover:text-white transition-colors">Cancelar</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL EDIÇÃO UNIDADE/LOJA */}
      {isEditingShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
           <form onSubmit={(e) => { e.preventDefault(); storageService.saveShops(editingShop.id ? shops.map(s => s.id === editingShop.id ? (editingShop as Shop) : s) : [...shops, { ...(editingShop as Shop), id: crypto.randomUUID(), latitude:0, longitude:0 }]); setIsEditingShop(false); loadData(); if(onShopUpdate) onShopUpdate(); }} className="bg-slate-900 border border-slate-700 w-full max-w-xl p-10 my-8 rounded-[40px] space-y-6">
              <div className="text-center">
                 <h3 className="text-3xl font-brand text-white uppercase tracking-widest">Configuração da Unidade</h3>
                 <p className="text-[9px] text-slate-500 uppercase font-black">Dados visíveis para os clientes no rodapé e login</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">Nome da Barbearia</label>
                    <input type="text" value={editingShop.name} onChange={e => setEditingShop({...editingShop, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none" required />
                 </div>
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">Endereço Completo</label>
                    <input type="text" value={editingShop.address} onChange={e => setEditingShop({...editingShop, address: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none" required />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">Telemóvel (Exibição)</label>
                    <input type="text" value={editingShop.phone} onChange={e => setEditingShop({...editingShop, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">WhatsApp</label>
                    <input type="text" value={editingShop.whatsapp} onChange={e => setEditingShop({...editingShop, whatsapp: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">Instagram (@)</label>
                    <input type="text" value={editingShop.instagram} onChange={e => setEditingShop({...editingShop, instagram: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">Facebook</label>
                    <input type="text" value={editingShop.facebook} onChange={e => setEditingShop({...editingShop, facebook: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none" />
                 </div>
              </div>
              <div className="flex gap-4">
                 <button type="button" onClick={() => setIsEditingShop(false)} className="flex-1 text-slate-500 font-black uppercase text-xs">Cancelar</button>
                 <button type="submit" className="flex-2 bg-amber-500 text-slate-900 font-black py-4 px-8 rounded-2xl uppercase text-xs">Salvar Unidade</button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default BarberDashboard;
