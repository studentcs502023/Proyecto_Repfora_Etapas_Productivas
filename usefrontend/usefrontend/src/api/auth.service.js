import api from './index';

/**
 * Authentication Service
 * Handles login and password change on first entry
 */
export const authService = {
  /**
   * Login user
   * @param {Object} credentials { nationalId, password }
   */
  login: (credentials) => {
    return api.post('/auth/login', credentials);
  },

  /**
   * Change password on first login
   * @param {Object} data { nationalId, newPassword, confirmPassword }
   */
  changePasswordFirstLogin: (data) => {
    return api.post('/auth/change-password-first', data);
  },

  /**
   * Change password voluntarily from profile
   * @param {Object} data { currentPassword, newPassword, confirmPassword }
   */
  changePassword: (data) => {
    return api.post('/auth/change-password', data);
  },

  /**
   * Get current user profile (Me)
   */
  getMe: () => {
    return api.get('/auth/me');
  }
};

export default authService;
