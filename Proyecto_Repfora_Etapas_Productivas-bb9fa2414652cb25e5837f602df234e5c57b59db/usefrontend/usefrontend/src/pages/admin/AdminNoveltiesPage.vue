<template>
  <div class="admin-novelties-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="gavel" class="q-mr-sm" size="md"/>Gestión de Novedades
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Atiende y resuelve los incidentes reportados por los instructores.</p>
      </div>
    </div>

    <!-- Filters -->
    <q-card class="filter-card my-card q-mb-lg no-shadow">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-select 
            v-model="filterStatus" 
            :options="statusOptions" 
            label="Filtrar por Estado" 
            outlined dense emit-value map-options clearable 
            color="primary"
            class="glass-input text-weight-medium"
            @update:model-value="fetchNovelties" 
          >
            <template v-slot:prepend><q-icon name="filter_list" color="grey-6" /></template>
          </q-select>
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card class="table-card my-card no-shadow">
      <q-table
        :rows="novelties"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        class="custom-table bg-transparent"
        table-header-class="custom-table-header"
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.apprentice?.fullName }}</div>
            <div class="text-caption text-grey-7">Ficha: {{ props.row.apprentice?.enrollmentNumber }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-instructor="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.reportedBy?.fullName }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <q-badge color="accent" :label="getTypeLabel(props.value)" class="role-badge q-px-sm q-py-xs text-weight-bold shadow-1" rounded />
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="getStatusColor(props.value)"
              text-color="white"
              dense
              class="status-chip text-weight-bold shadow-1"
            >
              {{ getStatusLabel(props.value) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn size="sm" color="primary" label="Gestionar" icon="settings" class="header-btn text-weight-bold shadow-2" rounded @click="openManageModal(props.row)" />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey-6 q-pa-xl">
            <q-icon size="4em" name="fact_check" class="q-mb-md full-width text-center" />
            <div class="text-h6">No hay novedades reportadas bajo este filtro.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Gestionar Novedad -->
    <q-dialog v-model="showManageModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="selectedNovelty" class="column bg-grey-1">
        <q-card-section class="bg-primary text-white row items-center q-pa-md shadow-3 z-top">
          <q-icon name="gavel" size="sm" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Gestión de Novedad: {{ selectedNovelty.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup>
            <q-tooltip class="bg-dark text-white">Cerrar</q-tooltip>
          </q-btn>
        </q-card-section>

        <q-card-section class="col q-pa-xl scroll">
          <div class="row q-col-gutter-xl" style="max-width: 1400px; margin: 0 auto;">
            
            <!-- Left Column: Details -->
            <div class="col-12 col-md-6">
              <q-card class="my-card no-shadow q-mb-lg">
                <q-card-section>
                  <div class="text-h5 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="info" class="q-mr-sm" size="sm"/> Detalles del Incidente
                  </div>
                  
                  <q-list bordered separator class="rounded-borders bg-white q-mb-md">
                    <q-item>
                      <q-item-section>
                        <q-item-label caption class="text-uppercase text-weight-bold text-primary">Tipo de Novedad</q-item-label>
                        <q-item-label class="text-weight-bold"><q-badge color="negative" :label="getTypeLabel(selectedNovelty.type)" class="q-pa-xs shadow-1" rounded/></q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption class="text-uppercase text-weight-bold text-primary">Reportado por Instructor</q-item-label>
                        <q-item-label class="text-weight-bold text-body1">{{ selectedNovelty.reportedBy?.fullName }}</q-item-label>
                        <q-item-label caption>Fecha del incidente: {{ formatDate(selectedNovelty.occurrenceDate) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>

                  <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm"><q-icon name="notes" class="q-mr-xs"/> Descripción del Instructor</div>
                  <div class="bg-blue-grey-1 q-pa-md rounded-borders q-mb-md shadow-1" style="white-space: pre-wrap;">{{ selectedNovelty.description }}</div>

                  <div v-if="selectedNovelty.attachments?.length > 0" class="q-mb-md">
                    <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm"><q-icon name="attachment" class="q-mr-xs"/> Anexos</div>
                    <q-list bordered separator dense class="bg-white rounded-borders">
                      <q-item v-for="(file, idx) in selectedNovelty.attachments" :key="idx" class="q-py-sm">
                        <q-item-section avatar><q-icon name="description" color="primary" size="md"/></q-item-section>
                        <q-item-section class="text-weight-medium">{{ file.fileName }}</q-item-section>
                        <q-item-section side>
                          <q-btn type="a" :href="file.driveFileUrl" target="_blank" flat round icon="open_in_new" color="primary" class="action-btn bg-blue-1">
                            <q-tooltip class="bg-primary text-white shadow-4">Abrir documento</q-tooltip>
                          </q-btn>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>

                  <q-btn 
                    v-if="selectedNovelty.pdfDriveUrl"
                    type="a" :href="selectedNovelty.pdfDriveUrl" target="_blank"
                    color="secondary" icon="picture_as_pdf" label="Ver PDF Oficial (Acta)" class="full-width header-btn text-weight-bold shadow-2 q-mt-md" rounded
                  />
                </q-card-section>
              </q-card>
            </div>

            <!-- Right Column: Actions -->
            <div class="col-12 col-md-6">
              <q-card class="my-card no-shadow full-height">
                <q-card-section class="q-pa-xl">
                  <div class="text-h4 text-primary text-weight-bolder q-mb-lg flex items-center">
                    <q-icon name="task_alt" class="q-mr-sm" size="md"/> Resolución
                  </div>
                  
                  <div v-if="selectedNovelty.status === 'RESOLVED'" class="bg-green-1 border-green q-pa-lg rounded-borders shadow-1">
                    <div class="text-h6 text-positive text-weight-bold q-mb-md flex items-center"><q-icon name="check_circle" class="q-mr-sm" size="sm"/> Novedad Resuelta</div>
                    <p class="text-uppercase text-weight-bold text-positive q-mb-xs">Acciones Tomadas:</p>
                    <div style="white-space: pre-wrap;" class="bg-white q-pa-md rounded-borders shadow-1 q-mb-md">{{ selectedNovelty.actionsTaken }}</div>
                    <p class="text-caption text-grey-8 text-weight-medium text-right q-mb-none"><q-icon name="person" class="q-mr-xs"/>Resuelto por: {{ selectedNovelty.resolvedBy?.fullName }}<br/><q-icon name="schedule" class="q-mr-xs"/>{{ formatDateTime(selectedNovelty.resolvedAt) }}</p>
                  </div>

                  <div v-else>
                    <q-banner class="bg-blue-1 text-primary q-mb-xl rounded-borders shadow-1 border-left-primary">
                      <template v-slot:avatar><q-icon name="info" size="md"/></template>
                      Estado actual: <strong class="text-uppercase">{{ getStatusLabel(selectedNovelty.status) }}</strong>
                    </q-banner>

                    <q-form @submit="updateStatus" class="q-gutter-xl">
                      <div>
                        <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Cambiar Estado a *</div>
                        <q-select
                          v-model="actionForm.status"
                          :options="availableStatusTransitions"
                          label="Seleccionar Estado"
                          outlined dense emit-value map-options
                          color="primary" class="glass-input"
                          :rules="[val => !!val || 'Requerido']"
                        >
                          <template v-slot:prepend><q-icon name="swap_horiz" color="primary"/></template>
                        </q-select>
                      </div>

                      <div>
                        <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Acciones Tomadas / Resolución *</div>
                        <q-input 
                          v-model="actionForm.actionsTaken" 
                          label="Describa qué gestión se realizó..." 
                          type="textarea" outlined dense rows="6" 
                          color="primary" class="glass-input bg-white"
                          :rules="[val => !!val && val.length >= 20 || 'Mínimo 20 caracteres obligatorios']" 
                        />
                      </div>

                      <q-separator class="q-my-lg opacity-20" />

                      <div class="row justify-end q-gutter-md">
                        <q-btn flat label="Cancelar" color="grey-8" class="text-weight-bold" v-close-popup />
                        <q-btn color="primary" icon="send" label="Guardar y Notificar" type="submit" :loading="saving" class="header-btn text-weight-bold shadow-2" rounded padding="sm xl" />
                      </div>
                    </q-form>
                  </div>

                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import noveltyService from '../../api/novelty.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const novelties = ref([]);
const loading = ref(false);
const filterStatus = ref(null);
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'instructor', label: 'Reportado Por', field: 'instructor', align: 'left' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
  { name: 'createdAt', label: 'Fecha Reporte', field: row => formatDate(row.createdAt), align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

const statusOptions = [
  { label: 'Pendiente', value: 'PENDING' },
  { label: 'En Gestión', value: 'IN_PROGRESS' },
  { label: 'Resuelta', value: 'RESOLVED' }
];

const noveltyTypeOptions = [
  { label: 'Deserción / Abandono', value: 'DESERTION' },
  { label: 'Problema Disciplinario', value: 'DISCIPLINARY_ISSUE' },
  { label: 'Cambio de Condiciones', value: 'COMPANY_CONDITIONS_CHANGE' },
  { label: 'Otro', value: 'OTHER' }
];

// Modal State
const showManageModal = ref(false);
const selectedNovelty = ref(null);
const saving = ref(false);

const actionForm = ref({
  status: '',
  actionsTaken: ''
});

onMounted(() => {
  fetchNovelties();
});

async function fetchNovelties() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage
    };
    if (filterStatus.value) params.status = filterStatus.value;

    const res = await noveltyService.getAll(params);
    novelties.value = res.data.data || res.data;
    if (res.data.total) pagination.value.rowsNumber = res.data.total;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar novedades.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  fetchNovelties();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('es-CO', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

function getTypeLabel(type) {
  const opt = noveltyTypeOptions.find(o => o.value === type);
  return opt ? opt.label : type;
}

function getStatusColor(status) {
  switch(status) {
    case 'PENDING': return 'orange';
    case 'IN_PROGRESS': return 'info';
    case 'RESOLVED': return 'positive';
    default: return 'grey';
  }
}

function getStatusLabel(status) {
  const opt = statusOptions.find(o => o.value === status);
  return opt ? opt.label : status;
}

const availableStatusTransitions = computed(() => {
  if (!selectedNovelty.value) return [];
  const current = selectedNovelty.value.status;
  if (current === 'PENDING') {
    return [
      { label: 'Mover a: En Gestión', value: 'IN_PROGRESS' },
      { label: 'Cerrar: Resuelta', value: 'RESOLVED' }
    ];
  } else if (current === 'IN_PROGRESS') {
    return [
      { label: 'Cerrar: Resuelta', value: 'RESOLVED' }
    ];
  }
  return [];
});

function openManageModal(novelty) {
  selectedNovelty.value = novelty;
  actionForm.value = {
    status: novelty.status === 'PENDING' ? 'IN_PROGRESS' : 'RESOLVED',
    actionsTaken: novelty.actionsTaken || ''
  };
  showManageModal.value = true;
}

async function updateStatus() {
  saving.value = true;
  try {
    await noveltyService.updateStatus(selectedNovelty.value._id, {
      status: actionForm.value.status,
      actionsTaken: actionForm.value.actionsTaken.trim()
    });
    
    $q.notify({ type: 'positive', message: 'Estado de la novedad actualizado. PDF regenerado.', position: 'top', timeout: 5000 });
    showManageModal.value = false;
    fetchNovelties();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al actualizar novedad.';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.admin-novelties-container {
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
  background: linear-gradient(135deg, #093028 0%, #237A57 100%);
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

.my-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 50px rgba(0,0,0,0.1) !important;
}

/* Inputs */
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

/* Chips & Badges */
.status-chip { letter-spacing: 0.5px; }

.action-btn { transition: all 0.2s ease; }
.action-btn:hover { transform: scale(1.15) rotate(5deg); }

.header-btn { transition: all 0.3s ease; }
.header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important;
}

.border-green { border: 1px solid #c8e6c9; }
.border-left-primary { border-left: 4px solid var(--q-primary); }
</style>
