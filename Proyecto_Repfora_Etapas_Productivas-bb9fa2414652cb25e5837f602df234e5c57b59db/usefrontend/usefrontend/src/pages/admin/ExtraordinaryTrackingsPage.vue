<template>
  <div class="extraordinary-container q-pa-md">
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="emergency" class="q-mr-sm" size="md"/>Seguimientos Extraordinarios
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Tabla de control de seguimientos extraordinarios.</p>
      </div>
    </div>

    <q-card class="table-card my-card no-shadow q-mb-lg">
      <q-card-section class="q-pa-md row q-col-gutter-md items-center">
        <div class="col-12 col-sm-4">
          <q-select v-model="filterStatus" :options="statusOptions" label="Filtrar por Estado" outlined dense emit-value map-options clearable color="primary" @update:model-value="fetchData" />
        </div>
        <div class="col-12 col-sm-4">
          <q-select v-model="filterApproved" :options="[{label:'Pendiente aprobación', value:'false'}, {label:'Aprobados', value:'true'}]" label="Aprobación" outlined dense emit-value map-options clearable color="primary" @update:model-value="fetchData" />
        </div>
        <div class="col-12 col-sm-4 text-right">
          <q-btn color="primary" icon="refresh" label="Actualizar" rounded unelevated @click="fetchData" :loading="loading" />
        </div>
      </q-card-section>

      <q-table :rows="trackings" :columns="columns" :loading="loading" row-key="_id" flat class="custom-table bg-transparent" table-header-class="custom-table-header" :pagination="{ rowsPerPage: 20 }">
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <template v-slot:body-cell-instructor="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.instructor?.fullName }}</div>
            <div class="text-caption text-grey-6">{{ props.row.instructor?.nationalId }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ props.row.apprentice?.fullName }}</div>
            <div class="text-caption text-grey-6">Ficha: {{ props.row.apprentice?.enrollmentNumber }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-scheduledDate="props">
          <q-td :props="props">
            {{ formatDate(props.row.scheduledDate) }}
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" class="q-px-sm q-py-xs" rounded />
          </q-td>
        </template>

        <template v-slot:body-cell-approved="props">
          <q-td :props="props" class="text-center">
            <q-icon :name="props.row.approvedByAdmin ? 'check_circle' : 'hourglass_empty'" :color="props.row.approvedByAdmin ? 'positive' : 'orange'" size="sm" />
            <q-tooltip>{{ props.row.approvedByAdmin ? 'Aprobado por ' + (props.row.approvedBy?.fullName || 'Admin') : 'Pendiente de aprobación' }}</q-tooltip>
          </q-td>
        </template>

        <template v-slot:body-cell-hasFile="props">
          <q-td :props="props" class="text-center">
            <q-icon :name="props.row.driveFileId ? 'check_circle' : 'cancel'" :color="props.row.driveFileId ? 'positive' : 'negative'" size="sm" />
            <q-tooltip>{{ props.row.driveFileId ? props.row.fileName : 'Sin archivo' }}</q-tooltip>
          </q-td>
        </template>

        <template v-slot:body-cell-signatures="props">
          <q-td :props="props" class="text-center">
            <q-icon :name="(props.row.signedByInstructor && props.row.signedByApprentice) ? 'check_circle' : 'warning'" :color="(props.row.signedByInstructor && props.row.signedByApprentice) ? 'positive' : 'orange'" size="sm" />
            <q-tooltip>Instructor: {{ props.row.signedByInstructor ? 'Sí' : 'No' }} | Aprendiz: {{ props.row.signedByApprentice ? 'Sí' : 'No' }}</q-tooltip>
          </q-td>
        </template>

        <template v-slot:body-cell-executed="props">
          <q-td :props="props" class="text-center">
            <q-icon :name="props.row.status === 'EXECUTED' || props.row.status === 'PAID' ? 'check_circle' : 'cancel'" :color="props.row.status === 'EXECUTED' || props.row.status === 'PAID' ? 'positive' : 'negative'" size="sm" />
          </q-td>
        </template>

        <template v-slot:body-cell-paid="props">
          <q-td :props="props" class="text-center">
            <q-icon :name="props.row.isPaid ? 'check_circle' : 'cancel'" :color="props.row.isPaid ? 'positive' : 'negative'" size="sm" />
            <q-tooltip>{{ props.row.isPaid ? `Cobrado: ${formatDate(props.row.paidAt)}` : 'No cobrado' }}</q-tooltip>
          </q-td>
        </template>

        <template v-slot:body-cell-requirements="props">
          <q-td :props="props" class="text-center">
            <q-checkbox v-model="props.row.requirementsValidated" @update:model-value="(val) => toggleRequirements(props.row, val)" :disable="savingReq === props.row._id" dense color="positive" />
            <q-tooltip>{{ props.row.requirementsValidated ? `Validado por ${props.row.requirementsValidatedBy?.fullName || 'Admin'}` : 'Pendiente de validación' }}</q-tooltip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <div class="row q-gutter-xs justify-center">
              <q-btn v-if="!props.row.approvedByAdmin && props.row.isActive" size="sm" color="positive" unelevated rounded icon="check" @click="approveTracking(props.row)" :loading="saving === props.row._id">
                <q-tooltip>Aprobar</q-tooltip>
              </q-btn>
              <q-btn v-if="!props.row.approvedByAdmin && props.row.isActive" size="sm" color="negative" outline rounded icon="close" @click="rejectTracking(props.row)" :loading="saving === props.row._id">
                <q-tooltip>Rechazar</q-tooltip>
              </q-btn>
              <q-btn v-if="props.row.driveFileUrl" size="sm" color="primary" outline rounded icon="visibility" @click="openFile(props.row.driveFileUrl)">
                <q-tooltip>Ver archivo</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width column flex-center text-grey q-pa-xl">
            <q-icon name="event_busy" size="5em" color="grey-4" class="q-mb-md" />
            <div class="text-h6 text-grey-6">Sin seguimientos extraordinarios</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <div class="row q-col-gutter-md q-mb-xl">
      <div class="col-12 col-md-4">
        <q-card flat class="stat-card bg-positive text-white shadow-4">
          <q-card-section>
            <div class="text-caption opacity-80">Total Extraordinarios</div>
            <div class="text-h3 text-weight-bolder">{{ trackings.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card flat class="stat-card bg-primary text-white shadow-4">
          <q-card-section>
            <div class="text-caption opacity-80">Ejecutados</div>
            <div class="text-h3 text-weight-bolder">{{ executedCount }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-4">
        <q-card flat class="stat-card bg-warning text-white shadow-4">
          <q-card-section>
            <div class="text-caption opacity-80">Pendientes Aprobación</div>
            <div class="text-h3 text-weight-bolder">{{ pendingApprovalCount }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import trackingService from '../../api/tracking.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const trackings = ref([]);
const loading = ref(false);
const saving = ref(null);
const savingReq = ref(null);
const filterStatus = ref(null);
const filterApproved = ref(null);

const statusOptions = [
  { label: 'Programado', value: 'SCHEDULED' },
  { label: 'Ejecutado', value: 'EXECUTED' },
  { label: 'Pagado', value: 'PAID' },
  { label: 'Cancelado', value: 'CANCELLED' }
];

const columns = [
  { name: 'instructor', label: 'Instructor', field: r => r.instructor?.fullName, align: 'left', sortable: true },
  { name: 'apprentice', label: 'Aprendiz', field: r => r.apprentice?.fullName, align: 'left', sortable: true },
  { name: 'reason', label: 'Motivo', field: 'extraordinaryReason', align: 'left', style: 'max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' },
  { name: 'scheduledDate', label: 'Fecha', field: 'scheduledDate', align: 'center', sortable: true },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'approved', label: 'Aprobado', field: 'approvedByAdmin', align: 'center' },
  { name: 'hasFile', label: 'Archivo', field: 'driveFileId', align: 'center' },
  { name: 'signatures', label: 'Firmas', field: 'signedByInstructor', align: 'center' },
  { name: 'executed', label: 'Ejecutado', field: 'status', align: 'center' },
  { name: 'paid', label: 'Cobrado', field: 'isPaid', align: 'center' },
  { name: 'requirements', label: 'Requisitos', field: 'requirementsValidated', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

const executedCount = computed(() => trackings.value.filter(t => t.status === 'EXECUTED' || t.status === 'PAID').length);
const pendingApprovalCount = computed(() => trackings.value.filter(t => !t.approvedByAdmin && t.isActive).length);

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function statusColor(s) {
  const m = { SCHEDULED: 'orange', EXECUTED: 'green', PAID: 'purple', CANCELLED: 'grey' };
  return m[s] || 'grey';
}

function statusLabel(s) {
  const m = { SCHEDULED: 'Programado', EXECUTED: 'Ejecutado', PAID: 'Pagado', CANCELLED: 'Cancelado' };
  return m[s] || s;
}

async function fetchData() {
  loading.value = true;
  try {
    const params = {};
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterApproved.value !== null) params.approvedByAdmin = filterApproved.value;
    const res = await trackingService.getExtraordinaryTrackings(params);
    trackings.value = res.data?.trackings || res.trackings || [];
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: err.message || 'Error al cargar seguimientos.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

async function toggleRequirements(row, val) {
  savingReq.value = row._id;
  try {
    await trackingService.validateRequirements(row._id, { validated: val, notes: val ? 'Requisitos validados por administrador' : 'Validación de requisitos revocada' });
    $q.notify({ type: 'positive', message: val ? 'Requisitos validados.' : 'Validación revocada.', position: 'top', timeout: 3000 });
  } catch (err) {
    console.error(err);
    row.requirementsValidated = !val;
    $q.notify({ type: 'negative', message: err.message || 'Error al validar requisitos.', position: 'top', timeout: 5000 });
  } finally {
    savingReq.value = null;
  }
}

async function approveTracking(row) {
  saving.value = row._id;
  try {
    await trackingService.approveExtraordinary(row._id);
    $q.notify({ type: 'positive', message: 'Seguimiento extraordinario aprobado.', position: 'top', timeout: 3000 });
    fetchData();
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: err.message || 'Error al aprobar.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = null;
  }
}

async function rejectTracking(row) {
  saving.value = row._id;
  try {
    await trackingService.rejectExtraordinary(row._id);
    $q.notify({ type: 'warning', message: 'Seguimiento extraordinario rechazado.', position: 'top', timeout: 3000 });
    fetchData();
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: err.message || 'Error al rechazar.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = null;
  }
}

function openFile(url) {
  window.open(url, '_blank');
}

onMounted(fetchData);
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.extraordinary-container {
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
  background: linear-gradient(135deg, #093028 0%, #237A57 100%);
  border-radius: 20px;
  padding: 28px 32px;
  position: relative;
  overflow: hidden;
}
.cover-overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0);
  background-size: 20px 20px;
  pointer-events: none;
}
.header-content { position: relative; z-index: 1; }
.shadow-text { text-shadow: 2px 2px 8px rgba(0,0,0,0.4); }
.opacity-80 { opacity: 0.8; }
.table-card {
  border-radius: 20px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  overflow: hidden;
}
.custom-table :deep(th) {
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 2px solid rgba(0,0,0,0.05);
}
.custom-table :deep(tbody tr:hover) {
  background-color: #f0fdf4 !important;
}
.stat-card {
  border-radius: 20px;
  transition: all 0.3s ease;
}
.stat-card:hover {
  transform: translateY(-3px);
}
</style>
