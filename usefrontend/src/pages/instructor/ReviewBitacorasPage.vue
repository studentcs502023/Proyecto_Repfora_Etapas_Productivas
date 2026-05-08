<template>
  <div class="review-bitacoras-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-secondary text-weight-bold q-my-none">Revisión de Bitácoras</h2>
        <p class="text-grey-7 q-my-sm">Bandeja de bitácoras pendientes de evaluación.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="fetchPendingBitacoras" :loading="loading" />
      </div>
    </div>

    <!-- Table -->
    <q-card flat bordered>
      <q-table
        :rows="pendingBitacoras"
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

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn size="sm" color="primary" label="Evaluar" @click="openReviewModal(props.row)" />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            <q-icon size="2em" name="check_circle" class="q-mr-sm" />
            No hay bitácoras pendientes de revisión.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Review -->
    <q-dialog v-model="showReviewModal" persistent maximized>
      <q-card v-if="selectedBitacora" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">Evaluar Bitácora #{{ selectedBitacora.logbookNumber }} - {{ selectedBitacora.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <div class="row q-col-gutter-lg h-full">
            
            <!-- Left Column: PDF Preview / Link -->
            <div class="col-12 col-md-7 column">
              <div class="text-h6 text-secondary q-mb-md">Documento Adjunto</div>
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

            <!-- Right Column: Decision -->
            <div class="col-12 col-md-5">
              <div class="text-h6 text-secondary q-mb-md">Información del Periodo</div>
              <q-list bordered separator class="rounded-borders q-mb-lg">
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
              </q-list>

              <div class="text-h6 text-secondary q-mb-md">Decisión de Evaluación</div>
              
              <div class="q-gutter-md">
                <!-- Approve -->
                <q-card flat bordered class="bg-green-1 border-green">
                  <q-card-section>
                    <div class="text-subtitle1 text-positive text-weight-bold q-mb-sm">Aprobar Bitácora</div>
                    <p class="text-caption">Al aprobar, esta bitácora contará para el progreso del aprendiz y se asignarán las horas de revisión a tu cuenta.</p>
                    <q-btn color="positive" icon="check_circle" label="Aprobar" @click="approveBitacora" class="full-width" :loading="processing" />
                  </q-card-section>
                </q-card>

                <!-- Reject -->
                <q-card flat bordered class="bg-red-1 border-red">
                  <q-card-section>
                    <div class="text-subtitle1 text-negative text-weight-bold q-mb-sm">Rechazar y Solicitar Corrección</div>
                    <p class="text-caption">Indica exactamente qué debe corregir el aprendiz en el documento.</p>
                    <q-input v-model="rejectReason" type="textarea" outlined dense rows="4" placeholder="Ej: Faltan las firmas en la sección 3..." class="q-mb-sm bg-white" />
                    <q-btn color="negative" icon="cancel" label="Rechazar" @click="rejectBitacora" class="full-width" :disable="!rejectReason.trim()" :loading="processing" />
                  </q-card-section>
                </q-card>
              </div>

            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import bitacoraService from '../../api/bitacora.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const pendingBitacoras = ref([]);
const loading = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const showReviewModal = ref(false);
const selectedBitacora = ref(null);
const processing = ref(false);
const rejectReason = ref('');

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'logbookNumber', label: 'Número', field: 'logbookNumber', align: 'left' },
  { name: 'period', label: 'Periodo', align: 'left' },
  { name: 'submittedAt', label: 'Enviada El', field: row => formatDateTime(row.submittedAt), align: 'left' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

onMounted(() => {
  fetchPendingBitacoras();
});

async function fetchPendingBitacoras() {
  loading.value = true;
  try {
    const res = await bitacoraService.getPendingReview();
    pendingBitacoras.value = res.data.data || res.data;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar bitácoras pendientes.' });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  // If we had server-side pagination for this endpoint, we'd pass these as params
  fetchPendingBitacoras();
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

function openReviewModal(bitacora) {
  selectedBitacora.value = bitacora;
  rejectReason.value = '';
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
      $q.notify({ type: 'positive', message: 'Bitácora aprobada exitosamente. Horas asignadas.' });
      showReviewModal.value = false;
      fetchPendingBitacoras();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al aprobar la bitácora.';
      $q.notify({ type: 'negative', message: msg });
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
    $q.notify({ type: 'warning', message: 'Bitácora rechazada y devuelta al aprendiz.' });
    showReviewModal.value = false;
    fetchPendingBitacoras();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al rechazar la bitácora.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    processing.value = false;
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
</style>
