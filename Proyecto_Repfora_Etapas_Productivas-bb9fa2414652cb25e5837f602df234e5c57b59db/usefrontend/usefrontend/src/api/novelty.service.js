import api from './index';

/**
 * Novelties Service
 * Handles reporting and managing critical incidents
 */
export const noveltyService = {
  create: (formData) => {
    return api.post('/novelties', formData);
  },

  getAll: (params) => api.get('/novelties', { params }),

  getById: (id) => api.get(`/novelties/${id}`),

  updateStatus: (id, data) => api.patch(`/novelties/${id}/status`, data),

  addAttachments: (id, formData) => {
    return api.post(`/novelties/${id}/attachments`, formData);
  },

  getByEP: (productiveStageId) => api.get(`/novelties/ep/${productiveStageId}`),

  getStats: () => api.get('/novelties/stats'),

  getDetail: (id) => api.get(`/novelties/${id}/detail`),

  addTimelineEvent: (id, data) => api.post(`/novelties/${id}/timeline`, data),

  getHistory: (productiveStageId) => api.get(`/novelties/history/${productiveStageId}`)
};

export default noveltyService;
