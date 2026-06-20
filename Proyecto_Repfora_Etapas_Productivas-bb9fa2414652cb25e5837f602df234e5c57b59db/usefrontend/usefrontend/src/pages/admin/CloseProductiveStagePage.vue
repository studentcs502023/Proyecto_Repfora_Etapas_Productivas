<template>
  <div class="close-ep-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="verified" class="q-mr-sm" size="md"/>Cierre de Etapa Productiva
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Validación de documentos y finalización del proceso de certificación.</p>
      </div>
    </div>

    <!-- Table -->
    <q-card class="table-card my-card no-shadow">
      <q-table
        :rows="eps"
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

        <template v-slot:body-cell-dates="props">
          <q-td :props="props">
            <div><strong class="text-primary">Inicio:</strong> {{ formatDate(props.row.startDate) }}</div>
            <div><strong class="text-primary">Fin:</strong> {{ formatDate(props.row.estimatedEndDate) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="props.value === 'COMPLETED' ? 'positive' : 'info'"
              text-color="white"
              dense
              class="status-chip text-weight-bold shadow-1"
            >
              {{ props.value === 'COMPLETED' ? 'COMPLETADA' : 'EN CERTIFICACIÓN' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn v-if="props.row.status === 'CERTIFICATION'" size="sm" color="primary" icon="checklist" label="Revisar Cierre" class="header-btn text-weight-bold shadow-2" rounded @click="openReviewModal(props.row)" />
            <q-btn v-if="props.row.status === 'COMPLETED'" size="sm" outline color="positive" icon="done_all" label="Cerrada" class="text-weight-bold" rounded disable />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey-6 q-pa-xl">
            <q-icon size="4em" name="pending_actions" class="q-mb-md full-width text-center" />
            <div class="text-h6">No hay aprendices en etapa de certificación.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Review Documents & Close -->
    <q-dialog v-model="showReviewModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="selectedEP" class="column bg-grey-1">
        <q-card-section class="bg-primary text-white row items-center q-pa-md shadow-3 z-top">
          <q-icon name="verified" size="sm" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Revisión de Documentos: {{ selectedEP.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup>
            <q-tooltip class="bg-dark text-white">Cerrar</q-tooltip>
          </q-btn>
        </q-card-section>

        <q-card-section class="col q-pa-xl scroll">
          <div class="row q-col-gutter-xl" style="max-width: 1400px; margin: 0 auto;">
            
            <!-- Left Column: Documents -->
            <div class="col-12 col-md-7">
              <q-card class="my-card no-shadow q-mb-lg">
                <q-card-section>
                  <div class="text-h4 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="folder_special" class="q-mr-sm" size="md"/> Documentos Obligatorios
                  </div>

                  <!-- Checklist de referencia para el admin -->
                  <q-expansion-item
                    dense
                    expand-separator
                    icon="checklist"
                    label="Ver lista de documentos requeridos (RF-006)"
                    class="q-mb-md bg-blue-50 rounded-borders shadow-1"
                    header-class="text-weight-bold text-primary"
                  >
                    <q-card flat class="bg-white">
                      <q-card-section class="q-pa-sm">
                        <q-list dense>
                          <q-item v-for="(item, idx) in requiredDocumentChecklist" :key="idx" class="q-py-xs">
                            <q-item-section avatar>
                              <q-icon name="radio_button_unchecked" size="xs" color="primary" />
                            </q-item-section>
                            <q-item-section>
                              <q-item-label class="text-caption text-weight-medium">{{ idx + 1 }}. {{ item.label }}</q-item-label>
                              <q-item-label v-if="item.note" caption class="text-orange-8 text-caption text-weight-medium">
                                <q-icon name="info" size="xs" /> {{ item.note }}
                              </q-item-label>
                            </q-item-section>
                          </q-item>
                        </q-list>
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                  
                  <q-inner-loading :showing="loadingDocs">
                    <q-spinner-dots size="40px" color="primary" />
                  </q-inner-loading>
                  
                  <div v-if="epStatus && !loadingDocs">
                    <q-list bordered separator class="rounded-borders bg-white">
                      
                      <q-item v-for="reqDoc in requiredDocumentTypes" :key="reqDoc.value" class="q-py-md">
                        <q-item-section avatar>
                          <q-icon :name="getDocIcon(reqDoc.value)" size="md" :color="getDocColor(reqDoc.value)" />
                        </q-item-section>

                        <q-item-section>
                          <q-item-label class="text-weight-bold text-body1">{{ reqDoc.label }}</q-item-label>
                          <q-item-label caption v-if="!hasDocument(reqDoc.value)" class="text-negative text-weight-medium">
                            El aprendiz a&uacute;n no ha subido este documento.
                          </q-item-label>
                          <q-item-label caption v-else class="text-italic">
                            Subido el: {{ formatDateTime(getDocument(reqDoc.value).uploadedAt) }}
                          </q-item-label>
                          <!-- Comentarios / Observaciones del documento -->
                          <div v-if="hasDocument(reqDoc.value) && getDocument(reqDoc.value).comments && getDocument(reqDoc.value).comments.length > 0" class="q-mt-sm">
                            <q-expansion-item
                              dense
                              dense-toggle
                              expand-separator
                              :label="'Observaciones (' + getDocument(reqDoc.value).comments.length + ')'"
                              header-class="text-caption text-grey-7 text-weight-bold"
                            >
                              <q-card flat bordered class="bg-grey-1 q-mt-sm">
                                <q-card-section class="q-pa-sm">
                                  <div v-for="(c, i) in getDocument(reqDoc.value).comments" :key="i" class="q-mb-sm">
                                    <div class="text-caption text-primary text-weight-bold">
                                      {{ formatDateTime(c.createdAt) }}
                                      <span v-if="c.author"> &mdash; {{ c.author.fullName || 'Administrador' }}</span>
                                    </div>
                                    <div class="text-body2">{{ c.text }}</div>
                                    <q-separator v-if="i < getDocument(reqDoc.value).comments.length - 1" class="q-my-xs opacity-20" />
                                  </div>
                                </q-card-section>
                              </q-card>
                            </q-expansion-item>
                          </div>
                        </q-item-section>

                        <q-item-section side v-if="hasDocument(reqDoc.value)">
                          <div class="row items-center q-gutter-sm">
                            <q-chip :color="getDocStatusColor(getDocument(reqDoc.value).status)" text-color="white" dense class="shadow-1 text-weight-bold">
                              {{ getDocStatusLabel(getDocument(reqDoc.value).status) }}
                            </q-chip>
                            <q-btn type="a" :href="getDocument(reqDoc.value).driveFileUrl" target="_blank" flat round color="primary" icon="visibility" class="action-btn bg-blue-1">
                              <q-tooltip class="bg-primary text-white shadow-4">Ver Documento</q-tooltip>
                            </q-btn>
                          </div>
                        </q-item-section>
                      </q-item>

                    </q-list>

                    <div class="q-mt-xl" v-if="epStatus.submitted && epStatus.submitted.some(d => d.status === 'SUBMITTED')">
                      <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm"><q-icon name="rule" class="q-mr-xs"/> Acciones de Revisión Pendientes</div>
                      <q-card flat class="q-pa-md bg-blue-50 border-left-primary shadow-1" v-for="doc in epStatus.submitted.filter(d => d.status === 'SUBMITTED')" :key="doc._id || doc.id">
                        <div class="row items-center justify-between">
                          <div class="text-weight-bold text-primary">{{ getDocTypeLabel(doc.documentType) }}</div>
                          <div class="q-gutter-sm">
                            <q-btn color="positive" size="sm" icon="check_circle" label="Aprobar" class="header-btn text-weight-bold shadow-2" rounded @click="approveDocument(doc._id || doc.id)" :loading="processing" />
                            <q-btn color="negative" size="sm" icon="cancel" outline label="Rechazar" class="action-btn text-weight-bold" rounded @click="promptReject(doc._id || doc.id)" :loading="processing" />
                          </div>
                        </div>
                      </q-card>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Right Column: Verification & Close -->
            <div class="col-12 col-md-5">
              <q-card class="my-card no-shadow full-height">
                <q-card-section class="q-pa-xl">
                  <div class="text-h4 text-primary text-weight-bolder q-mb-lg flex items-center">
                    <q-icon name="workspace_premium" class="q-mr-sm" size="md"/> Cierre Definitivo
                  </div>
                  
                  <q-card flat bordered class="bg-white q-mb-xl shadow-1">
                    <q-card-section>
                      <div class="text-subtitle2 text-uppercase text-weight-bold text-primary q-mb-md">Resumen del Expediente</div>
                      
                      <div class="row justify-between items-center q-mb-md">
                        <span class="text-weight-medium">Bit&aacute;coras ({{ selectedEP.completedBitacoras }} / {{ selectedEP.maxBitacoras ?? 0 }})</span>
                        <q-icon :name="(selectedEP.maxBitacoras ?? 0) === 0 || selectedEP.completedBitacoras >= selectedEP.maxBitacoras ? 'check_circle' : 'cancel'"
                                :color="(selectedEP.maxBitacoras ?? 0) === 0 || selectedEP.completedBitacoras >= selectedEP.maxBitacoras ? 'positive' : 'negative'" size="sm" />
                      </div>
                      
                      <div class="row justify-between items-center q-mb-md">
                        <span class="text-weight-medium">Seguimientos ({{ selectedEP.completedTrackings }} / {{ selectedEP.requiredTrackings ?? 0 }})</span>
                        <q-icon :name="(selectedEP.requiredTrackings ?? 0) === 0 || selectedEP.completedTrackings >= selectedEP.requiredTrackings ? 'check_circle' : 'cancel'"
                                :color="(selectedEP.requiredTrackings ?? 0) === 0 || selectedEP.completedTrackings >= selectedEP.requiredTrackings ? 'positive' : 'negative'" size="sm" />
                      </div>
                      
                      <div class="row justify-between items-center q-mb-xs">
                        <span class="text-weight-medium">Documentos Aprobados</span>
                        <q-icon :name="epStatus?.allRequiredApproved ? 'check_circle' : 'cancel'" 
                                :color="epStatus?.allRequiredApproved ? 'positive' : 'negative'" size="sm" />
                      </div>
                    </q-card-section>
                  </q-card>

                  <div class="bg-blue-1 text-primary q-pa-lg rounded-borders border-left-primary shadow-1 q-mb-xl">
                    <div class="text-weight-bold text-subtitle1 q-mb-sm flex items-center"><q-icon name="info" class="q-mr-sm" size="sm"/> Requisitos para el cierre</div>
                    <ul class="q-pl-md q-my-none text-caption text-weight-medium">
                      <li class="q-mb-xs">Todas las bit&aacute;coras deben estar aprobadas.</li>
                      <li class="q-mb-xs">Todos los seguimientos deben estar ejecutados.</li>
                      <li class="q-mb-xs">El documento PDF &uacute;nico (dosier de certificaci&oacute;n) debe estar cargado y <strong>aprobado</strong> por usted.</li>
                      <li>No debe haber novedades sin resolver.</li>
                    </ul>
                  </div>

                  <q-btn 
                    color="positive" size="lg" class="full-width header-btn text-weight-bold shadow-3" icon="workspace_premium" label="Finalizar Etapa Productiva" rounded
                    :disable="!canClose" 
                    @click="completeEP" 
                    :loading="processing"
                  />
                  <div v-if="!canClose" class="text-center text-caption text-negative text-weight-bold q-mt-md">
                    <q-icon name="warning" class="q-mr-xs"/>Aún faltan requisitos por cumplir para habilitar el cierre.
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
import productiveStageService from '../../api/productiveStage.service';
import documentService from '../../api/document.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const eps = ref([]);
const loading = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const showReviewModal = ref(false);
const selectedEP = ref(null);
const epStatus = ref(null);
const loadingDocs = ref(false);
const processing = ref(false);

const requiredDocumentTypes = [
  { label: 'Dosier de Certificaci\u00f3n (PDF \u00fanico)', value: 'CERTIFICATION_DOSSIER' }
];

const requiredDocumentChecklist = [
  { label: 'Paz y Salvo diligenciado y firmado por aprendiz e instructor de seguimiento.', note: null },
  { label: 'Fotocopia del documento de identidad actualizado y legible al 150%. Extranjeros: documento del pa\u00eds de origen y permiso de permanencia temporal.', note: null },
  { label: 'Certificado de inscripci\u00f3n o registro en la Agencia P\u00fablica de Empleo (APE).', note: null },
  { label: 'Evidencia fotogr\u00e1fica de la destrucci\u00f3n del carnet estudiantil. Si no fue beneficiario, carta explicando la No entrega.', note: null },
  { label: 'Certificado de presentaci\u00f3n de pruebas TyT ante el ICFES.', note: 'Aplica SOLO para Tecn\u00f3logos' },
  { label: 'Certificado de culminaci\u00f3n de etapa productiva emitido por la empresa. Proyecto productivo: acta de cierre aprobada.', note: null },
  { label: 'Certificado de inventarios de almac\u00e9n, garantizando que no tiene elementos a su cargo.', note: null }
];

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'company', label: 'Empresa', field: row => row.companySnapshot?.companyName, align: 'left' },
  { name: 'dates', label: 'Fechas', align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

onMounted(() => {
  fetchEPs();
});

async function fetchEPs() {
  loading.value = true;
  try {
    // Solo traemos las que están en CERTIFICATION o COMPLETED (para historial)
    const resCert = await productiveStageService.getAllEPs({ status: 'CERTIFICATION', limit: 50 });
    const resComp = await productiveStageService.getAllEPs({ status: 'COMPLETED', limit: 20 });
    

    const certEps = resCert.data?.eps || [];
    const compEps = resComp.data?.eps || [];
    
    eps.value = [...certEps, ...compEps];

  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar etapas.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  // Client side or update params
  fetchEPs();
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/D';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/D';
  return new Date(dateStr).toLocaleString('es-CO', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

function getDocTypeLabel(type) {
  const opt = requiredDocumentTypes.find(o => o.value === type);
  return opt ? opt.label : type;
}

function getDocStatusColor(status) {
  switch(status) {
    case 'SUBMITTED': return 'info';
    case 'APPROVED': return 'positive';
    case 'REJECTED': return 'negative';
    default: return 'grey';
  }
}

function getDocStatusLabel(status) {
  switch(status) {
    case 'SUBMITTED': return 'Por Revisar';
    case 'APPROVED': return 'Aprobado';
    case 'REJECTED': return 'Rechazado';
    default: return status;
  }
}

function getDocument(type) {
  if (!epStatus.value || !epStatus.value.submitted) return null;
  return epStatus.value.submitted.find(d => d.documentType === type);
}

function hasDocument(type) {
  return !!getDocument(type);
}

function getDocIcon(type) {
  const doc = getDocument(type);
  if (!doc) return 'upload_file';
  if (doc.status === 'APPROVED') return 'check_circle';
  if (doc.status === 'REJECTED') return 'cancel';
  return 'pending_actions';
}

function getDocColor(type) {
  const doc = getDocument(type);
  if (!doc) return 'grey-6';
  if (doc.status === 'APPROVED') return 'positive';
  if (doc.status === 'REJECTED') return 'negative';
  return 'info';
}

const canClose = computed(() => {
  if (!selectedEP.value || !epStatus.value) return false;

  const maxBitacoras = selectedEP.value.maxBitacoras ?? 0;
  const bitacorasOk = maxBitacoras === 0 || selectedEP.value.completedBitacoras >= maxBitacoras;

  const requiredTrackings = selectedEP.value.requiredTrackings ?? 0;
  const trackingsOk = requiredTrackings === 0 || selectedEP.value.completedTrackings >= requiredTrackings;

  const docsOk = epStatus.value.allRequiredApproved;

  return bitacorasOk && trackingsOk && docsOk;
});

function openReviewModal(ep) {
  selectedEP.value = ep;
  epStatus.value = null;
  showReviewModal.value = true;
  loadDocuments();
}

async function loadDocuments() {
  loadingDocs.value = true;
  try {
    const res = await documentService.getEPStatus(selectedEP.value._id);
    epStatus.value = res.data.data || res.data;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar los documentos.', position: 'top', timeout: 5000 });
  } finally {
    loadingDocs.value = false;
  }
}

async function approveDocument(docId) {
  processing.value = true;
  try {
    await documentService.approve(docId);
    $q.notify({ type: 'positive', message: 'Documento aprobado.', position: 'top', timeout: 5000 });
    await loadDocuments();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al aprobar documento.';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    processing.value = false;
  }
}

function promptReject(docId) {
  $q.dialog({
    title: 'Rechazar Documento',
    message: 'Indique el motivo del rechazo. Sea espec\u00edfico sobre qu\u00e9 documentos faltan o deben corregirse (M\u00edn. 10 caracteres):',
    prompt: {
      model: '',
      type: 'textarea',
      isValid: val => val.length >= 10
    },
    cancel: true,
    persistent: true
  }).onOk(async data => {
    processing.value = true;
    try {
      await documentService.reject(docId, data);
      $q.notify({ type: 'warning', message: 'Documento rechazado. Se ha notificado al aprendiz.', position: 'top', timeout: 5000 });
      await loadDocuments();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al rechazar documento.';
      $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
    } finally {
      processing.value = false;
    }
  });
}

async function completeEP() {
  $q.dialog({
    title: 'Confirmar Cierre Definitivo',
    message: '¿Está seguro de que desea finalizar la Etapa Productiva de este aprendiz? Esta acción no se puede deshacer.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    processing.value = true;
    try {
      await productiveStageService.completeEP(selectedEP.value._id);
      $q.notify({ type: 'positive', message: '¡Etapa Productiva finalizada exitosamente!', position: 'top', timeout: 5000 });
      showReviewModal.value = false;
      fetchEPs();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al cerrar la etapa productiva.';
      $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
    } finally {
      processing.value = false;
    }
  });
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.close-ep-container {
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
.action-btn:hover { transform: scale(1.05) translateY(-2px); }

.header-btn { transition: all 0.3s ease; }
.header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important;
}

.border-blue { border: 1px solid #bbdefb; }
.border-left-primary { border-left: 4px solid var(--q-primary); }
</style>
