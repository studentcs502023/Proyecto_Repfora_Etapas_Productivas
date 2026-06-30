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
  reassignApprentices: (id, newInstructorId, productiveStageIds) => api.post(`/users/instructors/${id}/reassign`, { newInstructorId, productiveStageIds }),
  deactivateInstructor: (id) => api.patch(`/users/instructors/${id}/deactivate`),
  activateInstructor: (id) => api.patch(`/users/instructors/${id}/activate`),

  // --- Apprentices ---
  getApprentices: (params) => api.get('/users/apprentices', { params }),
  getApprenticeById: (id) => api.get(`/users/apprentices/${id}`),
  createApprentice: (data) => api.post('/users/apprentices', data),
  updateApprentice: (id, data) => api.patch(`/users/apprentices/${id}`, data),
  deactivateApprentice: (id) => api.patch(`/users/apprentices/${id}/deactivate`),
  activateApprentice: (id) => api.patch(`/users/apprentices/${id}/activate`),
  importApprentices: (formData) => {
    return api.post('/users/apprentices/import', formData);
  }
};

export default userService;
