
import React, { useState, useEffect, useMemo } from 'react';
import { Service, Appointment, BarberConfig, LoyaltyProfile, Barber } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';

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

  // Profile
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Booking state
  const [selectedService, setSelectedService] = useState('');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Gemini State
  const [aiDescription, setAiDescription] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

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
    window.addEventListener('na_regua_status_update', load);
    return () => window.removeEventListener('na_regua_status_update', load);
  }, [clientPhone]);

  const handleAiConsult = async () => {
    if (!aiDescription) return;
    setIsAiLoading(true);
    const result = await geminiService.getStyleRecommendation(aiDescription);
    setAiSuggestion(result.suggestion);
    setIsAiLoading(false);
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedService || !selectedBarber || !date || !time) {
      alert("Por favor, preencha todos os campos, incluindo o seu nome.");
      return;
    }
    setIsSubmitting(true);
    
    // Atualiza o perfil com o nome/avatar atual antes de agendar
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
      discountApplied: useLoyaltyPoints ? DISCOUNT_VALUE : 0
    });

    if (useLoyaltyPoints) storageService.updateLoyaltyPoints(clientPhone, -POINTS_TO_REDEEM);

    setTimeout(() => {
      setIsSubmitting(false);
      setBookingSuccess(true);
    }, 1200);
  };

  const calendarDays = useMemo(() => {
    const now = new Date();
    const days = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      if (d.getDay() !== 0) { // No Sundays
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
    let current = new Date(`${date}T${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`);
    const end = new Date(`${date}T${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00`);
    
    const allApps = storageService.getAppointments();
    while (current < end) {
      const t = current.toTimeString().substring(0, 5);
      const isBooked = allApps.some(a => a.barberId === selectedBarber && a.dateTime.includes(`${date}T${t}`) && a.status !== 'cancelled');
      if (!isBooked && current > new Date()) slots.push(t);
      current.setMinutes(current.getMinutes() + config.slotInterval);
    }
    return slots;
  }, [date, selectedBarber, config]);

  if (bookingSuccess) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6 animate-fade-in">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/20">
          <i className="fa-solid fa-check text-slate-900 text-3xl"></i>
        </div>
        <h2 className="text-4xl font-brand text-white uppercase mb-2">Agendado!</h2>
        <p className="text-slate-400 mb-10">Seu barbeiro recebeu seu pedido. Você receberá uma notificação assim que ele confirmar.</p>
        <button onClick={() => setBookingSuccess(false)} className="w-full bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase tracking-widest text-sm">Voltar</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
      {/* Perfil e Fidelidade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 bg-slate-800/30 p-8 rounded-[40px] border border-slate-700/50 backdrop-blur-md flex flex-col md:flex-row items-center gap-8">
           <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-700 overflow-hidden relative group cursor-pointer" onClick={() => setIsEditingProfile(true)}>
             {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-3xl text-slate-700 flex items-center justify-center h-full"></i>}
             <div className="absolute inset-0 bg-amber-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><i className="fa-solid fa-camera text-slate-900"></i></div>
           </div>
           <div className="text-center md:text-left flex-1">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h1 className="text-4xl font-brand text-white uppercase leading-none">Olá, {name || 'Cliente'}</h1>
                <button onClick={() => setIsEditingProfile(true)} className="text-slate-500 hover:text-amber-500 transition-colors">
                   <i className="fa-solid fa-pen-to-square"></i>
                </button>
              </div>
              <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Você tem {loyalty?.points || 0} pontos no cartão fidelidade</p>
              <div className="flex gap-1.5 mt-4 justify-center md:justify-start">
                 {[...Array(10)].map((_, i) => (
                   <div key={i} className={`w-3 h-3 rounded-full border ${i < (loyalty?.points || 0) % 11 ? 'bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-900 border-slate-700'}`}></div>
                 ))}
              </div>
           </div>
           {loyalty && loyalty.points >= POINTS_TO_REDEEM && (
             <button onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${useLoyaltyPoints ? 'bg-slate-700 text-amber-500 border border-amber-500' : 'bg-amber-500 text-slate-900 shadow-xl'}`}>
               {useLoyaltyPoints ? 'Desconto Ativo' : 'Resgatar €20'}
             </button>
           )}
        </div>

        {/* AI Style Assistant */}
        <div className="bg-gradient-to-br from-indigo-600/20 to-slate-800/30 p-8 rounded-[40px] border border-indigo-500/20 backdrop-blur-md">
           <h3 className="text-lg font-brand text-white uppercase tracking-widest mb-4 flex items-center gap-2">
             <i className="fa-solid fa-wand-sparkles text-indigo-400"></i>
             IA Style Consultant
           </h3>
           {!aiSuggestion ? (
             <div className="space-y-3">
               <textarea value={aiDescription} onChange={e => setAiDescription(e.target.value)} placeholder="Ex: Tenho rosto redondo e cabelo liso, o que combina?" className="w-full bg-slate-950/50 border border-slate-700 rounded-2xl p-3 text-xs text-slate-300 outline-none focus:border-indigo-500 h-20 resize-none" />
               <button onClick={handleAiConsult} disabled={isAiLoading || !aiDescription} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase py-3 rounded-xl transition-all disabled:opacity-50">
                 {isAiLoading ? 'Consultando IA...' : 'Analisar meu Estilo'}
               </button>
             </div>
           ) : (
             <div className="animate-fade-in">
               <p className="text-[11px] text-slate-300 italic mb-4 leading-relaxed">"{aiSuggestion}"</p>
               <button onClick={() => setAiSuggestion(null)} className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Nova Consulta</button>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Formulário de Agendamento */}
        <form onSubmit={handleBooking} className="lg:col-span-8 space-y-12 bg-slate-800/20 p-10 rounded-[40px] border border-slate-800/50">
           <section className="space-y-6">
              <h2 className="text-2xl font-brand text-white uppercase tracking-wider flex items-center gap-4">
                <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-sm">1</span>
                Dados e Serviço
              </h2>
              
              <div className="space-y-4 mb-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase px-2">Seu Nome</label>
                    <input 
                       type="text" 
                       value={name} 
                       onChange={e => setName(e.target.value)} 
                       placeholder="Como devemos te chamar?" 
                       className="w-full bg-slate-950/50 border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-amber-500" 
                       required 
                    />
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map(s => (
                  <label key={s.id} className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex justify-between items-center ${selectedService === s.id ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}>
                    <input type="radio" name="service" className="hidden" onChange={() => { setSelectedService(s.id); setSelectedBarber(''); setDate(''); setTime(''); }} />
                    <div>
                      <p className={`font-bold uppercase text-sm ${selectedService === s.id ? 'text-amber-500' : 'text-slate-200'}`}>{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{s.durationMinutes} min</p>
                    </div>
                    <p className={`font-brand text-2xl ${selectedService === s.id ? 'text-amber-500' : 'text-slate-500'}`}>€{s.price.toFixed(2)}</p>
                  </label>
                ))}
              </div>
           </section>

           {selectedService && (
             <section className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-brand text-white uppercase tracking-wider flex items-center gap-4">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-sm">2</span>
                  Escolha o Barbeiro
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {barbers.filter(b => b.active && b.assignedServices.includes(selectedService)).map(b => (
                    <label key={b.id} className={`p-5 rounded-3xl border-2 cursor-pointer text-center transition-all ${selectedBarber === b.id ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/5' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}>
                      <input type="radio" name="barber" className="hidden" onChange={() => { setSelectedBarber(b.id); setDate(''); setTime(''); }} />
                      <div className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden border border-slate-700">
                        {b.avatar ? <img src={b.avatar} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-amber-500 font-brand text-2xl">{b.name.charAt(0)}</div>}
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${selectedBarber === b.id ? 'text-amber-500' : 'text-slate-500'}`}>{b.name}</p>
                    </label>
                  ))}
                </div>
             </section>
           )}

           {selectedBarber && (
             <section className="space-y-6 animate-fade-in">
                <h2 className="text-2xl font-brand text-white uppercase tracking-wider flex items-center gap-4">
                  <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-900 flex items-center justify-center font-bold text-sm">3</span>
                  Dia e Horário
                </h2>
                <div className="flex overflow-x-auto pb-4 gap-3 no-scrollbar">
                  {calendarDays.map(d => (
                    <button key={d.dateStr} type="button" onClick={() => { setDate(d.dateStr); setTime(''); }} className={`flex-shrink-0 w-16 h-20 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${date === d.dateStr ? 'bg-amber-500 border-amber-500 text-slate-900' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                      <span className="text-[10px] font-black uppercase mb-1">{d.weekday}</span>
                      <span className="text-xl font-brand">{d.day}</span>
                    </button>
                  ))}
                </div>
                {date && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 animate-fade-in">
                    {availableSlots.length > 0 ? availableSlots.map(t => (
                      <button key={t} type="button" onClick={() => setTime(t)} className={`py-3 rounded-xl text-[10px] font-black border transition-all ${time === t ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-lg shadow-amber-500/20' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        {t}
                      </button>
                    )) : <p className="col-span-full text-center text-slate-600 italic py-4 text-xs">Nenhum horário disponível para este dia.</p>}
                  </div>
                )}
             </section>
           )}

           <div className="pt-10 flex flex-col md:flex-row items-center justify-between border-t border-slate-800 gap-6">
              <div className="text-center md:text-left">
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total a Pagar</p>
                 <div className="flex items-center gap-3">
                   <p className="text-4xl font-brand text-white">€ {((services.find(s => s.id === selectedService)?.price || 0) - (useLoyaltyPoints ? DISCOUNT_VALUE : 0)).toFixed(2)}</p>
                   {useLoyaltyPoints && <span className="bg-green-500/10 text-green-500 text-[9px] px-2 py-1 rounded-full border border-green-500/20 font-black uppercase">- € 20 FIDELIDADE</span>}
                 </div>
              </div>
              <button type="submit" disabled={!time || !name || isSubmitting} className="w-full md:w-auto bg-amber-500 text-slate-900 font-black py-5 px-12 rounded-2xl uppercase tracking-widest text-sm shadow-2xl shadow-amber-500/10 active:scale-95 transition-all disabled:opacity-20">
                {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Confirmar Agendamento'}
              </button>
           </div>
        </form>

        {/* Histórico Lateral */}
        <aside className="lg:col-span-4 space-y-8">
           <div className="bg-slate-800/20 border border-slate-800 p-8 rounded-[40px]">
              <h3 className="text-xl font-brand text-white uppercase mb-6 flex items-center gap-3">
                <i className="fa-solid fa-clock-rotate-left text-amber-500"></i>
                Histórico
              </h3>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                {myAppointments.length === 0 ? (
                  <p className="text-slate-600 text-center py-10 text-[10px] font-black uppercase tracking-widest italic">Sem registros ainda.</p>
                ) : myAppointments.map(app => (
                  <div key={app.id} className="p-4 rounded-2xl bg-slate-900/50 border border-slate-700/50">
                    <div className="flex justify-between items-start mb-2">
                       <p className="font-bold text-white text-xs">{services.find(s => s.id === app.serviceId)?.name}</p>
                       <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${app.status === 'confirmed' ? 'bg-blue-600' : app.status === 'pending' ? 'bg-amber-500 text-slate-900' : app.status === 'completed' ? 'bg-green-600' : 'bg-slate-800'}`}>
                         {app.status === 'pending' ? 'Pendente' : app.status === 'confirmed' ? 'Confirmado' : app.status === 'completed' ? 'Finalizado' : 'Cancelado'}
                       </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{new Date(app.dateTime).toLocaleDateString()} às {new Date(app.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                  </div>
                ))}
              </div>
           </div>
        </aside>
      </div>

      {/* Modal Editar Perfil */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
           <div className="bg-slate-900 border border-slate-700 w-full max-w-sm p-10 rounded-[40px] space-y-8 animate-fade-in shadow-2xl">
              <h3 className="text-2xl font-brand text-white uppercase text-center tracking-widest">Meus Dados</h3>
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center">
                    {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-3xl text-slate-700"></i>}
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center cursor-pointer shadow-xl border-2 border-slate-900"><i className="fa-solid fa-camera text-slate-900"></i><input type="file" className="hidden" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const r = new FileReader();
                      r.onload = () => setAvatar(r.result as string);
                      r.readAsDataURL(file);
                    }
                  }} /></label>
                </div>
                <div className="w-full space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase px-1">Nome Completo</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu Nome Completo" className="w-full bg-slate-950 border border-slate-700 p-4 rounded-2xl text-white text-center outline-none focus:border-amber-500" />
                </div>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setIsEditingProfile(false)} className="flex-1 text-slate-500 text-[10px] font-black uppercase">Cancelar</button>
                 <button onClick={() => { storageService.updateClientProfile(clientPhone, { name, avatar: avatar || undefined }); setIsEditingProfile(false); }} className="flex-2 bg-amber-500 text-slate-900 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">Salvar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClientBooking;
