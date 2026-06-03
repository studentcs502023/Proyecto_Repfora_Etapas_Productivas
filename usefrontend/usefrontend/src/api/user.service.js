import api from './index';

/**
 * User Management Service
 * Handles Instructors, Apprentices and Profile management
 */
export const userService = {
  // --- Instructors (Admin only) ---
  getInstructors: (params) => api.get('/users/instructors', { params }),
  createInstructor: (data) => api.post('/users/instructors', data),
  updateInstructor: (id, data) => api.patch(`/users/instructors/${id}`, data),
  changeInstructorStatus: (id, status, reason) => api.patch(`/users/instructors/${id}/status`, { status, reason }),

  // --- Apprentices ---
  getApprentices: (params) => api.get('/users/apprentices', { params }),
  getApprenticeById: (id) => api.get(`/users/apprentices/${id}`),
  createApprentice: (data) => api.post('/users/apprentices', data),
  updateApprentice: (id, data) => api.patch(`/users/apprentices/${id}`, data),
  importApprentices: (formData) => {
    return api.post('/users/apprentices/import', formData);
  }
};

export default userService;
