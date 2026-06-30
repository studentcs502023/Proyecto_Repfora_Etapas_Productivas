import api from './index';

export const hourValidationService = {
  getPending: (params) => api.get('/hour-validation/pending', { params }),
  validate: (data) => api.patch('/hour-validation/validate', data),
  reject: (data) => api.patch('/hour-validation/reject', data)
};

export default hourValidationService;
