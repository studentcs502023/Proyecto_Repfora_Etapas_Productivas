import api from './index';

/**
 * Documents Service
 * Handles certification documents and other uploads
 */
export const documentService = {
  upload: (formData) => {
    return api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getDocuments: (params) => api.get('/documents', { params }),
  
  getById: (id) => api.get(`/documents/${id}`),

  getEPStatus: (epId) => api.get(`/documents/ep/${epId}/status`),

  approve: (id) => api.patch(`/documents/${id}/approve`),

  reject: (id, comment) => api.patch(`/documents/${id}/reject`, { comment }),

  resubmit: (id, formData) => {
    return api.patch(`/documents/${id}/resubmit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  requestDeletion: (id, reason) => {
    return api.patch(`/documents/${id}/request-deletion`, { reason });
  },

  delete: (id) => api.delete(`/documents/${id}`)
};

export default documentService;
