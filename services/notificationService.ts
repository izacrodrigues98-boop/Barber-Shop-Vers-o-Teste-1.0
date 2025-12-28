
export const notificationService = {
  requestPermission: async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  sendNativeNotification: (title: string, body: string, icon: string = '/favicon.ico') => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon,
        silent: false,
      });
    }
  },

  // Simulação de eventos de rede para notificações em tempo real no mesmo navegador
  dispatchBookingEvent: (detail: any) => {
    window.dispatchEvent(new CustomEvent('na_regua_new_booking', { detail }));
  },

  dispatchStatusUpdateEvent: (detail: any) => {
    window.dispatchEvent(new CustomEvent('na_regua_status_update', { detail }));
  }
};
