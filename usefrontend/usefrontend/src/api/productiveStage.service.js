import api from './index';

/**
 * Productive Stage Service
 * Handles EP registration, approval, and status tracking
 */
export const productiveStageService = {
  // --- Apprentice Actions ---
  registerEP: (data) => api.post('/productive-stages', data),
  getMyEP: () => api.get('/productive-stages/my'),

  // --- Instructor/Admin Actions ---
  getAllEPs: (params) => api.get('/productive-stages', { params }),
  getEPById: (id) => api.get(`/productive-stages/${id}`),
  approveEP: (id, config) => api.patch(`/productive-stages/${id}/approve`, config),
  rejectEP: (id, reason) => api.patch(`/productive-stages/${id}/reject`, { reason }),
  
  // --- Management ---
  assignInstructors: (id, data) => api.patch(`/productive-stages/${id}/assign-instructors`, data),
  completeEP: (id) => api.patch(`/productive-stages/${id}/complete`),
  addComment: (id, text) => api.post(`/productive-stages/${id}/comments`, { text }),
  quickAssign: (apprenticeId, instructorId) => api.post('/productive-stages/quick-assign', { apprenticeId, instructorId })
};

export default productiveStageService;
