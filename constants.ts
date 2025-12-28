
import { Service } from './types';

export const INITIAL_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Corte Degradê',
    price: 35.00,
    durationMinutes: 45,
    description: 'Corte moderno com acabamento impecável em degradê.'
  },
  {
    id: '2',
    name: 'Barba Terapia',
    price: 25.00,
    durationMinutes: 30,
    description: 'Toalha quente, massagem facial e alinhamento da barba.'
  },
  {
    id: '3',
    name: 'Combo (Corte + Barba)',
    price: 50.00,
    durationMinutes: 75,
    description: 'O pacote completo para quem quer sair na régua.'
  },
  {
    id: '4',
    name: 'Sobrancelha',
    price: 10.00,
    durationMinutes: 15,
    description: 'Design de sobrancelha na navalha.'
  }
];

export const BARBER_CREDENTIALS = {
  username: 'barbeiro1',
  password: '12345'
};

export const BUSINESS_HOURS = {
  open: '09:00',
  close: '20:00'
};
