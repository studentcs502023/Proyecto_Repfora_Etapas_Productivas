<template>
  <div class="review-bitacoras-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="rule_folder" class="q-mr-sm" size="md"/>Revisión de Bitácoras
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Bandeja de bitácoras y su historial de revisión.</p>
      </div>
    </div>

    <!-- Summary Cards / Tabs Combo -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card flat class="summary-card pending-card cursor-pointer" :class="{ 'card-active': activeTab === 'PENDING' }" @click="activeTab = 'PENDING'">
          <q-card-section class="row items-center justify-between q-pa-lg">
            <div>
              <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Pendientes</div>
              <div class="text-h3 text-weight-bolder text-warning q-mt-xs">{{ counts.pending }}</div>
            </div>
            <div class="icon-circle bg-warning-light">
              <q-icon name="hourglass_empty" color="warning" size="md" />
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat class="summary-card approved-card cursor-pointer" :class="{ 'card-active': activeTab === 'APPROVED' }" @click="activeTab = 'APPROVED'">
          <q-card-section class="row items-center justify-between q-pa-lg">
            <div>
              <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Aprobadas</div>
              <div class="text-h3 text-weight-bolder text-positive q-mt-xs">{{ counts.approved }}</div>
            </div>
            <div class="icon-circle bg-positive-light">
              <q-icon name="check_circle" color="positive" size="md" />
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat class="summary-card rejected-card cursor-pointer" :class="{ 'card-active': activeTab === 'REJECTED' }" @click="activeTab = 'REJECTED'">
          <q-card-section class="row items-center justify-between q-pa-lg">
            <div>
              <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Rechazadas</div>
              <div class="text-h3 text-weight-bolder text-negative q-mt-xs">{{ counts.rejected }}</div>
            </div>
            <div class="icon-circle bg-negative-light">
              <q-icon name="cancel" color="negative" size="md" />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Hidden tabs but keeps activeTab reactive control -->
    <div class="row items-center justify-between q-mb-md">
      <div class="text-subtitle1 text-weight-bold text-grey-8">
        Mostrando: <span class="text-primary">{{ getTabLabel(activeTab) }}</span>
      </div>
    </div>

    <!-- Bitacoras Grid -->
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="4em" />
      <div class="q-ml-md text-h6 text-primary text-weight-medium">Cargando bitácoras...</div>
    </div>

    <div v-else-if="bitacoras.length === 0" class="flex flex-center text-grey q-pa-xl">
      <q-card flat class="empty-card q-pa-xl text-center">
        <q-icon size="4em" name="assignment_turned_in" color="grey-4" class="q-mb-md" />
        <div class="text-h6 text-grey-6">Sin bitácoras aquí</div>
        <div class="text-caption">No hay bitácoras {{ activeTab === 'PENDING' ? 'pendientes de revisión' : activeTab === 'APPROVED' ? 'aprobadas' : 'rechazadas' }} en este momento.</div>
      </q-card>
    </div>

    <div v-else class="row q-col-gutter-md q-mb-md">
      <div v-for="b in bitacoras" :key="b._id" class="col-12 col-md-6">
        <q-card flat class="bitacora-card">
          <q-card-section class="q-pb-none">
            <div class="row items-center justify-between no-wrap">
              <div class="row items-center">
                <q-avatar size="40px" color="primary" text-color="white" class="q-mr-md text-weight-bold">
                  {{ b.apprentice?.fullName?.charAt(0) || '?' }}
                </q-avatar>
                <div>
                  <div class="text-weight-bold text-subtitle1 text-grey-9">{{ b.apprentice?.fullName || 'Sin nombre' }}</div>
                  <div class="text-caption text-grey-6">Ficha: {{ b.apprentice?.enrollmentNumber || '-' }}</div>
                </div>
              </div>
              <q-badge :color="getStatusColor(b.status)" :label="getStatusLabel(b.status)" class="q-px-md q-py-xs badge-pill" />
            </div>
          </q-card-section>

          <q-separator class="q-my-md opacity-50" />

          <q-card-section class="q-py-none">
            <div class="row items-center q-mb-sm">
              <q-icon name="article" size="sm" color="primary" class="q-mr-sm" />
              <span class="text-subtitle2 text-weight-bold text-primary">Bitácora #{{ b.logbookNumber }}</span>
              <q-badge v-if="b.isAdditional" color="warning" label="Extra" class="q-ml-sm" />
            </div>
            
            <div class="grid-details q-mt-sm">
              <div class="detail-item">
                <q-icon name="date_range" size="xs" color="grey-6" />
                <span class="text-caption text-grey-8">{{ formatDate(b.periodStart) }} — {{ formatDate(b.periodEnd) }}</span>
              </div>
              <div class="detail-item">
                <q-icon name="schedule" size="xs" color="grey-6" />
                <span class="text-caption text-grey-8">Enviada: {{ formatDateTime(b.submittedAt) }}</span>
              </div>
              <div v-if="b.assignedHours" class="detail-item">
                <q-icon name="timer" size="xs" color="positive" />
                <span class="text-caption text-positive text-weight-bold">{{ b.assignedHours }} hrs asignadas</span>
              </div>
              <div v-if="b.reviewedAt" class="detail-item">
                <q-icon name="done_all" size="xs" color="grey-6" />
                <span class="text-caption text-grey-8">Revisada: {{ formatDateTime(b.reviewedAt) }}</span>
              </div>
            </div>
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md">
            <q-btn v-if="activeTab === 'PENDING'" color="primary" label="Evaluar entrega" icon="rate_review" size="sm" rounded class="q-px-md action-btn" @click="openReviewModal(b)" />
            <q-btn flat round color="grey-7" icon="history" size="sm" @click="viewHistory(b)">
              <q-tooltip>Ver historial de comentarios</q-tooltip>
            </q-btn>
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="bitacoras.length > 0" class="flex flex-center q-mt-xl">
      <q-pagination
        v-model="pagination.page"
        :max="Math.ceil(pagination.rowsNumber / pagination.rowsPerPage) || 1"
        :max-pages="6"
        direction-links
        boundary-links
        color="primary"
        @update:model-value="fetchBitacoras"
        flat
        round
      />
    </div>

    <!-- Modal: Review -->
    <q-dialog v-model="showReviewModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="selectedBitacora" class="column modal-card">
        <div class="modal-header">
          <div class="cover-overlay-sm"></div>
          <div class="row items-center q-pa-lg text-white" style="position:relative;z-index:1">
            <q-avatar size="48px" color="white" text-color="primary" class="q-mr-md text-weight-bolder" style="font-size:20px">
              {{ selectedBitacora.apprentice?.fullName?.charAt(0) || '?' }}
            </q-avatar>
            <div class="col">
              <div class="text-h5 text-weight-bolder">
                {{ readonlyMode ? 'Historial de Comentarios' : 'Evaluar Entrega' }} — Bitácora #{{ selectedBitacora.logbookNumber }}
              </div>
              <div class="text-caption opacity-80">{{ selectedBitacora.apprentice?.fullName }} · Ficha {{ selectedBitacora.apprentice?.enrollmentNumber }}</div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup color="white">
              <q-tooltip>Cerrar</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-card-section class="col q-pa-lg scroll bg-grey-1">
          <div class="row q-col-gutter-lg h-full">
            
            <!-- Left Column: PDF Preview / Link -->
            <div class="col-12 col-md-7 column">
              <div class="text-h5 text-weight-bold text-dark q-mb-md">Documento de Bitácora</div>
              <q-card flat class="col bg-white border-dashed flex flex-center text-center q-pa-xl">
                <div>
                  <q-icon name="picture_as_pdf" size="6em" color="negative" class="q-mb-md" />
                  <div class="text-h6 text-weight-bold text-grey-9">Archivo de Bitácora Registrado</div>
                  <p class="text-caption text-grey-6 q-mb-lg max-w-400">Haz clic abajo para abrir el documento PDF oficial en Google Drive y proceder con su revisión detallada.</p>
                  <q-btn 
                    v-if="selectedBitacora.driveFileUrl"
                    type="a" 
                    :href="selectedBitacora.driveFileUrl" 
                    target="_blank" 
                    color="primary" 
                    label="Abrir PDF en Google Drive" 
                    icon="open_in_new" 
                    rounded
                    class="q-px-lg shadow-2"
                  />
                  <div v-else class="text-negative text-weight-bold q-mt-md">Error: El archivo no tiene URL válida asignada.</div>
                </div>
              </q-card>
            </div>

            <!-- Right Column -->
            <div class="col-12 col-md-5">
              <div class="text-h5 text-weight-bold text-dark q-mb-md">Detalles del Periodo</div>
              <q-card flat class="info-details-card q-mb-lg">
                <q-card-section class="q-pa-md">
                  <div class="info-row">
                    <span class="info-label">Estado</span>
                    <q-badge :color="getStatusColor(selectedBitacora.status)" :label="getStatusLabel(selectedBitacora.status)" class="badge-pill" />
                  </div>
                  <div class="info-row">
                    <span class="info-label">Enviada el</span>
                    <span class="info-value">{{ formatDateTime(selectedBitacora.submittedAt) }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Periodo</span>
                    <span class="info-value">{{ formatDate(selectedBitacora.periodStart) }} al {{ formatDate(selectedBitacora.periodEnd) }}</span>
                  </div>
                  <div v-if="selectedBitacora.reviewedAt" class="info-row">
                    <span class="info-label">Revisada el</span>
                    <span class="info-value">{{ formatDateTime(selectedBitacora.reviewedAt) }}</span>
                  </div>
                  <div v-if="selectedBitacora.assignedHours" class="info-row text-positive text-weight-bold">
                    <span class="info-label text-positive">Horas Asignadas</span>
                    <span class="info-value text-positive">{{ selectedBitacora.assignedHours }} hrs</span>
                  </div>
                </q-card-section>
              </q-card>

              <!-- Comments Section -->
              <div class="q-mb-lg">
                <div class="text-h5 text-weight-bold text-dark q-mb-md">Comentarios del Historial</div>
                <div v-if="selectedBitacora?.reviewComments?.length" class="comments-list">
                  <q-card flat bordered v-for="(c, idx) in selectedBitacora.reviewComments" :key="idx" class="comment-item q-mb-sm">
                    <q-card-section class="q-pa-sm">
                      <div class="row items-center justify-between text-caption text-grey-6 q-mb-xs">
                        <span class="text-weight-bold">{{ c.author?.fullName || 'Usuario' }}</span>
                        <span>{{ formatDateTime(c.createdAt) }}</span>
                      </div>
                      <div class="text-body2 text-grey-8">{{ c.text }}</div>
                    </q-card-section>
                  </q-card>
                </div>
                <div v-else class="text-grey-6 text-italic bg-white q-pa-md rounded-borders border text-center">
                  Sin comentarios previos en esta bitácora.
                </div>
              </div>

              <!-- Decision Box (Only Pending and Not Readonly) -->
              <template v-if="!readonlyMode">
                <div class="text-h5 text-weight-bold text-dark q-mb-md">Decisión de Evaluación</div>
                
                <div class="column q-gutter-md">
                  <q-card flat class="decision-card approval-card-style">
                    <q-card-section class="q-pa-lg">
                      <div class="text-subtitle1 text-positive text-weight-bold q-mb-sm">
                        <q-icon name="check_circle" class="q-mr-xs" /> Aprobar Bitácora
                      </div>
                      <p class="text-caption text-grey-7">La bitácora se marcará como aprobada y sumará horas de revisión válidas a tu reporte mensual.</p>
                      <q-btn color="positive" label="Aprobar Bitácora" class="full-width q-py-sm" rounded :loading="processing" @click="approveBitacora" />
                    </q-card-section>
                  </q-card>

                  <q-card flat class="decision-card rejection-card-style">
                    <q-card-section class="q-pa-lg">
                      <div class="text-subtitle1 text-negative text-weight-bold q-mb-sm">
                        <q-icon name="cancel" class="q-mr-xs" /> Solicitar Corrección
                      </div>
                      <p class="text-caption text-grey-7">Describe el motivo detallado del rechazo para que el aprendiz pueda corregirlo y subir una nueva versión.</p>
                      <q-input v-model="rejectReason" type="textarea" outlined dense rows="3" placeholder="Ej: Falta firma digital del jefe inmediato..." class="q-mb-md bg-white" :rules="[val => !val || val.trim().length >= 10 || 'Mínimo 10 caracteres']" />
                      <q-btn color="negative" label="Rechazar y Devolver" class="full-width q-py-sm" rounded :disable="!rejectReason.trim()" :loading="processing" @click="rejectBitacora" />
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

function getTabLabel(tab) {
  switch(tab) {
    case 'PENDING': return 'Pendientes de Evaluación';
    case 'APPROVED': return 'Aprobadas';
    case 'REJECTED': return 'Rechazadas / Devueltas';
    default: return tab;
  }
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
      fetchCounts();
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
    fetchCounts();
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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.review-bitacoras-container {
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Header ─────────────────────────────────────── */
.page-header {
  background: linear-gradient(135deg, #318335 0%, #43A047 100%);
  border-radius: 20px;
  padding: 28px 32px;
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
.header-content { position: relative; z-index: 1; }
.shadow-text { text-shadow: 2px 2px 8px rgba(0,0,0,0.4); }
.opacity-80 { opacity: 0.8; }

/* ─── Summary Cards ──────────────────────────────── */
.summary-card {
  border-radius: 18px;
  background: white;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.summary-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important;
}

.card-active {
  border: 2px solid var(--q-primary) !important;
  box-shadow: 0 10px 25px rgba(46, 125, 50, 0.15) !important;
}

.icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bg-warning-light   { background: rgba(245,127,23,0.1); }
.bg-positive-light  { background: rgba(46,125,50,0.1); }
.bg-negative-light  { background: rgba(198,40,40,0.1); }

/* ─── Empty state ────────────────────────────────── */
.empty-card {
  border-radius: 20px;
  background: white;
  border: 1px solid rgba(0,0,0,0.06);
  max-width: 500px;
}

/* ─── Bitacora Cards ─────────────────────────────── */
.bitacora-card {
  border-radius: 20px;
  background: white;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 6px 24px rgba(0,0,0,0.04) !important;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.bitacora-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important;
}

.badge-pill {
  border-radius: 20px;
  font-weight: 600;
}

.grid-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  background: #f9fafb;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,0.03);
}
.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  font-weight: 700;
  letter-spacing: 0.5px;
}

/* ─── Modal ───────────────────────────────────────── */
.modal-card { border-radius: 0; }

.modal-header {
  background: linear-gradient(135deg, #318335 0%, #43A047 100%);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.cover-overlay-sm {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0);
  background-size: 18px 18px;
}

.border-dashed {
  border: 2px dashed rgba(0,0,0,0.1);
  border-radius: 16px;
}

.max-w-400 {
  max-width: 400px;
  margin: 0 auto;
}

.info-details-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.07);
  background: white;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  gap: 8px;
}
.info-row:last-child { border-bottom: none; }
.info-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
}
.info-value {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
}

.comments-list {
  max-height: 200px;
  overflow-y: auto;
}
.comment-item {
  border-radius: 12px;
  background: white;
  border: 1px solid rgba(0,0,0,0.06);
}

.decision-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 4px 16px rgba(0,0,0,0.04) !important;
}
.approval-card-style {
  background: #f0fdf4;
  border-left: 5px solid var(--q-positive) !important;
}
.rejection-card-style {
  background: #fdf2f2;
  border-left: 5px solid var(--q-negative) !important;
}
</style>
