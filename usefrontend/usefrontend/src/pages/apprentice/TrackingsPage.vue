<template>
  <div class="trackings-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Mis Seguimientos</h2>
        <p class="text-grey-7 q-my-sm">Cronograma y registro de evaluaciones con tus instructores.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="loadData" :loading="loading" />
      </div>
    </div>

    <!-- Loading State -->
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
    </q-card>

    <!-- Error/No EP State -->
    <q-card flat bordered v-else-if="!ep || !isActiveEP" class="bg-blue-1 text-center q-pa-xl">
      <q-icon name="warning" size="4em" color="primary" class="q-mb-md" />
      <div class="text-h6 text-primary">Seguimientos no disponibles</div>
      <p class="text-grey-8">Tu etapa productiva debe estar activa o en seguimiento para ver tus evaluaciones.</p>
      <q-btn color="primary" outline label="Ver mi Etapa" to="/apprentice/my-ep" class="q-mt-md" />
    </q-card>

    <div v-else>
      <!-- Summary KPI -->
      <div class="row q-col-gutter-md q-mb-md" v-if="summary">
        <div class="col-12 col-md-4">
          <q-card flat bordered class="bg-blue-1 border-blue text-center q-pa-md">
            <div class="text-h4 text-weight-bold text-primary">{{ summary.required || ep.requiredTrackings || '?' }}</div>
            <div class="text-caption text-grey-8">Requeridos</div>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="bg-green-1 border-green text-center q-pa-md">
            <div class="text-h4 text-weight-bold text-positive">{{ summary.completed || ep.completedTrackings || 0 }}</div>
            <div class="text-caption text-grey-8">Ejecutados</div>
          </q-card>
        </div>
        <div class="col-12 col-md-4">
          <q-card flat bordered class="bg-orange-1 border-orange text-center q-pa-md">
            <div class="text-h4 text-weight-bold text-warning">{{ summary.pending || 0 }}</div>
            <div class="text-caption text-grey-8">Programados</div>
          </q-card>
        </div>
      </div>

      <!-- Table -->
      <q-card flat bordered>
        <q-table
          :rows="trackings"
          :columns="columns"
          row-key="_id"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 50 }"
        >
          <template v-slot:body-cell-trackingNumber="props">
            <q-td :props="props">
              <div class="text-weight-bold">Seguimiento #{{ props.value }}</div>
              <q-badge v-if="props.row.isExtraordinary" color="negative" label="Extraordinario" />
            </q-td>
          </template>

          <template v-slot:body-cell-type="props">
            <q-td :props="props">
              <q-icon :name="getTypeIcon(props.value)" size="sm" color="grey-7" class="q-mr-xs" />
              {{ getTypeLabel(props.value) }}
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

          <template v-slot:body-cell-document="props">
            <q-td :props="props" class="text-center">
              <q-btn
                v-if="props.row.driveFileUrl"
                type="a"
                :href="props.row.driveFileUrl"
                target="_blank"
                flat round color="primary" icon="picture_as_pdf" size="sm"
              >
                <q-tooltip>Ver Acta Firmada</q-tooltip>
              </q-btn>
              <span v-else class="text-grey">-</span>
            </q-td>
          </template>
          
          <template v-slot:no-data>
            <div class="full-width row flex-center text-grey q-pa-lg">
              No tienes seguimientos programados. El instructor te notificará cuando programe uno.
            </div>
          </template>
        </q-table>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import trackingService from '../../api/tracking.service';
import productiveStageService from '../../api/productiveStage.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const ep = ref(null);
const trackings = ref([]);
const summary = ref(null);
const loading = ref(true);

const columns = [
  { name: 'trackingNumber', label: 'Número', field: 'trackingNumber', align: 'left' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
  { name: 'scheduledDate', label: 'Fecha Programada', field: row => formatDate(row.scheduledDate), align: 'left' },
  { name: 'executedDate', label: 'Fecha Ejecución', field: row => formatDate(row.executedDate), align: 'left' },
  { name: 'instructor', label: 'Instructor', field: row => row.instructor?.fullName || 'N/A', align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'document', label: 'Acta', align: 'center' }
];

const isActiveEP = computed(() => {
  if (!ep.value) return false;
  return ['ACTIVE', 'IN_FOLLOWUP', 'CERTIFICATION'].includes(ep.value.status);
});

onMounted(() => {
  loadData();
});

async function loadData() {
  loading.value = true;
  try {
    // 1. Get EP
    const epRes = await productiveStageService.getMyEP();
    const epList = epRes.data.data || epRes.data;
    if (Array.isArray(epList) && epList.length > 0) {
      ep.value = epList[0];
    } else if (epList && !Array.isArray(epList)) {
      ep.value = epList;
    }

    if (ep.value && ep.value._id) {
      // 2. Get Trackings
      const trackRes = await trackingService.getTrackings({ productiveStageId: ep.value._id });
      trackings.value = trackRes.data.data || trackRes.data;

      // 3. Get Summary
      try {
        const sumRes = await trackingService.getSummary(ep.value._id);
        summary.value = sumRes.data.data || sumRes.data;
      } catch (sumErr) {
        console.warn('Could not load summary, using EP data fallback');
      }
    }
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar los seguimientos.' });
  } finally {
    loading.value = false;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function getTypeLabel(type) {
  switch(type) {
    case 'IN_PERSON': return 'Presencial';
    case 'VIRTUAL': return 'Virtual';
    case 'EXTRAORDINARY': return 'Extraordinario';
    default: return type;
  }
}

function getTypeIcon(type) {
  switch(type) {
    case 'IN_PERSON': return 'people';
    case 'VIRTUAL': return 'computer';
    case 'EXTRAORDINARY': return 'warning';
    default: return 'event';
  }
}

function getStatusColor(status) {
  switch(status) {
    case 'SCHEDULED': return 'info';
    case 'EXECUTED': return 'positive';
    case 'PAID': return 'purple';
    default: return 'grey';
  }
}

function getStatusLabel(status) {
  switch(status) {
    case 'SCHEDULED': return 'Programado';
    case 'EXECUTED': return 'Ejecutado';
    case 'PAID': return 'Finalizado';
    default: return status;
  }
}
</script>

<style scoped>
.trackings-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-blue { border-color: #bbdefb; }
.border-green { border-color: #c8e6c9; }
.border-orange { border-color: #ffe0b2; }
</style>
