<template>
  <div class="hours-report-container q-pa-md">
    <div class="page-header q-mb-xl shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="schedule" class="q-mr-sm" size="md"/>Mi Informe de Horas
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">
          Horas ejecutadas por etapa productiva. Seleccione un mes para ver el detalle.
        </p>
      </div>
    </div>

    <q-card flat class="filter-card q-mb-lg">
      <q-card-section class="q-pa-md row q-col-gutter-md items-center">
        <div class="col-12 col-sm-4">
          <q-select
            v-model="selectedYear"
            :options="yearOptions"
            label="Año"
            outlined dense
            color="primary"
            @update:model-value="fetchDetail"
          />
        </div>
        <div class="col-12 col-sm-5">
          <q-select
            v-model="selectedMonth"
            :options="monthsOptions"
            label="Mes"
            outlined dense emit-value map-options
            color="primary"
            @update:model-value="fetchDetail"
          />
        </div>
        <div class="col-12 col-sm-3 row justify-end">
          <q-btn
            color="primary"
            icon="refresh"
            label="Consultar"
            rounded
            unelevated
            :loading="loading"
            class="text-weight-bold"
            @click="fetchDetail"
          />
        </div>
      </q-card-section>
    </q-card>

    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="4em" />
      <div class="q-ml-md text-h6 text-primary text-weight-medium">Cargando informe...</div>
    </div>

    <div v-else-if="record">
      <div class="row q-col-gutter-md q-mb-lg">
        <div class="col-12 col-sm-3">
          <q-card flat class="summary-card total-card">
            <q-card-section class="row items-center justify-between q-pa-lg">
              <div>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Horas Totales del Mes</div>
                <div class="text-h3 text-weight-bolder text-primary q-mt-xs">{{ record.totalHours || 0 }}</div>
                <div class="text-caption text-grey-6">Bitacoras: {{ record.bitacoraHours || 0 }}h | Seg: {{ record.trackingHours || 0 }}h | Extra: {{ record.extraordinaryHours || 0 }}h</div>
              </div>
              <div class="icon-circle bg-primary-light">
                <q-icon name="schedule" color="primary" size="md" />
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-3">
          <q-card flat class="summary-card validated-card">
            <q-card-section class="row items-center justify-between q-pa-lg">
              <div>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Horas Validadas</div>
                <div class="text-h3 text-weight-bolder text-positive q-mt-xs">{{ validatedHoursTotal }}</div>
              </div>
              <div class="icon-circle bg-positive-light">
                <q-icon name="verified" color="positive" size="md" />
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-3">
          <q-card flat class="summary-card pending-card">
            <q-card-section class="row items-center justify-between q-pa-lg">
              <div>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Horas Pend. Pago</div>
                <div class="text-h3 text-weight-bolder text-warning q-mt-xs">{{ record.pendingPaymentHours || 0 }}</div>
              </div>
              <div class="icon-circle bg-warning-light">
                <q-icon name="hourglass_empty" color="warning" size="md" />
              </div>
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-3">
          <q-card flat class="summary-card paid-card">
            <q-card-section class="row items-center justify-between q-pa-lg">
              <div>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Horas Cobradas</div>
                <div class="text-h3 text-weight-bolder text-positive q-mt-xs">{{ record.paidHours || 0 }}</div>
              </div>
              <div class="icon-circle bg-positive-light">
                <q-icon name="check_circle" color="positive" size="md" />
              </div>
            </q-card-section>
          </q-card>
        </div>
      </div>

      <q-card flat class="table-card q-mb-lg">
        <q-table
          :rows="summaryByEP"
          :columns="epColumns"
          row-key="productiveStageId"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 50 }"
          class="custom-table"
          table-header-class="custom-table-header"
        >
          <template v-slot:body-cell-apprentice="props">
            <q-td :props="props">
              <div class="text-weight-bold">{{ props.row.apprenticeName }}</div>
              <div class="text-caption text-grey-7">{{ props.row.modality || '—' }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-role="props">
            <q-td :props="props">
              <q-badge color="primary" class="text-weight-bold q-px-sm q-py-xs" rounded>
                {{ props.row.instructorRole }}
              </q-badge>
            </q-td>
          </template>

          <template v-slot:body-cell-totalHours="props">
            <q-td :props="props">
              <q-chip color="primary" text-color="white" dense size="sm" class="text-weight-bold badge-pill q-px-md">
                {{ props.value }}h
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-validatedHours="props">
            <q-td :props="props">
              <q-chip v-if="props.value > 0" color="positive" text-color="white" dense size="sm" class="text-weight-bold badge-pill q-px-md">
                {{ props.value }}h
              </q-chip>
              <span v-else class="text-caption text-grey-6">0h</span>
            </q-td>
          </template>

          <template v-slot:body-cell-unvalidatedHours="props">
            <q-td :props="props">
              <q-chip v-if="props.value > 0" color="orange" text-color="white" dense size="sm" class="text-weight-bold badge-pill q-px-md">
                {{ props.value }}h
              </q-chip>
              <span v-else class="text-caption text-grey-6">0h</span>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn
                color="primary"
                unelevated
                rounded
                icon="visibility"
                label="Detalle"
                size="sm"
                class="action-btn q-px-md"
                @click="openDetailDialog(props.row)"
              />
            </q-td>
          </template>

          <template v-slot:no-data>
            <div class="full-width row flex-center text-grey-6 q-pa-xl">
              <q-icon size="4em" name="pending_actions" class="q-mb-md full-width text-center" />
              <div class="text-h6">No hay horas registradas en este mes.</div>
            </div>
          </template>
        </q-table>
      </q-card>

      <div class="row justify-end q-mb-xl q-gutter-md">
        <q-btn
          v-if="record && record.pendingPaymentHours > 0 && !record.chargeRequested"
          color="warning"
          icon="request_quote"
          label="Cobrar Horas"
          rounded
          unelevated
          :loading="requestingCharge"
          class="text-weight-bold q-px-lg"
          :disable="record.pendingPaymentHours <= 0"
          @click="confirmRequestCharge"
        >
          <q-tooltip>Solicitar al administrador el cobro de horas pendientes</q-tooltip>
        </q-btn>
        <q-btn
          v-if="record && record.chargeRequested"
          color="grey-6"
          icon="check_circle"
          label="Cobro Solicitado"
          rounded
          unelevated
          disable
          class="text-weight-bold q-px-lg"
        >
          <q-tooltip>Ya solicitaste el cobro de este mes. Un administrador revisara tu solicitud.</q-tooltip>
        </q-btn>
        <q-btn
          color="primary"
          icon="download"
          label="Exportar Reporte PDF"
          rounded
          unelevated
          :loading="downloading"
          class="text-weight-bold q-px-lg"
          @click="downloadReport"
        />
      </div>
    </div>

    <div v-else class="flex flex-center q-pa-xl">
      <q-card flat class="empty-card q-pa-xl text-center">
        <q-icon name="pending_actions" size="4em" color="grey-4" class="q-mb-md" />
        <div class="text-h6 text-grey-6">Seleccione un mes</div>
        <div class="text-caption">Seleccione ano y mes y presione "Consultar" para ver su informe de horas.</div>
      </q-card>
    </div>

    <q-dialog v-model="showDetailDialog" persistent>
      <q-card class="modal-card" style="width: 700px; max-width: 95vw;">
        <q-card-section class="bg-primary text-white row items-center">
          <div class="text-h6 text-weight-bold">
            <q-icon name="list_alt" class="q-mr-sm" size="sm"/>Detalle de Actividades
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-lg" style="max-height: 60vh; overflow-y: auto;">
          <div class="bg-blue-grey-1 q-pa-md rounded-borders q-mb-md">
            <div class="text-subtitle2 text-weight-bold">{{ detailEP?.apprenticeName }}</div>
            <div class="text-caption text-grey-7">Rol: {{ detailEP?.instructorRole }} | Modalidad: {{ detailEP?.modality || '—' }}</div>
          </div>
          <q-table
            :rows="filteredDetailItems"
            :columns="detailColumns"
            row-key="_id"
            flat
            hide-pagination
            dense
            :pagination="{ rowsPerPage: 50 }"
            class="custom-table"
          >
            <template v-slot:body-cell-date="props">
              <q-td :props="props">
                <div class="text-caption">{{ formatDate(props.value) }}</div>
              </q-td>
            </template>
            <template v-slot:body-cell-hours="props">
              <q-td :props="props">
                <q-badge color="primary" class="text-weight-bold q-px-sm q-py-xs" rounded>{{ props.value }}h</q-badge>
              </q-td>
            </template>
            <template v-slot:body-cell-validated="props">
              <q-td :props="props">
                <q-chip v-if="props.value" color="positive" text-color="white" dense size="sm" class="text-weight-bold">Validado</q-chip>
                <q-chip v-else color="orange" text-color="white" dense size="sm" class="text-weight-bold">Pend. Validar</q-chip>
              </q-td>
            </template>
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip v-if="props.value" color="positive" text-color="white" dense size="sm" class="text-weight-bold">Cobrado</q-chip>
                <q-chip v-else color="warning" text-color="white" dense size="sm" class="text-weight-bold">Pendiente</q-chip>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue';
import hourService from '../../api/hours.service';
import { useAuthStore } from '../../stores/auth';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const authStore = useAuthStore();

const loading = ref(false);
const downloading = ref(false);
const requestingCharge = ref(false);
const record = ref(null);
const summaryByEP = ref([]);
const detailItems = ref([]);

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const selectedYear = ref(currentYear);
const selectedMonth = ref(currentMonth);

const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const monthsOptions = [
  { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 }, { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 }, { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
];

const epColumns = [
  { name: 'apprentice', label: 'Etapa Productiva / Aprendiz', align: 'left' },
  { name: 'role', label: 'Rol Instructor', align: 'center', style: 'width: 130px;' },
  { name: 'totalHours', label: 'Total', field: 'totalHours', align: 'center', style: 'width: 70px;' },
  { name: 'validatedHours', label: 'Validadas', field: 'validatedHours', align: 'center', style: 'width: 80px;' },
  { name: 'unvalidatedHours', label: 'Por Validar', field: 'unvalidatedHours', align: 'center', style: 'width: 80px;' },
  { name: 'actions', label: 'Detalle', align: 'center', style: 'width: 80px;' }
];

const detailColumns = [
  { name: 'source', label: 'Actividad', field: 'sourceLabel', align: 'left' },
  { name: 'date', label: 'Fecha', field: 'date', align: 'center', style: 'width: 100px;' },
  { name: 'hours', label: 'Horas', field: 'assignedHours', align: 'center', style: 'width: 70px;' },
  { name: 'validated', label: 'Validacion', field: 'hoursValidated', align: 'center', style: 'width: 90px;' },
  { name: 'status', label: 'Cobro', field: 'isPaid', align: 'center', style: 'width: 90px;' }
];

const showDetailDialog = ref(false);
const detailEP = ref(null);

const validatedHoursTotal = computed(() => {
  return summaryByEP.value.reduce((acc, row) => acc + (row.validatedHours || 0), 0);
});

const filteredDetailItems = computed(() => {
  if (!detailEP.value) return [];
  return detailItems.value.filter(item =>
    item.productiveStageId === detailEP.value.productiveStageId &&
    item.instructorRole === detailEP.value.instructorRole
  );
});

let pollTimer = null;

onMounted(() => {
  if (authStore.user?.id) {
    fetchDetail();
  }
  pollTimer = setInterval(() => {
    if (authStore.user?.id && selectedMonth.value) {
      fetchDetail();
    }
  }, 30000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
});

onActivated(() => {
  fetchDetail();
});

async function fetchDetail() {
  if (!authStore.user?.id) return;
  if (!selectedMonth.value) return;
  loading.value = true;
  try {
    const data = await hourService.getMonthlyDetail(
      authStore.user.id,
      selectedYear.value,
      selectedMonth.value
    );
    const resData = data?.data?.data || data?.data || data;
    record.value = resData.record || null;
    summaryByEP.value = resData.summaryByEP || [];
    detailItems.value = resData.detailItems || [];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Error al cargar informe.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

function openDetailDialog(epRow) {
  detailEP.value = epRow;
  showDetailDialog.value = true;
}

function confirmRequestCharge() {
  $q.dialog({
    title: 'Solicitar Cobro de Horas',
    message: `Estas a punto de solicitar el cobro de ${record.value.pendingPaymentHours} horas pendientes al administrador. Recibira una notificacion para revisar y aprobar el pago.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Solicitar Cobro', color: 'warning' },
    persistent: true
  }).onOk(() => executeRequestCharge());
}

async function executeRequestCharge() {
  if (!authStore.user?.id || !selectedMonth.value) return;
  requestingCharge.value = true;
  try {
    await hourService.requestCharge(authStore.user.id, selectedYear.value, selectedMonth.value);
    $q.notify({ type: 'positive', message: 'Solicitud de cobro enviada al administrador.', position: 'top', timeout: 5000 });
    fetchDetail();
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al solicitar el cobro.';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    requestingCharge.value = false;
  }
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function downloadReport() {
  if (!authStore.user?.id || !selectedMonth.value) return;
  downloading.value = true;
  try {
    const response = await hourService.getReport(authStore.user.id, selectedYear.value, selectedMonth.value);
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Horas_${selectedYear.value}_${selectedMonth.value}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al generar el PDF.', position: 'top', timeout: 5000 });
  } finally {
    downloading.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.hours-report-container {
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  background: linear-gradient(135deg, #318335 0%, #43A047 100%);
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

.filter-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
}

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

.table-card {
  border-radius: 20px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  overflow: hidden;
}

.modal-card {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
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

.empty-card {
  border-radius: 20px;
  background: white;
  border: 1px solid rgba(0,0,0,0.06);
  max-width: 500px;
}
</style>
