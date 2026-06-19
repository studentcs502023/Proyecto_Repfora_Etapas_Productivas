import { defineStore } from 'pinia';

export const useUIStore = defineStore('ui', {
  state: () => ({
    leftDrawerOpen: false,
    notifications: [],
    loadingOverlay: false,
    theme: 'light'
  }),

  actions: {
    toggleLeftDrawer() {
      this.leftDrawerOpen = !this.leftDrawerOpen;
    },

    setLeftDrawer(value) {
      this.leftDrawerOpen = value;
    },

    showLoading() {
      this.loadingOverlay = true;
    },

    hideLoading() {
      this.loadingOverlay = false;
    },

    /**
     * Show a global notification (Toast)
     * @param {Object} payload { message, type, timeout }
     */
    notify(payload) {
      // In Quasar, we usually use Notify plugin directly, 
      // but keeping a state here can be useful for history or custom alerts
      const notification = {
        id: Date.now(),
        message: payload.message || '',
        type: payload.type || 'info', // 'positive', 'negative', 'warning', 'info'
        timeout: payload.timeout || 3000
      };
      
      this.notifications.push(notification);

      // Simple auto-remove from state
      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
      }, notification.timeout + 500);
    }
  }
});
