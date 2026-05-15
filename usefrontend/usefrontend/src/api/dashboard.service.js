import api from './index';

// NOTA: El interceptor de Axios en index.js hace `return response.data`,
// por lo que cada llamada a api.get() ya retorna el body JSON del backend:
// { success: true, message: "...", data: { ... } }
// Por eso accedemos a `.data` para obtener el campo `data` del body.

class DashboardService {
  /**
   * Obtiene las estadísticas del aprendiz
   * @returns {Promise<Object>} Estadísticas de bitácoras y próximos seguimientos
   */
  async getApprenticeStats() {
    // api.get() → body JSON → { success, message, data }
    const body = await api.get('/dashboard/apprentice');
    return body.data;
  }

  /**
   * Obtiene las estadísticas del instructor
   * @returns {Promise<Object>} Estadísticas de aprendices, horas y revisiones
   */
  async getInstructorStats() {
    const body = await api.get('/dashboard/instructor');
    return body.data;
  }

  /**
   * Obtiene las estadísticas del administrador
   * @returns {Promise<Object>} Estadísticas de etapas, instructores y aprendices
   */
  async getAdminStats() {
    const body = await api.get('/dashboard/admin');
    return body.data;
  }
}

export default new DashboardService();
