<template>
  <div class="reports-dashboard-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Panel de Reportes</h2>
        <p class="text-grey-7 q-my-sm">Visión general del estado de las etapas productivas e instructores.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="loadAllReports" :loading="loading" />
      </div>
    </div>

    <!-- Loading State -->
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
    </q-card>

    <div v-else>
      
      <!-- EP Summary Section -->
      <div class="text-h6 text-primary q-mb-sm">Resumen de Etapas Productivas ({{ new Date().getFullYear() }})</div>
      <div class="row q-col-gutter-md q-mb-lg" v-if="epSummary">
        <div class="col-12 col-md-3">
          <q-card flat bordered class="bg-blue-1 border-blue text-center full-height flex flex-center column q-pa-md">
            <div class="text-h3 text-weight-bold text-primary">{{ epSummary.totalEPs || 0 }}</div>
            <div class="text-subtitle1 text-grey-9">Total Etapas</div>
            <q-btn class="q-mt-sm" color="primary" size="sm" icon="download" label="Exportar" @click="exportEP" :loading="exporting === 'ep'" />
          </q-card>
        </div>
        
        <div class="col-12 col-md-9">
          <q-card flat bordered class="q-pa-md">
            <div class="text-subtitle2 text-black q-mb-sm">Por Estado</div>
            <div class="row q-col-gutter-sm">
              <div class="col" v-for="(count, status) in (epSummary.byStatus || {})" :key="status">
                <q-card class="bg-grey-2 text-center q-pa-sm">
                  <div class="text-h6">{{ count }}</div>
                  <div class="text-caption text-weight-bold" style="font-size: 10px;">{{ getStatusLabel(status) }}</div>
                </q-card>
              </div>
            </div>
            
            <q-separator class="q-my-md" />
            
            <div class="text-subtitle2 text-black q-mb-sm">Por Modalidad</div>
            <q-list dense>
              <q-item v-for="(data, mod) in (epSummary.byModality || {})" :key="mod">
                <q-item-section>{{ getModalityLabel(mod) }}</q-item-section>
                <q-item-section side>
                  <q-badge color="primary">{{ data.total }}</q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </div>
      </div>

      <q-separator class="q-my-lg" />

      <!-- Instructors Hours Section -->
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6 text-primary">Horas de Instructores</div>
        <q-btn color="secondary" size="sm" icon="download" label="Exportar General" @click="exportHours" :loading="exporting === 'hours'" />
      </div>
      <q-card flat bordered class="q-mb-lg" v-if="hourSummary">
        <q-table
          :rows="hourSummary.instructors || []"
          :columns="instructorColumns"
          row-key="instructor.id"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-instructor="props">
            <q-td :props="props">
              <div class="text-weight-bold">{{ props.row.instructor?.fullName }}</div>
              <div class="text-caption">{{ props.row.instructor?.knowledgeArea || 'Área general' }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-total="props">
            <q-td :props="props">
              <q-chip color="info" text-color="white" dense>{{ props.row.yearTotals?.totalHours || 0 }} h</q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-pending="props">
            <q-td :props="props">
              <q-chip :color="(props.row.yearTotals?.pendingPaymentHours || 0) > 0 ? 'warning' : 'grey'" text-color="white" dense>
                {{ props.row.yearTotals?.pendingPaymentHours || 0 }} h por cobrar
              </q-chip>
            </q-td>
          </template>
        </q-table>
        <div class="bg-grey-2 q-pa-md text-right text-subtitle2">
          Total Global de Horas: {{ hourSummary.grandTotals?.totalHours || 0 }} | Pendientes de Pago: <span class="text-negative">{{ hourSummary.grandTotals?.totalPending || 0 }}</span>
        </div>
      </q-card>

      <q-separator class="q-my-lg" />

      <!-- Expiry Alerts Section -->
      <div class="text-h6 text-negative q-mb-sm"><q-icon name="warning" /> Alertas de Vencimiento de Matrícula</div>
      <q-card flat bordered class="border-red" v-if="expiryReport">
        <q-table
          :rows="expiryReport.apprentices || []"
          :columns="expiryColumns"
          row-key="enrollmentNumber"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-alert="props">
            <q-td :props="props" class="text-center">
              <q-icon name="error" size="sm" :color="getAlertColor(props.row.alertLevel)" />
            </q-td>
          </template>
          
          <template v-slot:body-cell-apprentice="props">
            <q-td :props="props">
              <div class="text-weight-bold">{{ props.row.fullName }}</div>
              <div class="text-caption">Ficha: {{ props.row.enrollmentNumber }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-days="props">
            <q-td :props="props">
              <div class="text-weight-bold" :class="`text-${getAlertColor(props.row.alertLevel)}`">
                {{ props.row.daysRemaining }} días
              </div>
              <div class="text-caption">{{ formatDate(props.row.enrollmentExpiryDate) }}</div>
            </q-td>
          </template>
          
          <template v-slot:no-data>
            <div class="full-width row flex-center text-positive q-pa-lg">
              <q-icon name="check_circle" size="sm" class="q-mr-sm" /> No hay aprendices próximos a vencer.
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
  { name: 'pending', label: 'Pendientes Pago', align: 'center' }
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
    const [epRes, hrRes, expRes] = await Promise.all([
      reportService.getEPSummary(),
      reportService.getInstructorHours(),
      reportService.getEnrollmentExpiry()
    ]);
    
    epSummary.value = epRes.data.data || epRes.data;
    hourSummary.value = hrRes.data.data || hrRes.data;
    expiryReport.value = expRes.data.data || expRes.data;
  } catch (error) {
    console.error(error);
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
.reports-dashboard-container {
  max-width: 1300px;
  margin: 0 auto;
}
.border-blue { border-color: #bbdefb; }
.border-red { border-color: #ffcdd2; }
</style>
