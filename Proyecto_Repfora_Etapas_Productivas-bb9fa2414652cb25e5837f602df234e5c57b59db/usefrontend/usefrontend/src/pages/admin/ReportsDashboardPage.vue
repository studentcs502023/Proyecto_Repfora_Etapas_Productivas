<template>
  <div class="reports-dashboard-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="insert_chart" class="q-mr-sm" size="md"/>Panel de Reportes
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Visión general del estado de las etapas productivas e instructores.</p>
      </div>
    </div>

    <!-- Loading State -->
    <q-card v-if="loading" class="my-card no-shadow q-pa-xl text-center">
      <q-spinner color="primary" size="4em" />
      <div class="q-mt-md text-h6 text-primary text-weight-medium">Cargando reportes...</div>
    </q-card>

    <div v-else>
      
      <!-- EP Summary Section -->
      <div class="text-h5 text-primary text-weight-bolder q-mb-md flex items-center">
        <q-icon name="pie_chart" class="q-mr-sm" size="md"/> Resumen de Etapas Productivas ({{ new Date().getFullYear() }})
      </div>
      <div class="row q-col-gutter-lg q-mb-xl" v-if="epSummary">
        <div class="col-12 col-md-3">
          <q-card class="my-card bg-blue-1 border-left-primary text-center full-height flex flex-center column q-pa-xl shadow-1">
            <div class="text-h2 text-weight-bold text-primary">{{ epSummary.totalEPs || 0 }}</div>
            <div class="text-h6 text-primary text-uppercase text-weight-bold q-mt-sm">Total Etapas</div>
            <q-btn class="q-mt-md header-btn text-weight-bold shadow-2" color="primary" icon="download" label="Exportar PDF" rounded padding="xs md" @click="exportEP" :loading="exporting === 'ep'" />
          </q-card>
        </div>
        
        <div class="col-12 col-md-9">
          <q-card class="my-card no-shadow q-pa-lg full-height">
            <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-md">Por Estado</div>
            <div class="row q-col-gutter-md">
              <div class="col" v-for="(count, status) in (epSummary.byStatus || {})" :key="status">
                <q-card class="bg-grey-1 border-blue text-center q-pa-md shadow-1 stat-card">
                  <div class="text-h5 text-primary text-weight-bold">{{ count }}</div>
                  <div class="text-caption text-weight-bold text-uppercase text-grey-8 q-mt-xs">{{ getStatusLabel(status) }}</div>
                </q-card>
              </div>
            </div>
            
            <q-separator class="q-my-lg opacity-20" />
            
            <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Por Modalidad</div>
            <q-list dense class="bg-white rounded-borders shadow-1">
              <q-item v-for="(data, mod) in (epSummary.byModality || {})" :key="mod" class="q-py-sm">
                <q-item-section class="text-weight-medium">{{ getModalityLabel(mod) }}</q-item-section>
                <q-item-section side>
                  <q-badge color="primary" class="q-pa-sm text-weight-bold shadow-1" rounded>{{ data.total }}</q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </div>
      </div>

      <!-- Instructors Hours Section -->
      <div class="row items-center justify-between q-mb-md">
        <div class="text-h5 text-primary text-weight-bolder flex items-center">
          <q-icon name="schedule" class="q-mr-sm" size="md"/> Horas de Instructores
        </div>
        <q-btn color="secondary" icon="download" label="Exportar General" class="header-btn text-weight-bold shadow-2" rounded padding="xs md" @click="exportHours" :loading="exporting === 'hours'" />
      </div>
      <q-card class="my-card no-shadow q-mb-xl" v-if="hourSummary">
        <q-table
          :rows="hourSummary.instructors || []"
          :columns="instructorColumns"
          row-key="instructor.id"
          flat
          class="custom-table bg-transparent"
          table-header-class="custom-table-header"
          hide-pagination
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-instructor="props">
            <q-td :props="props">
              <div class="text-weight-bold">{{ props.row.instructor?.fullName }}</div>
              <div class="text-caption text-grey-7">{{ props.row.instructor?.knowledgeArea || 'Área general' }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-total="props">
            <q-td :props="props" class="text-center">
              <q-chip color="info" text-color="white" dense class="shadow-1 text-weight-bold">{{ props.row.yearTotals?.totalHours || 0 }} h</q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-pending="props">
            <q-td :props="props" class="text-center">
              <q-chip :color="(props.row.yearTotals?.pendingPaymentHours || 0) > 0 ? 'warning' : 'grey'" text-color="white" dense class="shadow-1 text-weight-bold">
                {{ props.row.yearTotals?.pendingPaymentHours || 0 }} h por cobrar
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn size="sm" flat round color="primary" icon="picture_as_pdf" class="action-btn" @click="exportSingleInstructorPDF(props.row.instructor?.id)">
                <q-tooltip class="bg-primary text-white shadow-4">Descargar reporte PDF de {{ props.row.instructor?.fullName }}</q-tooltip>
              </q-btn>
            </q-td>
          </template>
        </q-table>
        <div class="bg-blue-grey-1 q-pa-md text-right text-subtitle1 text-weight-bold shadow-1">
          Total Global de Horas: <span class="text-primary">{{ hourSummary.grandTotals?.totalHours || 0 }}</span> | Pendientes de Pago: <span class="text-negative">{{ hourSummary.grandTotals?.totalPending || 0 }}</span>
        </div>
      </q-card>

      <!-- Expiry Alerts Section -->
      <div class="text-h5 text-negative text-weight-bolder q-mb-md flex items-center">
        <q-icon name="warning" class="q-mr-sm" size="md"/> Alertas de Vencimiento de Matrícula
      </div>
      <q-card class="my-card border-red no-shadow q-mb-lg" v-if="expiryReport">
        <q-table
          :rows="expiryReport.apprentices || []"
          :columns="expiryColumns"
          row-key="enrollmentNumber"
          flat
          class="custom-table bg-transparent"
          table-header-class="custom-table-header text-negative"
          hide-pagination
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-alert="props">
            <q-td :props="props" class="text-center">
              <q-icon name="error" size="md" :color="getAlertColor(props.row.alertLevel)" class="shadow-1 q-pa-xs rounded-borders" style="background: rgba(255,255,255,0.8)" />
            </q-td>
          </template>
          
          <template v-slot:body-cell-apprentice="props">
            <q-td :props="props">
              <div class="text-weight-bold">{{ props.row.fullName }}</div>
              <div class="text-caption text-grey-7">Ficha: {{ props.row.enrollmentNumber }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-days="props">
            <q-td :props="props">
              <div class="text-weight-bold text-subtitle2" :class="`text-${getAlertColor(props.row.alertLevel)}`">
                {{ props.row.daysRemaining }} días
              </div>
              <div class="text-caption text-grey-7">{{ formatDate(props.row.enrollmentExpiryDate) }}</div>
            </q-td>
          </template>
          
          <template v-slot:no-data>
            <div class="full-width row flex-center text-positive q-pa-xl text-h6">
              <q-icon name="check_circle" size="md" class="q-mr-sm" /> No hay aprendices próximos a vencer.
            </div>
          </template>
        </q-table>
      </q-card>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import reportService from '../../api/report.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const loading = ref(true);
const exporting = ref(null);

const epSummary = ref(null);
const hourSummary = ref(null);
const expiryReport = ref(null);

const instructorColumns = [
  { name: 'instructor', label: 'Instructor', align: 'left' },
  { name: 'total', label: 'Total Horas (Año)', align: 'center' },
  { name: 'pending', label: 'Pendientes Pago', align: 'center' },
  { name: 'actions', label: 'PDF', align: 'center', style: 'width: 60px;' }
];

const expiryColumns = [
  { name: 'alert', label: 'Alerta', align: 'center' },
  { name: 'apprentice', label: 'Aprendiz', align: 'left' },
  { name: 'program', label: 'Programa', field: 'program', align: 'left' },
  { name: 'days', label: 'Vencimiento', align: 'left' }
];

onMounted(() => {
  loadAllReports();
});

async function loadAllReports() {
  loading.value = true;
  try {
    // Usar Promise.allSettled para evitar que un fallo parcial bloquee toda la pantalla
    const results = await Promise.allSettled([
      reportService.getEPSummary(),
      reportService.getInstructorHours(),
      reportService.getEnrollmentExpiry()
    ]);
    
    // Extracción de datos con fallbacks seguros
    const epResult = results[0].status === 'fulfilled' ? results[0].value : { data: {} };
    const hrResult = results[1].status === 'fulfilled' ? results[1].value : { data: {} };
    const expResult = results[2].status === 'fulfilled' ? results[2].value : { data: {} };
    
    // Asignar los datos considerando el interceptor que devuelve {success, message, data}
    epSummary.value = epResult.data || { totalEPs: 0, byStatus: {}, byModality: {} };
    hourSummary.value = hrResult.data || { instructors: [], grandTotals: {} };
    expiryReport.value = expResult.data || { apprentices: [] };
    
    if (results.some(r => r.status === 'rejected')) {
      console.warn('Algunos reportes no se pudieron cargar completamente.');
    }
  } catch (error) {
    console.error('Error crítico procesando reportes:', error);
    $q.notify({ type: 'negative', message: 'Error al cargar los reportes.' });
  } finally {
    loading.value = false;
  }
}

async function exportEP() {
  exporting.value = 'ep';
  try {
    const response = await reportService.exportEPSummary();
    downloadBlob(response.data, 'Reporte_Etapas_Productivas.pdf');
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al exportar reporte.' });
  } finally {
    exporting.value = null;
  }
}

async function exportHours() {
  exporting.value = 'hours';
  try {
    const response = await reportService.exportInstructorHours();
    downloadBlob(response.data, 'Reporte_Horas_Instructores.pdf');
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al exportar reporte.' });
  } finally {
    exporting.value = null;
  }
}

async function exportSingleInstructorPDF(instructorId) {
  if (!instructorId) return;
  exporting.value = instructorId;
  try {
    const response = await reportService.exportSingleInstructorHours(instructorId, { year: new Date().getFullYear() });
    downloadBlob(response.data, `Reporte_Horas_Instructor_${instructorId}.pdf`);
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al exportar reporte del instructor.' });
  } finally {
    exporting.value = null;
  }
}

function downloadBlob(data, filename) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function getStatusLabel(status) {
  const map = {
    'PENDING_REGISTRATION': 'Sin Registrar',
    'PENDING_APPROVAL': 'Por Aprobar',
    'ACTIVE': 'Activa',
    'IN_FOLLOWUP': 'Seguimiento',
    'CERTIFICATION': 'Certificación',
    'COMPLETED': 'Completada',
    'ARCHIVED': 'Archivada'
  };
  return map[status] || status;
}

function getModalityLabel(val) {
  const map = {
    'APPRENTICESHIP_CONTRACT': 'Contrato Aprendizaje',
    'LABOR_LINK': 'Vínculo Laboral',
    'INTERNSHIP': 'Pasantía',
    'INDIVIDUAL_PRODUCTIVE_PROJECT': 'Proyecto Individual',
    'GROUP_PRODUCTIVE_PROJECT': 'Proyecto Grupal'
  };
  return map[val] || val;
}

function getAlertColor(level) {
  if (level === 'RED') return 'negative';
  if (level === 'ORANGE') return 'orange';
  if (level === 'YELLOW') return 'warning';
  return 'grey';
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.reports-dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Premium Header */
.page-header {
  background: linear-gradient(135deg, #318335 0%, #43A047 100%);
  border-radius: 20px;
  padding: 30px;
  position: relative;
  overflow: hidden;
}

.cover-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0);
  background-size: 20px 20px;
  pointer-events: none;
}

.shadow-text { text-shadow: 2px 2px 8px rgba(0,0,0,0.4); }
.opacity-80 { opacity: 0.8; }
.opacity-20 { opacity: 0.2; }

/* Cards & Glassmorphism */
.my-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
}

.stat-card {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
}

/* Table Enhancements */
.custom-table { border-radius: 20px; }
.custom-table :deep(.q-table__container) { background: transparent; }
.custom-table :deep(th) {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #4a5568;
  border-bottom: 2px solid rgba(0,0,0,0.05);
}
.custom-table :deep(tbody tr) { transition: all 0.2s ease; }
.custom-table :deep(tbody tr:hover) {
  background-color: #f8fcfb !important;
  transform: scale(1.002);
}
.custom-table :deep(td) { border-bottom: 1px solid rgba(0,0,0,0.03); }

/* Chips & Buttons */
.header-btn { transition: all 0.3s ease; }
.header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important;
}

.border-blue { border: 1px solid #bbdefb; }
.border-red { border: 1px solid #ffcdd2; }
.border-left-primary { border-left: 5px solid var(--q-primary); }
</style>
