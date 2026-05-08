import api from './index';

/**
 * Novelties Service
 * Handles reporting and managing critical incidents
 */
export const noveltyService = {
  create: (formData) => {
    return api.post('/novelties', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getAll: (params) => api.get('/novelties', { params }),

  getById: (id) => api.get(`/novelties/${id}`),

  updateStatus: (id, data) => api.patch(`/novelties/${id}/status`, data),

  addAttachments: (id, formData) => {
    return api.post(`/novelties/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getByEP: (productiveStageId) => api.get(`/novelties/ep/${productiveStageId}`),

  getHistory: (productiveStageId) => api.get(`/novelties/history/${productiveStageId}`)
};

export default noveltyService;
