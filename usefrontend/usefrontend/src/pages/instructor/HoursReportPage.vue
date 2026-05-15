<template>
  <div class="hours-report-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Mi Reporte de Horas</h2>
        <p class="text-grey-7 q-my-sm">Control de horas ejecutadas y generadas para facturación.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="fetchData" :loading="loading" />
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-3">
          <q-input v-model.number="selectedYear" type="number" label="Año" outlined dense @change="fetchData" />
        </div>
        <div class="col-12 col-sm-4">
          <q-select 
            v-model="selectedMonth" 
            :options="monthsOptions" 
            label="Mes (Opcional)" 
            outlined dense emit-value map-options clearable 
            @update:model-value="fetchData" 
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading State -->
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
    </q-card>

    <!-- Content -->
    <div v-else-if="records.length > 0">
      
      <!-- Summary / Current State -->
      <div class="row q-col-gutter-md q-mb-md">
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="bg-blue-1 border-blue text-center q-pa-md">
            <div class="text-subtitle2 text-primary">Horas Totales (Filtro)</div>
            <div class="text-h4 text-weight-bold text-primary">{{ totalHoursInFilter }}</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="bg-orange-1 border-orange text-center q-pa-md">
            <div class="text-subtitle2 text-warning">Horas por Cobrar</div>
            <div class="text-h4 text-weight-bold text-warning">{{ totalPendingInFilter }}</div>
          </q-card>
        </div>
        <div class="col-12 col-sm-4">
          <q-card flat bordered class="bg-green-1 border-green text-center q-pa-md">
            <div class="text-subtitle2 text-positive">Horas Cobradas</div>
            <div class="text-h4 text-weight-bold text-positive">{{ totalPaidInFilter }}</div>
          </q-card>
        </div>
      </div>

      <!-- Detail Table -->
      <q-card flat bordered>
        <q-table
          :rows="records"
          :columns="columns"
          row-key="_id"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 50 }"
        >
          <template v-slot:body-cell-period="props">
            <q-td :props="props" class="text-weight-bold">
              {{ getMonthName(props.row.month) }} {{ props.row.year }}
            </q-td>
          </template>

          <template v-slot:body-cell-totalHours="props">
            <q-td :props="props">
              <q-chip color="primary" text-color="white" dense size="sm" class="text-weight-bold">
                {{ props.value }} hrs
              </q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-breakdown="props">
            <q-td :props="props">
              <div class="text-caption">
                Bitácoras: {{ props.row.bitacoraHours }}h | 
                Seguimientos: {{ props.row.trackingHours }}h
              </div>
              <div class="text-caption" v-if="props.row.certificationHours > 0 || props.row.extraordinaryHours > 0">
                Certificación: {{ props.row.certificationHours }}h | 
                Extra: <span class="text-warning">{{ props.row.extraordinaryHours }}h</span>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-financial="props">
            <q-td :props="props">
              <div class="text-caption text-positive">Cobradas: {{ props.row.paidHours }}h</div>
              <div class="text-caption text-warning text-weight-bold">Pendientes: {{ props.row.pendingPaymentHours }}h</div>
            </q-td>
          </template>

          <template v-slot:body-cell-actions="props">
            <q-td :props="props" class="text-center">
              <q-btn 
                color="secondary" outline icon="download" label="Reporte PDF" size="sm" 
                @click="downloadReport(props.row.year, props.row.month)" 
                :loading="downloading === `${props.row.year}-${props.row.month}`"
              />
            </q-td>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- Empty State -->
    <q-card flat bordered v-else class="text-center q-pa-xl bg-grey-1">
      <q-icon name="pending_actions" size="4em" color="grey" class="q-mb-md" />
      <div class="text-h6 text-grey-8">No hay registros de horas</div>
      <p class="text-grey-7">No tienes horas contabilizadas para el periodo seleccionado.</p>
    </q-card>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import hourService from '../../api/hours.service';
import { useAuthStore } from '../../stores/auth';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const authStore = useAuthStore();

const records = ref([]);
const loading = ref(true);
const downloading = ref(null);

const selectedYear = ref(new Date().getFullYear());
const selectedMonth = ref(null);

const monthsOptions = [
  { label: 'Todos', value: null },
  { label: 'Enero', value: 1 }, { label: 'Febrero', value: 2 },
  { label: 'Marzo', value: 3 }, { label: 'Abril', value: 4 },
  { label: 'Mayo', value: 5 }, { label: 'Junio', value: 6 },
  { label: 'Julio', value: 7 }, { label: 'Agosto', value: 8 },
  { label: 'Septiembre', value: 9 }, { label: 'Octubre', value: 10 },
  { label: 'Noviembre', value: 11 }, { label: 'Diciembre', value: 12 }
];

const columns = [
  { name: 'period', label: 'Periodo', align: 'left' },
  { name: 'totalHours', label: 'Horas Totales', field: 'totalHours', align: 'left' },
  { name: 'breakdown', label: 'Desglose', align: 'left' },
  { name: 'financial', label: 'Estado de Pago', align: 'left' },
  { name: 'actions', label: 'Exportar', align: 'center' }
];

onMounted(() => {
  if (authStore.user?.id) {
    fetchData();
  }
});

async function fetchData() {
  if (!authStore.user?.id) return;
  loading.value = true;
  try {
    const params = { year: selectedYear.value };
    if (selectedMonth.value) params.month = selectedMonth.value;

    // El interceptor de Axios devuelve el body JSON: { success, message, data }
    const body = await hourService.getInstructorHours(authStore.user.id, params);
    records.value = body.data || [];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar reporte de horas.' });
  } finally {
    loading.value = false;
  }
}

const totalHoursInFilter = computed(() => {
  return records.value.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
});

const totalPendingInFilter = computed(() => {
  return records.value.reduce((acc, curr) => acc + (curr.pendingPaymentHours || 0), 0);
});

const totalPaidInFilter = computed(() => {
  return records.value.reduce((acc, curr) => acc + (curr.paidHours || 0), 0);
});

function getMonthName(m) {
  const opt = monthsOptions.find(o => o.value === m);
  return opt ? opt.label : m;
}

async function downloadReport(year, month) {
  if (!authStore.user?.id) return;
  const key = `${year}-${month}`;
  downloading.value = key;
  try {
    const response = await hourService.getReport(authStore.user.id, year, month);
    
    // Create blob link to download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Horas_${year}_${month}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al generar el PDF.' });
  } finally {
    downloading.value = null;
  }
}
</script>

<style scoped>
.hours-report-container {
  max-width: 1000px;
  margin: 0 auto;
}
.border-blue { border-color: #bbdefb; }
.border-orange { border-color: #ffe0b2; }
.border-green { border-color: #c8e6c9; }
</style>
rm -rf .git