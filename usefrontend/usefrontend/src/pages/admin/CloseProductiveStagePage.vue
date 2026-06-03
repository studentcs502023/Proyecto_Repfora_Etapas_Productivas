<template>
  <div class="close-ep-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Cierre de Etapa Productiva</h2>
        <p class="text-grey-7 q-my-sm">Validación de documentos y finalización del proceso de certificación.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="fetchEPs" :loading="loading" />
      </div>
    </div>

    <!-- Table -->
    <q-card flat bordered>
      <q-table
        :rows="eps"
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

        <template v-slot:body-cell-dates="props">
          <q-td :props="props">
            <div><strong>Inicio:</strong> {{ formatDate(props.row.startDate) }}</div>
            <div><strong>Fin:</strong> {{ formatDate(props.row.estimatedEndDate) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="props.value === 'COMPLETED' ? 'positive' : 'info'"
              text-color="white"
              dense
              size="sm"
            >
              {{ props.value === 'COMPLETED' ? 'COMPLETADA' : 'EN CERTIFICACIÓN' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn v-if="props.row.status === 'CERTIFICATION'" size="sm" color="primary" label="Revisar Cierre" @click="openReviewModal(props.row)" />
            <q-btn v-if="props.row.status === 'COMPLETED'" size="sm" outline color="positive" icon="done_all" label="Cerrada" disable />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            No hay aprendices en etapa de certificación.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Review Documents & Close -->
    <q-dialog v-model="showReviewModal" persistent maximized>
      <q-card v-if="selectedEP" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">Revisión de Documentos - {{ selectedEP.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <div class="row q-col-gutter-lg">
            
            <!-- Left Column: Documents -->
            <div class="col-12 col-md-7">
              <div class="text-h4 text-black q-mb-md">Documentos Obligatorios</div>

              <!-- Checklist de referencia para el admin -->
              <q-expansion-item
                dense
                expand-separator
                icon="checklist"
                label="Ver lista de documentos requeridos (RF-006)"
                class="q-mb-md bg-blue-1 rounded-borders"
                header-class="text-weight-bold"
              >
                <q-card flat bordered class="bg-white">
                  <q-card-section class="q-pa-sm">
                    <q-list dense>
                      <q-item v-for="(item, idx) in requiredDocumentChecklist" :key="idx" class="q-py-xs">
                        <q-item-section avatar>
                          <q-icon name="radio_button_unchecked" size="xs" color="primary" />
                        </q-item-section>
                        <q-item-section>
                          <q-item-label class="text-caption">{{ idx + 1 }}. {{ item.label }}</q-item-label>
                          <q-item-label v-if="item.note" caption class="text-warning text-caption">
                            <q-icon name="info" size="xs" /> {{ item.note }}
                          </q-item-label>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-card-section>
                </q-card>
              </q-expansion-item>
              
              <q-banner v-if="loadingDocs" class="bg-grey-2 q-mb-md text-center">
                <q-spinner color="primary" size="2em" /> Cargando estado...
              </q-banner>
              
              <div v-else-if="epStatus">
                <q-list bordered separator class="rounded-borders">
                  
                  <q-item v-for="reqDoc in requiredDocumentTypes" :key="reqDoc.value" class="q-py-md">
                    <q-item-section avatar>
                      <q-icon :name="getDocIcon(reqDoc.value)" size="2em" :color="getDocColor(reqDoc.value)" />
                    </q-item-section>

                    <q-item-section>
                      <q-item-label class="text-weight-bold">{{ reqDoc.label }}</q-item-label>
                      <q-item-label caption v-if="!hasDocument(reqDoc.value)" class="text-negative">
                        El aprendiz a&uacute;n no ha subido este documento.
                      </q-item-label>
                      <q-item-label caption v-else>
                        Subido el: {{ formatDateTime(getDocument(reqDoc.value).uploadedAt) }}
                      </q-item-label>
                      <!-- Comentarios / Observaciones del documento -->
                      <div v-if="hasDocument(reqDoc.value) && getDocument(reqDoc.value).comments && getDocument(reqDoc.value).comments.length > 0" class="q-mt-sm">
                        <q-expansion-item
                          dense
                          dense-toggle
                          expand-separator
                          :label="'Observaciones (' + getDocument(reqDoc.value).comments.length + ')'"
                          header-class="text-caption text-grey-7"
                        >
                          <q-card flat bordered class="bg-grey-1 q-mt-sm">
                            <q-card-section class="q-pa-sm">
                              <div v-for="(c, i) in getDocument(reqDoc.value).comments" :key="i" class="q-mb-sm">
                                <div class="text-caption text-grey-6">
                                  {{ formatDateTime(c.createdAt) }}
                                  <span v-if="c.author"> &mdash; {{ c.author.fullName || 'Admin' }}</span>
                                </div>
                                <div class="text-body2">{{ c.text }}</div>
                                <q-separator v-if="i < getDocument(reqDoc.value).comments.length - 1" class="q-my-xs" />
                              </div>
                            </q-card-section>
                          </q-card>
                        </q-expansion-item>
                      </div>
                    </q-item-section>

                    <q-item-section side v-if="hasDocument(reqDoc.value)">
                      <div class="row items-center q-gutter-sm">
                        <q-chip :color="getDocStatusColor(getDocument(reqDoc.value).status)" text-color="white" dense>
                          {{ getDocStatusLabel(getDocument(reqDoc.value).status) }}
                        </q-chip>
                        <q-btn type="a" :href="getDocument(reqDoc.value).driveFileUrl" target="_blank" flat round color="primary" icon="visibility">
                          <q-tooltip>Ver Documento</q-tooltip>
                        </q-btn>
                      </div>
                    </q-item-section>
                  </q-item>

                </q-list>

                <div class="q-mt-md" v-if="epStatus.submitted && epStatus.submitted.some(d => d.status === 'SUBMITTED')">
                  <div class="text-subtitle2 text-primary q-mb-sm">Acciones de Revisión Pendientes</div>
                  <q-card flat bordered class="q-pa-sm" v-for="doc in epStatus.submitted.filter(d => d.status === 'SUBMITTED')" :key="doc._id || doc.id">
                    <div class="row items-center justify-between">
                      <div class="text-weight-bold">{{ getDocTypeLabel(doc.documentType) }}</div>
                      <div class="q-gutter-xs">
                        <q-btn color="positive" size="sm" label="Aprobar" @click="approveDocument(doc._id || doc.id)" :loading="processing" />
                        <q-btn color="negative" size="sm" label="Rechazar" @click="promptReject(doc._id || doc.id)" :loading="processing" />
                      </div>
                    </div>
                  </q-card>
                </div>
              </div>

            </div>

            <!-- Right Column: Verification & Close -->
            <div class="col-12 col-md-5">
              <div class="text-h4 text-black q-mb-md">Cierre Definitivo</div>
              
              <q-card flat bordered class="bg-grey-1 q-mb-md">
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Resumen del Expediente</div>
                  <div class="row justify-between q-mb-xs">
                    <span>Bit&aacute;coras ({{ selectedEP.completedBitacoras }} / {{ selectedEP.maxBitacoras ?? 0 }})</span>
                    <q-icon :name="(selectedEP.maxBitacoras ?? 0) === 0 || selectedEP.completedBitacoras >= selectedEP.maxBitacoras ? 'check_circle' : 'cancel'"
                            :color="(selectedEP.maxBitacoras ?? 0) === 0 || selectedEP.completedBitacoras >= selectedEP.maxBitacoras ? 'positive' : 'negative'" />
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span>Seguimientos ({{ selectedEP.completedTrackings }} / {{ selectedEP.requiredTrackings ?? 0 }})</span>
                    <q-icon :name="(selectedEP.requiredTrackings ?? 0) === 0 || selectedEP.completedTrackings >= selectedEP.requiredTrackings ? 'check_circle' : 'cancel'"
                            :color="(selectedEP.requiredTrackings ?? 0) === 0 || selectedEP.completedTrackings >= selectedEP.requiredTrackings ? 'positive' : 'negative'" />
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span>Documentos Aprobados</span>
                    <q-icon :name="epStatus?.allRequiredApproved ? 'check_circle' : 'cancel'" 
                            :color="epStatus?.allRequiredApproved ? 'positive' : 'negative'" />
                  </div>
                </q-card-section>
              </q-card>

              <div class="bg-blue-1 text-primary q-pa-md rounded-borders border-blue q-mb-md">
                <div class="text-weight-bold q-mb-sm"><q-icon name="info" /> Requisitos para el cierre</div>
                <ul class="q-pl-md q-my-none text-caption">
                  <li>Todas las bit&aacute;coras deben estar aprobadas.</li>
                  <li>Todos los seguimientos deben estar ejecutados.</li>
                  <li>El documento PDF &uacute;nico (dosier de certificaci&oacute;n) debe estar cargado y <strong>aprobado</strong> por usted.</li>
                  <li>No debe haber novedades sin resolver.</li>
                </ul>
              </div>

              <q-btn 
                color="positive" size="lg" class="full-width" icon="task_alt" label="Finalizar Etapa Productiva" 
                :disable="!canClose" 
                @click="completeEP" 
                :loading="processing"
              />
              <div v-if="!canClose" class="text-center text-caption text-negative q-mt-sm">
                Aún faltan requisitos por cumplir para habilitar el cierre.
              </div>
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
    $q.notify({ type: 'negative', message: 'Error al cargar etapas.' });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  // Client side or update params
  fetchEPs();
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
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
    $q.notify({ type: 'negative', message: 'Error al cargar los documentos.' });
  } finally {
    loadingDocs.value = false;
  }
}

async function approveDocument(docId) {
  processing.value = true;
  try {
    await documentService.approve(docId);
    $q.notify({ type: 'positive', message: 'Documento aprobado.' });
    await loadDocuments();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al aprobar documento.';
    $q.notify({ type: 'negative', message: msg });
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
      $q.notify({ type: 'warning', message: 'Documento rechazado. Se ha notificado al aprendiz.' });
      await loadDocuments();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al rechazar documento.';
      $q.notify({ type: 'negative', message: msg });
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
      $q.notify({ type: 'positive', message: '¡Etapa Productiva finalizada exitosamente!' });
      showReviewModal.value = false;
      fetchEPs();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al cerrar la etapa productiva.';
      $q.notify({ type: 'negative', message: msg });
    } finally {
      processing.value = false;
    }
  });
}
</script>

<style scoped>
.close-ep-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-blue {
  border-color: #bbdefb;
}
</style>
