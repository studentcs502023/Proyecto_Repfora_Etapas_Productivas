<template>
  <div class="dashboard-wrapper q-pa-md">

    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h1 class="text-h4 text-black text-weight-bold q-my-none">
          Bienvenido, {{ authStore.user?.fullName }}
        </h1>
        <p class="text-grey-7 text-subtitle1 q-my-none">
          Panel de Control — {{ roleLabel }}
        </p>
      </div>
      <div class="col-auto row items-center q-gutter-sm">
        <q-chip outline color="primary" text-color="primary" icon="event">
          {{ currentDate }}
        </q-chip>
        <q-btn flat round icon="refresh" color="primary" :loading="loading" @click="loadData">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Loading global -->
    <div v-if="loading" class="row q-col-gutter-md">
      <div class="col-12 col-md-4" v-for="n in 3" :key="n">
        <q-card flat bordered class="q-pa-lg">
          <q-skeleton type="rect" height="80px" />
        </q-card>
      </div>
    </div>

    <!-- ==================== APRENDIZ ==================== -->
    <div v-else-if="authStore.isApprentice" class="row q-col-gutter-md">

      <!-- Sin EP registrada -->
      <div v-if="!ep" class="col-12">
        <q-banner class="bg-blue-1 text-primary rounded-borders" rounded>
          <template v-slot:avatar><q-icon name="info" /></template>
          Aún no tienes una Etapa Productiva registrada.
          <template v-slot:action>
            <q-btn flat color="primary" label="Registrar ahora" to="/register-ep" />
          </template>
        </q-banner>
      </div>

      <template v-else>
        <!-- KPI: Estado EP -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="kpi-card">
            <q-card-section class="bg-primary text-white row items-center no-wrap">
              <q-icon name="assignment" size="sm" class="q-mr-sm" />
              <span class="text-subtitle2">Estado de tu EP</span>
            </q-card-section>
            <q-card-section class="text-center q-pa-lg">
              <q-chip :color="statusColor(ep.status)" text-color="white" size="lg">
                {{ statusLabel(ep.status) }}
              </q-chip>
              <div class="text-caption text-grey-7 q-mt-sm">{{ ep.companySnapshot?.companyName || 'Sin empresa' }}</div>
              <div class="text-caption text-grey-6">{{ getModalityLabel(ep.modality) }}</div>
            </q-card-section>
            <q-card-actions align="center">
              <q-btn flat color="primary" label="Ver detalle" to="/my-productive-stage" size="sm" />
            </q-card-actions>
          </q-card>
        </div>

        <!-- KPI: Bitácoras -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="kpi-card">
            <q-card-section class="bg-teal text-white row items-center no-wrap">
              <q-icon name="history_edu" size="sm" class="q-mr-sm" />
              <span class="text-subtitle2">Progreso Bitácoras</span>
            </q-card-section>
            <q-card-section class="text-center q-pa-lg">
              <q-knob
                readonly
                :model-value="bitacoraPercent"
                show-value
                size="110px"
                :thickness="0.22"
                color="teal"
                track-color="grey-3"
                class="text-teal q-ma-sm"
              >
                <span class="text-subtitle2 text-weight-bold">{{ ep.completedBitacoras }}/{{ ep.maxBitacoras || '?' }}</span>
              </q-knob>
              <div class="text-caption text-grey-7">Bitácoras Aprobadas</div>
            </q-card-section>
            <q-card-actions align="center">
              <q-btn flat color="teal" label="Mis bitácoras" to="/bitacoras" size="sm" />
            </q-card-actions>
          </q-card>
        </div>

        <!-- KPI: Seguimientos -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="kpi-card">
            <q-card-section class="bg-indigo text-white row items-center no-wrap">
              <q-icon name="video_camera_front" size="sm" class="q-mr-sm" />
              <span class="text-subtitle2">Seguimientos</span>
            </q-card-section>
            <q-card-section class="text-center q-pa-lg">
              <div class="text-h3 text-weight-bold text-indigo">
                {{ ep.completedTrackings }}
                <span class="text-h5 text-grey-5">/ {{ ep.requiredTrackings || '?' }}</span>
              </div>
              <div class="text-caption text-grey-7 q-mt-sm">Ejecutados / Requeridos</div>
              <q-linear-progress
                :value="trackingPercent"
                color="indigo"
                size="8px"
                class="q-mt-md rounded-borders"
              />
            </q-card-section>
            <q-card-actions align="center">
              <q-btn flat color="indigo" label="Ver seguimientos" to="/trackings" size="sm" />
            </q-card-actions>
          </q-card>
        </div>

        <!-- Próximos Seguimientos -->
        <div class="col-12 col-md-8">
          <q-card flat bordered>
            <q-card-section class="bg-grey-2">
              <div class="text-subtitle1 text-weight-bold text-black">Próximos Seguimientos</div>
            </q-card-section>
            <q-list separator>
              <q-item v-for="t in upcomingTrackings" :key="t._id">
                <q-item-section avatar>
                  <q-icon :name="t.type === 'VIRTUAL' ? 'computer' : 'people'" color="indigo" />
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-bold">Seguimiento #{{ t.trackingNumber }}</q-item-label>
                  <q-item-label caption>{{ t.type === 'VIRTUAL' ? 'Virtual' : 'Presencial' }} — {{ formatDate(t.scheduledDate) }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-badge color="info" label="Programado" />
                </q-item-section>
              </q-item>
              <q-item v-if="upcomingTrackings.length === 0">
                <q-item-section class="text-grey-6 text-center q-pa-md">
                  No tienes seguimientos programados próximamente.
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </div>

        <!-- Instrucciones rápidas -->
        <div class="col-12 col-md-4">
          <q-card flat bordered class="bg-green-1">
            <q-card-section>
              <div class="text-subtitle2 text-positive text-weight-bold q-mb-sm">
                <q-icon name="tips_and_updates" class="q-mr-xs" /> Próximos pasos
              </div>
              <q-list dense>
                <q-item v-for="tip in apprenticeTips" :key="tip.label" clickable :to="tip.to" v-ripple>
                  <q-item-section avatar><q-icon :name="tip.icon" color="positive" size="xs" /></q-item-section>
                  <q-item-section class="text-caption">{{ tip.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>
      </template>
    </div>

    <!-- ==================== INSTRUCTOR ==================== -->
    <div v-else-if="authStore.isInstructor" class="row q-col-gutter-md">

      <!-- KPI: Aprendices asignados -->
      <div class="col-12 col-md-3">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="group" color="primary" size="2em" />
          <div class="text-h4 text-weight-bold text-primary q-mt-sm">{{ stats.instructor.totalApprentices }}</div>
          <div class="text-caption text-grey-7">Aprendices Asignados</div>
        </q-card>
      </div>

      <!-- KPI: Horas del mes -->
      <div class="col-12 col-md-3">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="schedule" color="blue" size="2em" />
          <div class="text-h4 text-weight-bold text-blue q-mt-sm">
            {{ stats.instructor.hoursThisMonth }}
          </div>
          <div class="text-caption text-grey-7">Horas este mes ({{ currentMonthName }})</div>
        </q-card>
      </div>

      <!-- KPI: Horas por cobrar -->
      <div class="col-12 col-md-3">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="payments" color="warning" size="2em" />
          <div class="text-h4 text-weight-bold text-warning q-mt-sm">{{ stats.instructor.pendingHours }}</div>
          <div class="text-caption text-grey-7">Horas Pendientes de Pago</div>
        </q-card>
      </div>

      <!-- KPI: Bitácoras pendientes -->
      <div class="col-12 col-md-3">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="rule_folder" color="orange" size="2em" />
          <div class="text-h4 text-weight-bold text-orange q-mt-sm">{{ stats.instructor.pendingBitacoras }}</div>
          <div class="text-caption text-grey-7">Bitácoras por Revisar</div>
        </q-card>
      </div>

      <!-- Tabla: Bitácoras pendientes de revisión -->
      <div class="col-12">
        <q-card flat bordered>
          <q-card-section class="bg-grey-2 row items-center justify-between">
            <div class="text-subtitle1 text-weight-bold text-black">Bitácoras Pendientes de Revisión</div>
            <q-btn flat size="sm" color="primary" label="Ver todas" to="/instructor/review-bitacoras" />
          </q-card-section>
          <q-table
            flat
            :rows="pendingBitacoras"
            :columns="bitacoraColumns"
            row-key="_id"
            hide-pagination
            :pagination="{ rowsPerPage: 5 }"
            :no-data-label="'No hay bitácoras pendientes ✓'"
          >
            <template v-slot:body-cell-status>
              <q-td>
                <q-badge color="warning" label="Pendiente" />
              </q-td>
            </template>
            <template v-slot:body-cell-actions="props">
              <q-td>
                <q-btn size="sm" color="primary" label="Evaluar" to="/instructor/review-bitacoras" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>

    <!-- ==================== ADMIN ==================== -->
    <div v-else-if="authStore.isAdmin" class="row q-col-gutter-md">

      <!-- KPI Cards -->
      <div class="col-12 col-md-4" v-for="stat in adminStats" :key="stat.label">
        <q-card flat bordered class="kpi-card q-pa-md">
          <div class="row items-center no-wrap">
            <q-icon :name="stat.icon" :color="stat.color" size="lg" class="q-mr-md" />
            <div>
              <div class="text-grey-7 text-caption">{{ stat.label }}</div>
              <div class="text-h5 text-weight-bold">
                <span v-if="stat.loading"><q-spinner size="sm" /></span>
                <span v-else>{{ stat.value }}</span>
              </div>
            </div>
          </div>
        </q-card>
      </div>

      <!-- Acciones Rápidas -->
      <div class="col-12">
        <div class="text-subtitle1 text-weight-bold text-black q-mb-md">Acciones Rápidas</div>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-sm-6 col-md-3" v-for="action in adminActions" :key="action.label">
            <q-btn
              :color="action.color"
              :icon="action.icon"
              :label="action.label"
              stack
              class="full-width q-pa-md"
              :to="action.to"
              unelevated
            />
          </div>
        </div>
      </div>

      <!-- Aprobaciones pendientes -->
      <div class="col-12" v-if="stats.admin.pendingApprovals > 0">
        <q-banner class="bg-orange-1 text-orange-9 rounded-borders" rounded>
          <template v-slot:avatar><q-icon name="pending_actions" color="warning" /></template>
          Tienes <strong>{{ stats.admin.pendingApprovals }}</strong> solicitud(es) de Etapa Productiva pendientes de aprobación.
          <template v-slot:action>
            <q-btn flat color="warning" label="Revisar ahora" to="/admin/approvals" />
          </template>
        </q-banner>
      </div>

    </div>

  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import productiveStageService from '../api/productiveStage.service';
import bitacoraService from '../api/bitacora.service';
import userService from '../api/user.service';
import hourService from '../api/hours.service';
import trackingService from '../api/tracking.service';

const authStore = useAuthStore();
const loading = ref(true);

// ─── Estado por rol ────────────────────────────────────────────────────────
const ep = ref(null);
const upcomingTrackings = ref([]);
const pendingBitacoras = ref([]);

const stats = ref({
  instructor: { totalApprentices: 0, hoursThisMonth: 0, pendingHours: 0, pendingBitacoras: 0 },
  admin: { activeEPs: 0, totalInstructors: 0, totalApprentices: 0, pendingApprovals: 0 }
});

// ─── Computed generales ────────────────────────────────────────────────────
const currentDate = computed(() =>
  new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
);

const currentMonthName = computed(() =>
  new Date().toLocaleDateString('es-ES', { month: 'long' })
);

const roleLabel = computed(() => {
  if (authStore.isAdmin) return 'Administrador';
  if (authStore.isInstructor) return 'Instructor';
  if (authStore.isApprentice) return 'Aprendiz';
  return 'Usuario';
});

// ─── Computed Aprendiz ─────────────────────────────────────────────────────
const bitacoraPercent = computed(() => {
  if (!ep.value?.maxBitacoras) return 0;
  return Math.min((ep.value.completedBitacoras / ep.value.maxBitacoras), 1);
});

const trackingPercent = computed(() => {
  if (!ep.value?.requiredTrackings) return 0;
  return Math.min((ep.value.completedTrackings / ep.value.requiredTrackings), 1);
});

const apprenticeTips = computed(() => {
  const tips = [];
  if (!ep.value) {
    tips.push({ label: 'Registra tu Etapa Productiva', icon: 'add_circle', to: '/register-ep' });
    return tips;
  }
  if (ep.value.completedBitacoras < (ep.value.maxBitacoras || 12))
    tips.push({ label: 'Sube tu próxima bitácora', icon: 'upload_file', to: '/bitacoras' });
  tips.push({ label: 'Revisa tus seguimientos', icon: 'video_camera_front', to: '/trackings' });
  tips.push({ label: 'Consulta tu carpeta de Drive', icon: 'folder_shared', to: '/my-productive-stage' });
  return tips;
});

// ─── Computed Admin KPIs ───────────────────────────────────────────────────
const adminStats = computed(() => [
  { label: 'Etapas Activas', value: stats.value.admin.activeEPs, icon: 'trending_up', color: 'positive' },
  { label: 'Instructores Activos', value: stats.value.admin.totalInstructors, icon: 'people', color: 'primary' },
  { label: 'Aprendices Registrados', value: stats.value.admin.totalApprentices, icon: 'school', color: 'accent' },
  { label: 'Solicitudes Pendientes', value: stats.value.admin.pendingApprovals, icon: 'pending_actions', color: 'warning' },
]);

const adminActions = [
  { label: 'Gestionar Usuarios', icon: 'manage_accounts', color: 'primary', to: '/users' },
  { label: 'Aprobaciones', icon: 'how_to_reg', color: 'positive', to: '/admin/approvals' },
  { label: 'Empresas', icon: 'business', color: 'secondary', to: '/companies' },
  { label: 'Reportes', icon: 'bar_chart', color: 'deep-purple', to: '/admin/reports' },
];

// ─── Columnas tabla bitácoras ──────────────────────────────────────────────
const bitacoraColumns = [
  { name: 'apprentice', label: 'Aprendiz', field: row => row.apprentice?.fullName || '—', align: 'left' },
  { name: 'logbookNumber', label: 'Bitácora', field: row => `#${row.logbookNumber}`, align: 'left' },
  { name: 'submittedAt', label: 'Enviada', field: row => formatDate(row.submittedAt), align: 'left' },
  { name: 'status', label: 'Estado', align: 'center' },
  { name: 'actions', label: 'Acción', align: 'center' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO');
}

function statusLabel(s) {
  const map = {
    PENDING_REGISTRATION: 'Pendiente Registro', PENDING_APPROVAL: 'En Revisión',
    ACTIVE: 'Activa', IN_FOLLOWUP: 'En Seguimiento',
    CERTIFICATION: 'Certificación', COMPLETED: 'Completada',
    REJECTED: 'Rechazada', CANCELLED: 'Cancelada'
  };
  return map[s] || s;
}

function statusColor(s) {
  const map = {
    PENDING_REGISTRATION: 'orange', PENDING_APPROVAL: 'info',
    ACTIVE: 'positive', IN_FOLLOWUP: 'teal',
    CERTIFICATION: 'purple', COMPLETED: 'grey',
    REJECTED: 'negative', CANCELLED: 'grey-6'
  };
  return map[s] || 'grey';
}

const modalityMap = {
  APPRENTICESHIP_CONTRACT: 'Contrato de Aprendizaje',
  LABOR_LINK: 'Vínculo Laboral',
  INTERNSHIP: 'Pasantía',
  INDIVIDUAL_PRODUCTIVE_PROJECT: 'Proyecto Individual',
  GROUP_PRODUCTIVE_PROJECT: 'Proyecto Grupal',
};
function getModalityLabel(v) { return modalityMap[v] || v; }

// ─── Carga de datos ────────────────────────────────────────────────────────
onMounted(loadData);

async function loadData() {
  loading.value = true;
  try {
    if (authStore.isApprentice)   await loadApprentice();
    if (authStore.isInstructor)   await loadInstructor();
    if (authStore.isAdmin)        await loadAdmin();
  } catch (e) {
    console.error('Dashboard load error:', e);
  } finally {
    loading.value = false;
  }
}

async function loadApprentice() {
  try {
    const epRes = await productiveStageService.getMyEP();
    const list = epRes.data?.data ?? epRes.data;
    ep.value = Array.isArray(list) ? (list[0] ?? null) : (list ?? null);
  } catch { ep.value = null; }

  if (!ep.value) return;

  try {
    const tRes = await trackingService.getTrackings({ status: 'SCHEDULED', limit: 5 });
    upcomingTrackings.value = tRes.data?.data ?? tRes.data ?? [];
  } catch { upcomingTrackings.value = []; }
}

async function loadInstructor() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const userId = authStore.user?.id || authStore.user?._id;

  const results = await Promise.allSettled([
    productiveStageService.getAllEPs({ status: 'ACTIVE', limit: 1 }),
    hourService.getInstructorHours(userId, { year, month }),
    bitacoraService.getPendingReview(),
  ]);

  // Aprendices (conteo total de EPs activas asignadas)
  if (results[0].status === 'fulfilled') {
    const d = results[0].value.data;
    stats.value.instructor.totalApprentices = d?.total ?? (Array.isArray(d?.data) ? d.data.length : 0);
  }

  // Horas del mes
  if (results[1].status === 'fulfilled') {
    const d = results[1].value.data;
    const records = d?.data ?? d ?? [];
    const arr = Array.isArray(records) ? records : [records];
    const rec = arr.find(r => r.year === year && r.month === month) ?? arr[0];
    stats.value.instructor.hoursThisMonth = rec?.totalHours ?? 0;
    stats.value.instructor.pendingHours = rec?.pendingPaymentHours ?? 0;
  }

  // Bitácoras pendientes
  if (results[2].status === 'fulfilled') {
    const d = results[2].value.data;
    const list = d?.data ?? d ?? [];
    pendingBitacoras.value = (Array.isArray(list) ? list : []).slice(0, 5);
    stats.value.instructor.pendingBitacoras = pendingBitacoras.value.length;
  }
}

async function loadAdmin() {
  const results = await Promise.allSettled([
    productiveStageService.getAllEPs({ status: 'ACTIVE', limit: 1 }),
    productiveStageService.getAllEPs({ status: 'PENDING_APPROVAL', limit: 1 }),
    userService.getInstructors({ status: 'ACTIVE', limit: 1 }),
    userService.getApprentices({ limit: 1 }),
  ]);

  const extract = (r) => {
    if (r.status !== 'fulfilled') return 0;
    const resData = r.value.data?.data || r.value.data;
    if (resData?.pagination?.total !== undefined) return resData.pagination.total;
    if (resData?.total !== undefined) return resData.total;
    const list = resData?.instructors || resData?.apprentices || resData?.productiveStages || resData;
    return Array.isArray(list) ? list.length : 0;
  };

  stats.value.admin.activeEPs        = extract(results[0]);
  stats.value.admin.pendingApprovals = extract(results[1]);
  stats.value.admin.totalInstructors = extract(results[2]);
  stats.value.admin.totalApprentices = extract(results[3]);
}
</script>

<style scoped>
.dashboard-wrapper {
  max-width: 1300px;
  margin: 0 auto;
}
.kpi-card {
  height: 100%;
}
</style>
