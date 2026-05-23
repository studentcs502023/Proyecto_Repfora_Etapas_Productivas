import api from './index';

/**
 * Trackings Service
 * Handles instructor follow-up sessions
 */
export const trackingService = {
  getTrackings: (params) => api.get('/trackings', { params }),
  
  getById: (id) => api.get(`/trackings/${id}`),

  getSummary: (productiveStageId) => api.get(`/trackings/summary/${productiveStageId}`),

  getTemplate: () => api.get('/trackings/template'),

  create: (data) => api.post('/trackings', data),

  requestExtraordinary: (data) => api.post('/trackings/extraordinary/request', data),

  uploadPDF: (id, fileData) => {
    return api.patch(`/trackings/${id}/upload-pdf`, fileData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  validateSignature: (id, data) => api.patch(`/trackings/${id}/validate-signature`, data),

  execute: (id) => api.patch(`/trackings/${id}/execute`),

  approveExtraordinary: (id) => api.patch(`/trackings/${id}/approve-extraordinary`),

  markPaid: (id) => api.patch(`/trackings/${id}/mark-paid`),

  // Usado por el modal de seguimiento extraordinario: sube PDF y marca como ejecutado
  uploadExtraordinaryPDF: (id, fileData) => {
    return api.patch(`/trackings/${id}/upload-pdf`, fileData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default trackingService;
