
import { Appointment, Service, BarberConfig, LoyaltyProfile, Barber, Shop } from '../types';
import { INITIAL_SERVICES, BARBER_CREDENTIALS } from '../constants';
import { notificationService } from './notificationService';

const APPOINTMENTS_KEY = 'na_regua_appointments';
const SERVICES_KEY = 'na_regua_services';
const CONFIG_KEY = 'na_regua_config';
const LOYALTY_KEY = 'na_regua_loyalty';
const BARBERS_KEY = 'na_regua_barbers';
const SHOPS_KEY = 'na_regua_shops';

const DEFAULT_CONFIG: BarberConfig = {
  openTime: '09:00',
  closeTime: '20:00',
  slotInterval: 60, // Garantido 1 hora
  monthlyGoal: 5000
};

export const storageService = {
  getBarbers: (): Barber[] => {
    const data = localStorage.getItem(BARBERS_KEY);
    let barbers: Barber[] = data ? JSON.parse(data) : [];
    
    if (!barbers.find(b => b.username === BARBER_CREDENTIALS.username)) {
      const admin: Barber = {
        id: 'admin-master',
        name: 'Administrador Master',
        username: BARBER_CREDENTIALS.username,
        password: BARBER_CREDENTIALS.password,
        assignedServices: INITIAL_SERVICES.map(s => s.id),
        active: true,
        isAdmin: true
      };
      barbers = [admin, ...barbers];
      storageService.saveBarbers(barbers);
    }
    return barbers;
  },

  saveBarbers: (barbers: Barber[]) => localStorage.setItem(BARBERS_KEY, JSON.stringify(barbers)),

  getShops: (): Shop[] => {
    const data = localStorage.getItem(SHOPS_KEY);
    const shops = data ? JSON.parse(data) : [];
    if (shops.length === 0) {
      const defaultShop = [{
        id: '1',
        name: 'Na Régua Barber - Matriz',
        address: 'Rua das Tesouras, 123 - Centro',
        phone: '912345678',
        whatsapp: '912345678',
        instagram: 'naregua_barber',
        facebook: '',
        latitude: 0,
        longitude: 0,
        active: true
      }];
      storageService.saveShops(defaultShop);
      return defaultShop;
    }
    return shops;
  },

  saveShops: (shops: Shop[]) => {
    localStorage.setItem(SHOPS_KEY, JSON.stringify(shops));
    window.dispatchEvent(new CustomEvent('na_regua_shop_update'));
  },

  getLoyaltyProfile: (phone: string): LoyaltyProfile => {
    const data = localStorage.getItem(LOYALTY_KEY);
    const profiles: Record<string, LoyaltyProfile> = data ? JSON.parse(data) : {};
    return profiles[phone] || { phone, points: 0, totalAppointments: 0 };
  },

  updateClientProfile: (phone: string, updates: Partial<LoyaltyProfile>) => {
    const data = localStorage.getItem(LOYALTY_KEY);
    const profiles: Record<string, LoyaltyProfile> = data ? JSON.parse(data) : {};
    profiles[phone] = { ...(profiles[phone] || { phone, points: 0, totalAppointments: 0 }), ...updates };
    localStorage.setItem(LOYALTY_KEY, JSON.stringify(profiles));
    return profiles[phone];
  },

  updateLoyaltyPoints: (phone: string, pointsToAdd: number, isNewAppointment: boolean = false) => {
    const profile = storageService.getLoyaltyProfile(phone);
    profile.points = Math.max(0, profile.points + pointsToAdd);
    if (isNewAppointment) profile.totalAppointments += 1;
    return storageService.updateClientProfile(phone, profile);
  },

  getAppointments: (): Appointment[] => {
    const data = localStorage.getItem(APPOINTMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  saveAppointments: (appointments: Appointment[]) => localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments)),
  
  getServices: (): Service[] => {
    const data = localStorage.getItem(SERVICES_KEY);
    return data ? JSON.parse(data) : INITIAL_SERVICES;
  },
  
  saveServices: (services: Service[]) => {
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
  },

  deleteService: (id: string) => {
    const services = storageService.getServices().filter(s => s.id !== id);
    storageService.saveServices(services);
  },

  getConfig: (): BarberConfig => {
    const data = localStorage.getItem(CONFIG_KEY);
    return data ? JSON.parse(data) : DEFAULT_CONFIG;
  },

  saveConfig: (config: BarberConfig) => localStorage.setItem(CONFIG_KEY, JSON.stringify(config)),

  addAppointment: (appointment: Appointment) => {
    const appointments = storageService.getAppointments();
    appointments.push(appointment);
    storageService.saveAppointments(appointments);
    notificationService.dispatchBookingEvent(appointment);
  },

  updateAppointmentStatus: (id: string, status: Appointment['status'], productsRevenue: number = 0) => {
    const appointments = storageService.getAppointments();
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      const app = appointments[index];
      const oldStatus = app.status;
      app.status = status;
      app.productsRevenue = productsRevenue;
      
      if (status === 'completed' && oldStatus !== 'completed') {
        storageService.updateLoyaltyPoints(app.customerPhone, 1, true);
      }
      storageService.saveAppointments(appointments);
      notificationService.dispatchStatusUpdateEvent({ ...app, status });
    }
  },

  updateBarberProfile: (username: string, updates: Partial<Barber>) => {
    const barbers = storageService.getBarbers();
    const index = barbers.findIndex(b => b.username === username);
    if (index !== -1) {
      barbers[index] = { ...barbers[index], ...updates };
      storageService.saveBarbers(barbers);
      return barbers[index];
    }
    return null;
  }
};
