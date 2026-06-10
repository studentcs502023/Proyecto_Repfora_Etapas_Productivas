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

        <!-- Notification Bell -->
        <q-btn flat round dense class="q-mr-sm" @click="openNotifications">
          <q-icon name="notifications" />
          <q-badge v-if="unreadCount > 0" color="red" floating>{{ unreadCount > 9 ? '9+' : unreadCount }}</q-badge>
          <q-tooltip>Notificaciones</q-tooltip>
        </q-btn>

        <!-- Notification Drawer -->
        <q-drawer v-model="notificationDrawer" side="right" bordered :width="360" :breakpoint="500" class="bg-white">
          <div class="q-pa-md">
            <div class="row items-center q-mb-sm">
              <div class="text-h6 text-black">Notificaciones</div>
              <q-space />
              <q-btn v-if="unreadCount > 0" flat dense color="primary" size="sm" label="Leer todas" @click="markAllAsRead" />
              <q-btn flat dense icon="close" round v-close-popup />
            </div>
            <q-separator class="q-mb-sm" />
            <div v-if="loadingNotif" class="text-center q-pa-lg">
              <q-spinner color="primary" size="2em" />
            </div>
            <div v-else-if="notifications.length === 0" class="text-center text-grey q-pa-lg">
              <q-icon name="notifications_off" size="2em" class="q-mb-sm" />
              <div>No tienes notificaciones</div>
            </div>
            <q-list v-else separator>
              <q-item v-for="n in notifications" :key="n._id" clickable :class="n.isRead ? '' : 'bg-blue-1'" @click="markAsRead(n)">
                <q-item-section>
                  <q-item-label class="text-weight-bold">{{ n.title }}</q-item-label>
                  <q-item-label caption>{{ n.message }}</q-item-label>
                  <q-item-label caption class="text-caption text-grey-6">{{ formatNotifDate(n.createdAt) }}</q-item-label>
                </q-item-section>
                <q-item-section v-if="!n.isRead" side>
                  <q-badge color="primary" rounded />
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-drawer>

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
            <!-- Only show EP menu items after registering a productive stage -->
            <template v-if="showEpMenu">
              <q-item-label header>Mi Etapa Productiva</q-item-label>
              <q-item clickable v-ripple to="/bitacoras">
                <q-item-section avatar><q-icon name="history_edu" /></q-item-section>
                <q-item-section>Mis Bitácoras</q-item-section>
              </q-item>
              <q-item clickable v-ripple to="/trackings">
                <q-item-section avatar><q-icon name="video_camera_front" /></q-item-section>
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
          <template v-if="authStore.isInstructor">
            <q-item-label header>Gestión de Aprendices</q-item-label>
            <q-item clickable v-ripple to="/my-apprentices">
              <q-item-section avatar><q-icon name="group" /></q-item-section>
              <q-item-section>Mis Aprendices</q-item-section>
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
            <q-item clickable v-ripple to="/admin/close-ep">
              <q-item-section avatar><q-icon name="task_alt" /></q-item-section>
              <q-item-section>Cierre de Etapa</q-item-section>
            </q-item>
            <q-item clickable v-ripple to="/admin/reports">
              <q-item-section avatar><q-icon name="bar_chart" /></q-item-section>
              <q-item-section>Reportes (Panel)</q-item-section>
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
      <div class="content-container">
        <router-view />
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

function openNotifications() {
  const unread = unreadCount.value;
  if (unread > 0) {
    const latest = notifications.value.find(n => !n.isRead);
    $q.notify({
      icon: 'notifications',
      color: 'primary',
      message: latest
        ? `${unread} notificación(es) — ${latest.title}`
        : `${unread} notificación(es) sin leer`,
      position: 'top-right',
      timeout: 3000,
      actions: [{ icon: 'close', color: 'white', round: true, dense: true }]
    });
  } else {
    $q.notify({
      icon: 'notifications_off',
      color: 'grey-7',
      message: 'No tienes notificaciones nuevas',
      position: 'top-right',
      timeout: 2000
    });
  }
  notificationDrawer.value = !notificationDrawer.value;
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
</style>
