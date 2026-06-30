<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-2">
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menú"
          @click="toggleLeftDrawer"
        />

        <div class="row items-center cursor-pointer" @click="$router.push('/')">
          <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Sena_Colombia_logo.svg" 
               style="height: 40px; filter: brightness(0) invert(1);" 
               alt="Logo SENA" 
               class="q-mr-md" />
          <q-toolbar-title class="text-weight-bold q-pa-none shrink">
            REPFORA E.P.
          </q-toolbar-title>
        </div>

        <q-space />

        <!-- Notification Bell con Popup Dropdown (instructores y admin) -->
        <q-btn v-if="!authStore.isApprentice" flat round dense class="q-mr-sm notif-bell-btn" id="notif-bell-btn">
          <q-icon name="notifications" size="22px" />
          <q-badge v-if="unreadCount > 0" color="red" floating class="notif-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</q-badge>
          <q-tooltip anchor="bottom middle" self="top middle">Notificaciones</q-tooltip>

          <!-- Popup Panel de Notificaciones -->
          <q-menu
            v-model="notificationDropdown"
            anchor="bottom right"
            self="top right"
            :offset="[0, 8]"
            class="notif-dropdown-menu"
            transition-show="jump-down"
            transition-hide="jump-up"
            @before-show="fetchNotifications"
            square
          >
            <div class="notif-panel">
              <!-- Header -->
              <div class="notif-header">
                <div class="notif-header-left">
                  <q-icon name="notifications" size="18px" class="notif-header-icon" />
                  <span class="notif-header-title">Notificaciones</span>
                  <q-badge v-if="unreadCount > 0" color="red" class="notif-count-badge">{{ unreadCount }}</q-badge>
                </div>
                <div class="notif-header-actions">
                  <button v-if="unreadCount > 0" class="notif-read-all-btn" @click.stop="markAllAsRead">Leer todas</button>
                  <q-btn flat round dense icon="close" size="sm" color="grey-7" v-close-popup class="notif-close-btn" />
                </div>
              </div>

              <q-separator />

              <!-- Loading -->
              <div v-if="loadingNotif" class="notif-loading">
                <q-spinner color="primary" size="28px" />
                <span>Cargando...</span>
              </div>

              <!-- Empty State -->
              <div v-else-if="notifications.length === 0" class="notif-empty">
                <div class="notif-empty-icon">
                  <q-icon name="notifications_off" size="36px" />
                </div>
                <div class="notif-empty-title">Sin notificaciones</div>
                <div class="notif-empty-sub">Estás al día con todo</div>
              </div>

              <!-- Lista -->
              <div v-else class="notif-list">
                <div
                  v-for="n in notifications"
                  :key="n._id"
                  class="notif-item"
                  :class="{ 'notif-item--unread': !n.isRead }"
                  @click="markAsReadAndClose(n)"
                >
                  <div class="notif-item-icon-wrap" :class="getNotifIconClass(n.type)">
                    <q-icon :name="getNotifIcon(n.type)" size="18px" />
                  </div>
                  <div class="notif-item-body">
                    <div class="notif-item-title">{{ n.title }}</div>
                    <div class="notif-item-msg">{{ n.message }}</div>
                    <div class="notif-item-time">
                      <q-icon name="schedule" size="11px" />
                      {{ formatNotifDate(n.createdAt) }}
                    </div>
                  </div>
                  <div v-if="!n.isRead" class="notif-item-dot"></div>
                </div>
              </div>
            </div>
          </q-menu>
        </q-btn>

        <!-- User Profile Dropdown -->
        <q-btn-dropdown flat no-caps stretch>
          <template v-slot:label>
            <div class="row items-center no-wrap">
              <q-avatar size="sm" color="white" text-color="primary" class="q-mr-sm">
                {{ authStore.user?.fullName?.charAt(0) }}
              </q-avatar>
              <div class="text-subtitle2 text-capitalize">
                {{ authStore.user?.fullName?.split(' ')[0] }}
              </div>
            </div>
          </template>

          <q-list style="min-width: 150px">
            <q-item clickable v-close-popup :to="profileRoute">
              <q-item-section avatar><q-icon name="person" /></q-item-section>
              <q-item-section>Mi Perfil</q-item-section>
            </q-item>
            <q-separator />
            <q-item clickable v-close-popup class="text-negative" @click="handleLogout">
              <q-item-section avatar><q-icon name="logout" /></q-item-section>
              <q-item-section>Cerrar Sesión</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      class="bg-white"
    >
      <div class="q-pa-md text-center bg-primary text-white">
        <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Sena_Colombia_logo.svg" 
             style="height: 60px; filter: brightness(0) invert(1);" 
             alt="Logo SENA" 
             class="q-mb-md" />
        <div class="text-weight-bold">{{ authStore.user?.fullName }}</div>
        <div class="text-caption text-grey-4">{{ roleLabel }}</div>
      </div>

      <q-scroll-area class="fit" style="height: calc(100% - 150px); margin-top: 10px;">
        <q-list padding>
          <!-- COMMON -->
          <q-item clickable v-ripple to="/" exact>
            <q-item-section avatar><q-icon name="dashboard" /></q-item-section>
            <q-item-section>Panel</q-item-section>
          </q-item>

          <!-- APPRENTICE MENU -->
          <template v-if="authStore.isApprentice">
            <q-item clickable v-ripple to="/notificaciones">
              <q-item-section avatar><q-icon name="notifications" /></q-item-section>
              <q-item-section>Notificaciones</q-item-section>
              <q-item-section side>
                <q-badge v-if="unreadCount > 0" color="red" rounded floating>{{ unreadCount > 9 ? '9+' : unreadCount }}</q-badge>
              </q-item-section>
            </q-item>
            <q-separator />
            <!-- Only show EP menu items after registering a productive stage -->
            <template v-if="showEpMenu">
              <q-item-label header>Mi Etapa Productiva</q-item-label>
              <q-item clickable v-ripple to="/bitacoras">
                <q-item-section avatar><q-icon name="history_edu" /></q-item-section>
                <q-item-section>Mis Bitácoras</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/seguimientos">
                <q-item-section avatar><q-icon name="co_present" /></q-item-section>
                <q-item-section>Mis Seguimientos</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/certification">
                <q-item-section avatar><q-icon name="workspace_premium" /></q-item-section>
                <q-item-section>Certificaci&oacute;n Final</q-item-section>
                <q-item-section side v-if="showCertBadge">
                  <q-badge :color="certBadgeColor" floating>{{ certBadgeLabel }}</q-badge>
                </q-item-section>
              </q-item>
              <q-separator />
            </template>
            <q-item clickable v-ripple to="/mi-perfil">
              <q-item-section avatar><q-icon name="person" /></q-item-section>
              <q-item-section>Mi Perfil</q-item-section>
            </q-item>
          </template>

          <!-- INSTRUCTOR MENU -->
          <template v-if="authStore.isInstructor && authStore.user?.status !== 'INACTIVE'">
            <q-item-label header>Modulos</q-item-label>
            <q-item clickable v-ripple to="/my-apprentices">
              <q-item-section avatar><q-icon name="group" /></q-item-section>
              <q-item-section>Lista de Aprendices</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/instructor/review-bitacoras">
              <q-item-section avatar><q-icon name="rule_folder" /></q-item-section>
              <q-item-section>Revisar Bitácoras</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/instructor/manage-trackings">
              <q-item-section avatar><q-icon name="co_present" /></q-item-section>
              <q-item-section>Seguimientos</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/instructor/report-novelties">
              <q-item-section avatar><q-icon name="report_problem" /></q-item-section>
              <q-item-section>Novedades</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/instructor-hours">
              <q-item-section avatar><q-icon name="schedule" /></q-item-section>
              <q-item-section>Horas Instructor</q-item-section>
            </q-item>
          </template>

          <!-- ADMIN MENU -->
          <template v-if="authStore.isAdmin">
            <q-item-label header>Administración</q-item-label>
            <q-item clickable v-ripple to="/users">
              <q-item-section avatar><q-icon name="manage_accounts" /></q-item-section>
              <q-item-section>Usuarios</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/companies">
              <q-item-section avatar><q-icon name="business" /></q-item-section>
              <q-item-section>Empresas</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/approvals">
              <q-item-section avatar><q-icon name="how_to_reg" /></q-item-section>
              <q-item-section>Aprobaciones</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/novelties">
              <q-item-section avatar><q-icon name="gavel" /></q-item-section>
              <q-item-section>Novedades</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/extraordinary-trackings">
              <q-item-section avatar><q-icon name="emergency" /></q-item-section>
              <q-item-section>Seg. Extraordinarios</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/close-ep">
              <q-item-section avatar><q-icon name="task_alt" /></q-item-section>
              <q-item-section>Cierre de Etapa</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/reports">
              <q-item-section avatar><q-icon name="bar_chart" /></q-item-section>
              <q-item-section>Reportes (Panel)</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/hour-validation">
              <q-item-section avatar><q-icon name="verified" /></q-item-section>
              <q-item-section>Validar Horas</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/system-config">
              <q-item-section avatar><q-icon name="settings" /></q-item-section>
              <q-item-section>Configuración</q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- Not using q-page as requested, just a container -->
    <q-page-container>
      <!-- Banner for Inactive Users -->
      <div v-if="authStore.user?.status === 'INACTIVE' || authStore.user?.isActive === false" class="q-pa-md">
        <q-banner inline-actions rounded class="bg-red-1 text-negative border-negative">
          <template v-slot:avatar>
            <q-icon name="warning" color="negative" size="md" />
          </template>
          <div class="text-h6 q-mb-xs">Tu cuenta se encuentra Inactiva</div>
          <div>Has sido bloqueado temporalmente por un administrador del sistema. No podrás realizar gestiones, revisar bitácoras ni agregar seguimientos hasta nueva orden. Para más información comunícate con la coordinación.</div>
        </q-banner>
      </div>

      <div class="content-container" :class="{'q-pt-none': authStore.user?.status === 'INACTIVE'}">
        <router-view v-if="authStore.user?.status !== 'INACTIVE'" />
        <!-- Si está inactivo, ocultamos el router-view para que no vea dashboards y quede bloqueado -->
        <div v-else class="flex flex-center" style="height: 60vh;">
          <div class="text-center text-grey-6">
            <q-icon name="block" size="4rem" class="q-mb-md" />
            <div class="text-h6">Acceso Restringido</div>
          </div>
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import productiveStageService from '../api/productiveStage.service';
import documentService from '../api/document.service';
import notificationServiceApi from '../api/notification.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const authStore = useAuthStore();
const router = useRouter();
const leftDrawerOpen = ref(false);

const notificationDrawer = ref(false);
const notificationDropdown = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);
const loadingNotif = ref(false);
let notifInterval = null;

function formatNotifDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function fetchNotifications() {
  loadingNotif.value = true;
  try {
    const res = await notificationServiceApi.getNotifications({ limit: 20 });
    const body = res.data || res;
    notifications.value = body.notifications || body || [];
  } catch { /* silencioso */ }
  finally { loadingNotif.value = false; }
}

async function fetchUnreadCount() {
  try {
    const res = await notificationServiceApi.getUnreadCount();
    const body = res.data || res;
    unreadCount.value = body.unreadCount ?? 0;
  } catch { /* silencioso */ }
}

const notifRoutes = {
  EP_APPROVED: '/register-ep',
  EP_REJECTED: '/register-ep',
  EP_COMMENT_ADDED: '/register-ep',
  BITACORA_APPROVED: '/bitacoras',
  BITACORA_REJECTED: '/bitacoras',
  BITACORA_PENDING_REVIEW: '/bitacoras',
  BITACORA_REMINDER: '/bitacoras',
  TRACKING_REMINDER: '/seguimientos',
  EXTRAORDINARY_TRACKING_APPROVED: '/seguimientos',
  DOCUMENTS_APPROVED: '/certification',
  DOCUMENTS_REJECTED: '/certification',
  DOCUMENTS_REMINDER: '/certification',
  ENROLLMENT_EXPIRY_ALERT: '/',
  SYSTEM_WELCOME: '/mi-perfil',
};

async function markAsRead(n) {
  const wasUnread = !n.isRead;
  try {
    await notificationServiceApi.markAsRead(n._id);
    n.isRead = true;
    if (wasUnread) unreadCount.value = Math.max(0, unreadCount.value - 1);
  } catch { /* silencioso */ }
  const route = notifRoutes[n.type];
  if (route) router.push(route);
}

async function markAllAsRead() {
  try {
    await notificationServiceApi.markAllAsRead();
    notifications.value.forEach(n => n.isRead = true);
    unreadCount.value = 0;
  } catch { /* silencioso */ }
}

const certBadgeLabel = ref('');
const certBadgeColor = ref('negative');
const hasRegisteredEP = ref(false);

const showCertBadge = computed(() => {
  if (!authStore.isApprentice) return false;
  return certBadgeLabel.value !== '';
});

const showEpMenu = computed(() => {
  if (!authStore.isApprentice) return false;
  return hasRegisteredEP.value;
});

const roleLabel = computed(() => {
  const map = { ADMIN: 'Administrador', INSTRUCTOR: 'Instructor', APPRENTICE: 'Aprendiz' };
  return map[authStore.user?.role] || authStore.user?.role || '';
});

const profileRoute = computed(() => {
  if (authStore.isApprentice) return '/mi-perfil';
  return '/';
});

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

// Función ya no necesaria: el q-menu se abre solo al hacer click
// Se mantiene para compatibilidad
function openNotifications() {
  notificationDropdown.value = !notificationDropdown.value;
}

function markAsReadAndClose(n) {
  markAsRead(n);
  notificationDropdown.value = false;
}

function getNotifIcon(type) {
  const icons = {
    EP_APPROVED: 'check_circle',
    EP_REJECTED: 'cancel',
    EP_COMMENT_ADDED: 'comment',
    BITACORA_APPROVED: 'check_circle',
    BITACORA_REJECTED: 'cancel',
    BITACORA_PENDING_REVIEW: 'pending',
    BITACORA_REMINDER: 'alarm',
    TRACKING_REMINDER: 'alarm',
    EXTRAORDINARY_TRACKING_APPROVED: 'event_available',
    DOCUMENTS_APPROVED: 'verified',
    DOCUMENTS_REJECTED: 'cancel',
    DOCUMENTS_REMINDER: 'alarm',
    ENROLLMENT_EXPIRY_ALERT: 'warning',
    SYSTEM_WELCOME: 'waving_hand',
  };
  return icons[type] || 'notifications';
}

function getNotifIconClass(type) {
  if (!type) return 'notif-icon--info';
  if (type.includes('APPROVED') || type.includes('WELCOME')) return 'notif-icon--success';
  if (type.includes('REJECTED')) return 'notif-icon--danger';
  if (type.includes('REMINDER') || type.includes('ALERT')) return 'notif-icon--warning';
  if (type.includes('COMMENT') || type.includes('PENDING')) return 'notif-icon--info';
  return 'notif-icon--info';
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

async function checkCertNotification() {
  if (!authStore.isApprentice) return;
  try {
    const epRes = await productiveStageService.getMyEP();
    const epList = epRes.data?.eps || [];
    const ep = epList.length > 0 ? epList[0] : null;
    hasRegisteredEP.value = !!ep && ep.status !== 'PENDING_REGISTRATION';
    if (!ep || ep.status !== 'CERTIFICATION') return;

    const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
    const now = new Date();
    let deadlineClose = false;
    if (ep.estimatedEndDate) {
      const end = new Date(ep.estimatedEndDate);
      deadlineClose = end.getTime() - now.getTime() <= TWO_MONTHS_MS;
    }

    let hasRejected = false;
    let hasNoDoc = true;
    if (ep._id) {
      const statusRes = await documentService.getEPStatus(ep._id);
      const statusData = statusRes.data;
      if (statusData && statusData.submitted && statusData.submitted.length > 0) {
        hasNoDoc = false;
        hasRejected = statusData.submitted.some(d => d.status === 'REJECTED');
      }
    }

    if (hasRejected) {
      certBadgeLabel.value = '!';
      certBadgeColor.value = 'negative';
    } else if (hasNoDoc && deadlineClose) {
      certBadgeLabel.value = '!';
      certBadgeColor.value = 'warning';
    } else if (hasNoDoc) {
      certBadgeLabel.value = '!';
      certBadgeColor.value = 'orange';
    }
  } catch {
    // Silencioso
  }
}

onMounted(() => {
  checkCertNotification();
  fetchNotifications();
  fetchUnreadCount();
  notifInterval = setInterval(fetchUnreadCount, 30000);
});

onUnmounted(() => {
  if (notifInterval) clearInterval(notifInterval);
});
</script>

<style scoped>
.content-container {
  min-height: calc(100vh - 50px);
}

/* ─── Campana ─────────────────────────────────────────── */
.notif-bell-btn {
  transition: transform 0.15s ease;
}
.notif-bell-btn:hover {
  transform: scale(1.1);
}
.notif-badge {
  font-size: 10px;
  font-weight: 700;
}

/* ─── Panel Dropdown ──────────────────────────────────── */
.notif-panel {
  width: 380px;
  max-height: 520px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.16);
}

/* Header */
.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px 16px;
  background: #f8faf8;
}
.notif-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.notif-header-icon {
  color: #2e7d32;
}
.notif-header-title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 0.01em;
}
.notif-count-badge {
  font-size: 10px;
  font-weight: 700;
  border-radius: 20px;
  padding: 2px 6px;
}
.notif-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.notif-read-all-btn {
  background: transparent;
  border: 1px solid #2e7d32;
  color: #2e7d32;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  cursor: pointer;
  transition: all 0.18s;
}
.notif-read-all-btn:hover {
  background: #2e7d32;
  color: #fff;
}
.notif-close-btn {
  margin-left: 2px;
}

/* Loading */
.notif-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: #888;
  font-size: 13px;
}

/* Empty */
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  text-align: center;
}
.notif-empty-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #f0f4f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  color: #aaa;
}
.notif-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: #555;
  margin-bottom: 4px;
}
.notif-empty-sub {
  font-size: 12px;
  color: #aaa;
}

/* Lista */
.notif-list {
  overflow-y: auto;
  flex: 1;
  max-height: 420px;
}
.notif-list::-webkit-scrollbar {
  width: 4px;
}
.notif-list::-webkit-scrollbar-track {
  background: #f0f0f0;
}
.notif-list::-webkit-scrollbar-thumb {
  background: #c5c5c5;
  border-radius: 4px;
}

/* Item */
.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f2f2f2;
  transition: background 0.15s ease;
  position: relative;
}
.notif-item:last-child {
  border-bottom: none;
}
.notif-item:hover {
  background: #f4f9f4;
}
.notif-item--unread {
  background: #edf7ee;
}
.notif-item--unread:hover {
  background: #dff0e0;
}

/* Ícono de item */
.notif-item-icon-wrap {
  min-width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}
.notif-icon--success { background: #e8f5e9; color: #2e7d32; }
.notif-icon--danger  { background: #fdecea; color: #c62828; }
.notif-icon--warning { background: #fff8e1; color: #f57f17; }
.notif-icon--info    { background: #e3f2fd; color: #1565c0; }

/* Contenido del item */
.notif-item-body {
  flex: 1;
  min-width: 0;
}
.notif-item-title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.35;
  margin-bottom: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notif-item-msg {
  font-size: 12px;
  color: #555;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 4px;
}
.notif-item-time {
  font-size: 10px;
  color: #9e9e9e;
  display: flex;
  align-items: center;
  gap: 3px;
}

/* Dot de no leído */
.notif-item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2e7d32;
  margin-top: 6px;
  flex-shrink: 0;
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.8); }
}
</style>
