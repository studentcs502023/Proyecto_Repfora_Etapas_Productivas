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

      <!-- EP Rechazada -->
      <div v-else-if="ep.status === 'PENDING_REGISTRATION'" class="col-12">
        <q-banner class="bg-red-1 text-negative rounded-borders" rounded>
          <template v-slot:avatar><q-icon name="cancel" color="negative" /></template>
          <div class="text-weight-bold">Tu solicitud fue rechazada</div>
          <p class="q-mt-xs q-mb-none">
            {{ latestRejectComment || 'El administrador rechazó tu solicitud. Revisa los comentarios y vuelve a registrar tu etapa productiva.' }}
          </p>
          <template v-slot:action>
            <q-btn flat color="negative" label="Volver a Registrar" to="/register-ep" />
          </template>
        </q-banner>
      </div>

      <template v-else>

        <!-- ─── Progreso General ─── -->
        <div class="col-12">
          <q-card flat bordered>
            <q-card-section class="bg-primary text-white">
              <div class="text-subtitle1 text-weight-bold">
                <q-icon name="trending_up" class="q-mr-sm" />Progreso General
              </div>
            </q-card-section>
            <q-card-section>
              <div class="row items-center q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <div class="text-caption text-grey-7">Modalidad</div>
                  <div class="text-subtitle2 text-weight-bold">{{ getModalityLabel(ep.modality) }}</div>
                  <q-chip :color="statusColor(ep.status)" text-color="white" size="sm" class="q-mt-xs">
                    {{ statusLabel(ep.status) }}
                  </q-chip>
                  <div class="text-caption text-grey-7 q-mt-sm">
                    {{ formatDate(ep.startDate) }} — {{ formatDate(ep.estimatedEndDate) }}
                  </div>
                </div>
                <div class="col-12 col-md-6">
                  <div class="text-caption text-grey-7 q-mb-xs">Bitácoras</div>
                  <div class="row items-center q-mb-sm">
                    <q-linear-progress :value="bitacoraPercent" color="teal" size="12px" class="col rounded-borders" />
                    <span class="q-ml-sm text-weight-bold text-teal">{{ ep.completedBitacoras }}/{{ ep.maxBitacoras || '?' }}</span>
                  </div>
                  <div class="text-caption text-grey-7 q-mb-xs">Seguimientos</div>
                  <div class="row items-center">
                    <q-linear-progress :value="trackingPercent" color="indigo" size="12px" class="col rounded-borders" />
                    <span class="q-ml-sm text-weight-bold text-indigo">{{ ep.completedTrackings }}/{{ ep.requiredTrackings || '?' }}</span>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- ─── Notificaciones ─── -->
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section class="bg-grey-2 row items-center justify-between">
              <div class="text-subtitle1 text-weight-bold text-black">
                <q-icon name="notifications" class="q-mr-sm" />Notificaciones
              </div>
              <div class="row items-center q-gutter-sm">
                <q-badge v-if="unreadCount > 0" color="red" rounded>{{ unreadCount }} sin leer</q-badge>
                <q-btn v-if="unreadCount > 0" flat dense size="sm" color="primary" label="Marcar todas" @click="markAllAsRead" :loading="loadingNotif" />
                <q-btn flat dense size="sm" color="primary" icon="open_in_new" label="Ver todas" to="/notificaciones" />
              </div>
            </q-card-section>
            <q-card-section class="q-pa-none">
              <div v-if="loadingNotif" class="text-center q-pa-lg">
                <q-spinner color="primary" size="2em" />
              </div>
              <div v-else-if="notifications.length === 0" class="text-center q-pa-lg text-grey-6">
                <q-icon name="notifications_off" size="2em" class="q-mb-sm" />
                <div>No tienes notificaciones</div>
              </div>
              <q-scroll-area v-else style="height: 250px;">
                <q-list separator>
                  <q-item
                    v-for="n in notifications"
                    :key="n._id"
                    clickable
                    :class="n.isRead ? '' : 'bg-blue-1'"
                    @click="markAsRead(n)"
                  >
                    <q-item-section>
                      <q-item-label class="text-weight-bold">{{ n.title }}</q-item-label>
                      <q-item-label caption class="q-mt-xs">{{ n.message }}</q-item-label>
                      <q-item-label caption class="text-caption text-grey-6 q-mt-xs">
                        {{ formatNotifDate(n.createdAt) }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section v-if="!n.isRead" side>
                      <q-badge color="primary" rounded />
                    </q-item-section>
                    <q-tooltip v-if="!n.isRead">Clic para marcar como leída</q-tooltip>
                  </q-item>
                </q-list>
              </q-scroll-area>
            </q-card-section>
          </q-card>
        </div>

        <!-- ─── Detalle del Vínculo ─── -->
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section class="bg-grey-2">
              <div class="text-subtitle1 text-weight-bold text-black">
                <q-icon name="link" class="q-mr-sm" />Detalle del Vínculo
              </div>
            </q-card-section>
            <q-card-section>
              <q-list dense>
                <q-item>
                  <q-item-section avatar><q-icon name="business" color="primary" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Empresa</q-item-label>
                    <q-item-label>{{ ep.companySnapshot?.companyName || ep.company?.name || '—' }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="ep.companySnapshot?.taxId || ep.company?.taxId">
                  <q-item-section avatar><q-icon name="badge" color="grey" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>NIT</q-item-label>
                    <q-item-label>{{ ep.companySnapshot?.taxId || ep.company?.taxId }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar><q-icon name="work" color="orange" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Cargo</q-item-label>
                    <q-item-label>{{ ep.companySnapshot?.apprenticeJobTitle || '—' }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar><q-icon name="person" color="teal" /></q-item-section>
                  <q-item-section>
                    <q-item-label caption>Supervisor</q-item-label>
                    <q-item-label>{{ ep.companySnapshot?.supervisorName || '—' }}</q-item-label>
                    <q-item-label caption>{{ ep.companySnapshot?.supervisorEmail }} · {{ ep.companySnapshot?.supervisorPhone }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <!-- ─── Instructores Asignados ─── -->
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section class="bg-grey-2">
              <div class="text-subtitle1 text-weight-bold text-black">
                <q-icon name="people" class="q-mr-sm" />Instructores Asignados
              </div>
            </q-card-section>
            <q-card-section>
              <q-list separator>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="person_search" :color="ep.followupInstructor ? 'positive' : 'grey'" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Seguimiento</q-item-label>
                    <q-item-label v-if="ep.followupInstructor">
                      {{ ep.followupInstructor.fullName }}
                      <span class="text-caption text-grey-6 block">{{ ep.followupInstructor.email }}</span>
                    </q-item-label>
                    <q-item-label v-else caption class="text-grey-5">Pendiente de asignación</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="engineering" :color="ep.technicalInstructor ? 'positive' : 'grey'" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Técnico</q-item-label>
                    <q-item-label v-if="ep.technicalInstructor">
                      {{ ep.technicalInstructor.fullName }}
                      <span class="text-caption text-grey-6 block">{{ ep.technicalInstructor.email }}</span>
                    </q-item-label>
                    <q-item-label v-else caption class="text-grey-5">Pendiente de asignación</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item>
                  <q-item-section avatar>
                    <q-icon name="lightbulb" :color="ep.projectInstructor ? 'positive' : 'grey'" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">Proyecto</q-item-label>
                    <q-item-label v-if="ep.projectInstructor">
                      {{ ep.projectInstructor.fullName }}
                      <span class="text-caption text-grey-6 block">{{ ep.projectInstructor.email }}</span>
                    </q-item-label>
                    <q-item-label v-else caption class="text-grey-5">Pendiente de asignación</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card-section>
          </q-card>
        </div>

        <!-- ─── Hilo de Comentarios ───
        <div class="col-12">
          <q-card flat bordered>
            <q-card-section class="bg-grey-2">
              <div class="text-subtitle1 text-weight-bold text-black">
                <q-icon name="forum" class="q-mr-sm" />Comentarios
              </div>
            </q-card-section>
            <q-card-section class="q-pa-none">
              <q-scroll-area style="height: 250px;">
                <q-list separator>
                  <q-item v-for="c in ep.comments" :key="c._id">
                    <q-item-section avatar>
                      <q-avatar :color="isOwnComment(c.author) ? 'primary' : 'grey'" text-color="white" size="sm">
                        {{ commentInitial(c) }}
                      </q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-medium text-caption">
                        {{ isOwnComment(c.author) ? 'Tú' : 'Administrador' }}
                        <span class="text-grey-5 text-caption q-ml-xs">{{ formatDateTime(c.createdAt) }}</span>
                      </q-item-label>
                      <q-item-label class="text-body2">{{ c.text }}</q-item-label>
                    </q-item-section>
                  </q-item>
                  <q-item v-if="!ep.comments || ep.comments.length === 0">
                    <q-item-section class="text-grey-5 text-center q-pa-md">
                      Sin comentarios aún.
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-scroll-area>
            </q-card-section>
            <q-separator />
            <q-card-section class="q-pa-sm">
              <div class="row items-center q-gutter-sm">
                <q-input v-model="newComment" outlined dense class="col" placeholder="Escribe un comentario..." :disable="sendingComment" :rules="[val => !val || val.trim().length >= 3 || 'Mínimo 3 caracteres']" />
                <q-btn flat round color="primary" icon="send" @click="sendComment" :loading="sendingComment" :disable="!newComment.trim()">
                <q-tooltip>Enviar comentario</q-tooltip>
              </q-btn>
              </div>
            </q-card-section>
          </q-card>
        </div> -->

      </template>
    </div>

    <!-- ==================== INSTRUCTOR ==================== -->
    <div v-else-if="authStore.isInstructor" class="row q-col-gutter-md">

      <!-- KPI: Aprendices asignados -->
      <div class="col-12 col-sm-6 col-md">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="group" color="primary" size="2em" />
          <div class="text-h4 text-weight-bold text-primary q-mt-sm">{{ stats.instructor.totalApprentices }}</div>
          <div class="text-caption text-grey-7">Aprendices Asignados</div>
        </q-card>
      </div>

      <!-- KPI: Horas del mes -->
      <div class="col-12 col-sm-6 col-md">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="schedule" color="blue" size="2em" />
          <div class="text-h4 text-weight-bold text-blue q-mt-sm">
            {{ stats.instructor.hoursThisMonth }}
          </div>
          <div class="text-caption text-grey-7">Horas este mes ({{ currentMonthName }})</div>
        </q-card>
      </div>

      <!-- KPI: Horas por cobrar -->
      <div class="col-12 col-sm-6 col-md">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="payments" color="warning" size="2em" />
          <div class="text-h4 text-weight-bold text-warning q-mt-sm">{{ stats.instructor.pendingHours }}</div>
          <div class="text-caption text-grey-7">Horas Pendientes de Pago</div>
        </q-card>
      </div>

      <!-- KPI: Bitácoras pendientes -->
      <div class="col-12 col-sm-6 col-md">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="rule_folder" color="orange" size="2em" />
          <div class="text-h4 text-weight-bold text-orange q-mt-sm">{{ stats.instructor.pendingBitacoras }}</div>
          <div class="text-caption text-grey-7">Bitácoras por Revisar</div>
        </q-card>
      </div>

      <!-- KPI: Seguimientos próximos a vencer -->
      <div class="col-12 col-sm-6 col-md">
        <q-card flat bordered class="kpi-card text-center q-pa-md">
          <q-icon name="event_busy" color="red" size="2em" />
          <div class="text-h4 text-weight-bold text-red q-mt-sm">{{ stats.instructor.upcomingTrackings }}</div>
          <div class="text-caption text-grey-7">Seguimientos por Vencer (7 días)</div>
        </q-card>
      </div>

      <!-- Tabla: Seguimientos próximos a vencer -->
      <div class="col-12 col-md-6" v-if="upcomingTrackings.length > 0">
        <q-card flat bordered>
          <q-card-section class="bg-red-1 row items-center justify-between">
            <div class="text-subtitle1 text-weight-bold text-red-9">
              <q-icon name="warning" class="q-mr-sm" />Seguimientos Próximos a Vencer
            </div>
            <q-btn flat size="sm" color="red" label="Ver todos" to="/instructor/manage-trackings" />
          </q-card-section>
          <q-table
            flat
            :rows="upcomingTrackings"
            :columns="trackingAlertColumns"
            row-key="_id"
            hide-pagination
            :pagination="{ rowsPerPage: 5 }"
            :no-data-label="'No hay seguimientos próximos ✓'"
          >
            <template v-slot:body-cell-aprendiz="props">
              <q-td :props="props">
                <div class="text-weight-bold">{{ props.row.apprentice?.fullName }}</div>
                <div class="text-caption text-grey-7">Ficha: {{ props.row.apprentice?.enrollmentNumber || 'N/D' }}</div>
              </q-td>
            </template>
            <template v-slot:body-cell-seguimiento="props">
              <q-td :props="props">
                <span>Seguimiento #{{ props.row.trackingNumber }}</span>
                <q-badge v-if="props.row.isExtraordinary" color="warning" label="Extra" class="q-ml-xs" size="sm" />
              </q-td>
            </template>
            <template v-slot:body-cell-fecha="props">
              <q-td :props="props">
                <div :class="getTrackingUrgencyClass(props.row)">
                  {{ formatDate(props.row.scheduledDate) }}
                </div>
                <div class="text-caption" :class="getTrackingUrgencyClass(props.row)">
                  {{ getDaysUntilLabel(props.row) }}
                </div>
              </q-td>
            </template>
            <template v-slot:body-cell-accion="props">
              <q-td :props="props">
                <q-btn size="sm" color="primary" label="Gestionar" to="/instructor/manage-trackings" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </div>

      <!-- Tabla: Bitácoras pendientes de revisión -->
      <div class="col-12 col-md-6">
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
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import productiveStageService from '../api/productiveStage.service';
import bitacoraService from '../api/bitacora.service';
import userService from '../api/user.service';
import hourService from '../api/hours.service';
import notificationService from '../api/notification.service';
import trackingService from '../api/tracking.service';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);

// ─── Estado por rol ────────────────────────────────────────────────────────
const ep = ref(null);
const pendingBitacoras = ref([]);
const newComment = ref('');
const sendingComment = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);
const loadingNotif = ref(false);
const upcomingTrackings = ref([]);

const stats = ref({
  instructor: { totalApprentices: 0, hoursThisMonth: 0, pendingHours: 0, pendingBitacoras: 0, upcomingTrackings: 0 },
  admin: { activeEPs: 0, totalInstructors: 0, totalApprentices: 0, pendingApprovals: 0 }
});

const latestRejectComment = computed(() => {
  if (!ep.value?.comments?.length) return '';
  const last = ep.value.comments[ep.value.comments.length - 1];
  return last.text?.startsWith('RECHAZO DE REGISTRO:') ? last.text.replace('RECHAZO DE REGISTRO:', '').trim() : '';
});

const bitacoraPercent = computed(() => {
  if (!ep.value || !ep.value.maxBitacoras) return 0;
  return Math.min((ep.value.completedBitacoras || 0) / ep.value.maxBitacoras, 1);
});

const trackingPercent = computed(() => {
  if (!ep.value || !ep.value.requiredTrackings) return 0;
  return Math.min((ep.value.completedTrackings || 0) / ep.value.requiredTrackings, 1);
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
  { name: 'apprentice', label: 'Aprendiz', field: row => row.apprentice?.fullName, align: 'left' },
  { name: 'logbook', label: 'Bitácora', field: 'logbookNumber', align: 'left' },
  { name: 'period', label: 'Periodo', field: row => formatDate(row.periodStart) + ' - ' + formatDate(row.periodEnd), align: 'left' },
  { name: 'status', label: 'Estado', align: 'center' },
  { name: 'actions', label: 'Acción', align: 'center' },
];

const trackingAlertColumns = [
  { name: 'aprendiz', label: 'Aprendiz', field: row => row.apprentice?.fullName, align: 'left' },
  { name: 'seguimiento', label: 'Seguimiento', field: 'trackingNumber', align: 'left' },
  { name: 'fecha', label: 'Fecha Límite', field: 'scheduledDate', align: 'center' },
  { name: 'accion', label: 'Acción', align: 'center' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO');
}

function formatDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('es-CO', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
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

// ─── Notificaciones ──────────────────────────────────────────────────────────
async function loadNotifications() {
  loadingNotif.value = true;
  try {
    const res = await notificationService.getNotifications({ limit: 10 });
    const body = res.data || res;
    notifications.value = body.notifications || body || [];
    unreadCount.value = notifications.value.filter(n => !n.isRead).length;
  } catch { /* silencioso */ }
  finally { loadingNotif.value = false; }
}

function formatNotifDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const notifRoutes = {
  EP_APPROVED: '/register-ep',
  EP_REJECTED: '/register-ep',
  EP_COMMENT_ADDED: '/register-ep',
  BITACORA_APPROVED: '/bitacoras',
  BITACORA_REJECTED: '/bitacoras',
  BITACORA_PENDING_REVIEW: '/bitacoras',
  BITACORA_REMINDER: '/bitacoras',
  TRACKING_REMINDER: '/trackings',
  EXTRAORDINARY_TRACKING_APPROVED: '/trackings',
  DOCUMENTS_APPROVED: '/certification',
  DOCUMENTS_REJECTED: '/certification',
  DOCUMENTS_REMINDER: '/certification',
  ENROLLMENT_EXPIRY_ALERT: '/',
  SYSTEM_WELCOME: '/mi-perfil',
};

async function markAsRead(n) {
  const wasUnread = !n.isRead;
  try {
    await notificationService.markAsRead(n._id);
    n.isRead = true;
    if (wasUnread) unreadCount.value = Math.max(0, unreadCount.value - 1);
  } catch { /* silencioso */ }
  const route = notifRoutes[n.type];
  if (route) {
    router.push(route);
  }
}

async function markAllAsRead() {
  loadingNotif.value = true;
  try {
    await notificationService.markAllAsRead();
    notifications.value.forEach(n => n.isRead = true);
    unreadCount.value = 0;
  } catch { /* silencioso */ }
  finally { loadingNotif.value = false; }
}

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
    $q.notify({ type: 'negative', message: 'Error al cargar el panel.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

async function loadApprentice() {
  try {
    const epRes = await productiveStageService.getMyEP();
    const data = epRes.data?.eps || epRes.data?.data?.eps || epRes.data?.data || epRes.data;
    const list = Array.isArray(data) ? data : (data?.eps || []);
    ep.value = list[0] ?? null;
  } catch { ep.value = null; }
  loadNotifications();
}

async function fetchEP() {
  try {
    const epRes = await productiveStageService.getMyEP();
    const data = epRes.data?.eps || epRes.data?.data?.eps || epRes.data?.data || epRes.data;
    const list = Array.isArray(data) ? data : (data?.eps || []);
    ep.value = list[0] ?? null;
  } catch { /* mantener ep actual */ }
}

function isOwnComment(author) {
  const userId = authStore.user?.id || authStore.user?._id;
  const authorId = author?._id || author;
  return String(userId) === String(authorId);
}

function commentInitial(c) {
  if (isOwnComment(c.author)) return authStore.user?.fullName?.charAt(0)?.toUpperCase() || 'T';
  return 'A';
}

function getDaysUntilLabel(tracking) {
  if (!tracking.scheduledDate) return '';
  const now = new Date();
  const scheduled = new Date(tracking.scheduledDate);
  const diff = Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '¡VENCIDO!';
  if (diff === 0) return 'HOY';
  if (diff === 1) return 'Mañana';
  return `En ${diff} días`;
}

function getTrackingUrgencyClass(tracking) {
  if (!tracking.scheduledDate) return 'text-grey';
  const now = new Date();
  const scheduled = new Date(tracking.scheduledDate);
  const diff = Math.ceil((scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'text-negative text-weight-bold';
  if (diff <= 3) return 'text-orange text-weight-bold';
  return 'text-warning';
}

async function sendComment() {
  if (!newComment.value.trim() || !ep.value) return;
  sendingComment.value = true;
  try {
    await productiveStageService.addComment(ep.value._id, newComment.value);
    newComment.value = '';
    await fetchEP();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al enviar comentario.', position: 'top', timeout: 5000 });
  } finally {
    sendingComment.value = false;
  }
}

async function loadInstructor() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const userId = authStore.user?.id || authStore.user?._id;

  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const results = await Promise.allSettled([
    productiveStageService.getAllEPs({ status: 'ACTIVE', limit: 1 }),
    hourService.getInstructorHours(userId, { year, month }),
    bitacoraService.getPendingReview(),
    trackingService.getTrackings({ status: 'SCHEDULED', limit: 100 }),
  ]);

  if (results[0].status === 'fulfilled') {
    const d = results[0].value.data;
    stats.value.instructor.totalApprentices = d?.pagination?.total ?? d?.total ?? 0;
  }

  if (results[1].status === 'fulfilled') {
    const d = results[1].value.data;
    const records = d?.records ?? d?.data ?? [];
    const arr = Array.isArray(records) ? records : [records];
    const rec = arr.find(r => r.year === year && r.month === month) ?? arr[0];
    stats.value.instructor.hoursThisMonth = rec?.totalHours ?? 0;
    stats.value.instructor.pendingHours = rec?.pendingPaymentHours ?? 0;
  }

  if (results[2].status === 'fulfilled') {
    const d = results[2].value.data;
    const list = d?.bitacoras ?? d?.data ?? [];
    pendingBitacoras.value = (Array.isArray(list) ? list : []).slice(0, 5);
    stats.value.instructor.pendingBitacoras = pendingBitacoras.value.length;
  }

  if (results[3].status === 'fulfilled') {
    const d = results[3].value.data;
    const trackings = d?.trackings || d?.data || [];
    const list = Array.isArray(trackings) ? trackings : [];
    upcomingTrackings.value = list
      .filter(t => {
        if (!t.scheduledDate) return false;
        const scheduled = new Date(t.scheduledDate);
        return scheduled <= sevenDaysFromNow && scheduled >= now;
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
      .slice(0, 5);
    stats.value.instructor.upcomingTrackings = list.filter(t => {
      if (!t.scheduledDate) return false;
      const scheduled = new Date(t.scheduledDate);
      return scheduled <= sevenDaysFromNow;
    }).length;
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
