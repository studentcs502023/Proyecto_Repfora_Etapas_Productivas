import api from './index';

/**
 * User Management Service
 * Handles Instructors, Apprentices and Profile management
 */
export const userService = {
  // --- Instructors (Admin only) ---
  getInstructors: (params) => api.get('/users/instructors', { params }),
  getInstructorById: (id) => api.get(`/users/instructors/${id}`),
  createInstructor: (data) => api.post('/users/instructors', data),
  updateInstructor: (id, data) => api.patch(`/users/instructors/${id}`, data),
  changeInstructorStatus: (id, status, reason) => api.patch(`/users/instructors/${id}/status`, { status, reason }),
  deactivateInstructor: (id) => api.patch(`/users/instructors/${id}/deactivate`),

  // --- Apprentices ---
  getApprentices: (params) => api.get('/users/apprentices', { params }),
  getApprenticeById: (id) => api.get(`/users/apprentices/${id}`),
  createApprentice: (data) => api.post('/users/apprentices', data),
  updateApprentice: (id, data) => api.patch(`/users/apprentices/${id}`, data),
  deactivateApprentice: (id) => api.patch(`/users/apprentices/${id}/deactivate`),
  importApprentices: (formData) => {
    return api.post('/users/apprentices/import', formData);
  }
};

export default userService;
