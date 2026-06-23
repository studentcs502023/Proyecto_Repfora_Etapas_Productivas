<template>
  <div class="hours-report-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="schedule" class="q-mr-sm" size="md"/>Mi Reporte de Horas
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">
          Control de horas ejecutadas y aprobadas para facturación y cobro mensual.
        </p>
      </div>
    </div>

    <!-- Filters Card -->
    <q-card flat class="filter-card q-mb-lg">
      <q-card-section class="q-pa-md row q-col-gutter-md items-center">
        <div class="col-12 col-sm-4">
          <q-input v-model.number="selectedYear" type="number" label="Año" outlined dense color="primary" @update:model-value="fetchData" />
        </div>
        <div class="col-12 col-sm-8">
          <q-select 
            v-model="selectedMonth" 
            :options="monthsOptions" 
            label="Mes (Opcional)" 
            outlined dense emit-value map-options clearable 
            color="primary"
            @update:model-value="fetchData" 
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="4em" />
      <div class="q-ml-md text-h6 text-primary text-weight-medium">Cargando reporte de horas...</div>
    </div>

    <!-- Content -->
    <div v-else-if="records.length > 0">
      
      <!-- Summary / Current State -->
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-4">
          <q-card flat class="summary-card total-card">
            <q-card-section class="row items-center justify-between q-pa-lg">
              <div>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Horas Totales (Filtro)</div>
                <div class="text-h3 text-weight-bolder text-primary q-mt-xs">{{ totalHoursInFilter }}</div>
              </div>
              <div class="icon-circle bg-primary-light">
                <q-icon name="schedule" color="primary" size="md" />
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat class="summary-card pending-card">
            <q-card-section class="row items-center justify-between q-pa-lg">
              <div>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Horas por Cobrar</div>
                <div class="text-h3 text-weight-bolder text-warning q-mt-xs">{{ totalPendingInFilter }}</div>
              </div>
              <div class="icon-circle bg-warning-light">
                <q-icon name="hourglass_empty" color="warning" size="md" />
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat class="summary-card paid-card">
            <q-card-section class="row items-center justify-between q-pa-lg">
              <div>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Horas Cobradas</div>
                <div class="text-h3 text-weight-bolder text-positive q-mt-xs">{{ totalPaidInFilter }}</div>
              </div>
              <div class="icon-circle bg-positive-light">
                <q-icon name="check_circle" color="positive" size="md" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <!-- Detail Table -->
      <q-card flat class="table-card">
        <q-table
          :rows="records"
          :columns="columns"
          row-key="_id"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 50 }"
          class="custom-table"
          table-header-class="custom-table-header"
        >
          <template v-slot:body-cell-period="props">
            <q-td :props="props" class="text-weight-bold text-dark text-subtitle2">
              {{ getMonthName(props.row.month) }} {{ props.row.year }}
            </q-td>
          </template>

          <template v-slot:body-cell-totalHours="props">
            <q-td :props="props">
              <q-chip color="primary" text-color="white" dense size="sm" class="text-weight-bold badge-pill q-px-md">
                {{ props.value }} hrs
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-breakdown="props">
            <q-td :props="props">
              <div class="row q-gutter-x-sm">
                <span class="text-caption text-grey-8">Bitácoras: <strong>{{ props.row.bitacoraHours }}h</strong></span>
                <span class="text-caption text-grey-3">|</span>
                <span class="text-caption text-grey-8">Seguimientos: <strong>{{ props.row.trackingHours }}h</strong></span>
              </div>
              <div class="row q-gutter-x-sm q-mt-xs" v-if="props.row.certificationHours > 0 || props.row.extraordinaryHours > 0">
                <span class="text-caption text-grey-8" v-if="props.row.certificationHours > 0">Certificación: <strong>{{ props.row.certificationHours }}h</strong></span>
                <span class="text-caption text-grey-3" v-if="props.row.certificationHours > 0 && props.row.extraordinaryHours > 0">|</span>
                <span class="text-caption text-warning" v-if="props.row.extraordinaryHours > 0">Extraordinarias: <strong>{{ props.row.extraordinaryHours }}h</strong></span>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-financial="props">
            <q-td :props="props">
              <div class="text-caption text-positive text-weight-medium">Cobradas: {{ props.row.paidHours }}h</div>
              <div class="text-caption text-warning text-weight-bold">Pendientes: {{ props.row.pendingPaymentHours }}h</div>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn 
                color="primary"
                unelevated
                rounded
                icon="download"
                label="Reporte PDF"
                size="sm"
                class="action-btn q-px-md"
                @click="downloadReport(props.row.year, props.row.month)" 
                :loading="downloading === `${props.row.year}-${props.row.month}`"
              />
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-center q-pa-xl">
      <q-card flat class="empty-card q-pa-xl text-center">
        <q-icon name="pending_actions" size="4em" color="grey-4" class="q-mb-md" />
        <div class="text-h6 text-grey-6">No hay registros de horas</div>
        <div class="text-caption">No tienes horas contabilizadas ni reportes de cobro registrados para el periodo seleccionado.</div>
      </q-card>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue';
import hourService from '../../api/hours.service';
import { useAuthStore } from '../../stores/auth';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const authStore = useAuthStore();

const records = ref([]);
const loading = ref(true);
const downloading = ref(null);

const selectedYear = ref(new Date().getFullYear());
const selectedMonth = ref(null);

const monthsOptions = [
  { label: 'Todos', value: null },
  { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 }, { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 }, { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
];

const columns = [
  { name: 'period', label: 'Periodo / Mes', align: 'left' },
  { name: 'totalHours', label: 'Horas Totales', field: 'totalHours', align: 'left' },
  { name: 'breakdown', label: 'Desglose Detallado', align: 'left' },
  { name: 'financial', label: 'Estado de Cobro', align: 'left' },
  { name: 'actions', label: 'Exportar Reporte', align: 'center' }
];

let pollInterval = null;

onMounted(() => {
  if (authStore.user?.id) {
    fetchData();
  } else {
    loading.value = false;
  }
  pollInterval = setInterval(fetchData, 120000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

onActivated(() => {
  fetchData();
});

async function fetchData() {
  if (!authStore.user?.id) return;
  loading.value = true;
  try {
    const params = { year: selectedYear.value };
    if (selectedMonth.value) params.month = selectedMonth.value;

    const body = await hourService.getInstructorHours(authStore.user.id, params);
    records.value = body.data || [];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar reporte de horas.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

const totalHoursInFilter = computed(() => {
  return records.value.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
});

const totalPendingInFilter = computed(() => {
  return records.value.reduce((acc, curr) => acc + (curr.pendingPaymentHours || 0), 0);
});

const totalPaidInFilter = computed(() => {
  return records.value.reduce((acc, curr) => acc + (curr.paidHours || 0), 0);
});

function getMonthName(m) {
  const opt = monthsOptions.find(o => o.value === m);
  return opt ? opt.label : m;
}

async function downloadReport(year, month) {
  if (!authStore.user?.id) return;
  const key = `${year}-${month}`;
  downloading.value = key;
  try {
    const response = await hourService.getReport(authStore.user.id, year, month);
    
    // Create blob link to download
    const blob = new Blob([response.data], { type: 'application/pdf', position: 'top', timeout: 5000 });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Horas_${year}_${month}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al generar el PDF.', position: 'top', timeout: 5000 });
  } finally {
    downloading.value = null;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.hours-report-container {
  max-width: 1000px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Header ─────────────────────────────────────── */
.page-header {
  background: linear-gradient(135deg, #093028 0%, #237A57 100%);
  border-radius: 20px;
  padding: 28px 32px;
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
.header-content { position: relative; z-index: 1; }
.shadow-text { text-shadow: 2px 2px 8px rgba(0,0,0,0.4); }
.opacity-80 { opacity: 0.8; }

/* ─── Filters Card ────────────────────────────────── */
.filter-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
}

/* ─── Summary Cards ──────────────────────────────── */
.summary-card {
  border-radius: 18px;
  background: white;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important;
}

.icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg-primary-light   { background: rgba(46,125,50,0.1); }
.bg-warning-light   { background: rgba(245,127,23,0.1); }
.bg-positive-light  { background: rgba(46,125,50,0.1); }

/* ─── Table Card ──────────────────────────────────── */
.table-card {
  border-radius: 20px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  overflow: hidden;
}

.custom-table :deep(.q-table__container) { background: transparent; }
.custom-table :deep(th) {
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 2px solid rgba(0,0,0,0.05);
}
.custom-table :deep(tbody tr) {
  transition: all 0.2s ease;
}
.custom-table :deep(tbody tr:hover) {
  background-color: #f0fdf4 !important;
}
.custom-table :deep(td) {
  border-bottom: 1px solid rgba(0,0,0,0.04);
  padding-top: 12px;
  padding-bottom: 12px;
}

.badge-pill {
  border-radius: 20px;
  font-weight: 600;
}

.action-btn {
  font-weight: 600;
  transition: all 0.2s ease;
}
.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46,125,50,0.2) !important;
}

/* ─── Empty state ────────────────────────────────── */
.empty-card {
  border-radius: 20px;
  background: white;
  border: 1px solid rgba(0,0,0,0.06);
  max-width: 500px;
}
</style>
