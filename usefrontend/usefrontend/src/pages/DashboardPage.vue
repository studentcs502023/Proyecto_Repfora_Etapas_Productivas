<template>
  <div class="dashboard-wrapper q-pa-md">
    <!-- Role-based Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-black text-weight-bold q-my-none">
          Bienvenido, {{ authStore.user?.fullName }}
        </h1>
        <p class="text-grey-7 text-subtitle1 q-my-none">
          Panel de Control - {{ roleLabel }}
        </p>
      </div>
      <div class="col-auto">
        <q-chip outline color="primary" text-color="primary" icon="event">
          {{ currentDate }}
        </q-chip>
      </div>
    </div>

    <!-- 1. APPRENTICE VIEW -->
    <div v-if="authStore.isApprentice" class="row q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-card bordered flat class="dashboard-card">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Progreso Bitácoras</div>
          </q-card-section>
          <q-card-section class="text-center q-pa-lg">
            <q-knob
              readonly
              v-model="knobValue"
              show-value
              size="120px"
              :thickness="0.22"
              color="primary"
              track-color="grey-3"
              class="text-primary q-ma-md"
            >
              {{ completedBitacoras }}/{{ totalBitacoras }}
            </q-knob>
            <div class="text-subtitle2 text-grey-8">Bitácoras Aprobadas</div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-8">
        <q-card bordered flat class="dashboard-card">
          <q-card-section>
            <div class="text-h4 text-black">Próximos Seguimientos</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <q-list separator>
              <q-item v-if="nextTrackings.length === 0">
                <q-item-section>
                  <q-item-label class="text-grey-7">No hay próximos seguimientos programados.</q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-for="tracking in nextTrackings" :key="tracking.id">
                <q-item-section avatar>
                  <q-icon name="calendar_today" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Seguimiento ({{ tracking.type }})</q-item-label>
                  <q-item-label caption>Fecha: {{ new Date(tracking.scheduledDate).toLocaleDateString('es-ES') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge color="orange" :label="tracking.status" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- 2. INSTRUCTOR VIEW -->
    <div v-if="authStore.isInstructor" class="row q-col-gutter-md">
      <div class="col-12 col-md-3">
        <q-card bordered flat class="bg-green-1">
          <q-card-section>
            <div class="text-subtitle2 text-grey-8">Aprendices Asignados</div>
            <div class="text-h4 text-weight-bold text-primary">{{ assignedApprentices }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card bordered flat class="bg-blue-1">
          <q-card-section>
            <div class="text-subtitle2 text-grey-8">Horas del Mes</div>
            <div class="text-h4 text-weight-bold text-blue">{{ monthlyHours.current }} / {{ monthlyHours.max }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12">
        <q-card bordered flat>
          <q-card-section>
            <div class="text-h6">Revisiones Pendientes</div>
          </q-card-section>
          <q-table
            flat
            bordered
            :rows="pendingReviews"
            :columns="columns"
            row-key="id"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge color="warning" :label="props.row.status" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>

    <!-- 3. ADMIN VIEW -->
    <div v-if="authStore.isAdmin" class="row q-col-gutter-md">
      <div class="col-12 col-md-4" v-for="stat in adminStats" :key="stat.label">
        <q-card bordered flat class="q-pa-md">
          <div class="row items-center no-wrap">
            <q-icon :name="stat.icon" color="primary" size="lg" class="q-mr-md" />
            <div>
              <div class="text-grey-7">{{ stat.label }}</div>
              <div class="text-h5 text-weight-bold">{{ stat.value }}</div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Quick Actions for Admin -->
      <div class="col-12 q-mt-lg">
        <div class="text-h6 q-mb-md text-black">Acciones Rápidas</div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-btn
              color="primary"
              icon="manage_accounts"
              label="Gestionar Usuarios"
              stack
              class="full-width q-pa-md"
              to="/users"
              unelevated
            />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-btn
              color="secondary"
              icon="business"
              label="Empresas"
              stack
              class="full-width q-pa-md"
              to="/companies"
              unelevated
            />
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-btn
              color="accent"
              icon="settings"
              label="Configuración"
              stack
              class="full-width q-pa-md"
              to="/system-config"
              unelevated
            />
          </div>
        </div>
      </div>
      
      <div class="col-12 q-mt-md">
        <q-banner class="bg-grey-3 rounded-borders">
          <template v-slot:avatar>
            <q-icon name="info" color="primary" />
          </template>
          Bienvenido al panel de administración. Aquí podrá gestionar los parámetros del sistema y supervisar el cumplimiento global.
        </q-banner>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useQuasar } from 'quasar';
import dashboardService from '../api/dashboard.service';

const authStore = useAuthStore();
const $q = useQuasar();

const currentDate = computed(() => {
  return new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
});

const roleLabel = computed(() => {
  if (authStore.isAdmin) return 'Administrador';
  if (authStore.isInstructor) return 'Instructor Seguimiento';
  if (authStore.isApprentice) return 'Aprendiz';
  return 'Usuario';
});

// APPRENTICE STATE
const completedBitacoras = ref(0);
const totalBitacoras = ref(12);
const knobValue = computed(() => {
  if (totalBitacoras.value === 0) return 0;
  return (completedBitacoras.value / totalBitacoras.value) * 100;
});
const nextTrackings = ref([]);

// INSTRUCTOR STATE
const assignedApprentices = ref(0);
const monthlyHours = ref({ current: 0, max: 40 });
const pendingReviews = ref([]);

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'documentId', label: 'Identificación', field: 'documentId', align: 'center' },
  { name: 'documentType', label: 'Documento', field: 'documentType', align: 'center' },
  { name: 'date', label: 'Fecha Entrega', field: 'date', align: 'center', format: val => new Date(val).toLocaleDateString('es-ES') },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
];

// ADMIN STATE
const adminStats = ref([
  { label: 'Etapas Activas', value: '0', icon: 'trending_up' },
  { label: 'Instructores', value: '0', icon: 'people' },
  { label: 'Aprendices', value: '0', icon: 'school' },
]);

// FETCH DATA
onMounted(async () => {
  try {
    if (authStore.isApprentice) {
      const stats = await dashboardService.getApprenticeStats();
      completedBitacoras.value = stats.bitacoras.completed;
      totalBitacoras.value = stats.bitacoras.total;
      nextTrackings.value = stats.nextTrackings;
    } else if (authStore.isInstructor) {
      const stats = await dashboardService.getInstructorStats();
      assignedApprentices.value = stats.assignedApprentices;
      monthlyHours.value = stats.monthlyHours;
      pendingReviews.value = stats.pendingReviews;
    } else if (authStore.isAdmin) {
      const stats = await dashboardService.getAdminStats();
      adminStats.value = [
        { label: 'Etapas Activas', value: stats.activeStages, icon: 'trending_up' },
        { label: 'Instructores', value: stats.instructors, icon: 'people' },
        { label: 'Aprendices', value: stats.apprentices, icon: 'school' },
      ];
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // El interceptor de index.js ya transforma el error a { message, status, errors }
    $q.notify({
      type: 'negative',
      message: error.message || 'No se pudieron cargar las estadísticas del panel.',
    });
  }
});
</script>

<style scoped>
.dashboard-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}
.dashboard-card {
  height: 100%;
}
</style>
