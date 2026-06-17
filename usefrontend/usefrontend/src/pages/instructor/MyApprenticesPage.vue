<template>
  <div class="my-apprentices-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Mis Aprendices Asignados</h2>
        <p class="text-grey-7 q-my-sm">Vista general de las etapas productivas bajo tu supervisión.</p>
      </div>
    </div>

    <!-- Filtros -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-input v-model="filter" dense outlined placeholder="Buscar por nombre o ficha...">
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabla -->
    <q-card flat bordered>
      <q-table
        :rows="filteredEps"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        :pagination="{ rowsPerPage: 15 }"
      >
        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.apprentice?.fullName }}</div>
            <div class="text-caption text-grey-7">Ficha: {{ props.row.apprentice?.enrollmentNumber }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-company="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.companySnapshot?.companyName || 'Sin Empresa' }}</div>
            <div class="text-caption text-grey-7">{{ getModalityLabel(props.row.modality) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip :color="getStatusColor(props.row.status)" text-color="white" dense size="sm">
              {{ getStatusLabel(props.row.status) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs text-center">
            <q-btn size="sm" color="primary" outline label="Ver Progreso" @click="viewProgress(props.row)" />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            No tienes aprendices asignados en este momento.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Progreso -->
    <q-dialog v-model="showProgressModal" persistent maximized>
      <q-card v-if="selectedEp" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">Progreso - {{ selectedEp.apprentice?.fullName }}</div>
          <q-space />
<q-btn icon="close" flat round dense v-close-popup>
          <q-tooltip>Cerrar</q-tooltip>
        </q-btn>
        </q-card-section>

        <q-card-section class="col scroll q-pa-lg">
          <div class="row q-col-gutter-lg">
            
            <div class="col-12 col-md-4">
              <q-card flat bordered class="bg-grey-1 h-full">
                <q-card-section>
                  <div class="text-subtitle2 text-primary">Información General</div>
                  <q-list dense>
                    <q-item><q-item-section><strong>Ficha:</strong> {{ selectedEp.apprentice?.enrollmentNumber }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Programa:</strong> {{ selectedEp.apprentice?.program }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Modalidad:</strong> {{ getModalityLabel(selectedEp.modality) }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Empresa:</strong> {{ selectedEp.companySnapshot?.companyName }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Estado:</strong> {{ getStatusLabel(selectedEp.status) }}</q-item-section></q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-8">
              <div class="text-h4 text-black q-mb-md">Gestión Rápida</div>
              <div class="row q-col-gutter-md">
                
                <div class="col-12 col-sm-6">
                  <q-card flat bordered class="text-center q-pa-md cursor-pointer hover-card" @click="$router.push('/instructor/review-bitacoras')">
                    <q-icon name="assignment" size="4em" color="primary" class="q-mb-md" />
                    <div class="text-h6">Bitácoras</div>
                    <div class="text-caption text-grey">Evaluar entregas pendientes</div>
                  </q-card>
                </div>

                <div class="col-12 col-sm-6">
                  <q-card flat bordered class="text-center q-pa-md cursor-pointer hover-card" @click="$router.push('/instructor/manage-trackings')">
                    <q-icon name="video_camera_front" size="4em" color="secondary" class="q-mb-md" />
                    <div class="text-h6">Seguimientos</div>
                    <div class="text-caption text-grey">Programar o ejecutar actas</div>
                  </q-card>
                </div>

                <div class="col-12 col-sm-6">
                  <q-card flat bordered class="text-center q-pa-md cursor-pointer hover-card" @click="$router.push('/instructor/report-novelties')">
                    <q-icon name="warning" size="4em" color="negative" class="q-mb-md" />
                    <div class="text-h6">Novedades</div>
                    <div class="text-caption text-grey">Reportar incidente a coordinación</div>
                  </q-card>
                </div>

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
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const router = useRouter();

const eps = ref([]);
const loading = ref(false);
const filter = ref('');

const showProgressModal = ref(false);
const selectedEp = ref(null);

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'company', label: 'Empresa / Modalidad', field: 'company', align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'left' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

onMounted(() => {
  fetchApprentices();
});

async function fetchApprentices() {
  loading.value = true;
  try {
    // El interceptor de Axios devuelve el body JSON: { success, message, data: { eps, pagination } }
    const body = await productiveStageService.getAllEPs({ limit: 100 });
    eps.value = body.data?.eps || body.data || [];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar aprendices.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

const filteredEps = computed(() => {
  if (!filter.value) return eps.value;
  const q = filter.value.toLowerCase();
  return eps.value.filter(ep => 
    ep.apprentice?.fullName?.toLowerCase().includes(q) ||
    ep.apprentice?.enrollmentNumber?.toLowerCase().includes(q)
  );
});

function getModalityLabel(val) {
  const map = {
    'APPRENTICESHIP_CONTRACT': 'Contrato Aprendizaje',
    'LABOR_LINK': 'Vínculo Laboral',
    'INTERNSHIP': 'Pasantía',
    'INDIVIDUAL_PRODUCTIVE_PROJECT': 'Proyecto Individual',
    'GROUP_PRODUCTIVE_PROJECT': 'Proyecto Grupal'
  };
  return map[val] || val;
}

function getStatusColor(status) {
  const map = {
    'PENDING_REGISTRATION': 'grey',
    'PENDING_APPROVAL': 'orange',
    'ACTIVE': 'info',
    'IN_FOLLOWUP': 'primary',
    'CERTIFICATION': 'secondary',
    'COMPLETED': 'positive',
    'ARCHIVED': 'dark'
  };
  return map[status] || 'grey';
}

function getStatusLabel(status) {
  const map = {
    'PENDING_REGISTRATION': 'Sin Registro',
    'PENDING_APPROVAL': 'Pendiente Administración',
    'ACTIVE': 'Activa',
    'IN_FOLLOWUP': 'En Seguimiento',
    'CERTIFICATION': 'Certificación',
    'COMPLETED': 'Completada',
    'ARCHIVED': 'Archivada'
  };
  return map[status] || status;
}

function viewProgress(ep) {
  selectedEp.value = ep;
  showProgressModal.value = true;
}
</script>

<style scoped>
.my-apprentices-container {
  max-width: 1200px;
  margin: 0 auto;
}
.hover-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border-color: #39A900;
}
.h-full {
  height: 100%;
}
</style>
