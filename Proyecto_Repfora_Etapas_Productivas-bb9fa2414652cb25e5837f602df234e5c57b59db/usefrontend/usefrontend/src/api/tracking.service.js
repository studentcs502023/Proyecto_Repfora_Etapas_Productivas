import api from './index';

/**
 * Trackings Service
 * Handles instructor follow-up sessions
 */
export const trackingService = {
  getTrackings: (params) => api.get('/trackings', { params }),
  
  getById: (id) => api.get(`/trackings/${id}`),

  getSummary: (productiveStageId) => api.get(`/trackings/summary/${productiveStageId}`),

  getNextNumber: (productiveStageId) => api.get(`/trackings/next-number/${productiveStageId}`),

  getTemplate: () => api.get('/trackings/template'),

  create: (data) => api.post('/trackings', data),

  requestExtraordinary: (data) => api.post('/trackings/extraordinary/request', data),

  requestExtraordinaryWithFile: (formData) => api.post('/trackings/extraordinary/request-with-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  uploadPDF: (id, fileData) => {
    return api.patch(`/trackings/${id}/upload-pdf`, fileData);
  },

  uploadAdvances: (id, formData) => {
    return api.patch(`/trackings/${id}/upload-advances`, formData);
  },

  validateSignature: (id, data) => api.patch(`/trackings/${id}/validate-signature`, data),

  execute: (id) => api.patch(`/trackings/${id}/execute`),

  approveExtraordinary: (id) => api.patch(`/trackings/${id}/approve-extraordinary`),

  rejectExtraordinary: (id) => api.patch(`/trackings/${id}/reject-extraordinary`),

  validateRequirements: (id, data) => api.patch(`/trackings/${id}/validate-requirements`, data),

  getExtraordinaryTrackings: (params) => api.get('/trackings/extraordinary/all', { params }),

  markPaid: (id) => api.patch(`/trackings/${id}/mark-paid`),

  validatePDF: (formData) => {
    return api.post('/trackings/validate-pdf', formData);
  }
};

export default trackingService;
