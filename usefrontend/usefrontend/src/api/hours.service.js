import api from './index';

/**
 * Hours Service
 * Handles instructor accumulated hours and payments
 */
export const hourService = {
  getSummary: (params) => api.get('/hours/summary', { params }),
  
  getInstructorHours: (instructorId, params) => 
    api.get(`/hours/instructors/${instructorId}`, { params }),
  
  getMonthlyDetail: (instructorId, year, month) => 
    api.get(`/hours/instructors/${instructorId}/month/${year}/${month}`),

  getReport: (instructorId, year, month) => 
    api.get(`/hours/instructors/${instructorId}/report/${year}/${month}`, { responseType: 'blob' }),

  markPaid: (instructorId, year, month, data) => 
    api.patch(`/hours/instructors/${instructorId}/month/${year}/${month}/mark-paid`, data),

  carryOver: (instructorId, data) => 
    api.patch(`/hours/instructors/${instructorId}/carry-over`, data)
};

export default hourService;
