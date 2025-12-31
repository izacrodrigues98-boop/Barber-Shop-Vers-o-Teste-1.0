
import React, { useState, useEffect, useMemo } from 'react';
import { Service, Appointment, BarberConfig, LoyaltyProfile, Barber, Message } from '../types';
import { storageService } from '../services/storageService';

const POINTS_TO_REDEEM = 10;
const DISCOUNT_VALUE = 20.00;

interface ClientBookingProps {
  clientPhone: string;
}

const ClientBooking: React.FC<ClientBookingProps> = ({ clientPhone }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [config, setConfig] = useState<BarberConfig>(storageService.getConfig());
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyProfile | null>(null);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [observations, setObservations] = useState('');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [localToast, setLocalToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [selectedService, setSelectedService] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Dynamic Greeting based on time of day
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  // Chat state
  const [activeChatAppId, setActiveChatAppId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const activeChatApp = useMemo(() => myAppointments.find(a => a.id === activeChatAppId), [myAppointments, activeChatAppId]);

  useEffect(() => {
    const load = () => {
      setServices(storageService.getServices());
      setBarbers(storageService.getBarbers());
      setConfig(storageService.getConfig());
      const apps = storageService.getAppointments().filter(a => a.customerPhone === clientPhone);
      setMyAppointments(apps.sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()));
      const profile = storageService.getLoyaltyProfile(clientPhone);
      setLoyalty(profile);
      if (profile.name) setName(profile.name);
      if (profile.avatar) setAvatar(profile.avatar);
    };
    load();
    const refreshListener = () => load();
    window.addEventListener('na_regua_status_update', refreshListener);
    window.addEventListener('na_regua_shop_update', refreshListener);
    return () => {
      window.removeEventListener('na_regua_status_update', refreshListener);
      window.removeEventListener('na_regua_shop_update', refreshListener);
    };
  }, [clientPhone]);

  const notifyAndReload = (msg: string) => {
    setLocalToast({ msg, type: 'success' });
    setTimeout(() => { setLocalToast(null); window.location.reload(); }, 1500);
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedService || !selectedBarber || !date || !time) {
      alert("Por favor, preencha o nome e selecione serviço, barbeiro e horário.");
      return;
    }

    const selectedDateTime = new Date(`${date}T${time}:00`);
    const minAdvanceTime = new Date();
    minAdvanceTime.setHours(minAdvanceTime.getHours() + 1);

    if (selectedDateTime < minAdvanceTime) {
      alert("Agendamentos devem ser feitos com no mínimo 1 hora de antecedência.");
      return;
    }

    setIsSubmitting(true);
    storageService.updateClientProfile(clientPhone, { name, avatar: avatar || undefined });
    
    storageService.addAppointment({
      id: crypto.randomUUID(),
      customerName: name,
      customerPhone: clientPhone,
      serviceId: selectedService,
      barberId: selectedBarber,
      dateTime: `${date}T${time}:00`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      usedLoyaltyPoints: useLoyaltyPoints,
      discountApplied: useLoyaltyPoints ? DISCOUNT_VALUE : 0,
      messages: [],
      observations: observations
    });

    if (useLoyaltyPoints) storageService.updateLoyaltyPoints(clientPhone, -POINTS_TO_REDEEM);

    setTimeout(() => {
      setIsSubmitting(false);
      setBookingSuccess(true);
    }, 1200);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatAppId || !chatMessage.trim()) return;
    storageService.addMessage(activeChatAppId, 'client', chatMessage);
    setChatMessage('');
  };

  const handleFinishBooking = () => window.location.reload();
  const handleLogout = () => {
    localStorage.removeItem('na_regua_client_phone');
    window.location.reload();
  };

  const calendarDays = useMemo(() => {
    const now = new Date();
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      if (d.getDay() !== 0) {
        days.push({
          day: d.getDate(),
          dateStr: d.toISOString().split('T')[0],
          weekday: d.toLocaleDateString('pt-BR', { weekday: 'short' })
        });
      }
    }
    return days;
  }, []);

  const availableSlots = useMemo(() => {
    if (!date || !selectedBarber) return [];
    const slots = [];
    const [startH, startM] = config.openTime.split(':').map(Number);
    const [endH, endM] = config.closeTime.split(':').map(Number);
    const minAdvanceTime = new Date();
    minAdvanceTime.setHours(minAdvanceTime.getHours() + 1);

    let current = new Date(`${date}T${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`);
    const end = new Date(`${date}T${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00`);
    const allApps = storageService.getAppointments();
    
    while (current < end) {
      const t = current.toTimeString().substring(0, 5);
      const isBooked = allApps.some(a => 
        a.barberId === selectedBarber && 
        a.dateTime.includes(`${date}T${t}`) && 
        a.status !== 'cancelled'
      );
      if (!isBooked && current > minAdvanceTime) slots.push(t);
      current.setMinutes(current.getMinutes() + config.slotInterval);
    }
    return slots;
  }, [date, selectedBarber, config]);

  if (bookingSuccess) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6 animate-view">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <i className="fa-solid fa-check text-slate-900 text-3xl"></i>
        </div>
        <h2 className="text-4xl font-brand text-white uppercase mb-2">Confirmado!</h2>
        <p className="text-slate-400 mb-10">Agendamento enviado. Aguarde a confirmação por aqui.</p>
        <button onClick={handleFinishBooking} className="w-full bg-amber-500 text-slate-900 font-bold py-4 rounded-2xl uppercase tracking-widest text-sm hover-lift shadow-xl">Fechar</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      {localToast && (
        <div className="fixed top-24 right-4 z-[200] animate-card">
          <div className={`px-6 py-3 rounded-2xl shadow-2xl border-2 flex items-center gap-3 bg-green-600 border-green-400 text-white`}>
             <i className="fa-solid fa-check-circle"></i>
             <p className="font-bold text-xs uppercase tracking-widest">{localToast.msg}</p>
          </div>
        </div>
      )}

      {config.masterNotice && (
        <div className="mb-8 bg-amber-500/10 border border-amber-500/30 p-6 rounded-[32px] flex items-center gap-6 animate-card shadow-lg">
           <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0">
              <i className="fa-solid fa-bullhorn text-slate-900"></i>
           </div>
           <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Aviso</p>
              <p className="text-white text-sm font-medium leading-relaxed">{config.masterNotice}</p>
           </div>
        </div>
      )}

      <div className="mb-12">
        <div className="bg-slate-800/30 p-8 rounded-[40px] border border-slate-700/50 backdrop-blur-md flex flex-col md:flex-row items-center gap-8 animate-card shadow-2xl">
           <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-700 overflow-hidden relative group cursor-pointer hover-scale" onClick={() => setIsEditingProfile(true)}>
             {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-3xl text-slate-700 flex items-center justify-center h-full"></i>}
             <div className="absolute inset-0 bg-amber-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><i className="fa-solid fa-camera text-slate-900"></i></div>
           </div>
           <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-2 justify-center md:justify-start">
                <span className="text-amber-500 font-medium text-sm md:text-base italic">{greetingText},</span>
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <h1 className="text-4xl font-brand text-white uppercase leading-none">{name || 'Seu Nome'}</h1>
                  <button onClick={() => setIsEditingProfile(true)} className="text-slate-500 hover:text-amber-500 transition-colors">
                    <i className="fa-solid fa-pen-to-square"></i>
                  </button>
                </div>
              </div>
              <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Fidelidade: {loyalty?.points || 0}/10 pontos</p>
              <div className="flex gap-1.5 mt-4 justify-center md:justify-start">
                 {[...Array(10)].map((_, i) => (
                   <div key={i} className={`w-3 h-3 rounded-full border transition-all duration-500 ${i < (loyalty?.points || 0) ? 'bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-900 border-slate-700'}`}></div>
                 ))}
              </div>
           </div>
           <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
             {loyalty && loyalty.points >= POINTS_TO_REDEEM && (
               <button onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover-lift ${useLoyaltyPoints ? 'bg-slate-700 text-amber-500 border border-amber-500' : 'bg-amber-500 text-slate-900 shadow-xl'}`}>
                 {useLoyaltyPoints ? 'Desconto Aplicado' : 'Resgatar €20'}
               </button>
             )}
             <button onClick={handleLogout} className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-600 transition-all">
               Desconectar
             </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <form onSubmit={handleBooking} className="lg:col-span-8 space-y-12 bg-slate-800/20 p-10 rounded-[40px] border border-slate-800/50">
           <section className="space-y-6">
              <h2 className="text-2xl font-brand text-white uppercase flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-sm">1</span>
                Identificação e Serviço
              </h2>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Seu Nome</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Como deseja ser chamado?" 
                    className="w-full bg-slate-950/50 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all font-bold" 
                    required 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {services.map(s => (
                    <label key={s.id} className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex justify-between items-center hover-scale ${selectedService === s.id ? 'bg-amber-500/10 border-amber-500 shadow-lg' : 'bg-slate-950/40 border-slate-800'}`}>
                      <input type="radio" name="service" className="hidden" onChange={() => { setSelectedService(s.id); setSelectedBarber(''); setDate(''); setTime(''); }} />
                      <div>
                        <p className={`font-bold uppercase text-sm ${selectedService === s.id ? 'text-amber-500' : 'text-slate-200'}`}>{s.name}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase">{s.durationMinutes} min</p>
                      </div>
                      <p className={`font-brand text-2xl ${selectedService === s.id ? 'text-amber-500' : 'text-slate-500'}`}>€{s.price.toFixed(2)}</p>
                    </label>
                  ))}
                </div>
              </div>
           </section>

           {selectedService && (
             <section className="space-y-6 animate-view">
                <h2 className="text-2xl font-brand text-white uppercase flex items-center gap-4">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-sm">2</span>
                  Escolha o Profissional
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {barbers.filter(b => b.active && b.assignedServices.includes(selectedService)).map(b => (
                    <label key={b.id} className={`p-5 rounded-3xl border-2 cursor-pointer text-center transition-all hover-scale ${selectedBarber === b.id ? 'bg-amber-500/10 border-amber-500 shadow-lg' : 'bg-slate-950/40 border-slate-800'}`}>
                      <input type="radio" name="barber" className="hidden" onChange={() => { setSelectedBarber(b.id); setDate(''); setTime(''); }} />
                      <div className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center">
                        {b.avatar ? <img src={b.avatar} className="w-full h-full object-cover" /> : <div className="text-amber-500 font-brand text-2xl">{b.name.charAt(0)}</div>}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${selectedBarber === b.id ? 'text-amber-500' : 'text-slate-500'}`}>{b.name}</p>
                    </label>
                  ))}
                </div>
             </section>
           )}

           {selectedBarber && (
             <section className="space-y-6 animate-view">
                <h2 className="text-2xl font-brand text-white uppercase flex items-center gap-4">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-sm">3</span>
                  Horário e Observações
                </h2>
                <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
                  {calendarDays.map(d => (
                    <button key={d.dateStr} type="button" onClick={() => { setDate(d.dateStr); setTime(''); }} className={`flex-shrink-0 w-16 h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${date === d.dateStr ? 'bg-amber-500 border-amber-500 text-slate-900' : 'bg-slate-950/40 border-slate-800 text-slate-500'}`}>
                      <span className="text-[10px] font-black uppercase mb-1">{d.weekday}</span>
                      <span className="text-xl font-brand">{d.day}</span>
                    </button>
                  ))}
                </div>
                {date && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 animate-view">
                    {availableSlots.length > 0 ? availableSlots.map(t => (
                      <button key={t} type="button" onClick={() => setTime(t)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${time === t ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-xl' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        {t}
                      </button>
                    )) : <p className="col-span-full text-center text-slate-600 italic py-4 text-xs bg-slate-950/50 rounded-2xl">Não há horários disponíveis para este dia.</p>}
                  </div>
                )}
                
                <div className="pt-6 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-2 tracking-widest">Observações Adicionais</label>
                  <textarea 
                    value={observations} 
                    onChange={e => setObservations(e.target.value)} 
                    placeholder="Ex: Gostaria de usar um produto específico ou falar sobre o corte..." 
                    className="w-full bg-slate-950/50 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all text-xs min-h-[100px] resize-none"
                  />
                </div>
             </section>
           )}

           <div className="pt-10 flex flex-col md:flex-row items-center justify-between border-t border-slate-800 gap-6">
              <div>
                 <p className="text-[10px] text-slate-500 font-black uppercase mb-1 tracking-widest">Total Estimado</p>
                 <p className="text-4xl font-brand text-white">€ {((services.find(s => s.id === selectedService)?.price || 0) - (useLoyaltyPoints ? DISCOUNT_VALUE : 0)).toFixed(2)}</p>
              </div>
              <button type="submit" disabled={!time || !name || isSubmitting} className="bg-amber-500 text-slate-900 font-black py-5 px-12 rounded-2xl uppercase tracking-widest text-sm shadow-2xl hover-lift active:scale-95 disabled:opacity-20 transition-all w-full md:w-auto">
                {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Confirmar Agendamento'}
              </button>
           </div>
        </form>

        <aside className="lg:col-span-4 space-y-8 animate-card">
           <div className="bg-slate-800/20 border border-slate-800 p-8 rounded-[40px] shadow-2xl">
              <h3 className="text-xl font-brand text-white uppercase mb-6 flex items-center gap-3">
                <i className="fa-solid fa-clock-rotate-left text-amber-500"></i>
                Seus Agendamentos
              </h3>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
                {myAppointments.length === 0 ? (
                    <p className="text-center text-slate-600 italic py-10 text-xs">Ainda não há registros de cortes.</p>
                ) : myAppointments.map(app => (
                  <div key={app.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50 group transition-all">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                         <p className="font-bold text-white text-xs">{services.find(s => s.id === app.serviceId)?.name}</p>
                         <p className="text-[9px] text-amber-500/70 font-black uppercase mt-0.5">Com: {barbers.find(b => b.id === app.barberId)?.name}</p>
                       </div>
                       <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${app.status === 'confirmed' ? 'bg-blue-600' : app.status === 'pending' ? 'bg-amber-500 text-slate-900' : app.status === 'completed' ? 'bg-green-600' : 'bg-slate-800'}`}>
                         {app.status === 'pending' ? 'Aguardando' : app.status === 'confirmed' ? 'Confirmado' : app.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                       </span>
                    </div>
                    <div className="flex justify-between items-end mt-3">
                       <p className="text-[10px] text-slate-500 uppercase font-bold">
                        {new Date(app.dateTime).toLocaleDateString()} • {new Date(app.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                       </p>
                       <button onClick={() => setActiveChatAppId(app.id)} className="bg-slate-800 hover:bg-amber-500 hover:text-slate-900 p-2.5 rounded-xl transition-all text-xs shadow-lg">
                          <i className="fa-solid fa-comment-dots"></i>
                       </button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </aside>
      </div>

      {/* Chat Modal */}
      {activeChatAppId && activeChatApp && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-md h-[600px] flex flex-col rounded-[40px] shadow-2xl animate-card overflow-hidden">
              <div className="p-6 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                 <div>
                   <h3 className="font-brand text-xl text-white uppercase tracking-widest">Conversar com o Barbeiro</h3>
                   <p className="text-[10px] text-slate-500 uppercase font-black">Barbeiro: {barbers.find(b => b.id === activeChatApp.barberId)?.name}</p>
                 </div>
                 <button onClick={() => setActiveChatAppId(null)} className="text-slate-500 hover:text-white p-2"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-slate-950/20">
                 {(activeChatApp.messages || []).map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] p-4 rounded-2xl text-xs font-medium ${msg.sender === 'client' ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-white border border-slate-700 shadow-lg'}`}>
                          {msg.text}
                          <p className={`text-[8px] mt-1 opacity-50 ${msg.sender === 'client' ? 'text-slate-800' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                       </div>
                    </div>
                 ))}
                 {(activeChatApp.messages || []).length === 0 && <p className="text-center text-slate-600 italic py-20 text-xs">Mande um "Olá" para começar!</p>}
              </div>
              <div className="p-4 bg-slate-800 border-t border-slate-700 space-y-3">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                   <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Tire uma dúvida..." className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-amber-500 transition-all shadow-inner" />
                   <button type="submit" className="w-12 h-12 bg-amber-500 rounded-xl text-slate-900 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"><i className="fa-solid fa-paper-plane"></i></button>
                </form>
                <button onClick={() => setActiveChatAppId(null)} className="w-full bg-slate-700 text-slate-400 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors shadow-inner">Sair do Chat</button>
              </div>
           </div>
        </div>
      )}

      {/* Perfil Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-view">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-8 animate-card shadow-2xl">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest">Meus Dados</h3>
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center">
                    {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-3xl text-slate-700"></i>}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center cursor-pointer shadow-xl border-2 border-slate-900 hover-lift"><i className="fa-solid fa-camera text-slate-900"></i><input type="file" className="hidden" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const r = new FileReader();
                      r.onload = () => setAvatar(r.result as string);
                      r.readAsDataURL(file);
                    }
                  }} /></label>
                </div>
                <div className="w-full space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-1 tracking-widest">Nome Completo</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500 transition-all font-bold" />
                </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setIsEditingProfile(false)} className="flex-1 text-slate-500 text-[10px] font-black uppercase hover:text-white transition-colors">Cancelar</button>
                 <button onClick={() => { storageService.updateClientProfile(clientPhone, { name, avatar: avatar || undefined }); setIsEditingProfile(false); notifyAndReload("Perfil atualizado!"); }} className="flex-2 bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest hover-lift">Guardar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientBooking;
