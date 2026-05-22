import api from './index';

/**
 * Bitacoras (Logbooks) Service
 * Handles fortnightly logbook submissions and reviews
 */
export const bitacoraService = {
  // --- Apprentice Actions ---
  submit: (formData) => {
    return api.post('/bitacoras', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  resubmit: (id, formData) => {
    return api.patch(`/bitacoras/${id}/resubmit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // --- Common Actions ---
  getByEP: (epId) => api.get('/bitacoras', { params: { productiveStageId: epId } }),
  getById: (id) => api.get(`/bitacoras/${id}`),

  // --- Instructor Actions ---
  getPendingReview: () => api.get('/bitacoras', { params: { status: 'PENDING' } }),
  approve: (id) => api.patch(`/bitacoras/${id}/approve`),
  reject: (id, comment) => api.patch(`/bitacoras/${id}/reject`, { comment }),
};

export default bitacoraService;
