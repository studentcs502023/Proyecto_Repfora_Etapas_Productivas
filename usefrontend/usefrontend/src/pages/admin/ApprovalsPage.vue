<template>
  <div class="approvals-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Bandeja de Aprobaciones</h2>
        <p class="text-grey-7 q-my-sm">Solicitudes de etapa productiva pendientes de revisión y asignación de instructores.</p>
      </div>
    </div>

    <!-- Table -->
    <q-card flat bordered>
      <q-table
        :rows="pendingEPs"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:body-cell-modality="props">
          <q-td :props="props">
            <q-badge color="accent" :label="getModalityLabel(props.value)" />
          </q-td>
        </template>
        
        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.apprentice?.fullName }}</div>
            <div class="text-caption text-grey-7">Ficha: {{ props.row.apprentice?.enrollmentNumber }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn size="sm" color="primary" label="Revisar" @click="openReviewModal(props.row)" />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            <q-icon size="2em" name="check_circle" class="q-mr-sm" />
            No hay solicitudes pendientes de aprobación.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Review & Assign -->
    <q-dialog v-model="showReviewModal" persistent maximized>
      <q-card v-if="selectedEP" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">Revisión de Solicitud: {{ selectedEP.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup>
          <q-tooltip>Cerrar</q-tooltip>
        </q-btn>
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <div class="row q-col-gutter-lg">
            
            <!-- Left Column: Details + Documents -->
            <div class="col-12 col-md-6">
              <div class="text-h4 text-black q-mb-md">Detalles de la Solicitud</div>
              <q-list bordered separator class="rounded-borders">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Aprendiz</q-item-label>
                    <q-item-label class="text-weight-bold">{{ selectedEP.apprentice?.fullName }}</q-item-label>
                    <q-item-label caption>Ficha: {{ selectedEP.apprentice?.enrollmentNumber }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Modalidad</q-item-label>
                    <q-item-label class="text-weight-bold">{{ getModalityLabel(selectedEP.modality) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Fechas Propuestas</q-item-label>
                    <q-item-label>{{ formatDate(selectedEP.startDate) }} al {{ formatDate(selectedEP.estimatedEndDate) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Empresa</q-item-label>
                    <q-item-label>{{ selectedEP.companySnapshot?.companyName || (selectedEP.company?.name) }}</q-item-label>
                    <q-item-label caption>NIT: {{ selectedEP.companySnapshot?.taxId || selectedEP.company?.taxId }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Supervisor (Jefe Inmediato)</q-item-label>
                    <q-item-label>{{ selectedEP.companySnapshot?.supervisorName }}</q-item-label>
                    <q-item-label caption>{{ selectedEP.companySnapshot?.supervisorPhone }} | {{ selectedEP.companySnapshot?.supervisorEmail }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <!-- Documents submitted by apprentice -->
              <div class="q-mt-lg">
                <div class="text-subtitle1 text-black text-weight-bold q-mb-sm">
                  <q-icon name="folder_open" class="q-mr-xs" />Documentos Enviados por el Aprendiz
                </div>
                <q-inner-loading :showing="loadingDocs">
                  <q-spinner-dots size="40px" color="primary" />
                </q-inner-loading>
                <q-list v-if="!loadingDocs" bordered separator class="rounded-borders">
                  <q-item v-if="epDocuments.length === 0">
                    <q-item-section class="text-grey text-center">No se encontraron documentos adjuntos.</q-item-section>
                  </q-item>
                  <q-item v-for="doc in epDocuments" :key="doc._id">
                    <q-item-section avatar>
                      <q-icon name="picture_as_pdf" color="negative" size="28px" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-bold">{{ getDocTypeLabel(doc.documentType) }}</q-item-label>
                      <q-item-label caption>{{ doc.fileName }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-badge :color="docStatusColor(doc.status)" :label="docStatusLabel(doc.status)" />
                    </q-item-section>
                    <q-item-section side>
                      <q-btn flat round icon="open_in_new" color="primary" size="sm"
                        :href="doc.driveFileUrl" target="_blank"
                        :disable="!doc.driveFileUrl">
                        <q-tooltip>Abrir documento</q-tooltip>
                      </q-btn>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div class="q-mt-xl bg-red-1 q-pa-md rounded-borders bordered border-red">
                <div class="text-subtitle1 text-negative q-mb-sm text-weight-bold">Rechazar Solicitud</div>
                <q-input v-model="rejectReason" label="Motivo de rechazo" type="textarea" outlined dense rows="3" :rules="[val => !val || val.trim().length >= 10 || 'Mínimo 10 caracteres']" />
                <q-btn color="negative" label="Rechazar y Notificar" @click="rejectEP" class="q-mt-sm" :disable="!rejectReason" :loading="processing" />
              </div>
            </div>

            <!-- Right Column: Approval & Assignment -->
            <div class="col-12 col-md-6">
              <div class="text-h4 text-black q-mb-md">Aprobación y Asignación</div>
              
              <q-banner class="bg-blue-1 text-primary q-mb-md rounded-borders">
                <template v-slot:avatar><q-icon name="info" /></template>
                Según la modalidad <strong>{{ getModalityLabel(selectedEP.modality) }}</strong>, se requieren los siguientes instructores.
              </q-banner>

              <q-form @submit="approveAndAssign" class="q-gutter-md">
                
                <!-- Followup Instructor (Always required) -->
                <q-select
                  v-model="assignments.followupInstructorId"
                  :options="instructors.followup"
                  option-value="_id"
                  option-label="fullName"
                  label="Instructor de Seguimiento *"
                  outlined
                  emit-value
                  map-options
                  :rules="[val => !!val || 'Requerido']"
                />

                <!-- Technical Instructor (Required for Projects) -->
                <q-select
                  v-if="needsTechnicalInstructor"
                  v-model="assignments.technicalInstructorId"
                  :options="instructors.technical"
                  option-value="_id"
                  option-label="fullName"
                  label="Instructor Técnico *"
                  outlined
                  emit-value
                  map-options
                  :rules="[val => !!val || 'Requerido']"
                />

                <!-- Project Instructor (Required for Group Projects) -->
                <q-select
                  v-if="needsProjectInstructor"
                  v-model="assignments.projectInstructorId"
                  :options="instructors.project"
                  option-value="_id"
                  option-label="fullName"
                  label="Instructor de Proyecto *"
                  outlined
                  emit-value
                  map-options
                  :rules="[val => !!val || 'Requerido']"
                />

                <q-separator class="q-my-md" />
                
                <div class="row justify-end q-gutter-sm">
                  <q-btn flat label="Cancelar" v-close-popup />
                  <q-btn color="positive" icon="check_circle" label="Aprobar y Asignar" type="submit" :loading="processing" />
                </div>
              </q-form>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import productiveStageService from '../../api/productiveStage.service';
import userService from '../../api/user.service';
import documentService from '../../api/document.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const pendingEPs = ref([]);
const loading = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const showReviewModal = ref(false);
const selectedEP = ref(null);
const processing = ref(false);
const rejectReason = ref('');
const epDocuments = ref([]);
const loadingDocs = ref(false);

const assignments = ref({
  followupInstructorId: '',
  technicalInstructorId: '',
  projectInstructorId: ''
});

// Instructors cached lists
const instructors = ref({
  followup: [],
  technical: [],
  project: []
});

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'modality', label: 'Modalidad', field: 'modality', align: 'left' },
  { name: 'company', label: 'Empresa', field: row => row.companySnapshot?.companyName || row.company?.name || 'N/D', align: 'left' },
  { name: 'dates', label: 'Inicio Estimado', field: row => formatDate(row.startDate), align: 'left' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

const modalityOptions = [
  { label: 'Contrato de Aprendizaje', value: 'APPRENTICESHIP_CONTRACT' },
  { label: 'Vínculo Laboral', value: 'LABOR_LINK' },
  { label: 'Pasantía', value: 'INTERNSHIP' },
  { label: 'Proyecto Productivo Individual', value: 'INDIVIDUAL_PRODUCTIVE_PROJECT' },
  { label: 'Proyecto Productivo Grupal', value: 'GROUP_PRODUCTIVE_PROJECT' }
];

onMounted(() => {
  fetchPendingEPs();
  preloadInstructors();
});

// Computed properties for dynamic assignment rules
const needsTechnicalInstructor = computed(() => {
  if (!selectedEP.value) return false;
  return ['INDIVIDUAL_PRODUCTIVE_PROJECT', 'GROUP_PRODUCTIVE_PROJECT'].includes(selectedEP.value.modality);
});

const needsProjectInstructor = computed(() => {
  if (!selectedEP.value) return false;
  return selectedEP.value.modality === 'GROUP_PRODUCTIVE_PROJECT';
});

function getModalityLabel(val) {
  const opt = modalityOptions.find(o => o.value === val);
  return opt ? opt.label : val;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/D';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

async function fetchPendingEPs() {
  loading.value = true;
  try {
    const res = await productiveStageService.getAllEPs({ 
      status: 'PENDING_APPROVAL',
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage
    });
    const payload = res.data.data || res.data;
    pendingEPs.value = payload.eps || payload;
    if (payload.pagination?.total) pagination.value.rowsNumber = payload.pagination.total;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar solicitudes pendientes.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  fetchPendingEPs();
}

async function preloadInstructors() {
  try {
    // In a real scenario we might fetch by type, or fetch all active and filter client-side
    const res = await userService.getInstructors({ limit: 100, status: 'ACTIVE' });
    const resData = res.data.data || res.data;
    const allInstructors = resData.instructors || resData;
    
    const list = Array.isArray(allInstructors) ? allInstructors : [];
    instructors.value.followup = list.filter(i => i.instructorType === 'FOLLOWUP');
    instructors.value.technical = list.filter(i => i.instructorType === 'TECHNICAL');
    instructors.value.project = list.filter(i => i.instructorType === 'PROJECT');
  } catch (error) {
    console.error('Error loading instructors', error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar instructores.', position: 'top', timeout: 5000 });
  }
}

async function openReviewModal(ep) {
  selectedEP.value = ep;
  rejectReason.value = '';
  epDocuments.value = [];
  assignments.value = {
    followupInstructorId: '',
    technicalInstructorId: '',
    projectInstructorId: ''
  };
  showReviewModal.value = true;

  // Load documents for this EP
  loadingDocs.value = true;
  try {
    const res = await documentService.getDocuments({ productiveStageId: ep._id });
    epDocuments.value = res.data.data || res.data || [];
  } catch (e) {
    console.error('Error loading documents:', e);
    $q.notify({ type: 'negative', message: 'Error al cargar documentos de la etapa.', position: 'top', timeout: 5000 });
  } finally {
    loadingDocs.value = false;
  }
}

function getDocTypeLabel(type) {
  const map = {
    SIGNED_CONTRACT: 'Contrato firmado',
    ARL_CERTIFICATE: 'Certificado ARL',
    PAYROLL_REGISTRY: 'Registro en planilla',
    ACCEPTANCE_LETTER: 'Carta de aceptación / Convenio',
    ALTERNATIVE_SELECTION_FORMAT: 'Formato selección de alternativa',
    ACTIVITIES_SCHEDULE: 'Cronograma de actividades',
    PROJECT_PROPOSAL: 'Propuesta de proyecto',
    ENTITY_ENDORSEMENT: 'Aval de entidad/empresa',
    BUDGET: 'Presupuesto',
    EMPLOYMENT_CONTRACT: 'Contrato laboral / Acta de vinculación',
    JOB_DESCRIPTION: 'Descripción del cargo',
    CERTIFICATION_DOSSIER: 'Dosier de Certificacion',
    EP_CERTIFICATE: 'Certificado de Etapa Productiva',
    PERFORMANCE_EVALUATION: 'Evaluacion de Desempeno',
    COMMITMENT_LETTER: 'Carta de Compromiso',
    OTHER: 'Soporte general'
  };
  return map[type] || type;
}

function docStatusLabel(status) {
  const map = { SUBMITTED: 'Enviado', IN_VALIDATION: 'En Validación', APPROVED: 'Aprobado', REJECTED: 'Rechazado' };
  return map[status] || status;
}

function docStatusColor(status) {
  const map = { SUBMITTED: 'orange', IN_VALIDATION: 'blue', APPROVED: 'positive', REJECTED: 'negative' };
  return map[status] || 'grey';
}

async function approveAndAssign() {
  processing.value = true;
  try {
    const epId = selectedEP.value._id;
    
    // 1. Approve EP (This endpoint sets status to ACTIVE and creates Drive folder)
    await productiveStageService.approveEP(epId, {
      startDate: selectedEP.value.startDate,
      estimatedEndDate: selectedEP.value.estimatedEndDate
    });

    // 2. Assign Instructors dynamically based on required fields
    const payload = { followupInstructorId: assignments.value.followupInstructorId };
    if (needsTechnicalInstructor.value) payload.technicalInstructorId = assignments.value.technicalInstructorId;
    if (needsProjectInstructor.value) payload.projectInstructorId = assignments.value.projectInstructorId;

    await productiveStageService.assignInstructors(epId, payload);

    $q.notify({ type: 'positive', message: 'Etapa aprobada y asignada exitosamente.', position: 'top', timeout: 5000 });
    showReviewModal.value = false;
    fetchPendingEPs();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error en el proceso de aprobación.';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    processing.value = false;
  }
}

async function rejectEP() {
  if (!rejectReason.value) return;
  processing.value = true;
  try {
    await productiveStageService.rejectEP(selectedEP.value._id, rejectReason.value.trim());
    $q.notify({ type: 'warning', message: 'Solicitud rechazada y notificada al aprendiz.', position: 'top', timeout: 5000 });
    showReviewModal.value = false;
    fetchPendingEPs();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al rechazar solicitud.';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    processing.value = false;
  }
}
</script>

<style scoped>
.approvals-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-red {
  border-color: #ffcdd2;
}
</style>
