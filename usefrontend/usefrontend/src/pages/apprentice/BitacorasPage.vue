<template>
  <div class="bitacoras-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Mis Bitácoras</h2>
        <p class="text-grey-7 q-my-sm">Sube y gestiona tus bitácoras quincenales.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="add" label="Subir Bitácora" @click="showUploadModal = true" :disable="!canSubmit" />
      </div>
    </div>

    <!-- Loading State -->
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
    </q-card>

    <!-- Error/No EP State -->
    <q-card flat bordered v-else-if="!ep || !isActiveEP" class="bg-blue-1 text-center q-pa-xl">
      <q-icon name="warning" size="4em" color="primary" class="q-mb-md" />
      <div class="text-h6 text-primary">No puedes subir bitácoras en este momento</div>
      <p class="text-grey-8">Tu etapa productiva debe estar activa o en seguimiento para poder cargar bitácoras.</p>
      <q-btn color="primary" outline label="Registrar Etapa" to="/register-ep" class="q-mt-md" />
    </q-card>

    <!-- Project Modality - Use Trackings instead -->
    <q-card flat bordered v-else-if="isProjectModality" class="bg-amber-1 text-center q-pa-xl">
      <q-icon name="engineering" size="4em" color="warning" class="q-mb-md" />
      <div class="text-h6 text-warning text-weight-bold">Modalidad de Proyecto</div>
      <p class="text-grey-8 q-mt-sm">
        En las modalidades de Proyecto Productivo, los avances se registran mediante <strong>seguimientos</strong> programados por tu instructor. 
        No se utilizan bitácoras quincenales.
      </p>
      <p class="text-grey-7 text-caption">
        Dirígete a la sección de <strong>Seguimientos</strong> para cargar tus avances de proyecto en cada reunión programada.
      </p>
      <q-btn color="warning" text-color="black" icon="co_present" label="Ir a Mis Seguimientos" to="/seguimientos" class="q-mt-md" />
    </q-card>

    <!-- Bitacoras List -->
    <div v-else>
      <!-- EP Progress Summary -->
      <q-card flat bordered class="q-mb-md bg-green-1 border-green">
        <q-card-section class="row items-center justify-between">
          <div>
            <div class="text-subtitle1 text-weight-bold text-positive">Progreso de Bitácoras</div>
            <div class="text-caption text-grey-8">Debes completar {{ ep.maxBitacoras || '?' }} bitácoras en total.</div>
          </div>
          <div class="text-h5 text-positive text-weight-bold">
            {{ ep.completedBitacoras }} / {{ ep.maxBitacoras || '?' }}
          </div>
        </q-card-section>
        <q-linear-progress :value="(ep.completedBitacoras / (ep.maxBitacoras || 1))" color="positive" size="10px" />
      </q-card>

      <!-- Table -->
      <q-card flat bordered>
        <q-table
          :rows="bitacoras"
          :columns="columns"
          row-key="_id"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 50 }"
        >
          <template v-slot:body-cell-logbookNumber="props">
            <q-td :props="props">
              <div class="text-weight-bold">Bitácora #{{ props.value }}</div>
              <q-badge v-if="props.row.isAdditional" color="warning" label="Extra" />
            </q-td>
          </template>

          <template v-slot:body-cell-period="props">
            <q-td :props="props">
              {{ formatDate(props.row.periodStart) }} al {{ formatDate(props.row.periodEnd) }}
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

          <template v-slot:body-cell-file="props">
            <q-td :props="props" class="text-center">
              <q-btn
                v-if="props.row.driveFileUrl"
                type="a"
                :href="props.row.driveFileUrl"
                target="_blank"
                flat round color="primary" icon="picture_as_pdf" size="sm"
              >
                <q-tooltip>Ver Archivo</q-tooltip>
              </q-btn>
              <span v-else class="text-grey">-</span>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="q-gutter-xs">
              <q-btn size="sm" flat color="primary" label="Ver Detalles" @click="viewDetails(props.row)">
                <q-badge v-if="props.row.reviewComments?.length" color="red" floating>{{ props.row.reviewComments.length }}</q-badge>
              </q-btn>
              <q-btn 
                v-if="props.row.status === 'REJECTED'" 
                size="sm" color="warning" label="Re-subir" 
                @click="openResubmitModal(props.row)" 
              />
            </q-td>
          </template>
          
          <template v-slot:no-data>
            <div class="full-width row flex-center text-grey q-pa-lg">
              No has subido ninguna bitácora aún.
            </div>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- Modal: Nueva Bitácora -->
    <q-dialog v-model="showUploadModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="submitBitacora">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Subir Bitácora</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-banner class="bg-grey-2 q-mb-md rounded-borders text-caption">
              Asegúrate de que la bitácora corresponda a una quincena (14-15 días) y esté firmada por tu jefe inmediato.
            </q-banner>

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model="form.periodStart" label="Fecha Inicio Periodo" type="date" outlined dense :rules="[val => !!val || 'Requerido', val => !form.periodEnd || new Date(val) <= new Date(form.periodEnd) || 'Debe ser anterior a la fecha fin']" />
              </div>
              <div class="col-6">
                <q-input v-model="form.periodEnd" label="Fecha Fin Periodo" type="date" outlined dense :rules="[val => !!val || 'Requerido', val => !form.periodStart || new Date(val) >= new Date(form.periodStart) || 'Debe ser posterior a la fecha inicio']" />
              </div>
            </div>

            <q-file 
              v-model="form.file" 
              label="Archivo de Bitácora (PDF)" 
              outlined dense 
              accept=".pdf"
              :rules="[val => !!val || 'El archivo es requerido', val => !val || val.size <= 10 * 1024 * 1024 || 'Máximo 10MB']"
            >
              <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
            </q-file>
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Subir Archivo" type="submit" :loading="submitting" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Re-subir Bitácora Rechazada -->
    <q-dialog v-model="showResubmitModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="resubmitBitacora">
          <q-card-section class="bg-warning text-white">
            <div class="text-h6">Corregir Bitácora #{{ selectedBitacora?.logbookNumber }}</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-banner class="bg-red-1 text-negative q-mb-md rounded-borders text-caption">
              <strong>Motivo del rechazo:</strong><br/>
              {{ latestRejectComment }}
            </q-banner>

            <q-file 
              v-model="resubmitFile" 
              label="Nuevo Archivo (PDF)" 
              outlined dense 
              accept=".pdf"
              :rules="[val => !!val || 'El archivo es requerido', val => !val || val.size <= 10 * 1024 * 1024 || 'Máximo 10MB']"
            >
              <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
            </q-file>
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="warning" text-color="black" label="Subir Corrección" type="submit" :loading="submitting" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Detalles -->
    <q-dialog v-model="showDetailsModal">
      <q-card style="width: 600px; max-width: 90vw;">
        <q-card-section class="bg-grey-2 text-primary row items-center q-pb-sm">
          <div class="text-h6">Detalle de Bitácora #{{ selectedBitacora?.logbookNumber }}</div>
          <q-space />
<q-btn icon="close" flat round dense v-close-popup>
          <q-tooltip>Cerrar</q-tooltip>
        </q-btn>
        </q-card-section>

        <q-card-section class="q-pa-md scroll" style="max-height: 60vh;">
          <div class="row q-mb-md">
            <div class="col-6"><strong>Estado:</strong> {{ getStatusLabel(selectedBitacora?.status) }}</div>
            <div class="col-6"><strong>Enviada:</strong> {{ formatDateTime(selectedBitacora?.submittedAt) }}</div>
            <div class="col-12 q-mt-sm"><strong>Revisada por:</strong> {{ selectedBitacora?.instructor?.fullName || 'N/D' }}</div>
          </div>

          <q-separator class="q-my-md" />
          <div class="text-subtitle2 text-black q-mb-sm">Comentarios</div>
          
          <q-list bordered separator v-if="selectedBitacora?.reviewComments?.length > 0">
            <q-item v-for="(comment, idx) in selectedBitacora.reviewComments" :key="idx" class="q-py-sm">
              <q-item-section avatar top>
                <q-icon name="person" color="primary" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label caption>{{ comment.author?.fullName || 'Usuario' }} - {{ formatDateTime(comment.createdAt) }}</q-item-label>
                <q-item-label class="text-body2 q-mt-xs">{{ comment.text }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
          <div v-else class="text-grey-6 text-italic">No hay comentarios.</div>

          <q-separator class="q-my-md" />
          <div class="text-subtitle2 text-black q-mb-sm">Responder</div>
          <q-input v-model="commentText" type="textarea" outlined dense rows="3" placeholder="Escribe tu respuesta o consulta sobre esta bitácora..." class="q-mb-sm" />
          <q-btn color="primary" icon="send" label="Enviar respuesta" :loading="sendingComment" :disable="!commentText.trim() || commentText.trim().length < 5" @click="sendComment" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import bitacoraService from '../../api/bitacora.service';
import productiveStageService from '../../api/productiveStage.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const ep = ref(null);
const bitacoras = ref([]);
const loading = ref(true);

const showUploadModal = ref(false);
const submitting = ref(false);
const form = ref({
  periodStart: '',
  periodEnd: '',
  file: null
});

const showResubmitModal = ref(false);
const resubmitFile = ref(null);

const showDetailsModal = ref(false);
const selectedBitacora = ref(null);
const commentText = ref('');
const sendingComment = ref(false);

const columns = [
  { name: 'logbookNumber', label: 'Número', field: 'logbookNumber', align: 'left' },
  { name: 'period', label: 'Periodo', align: 'left' },
  { name: 'submittedAt', label: 'Fecha Envío', field: row => formatDateTime(row.submittedAt), align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'file', label: 'Archivo', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

const isActiveEP = computed(() => {
  if (!ep.value) return false;
  return ['ACTIVE', 'IN_FOLLOWUP', 'CERTIFICATION'].includes(ep.value.status);
});

const isProjectModality = computed(() => {
  if (!ep.value) return false;
  return ['INDIVIDUAL_PRODUCTIVE_PROJECT', 'GROUP_PRODUCTIVE_PROJECT'].includes(ep.value.modality);
});

const canSubmit = computed(() => {
  // Si por alguna razón isActiveEP se evalúa en false, lo validamos, pero usamos fallbacks
  if (ep.value && !isActiveEP.value) return false;
  
  // Extraemos la matemática con valores seguros por defecto (|| 0 y || 999)
  // De esta manera, si la base de datos devuelve null o undefined, siempre estará destrabado
  const completed = ep.value?.completedBitacoras || 0;
  const max = ep.value?.maxBitacoras || 999;
  
  return completed < max;
});

const latestRejectComment = computed(() => {
  if (!selectedBitacora.value || !selectedBitacora.value.reviewComments) return '';
  const comments = selectedBitacora.value.reviewComments;
  if (comments.length === 0) return 'Sin comentario proporcionado.';
  return comments[comments.length - 1].text;
});

let pollInterval = null;

onMounted(() => {
  loadData();
  pollInterval = setInterval(loadData, 30000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

async function loadData() {
  loading.value = true;
  try {
    // 1. Get EP
    const epRes = await productiveStageService.getMyEP();
    // La API de myEP devuelve { data: { eps: [...] } }
    const responseData = epRes.data?.data || epRes.data || {};
    
    // Extracción robusta de la etapa productiva
    if (responseData.eps && responseData.eps.length > 0) {
      ep.value = responseData.eps[0];
    } else if (Array.isArray(responseData) && responseData.length > 0) {
      ep.value = responseData[0];
    } else {
      ep.value = responseData; // Fallback
    }

    if (ep.value && ep.value._id) {
      // 2. Get Bitacoras
      const bitRes = await bitacoraService.getByEP(ep.value._id);
      bitacoras.value = bitRes.data?.bitacoras || bitRes.data?.data || bitRes.data || [];
    }
  } catch (error) {
    console.error(error);
    $q.notify({ position: 'top', timeout: 5000, type: 'negative', message: error.message || 'Error al cargar información.' });
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function getStatusColor(status) {
  switch(status) {
    case 'PENDING': return 'orange';
    case 'IN_REVIEW': return 'info';
    case 'APPROVED': return 'positive';
    case 'REJECTED': return 'negative';
    default: return 'grey';
  }
}

function getStatusLabel(status) {
  switch(status) {
    case 'PENDING': return 'Pendiente';
    case 'IN_REVIEW': return 'En Revisión';
    case 'APPROVED': return 'Aprobada';
    case 'REJECTED': return 'Rechazada';
    default: return status;
  }
}

async function viewDetails(bitacora) {
  selectedBitacora.value = null;
  showDetailsModal.value = true;
  try {
    const res = await bitacoraService.getById(bitacora._id);
    selectedBitacora.value = res.data?.bitacora || res.data;
  } catch {
    selectedBitacora.value = bitacora;
  }
  commentText.value = '';
}

async function openResubmitModal(bitacora) {
  selectedBitacora.value = null;
  showResubmitModal.value = true;
  try {
    const res = await bitacoraService.getById(bitacora._id);
    selectedBitacora.value = res.data?.bitacora || res.data;
  } catch {
    selectedBitacora.value = bitacora;
  }
  resubmitFile.value = null;
}

async function submitBitacora() {
  submitting.value = true;
  try {
    // === 1. Validación defensiva para evitar peticiones a ciegas ===
    // Extraemos de todas las posibles rutas donde la API puede empaquetar el objeto
    let productiveStageId = 
      ep.value?._id || 
      ep.value?.id || 
      ep.value?.data?._id || 
      ep.value?.productiveStage?._id || 
      ep.value?.eps?.[0]?._id;

    // Si por alguna razón el ID es un objeto, intentamos extraer su valor interno
    if (typeof productiveStageId === 'object' && productiveStageId !== null) {
      productiveStageId = productiveStageId._id || productiveStageId.id;
    }
    
    // Validamos que no sea vacío ni un '[object Object]' (que rompería la petición Axios)
    if (!productiveStageId || String(productiveStageId) === '[object Object]') {
      console.error("❌ No se encontró un ID válido. Estructura actual de ep.value:", ep.value);
      $q.notify({ position: 'top', timeout: 5000, type: 'warning', message: 'Error interno: No se pudo identificar el ID de tu etapa productiva.' });
      submitting.value = false;
      return; // Abortamos la petición
    }

    console.log("ID enviado al backend:", productiveStageId);

    // === 2. Construcción limpia del FormData ===
    const formData = new FormData();
    formData.append('productiveStageId', productiveStageId);
    formData.append('periodStart', form.value.periodStart);
    formData.append('periodEnd', form.value.periodEnd);
    formData.append('file', form.value.file);

    await bitacoraService.submit(formData);
    $q.notify({ position: 'top', timeout: 5000, type: 'positive', message: 'Bitácora subida exitosamente.' });
    
    showUploadModal.value = false;
    form.value = { periodStart: '', periodEnd: '', file: null };
    await loadData();
  } catch (error) {
    console.error(error);
    const msg = error.message || error.response?.data?.message || 'Error al subir la bitácora.';
    $q.notify({ position: 'top', timeout: 5000, type: 'negative', message: msg });
  } finally {
    submitting.value = false;
  }
}

async function resubmitBitacora() {
  if (!resubmitFile.value || !selectedBitacora.value) return;
  submitting.value = true;
  try {
    const formData = new FormData();
    formData.append('file', resubmitFile.value);

    await bitacoraService.resubmit(selectedBitacora.value._id, formData);
    $q.notify({ position: 'top', timeout: 5000, type: 'positive', message: 'Corrección enviada exitosamente.' });
    
    showResubmitModal.value = false;
    resubmitFile.value = null;
    await loadData();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al enviar la corrección.';
    $q.notify({ position: 'top', timeout: 5000, type: 'negative', message: msg });
  } finally {
    submitting.value = false;
  }
}

async function sendComment() {
  if (!commentText.value.trim() || commentText.value.trim().length < 5) return;
  sendingComment.value = true;
  try {
    const res = await bitacoraService.addComment(selectedBitacora.value._id, commentText.value.trim());
    selectedBitacora.value = res.data?.bitacora || res.data;
    commentText.value = '';
    $q.notify({ position: 'top', timeout: 3000, type: 'positive', message: 'Respuesta enviada.' });
    await loadData();
  } catch (error) {
    console.error(error);
    $q.notify({ position: 'top', timeout: 5000, type: 'negative', message: error.message || 'Error al enviar respuesta.' });
  } finally {
    sendingComment.value = false;
  }
}
</script>

<style scoped>
.bitacoras-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-green {
  border-color: #c8e6c9;
}
</style>
