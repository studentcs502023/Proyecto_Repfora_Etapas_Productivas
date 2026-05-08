<template>
  <div class="manage-trackings-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-secondary text-weight-bold q-my-none">Gestión de Seguimientos</h2>
        <p class="text-grey-7 q-my-sm">Programa y ejecuta las sesiones de seguimiento con tus aprendices.</p>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn color="warning" outline icon="warning" label="Extraordinario" @click="openExtraordinaryModal" />
        <q-btn color="primary" icon="add" label="Programar Seguimiento" @click="openCreateModal" />
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-select 
            v-model="filterStatus" 
            :options="statusOptions" 
            label="Filtrar por Estado" 
            outlined dense emit-value map-options clearable 
            @update:model-value="fetchTrackings" 
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-checkbox v-model="showExtraordinary" label="Ver Extraordinarios" dense color="warning" @update:model-value="fetchTrackings" />
        </div>
        <div class="col-auto">
          <q-btn flat color="primary" icon="refresh" @click="fetchTrackings" :loading="loading" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered>
      <q-table
        :rows="trackings"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.apprentice?.fullName }}</div>
            <div class="text-caption text-grey-7">Ficha: {{ props.row.apprentice?.enrollmentNumber }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-trackingNumber="props">
          <q-td :props="props">
            <div class="text-weight-bold">Seguimiento #{{ props.value }}</div>
            <q-badge v-if="props.row.isExtraordinary" color="warning" label="Extra" />
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
            <q-badge v-if="props.row.isExtraordinary && !props.row.approvedByAdmin" color="negative" class="q-ml-sm" label="Esperando Admin" />
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn v-if="props.row.status === 'SCHEDULED' && (!props.row.isExtraordinary || props.row.approvedByAdmin)" 
                   size="sm" color="primary" label="Ejecutar" @click="openExecuteModal(props.row)" />
            <q-btn v-if="props.row.status === 'EXECUTED' || props.row.status === 'PAID'" 
                   size="sm" outline color="primary" icon="visibility" @click="viewDetails(props.row)">
              <q-tooltip>Ver Detalles</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            No tienes seguimientos en este estado.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Programar (Ordinario) -->
    <q-dialog v-model="showCreateModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="createTracking">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Programar Seguimiento</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-select
              v-model="form.productiveStageId"
              :options="myEPs"
              option-value="_id"
              :option-label="opt => `${opt.apprentice?.fullName} - ${opt.company?.name}`"
              label="Seleccionar Aprendiz / Etapa"
              outlined dense emit-value map-options
              :rules="[val => !!val || 'Requerido']"
            />
            
            <q-select
              v-model="form.type"
              :options="[{label:'Presencial', value:'IN_PERSON'}, {label:'Virtual', value:'VIRTUAL'}]"
              label="Tipo de Seguimiento"
              outlined dense emit-value map-options
              :rules="[val => !!val || 'Requerido']"
            />

            <q-input v-model="form.scheduledDate" label="Fecha Programada" type="date" outlined dense :rules="[val => !!val || 'Requerido']" />
            
            <q-input v-model="form.notes" label="Notas / Detalles (Opcional)" type="textarea" outlined dense rows="3" />
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Programar" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Solicitar Extraordinario -->
    <q-dialog v-model="showExtraordinaryModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="requestExtraordinary">
          <q-card-section class="bg-warning text-white">
            <div class="text-h6">Solicitar Seg. Extraordinario</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-banner class="bg-orange-1 text-warning q-mb-md rounded-borders text-caption">
              Los seguimientos extraordinarios requieren la aprobación de la coordinación antes de ser ejecutados.
            </q-banner>

            <q-select
              v-model="form.productiveStageId"
              :options="myEPs"
              option-value="_id"
              :option-label="opt => `${opt.apprentice?.fullName} - ${opt.company?.name}`"
              label="Seleccionar Aprendiz / Etapa"
              outlined dense emit-value map-options
              :rules="[val => !!val || 'Requerido']"
            />
            
            <q-select
              v-model="form.type"
              :options="[{label:'Extraordinario (Presencial)', value:'EXTRAORDINARY'}, {label:'Virtual', value:'VIRTUAL'}, {label:'Presencial', value:'IN_PERSON'}]"
              label="Tipo Base"
              outlined dense emit-value map-options
              :rules="[val => !!val || 'Requerido']"
            />

            <q-input v-model="form.scheduledDate" label="Fecha Propuesta" type="date" outlined dense :rules="[val => !!val || 'Requerido']" />
            
            <q-input v-model="form.extraordinaryReason" label="Motivo de la solicitud *" type="textarea" outlined dense rows="4" 
                     placeholder="Explique detalladamente por qué se requiere este seguimiento extra..."
                     :rules="[val => !!val && val.length >= 50 || 'Requerido. Mínimo 50 caracteres.']" />
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="warning" text-color="black" label="Solicitar" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Ejecutar Seguimiento -->
    <q-dialog v-model="showExecuteModal" persistent maximized>
      <q-card v-if="selectedTracking" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">Ejecutar Seguimiento #{{ selectedTracking.trackingNumber }} - {{ selectedTracking.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <q-stepper v-model="executeStep" ref="stepper" color="primary" animated flat bordered class="q-mx-auto" style="max-width: 800px;">
            
            <!-- Step 1: Upload PDF -->
            <q-step :name="1" title="Subir Acta Firmada" icon="upload_file" :done="executeStep > 1 || !!selectedTracking.driveFileUrl">
              <div class="q-pa-md">
                <p class="text-subtitle1 text-grey-8">Sube el documento PDF del seguimiento con las firmas correspondientes.</p>
                <div v-if="selectedTracking.driveFileUrl" class="bg-green-1 q-pa-md rounded-borders q-mb-md text-positive flex items-center">
                  <q-icon name="check_circle" size="sm" class="q-mr-sm" /> Documento subido previamente. Puedes reemplazarlo o continuar.
                </div>
                
                <q-file v-model="executeForm.file" label="Seleccionar Acta PDF" outlined accept=".pdf" class="q-mb-md">
                  <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
                </q-file>
                
                <q-btn color="secondary" label="Subir Documento" @click="uploadPDF" :loading="saving" :disable="!executeForm.file" />
              </div>
              <q-stepper-navigation>
                <q-btn color="primary" label="Continuar" @click="executeStep = 2" :disable="!selectedTracking.driveFileUrl" />
              </q-stepper-navigation>
            </q-step>

            <!-- Step 2: Validar Firmas -->
            <q-step :name="2" title="Validar Firmas" icon="draw" :done="executeStep > 2 || selectedTracking.signatureValidatedAt">
              <div class="q-pa-md">
                <p class="text-subtitle1 text-grey-8">Confirma que el documento adjunto contiene las firmas requeridas.</p>
                <q-list bordered separator class="rounded-borders q-mb-md">
                  <q-item tag="label" v-ripple>
                    <q-item-section avatar><q-checkbox v-model="executeForm.signedByInstructor" color="primary" /></q-item-section>
                    <q-item-section><q-item-label>Firma del Instructor (Mi firma)</q-item-label></q-item-section>
                  </q-item>
                  <q-item tag="label" v-ripple>
                    <q-item-section avatar><q-checkbox v-model="executeForm.signedByApprentice" color="primary" /></q-item-section>
                    <q-item-section><q-item-label>Firma del Aprendiz / Jefe Inmediato</q-item-label></q-item-section>
                  </q-item>
                </q-list>
                
                <q-btn color="secondary" label="Guardar Validación" @click="validateSignatures" :loading="saving" :disable="!executeForm.signedByInstructor" />
              </div>
              <q-stepper-navigation>
                <q-btn flat color="primary" label="Atrás" @click="executeStep = 1" class="q-mr-sm" />
                <q-btn color="primary" label="Continuar" @click="executeStep = 3" :disable="!selectedTracking.signatureValidatedAt && !executeForm.signaturesSavedLocal" />
              </q-stepper-navigation>
            </q-step>

            <!-- Step 3: Finalizar -->
            <q-step :name="3" title="Finalizar Ejecución" icon="check_circle">
              <div class="q-pa-md bg-grey-2 rounded-borders text-center">
                <q-icon name="task_alt" size="4em" color="positive" class="q-mb-md" />
                <div class="text-h6 text-primary">Todo listo para ejecutar</div>
                <p class="text-caption text-grey-8">Al confirmar, el seguimiento quedará cerrado, se sumarán las horas a tu cuenta mensual y avanzará el progreso del aprendiz.</p>
                <q-btn color="positive" size="lg" label="Marcar como Ejecutado" @click="executeTracking" :loading="saving" class="q-mt-md" />
              </div>
              <q-stepper-navigation>
                <q-btn flat color="primary" label="Atrás" @click="executeStep = 2" />
              </q-stepper-navigation>
            </q-step>

          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import trackingService from '../../api/tracking.service';
import productiveStageService from '../../api/productiveStage.service'; // Needed to fetch EPs for dropdown
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const trackings = ref([]);
const myEPs = ref([]); // List of active EPs assigned to instructor
const loading = ref(false);
const filterStatus = ref(null);
const showExtraordinary = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const statusOptions = [
  { label: 'Programados', value: 'SCHEDULED' },
  { label: 'Ejecutados', value: 'EXECUTED' },
  { label: 'Cerrados (Pagados)', value: 'PAID' }
];

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'trackingNumber', label: 'Seguimiento', field: 'trackingNumber', align: 'left' },
  { name: 'scheduledDate', label: 'Fecha Programada', field: row => formatDate(row.scheduledDate), align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

// Modals State
const showCreateModal = ref(false);
const showExtraordinaryModal = ref(false);
const saving = ref(false);

const form = ref({
  productiveStageId: '',
  type: 'IN_PERSON',
  scheduledDate: '',
  notes: '',
  extraordinaryReason: ''
});

// Execution Flow State
const showExecuteModal = ref(false);
const selectedTracking = ref(null);
const executeStep = ref(1);
const executeForm = ref({
  file: null,
  signedByInstructor: false,
  signedByApprentice: false,
  signaturesSavedLocal: false
});

onMounted(() => {
  fetchTrackings();
  fetchMyEPs();
});

async function fetchTrackings() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage
    };
    if (filterStatus.value) params.status = filterStatus.value;
    if (showExtraordinary.value) params.isExtraordinary = true;

    const res = await trackingService.getTrackings(params);
    trackings.value = res.data.data || res.data;
    if (res.data.total) pagination.value.rowsNumber = res.data.total;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar seguimientos.' });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  fetchTrackings();
}

async function fetchMyEPs() {
  try {
    // Instructor fetches all EPs (backend scopes to their assigned ones)
    const res = await productiveStageService.getAllEPs({ status: 'ACTIVE', limit: 100 });
    myEPs.value = res.data.data || res.data;
  } catch (error) {
    console.error('Error fetching EPs', error);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
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

function resetForm() {
  form.value = {
    productiveStageId: '',
    type: 'IN_PERSON',
    scheduledDate: '',
    notes: '',
    extraordinaryReason: ''
  };
}

function openCreateModal() {
  resetForm();
  form.value.type = 'IN_PERSON';
  showCreateModal.value = true;
}

function openExtraordinaryModal() {
  resetForm();
  form.value.type = 'EXTRAORDINARY';
  showExtraordinaryModal.value = true;
}

async function createTracking() {
  saving.value = true;
  try {
    const payload = {
      productiveStageId: form.value.productiveStageId,
      type: form.value.type,
      scheduledDate: form.value.scheduledDate,
      notes: form.value.notes
    };
    await trackingService.create(payload);
    $q.notify({ type: 'positive', message: 'Seguimiento programado con éxito.' });
    showCreateModal.value = false;
    fetchTrackings();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al programar seguimiento.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}

async function requestExtraordinary() {
  saving.value = true;
  try {
    const payload = {
      productiveStageId: form.value.productiveStageId,
      type: form.value.type,
      scheduledDate: form.value.scheduledDate,
      extraordinaryReason: form.value.extraordinaryReason
    };
    await trackingService.requestExtraordinary(payload);
    $q.notify({ type: 'positive', message: 'Solicitud enviada a coordinación.' });
    showExtraordinaryModal.value = false;
    fetchTrackings();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al solicitar seguimiento.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}

function openExecuteModal(tracking) {
  selectedTracking.value = tracking;
  executeStep.value = tracking.driveFileUrl ? 2 : 1;
  executeForm.value = {
    file: null,
    signedByInstructor: tracking.signedByInstructor || false,
    signedByApprentice: tracking.signedByApprentice || false,
    signaturesSavedLocal: false
  };
  showExecuteModal.value = true;
}

async function uploadPDF() {
  if (!executeForm.value.file) return;
  saving.value = true;
  try {
    const fd = new FormData();
    fd.append('file', executeForm.value.file);
    const res = await trackingService.uploadPDF(selectedTracking.value._id, fd);
    selectedTracking.value.driveFileUrl = (res.data.data || res.data).driveFileUrl;
    $q.notify({ type: 'positive', message: 'Documento subido correctamente.' });
    executeStep.value = 2;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al subir documento.' });
  } finally {
    saving.value = false;
  }
}

async function validateSignatures() {
  saving.value = true;
  try {
    await trackingService.validateSignature(selectedTracking.value._id, {
      signedByInstructor: executeForm.value.signedByInstructor,
      signedByApprentice: executeForm.value.signedByApprentice
    });
    executeForm.value.signaturesSavedLocal = true;
    selectedTracking.value.signatureValidatedAt = new Date().toISOString();
    $q.notify({ type: 'positive', message: 'Firmas validadas correctamente.' });
    executeStep.value = 3;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al validar firmas.' });
  } finally {
    saving.value = false;
  }
}

async function executeTracking() {
  saving.value = true;
  try {
    await trackingService.execute(selectedTracking.value._id);
    $q.notify({ type: 'positive', message: 'Seguimiento ejecutado exitosamente. Horas asignadas.' });
    showExecuteModal.value = false;
    fetchTrackings();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al ejecutar seguimiento.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}

function viewDetails(tracking) {
  // Simple view - could open a read-only modal similar to the execution one
  if (tracking.driveFileUrl) {
    window.open(tracking.driveFileUrl, '_blank');
  } else {
    $q.notify({ type: 'info', message: 'Este seguimiento no tiene un documento adjunto.' });
  }
}
</script>

<style scoped>
.manage-trackings-container {
  max-width: 1300px;
  margin: 0 auto;
}
</style>
