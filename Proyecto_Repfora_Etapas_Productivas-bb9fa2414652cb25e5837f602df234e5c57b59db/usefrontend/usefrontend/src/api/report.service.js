import api from './index';

/**
 * Reports Service
 */
export const reportService = {
  getEPSummary: (params) => api.get('/reports/ep-summary', { params }),
  exportEPSummary: (params) => api.get('/reports/ep-summary/export', { params, responseType: 'blob' }),
  
  getInstructorHours: (params) => api.get('/reports/instructor-hours', { params }),
  exportInstructorHours: (params) => api.get('/reports/instructor-hours/export', { params, responseType: 'blob' }),
  exportSingleInstructorHours: (instructorId, params) => api.get(`/reports/instructor-hours/${instructorId}/export`, { params, responseType: 'blob' }),

  getApprenticeProgress: (apprenticeId) => api.get(`/reports/apprentice-progress/${apprenticeId}`),
  exportApprenticeProgress: (apprenticeId) => api.get(`/reports/apprentice-progress/${apprenticeId}/export`, { responseType: 'blob' }),

  getEnrollmentExpiry: (params) => api.get('/reports/enrollment-expiry', { params })
};

export default reportService;
