<template>
  <div class="novelties-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content text-white">
        <div class="row items-center justify-between">
          <div>
            <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
              <q-icon name="warning" class="q-mr-sm" size="md"/>Novedades Reportadas
            </h2>
            <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">
              Historial de incidentes y novedades reportadas directamente a la coordinación.
            </p>
          </div>
          <div>
            <q-btn color="negative" unelevated rounded icon="warning" label="Reportar Novedad Crítica" class="action-header-btn" @click="openCreateModal" />
          </div>
        </div>
      </div>
    </div>

    <!-- Table Card -->
    <q-card flat class="table-card">
      <q-table
        :rows="novelties"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        v-model:pagination="pagination"
        @request="onRequest"
        class="custom-table"
        table-header-class="custom-table-header"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="36px" color="negative" text-color="white" class="q-mr-md avatar-initial text-weight-bold">
                {{ props.row.apprentice?.fullName?.charAt(0) || '?' }}
              </q-avatar>
              <div>
                <div class="text-weight-bold text-grey-9">{{ props.row.apprentice?.fullName }}</div>
                <div class="text-caption text-grey-5">Ficha: {{ props.row.apprentice?.enrollmentNumber }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <div class="text-weight-bold text-dark">{{ getTypeLabel(props.value) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="getStatusColor(props.value)"
              text-color="white"
              dense
              size="sm"
              class="badge-pill text-weight-bold q-px-md"
            >
              {{ getStatusLabel(props.value) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="text-center">
            <div class="row justify-center q-gutter-xs">
              <q-btn size="sm" flat round color="primary" icon="visibility" @click="viewDetails(props.row)">
                <q-tooltip>Ver Detalles Completos</q-tooltip>
              </q-btn>
              <q-btn 
                v-if="props.row.pdfDriveUrl"
                size="sm" flat round color="negative" icon="picture_as_pdf" 
                type="a" :href="props.row.pdfDriveUrl" target="_blank"
              >
                <q-tooltip>Descargar PDF Autogenerado</q-tooltip>
              </q-btn>
              <q-btn 
                v-if="props.row.status !== 'RESOLVED'"
                size="sm" flat round color="secondary" icon="post_add" 
                @click="openAttachModal(props.row)"
              >
                <q-tooltip>Añadir Evidencias / Anexos</q-tooltip>
              </q-btn>
            </div>
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width column flex-center text-grey q-pa-xl">
            <q-icon name="assignment_turned_in" size="5em" color="grey-4" class="q-mb-md" />
            <div class="text-h6 text-grey-6">Sin novedades reportadas</div>
            <div class="text-caption">No has registrado incidentes o alertas administrativas recientemente.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Reportar Novedad -->
    <q-dialog v-model="showCreateModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="column modal-card">
        <q-form @submit="createNovelty" class="col column">
          <div class="modal-header bg-negative">
            <div class="cover-overlay-sm"></div>
            <div class="row items-center q-pa-lg text-white" style="position:relative;z-index:1">
              <q-icon name="report_problem" size="md" class="q-mr-md" />
              <div class="col">
                <div class="text-h5 text-weight-bolder">Reportar Novedad Administrativa</div>
                <div class="text-caption opacity-80">Por favor, rellena el formulario con datos precisos.</div>
              </div>
              <q-btn icon="close" flat round dense v-close-popup color="white">
                <q-tooltip>Cerrar</q-tooltip>
              </q-btn>
            </div>
          </div>

          <q-card-section class="col scroll q-pa-xl bg-grey-1">
            <div class="row justify-center">
              <div class="col-12" style="max-width: 800px;">
                <q-banner class="bg-red-1 text-negative q-mb-lg rounded-borders text-caption shadow-1">
                  <q-icon name="warning" class="q-mr-sm" size="sm"/>
                  <strong>Atención:</strong> Reportar una novedad de tipo crítico alertará de manera inmediata al equipo de coordinación y generará un acta firmada en formato PDF. Asegúrese de redactar con claridad profesional.
                </q-banner>

                <q-card flat class="q-pa-lg bg-white shadow-2 form-container-card">
                  <div class="row q-col-gutter-lg">
                    <div class="col-12 col-md-6">
                      <q-select
                        v-model="form.productiveStageId"
                        :options="myEPs"
                        option-value="_id"
                        :option-label="opt => `${opt.apprentice?.fullName} - ${opt.company?.name}`"
                        label="Seleccionar Aprendiz / Etapa *"
                        outlined dense emit-value map-options
                        color="primary"
                        :rules="[val => !!val || 'Requerido']"
                      />
                    </div>
                    
                    <div class="col-12 col-md-6">
                      <q-select
                        v-model="form.type"
                        :options="noveltyTypeOptions"
                        label="Tipo de Novedad *"
                        outlined dense emit-value map-options
                        color="primary"
                        :rules="[val => !!val || 'Requerido']"
                      />
                    </div>

                    <div class="col-12 col-md-6">
                      <q-input v-model="form.occurrenceDate" label="Fecha del Incidente *" type="date" outlined dense color="primary" :rules="[val => !!val || 'Requerido']" />
                    </div>

                    <div class="col-12">
                      <q-input 
                        v-model="form.description" 
                        label="Descripción detallada de los hechos *" 
                        type="textarea" outlined dense rows="6" 
                        placeholder="Mencione detalladamente los acontecimientos: fechas exactas, antecedentes de comunicación, llamados de atención y soporte del caso..."
                        color="primary"
                        :rules="[val => !!val && val.length >= 50 || 'Mínimo 50 caracteres']" 
                      />
                    </div>

                    <div class="col-12">
                      <q-file 
                        v-model="form.files" 
                        label="Anexos de Evidencia (Opcional, máx 3 PDFs)" 
                        outlined dense multiple accept=".pdf"
                        counter max-files="3"
                        color="primary"
                        hint="Evidencias en formato PDF (correos impresos, actas de citación, llamados de atención, etc.)"
                      >
                        <template v-slot:prepend><q-icon name="attach_file" color="primary" /></template>
                      </q-file>
                    </div>
                  </div>
                </q-card>
              </div>
            </div>
          </q-card-section>
          
          <q-separator />
          <q-card-actions align="right" class="q-pa-md bg-white">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="negative" icon="send" label="Enviar Novedad" rounded unelevated type="submit" :loading="saving" class="q-px-lg" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Detalles -->
    <q-dialog v-model="showDetailsModal" transition-show="scale" transition-hide="scale">
      <q-card style="width: 700px; max-width: 90vw; border-radius: 20px;" class="overflow-hidden">
        <div class="bg-primary text-white q-pa-md row items-center justify-between">
          <div>
            <div class="text-h6 text-weight-bold"><q-icon name="info" class="q-mr-xs"/> Detalle de Novedad</div>
            <div class="text-caption opacity-80">Reporte oficial a Coordinación</div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup color="white" />
        </div>

        <q-card-section class="q-pa-lg scroll bg-grey-1" style="max-height: 70vh;">
          <q-card flat class="q-pa-md bg-white border-dashed-container q-mb-md">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-6"><strong>Aprendiz:</strong> <span class="text-grey-8">{{ selectedNovelty?.apprentice?.fullName }}</span></div>
              <div class="col-12 col-sm-6"><strong>Ficha:</strong> <span class="text-grey-8">{{ selectedNovelty?.apprentice?.enrollmentNumber }}</span></div>
              <div class="col-12 col-sm-6"><strong>Fecha de Reporte:</strong> <span class="text-grey-8">{{ formatDateTime(selectedNovelty?.createdAt) }}</span></div>
              <div class="col-12 col-sm-6"><strong>Fecha del Incidente:</strong> <span class="text-grey-8">{{ formatDate(selectedNovelty?.occurrenceDate) }}</span></div>
              <div class="col-12 col-sm-6"><strong>Tipo:</strong> <span class="text-grey-8">{{ getTypeLabel(selectedNovelty?.type) }}</span></div>
              <div class="col-12 col-sm-6">
                <strong>Estado:</strong> 
                <q-chip :color="getStatusColor(selectedNovelty?.status)" text-color="white" dense size="sm" class="badge-pill q-px-sm">{{ getStatusLabel(selectedNovelty?.status) }}</q-chip>
              </div>
            </div>
          </q-card>
          
          <div class="text-subtitle2 text-primary text-weight-bold q-mb-sm">Descripción del Instructor</div>
          <div class="bg-white q-pa-md rounded-borders border q-mb-md text-grey-8" style="white-space: pre-wrap; font-size: 13.5px; border-radius: 12px; line-height: 1.5;">{{ selectedNovelty?.description }}</div>
          
          <template v-if="selectedNovelty?.status !== 'PENDING'">
            <div class="text-subtitle2 text-positive text-weight-bold q-mb-sm">Acciones de Coordinación</div>
            <div class="bg-green-1 text-positive q-pa-md rounded-borders border-green q-mb-md text-grey-9" style="white-space: pre-wrap; font-size: 13.5px; border-radius: 12px; line-height: 1.5;">{{ selectedNovelty?.actionsTaken || 'No se han registrado acciones aún.' }}</div>
            <div v-if="selectedNovelty?.resolvedBy" class="text-caption text-grey-5 text-right">
              Resuelto por: {{ selectedNovelty.resolvedBy.fullName }} el {{ formatDateTime(selectedNovelty.resolvedAt) }}
            </div>
          </template>

          <template v-if="selectedNovelty?.attachments?.length > 0">
            <q-separator class="q-my-md" />
            <div class="text-subtitle2 text-primary text-weight-bold q-mb-sm">Anexos y Evidencias</div>
            <q-list bordered separator dense class="bg-white rounded-borders overflow-hidden">
              <q-item v-for="(file, idx) in selectedNovelty.attachments" :key="idx" class="q-py-sm">
                <q-item-section avatar><q-icon name="description" color="primary" /></q-item-section>
                <q-item-section class="text-grey-8 text-weight-medium">{{ file.fileName }}</q-item-section>
                <q-item-section side>
                  <q-btn type="a" :href="file.driveFileUrl" target="_blank" flat round dense icon="open_in_new" color="primary">
                    <q-tooltip>Abrir documento</q-tooltip>
                  </q-btn>
                </q-item-section>
              </q-item>
            </q-list>
          </template>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal: Add Attachments -->
    <q-dialog v-model="showAttachModal" persistent transition-show="scale" transition-hide="scale">
      <q-card style="width: 400px; border-radius: 20px;" class="overflow-hidden">
        <q-form @submit="uploadAttachments">
          <div class="bg-primary text-white q-pa-md">
            <div class="text-h6 text-weight-bold"><q-icon name="post_add" class="q-mr-xs"/> Añadir Evidencia Extra</div>
          </div>
          
          <q-card-section class="q-pa-lg bg-grey-1">
            <p class="text-caption text-grey-7 q-mb-md">Puedes adjuntar nuevos soportes o documentos adicionales mientras la novedad no sea resuelta.</p>
            <q-file 
              v-model="attachFiles" 
              label="Seleccionar Archivos (PDF)" 
              outlined dense multiple accept=".pdf"
              counter max-files="3"
              bg-color="white"
              color="primary"
              :rules="[val => val && val.length > 0 || 'Seleccione al menos un archivo']"
            >
              <template v-slot:prepend><q-icon name="attach_file" color="primary" /></template>
            </q-file>
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md bg-white">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Subir Anexos" rounded unelevated type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onActivated } from 'vue';
import noveltyService from '../../api/novelty.service';
import productiveStageService from '../../api/productiveStage.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const novelties = ref([]);
const myEPs = ref([]);
const loading = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const columns = [
  { name: 'apprentice', label: 'Aprendiz / Ficha', field: 'apprentice', align: 'left' },
  { name: 'type', label: 'Tipo de Novedad', field: 'type', align: 'left' },
  { name: 'occurrenceDate', label: 'Fecha Incidente', field: row => formatDate(row.occurrenceDate), align: 'left' },
  { name: 'status', label: 'Estado Reporte', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

const noveltyTypeOptions = [
  { label: 'Deserción / Abandono', value: 'DESERTION' },
  { label: 'Problema Disciplinario', value: 'DISCIPLINARY_ISSUE' },
  { label: 'Cambio de Condiciones Empresa', value: 'COMPANY_CONDITIONS_CHANGE' },
  { label: 'Otro (Especifique en descripción)', value: 'OTHER' }
];

const showCreateModal = ref(false);
const saving = ref(false);
const form = ref({
  productiveStageId: '',
  type: '',
  occurrenceDate: '',
  description: '',
  files: null
});

const showDetailsModal = ref(false);
const selectedNovelty = ref(null);

const showAttachModal = ref(false);
const attachFiles = ref(null);

let pollInterval = null;

onMounted(() => {
  fetchMyEPs();
  pollInterval = setInterval(fetchNovelties, 60000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

onActivated(() => {
  fetchNovelties();
  fetchMyEPs();
});

async function fetchNovelties() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage
    };
    const body = await noveltyService.getAll(params);
    novelties.value = body.data?.novelties || [];
    if (body.data?.total) pagination.value.rowsNumber = body.data.total;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar novedades.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  fetchNovelties();
}

async function fetchMyEPs() {
  try {
    const body = await productiveStageService.getAllEPs({ limit: 100 });
    const all = body.data?.eps || [];
    myEPs.value = Array.isArray(all) ? all.filter(ep => ep.status !== 'COMPLETED' && ep.status !== 'ARCHIVED') : [];
  } catch (error) {
    console.error('Error fetching EPs', error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar etapas productivas.', position: 'top', timeout: 5000 });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('es-CO', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

function getTypeLabel(type) {
  const opt = noveltyTypeOptions.find(o => o.value === type);
  return opt ? opt.label : type;
}

function getStatusColor(status) {
  switch(status) {
    case 'PENDING': return 'orange';
    case 'IN_PROGRESS': return 'info';
    case 'RESOLVED': return 'positive';
    default: return 'grey';
  }
}

// Fixed warning label matching system
function getStatusLabel(status) {
  switch(status) {
    case 'PENDING': return 'Pendiente Admin';
    case 'IN_PROGRESS': return 'En Gestión';
    case 'RESOLVED': return 'Resuelta';
    default: return status;
  }
}

function openCreateModal() {
  fetchMyEPs();
  form.value = {
    productiveStageId: '',
    type: '',
    occurrenceDate: '',
    description: '',
    files: null
  };
  showCreateModal.value = true;
}

async function createNovelty() {
  saving.value = true;
  try {
    const fd = new FormData();
    fd.append('productiveStageId', form.value.productiveStageId);
    fd.append('type', form.value.type);
    fd.append('occurrenceDate', form.value.occurrenceDate);
    fd.append('description', form.value.description.trim());
    
    if (form.value.files && form.value.files.length > 0) {
      Array.from(form.value.files).forEach(f => {
        fd.append('files', f);
      });
    }

    await noveltyService.create(fd);
    
    $q.notify({ type: 'positive', message: 'Novedad reportada. Coordinación notificada.', position: 'top', timeout: 5000 });
    showCreateModal.value = false;
    fetchNovelties();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al reportar novedad.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

function viewDetails(novelty) {
  selectedNovelty.value = novelty;
  showDetailsModal.value = true;
}

function openAttachModal(novelty) {
  selectedNovelty.value = novelty;
  attachFiles.value = null;
  showAttachModal.value = true;
}

async function uploadAttachments() {
  if (!attachFiles.value || attachFiles.value.length === 0) return;
  saving.value = true;
  try {
    const fd = new FormData();
    Array.from(attachFiles.value).forEach(f => {
      fd.append('files', f);
    });

    await noveltyService.addAttachments(selectedNovelty.value._id, fd);
    
    $q.notify({ type: 'positive', message: 'Anexos subidos. PDF actualizado.', position: 'top', timeout: 5000 });
    showAttachModal.value = false;
    fetchNovelties();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al subir anexos.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.novelties-container {
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
  background: linear-gradient(135deg, #093028 0%, #237A57 100%);
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

.action-header-btn {
  font-weight: 700;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}
.action-header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(198,40,40,0.3);
}

/* ─── Table Card ──────────────────────────────────── */
.table-card {
  border-radius: 20px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  overflow: hidden;
}

.custom-table :deep(.q-table__container) { background: transparent; }
.custom-table :deep(th) {
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 2px solid rgba(0,0,0,0.05);
}
.custom-table :deep(tbody tr) {
  transition: all 0.2s ease;
}
.custom-table :deep(tbody tr:hover) {
  background-color: #fdf2f2 !important;
}
.custom-table :deep(td) {
  border-bottom: 1px solid rgba(0,0,0,0.04);
  padding-top: 12px;
  padding-bottom: 12px;
}

.avatar-initial {
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.badge-pill {
  border-radius: 20px;
  font-weight: 600;
}

/* ─── Modal Custom Styles ─────────────────────────── */
.modal-card { border-radius: 0; }

.modal-header {
  background: linear-gradient(135deg, #093028 0%, #237A57 100%);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.modal-header.bg-negative {
  background: linear-gradient(135deg, #7a2323 0%, #a82e2e 100%);
}

.cover-overlay-sm {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0);
  background-size: 18px 18px;
}

.form-container-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.07);
}

.border-dashed-container {
  border: 1px dashed rgba(0,0,0,0.1);
  border-radius: 12px;
}
.border-green {
  border-color: #c8e6c9;
}
</style>
