import { defineStore } from 'pinia';
import authService from '../api/auth.service';
import userService from '../api/user.service';

const safeParse = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    localStorage.removeItem(key);
    return null;
  }
};

const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: safeParse('user'),
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isInstructor: (state) => state.user?.role === 'INSTRUCTOR',
    isApprentice: (state) => state.user?.role === 'APPRENTICE',
    userFullName: (state) => state.user?.fullName || '',
    mustChangePassword: (state) => state.user?.firstLogin === true
  },

  actions: {
    async login(credentials) {
      this.loading = true;
      this.error = null;
      try {
        // NOTE: The Axios interceptor in api/index.js already returns response.data
        // so `res` here IS the backend JSON body: { success, message, data: { token, user } }
        const res = await authService.login(credentials);
        const payload = res.data || res; // support both wrapped and unwrapped

        const { token, user, requiresPasswordChange } = payload;

        this.token = token;
        localStorage.setItem('token', token);

        if (user) {
          this.user = user;
          localStorage.setItem('user', JSON.stringify(user));
        } else if (requiresPasswordChange) {
          // firstLogin case: backend only returns token, no user object.
          // Decode the token to get the basic user information without making a 403 request
          try {
            const decoded = decodeJwt(token);
            if (decoded) {
              this.user = {
                id: decoded.id,
                fullName: decoded.fullName,
                role: decoded.role,
                firstLogin: false
              };
              localStorage.setItem('user', JSON.stringify(this.user));
            }
          } catch (e) {
            console.error('Error decoding token after login:', e);
          }
        }

        return payload;
      } catch (err) {
        this.error = err.message || 'Error al iniciar sesión';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async changePasswordFirstLogin(data) {
      this.loading = true;
      try {
        const response = await authService.changePasswordFirstLogin(data);
        // Update user state after password change
        if (this.user) {
          this.user.firstLogin = false;
          localStorage.setItem('user', JSON.stringify(this.user));
        }
        return response;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchProfile() {
      try {
        const response = await authService.getMe();
        const userData = response.data || response;
        this.user = userData;
        localStorage.setItem('user', JSON.stringify(this.user));
      } catch (err) {
        console.error('Error al obtener perfil:', err);
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login is usually handled by the router or a window.location change
    }
  }
});
