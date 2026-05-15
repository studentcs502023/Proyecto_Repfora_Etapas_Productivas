<template>
  <div class="admin-novelties-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Gestión de Novedades</h2>
        <p class="text-grey-7 q-my-sm">Atiende y resuelve los incidentes reportados por los instructores.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="fetchNovelties" :loading="loading" />
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-select 
            v-model="filterStatus" 
            :options="statusOptions" 
            label="Filtrar por Estado" 
            outlined dense emit-value map-options clearable 
            @update:model-value="fetchNovelties" 
          />
        </div>
      </q-card-section>
    </q-card>

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

        <template v-slot:body-cell-instructor="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.reportedBy?.fullName }}</div>
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
            <q-btn size="sm" color="primary" label="Gestionar" @click="openManageModal(props.row)" />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            No hay novedades reportadas bajo este filtro.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Gestionar Novedad -->
    <q-dialog v-model="showManageModal" persistent maximized>
      <q-card v-if="selectedNovelty" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">Gestión de Novedad - {{ selectedNovelty.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <div class="row q-col-gutter-lg">
            
            <!-- Left Column: Details -->
            <div class="col-12 col-md-6">
              <div class="text-h4 text-black q-mb-md">Detalles del Incidente</div>
              
              <q-list bordered separator class="rounded-borders q-mb-md">
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Tipo de Novedad</q-item-label>
                    <q-item-label class="text-weight-bold text-negative">{{ getTypeLabel(selectedNovelty.type) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section>
                    <q-item-label caption>Reportado por Instructor</q-item-label>
                    <q-item-label>{{ selectedNovelty.reportedBy?.fullName }}</q-item-label>
                    <q-item-label caption>Fecha del incidente: {{ formatDate(selectedNovelty.occurrenceDate) }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <div class="text-subtitle2 text-primary q-mb-sm">Descripción del Instructor</div>
              <div class="bg-grey-2 q-pa-md rounded-borders q-mb-md" style="white-space: pre-wrap;">{{ selectedNovelty.description }}</div>

              <div v-if="selectedNovelty.attachments?.length > 0" class="q-mb-md">
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
              </div>

              <q-btn 
                v-if="selectedNovelty.pdfDriveUrl"
                type="a" :href="selectedNovelty.pdfDriveUrl" target="_blank"
                color="secondary" outline icon="picture_as_pdf" label="Ver PDF Oficial (Acta)" class="full-width q-mb-md" 
              />
            </div>

            <!-- Right Column: Actions -->
            <div class="col-12 col-md-6">
              <div class="text-h4 text-black q-mb-md">Resolución</div>
              
              <div v-if="selectedNovelty.status === 'RESOLVED'" class="bg-green-1 border-green q-pa-md rounded-borders">
                <div class="text-subtitle1 text-positive text-weight-bold q-mb-sm"><q-icon name="check_circle" /> Novedad Resuelta</div>
                <p><strong>Acciones Tomadas:</strong></p>
                <div style="white-space: pre-wrap;" class="q-mb-sm">{{ selectedNovelty.actionsTaken }}</div>
                <p class="text-caption text-grey">Resuelto por: {{ selectedNovelty.resolvedBy?.fullName }} el {{ formatDateTime(selectedNovelty.resolvedAt) }}</p>
              </div>

              <div v-else>
                <q-banner class="bg-blue-1 text-primary q-mb-md rounded-borders">
                  Estado actual: <strong>{{ getStatusLabel(selectedNovelty.status) }}</strong>
                </q-banner>

                <q-form @submit="updateStatus" class="q-gutter-md">
                  <q-select
                    v-model="actionForm.status"
                    :options="availableStatusTransitions"
                    label="Cambiar Estado a *"
                    outlined dense emit-value map-options
                    :rules="[val => !!val || 'Requerido']"
                  />

                  <q-input 
                    v-model="actionForm.actionsTaken" 
                    label="Acciones Tomadas / Resolución *" 
                    type="textarea" outlined dense rows="6" 
                    placeholder="Describa qué gestión se realizó (llamada, reunión, acta de compromiso, etc)..."
                    :rules="[val => !!val && val.length >= 20 || 'Mínimo 20 caracteres obligatorios']" 
                  />

                  <div class="text-right q-gutter-sm">
                    <q-btn flat label="Cancelar" color="grey" v-close-popup />
                    <q-btn color="primary" icon="save" label="Guardar y Notificar" type="submit" :loading="saving" />
                  </div>
                </q-form>
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
import noveltyService from '../../api/novelty.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const novelties = ref([]);
const loading = ref(false);
const filterStatus = ref(null);
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'instructor', label: 'Reportado Por', field: 'instructor', align: 'left' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
  { name: 'createdAt', label: 'Fecha Reporte', field: row => formatDate(row.createdAt), align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

const statusOptions = [
  { label: 'Pendiente', value: 'PENDING' },
  { label: 'En Gestión', value: 'IN_PROGRESS' },
  { label: 'Resuelta', value: 'RESOLVED' }
];

const noveltyTypeOptions = [
  { label: 'Deserción / Abandono', value: 'DESERTION' },
  { label: 'Problema Disciplinario', value: 'DISCIPLINARY_ISSUE' },
  { label: 'Cambio de Condiciones', value: 'COMPANY_CONDITIONS_CHANGE' },
  { label: 'Otro', value: 'OTHER' }
];

// Modal State
const showManageModal = ref(false);
const selectedNovelty = ref(null);
const saving = ref(false);

const actionForm = ref({
  status: '',
  actionsTaken: ''
});

onMounted(() => {
  fetchNovelties();
});

async function fetchNovelties() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage
    };
    if (filterStatus.value) params.status = filterStatus.value;

    const res = await noveltyService.getAll(params);
    novelties.value = res.data?.novelties || [];
    if (res.data?.total) pagination.value.rowsNumber = res.data.total;
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
  const opt = statusOptions.find(o => o.value === status);
  return opt ? opt.label : status;
}

const availableStatusTransitions = computed(() => {
  if (!selectedNovelty.value) return [];
  const current = selectedNovelty.value.status;
  if (current === 'PENDING') {
    return [
      { label: 'Mover a: En Gestión', value: 'IN_PROGRESS' },
      { label: 'Cerrar: Resuelta', value: 'RESOLVED' }
    ];
  } else if (current === 'IN_PROGRESS') {
    return [
      { label: 'Cerrar: Resuelta', value: 'RESOLVED' }
    ];
  }
  return [];
});

function openManageModal(novelty) {
  selectedNovelty.value = novelty;
  actionForm.value = {
    status: novelty.status === 'PENDING' ? 'IN_PROGRESS' : 'RESOLVED',
    actionsTaken: novelty.actionsTaken || ''
  };
  showManageModal.value = true;
}

async function updateStatus() {
  saving.value = true;
  try {
    await noveltyService.updateStatus(selectedNovelty.value._id, {
      status: actionForm.value.status,
      actionsTaken: actionForm.value.actionsTaken
    });
    
    $q.notify({ type: 'positive', message: 'Estado de la novedad actualizado. PDF regenerado.' });
    showManageModal.value = false;
    fetchNovelties();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al actualizar novedad.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.admin-novelties-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-green {
  border-color: #c8e6c9;
}
</style>
