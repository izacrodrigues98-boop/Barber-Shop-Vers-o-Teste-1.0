
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
  const [selectedBarberFilter, setSelectedBarberFilter] = useState<string>('all');
  
  // Perfil Local do Barbeiro logado
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Checkout e Vendas
  const [isFinishingAppId, setIsFinishingAppId] = useState<string | null>(null);
  const [productSaleValue, setProductSaleValue] = useState<string>('0');
  const currentFinishingApp = useMemo(() => appointments.find(a => a.id === isFinishingAppId), [appointments, isFinishingAppId]);

  // Meta mensal individual
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState<string>('');
  const myGoal = useMemo(() => myProfile?.config?.monthlyGoal ?? config.monthlyGoal, [myProfile, config]);

  // Gráfico
  const [chartPeriod, setChartPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Agendamento manual pelo barbeiro
  const [isAddingAppointment, setIsAddingAppointment] = useState(false);
  const [newAppForm, setNewAppForm] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    barberId: '',
    date: '',
    time: ''
  });

  // Modais Administrativos (apenas para Admin)
  const [isEditingBarber, setIsEditingBarber] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Partial<Barber>>({ name: '', username: '', password: '', assignedServices: [], active: true, isAdmin: false });
  const [isEditingService, setIsEditingService] = useState(false);
  const [editingService, setEditingService] = useState<Partial<Service>>({ name: '', price: 0, durationMinutes: 30, description: '' });
  const [isEditingShop, setIsEditingShop] = useState(false);
  const [editingShop, setEditingShop] = useState<Partial<Shop>>({ name: '', address: '', phone: '', instagram: '', active: true });

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('na_regua_new_booking', handleRefresh);
    window.addEventListener('na_regua_status_update', handleRefresh);
    window.addEventListener('na_regua_shop_update', handleRefresh);
    return () => {
      window.removeEventListener('na_regua_new_booking', handleRefresh);
      window.removeEventListener('na_regua_status_update', handleRefresh);
      window.removeEventListener('na_regua_shop_update', handleRefresh);
    };
  }, [currentUser]);

  useEffect(() => {
    if (myProfile) {
      setProfileName(myProfile.name);
      setProfileAvatar(myProfile.avatar || null);
      setTempGoal((myProfile.config?.monthlyGoal ?? config.monthlyGoal).toString());
    }
  }, [myProfile, config]);

  const loadData = () => {
    setAppointments(storageService.getAppointments().sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()));
    setServices(storageService.getServices());
    setBarbers(storageService.getBarbers());
    setShops(storageService.getShops());
    setConfig(storageService.getConfig());
  };

  const handleStatusChange = (id: string, status: Appointment['status'], productsRev: number = 0) => {
    storageService.updateAppointmentStatus(id, status, productsRev);
    setIsFinishingAppId(null);
    setProductSaleValue('0');
    loadData();
  };

  const handleSaveGoal = () => {
    const newGoalValue = parseFloat(tempGoal);
    if (!isNaN(newGoalValue) && myProfile) {
      const updatedBarberConfig = { ...(myProfile.config || config), monthlyGoal: newGoalValue };
      storageService.updateBarberProfile(myProfile.username, { config: updatedBarberConfig });
      loadData();
      setIsEditingGoal(false);
    }
  };

  const handleBarberBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppForm.customerName || !newAppForm.serviceId || !newAppForm.barberId || !newAppForm.date || !newAppForm.time) return;
    storageService.addAppointment({
      id: crypto.randomUUID(),
      customerName: newAppForm.customerName,
      customerPhone: newAppForm.customerPhone || '000000000',
      serviceId: newAppForm.serviceId,
      barberId: newAppForm.barberId,
      dateTime: `${newAppForm.date}T${newAppForm.time}:00`,
      status: 'confirmed', 
      createdAt: new Date().toISOString()
    });
    setIsAddingAppointment(false);
    setNewAppForm({ customerName: '', customerPhone: '', serviceId: '', barberId: '', date: '', time: '' });
    loadData();
  };

  const handleSaveProfile = () => {
    if (myProfile) {
      storageService.updateBarberProfile(myProfile.username, { name: profileName, avatar: profileAvatar || undefined });
      loadData();
      alert('Perfil atualizado com sucesso!');
    }
  };

  const handleSaveBarber = (e: React.FormEvent) => {
    e.preventDefault();
    const currentBarbers = storageService.getBarbers();
    if (editingBarber.id) {
      storageService.saveBarbers(currentBarbers.map(b => b.id === editingBarber.id ? { ...b, ...editingBarber } : b) as Barber[]);
    } else {
      storageService.saveBarbers([...currentBarbers, { ...(editingBarber as Barber), id: crypto.randomUUID(), assignedServices: services.map(s => s.id), active: true }]);
    }
    setIsEditingBarber(false);
    loadData();
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    const currentServices = storageService.getServices();
    if (editingService.id) {
      storageService.saveServices(currentServices.map(s => s.id === editingService.id ? { ...s, ...editingService } : s) as Service[]);
    } else {
      storageService.saveServices([...currentServices, { ...(editingService as Service), id: crypto.randomUUID() }]);
    }
    setIsEditingService(false);
    loadData();
  };

  const handleSaveShop = (e: React.FormEvent) => {
    e.preventDefault();
    const currentShops = storageService.getShops();
    if (editingShop.id) {
      storageService.saveShops(currentShops.map(s => s.id === editingShop.id ? { ...s, ...editingShop } : s) as Shop[]);
    } else {
      storageService.saveShops([...currentShops, { ...(editingShop as Shop), id: crypto.randomUUID(), active: true, whatsapp: editingShop.phone || '', facebook: '', latitude: 0, longitude: 0 }]);
    }
    setIsEditingShop(false);
    if (onShopUpdate) onShopUpdate();
    loadData();
  };

  const billingData = useMemo(() => {
    const completed = appointments.filter(a => a.status === 'completed');
    const filteredByAccess = isAdmin 
      ? (selectedBarberFilter === 'all' ? completed : completed.filter(a => a.barberId === selectedBarberFilter))
      : completed.filter(a => a.barberId === myProfile?.id);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentYear = now.getFullYear();
    
    let daily = 0, monthly = 0, productsMonthly = 0;
    
    // Gráfico Mensal (últimos 14 dias)
    const dailyChartData = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      dailyChartData.push({ label: d.toLocaleDateString([], {day:'2-digit', month:'2-digit'}), date: d.toISOString().split('T')[0], value: 0 });
    }

    // Gráfico Anual (12 meses)
    const monthsNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const annualChartData = monthsNames.map((m, i) => ({ label: m, month: i, value: 0 }));

    filteredByAccess.forEach(app => {
      const appDateStr = app.dateTime.split('T')[0];
      const appDate = new Date(app.dateTime);
      const srv = services.find(s => s.id === app.serviceId);
      const totalRevenue = ((srv?.price || 0) - (app.discountApplied || 0)) + (app.productsRevenue || 0);
      
      if (appDateStr === todayStr) daily += totalRevenue;
      if (appDate >= firstDayOfMonth) { monthly += totalRevenue; productsMonthly += (app.productsRevenue || 0); }
      
      // Fill daily chart
      const dayIndex = dailyChartData.findIndex(d => d.date === appDateStr);
      if (dayIndex !== -1) dailyChartData[dayIndex].value += totalRevenue;

      // Fill annual chart (if current year)
      if (appDate.getFullYear() === currentYear) {
        annualChartData[appDate.getMonth()].value += totalRevenue;
      }
    });

    const activeChartData = chartPeriod === 'monthly' ? dailyChartData : annualChartData;
    const maxValue = Math.max(...activeChartData.map(d => d.value), 1);

    return { daily, monthly, productsMonthly, activeChartData, maxValue };
  }, [appointments, services, isAdmin, myProfile, selectedBarberFilter, chartPeriod]);

  const filteredAppointments = useMemo(() => {
    let filtered = appointments;
    if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
    if (!isAdmin) filtered = filtered.filter(a => a.barberId === myProfile?.id);
    return filtered;
  }, [appointments, statusFilter, isAdmin, myProfile]);

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
          {['agenda', 'faturamento', 'equipe', 'perfil', 'cortes', 'lojas'].map(tab => (
            (!['equipe', 'cortes', 'lojas'].includes(tab) || isAdmin) && (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-5 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap uppercase tracking-widest ${activeTab === tab ? 'bg-amber-500 text-slate-900' : 'text-slate-500 hover:text-white'}`}>
                {tab === 'equipe' ? 'Equipa' : tab === 'lojas' ? 'Unidades' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          ))}
        </div>
      </div>

      {activeTab === 'agenda' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="flex items-center gap-4">
                <h2 className="text-2xl font-brand text-white uppercase">Agenda</h2>
                <button 
                   onClick={() => { setNewAppForm({...newAppForm, barberId: myProfile?.id || ''}); setIsAddingAppointment(true); }} 
                   className="bg-amber-500 text-slate-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                   <i className="fa-solid fa-calendar-plus mr-2"></i> Novo Agendamento
                </button>
             </div>
             <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase p-2 rounded-xl text-slate-300 outline-none w-full md:w-auto">
               <option value="pending">Pendentes</option><option value="confirmed">Confirmados</option><option value="all">Ver Tudo</option>
             </select>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {filteredAppointments.length > 0 ? filteredAppointments.map(app => (
              <div key={app.id} className={`bg-slate-800/40 p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-center gap-6 ${app.status === 'pending' ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700'}`}>
                <div className="flex gap-4 items-center">
                   <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center font-brand text-2xl text-amber-500 border border-slate-700">{app.customerName.charAt(0)}</div>
                   <div>
                      <h4 className="font-bold text-white">{app.customerName}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{services.find(s => s.id === app.serviceId)?.name} • {new Date(app.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   {app.status === 'pending' && <button onClick={() => handleStatusChange(app.id, 'confirmed')} className="flex-1 bg-green-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Aceitar</button>}
                   {app.status === 'confirmed' && <button onClick={() => setIsFinishingAppId(app.id)} className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">Finalizar</button>}
                   <button onClick={() => handleStatusChange(app.id, 'cancelled')} className="flex-1 bg-red-600/10 text-red-500 px-6 py-2 rounded-xl text-[10px] font-bold border border-red-500/20">Recusar</button>
                </div>
              </div>
            )) : <p className="text-center py-20 text-slate-600 italic">Sem agendamentos no momento.</p>}
          </div>
        </div>
      )}

      {activeTab === 'faturamento' && (
        <div className="space-y-10 animate-fade-in">
           <div className="flex flex-col md:flex-row justify-between items-end gap-6">
              <h2 className="text-2xl font-brand text-white uppercase tracking-wider">Desempenho Financeiro</h2>
              {isAdmin && (
                <select value={selectedBarberFilter} onChange={e => setSelectedBarberFilter(e.target.value)} className="bg-slate-800 border border-slate-700 text-[10px] font-bold uppercase p-2 rounded-xl text-slate-300 outline-none">
                  <option value="all">Toda a Equipa</option>{barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { l: 'Hoje', v: billingData.daily, c: 'text-white' },
                { l: 'Mês Atual', v: billingData.monthly, c: 'text-green-500' },
                { l: 'Venda Produtos', v: billingData.productsMonthly, c: 'text-violet-400' },
                { l: 'Minha Meta Mensal', v: myGoal, c: 'text-amber-500', isGoal: true }
              ].map((item, i) => (
                <div key={i} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 text-center relative group min-h-[120px] flex flex-col justify-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">{item.l}</p>
                  {item.isGoal && isEditingGoal ? (
                    <div className="flex flex-col gap-2">
                       <input type="number" value={tempGoal} onChange={e => setTempGoal(e.target.value)} autoFocus className="bg-slate-950 border border-slate-700 text-white p-2 rounded-xl text-center outline-none w-full text-sm font-bold" />
                       <div className="flex gap-2 justify-center">
                          <button onClick={handleSaveGoal} className="bg-green-600 text-white text-[9px] px-3 py-1 rounded-lg font-black">Salvar</button>
                          <button onClick={() => setIsEditingGoal(false)} className="bg-slate-700 text-white text-[9px] px-3 py-1 rounded-lg font-black">Sair</button>
                       </div>
                    </div>
                  ) : (
                    <>
                      <p className={`text-2xl font-brand ${item.c}`}>€ {item.v.toFixed(2)}</p>
                      {item.isGoal && (
                        <button 
                           onClick={() => setIsEditingGoal(true)} 
                           className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-slate-500 hover:text-amber-500 p-1"
                           title="Alterar minha meta mensal"
                        >
                          <i className="fa-solid fa-pen text-[10px]"></i>
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
           </div>

           {/* Gráfico Dinâmico */}
           <div className="bg-slate-800/20 border border-slate-800 p-8 rounded-[40px] space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-brand text-white uppercase tracking-widest">Fluxo de Receita</h3>
                 <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button 
                      onClick={() => setChartPeriod('monthly')} 
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${chartPeriod === 'monthly' ? 'bg-amber-500 text-slate-900' : 'text-slate-500 hover:text-white'}`}
                    >
                      Mensal
                    </button>
                    <button 
                      onClick={() => setChartPeriod('annual')} 
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${chartPeriod === 'annual' ? 'bg-amber-500 text-slate-900' : 'text-slate-500 hover:text-white'}`}
                    >
                      Anual
                    </button>
                 </div>
              </div>
              
              <div className="h-64 flex items-end justify-between gap-2 px-2 pt-10 relative">
                 {/* Grid Lines */}
                 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
                    {[...Array(5)].map((_, i) => <div key={i} className="w-full h-px bg-white"></div>)}
                 </div>

                 {billingData.activeChartData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                       <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 border border-slate-700">
                          € {d.value.toFixed(2)}
                       </div>
                       <div 
                          className="w-full max-w-[40px] bg-gradient-to-t from-amber-600/20 to-amber-500 rounded-t-lg transition-all duration-700 ease-out group-hover:brightness-125"
                          style={{ height: `${(d.value / billingData.maxValue) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                       ></div>
                       <span className="mt-3 text-[8px] font-black text-slate-600 uppercase tracking-tighter truncate w-full text-center">
                          {d.label}
                       </span>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'equipe' && isAdmin && (
        <div className="space-y-8 animate-fade-in">
           <div className="flex justify-between items-center">
              <h2 className="text-2xl font-brand text-white uppercase tracking-wider">Gestão de Equipa</h2>
              <button onClick={() => { setEditingBarber({ name: '', username: '', password: '', active: true, isAdmin: false }); setIsEditingBarber(true); }} className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Novo Barbeiro</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {barbers.map(barber => (
                 <div key={barber.id} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                       <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center">
                          {barber.avatar ? <img src={barber.avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-slate-700 text-2xl"></i>}
                       </div>
                       <div className="flex-1">
                          <h4 className="font-bold text-white text-lg">{barber.name}</h4>
                          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{barber.isAdmin ? 'Admin Master' : 'Profissional'}</p>
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingBarber(barber); setIsEditingBarber(true); }} className="flex-1 bg-slate-700 text-white py-2 rounded-xl text-[9px] font-black uppercase">Editar</button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'cortes' && isAdmin && (
        <div className="space-y-8 animate-fade-in">
           <div className="flex justify-between items-center">
              <h2 className="text-2xl font-brand text-white uppercase tracking-wider">Gestão de Serviços</h2>
              <button onClick={() => { setEditingService({ name: '', price: 0, durationMinutes: 30, description: '' }); setIsEditingService(true); }} className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Novo Serviço</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <div key={service.id} className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700 flex flex-col justify-between">
                   <div>
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-white text-lg leading-tight">{service.name}</h4>
                        <p className="font-brand text-2xl text-amber-500">€{service.price.toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 line-clamp-2">{service.description}</p>
                   </div>
                   <div className="flex gap-2 mt-6">
                      <button onClick={() => { setEditingService(service); setIsEditingService(true); }} className="flex-1 bg-slate-700 text-white py-2 rounded-xl text-[9px] font-black uppercase">Editar</button>
                      <button onClick={() => { if(confirm('Excluir este serviço?')) storageService.deleteService(service.id); loadData(); }} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"><i className="fa-solid fa-trash-can"></i></button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'lojas' && isAdmin && (
        <div className="space-y-8 animate-fade-in">
           <div className="flex justify-between items-center">
              <h2 className="text-2xl font-brand text-white uppercase tracking-wider">Unidades</h2>
              <button onClick={() => { setEditingShop({ name: '', address: '', phone: '', instagram: '', active: true }); setIsEditingShop(true); }} className="bg-amber-500 text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Nova Unidade</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shops.map(shop => (
                <div key={shop.id} className="bg-slate-800/40 p-8 rounded-[40px] border border-slate-700 flex flex-col md:flex-row gap-6 items-center">
                   <div className="flex-1 text-center md:text-left">
                      <h4 className="text-xl font-brand text-white uppercase tracking-widest mb-2">{shop.name}</h4>
                      <p className="text-xs text-slate-500 mb-3">{shop.address}</p>
                   </div>
                   <button onClick={() => { setEditingShop(shop); setIsEditingShop(true); }} className="w-12 h-12 rounded-2xl bg-slate-700 text-white flex items-center justify-center hover:bg-amber-500 transition-all">
                     <i className="fa-solid fa-pen-to-square"></i>
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="max-w-xl mx-auto space-y-12 animate-fade-in pt-10">
           <div className="text-center space-y-6">
              <div className="relative w-32 h-32 mx-auto">
                 <div className="w-full h-full rounded-[40px] bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center shadow-2xl">
                    {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user-tie text-slate-600 text-5xl"></i>}
                 </div>
                 <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center cursor-pointer border-4 border-slate-900 shadow-xl text-slate-900 hover:scale-110 transition-transform">
                    <i className="fa-solid fa-camera"></i>
                    <input type="file" className="hidden" accept="image/*" onChange={e => {
                       const file = e.target.files?.[0];
                       if (file) {
                          const r = new FileReader();
                          r.onload = () => setProfileAvatar(r.result as string);
                          r.readAsDataURL(file);
                       }
                    }} />
                 </label>
              </div>
              <h3 className="text-2xl font-brand text-white uppercase">Meus Dados Profissionais</h3>
           </div>
           <div className="space-y-6 bg-slate-800/20 p-8 rounded-[40px] border border-slate-700/50">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase px-2">Nome Público</label>
                 <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500" />
              </div>
              <button onClick={handleSaveProfile} className="w-full bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-xl">Salvar Alterações</button>
           </div>
        </div>
      )}

      {/* MODAL NOVO AGENDAMENTO (BARBEIRO) */}
      {isAddingAppointment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <form onSubmit={handleBarberBooking} className="bg-slate-900 border border-slate-700 w-full max-w-md p-10 rounded-[40px] space-y-6 animate-fade-in shadow-2xl overflow-y-auto max-h-[90vh]">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest">Marcar Horário Manual</h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">Nome do Cliente</label>
                    <input type="text" placeholder="Nome" value={newAppForm.customerName} onChange={e => setNewAppForm({...newAppForm, customerName: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-amber-500" required />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">Telemóvel (Opcional)</label>
                    <input type="tel" value={newAppForm.customerPhone} onChange={e => setNewAppForm({...newAppForm, customerPhone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2">Serviço / Tipo de Corte</label>
                    <select value={newAppForm.serviceId} onChange={e => setNewAppForm({...newAppForm, serviceId: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required>
                       <option value="">Selecione...</option>
                       {services.map(s => <option key={s.id} value={s.id}>{s.name} - €{s.price}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase px-2">Data</label>
                       <input type="date" value={newAppForm.date} onChange={e => setNewAppForm({...newAppForm, date: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-500 uppercase px-2">Hora</label>
                       <input type="time" value={newAppForm.time} onChange={e => setNewAppForm({...newAppForm, time: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                    </div>
                 </div>
              </div>
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsAddingAppointment(false)} className="flex-1 text-slate-500 font-black uppercase text-xs">Cancelar</button>
                 <button type="submit" className="flex-2 bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase text-xs">Salvar</button>
              </div>
           </form>
        </div>
      )}

      {/* MODAL EDITAR BARBEIRO */}
      {isEditingBarber && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <form onSubmit={handleSaveBarber} className="bg-slate-900 border border-slate-700 w-full max-w-md p-10 rounded-[40px] space-y-6 animate-fade-in shadow-2xl">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest">{editingBarber.id ? 'Editar Barbeiro' : 'Novo Barbeiro'}</h3>
              <div className="space-y-4">
                 <input type="text" placeholder="Nome Completo" value={editingBarber.name} onChange={e => setEditingBarber({...editingBarber, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                 <input type="text" placeholder="Login" value={editingBarber.username} onChange={e => setEditingBarber({...editingBarber, username: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required disabled={!!editingBarber.id} />
                 <input type="password" placeholder="Senha" value={editingBarber.password} onChange={e => setEditingBarber({...editingBarber, password: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                 <label className="flex items-center gap-3 px-2">
                    <input type="checkbox" checked={editingBarber.isAdmin} onChange={e => setEditingBarber({...editingBarber, isAdmin: e.target.checked})} className="w-5 h-5 accent-amber-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Administrador</span>
                 </label>
              </div>
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsEditingBarber(false)} className="flex-1 text-slate-500 font-black uppercase text-xs">Cancelar</button>
                 <button type="submit" className="flex-2 bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase text-xs">Salvar</button>
              </div>
           </form>
        </div>
      )}

      {/* MODAL EDITAR SERVIÇO */}
      {isEditingService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <form onSubmit={handleSaveService} className="bg-slate-900 border border-slate-700 w-full max-w-md p-10 rounded-[40px] space-y-6 animate-fade-in shadow-2xl">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest">{editingService.id ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <div className="space-y-4">
                 <input type="text" placeholder="Nome" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                 <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Preço (€)" value={editingService.price} onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                    <input type="number" placeholder="Duração (min)" value={editingService.durationMinutes} onChange={e => setEditingService({...editingService, durationMinutes: parseInt(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                 </div>
              </div>
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsEditingService(false)} className="flex-1 text-slate-500 font-black uppercase text-xs">Cancelar</button>
                 <button type="submit" className="flex-2 bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase text-xs">Salvar</button>
              </div>
           </form>
        </div>
      )}

      {/* MODAL EDITAR UNIDADE */}
      {isEditingShop && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <form onSubmit={handleSaveShop} className="bg-slate-900 border border-slate-700 w-full max-w-md p-10 rounded-[40px] space-y-6 animate-fade-in shadow-2xl">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest">{editingShop.id ? 'Editar Unidade' : 'Nova Unidade'}</h3>
              <div className="space-y-4">
                 <input type="text" placeholder="Nome" value={editingShop.name} onChange={e => setEditingShop({...editingShop, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                 <input type="text" placeholder="Endereço" value={editingShop.address} onChange={e => setEditingShop({...editingShop, address: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
                 <input type="tel" placeholder="Telefone" value={editingShop.phone} onChange={e => setEditingShop({...editingShop, phone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-white outline-none" required />
              </div>
              <div className="flex gap-4 pt-4">
                 <button type="button" onClick={() => setIsEditingShop(false)} className="flex-1 text-slate-500 font-black uppercase text-xs">Cancelar</button>
                 <button type="submit" className="flex-2 bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase text-xs">Salvar</button>
              </div>
           </form>
        </div>
      )}

      {/* MODAL CHECKOUT */}
      {isFinishingAppId && currentFinishingApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-8 animate-fade-in shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20"><i className="fa-solid fa-basket-shopping text-blue-500 text-2xl"></i></div>
                <h3 className="text-3xl font-brand text-white uppercase tracking-widest leading-none">Checkout</h3>
                <div className="mt-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800 text-left">
                    <p className="text-[10px] text-slate-500 font-black uppercase">Cliente: <span className="text-white">{currentFinishingApp.customerName}</span></p>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800">
                      <p className="text-[10px] text-slate-500 font-black uppercase">{services.find(s => s.id === currentFinishingApp.serviceId)?.name}</p>
                      <p className="text-amber-500 font-brand">€ {(services.find(s => s.id === currentFinishingApp.serviceId)?.price || 0).toFixed(2)}</p>
                    </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase px-2">Produtos Extras (€)</label>
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-brand text-amber-500">€</span>
                      <input type="number" step="0.01" autoFocus value={productSaleValue} onChange={e => setProductSaleValue(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 pl-8 rounded-2xl text-white font-brand text-3xl outline-none focus:border-amber-500" />
                   </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                 <button onClick={() => handleStatusChange(isFinishingAppId, 'completed', parseFloat(productSaleValue) || 0)} className="w-full bg-green-600 text-white font-black py-5 rounded-2xl uppercase text-xs">Concluir Atendimento</button>
                 <button onClick={() => setIsFinishingAppId(null)} className="w-full text-slate-500 font-black uppercase text-[10px]">Cancelar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BarberDashboard;
