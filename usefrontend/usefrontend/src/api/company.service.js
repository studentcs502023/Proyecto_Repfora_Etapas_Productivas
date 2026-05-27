import api from './index';

/**
 * Companies Service
 */
export const companyService = {
  getAll: (params) => api.get('/companies', { params }),
  getById: (id) => api.get(`/companies/${id}`),
  getByTaxId: (taxId) => api.get(`/companies/tax-id/${taxId}`),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.patch(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`), // Note: backend uses soft-delete via isActive
  addContact: (id, contact) => api.post(`/companies/${id}/contacts`, contact),
  updateContact: (companyId, contactId, contact) => api.patch(`/companies/${companyId}/contacts/${contactId}`, contact),
  deleteContact: (companyId, contactId) => api.delete(`/companies/${companyId}/contacts/${contactId}`)
};

export default companyService;
