<template>
  <div class="novelties-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Novedades Reportadas</h2>
        <p class="text-grey-7 q-my-sm">Historial de incidentes y novedades reportadas a coordinación.</p>
      </div>
      <div class="col-auto">
        <q-btn color="negative" icon="warning" label="Reportar Novedad" @click="openCreateModal" />
      </div>
    </div>

    <!-- Table -->
    <q-card flat bordered>
      <q-table
        :rows="novelties"
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

        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <div class="text-weight-bold text-black">{{ getTypeLabel(props.value) }}</div>
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

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn size="sm" flat round color="primary" icon="visibility" @click="viewDetails(props.row)">
              <q-tooltip>Ver Detalles</q-tooltip>
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
              <q-tooltip>Añadir Anexos</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            No has reportado ninguna novedad.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Reportar Novedad -->
    <q-dialog v-model="showCreateModal" persistent maximized>
      <q-card class="column">
        <q-form @submit="createNovelty" class="col column">
          <q-card-section class="bg-negative text-white row items-center q-pb-none">
            <div class="text-h6"><q-icon name="warning" class="q-mr-sm" /> Formulario de Novedad Crítica</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          
          <q-card-section class="col scroll q-pa-xl bg-grey-1">
            <div class="row justify-center">
              <div class="col-12" style="max-width: 800px;">
                <q-banner class="bg-red-1 text-negative q-mb-lg rounded-borders">
                  <strong>Atención:</strong> Reportar una novedad notifica inmediatamente a la coordinación y genera un acta formal en PDF. Úsalo solo para situaciones que requieran intervención administrativa.
                </q-banner>

                <q-card flat bordered class="q-pa-md bg-white">
                  <div class="row q-col-gutter-md">
                    <div class="col-12 col-md-6">
                      <q-select
                        v-model="form.productiveStageId"
                        :options="myEPs"
                        option-value="_id"
                        :option-label="opt => `${opt.apprentice?.fullName} - ${opt.company?.name}`"
                        label="Seleccionar Aprendiz / Etapa *"
                        outlined dense emit-value map-options
                        :rules="[val => !!val || 'Requerido']"
                      />
                    </div>
                    
                    <div class="col-12 col-md-6">
                      <q-select
                        v-model="form.type"
                        :options="noveltyTypeOptions"
                        label="Tipo de Novedad *"
                        outlined dense emit-value map-options
                        :rules="[val => !!val || 'Requerido']"
                      />
                    </div>

                    <div class="col-12 col-md-6">
                      <q-input v-model="form.occurrenceDate" label="Fecha de Ocurrencia *" type="date" outlined dense :rules="[val => !!val || 'Requerido']" />
                    </div>

                    <div class="col-12">
                      <q-input 
                        v-model="form.description" 
                        label="Descripción detallada de los hechos *" 
                        type="textarea" outlined dense rows="6" 
                        placeholder="Sea específico. Mencione fechas, nombres y acciones previas..."
                        :rules="[val => !!val && val.length >= 50 || 'Mínimo 50 caracteres']" 
                      />
                    </div>

                    <div class="col-12">
                      <q-file 
                        v-model="form.files" 
                        label="Anexos (Opcional, máx 3 PDFs)" 
                        outlined dense multiple accept=".pdf"
                        counter max-files="3"
                        hint="Evidencias como correos, llamados de atención, etc."
                      >
                        <template v-slot:prepend><q-icon name="attach_file" /></template>
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
            <q-btn color="negative" icon="send" label="Generar Reporte" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Detalles -->
    <q-dialog v-model="showDetailsModal">
      <q-card style="width: 700px; max-width: 90vw;">
        <q-card-section class="bg-secondary text-white row items-center">
          <div class="text-h6">Detalle de Novedad</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        
        <q-card-section class="q-pa-md scroll" style="max-height: 70vh;">
          <div class="row q-col-gutter-sm">
            <div class="col-6"><strong>Aprendiz:</strong> {{ selectedNovelty?.apprentice?.fullName }}</div>
            <div class="col-6"><strong>Ficha:</strong> {{ selectedNovelty?.apprentice?.enrollmentNumber }}</div>
            <div class="col-6"><strong>Fecha Reporte:</strong> {{ formatDateTime(selectedNovelty?.createdAt) }}</div>
            <div class="col-6"><strong>Fecha Incidente:</strong> {{ formatDate(selectedNovelty?.occurrenceDate) }}</div>
            <div class="col-6"><strong>Tipo:</strong> {{ getTypeLabel(selectedNovelty?.type) }}</div>
            <div class="col-6">
              <strong>Estado:</strong> 
              <q-chip :color="getStatusColor(selectedNovelty?.status)" text-color="white" dense size="sm">{{ getStatusLabel(selectedNovelty?.status) }}</q-chip>
            </div>
          </div>

          <q-separator class="q-my-md" />
          
          <div class="text-subtitle2 text-primary q-mb-sm">Descripción del Instructor</div>
          <div class="bg-grey-2 q-pa-md rounded-borders q-mb-md" style="white-space: pre-wrap;">{{ selectedNovelty?.description }}</div>
          
          <template v-if="selectedNovelty?.status !== 'PENDING'">
            <div class="text-subtitle2 text-positive q-mb-sm">Acciones de Coordinación</div>
            <div class="bg-green-1 q-pa-md rounded-borders border-green q-mb-md" style="white-space: pre-wrap;">{{ selectedNovelty?.actionsTaken || 'No se han registrado acciones aún.' }}</div>
            <div v-if="selectedNovelty?.resolvedBy" class="text-caption text-grey">
              Resuelto por: {{ selectedNovelty.resolvedBy.fullName }} el {{ formatDateTime(selectedNovelty.resolvedAt) }}
            </div>
          </template>

          <q-separator class="q-my-md" v-if="selectedNovelty?.attachments?.length > 0" />
          
          <template v-if="selectedNovelty?.attachments?.length > 0">
            <div class="text-subtitle2 text-primary q-mb-sm">Anexos</div>
            <q-list bordered separator dense>
              <q-item v-for="(file, idx) in selectedNovelty.attachments" :key="idx">
                <q-item-section avatar><q-icon name="description" color="grey" /></q-item-section>
                <q-item-section>{{ file.fileName }}</q-item-section>
                <q-item-section side>
                  <q-btn type="a" :href="file.driveFileUrl" target="_blank" flat round dense icon="open_in_new" color="primary" />
                </q-item-section>
              </q-item>
            </q-list>
          </template>

        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal: Add Attachments -->
    <q-dialog v-model="showAttachModal" persistent>
      <q-card style="width: 400px;">
        <q-form @submit="uploadAttachments">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Añadir Anexos Extra</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md">
            <p class="text-caption text-grey-8">Puedes subir evidencia adicional mientras la novedad no esté resuelta.</p>
            <q-file 
              v-model="attachFiles" 
              label="Seleccionar Archivos (PDF)" 
              outlined dense multiple accept=".pdf"
              counter max-files="3"
              :rules="[val => val && val.length > 0 || 'Seleccione al menos un archivo']"
            >
              <template v-slot:prepend><q-icon name="attach_file" /></template>
            </q-file>
          </q-card-section>
          
          <q-card-actions align="right">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Subir Anexos" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
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
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'type', label: 'Tipo de Novedad', field: 'type', align: 'left' },
  { name: 'occurrenceDate', label: 'Fecha Incidente', field: row => formatDate(row.occurrenceDate), align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
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

onMounted(() => {
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
    const res = await noveltyService.getAll(params);
    novelties.value = res.data.data || res.data;
    if (res.data.total) pagination.value.rowsNumber = res.data.total;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar novedades.' });
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
    // Solo activas o en seguimiento, no completadas
    const res = await productiveStageService.getAllEPs({ limit: 100 });
    const all = res.data.data || res.data;
    myEPs.value = all.filter(ep => ep.status !== 'COMPLETED' && ep.status !== 'ARCHIVED');
  } catch (error) {
    console.error('Error fetching EPs', error);
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

function getStatusLabel(status) {
  switch(status) {
    case 'PENDING': return 'Pendiente Admin';
    case 'IN_PROGRESS': return 'En Gestión';
    case 'RESOLVED': return 'Resuelta';
    default: return status;
  }
}

function openCreateModal() {
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
    fd.append('description', form.value.description);
    
    if (form.value.files && form.value.files.length > 0) {
      Array.from(form.value.files).forEach(f => {
        fd.append('files', f); // Assuming backend accepts 'files' array
      });
    }

    await noveltyService.create(fd);
    
    $q.notify({ type: 'positive', message: 'Novedad reportada. Coordinación notificada.' });
    showCreateModal.value = false;
    fetchNovelties();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al reportar novedad.';
    $q.notify({ type: 'negative', message: msg });
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
    
    $q.notify({ type: 'positive', message: 'Anexos subidos. PDF actualizado.' });
    showAttachModal.value = false;
    fetchNovelties();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al subir anexos.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.novelties-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-green {
  border-color: #c8e6c9;
}
</style>
