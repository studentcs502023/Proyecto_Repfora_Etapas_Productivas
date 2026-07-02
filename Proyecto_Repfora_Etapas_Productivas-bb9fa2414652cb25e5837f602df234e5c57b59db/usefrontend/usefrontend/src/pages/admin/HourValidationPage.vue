<template>
  <div class="hour-validation-container q-pa-md">
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="verified" class="q-mr-sm" size="md"/>Validacion de Horas
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Aprueba o rechaza las horas pendientes de los instructores por revision de bitacoras y seguimientos.</p>
      </div>
    </div>

    <q-card class="filter-card my-card q-mb-lg no-shadow">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <q-select
            v-model="filterInstructor"
            :options="instructorOptions"
            label="Filtrar por Instructor"
            outlined dense emit-value map-options clearable
            color="primary"
            class="glass-input text-weight-medium"
            @update:model-value="fetchPending"
          >
            <template v-slot:prepend><q-icon name="person" color="grey-6" /></template>
          </q-select>
        </div>
        <div class="col-12 col-md-6 row justify-end">
          <q-badge color="deep-orange" class="q-pa-sm text-subtitle2">
            <q-icon name="hourglass_empty" class="q-mr-xs"/>
            Pendientes: {{ totalPending }}
          </q-badge>
        </div>
      </q-card-section>
    </q-card>

    <q-card class="table-card my-card no-shadow" style="overflow-x: auto;">
      <q-table
        :rows="items"
        :columns="columns"
        :loading="loading"
        row-key="combinedId"
        flat
        dense
        class="custom-table bg-transparent full-width"
        table-header-class="custom-table-header"
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <template v-slot:body-cell-source="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.source === 'BITACORA' ? 'primary' : 'accent'"
              text-color="white"
              dense
              class="status-chip text-weight-bold shadow-1"
            >
              {{ props.row.sourceLabel }}
            </q-chip>
            <div v-if="props.row.logbookNumber" class="text-caption text-grey-7">#{{ props.row.logbookNumber }}</div>
            <div v-if="props.row.trackingNumber" class="text-caption text-grey-7">#{{ props.row.trackingNumber }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-instructor="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.instructor?.fullName }}</div>
            <div class="text-caption text-grey-7">{{ props.row.instructor?.email }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.apprentice?.fullName }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-hours="props">
          <q-td :props="props">
            <q-badge color="deep-orange" class="text-weight-bold q-px-md q-py-xs text-subtitle2">
              {{ props.value }}h
            </q-badge>
          </q-td>
        </template>

        <template v-slot:body-cell-date="props">
          <q-td :props="props">
            <div class="text-caption text-grey-8">{{ formatDate(props.value) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs" style="white-space: nowrap;">
            <q-btn size="xs" flat round color="positive" icon="check_circle" class="action-btn" @click="confirmValidate(props.row)">
              <q-tooltip class="bg-positive text-white shadow-4">Aprobar horas</q-tooltip>
            </q-btn>
            <q-btn size="xs" flat round color="negative" icon="cancel" class="action-btn" @click="openRejectDialog(props.row)">
              <q-tooltip class="bg-negative text-white shadow-4">Rechazar horas</q-tooltip>
            </q-btn>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey-6 q-pa-xl">
            <q-icon size="4em" name="check_circle_outline" class="q-mb-md full-width text-center" />
            <div class="text-h6">No hay horas pendientes de validacion.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showRejectDialog" persistent>
      <q-card class="modal-card" style="width: 450px;">
        <q-card-section class="bg-negative text-white row items-center">
          <div class="text-h6 text-weight-bold">
            <q-icon name="cancel" class="q-mr-sm" size="sm"/>Rechazar Horas
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pa-lg">
          <p class="text-body1 text-grey-8 q-mb-md">
            Esta rechazando <strong>{{ selectedItem?.assignedHours }} horas</strong> de 
            <strong>{{ selectedItem?.instructor?.fullName }}</strong> 
            ({{ selectedItem?.sourceLabel }}).
          </p>
          <q-input
            v-model="rejectReason"
            label="Motivo del rechazo"
            type="textarea"
            outlined
            dense
            color="negative"
            class="glass-input"
            :rules="[val => !!val && val.length >= 10 || 'Minimo 10 caracteres']"
            hint="Explique por que rechaza estas horas"
          />
        </q-card-section>
        <q-separator class="opacity-20" />
        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat label="Cancelar" color="grey-8" class="text-weight-bold" v-close-popup />
          <q-btn color="negative" label="Rechazar Horas" :loading="rejecting" :disable="!rejectReason || rejectReason.length < 10" @click="executeReject" class="text-weight-bold shadow-2" rounded padding="xs lg"/>
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import hourValidationService from '../../api/hourValidation.service';
import userService from '../../api/user.service';

const $q = useQuasar();

const loading = ref(false);
const validating = ref(false);
const rejecting = ref(false);
const items = ref([]);
const filterInstructor = ref(null);
const instructorOptions = ref([]);
const totalPending = ref(0);

const showRejectDialog = ref(false);
const selectedItem = ref(null);
const rejectReason = ref('');

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

const columns = [
  { name: 'source', label: 'Origen', field: 'sourceLabel', align: 'center', style: 'width: 110px;' },
  { name: 'instructor', label: 'Instructor', field: row => row.instructor?.fullName, align: 'left', style: 'width: 180px;' },
  { name: 'apprentice', label: 'Aprendiz', field: row => row.apprentice?.fullName, align: 'left', style: 'width: 160px;' },
  { name: 'hours', label: 'Horas', field: 'assignedHours', align: 'center', style: 'width: 70px;' },
  { name: 'date', label: 'Fecha', field: 'date', align: 'center', style: 'width: 100px;' },
  { name: 'actions', label: 'Acciones', align: 'center', style: 'width: 90px;' }
];

onMounted(() => {
  fetchPending();
  loadInstructors();
});

async function fetchPending() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      instructorId: filterInstructor.value || undefined
    };
    const res = await hourValidationService.getPending(params);
    const data = res.data?.data || res.data;
    items.value = (data.items || []).map(item => ({
      ...item,
      combinedId: `${item.source}_${item._id}`
    }));
    totalPending.value = data.total || 0;
    pagination.value.rowsNumber = data.total || 0;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Error al cargar validaciones', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

async function loadInstructors() {
  try {
    const res = await userService.getInstructors({ limit: 100 });
    const data = res.data || res;
    const list = data?.data?.instructors || data?.instructors || data?.data || [];
    instructorOptions.value = (Array.isArray(list) ? list : [])
      .filter(i => i.isActive !== false && i.status === 'ACTIVE')
      .map(i => ({ label: i.fullName || i.email || i._id, value: i._id }));
  } catch (e) {
    console.error('Error cargando instructores para filtro:', e);
    $q.notify({ type: 'negative', message: 'Error al cargar instructores para el filtro', position: 'top', timeout: 3000 });
  }
}

function onRequest(props) {
  const { page, rowsPerPage } = props.pagination;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  fetchPending();
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function confirmValidate(item) {
  $q.dialog({
    title: 'Aprobar Horas',
    message: `¿Aprueba las ${item.assignedHours} horas de ${item.instructor?.fullName} por ${item.sourceLabel}?`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Aprobar', color: 'positive' },
    persistent: true
  }).onOk(() => executeValidate(item));
}

async function executeValidate(item) {
  validating.value = true;
  try {
    await hourValidationService.validate({ source: item.source, id: item._id });
    $q.notify({ type: 'positive', message: `${item.assignedHours}h de ${item.instructor?.fullName} aprobadas`, position: 'top', timeout: 3000 });
    fetchPending();
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al aprobar horas';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    validating.value = false;
  }
}

function openRejectDialog(item) {
  selectedItem.value = item;
  rejectReason.value = '';
  showRejectDialog.value = true;
}

async function executeReject() {
  if (!rejectReason.value || rejectReason.value.length < 10) return;
  rejecting.value = true;
  try {
    await hourValidationService.reject({ source: selectedItem.value.source, id: selectedItem.value._id, reason: rejectReason.value });
    $q.notify({ type: 'negative', message: `Horas de ${selectedItem.value.instructor?.fullName} rechazadas`, position: 'top', timeout: 3000 });
    showRejectDialog.value = false;
    fetchPending();
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al rechazar horas';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    rejecting.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.hour-validation-container {
  max-width: 1400px;
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

.shadow-text {
  text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
}

.opacity-80 { opacity: 0.8; }
.opacity-20 { opacity: 0.2; }

.my-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
}

.my-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 50px rgba(0,0,0,0.1) !important;
}

.modal-card {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

.glass-input :deep(.q-field__control) {
  border-radius: 12px;
  transition: all 0.3s ease;
  background: #f8fcfb;
}

.glass-input:focus-within :deep(.q-field__control) {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  background: #fff;
}

.custom-table {
  border-radius: 20px;
}

.custom-table :deep(th) {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #4a5568;
  border-bottom: 2px solid rgba(0,0,0,0.05);
  white-space: nowrap;
}

.custom-table :deep(tbody tr) {
  transition: all 0.2s ease;
}

.custom-table :deep(tbody tr:hover) {
  background-color: #f8fcfb !important;
  transform: scale(1.002);
}

.status-chip {
  letter-spacing: 0.5px;
}

.action-btn {
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: scale(1.15) rotate(5deg);
}
</style>
