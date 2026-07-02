<template>
  <div class="notificaciones-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="notifications_active" class="q-mr-sm" size="md"/>Notificaciones
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Centro de notificaciones de tu etapa productiva</p>
      </div>
      <div class="col-auto row items-center q-gutter-md z-top">
        <q-badge v-if="unreadCount > 0" color="red" class="q-pa-sm text-weight-bold shadow-1" rounded>
          {{ unreadCount }} sin leer
        </q-badge>
        <q-btn v-if="unreadCount > 0" color="white" text-color="primary" icon="done_all" label="Marcar todas leídas" class="text-weight-bold shadow-2" rounded @click="markAllAsRead" :loading="loadingAction" />
        <q-btn flat round color="white" icon="refresh" @click="fetchNotifications" :loading="loading">
          <q-tooltip class="bg-dark text-white">Actualizar</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Filtros -->
    <q-card class="filter-card my-card q-mb-lg no-shadow">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-sm-4">
          <q-select
            v-model="filter"
            :options="filterOptions"
            label="Filtrar por"
            outlined
            dense
            color="primary"
            class="glass-input text-weight-medium"
            emit-value
            map-options
            @update:model-value="fetchNotifications"
          >
            <template v-slot:prepend><q-icon name="filter_list" color="grey-6" /></template>
          </q-select>
        </div>
      </q-card-section>
    </q-card>

    <!-- Loading -->
    <q-card v-if="loading" class="my-card no-shadow q-pa-xl text-center">
      <q-spinner color="primary" size="4em" />
      <p class="text-h6 text-primary text-weight-medium q-mt-md">Cargando notificaciones...</p>
    </q-card>

    <!-- Empty -->
    <q-card v-else-if="notifications.length === 0" class="my-card no-shadow text-center q-pa-xl">
      <q-icon name="notifications_off" size="5em" color="grey-4" class="q-mb-md" />
      <p class="text-h5 text-grey-8 text-weight-bold q-mb-xs">No tienes notificaciones</p>
      <p class="text-grey-6 text-subtitle1">Aquí aparecerán las notificaciones sobre tu etapa productiva.</p>
    </q-card>

    <!-- Lista de Notificaciones -->
    <q-list v-else separator class="rounded-borders bg-white shadow-1 my-card no-shadow q-pa-sm">
      <q-item
        v-for="n in notifications"
        :key="n._id"
        clickable
        class="q-pa-md notif-item transition-all rounded-borders q-mb-xs"
        :class="n.isRead ? 'bg-white' : 'bg-blue-50 border-left-primary'"
        @click="markAsRead(n)"
      >
        <q-item-section avatar>
          <q-icon :name="iconForType(n.type)" :color="iconColorForType(n.type)" size="md" class="q-pa-xs rounded-borders shadow-1" style="background: rgba(255,255,255,0.8);" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-weight-bold text-subtitle1 text-primary">
            {{ n.title }}
            <q-badge v-if="!n.isRead" color="primary" rounded class="q-ml-sm shadow-1" />
          </q-item-label>
          <q-item-label caption class="q-mt-sm text-body2 text-grey-9" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
            {{ stripHtml(n.message) }}
          </q-item-label>
          <q-item-label caption class="text-caption text-weight-bold text-grey-6 q-mt-sm">
            <q-icon name="schedule" class="q-mr-xs"/>{{ formatNotifDate(n.createdAt) }}
          </q-item-label>
        </q-item-section>
        <q-item-section side v-if="!n.isRead">
          <q-btn flat round dense size="md" color="primary" icon="mark_email_read" class="action-btn" @click.stop="markAsRead(n)">
            <q-tooltip class="bg-primary text-white shadow-4">Marcar como leída</q-tooltip>
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

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.notificaciones-container {
  max-width: 1000px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Premium Header */
.page-header {
  background: linear-gradient(135deg, #318335 0%, #43A047 100%);
  border-radius: 20px;
  padding: 30px;
  position: relative;
  overflow: hidden;
}

.cover-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0);
  background-size: 20px 20px;
  pointer-events: none;
}

.shadow-text { text-shadow: 2px 2px 8px rgba(0,0,0,0.4); }
.opacity-80 { opacity: 0.8; }

/* Cards & Glassmorphism */
.my-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
}

/* Inputs */
.glass-input :deep(.q-field__control) {
  border-radius: 12px;
  transition: all 0.3s ease;
  background: #f8fcfb;
}

.glass-input:focus-within :deep(.q-field__control) {
  transform: scale(1.02);
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
  background: #fff;
}

/* List Items */
.notif-item {
  transition: all 0.2s ease;
}

.notif-item:hover {
  transform: translateX(4px);
  background: #f8fcfb !important;
}

.action-btn { transition: all 0.2s ease; }
.action-btn:hover { transform: scale(1.15); }

.border-left-primary { border-left: 4px solid var(--q-primary); }
</style>
