
export interface Message {
  id: string;
  sender: 'barber' | 'client';
  text: string;
  timestamp: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  description: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  latitude: number;
  longitude: number;
  active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  username: string;
  password?: string;
  avatar?: string;
  assignedServices: string[];
  config?: BarberConfig;
  active: boolean;
  isAdmin?: boolean;
}

export interface Appointment {
  id: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  barberId: string;
  dateTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  usedLoyaltyPoints?: boolean;
  discountApplied?: number;
  productsRevenue?: number;
  messages?: Message[];
  observations?: string;
}

export interface LoyaltyProfile {
  phone: string;
  name?: string;
  avatar?: string;
  points: number;
  totalAppointments: number;
}

export interface BarberConfig {
  openTime: string;
  closeTime: string;
  slotInterval: number;
  monthlyGoal: number; 
  masterNotice?: string;
}

export type ViewState = 'client_login' | 'client_booking' | 'admin_login' | 'admin_shop_selection' | 'admin_dashboard';
