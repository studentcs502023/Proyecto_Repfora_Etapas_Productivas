<template>
  <div class="notificaciones-container q-pa-md">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Notificaciones</h2>
        <p class="text-grey-7 text-subtitle1 q-my-none">Centro de notificaciones de tu etapa productiva</p>
      </div>
      <div class="col-auto row items-center q-gutter-sm">
        <q-badge v-if="unreadCount > 0" color="red" class="q-pa-sm" rounded>
          {{ unreadCount }} sin leer
        </q-badge>
        <q-btn v-if="unreadCount > 0" color="primary" outline icon="done_all" label="Marcar todas leídas" @click="markAllAsRead" :loading="loadingAction" />
        <q-btn flat round color="primary" icon="refresh" @click="fetchNotifications" :loading="loading">
          <q-tooltip>Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Filtros -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-select
            v-model="filter"
            :options="filterOptions"
            label="Filtrar por"
            outlined
            dense
            emit-value
            map-options
            @update:model-value="fetchNotifications"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
      <p class="text-grey-6 q-mt-md">Cargando notificaciones...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="notifications.length === 0" class="text-center q-pa-xl">
      <q-icon name="notifications_off" size="5em" color="grey-5" class="q-mb-md" />
      <p class="text-h6 text-grey-6 q-mb-xs">No tienes notificaciones</p>
      <p class="text-grey-5">Aquí aparecerán las notificaciones sobre tu etapa productiva.</p>
    </div>

    <!-- Lista de Notificaciones -->
    <q-list v-else separator bordered class="rounded-borders">
      <q-item
        v-for="n in notifications"
        :key="n._id"
        clickable
        :class="n.isRead ? '' : 'bg-blue-1'"
        @click="markAsRead(n)"
      >
        <q-item-section avatar>
          <q-icon :name="iconForType(n.type)" :color="iconColorForType(n.type)" size="sm" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-bold">
            {{ n.title }}
            <q-badge v-if="!n.isRead" color="primary" rounded class="q-ml-sm" />
          </q-item-label>
          <q-item-label caption class="q-mt-xs">{{ n.message }}</q-item-label>
          <q-item-label caption class="text-caption text-grey-6 q-mt-xs">
            {{ formatNotifDate(n.createdAt) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side v-if="!n.isRead">
          <q-btn flat round dense size="sm" color="primary" icon="mark_email_read" @click.stop="markAsRead(n)">
            <q-tooltip>Marcar como leída</q-tooltip>
          </q-btn>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- Paginación -->
    <div v-if="totalPages > 1" class="row justify-center q-mt-md">
      <q-pagination
        v-model="currentPage"
        :max="totalPages"
        :max-pages="6"
        direction-links
        color="primary"
        @update:model-value="onPageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import notificationService from '../../api/notification.service';

const router = useRouter();
const loading = ref(false);
const loadingAction = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);
const filter = ref('all');
const currentPage = ref(1);
const totalPages = ref(1);
const limit = 20;

const filterOptions = [
  { label: 'Todas', value: 'all' },
  { label: 'No leídas', value: 'unread' },
  { label: 'Leídas', value: 'read' },
];

function formatNotifDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function iconForType(type) {
  const map = {
    SYSTEM_WELCOME: 'waving_hand',
    EP_APPROVED: 'check_circle',
    EP_REJECTED: 'cancel',
    EP_COMMENT_ADDED: 'forum',
    BITACORA_APPROVED: 'verified',
    BITACORA_REJECTED: 'error',
    BITACORA_PENDING_REVIEW: 'hourglass_top',
    BITACORA_REMINDER: 'event_note',
    TRACKING_REMINDER: 'calendar_today',
    EXTRAORDINARY_TRACKING_APPROVED: 'star',
    DOCUMENTS_APPROVED: 'workspace_premium',
    DOCUMENTS_REJECTED: 'gpp_bad',
    DOCUMENTS_REMINDER: 'description',
    ENROLLMENT_EXPIRY_ALERT: 'schedule',
  };
  return map[type] || 'notifications';
}

function iconColorForType(type) {
  const map = {
    SYSTEM_WELCOME: 'primary',
    EP_APPROVED: 'positive',
    EP_REJECTED: 'negative',
    BITACORA_APPROVED: 'positive',
    BITACORA_REJECTED: 'negative',
    DOCUMENTS_APPROVED: 'positive',
    DOCUMENTS_REJECTED: 'negative',
    BITACORA_PENDING_REVIEW: 'warning',
    BITACORA_REMINDER: 'orange',
    TRACKING_REMINDER: 'info',
  };
  return map[type] || 'grey';
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

async function fetchNotifications() {
  loading.value = true;
  try {
    const params = { page: currentPage.value, limit };
    if (filter.value === 'unread') params.isRead = false;
    if (filter.value === 'read') params.isRead = true;

    const res = await notificationService.getNotifications(params);
    const body = res.data || res;
    notifications.value = body.notifications || body || [];
    unreadCount.value = body.unreadCount ?? notifications.value.filter(n => !n.isRead).length;
    totalPages.value = body.pagination?.pages || 1;
  } catch { /* silencioso */ }
  finally { loading.value = false; }
}

async function markAsRead(n) {
  if (n.isRead) {
    const route = notifRoutes[n.type];
    if (route) router.push(route);
    return;
  }
  try {
    await notificationService.markAsRead(n._id);
    n.isRead = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    const route = notifRoutes[n.type];
    if (route) router.push(route);
  } catch { /* silencioso */ }
}

async function markAllAsRead() {
  loadingAction.value = true;
  try {
    await notificationService.markAllAsRead();
    notifications.value.forEach(n => n.isRead = true);
    unreadCount.value = 0;
  } catch { /* silencioso */ }
  finally { loadingAction.value = false; }
}

function onPageChange(page) {
  currentPage.value = page;
  fetchNotifications();
}

onMounted(fetchNotifications);
</script>

<style scoped>
.notificaciones-container {
  max-width: 900px;
  margin: 0 auto;
}
</style>
