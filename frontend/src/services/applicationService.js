import api from './api.js';

export const applicationService = {
  /**
   * Health check
   */
  async getHealth() {
    const res = await api.get('/health');
    return res.data;
  },

  /**
   * Get applications with optional status and search filters
   */
  async getApplications(params = {}) {
    const res = await api.get('/applications', { params });
    return res.data;
  },

  /**
   * Get application stats
   */
  async getStats() {
    const res = await api.get('/applications/stats');
    return res.data;
  },

  /**
   * Get single application by MongoDB _id
   */
  async getApplicationById(id) {
    const res = await api.get(`/applications/${id}`);
    return res.data;
  },

  /**
   * Create a new application
   */
  async createApplication(payload) {
    const res = await api.post('/applications', payload);
    return res.data;
  },

  /**
   * Update an existing application (only allowed fields)
   */
  async updateApplication(id, payload) {
    const res = await api.put(`/applications/${id}`, payload);
    return res.data;
  },

  /**
   * Update application status (enforces transition workflow)
   */
  async updateStatus(id, status) {
    const res = await api.patch(`/applications/${id}/status`, { status });
    return res.data;
  },

  /**
   * Delete application (only allowed when status is Applied, Rejected, Accepted, Declined)
   */
  async deleteApplication(id) {
    const res = await api.delete(`/applications/${id}`);
    return res.data;
  }
};

export default applicationService;
