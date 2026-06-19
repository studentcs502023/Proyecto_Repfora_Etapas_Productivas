<template>
  <div class="trackings-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Mis Seguimientos</h2>
        <p class="text-grey-7 q-my-sm" v-if="isProjectModality">Carga tus avances de proyecto para cada seguimiento programado.</p>
        <p class="text-grey-7 q-my-sm" v-else>Cronograma y registro de evaluaciones con tus instructores.</p>
      </div>
    </div>

    <!-- Loading State -->
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
    </q-card>

    <!-- Error/No EP State -->
    <q-card flat bordered v-else-if="!ep || !isActiveEP" class="bg-blue-1 text-center q-pa-xl">
      <q-icon name="warning" size="4em" color="primary" class="q-mb-md" />
      <div class="text-h6 text-primary">Seguimientos no disponibles</div>
      <p class="text-grey-8">Tu etapa productiva debe estar activa o en seguimiento para ver tus evaluaciones.</p>
      <q-btn color="primary" outline label="Registrar Etapa" to="/register-ep" class="q-mt-md" />
    </q-card>

    <div v-else>
      <!-- Project Modality Info Banner -->
      <q-card flat bordered class="q-mb-md bg-amber-1 border-amber" v-if="isProjectModality">
        <q-card-section class="row items-center q-pa-md">
          <q-icon name="info" color="warning" size="md" class="q-mr-sm" />
          <div>
            <div class="text-subtitle2 text-weight-bold">Modalidad de Proyecto</div>
            <div class="text-caption text-grey-8">
              Debes subir un archivo PDF con tus avances antes de cada seguimiento. 
              El instructor revisar&aacute; tu progreso en la reuni&oacute;n.
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Summary KPI -->
      <div class="row q-col-gutter-md q-mb-md" v-if="summary">
        <div class="col-12 col-md-4">
          <q-card flat bordered class="bg-blue-1 border-blue text-center q-pa-md">
            <div class="text-h4 text-weight-bold text-primary">{{ summary.required || ep.requiredTrackings || '?' }}</div>
            <div class="text-caption text-grey-8">Requeridos</div>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="bg-green-1 border-green text-center q-pa-md">
            <div class="text-h4 text-weight-bold text-positive">{{ summary.completed || ep.completedTrackings || 0 }}</div>
            <div class="text-caption text-grey-8">Ejecutados</div>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="bg-orange-1 border-orange text-center q-pa-md">
            <div class="text-h4 text-weight-bold text-warning">{{ summary.pending || 0 }}</div>
            <div class="text-caption text-grey-8">Programados</div>
          </q-card>
        </div>
      </div>

      <!-- Table -->
      <q-card flat bordered>
        <q-table
          :rows="trackings"
          :columns="columns"
          row-key="_id"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 50 }"
        >
          <template v-slot:body-cell-trackingNumber="props">
            <q-td :props="props">
              <div class="text-weight-bold">Seguimiento #{{ props.value }}</div>
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
              No tienes seguimientos programados. El instructor te notificar&aacute; cuando programe uno.
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
      trackings.value = trackRes.data?.trackings || [];

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
.trackings-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-blue { border-color: #bbdefb; }
.border-green { border-color: #c8e6c9; }
.border-orange { border-color: #ffe0b2; }
.border-amber { border-color: #ffecb3; }
</style>
