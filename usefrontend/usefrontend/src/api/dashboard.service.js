import api from './index';

class DashboardService {
  /**
   * Obtiene las estadísticas del aprendiz
   * @returns {Promise<Object>} Estadísticas de bitácoras y próximos seguimientos
   */
  async getApprenticeStats() {
    try {
      const response = await api.get('/dashboard/apprentice');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Obtiene las estadísticas del instructor
   * @returns {Promise<Object>} Estadísticas de aprendices, horas y revisiones
   */
  async getInstructorStats() {
    try {
      const response = await api.get('/dashboard/instructor');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }

  /**
   * Obtiene las estadísticas del administrador
   * @returns {Promise<Object>} Estadísticas de etapas, instructores y aprendices
   */
  async getAdminStats() {
    try {
      const response = await api.get('/dashboard/admin');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
}

export default new DashboardService();
