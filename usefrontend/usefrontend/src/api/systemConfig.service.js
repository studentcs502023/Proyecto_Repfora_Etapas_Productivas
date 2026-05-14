import api from './index';

/**
 * System Configuration Service
 */
export const systemConfigService = {
  getAll: () => api.get('/system-config'),
  getByKey: (key) => api.get(`/system-config/${key}`),
  update: (key, value) => api.patch(`/system-config/${key}`, { value })
};

export default systemConfigService;
