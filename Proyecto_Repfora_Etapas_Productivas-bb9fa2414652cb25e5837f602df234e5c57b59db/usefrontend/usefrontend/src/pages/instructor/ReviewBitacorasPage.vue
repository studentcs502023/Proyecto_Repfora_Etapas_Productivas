<template>
  <div class="review-bitacoras-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Revisión de Bitácoras</h2>
        <p class="text-grey-7 q-my-sm">Bandeja de bitácoras y su historial de revisión.</p>
      </div>
    </div>

    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey q-mb-md"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
    >
      <q-tab name="PENDING" label="Pendientes" />
      <q-tab name="APPROVED" label="Aprobadas" />
      <q-tab name="REJECTED" label="Rechazadas" />
    </q-tabs>

    <!-- Summary Cards -->
    <div class="column q-gutter-md q-mb-md">
      <q-card flat bordered class="summary-card pending-card cursor-pointer full-width" @click="activeTab = 'PENDING'; pagination.page = 1; fetchBitacoras();">
        <q-card-section class="row items-center">
          <q-icon name="hourglass_empty" color="orange" size="md" class="q-mr-md" />
          <div>
            <div class="text-caption text-grey-7">Pendientes de revisión</div>
            <div class="text-h4 text-weight-bold">{{ counts.pending }}</div>
          </div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="summary-card approved-card cursor-pointer full-width" @click="activeTab = 'APPROVED'; pagination.page = 1; fetchBitacoras();">
        <q-card-section class="row items-center">
          <q-icon name="check_circle" color="positive" size="md" class="q-mr-md" />
          <div>
            <div class="text-caption text-grey-7">Aprobadas</div>
            <div class="text-h4 text-weight-bold">{{ counts.approved }}</div>
          </div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="summary-card rejected-card cursor-pointer full-width" @click="activeTab = 'REJECTED'; pagination.page = 1; fetchBitacoras();">
        <q-card-section class="row items-center">
          <q-icon name="cancel" color="negative" size="md" class="q-mr-md" />
          <div>
            <div class="text-caption text-grey-7">Rechazadas</div>
            <div class="text-h4 text-weight-bold">{{ counts.rejected }}</div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Bitacoras Grid -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
      <div class="q-ml-md text-grey">Cargando bitácoras...</div>
    </div>

    <div v-else-if="bitacoras.length === 0" class="flex flex-center text-grey q-pa-xl">
      <q-icon size="2em" name="check_circle" class="q-mr-sm" />
      No hay bitácoras {{ activeTab === 'PENDING' ? 'pendientes de revisión' : activeTab === 'APPROVED' ? 'aprobadas' : 'rechazadas' }}.
    </div>

    <div v-else class="column q-gutter-md q-mb-md">
      <div v-for="b in bitacoras" :key="b._id">
        <q-card flat bordered class="bitacora-card full-width">
          <q-card-section class="q-pb-none">
            <div class="row items-center justify-between">
              <div>
                <div class="text-weight-bold text-subtitle1">{{ b.apprentice?.fullName || 'Sin nombre' }}</div>
                <div class="text-caption text-grey-7">Ficha: {{ b.apprentice?.enrollmentNumber || '-' }}</div>
              </div>
              <q-badge :color="getStatusColor(b.status)" :label="getStatusLabel(b.status)" class="q-px-sm" />
            </div>
          </q-card-section>

          <q-separator class="q-my-sm" />

          <q-card-section class="q-py-none">
            <div class="row items-center q-mb-xs">
              <q-icon name="article" size="xs" color="grey" class="q-mr-xs" />
              <span class="text-weight-bold">Bitácora #{{ b.logbookNumber }}</span>
              <q-badge v-if="b.isAdditional" color="warning" label="Extra" class="q-ml-sm" />
            </div>
            <div class="row items-center q-mb-xs">
              <q-icon name="date_range" size="xs" color="grey" class="q-mr-xs" />
              <span class="text-caption">{{ formatDate(b.periodStart) }} — {{ formatDate(b.periodEnd) }}</span>
            </div>
            <div class="row items-center q-mb-xs">
              <q-icon name="schedule" size="xs" color="grey" class="q-mr-xs" />
              <span class="text-caption">Enviada: {{ formatDateTime(b.submittedAt) }}</span>
            </div>
            <div v-if="b.assignedHours" class="row items-center q-mb-xs">
              <q-icon name="timer" size="xs" color="positive" class="q-mr-xs" />
              <span class="text-caption text-positive text-weight-bold">{{ b.assignedHours }} hrs asignadas</span>
            </div>
            <div v-if="b.reviewedAt" class="row items-center q-mb-xs">
              <q-icon name="done_all" size="xs" color="grey" class="q-mr-xs" />
              <span class="text-caption">Revisada: {{ formatDateTime(b.reviewedAt) }}</span>
            </div>
            <div v-if="b.reviewComments?.length" class="row items-center q-mb-xs">
              <q-icon name="chat" size="xs" color="info" class="q-mr-xs" />
              <span class="text-caption">{{ b.reviewComments.length }} comentario(s)</span>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pt-none">
            <q-btn v-if="activeTab === 'PENDING'" color="primary" label="Evaluar" size="sm" @click="openReviewModal(b)" />
            <q-btn flat color="grey" icon="visibility" size="sm" @click="viewHistory(b)">
              <q-tooltip>Ver historial</q-tooltip>
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="bitacoras.length > 0" class="flex flex-center q-mt-md">
      <q-pagination
        v-model="pagination.page"
        :max="Math.ceil(pagination.rowsNumber / pagination.rowsPerPage) || 1"
        :max-pages="6"
        direction-links
        boundary-links
        color="primary"
        @update:model-value="fetchBitacoras"
      />
    </div>

    <!-- Modal: Review -->
    <q-dialog v-model="showReviewModal" persistent maximized>
      <q-card v-if="selectedBitacora" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">
            {{ readonlyMode ? 'Historial' : 'Evaluar' }} Bitácora #{{ selectedBitacora.logbookNumber }} - {{ selectedBitacora.apprentice?.fullName }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup>
          <q-tooltip>Cerrar</q-tooltip>
        </q-btn>
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <div class="row q-col-gutter-lg h-full">
            
            <!-- Left Column: PDF Preview / Link -->
            <div class="col-12 col-md-7 column">
              <div class="text-h4 text-black q-mb-md">Documento Adjunto</div>
              <q-card flat bordered class="col bg-grey-2 flex flex-center text-center">
                <div class="q-pa-xl">
                  <q-icon name="picture_as_pdf" size="6em" color="negative" class="q-mb-md" />
                  <div class="text-h6">Archivo de Bitácora</div>
                  <p class="text-caption text-grey-8">Haz clic abajo para abrir el documento en Google Drive y revisarlo.</p>
                  <q-btn 
                    v-if="selectedBitacora.driveFileUrl"
                    type="a" 
                    :href="selectedBitacora.driveFileUrl" 
                    target="_blank" 
                    color="primary" 
                    label="Abrir PDF en Drive" 
                    icon="open_in_new" 
                  />
                  <div v-else class="text-negative text-weight-bold">Error: El archivo no tiene URL válida.</div>
                </div>
              </q-card>
            </div>

            <!-- Right Column -->
            <div class="col-12 col-md-5">
              <div class="text-h4 text-black q-mb-md">Información del Periodo</div>
              <q-list bordered separator class="rounded-borders q-mb-lg">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Estado</q-item-label>
                    <q-item-label>
                      <q-badge :color="getStatusColor(selectedBitacora.status)" :label="getStatusLabel(selectedBitacora.status)" />
                    </q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Enviada el</q-item-label>
                    <q-item-label>{{ formatDateTime(selectedBitacora.submittedAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Periodo Quincenal</q-item-label>
                    <q-item-label>{{ formatDate(selectedBitacora.periodStart) }} al {{ formatDate(selectedBitacora.periodEnd) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="selectedBitacora.reviewedAt">
                  <q-item-section>
                    <q-item-label caption>Revisada el</q-item-label>
                    <q-item-label>{{ formatDateTime(selectedBitacora.reviewedAt) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="selectedBitacora.assignedHours">
                  <q-item-section>
                    <q-item-label caption>Horas Asignadas</q-item-label>
                    <q-item-label>{{ selectedBitacora.assignedHours }} hrs</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div v-if="selectedBitacora?.reviewComments?.length" class="q-mb-lg">
                <div class="text-h4 text-black q-mb-sm">Historial de Comentarios</div>
                <q-list bordered separator class="rounded-borders">
                  <q-item v-for="(c, idx) in selectedBitacora.reviewComments" :key="idx" class="q-py-sm">
                    <q-item-section>
                      <q-item-label caption>{{ c.author?.fullName || 'Usuario' }} - {{ formatDateTime(c.createdAt) }}</q-item-label>
                      <q-item-label class="text-body2 q-mt-xs">{{ c.text }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <template v-if="!readonlyMode">
                <div class="text-h4 text-black q-mb-md">Decisión de Evaluación</div>
                
                <div class="q-gutter-md">
                  <q-card flat bordered class="bg-green-1 border-green">
                    <q-card-section>
                      <div class="text-subtitle1 text-positive text-weight-bold q-mb-sm">Aprobar Bitácora</div>
                      <p class="text-caption">Al aprobar, esta bitácora contará para el progreso del aprendiz y se asignarán las horas de revisión a tu cuenta.</p>
                      <q-btn color="positive" icon="check_circle" label="Aprobar" @click="approveBitacora" class="full-width" :loading="processing" />
                    </q-card-section>
                  </q-card>

                  <q-card flat bordered class="bg-red-1 border-red">
                    <q-card-section>
                      <div class="text-subtitle1 text-negative text-weight-bold q-mb-sm">Rechazar y Solicitar Corrección</div>
                      <p class="text-caption">Indica exactamente qué debe corregir el aprendiz en el documento.</p>
                      <q-input v-model="rejectReason" type="textarea" outlined dense rows="4" placeholder="Ej: Faltan las firmas en la sección 3..." class="q-mb-sm bg-white" :rules="[val => !val || val.trim().length >= 10 || 'Mínimo 10 caracteres']" />
                      <q-btn color="negative" icon="cancel" label="Rechazar" @click="rejectBitacora" class="full-width" :disable="!rejectReason.trim()" :loading="processing" />
                    </q-card-section>
                  </q-card>
                </div>
              </template>

            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated, watch } from 'vue';
import bitacoraService from '../../api/bitacora.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const activeTab = ref('PENDING');
const bitacoras = ref([]);
const loading = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const counts = ref({ pending: 0, approved: 0, rejected: 0 });

const showReviewModal = ref(false);
const selectedBitacora = ref(null);
const processing = ref(false);
const rejectReason = ref('');
const readonlyMode = ref(false);

let pollInterval = null;

onMounted(() => {
  fetchBitacoras();
  fetchCounts();
  pollInterval = setInterval(() => { fetchBitacoras(); fetchCounts(); }, 60000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

onActivated(() => {
  fetchBitacoras();
  fetchCounts();
});

watch(activeTab, () => {
  pagination.value.page = 1;
  fetchBitacoras();
});

async function fetchBitacoras() {
  loading.value = true;
  try {
    const body = await bitacoraService.getByStatus(activeTab.value, {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage
    });
    bitacoras.value = body.data?.bitacoras || body.data || [];
    if (body.data?.pagination) {
      pagination.value.rowsNumber = body.data.pagination.total;
    }
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar bitácoras.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

async function fetchCounts() {
  try {
    const [pending, approved, rejected] = await Promise.all([
      bitacoraService.getByStatus('PENDING', { limit: 1 }),
      bitacoraService.getByStatus('APPROVED', { limit: 1 }),
      bitacoraService.getByStatus('REJECTED', { limit: 1 })
    ]);
    counts.value.pending = pending.data?.pagination?.total ?? 0;
    counts.value.approved = approved.data?.pagination?.total ?? 0;
    counts.value.rejected = rejected.data?.pagination?.total ?? 0;
  } catch (error) {
    console.error('Error al obtener conteos de bitácoras:', error);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-CO', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

async function openReviewModal(bitacora) {
  try {
    const res = await bitacoraService.getById(bitacora._id);
    selectedBitacora.value = res.data?.bitacora || res.data;
  } catch {
    selectedBitacora.value = bitacora;
  }
  rejectReason.value = '';
  readonlyMode.value = false;
  showReviewModal.value = true;
}

async function viewHistory(bitacora) {
  try {
    const res = await bitacoraService.getById(bitacora._id);
    selectedBitacora.value = res.data?.bitacora || res.data;
  } catch {
    selectedBitacora.value = bitacora;
  }
  readonlyMode.value = true;
  showReviewModal.value = true;
}

async function approveBitacora() {
  $q.dialog({
    title: 'Confirmar Aprobación',
    message: '¿Está seguro de aprobar esta bitácora?',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    processing.value = true;
    try {
      await bitacoraService.approve(selectedBitacora.value._id);
      $q.notify({ type: 'positive', message: 'Bitácora aprobada exitosamente. Horas asignadas.', position: 'top', timeout: 5000 });
      showReviewModal.value = false;
      fetchBitacoras();
    } catch (error) {
      console.error(error);
      $q.notify({ type: 'negative', message: error.message || 'Error al aprobar la bitácora.', position: 'top', timeout: 5000 });
    } finally {
      processing.value = false;
    }
  });
}

async function rejectBitacora() {
  if (!rejectReason.value.trim()) return;
  processing.value = true;
  try {
    await bitacoraService.reject(selectedBitacora.value._id, rejectReason.value.trim());
    $q.notify({ type: 'warning', message: 'Bitácora rechazada y devuelta al aprendiz.', position: 'top', timeout: 5000 });
    showReviewModal.value = false;
    fetchBitacoras();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al rechazar la bitácora.', position: 'top', timeout: 5000 });
  } finally {
    processing.value = false;
  }
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
</script>

<style scoped>
.review-bitacoras-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-green {
  border-color: #c8e6c9;
}
.border-red {
  border-color: #ffcdd2;
}
.h-full {
  height: 100%;
}

.summary-card {
  border-radius: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}
.pending-card {
  border-left: 4px solid #ff9800;
}
.approved-card {
  border-left: 4px solid #4caf50;
}
.rejected-card {
  border-left: 4px solid #f44336;
}

.bitacora-card {
  border-radius: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.bitacora-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}
</style>
