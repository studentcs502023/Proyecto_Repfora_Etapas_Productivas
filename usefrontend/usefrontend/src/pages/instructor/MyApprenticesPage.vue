<template>
  <div class="my-apprentices-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Lista de Aprendices</h2>
        <p class="text-grey-7 q-my-sm">Aprendices asignados bajo tu supervision y sus etapas productivas.</p>
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
        <template v-slot:body-cell-nombre="props">
          <q-td :props="props">
            <span class="text-weight-bold">{{ props.row.apprentice?.fullName || 'N/D' }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-programa="props">
          <q-td :props="props">
            <span>{{ props.row.apprentice?.program || 'N/D' }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-ficha="props">
          <q-td :props="props">
            <span>{{ props.row.apprentice?.enrollmentNumber || 'N/D' }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-modalidad="props">
          <q-td :props="props">
            <q-chip dense size="sm" color="grey-3" text-color="black">
              {{ getModalityLabel(props.row.modality) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-fechaAsignacion="props">
          <q-td :props="props">
            <span>{{ formatDate(props.row.approvalDate || props.row.registrationDate) }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-empresa="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.companySnapshot?.companyName || 'Sin Empresa' }}</div>
            <div class="text-caption text-grey-7">{{ props.row.companySnapshot?.supervisorName || '' }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-acciones="props">
          <q-td :props="props" class="q-gutter-xs text-center">
            <q-btn size="sm" color="primary" outline label="Ver Progreso" @click="viewProgress(props.row)" />
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            NO HAY APRENDICES AÚN ASIGNADOS
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
                  <div class="text-subtitle2 text-primary">Informacion General</div>
                  <q-list dense>
                    <q-item><q-item-section><strong>Nombre:</strong> {{ selectedEp.apprentice?.fullName }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Ficha:</strong> {{ selectedEp.apprentice?.enrollmentNumber }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Programa:</strong> {{ selectedEp.apprentice?.program }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Modalidad:</strong> {{ getModalityLabel(selectedEp.modality) }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Empresa:</strong> {{ selectedEp.companySnapshot?.companyName }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Fecha Asignacion:</strong> {{ formatDate(selectedEp.approvalDate || selectedEp.registrationDate) }}</q-item-section></q-item>
                    <q-item><q-item-section><strong>Estado:</strong> {{ getStatusLabel(selectedEp.status) }}</q-item-section></q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-md-8">
              <div class="text-h4 text-black q-mb-md">Gestion Rapida</div>
              <div class="row q-col-gutter-md">

                <div class="col-12 col-sm-6">
                  <q-card flat bordered class="text-center q-pa-md cursor-pointer hover-card" @click="$router.push('/instructor/review-bitacoras')">
                    <q-icon name="assignment" size="4em" color="primary" class="q-mb-md" />
                    <div class="text-h6">Bitacoras</div>
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
                    <div class="text-caption text-grey">Reportar incidente a coordinacion</div>
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
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue';
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
  { name: 'nombre', label: 'Nombre', field: 'apprentice', align: 'left', sortable: true },
  { name: 'programa', label: 'Programa', field: 'apprentice', align: 'left', sortable: true },
  { name: 'ficha', label: 'Ficha', field: 'apprentice', align: 'left', sortable: true },
  { name: 'modalidad', label: 'Modalidad', field: 'modality', align: 'left', sortable: true },
  { name: 'fechaAsignacion', label: 'Fecha Asignacion', field: 'approvalDate', align: 'left', sortable: true },
  { name: 'empresa', label: 'Empresa', field: 'company', align: 'left' },
  { name: 'acciones', label: 'Acciones', align: 'center' }
];

let pollInterval = null;

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    fetchApprentices();
  }
}

onMounted(() => {
  fetchApprentices();
  pollInterval = setInterval(fetchApprentices, 30000);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});

onActivated(() => {
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
    'PENDING_APPROVAL': 'Pendiente Administracion',
    'ACTIVE': 'Activa',
    'IN_FOLLOWUP': 'En Seguimiento',
    'CERTIFICATION': 'Certificacion',
    'COMPLETED': 'Completada',
    'ARCHIVED': 'Archivada'
  };
  return map[status] || status;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/D';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
