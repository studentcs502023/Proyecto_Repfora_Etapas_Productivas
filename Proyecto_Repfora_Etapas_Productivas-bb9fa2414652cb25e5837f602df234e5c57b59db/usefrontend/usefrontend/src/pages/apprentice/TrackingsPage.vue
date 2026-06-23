in<template>
  <div class="trackings-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="co_present" class="q-mr-sm" size="md"/>Mis Seguimientos
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none" v-if="isProjectModality">Carga tus avances de proyecto para cada seguimiento programado.</p>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none" v-else>Cronograma y registro de evaluaciones con tus instructores.</p>
      </div>
    </div>

    <!-- Loading State -->
    <q-card v-if="loading" class="my-card no-shadow q-pa-xl text-center">
      <q-spinner color="primary" size="4em" />
      <p class="text-h6 text-primary text-weight-medium q-mt-md">Cargando seguimientos...</p>
    </q-card>

    <!-- Error/No EP State -->
    <q-card v-else-if="!ep || !isActiveEP" class="my-card no-shadow text-center q-pa-xl">
      <q-icon name="event_busy" size="5em" color="primary" class="q-mb-md" />
      <div class="text-h5 text-primary text-weight-bold">Seguimientos no disponibles</div>
      <p class="text-grey-8 q-mt-sm">Tu etapa productiva debe estar activa o en seguimiento para ver tus evaluaciones.</p>
      <q-btn color="primary" icon="app_registration" label="Registrar Etapa" to="/register-ep" class="q-mt-md header-btn text-weight-bold shadow-2" rounded />
    </q-card>

    <div v-else>
      <!-- Project Modality Info Banner -->
      <q-card class="my-card no-shadow q-mb-lg bg-amber-1" v-if="isProjectModality && !isNoRegularTracking">
        <q-card-section class="row items-center q-pa-lg">
          <q-icon name="info" color="warning" size="lg" class="q-mr-md" />
          <div>
            <div class="text-subtitle1 text-weight-bold text-warning">Modalidad de Proyecto</div>
            <div class="text-caption text-grey-8 q-mt-xs">Debes subir un archivo PDF con tus avances antes de cada seguimiento. El instructor revisar&aacute; tu progreso en la reuni&oacute;n.</div>
          </div>
        </q-card-section>
      </q-card>

      <!-- No Regular Tracking Banner -->
      <q-card class="my-card no-shadow q-mb-lg bg-blue-1" v-if="isNoRegularTracking">
        <q-card-section class="row items-center q-pa-lg">
          <q-icon name="info" color="primary" size="lg" class="q-mr-md" />
          <div>
            <div class="text-subtitle1 text-weight-bold text-primary">Solo Seguimientos Extraordinarios</div>
            <div class="text-caption text-grey-8 q-mt-xs">En tu modalidad no aplican seguimientos regulares. Solo se mostrar&aacute;n seguimientos extraordinarios solicitados por tu instructor.</div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Summary KPI -->
      <div class="row q-col-gutter-lg q-mb-lg" v-if="summary && !isNoRegularTracking">
        <div class="col-12 col-md-4">
          <q-card class="my-card no-shadow text-center q-pa-lg kpi-card">
            <q-icon name="format_list_numbered" color="primary" size="lg" class="q-mb-sm" />
            <div class="text-h3 text-weight-bolder text-primary">{{ summary.required || ep.requiredTrackings || '?' }}</div>
            <div class="text-caption text-uppercase text-weight-bold text-grey-7 q-mt-xs">Requeridos</div>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card class="my-card no-shadow text-center q-pa-lg kpi-card">
            <q-icon name="check_circle" color="positive" size="lg" class="q-mb-sm" />
            <div class="text-h3 text-weight-bolder text-positive">{{ summary.completed || ep.completedTrackings || 0 }}</div>
            <div class="text-caption text-uppercase text-weight-bold text-grey-7 q-mt-xs">Ejecutados</div>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card class="my-card no-shadow text-center q-pa-lg kpi-card">
            <q-icon name="pending_actions" color="warning" size="lg" class="q-mb-sm" />
            <div class="text-h3 text-weight-bolder text-warning">{{ summary.pending || 0 }}</div>
            <div class="text-caption text-uppercase text-weight-bold text-grey-7 q-mt-xs">Programados</div>
          </q-card>
        </div>
      </div>

      <!-- Table -->
      <q-card class="my-card no-shadow">
        <q-table
          :rows="trackings"
          :columns="columns"
          row-key="_id"
          flat
          class="custom-table bg-transparent"
          table-header-class="custom-table-header"
          hide-pagination
          :pagination="{ rowsPerPage: 50 }"
        >
          <template v-slot:body-cell-trackingNumber="props">
            <q-td :props="props">
              <div class="text-weight-bold text-primary">Seguimiento #{{ props.value }}</div>
              <q-badge v-if="props.row.isExtraordinary" color="negative" label="Extraordinario" />
            </q-td>
          </template>

          <template v-slot:body-cell-type="props">
            <q-td :props="props">
              <q-icon :name="getTypeIcon(props.value)" size="sm" color="grey-7" class="q-mr-xs" />
              {{ getTypeLabel(props.value) }}
            </q-td>
          </template>

          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-chip
                :color="getStatusColor(props.value)"
                text-color="white"
                dense
                size="sm"
              >
                {{ getStatusLabel(props.value) }}
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-document="props">
            <q-td :props="props" class="text-center">
              <q-btn
                v-if="props.row.driveFileUrl"
                type="a"
                :href="props.row.driveFileUrl"
                target="_blank"
                flat round color="primary" icon="picture_as_pdf" size="sm"
              >
                <q-tooltip>Ver Acta Firmada</q-tooltip>
              </q-btn>
              <span v-else class="text-grey">-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-advances="props">
            <q-td :props="props" class="text-center">
              <q-btn
                v-if="props.row.apprenticeDriveFileUrl"
                type="a"
                :href="props.row.apprenticeDriveFileUrl"
                target="_blank"
                flat round color="warning" icon="description" size="sm"
              >
                <q-tooltip>Ver Avances</q-tooltip>
              </q-btn>
              <q-btn
                v-else-if="props.row.status === 'SCHEDULED'"
                flat round color="grey" icon="cloud_upload" size="sm"
                @click="openAdvancesModal(props.row)"
              >
                <q-tooltip>Subir Avances</q-tooltip>
              </q-btn>
              <span v-else class="text-grey">-</span>
            </q-td>
          </template>
          
          <template v-slot:no-data>
            <div class="full-width row flex-center text-grey q-pa-lg">
              <span v-if="isNoRegularTracking">No tienes seguimientos extraordinarios programados. Tu instructor puede solicitar uno si es necesario.</span>
              <span v-else>No tienes seguimientos programados. El instructor te notificar&aacute; cuando programe uno.</span>
            </div>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- Modal: Subir Avances de Proyecto -->
    <q-dialog v-model="showAdvancesModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="uploadAdvances">
          <q-card-section class="bg-warning text-white">
            <div class="text-h6">Subir Avances - Seguimiento #{{ selectedTracking?.trackingNumber }}</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-banner class="bg-grey-2 q-mb-md rounded-borders text-caption">
              Sube un archivo PDF (m&aacute;x. 10MB) con los avances de tu proyecto para este seguimiento.
            </q-banner>

            <q-file 
              v-model="advancesFile" 
              label="Archivo de Avances (PDF)" 
              outlined dense 
              accept=".pdf"
              :rules="[val => !!val || 'El archivo es requerido', val => !val || val.size <= 10 * 1024 * 1024 || 'Máximo 10MB']"
            >
              <template v-slot:prepend><q-icon name="description" /></template>
            </q-file>
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="warning" text-color="black" label="Subir Avances" type="submit" :loading="uploadingAdvances" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import trackingService from '../../api/tracking.service';
import productiveStageService from '../../api/productiveStage.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const ep = ref(null);
const trackings = ref([]);
const summary = ref(null);
const loading = ref(true);

const showAdvancesModal = ref(false);
const selectedTracking = ref(null);
const advancesFile = ref(null);
const uploadingAdvances = ref(false);

const isProjectModality = computed(() => {
  if (!ep.value) return false;
  return ['INDIVIDUAL_PRODUCTIVE_PROJECT', 'GROUP_PRODUCTIVE_PROJECT'].includes(ep.value.modality);
});

const isNoRegularTracking = computed(() => {
  if (!ep.value) return false;
  return ['APPRENTICESHIP_CONTRACT', 'LABOR_LINK'].includes(ep.value.modality);
});

const columns = computed(() => {
  const base = [
    { name: 'trackingNumber', label: 'Número', field: 'trackingNumber', align: 'left' },
    { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
    { name: 'scheduledDate', label: 'Fecha Programada', field: row => formatDate(row.scheduledDate), align: 'left' },
    { name: 'executedDate', label: 'Fecha Ejecución', field: row => formatDate(row.executedDate), align: 'left' },
    { name: 'instructor', label: 'Instructor', field: row => row.instructor?.fullName || 'N/D', align: 'left' },
    { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  ];
  if (isProjectModality.value) {
    base.push({ name: 'advances', label: 'Avances', align: 'center' });
  } else {
    base.push({ name: 'document', label: 'Acta', align: 'center' });
  }
  return base;
});

const isActiveEP = computed(() => {
  if (!ep.value) return false;
  return ['ACTIVE', 'IN_FOLLOWUP', 'CERTIFICATION'].includes(ep.value.status);
});

onMounted(() => {
  loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const epRes = await productiveStageService.getMyEP();
    const epList = epRes.data?.eps || [];
    ep.value = epList.length > 0 ? epList[0] : null;

    if (ep.value && ep.value._id) {
      const trackRes = await trackingService.getTrackings({ productiveStageId: ep.value._id });
      const allTrackings = trackRes.data?.trackings || [];
      trackings.value = isNoRegularTracking.value
        ? allTrackings.filter(t => t.isExtraordinary)
        : allTrackings;

      try {
        const sumRes = await trackingService.getSummary(ep.value._id);
        summary.value = sumRes.data || null;
      } catch (sumErr) {
        console.warn('Could not load summary, using EP data fallback');
      }
    }
  } catch (error) {
    console.error(error);
    $q.notify({ position: 'top', timeout: 5000, type: 'negative', message: 'Error al cargar los seguimientos.' });
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function getTypeLabel(type) {
  switch(type) {
    case 'IN_PERSON': return 'Presencial';
    case 'VIRTUAL': return 'Virtual';
    case 'EXTRAORDINARY': return 'Extraordinario';
    default: return type;
  }
}

function getTypeIcon(type) {
  switch(type) {
    case 'IN_PERSON': return 'people';
    case 'VIRTUAL': return 'computer';
    case 'EXTRAORDINARY': return 'warning';
    default: return 'event';
  }
}

function getStatusColor(status) {
  switch(status) {
    case 'SCHEDULED': return 'info';
    case 'EXECUTED': return 'positive';
    case 'PAID': return 'purple';
    default: return 'grey';
  }
}

function getStatusLabel(status) {
  switch(status) {
    case 'SCHEDULED': return 'Programado';
    case 'EXECUTED': return 'Ejecutado';
    case 'PAID': return 'Finalizado';
    default: return status;
  }
}

function openAdvancesModal(tracking) {
  selectedTracking.value = tracking;
  advancesFile.value = null;
  showAdvancesModal.value = true;
}

async function uploadAdvances() {
  if (!advancesFile.value || !selectedTracking.value) return;
  uploadingAdvances.value = true;
  try {
    const formData = new FormData();
    formData.append('file', advancesFile.value);

    await trackingService.uploadAdvances(selectedTracking.value._id, formData);
    $q.notify({ position: 'top', timeout: 5000, type: 'positive', message: 'Avances subidos exitosamente.' });
    
    showAdvancesModal.value = false;
    advancesFile.value = null;
    await loadData();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al subir los avances.';
    $q.notify({ position: 'top', timeout: 5000, type: 'negative', message: msg });
  } finally {
    uploadingAdvances.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.trackings-container {
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

.my-card {
  border-radius: 20px;
  background: rgba(255,255,255,0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.kpi-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 40px rgba(0,0,0,0.1) !important;
}

.custom-table :deep(.q-table__container) { background: transparent; }
.custom-table :deep(th) {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #4a5568;
  border-bottom: 2px solid rgba(0,0,0,0.05);
}
.custom-table :deep(tbody tr) { transition: all 0.2s ease; }
.custom-table :deep(tbody tr:hover) { background-color: #f8fcfb !important; }
.custom-table :deep(td) { border-bottom: 1px solid rgba(0,0,0,0.03); }

.header-btn { transition: all 0.3s ease; }
.header-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important; }
</style>
