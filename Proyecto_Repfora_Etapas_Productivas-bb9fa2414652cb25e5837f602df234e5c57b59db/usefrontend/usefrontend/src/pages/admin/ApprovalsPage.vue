<template>
  <div class="approvals-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="how_to_reg" class="q-mr-sm" size="md"/>Bandeja de Aprobaciones
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Solicitudes pendientes de revisión.</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-wrapper q-mb-lg flex flex-center">
      <q-tabs
        v-model="activeTab"
        dense
        class="custom-tabs bg-white shadow-2 rounded-borders"
        active-color="white"
        active-bg-color="primary"
        indicator-color="transparent"
        align="center"
        narrow-indicator
      >
        <q-tab name="ep" class="custom-tab text-weight-bold" icon="work" label="Etapas Productivas" />
        <q-tab name="trackings" class="custom-tab text-weight-bold" icon="event" label="Seguimientos Extraordinarios" />
      </q-tabs>
    </div>

    <!-- Tab: EP Approvals -->
    <q-card v-if="activeTab === 'ep'" class="table-card my-card no-shadow">
      <q-table
        :rows="pendingEPs"
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
        
        <template v-slot:body-cell-modality="props">
          <q-td :props="props">
            <q-badge color="accent" :label="getModalityLabel(props.value)" class="role-badge q-px-sm q-py-xs text-weight-bold shadow-1" rounded />
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
            <q-btn size="sm" color="primary" label="Revisar" icon="visibility" class="header-btn text-weight-bold shadow-2" rounded @click="openReviewModal(props.row)" />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey-6 q-pa-xl">
            <q-icon size="4em" name="check_circle_outline" class="q-mb-md full-width text-center" />
            <div class="text-h6">No hay solicitudes pendientes de aprobación.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Tab: Extraordinary Trackings -->
    <q-card v-if="activeTab === 'trackings'" class="table-card my-card no-shadow">
      <q-table
        :rows="pendingExtraordinary"
        :columns="extraColumns"
        :loading="loadingExtra"
        row-key="_id"
        flat
        class="custom-table bg-transparent"
        table-header-class="custom-table-header"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>
        
        <template v-slot:body-cell-instructor="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.instructor?.fullName }}</div>
          </q-td>
        </template>
        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.apprentice?.fullName }}</div>
            <div class="text-caption text-grey-7">Ficha: {{ props.row.apprentice?.enrollmentNumber }}</div>
          </q-td>
        </template>
        <template v-slot:body-cell-reason="props">
          <q-td :props="props" class="text-caption" style="max-width: 300px;">{{ props.row.extraordinaryReason }}</q-td>
        </template>
        <template v-slot:body-cell-scheduledDate="props">
          <q-td :props="props">
            <q-chip dense color="blue-1" text-color="primary" class="text-weight-bold">{{ formatDate(props.value) }}</q-chip>
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn size="sm" flat round color="positive" icon="check_circle" class="action-btn" @click="approveExtraordinary(props.row)" :loading="props.row._loading">
              <q-tooltip class="bg-positive text-white shadow-4">Aprobar</q-tooltip>
            </q-btn>
            <q-btn size="sm" flat round color="negative" icon="cancel" class="action-btn" @click="rejectExtraordinary(props.row)">
              <q-tooltip class="bg-negative text-white shadow-4">Rechazar</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey-6 q-pa-xl">
            <q-icon size="4em" name="event_available" class="q-mb-md full-width text-center" />
            <div class="text-h6">No hay solicitudes de seguimiento extraordinario pendientes.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Review & Assign -->
    <q-dialog v-model="showReviewModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="selectedEP" class="column bg-grey-1">
        <q-card-section class="bg-primary text-white row items-center q-pa-md shadow-3 z-top">
          <q-icon name="assignment" size="sm" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Revisión de Solicitud: {{ selectedEP.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup>
            <q-tooltip class="bg-dark text-white">Cerrar</q-tooltip>
          </q-btn>
        </q-card-section>

        <q-card-section class="col q-pa-xl scroll">
          <div class="row q-col-gutter-xl" style="max-width: 1400px; margin: 0 auto;">
            
            <!-- Left Column: Details + Documents -->
            <div class="col-12 col-md-6">
              <q-card class="my-card no-shadow q-mb-lg">
                <q-card-section>
                  <div class="text-h5 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="info" class="q-mr-sm" size="sm"/> Detalles de la Solicitud
                  </div>
                  <q-list bordered separator class="rounded-borders bg-white">
                    <q-item>
                      <q-item-section>
                        <q-item-label caption class="text-uppercase text-weight-bold text-primary">Aprendiz</q-item-label>
                        <q-item-label class="text-weight-bold text-body1">{{ selectedEP.apprentice?.fullName }}</q-item-label>
                        <q-item-label caption>Ficha: {{ selectedEP.apprentice?.enrollmentNumber }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption class="text-uppercase text-weight-bold text-primary">Modalidad</q-item-label>
                        <q-item-label class="text-weight-bold"><q-badge color="accent" :label="getModalityLabel(selectedEP.modality)" class="q-pa-xs shadow-1" rounded/></q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption class="text-uppercase text-weight-bold text-primary">Fechas Propuestas</q-item-label>
                        <q-item-label class="text-weight-medium">{{ formatDate(selectedEP.startDate) }} al {{ formatDate(selectedEP.estimatedEndDate) }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption class="text-uppercase text-weight-bold text-primary">Empresa</q-item-label>
                        <q-item-label class="text-weight-medium">{{ selectedEP.companySnapshot?.companyName || (selectedEP.company?.name) }}</q-item-label>
                        <q-item-label caption>NIT: {{ selectedEP.companySnapshot?.taxId || selectedEP.company?.taxId }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label caption class="text-uppercase text-weight-bold text-primary">Supervisor (Jefe Inmediato)</q-item-label>
                        <q-item-label class="text-weight-medium">{{ selectedEP.companySnapshot?.supervisorName }}</q-item-label>
                        <q-item-label caption>{{ selectedEP.companySnapshot?.supervisorPhone }} | {{ selectedEP.companySnapshot?.supervisorEmail }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>

              <!-- Documents submitted by apprentice -->
              <q-card class="my-card no-shadow q-mb-lg">
                <q-card-section>
                  <div class="text-h5 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="folder_open" class="q-mr-sm" size="sm"/> Documentos Enviados
                  </div>
                  <q-inner-loading :showing="loadingDocs">
                    <q-spinner-dots size="40px" color="primary" />
                  </q-inner-loading>
                  <q-list v-if="!loadingDocs" bordered separator class="rounded-borders bg-white">
                    <q-item v-if="epDocuments.length === 0">
                      <q-item-section class="text-grey text-center q-pa-md">No se encontraron documentos adjuntos.</q-item-section>
                    </q-item>
                    <q-item v-for="doc in epDocuments" :key="doc._id" class="q-py-sm">
                      <q-item-section avatar>
                        <q-icon name="description" color="primary" size="32px" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-bold text-dark">{{ getDocTypeLabel(doc.documentType) }}</q-item-label>
                        <q-item-label caption class="text-italic">{{ doc.fileName }}</q-item-label>
                      </q-item-section>
                      <q-item-section side>
                        <q-badge :color="docStatusColor(doc.status)" :label="docStatusLabel(doc.status)" class="q-pa-xs shadow-1" />
                      </q-item-section>
                      <q-item-section side>
                        <q-btn flat round icon="open_in_new" color="primary" size="sm" class="action-btn bg-blue-1"
                          :href="doc.driveFileUrl" target="_blank"
                          :disable="!doc.driveFileUrl">
                          <q-tooltip class="bg-primary text-white shadow-4">Abrir documento</q-tooltip>
                        </q-btn>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>

              <!-- Reject Section -->
              <q-card class="my-card no-shadow border-red bg-red-1">
                <q-card-section>
                  <div class="text-h6 text-negative q-mb-sm text-weight-bold flex items-center">
                    <q-icon name="warning" class="q-mr-sm"/> Rechazar Solicitud
                  </div>
                  <q-input v-model="rejectReason" label="Motivo de rechazo" type="textarea" outlined dense rows="3" color="negative" class="bg-white rounded-borders q-mb-md" :rules="[val => !val || val.trim().length >= 10 || 'Mínimo 10 caracteres']" />
                  <q-btn color="negative" label="Rechazar y Notificar" icon="cancel" @click="rejectEP" class="header-btn text-weight-bold full-width shadow-2" rounded :disable="!rejectReason" :loading="processing" />
                </q-card-section>
              </q-card>
            </div>

            <!-- Right Column: Approval & Assignment -->
            <div class="col-12 col-md-6">
              <q-card class="my-card no-shadow full-height">
                <q-card-section class="q-pa-xl">
                  <div class="text-h4 text-primary text-weight-bolder q-mb-lg flex items-center">
                    <q-icon name="check_circle_outline" class="q-mr-sm" size="md"/> Aprobación y Asignación
                  </div>
                  
                  <q-banner class="bg-blue-1 text-primary q-mb-xl rounded-borders shadow-1 border-left-primary">
                    <template v-slot:avatar><q-icon name="info" size="md"/></template>
                    Según la modalidad <strong class="text-uppercase">{{ getModalityLabel(selectedEP.modality) }}</strong>, se requieren los siguientes instructores.
                  </q-banner>

                  <q-form @submit="approveAndAssign" class="q-gutter-xl">
                    
                    <!-- Followup Instructor (Always required) -->
                    <div>
                      <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Instructor de Seguimiento *</div>
                      <q-select
                        v-model="assignments.followupInstructorId"
                        :options="instructors.followup"
                        option-value="_id"
                        option-label="fullName"
                        label="Seleccionar Instructor"
                        outlined
                        color="primary" class="glass-input"
                        emit-value
                        map-options
                        :rules="[val => !!val || 'Requerido']"
                      >
                        <template v-slot:prepend><q-icon name="person_search" color="primary"/></template>
                      </q-select>
                    </div>

                    <!-- Technical Instructor (Required for Projects) -->
                    <div v-if="needsTechnicalInstructor">
                      <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Instructor Técnico *</div>
                      <q-select
                        v-model="assignments.technicalInstructorId"
                        :options="instructors.technical"
                        option-value="_id"
                        option-label="fullName"
                        label="Seleccionar Instructor"
                        outlined
                        color="primary" class="glass-input"
                        emit-value
                        map-options
                        :rules="[val => !!val || 'Requerido']"
                      >
                        <template v-slot:prepend><q-icon name="engineering" color="primary"/></template>
                      </q-select>
                    </div>

                    <!-- Project Instructor (Required for Group Projects) -->
                    <div v-if="needsProjectInstructor">
                      <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Instructor de Proyecto *</div>
                      <q-select
                        v-model="assignments.projectInstructorId"
                        :options="instructors.project"
                        option-value="_id"
                        option-label="fullName"
                        label="Seleccionar Instructor"
                        outlined
                        color="primary" class="glass-input"
                        emit-value
                        map-options
                        :rules="[val => !!val || 'Requerido']"
                      >
                        <template v-slot:prepend><q-icon name="architecture" color="primary"/></template>
                      </q-select>
                    </div>

                    <q-separator class="q-my-lg opacity-20" />
                    
                    <div class="row justify-end q-gutter-md">
                      <q-btn flat label="Cancelar" color="grey-8" class="text-weight-bold" v-close-popup />
                      <q-btn color="positive" icon="check_circle" label="Aprobar y Asignar" type="submit" :loading="processing" class="header-btn text-weight-bold shadow-2" rounded padding="sm xl" />
                    </div>
                  </q-form>
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
import { ref, computed, onMounted, watch } from 'vue';
import productiveStageService from '../../api/productiveStage.service';
import userService from '../../api/user.service';
import documentService from '../../api/document.service';
import trackingService from '../../api/tracking.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// Tabs
const activeTab = ref('ep');

// State — EP approvals
const pendingEPs = ref([]);
const loading = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

// State — Extraordinary trackings
const pendingExtraordinary = ref([]);
const loadingExtra = ref(false);

const extraColumns = [
  { name: 'instructor', label: 'Instructor', field: 'instructor', align: 'left' },
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'reason', label: 'Motivo', field: 'extraordinaryReason', align: 'left' },
  { name: 'scheduledDate', label: 'Fecha Programada', field: 'scheduledDate', align: 'left' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

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
  fetchPendingExtraordinary();
});

watch(activeTab, (tab) => {
  if (tab === 'trackings') fetchPendingExtraordinary();
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

async function fetchPendingExtraordinary() {
  loadingExtra.value = true;
  try {
    const res = await trackingService.getTrackings({ isExtraordinary: true, approvedByAdmin: false });
    const body = res.data || res;
    pendingExtraordinary.value = body.trackings || body || [];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar seguimientos extraordinarios.', position: 'top', timeout: 5000 });
  } finally {
    loadingExtra.value = false;
  }
}

async function approveExtraordinary(tracking) {
  tracking._loading = true;
  try {
    await trackingService.approveExtraordinary(tracking._id);
    $q.notify({ type: 'positive', message: 'Seguimiento extraordinario aprobado.', position: 'top', timeout: 5000 });
    pendingExtraordinary.value = pendingExtraordinary.value.filter(t => t._id !== tracking._id);
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Error al aprobar.', position: 'top', timeout: 5000 });
  } finally {
    tracking._loading = false;
  }
}

async function rejectExtraordinary(tracking) {
  tracking._loading = true;
  try {
    await trackingService.rejectExtraordinary(tracking._id);
    $q.notify({ type: 'warning', message: 'Seguimiento extraordinario rechazado.', position: 'top', timeout: 5000 });
    pendingExtraordinary.value = pendingExtraordinary.value.filter(t => t._id !== tracking._id);
  } catch (error) {
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Error al rechazar.', position: 'top', timeout: 5000 });
  } finally {
    tracking._loading = false;
  }
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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.approvals-container {
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

/* Custom Tabs */
.custom-tabs {
  border-radius: 30px !important;
  padding: 4px;
}

.custom-tab {
  border-radius: 25px;
  padding: 8px 24px;
  transition: all 0.3s ease;
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

.border-red { border: 1px solid #ffcdd2; }
.border-left-primary { border-left: 4px solid var(--q-primary); }
</style>
