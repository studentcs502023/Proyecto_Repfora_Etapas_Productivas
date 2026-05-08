<template>
  <div class="dashboard-wrapper q-pa-md">
    <!-- Role-based Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-secondary text-weight-bold q-my-none">
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
              {{ completedBitacoras }}/12
            </q-knob>
            <div class="text-subtitle2 text-grey-8">Bitácoras Aprobadas</div>
          </q-card-section>
        </q-card>
      </div>
      
      <div class="col-12 col-md-8">
        <q-card bordered flat class="dashboard-card">
          <q-card-section>
            <div class="text-h6 text-secondary">Próximos Seguimientos</div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <q-list separator>
              <q-item v-for="n in 2" :key="n">
                <q-item-section avatar>
                  <q-icon name="calendar_today" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>Seguimiento #{{ n }}</q-item-label>
                  <q-item-label caption>Estado: Programado</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge color="orange" label="Pendiente" />
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
            <div class="text-h4 text-weight-bold text-primary">15</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-md-3">
        <q-card bordered flat class="bg-blue-1">
          <q-card-section>
            <div class="text-subtitle2 text-grey-8">Horas del Mes</div>
            <div class="text-h4 text-weight-bold text-blue">24 / 40</div>
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
                <q-badge color="warning" label="Pendiente" />
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
        <div class="text-h6 q-mb-md text-secondary">Acciones Rápidas</div>
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
import { computed, ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

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

// Mock data for display
const completedBitacoras = ref(3);
const knobValue = computed(() => (completedBitacoras.value / 12) * 100);

const pendingReviews = ref([
  { id: 1, apprentice: 'Juan Pérez', ficha: '2560890', bitacora: 'Bitácora 4', date: '2026-05-01' },
  { id: 2, apprentice: 'María López', ficha: '2560890', bitacora: 'Bitácora 2', date: '2026-05-03' },
]);

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'ficha', label: 'Ficha', field: 'ficha', align: 'center' },
  { name: 'bitacora', label: 'Documento', field: 'bitacora', align: 'center' },
  { name: 'date', label: 'Fecha Entrega', field: 'date', align: 'center' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
];

const adminStats = [
  { label: 'Etapas Activas', value: '124', icon: 'trending_up' },
  { label: 'Instructores', value: '18', icon: 'people' },
  { label: 'Aprendices', value: '350', icon: 'school' },
];
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
