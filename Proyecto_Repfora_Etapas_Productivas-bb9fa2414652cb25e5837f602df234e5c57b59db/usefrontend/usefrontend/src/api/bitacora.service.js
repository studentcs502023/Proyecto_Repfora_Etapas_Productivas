import api from './index';

/**
 * Bitacoras (Logbooks) Service
 * Handles fortnightly logbook submissions and reviews
 */
export const bitacoraService = {
  // --- Apprentice Actions ---
  submit: (formData) => {
    return api.post('/bitacoras', formData);
  },
  resubmit: (id, formData) => {
    return api.patch(`/bitacoras/${id}/resubmit`, formData);
  },
  
  // --- Common Actions ---
  getByEP: (epId) => api.get('/bitacoras', { params: { productiveStageId: epId } }),
  getById: (id) => api.get(`/bitacoras/${id}`),

  // --- Instructor Actions ---
  getPendingReview: (params = {}) => api.get('/bitacoras', { params: { status: 'PENDING', ...params } }),
  getByStatus: (status, params = {}) => api.get('/bitacoras', { params: { status, ...params } }),
  approve: (id) => api.patch(`/bitacoras/${id}/approve`),
  reject: (id, comment) => api.patch(`/bitacoras/${id}/reject`, { comment }),
  addComment: (id, text) => api.patch(`/bitacoras/${id}/comment`, { text }),
};

export default bitacoraService;
