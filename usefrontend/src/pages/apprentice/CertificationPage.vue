<template>
  <div class="certification-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-secondary text-weight-bold q-my-none">Certificación Final</h2>
        <p class="text-grey-7 q-my-sm">Sube tus documentos para cerrar la etapa productiva.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="loadData" :loading="loading" />
      </div>
    </div>

    <!-- Loading State -->
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
    </q-card>

    <!-- Not in Certification Phase -->
    <q-card flat bordered v-else-if="!ep || (ep.status !== 'CERTIFICATION' && ep.status !== 'COMPLETED' && ep.status !== 'ARCHIVED')" class="bg-blue-1 text-center q-pa-xl">
      <q-icon name="hourglass_empty" size="4em" color="primary" class="q-mb-md" />
      <div class="text-h6 text-primary">Aún no estás en fase de certificación</div>
      <p class="text-grey-8">Debes completar todas tus bitácoras y seguimientos antes de poder subir los documentos finales.</p>
      <q-btn color="primary" outline label="Ver mi Progreso" to="/apprentice/my-ep" class="q-mt-md" />
    </q-card>

    <div v-else-if="epStatus">
      
      <!-- EP Completed Status -->
      <q-banner v-if="ep.status === 'COMPLETED' || ep.status === 'ARCHIVED'" class="bg-green-1 text-positive q-mb-lg rounded-borders">
        <template v-slot:avatar><q-icon name="emoji_events" size="2em" /></template>
        <div class="text-h6">¡Felicidades! Tu Etapa Productiva ha finalizado exitosamente.</div>
        Todos tus documentos fueron aprobados y el proceso está cerrado.
      </q-banner>

      <!-- Overall Status Banner -->
      <q-card flat bordered class="q-mb-lg bg-grey-1" v-else>
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="text-h6 text-primary">Estado de Documentos</div>
            <div class="text-caption text-grey-8">Sube los 3 documentos obligatorios. La coordinación los revisará.</div>
          </div>
          <div class="text-right">
            <q-chip v-if="epStatus.allRequiredApproved" color="positive" text-color="white" icon="check_circle">Listo para Cierre</q-chip>
            <q-chip v-else-if="epStatus.missing.length === 0" color="info" text-color="white" icon="pending_actions">En Revisión por Admin</q-chip>
            <q-chip v-else color="warning" text-color="black" icon="warning">Faltan {{ epStatus.missing.length }} documentos</q-chip>
          </div>
        </q-card-section>
      </q-card>

      <!-- Required Documents Grid -->
      <div class="row q-col-gutter-md">
        <div class="col-12 col-md-4" v-for="docType in requiredDocumentTypes" :key="docType.value">
          <q-card flat bordered class="full-height flex column">
            <q-card-section class="bg-grey-2 q-pb-xs">
              <div class="text-subtitle1 text-weight-bold text-secondary">{{ docType.label }}</div>
            </q-card-section>
            
            <q-card-section class="col flex flex-center text-center q-pa-lg">
              
              <!-- Present -->
              <div v-if="getDocument(docType.value)" class="full-width">
                <q-icon 
                  :name="getDocIcon(getDocument(docType.value).status)" 
                  size="4em" 
                  :color="getDocColor(getDocument(docType.value).status)" 
                  class="q-mb-md" 
                />
                
                <div class="q-mb-sm">
                  <q-chip :color="getDocColor(getDocument(docType.value).status)" text-color="white" dense>
                    {{ getStatusLabel(getDocument(docType.value).status) }}
                  </q-chip>
                </div>
                
                <q-btn 
                  type="a" :href="getDocument(docType.value).driveFileUrl" target="_blank"
                  flat color="primary" icon="visibility" label="Ver Documento" size="sm" class="q-mb-sm" 
                />

                <!-- Reject Reason -->
                <div v-if="getDocument(docType.value).status === 'REJECTED'" class="bg-red-1 q-pa-sm rounded-borders text-caption text-negative q-mt-sm text-left">
                  <strong>Rechazo:</strong> {{ getLatestComment(getDocument(docType.value)) }}
                </div>
              </div>

              <!-- Missing -->
              <div v-else class="text-grey-6">
                <q-icon name="upload_file" size="4em" class="q-mb-md" />
                <p>Documento pendiente por subir.</p>
              </div>

            </q-card-section>
            
            <!-- Actions Footer -->
            <q-card-actions align="center" class="bg-grey-1" v-if="ep.status === 'CERTIFICATION'">
              <q-btn 
                v-if="!getDocument(docType.value)" 
                color="primary" icon="upload" label="Subir PDF" 
                @click="openUploadModal(docType.value)" 
                class="full-width" 
              />
              <q-btn 
                v-else-if="getDocument(docType.value).status === 'REJECTED'" 
                color="warning" text-color="black" icon="refresh" label="Volver a Subir" 
                @click="openResubmitModal(getDocument(docType.value))" 
                class="full-width" 
              />
            </q-card-actions>
          </q-card>
        </div>
      </div>

    </div>

    <!-- Modal: Upload -->
    <q-dialog v-model="showUploadModal" persistent>
      <q-card style="width: 400px;">
        <q-form @submit="uploadDocument">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Subir: {{ getDocTypeLabel(form.documentType) }}</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md">
            <q-file 
              v-model="form.file" 
              label="Seleccionar Archivo (PDF)" 
              outlined dense accept=".pdf"
              :rules="[val => !!val || 'Requerido']"
            >
              <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
            </q-file>
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Subir Archivo" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Resubmit -->
    <q-dialog v-model="showResubmitModal" persistent>
      <q-card style="width: 400px;">
        <q-form @submit="resubmitDocument">
          <q-card-section class="bg-warning text-white">
            <div class="text-h6 text-black">Corregir Documento</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md">
            <q-banner class="bg-red-1 text-negative q-mb-md rounded-borders text-caption">
              <strong>Motivo del rechazo:</strong><br>
              {{ getLatestComment(selectedDoc) }}
            </q-banner>

            <q-file 
              v-model="resubmitFile" 
              label="Nuevo Archivo (PDF)" 
              outlined dense accept=".pdf"
              :rules="[val => !!val || 'Requerido']"
            >
              <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
            </q-file>
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="warning" text-color="black" label="Subir Corrección" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import documentService from '../../api/document.service';
import productiveStageService from '../../api/productiveStage.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const ep = ref(null);
const epStatus = ref(null);
const loading = ref(true);

const requiredDocumentTypes = [
  { label: 'Certificado de la Empresa', value: 'EP_CERTIFICATE' },
  { label: 'Evaluación de Desempeño', value: 'PERFORMANCE_EVALUATION' },
  { label: 'Acta de Compromiso', value: 'COMMITMENT_LETTER' }
];

const showUploadModal = ref(false);
const showResubmitModal = ref(false);
const saving = ref(false);
const selectedDoc = ref(null);

const form = ref({
  documentType: '',
  file: null
});
const resubmitFile = ref(null);

onMounted(() => {
  loadData();
});

async function loadData() {
  loading.value = true;
  try {
    const epRes = await productiveStageService.getMyEP();
    const epList = epRes.data.data || epRes.data;
    if (Array.isArray(epList) && epList.length > 0) ep.value = epList[0];
    else if (epList && !Array.isArray(epList)) ep.value = epList;

    if (ep.value && ep.value._id) {
      const statusRes = await documentService.getEPStatus(ep.value._id);
      epStatus.value = statusRes.data.data || statusRes.data;
    }
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar el estado de certificación.' });
  } finally {
    loading.value = false;
  }
}

function getDocument(type) {
  if (!epStatus.value || !epStatus.value.submitted) return null;
  return epStatus.value.submitted.find(d => d.documentType === type);
}

function getDocTypeLabel(type) {
  const opt = requiredDocumentTypes.find(o => o.value === type);
  return opt ? opt.label : type;
}

function getStatusLabel(status) {
  switch(status) {
    case 'SUBMITTED': return 'En Revisión';
    case 'APPROVED': return 'Aprobado';
    case 'REJECTED': return 'Rechazado';
    default: return status;
  }
}

function getDocColor(status) {
  switch(status) {
    case 'SUBMITTED': return 'info';
    case 'APPROVED': return 'positive';
    case 'REJECTED': return 'negative';
    default: return 'grey';
  }
}

function getDocIcon(status) {
  switch(status) {
    case 'SUBMITTED': return 'pending_actions';
    case 'APPROVED': return 'check_circle';
    case 'REJECTED': return 'cancel';
    default: return 'description';
  }
}

function getLatestComment(doc) {
  if (!doc || !doc.comments || doc.comments.length === 0) return 'Sin comentarios';
  return doc.comments[doc.comments.length - 1].text;
}

function openUploadModal(type) {
  form.value.documentType = type;
  form.value.file = null;
  showUploadModal.value = true;
}

async function uploadDocument() {
  if (!form.value.file) return;
  saving.value = true;
  try {
    const fd = new FormData();
    fd.append('productiveStageId', ep.value._id);
    fd.append('documentType', form.value.documentType);
    fd.append('file', form.value.file);

    await documentService.upload(fd);
    $q.notify({ type: 'positive', message: 'Documento subido exitosamente.' });
    
    showUploadModal.value = false;
    await loadData();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al subir documento.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}

function openResubmitModal(doc) {
  selectedDoc.value = doc;
  resubmitFile.value = null;
  showResubmitModal.value = true;
}

async function resubmitDocument() {
  if (!resubmitFile.value || !selectedDoc.value) return;
  saving.value = true;
  try {
    const fd = new FormData();
    fd.append('file', resubmitFile.value);

    await documentService.resubmit(selectedDoc.value._id, fd);
    $q.notify({ type: 'positive', message: 'Corrección enviada a revisión.' });
    
    showResubmitModal.value = false;
    await loadData();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al enviar corrección.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.certification-container {
  max-width: 1000px;
  margin: 0 auto;
}
.full-height {
  height: 100%;
}
</style>
