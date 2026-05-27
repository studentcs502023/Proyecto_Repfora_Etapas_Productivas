import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  // --- PUBLIC ROUTES ---
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/auth/LoginPage.vue'),
    meta: { public: true, guestOnly: true }
  },

  // --- MANDATORY ACTION ROUTES ---
  {
    path: '/change-password',
    name: 'change-password',
    component: () => import('../pages/auth/ChangePasswordFirstLoginPage.vue'),
    meta: { requiresAuth: true, forcePasswordChange: true }
  },

  // --- PROTECTED ROUTES (MAIN LAYOUT) ---
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('../pages/DashboardPage.vue')
      },

      // APPRENTICE ROUTES
      {
        path: 'register-ep',
        name: 'register-ep',
        component: () => import('../pages/apprentice/RegisterProductiveStagePage.vue'),
        meta: { role: 'APPRENTICE' }
      },
      {
        path: 'bitacoras',
        name: 'my-bitacoras',
        component: () => import('../pages/apprentice/BitacorasPage.vue'),
        meta: { role: 'APPRENTICE' }
      },
      {
        path: 'trackings',
        name: 'my-trackings',
        component: () => import('../pages/apprentice/TrackingsPage.vue'),
        meta: { role: 'APPRENTICE' }
      },
      {
        path: 'certification',
        name: 'certification',
        component: () => import('../pages/apprentice/CertificationPage.vue'),
        meta: { role: 'APPRENTICE' }
      },
      {
        path: 'mi-perfil',
        name: 'mi-perfil',
        component: () => import('../pages/apprentice/MiPerfil.vue'),
        meta: { role: 'APPRENTICE' }
      },

      // INSTRUCTOR ROUTES
      {
        path: 'my-apprentices',
        name: 'my-apprentices',
        component: () => import('../pages/instructor/MyApprenticesPage.vue'),
        meta: { role: 'INSTRUCTOR' }
      },
      {
        path: 'instructor/review-bitacoras',
        name: 'review-bitacoras',
        component: () => import('../pages/instructor/ReviewBitacorasPage.vue'),
        meta: { role: 'INSTRUCTOR' }
      },
      {
        path: 'instructor/manage-trackings',
        name: 'manage-trackings',
        component: () => import('../pages/instructor/ManageTrackingsPage.vue'),
        meta: { role: 'INSTRUCTOR' }
      },
      {
        path: 'instructor/report-novelties',
        name: 'report-novelties',
        component: () => import('../pages/instructor/ReportNoveltiesPage.vue'),
        meta: { role: 'INSTRUCTOR' }
      },
      {
        path: 'instructor-hours',
        name: 'instructor-hours',
        component: () => import('../pages/instructor/HoursReportPage.vue'),
        meta: { role: 'INSTRUCTOR' }
      },

      // ADMIN ROUTES
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('../pages/admin/UsersManagementPage.vue'),
        meta: { role: 'ADMIN' }
      },
      {
        path: 'companies',
        name: 'admin-companies',
        component: () => import('../pages/admin/CompaniesPage.vue'),
        meta: { role: 'ADMIN' }
      },
      {
        path: 'system-config',
        name: 'admin-config',
        component: () => import('../pages/admin/SystemConfigPage.vue'),
        meta: { role: 'ADMIN' }
      },
      {
        path: 'admin/approvals',
        name: 'admin-approvals',
        component: () => import('../pages/admin/ApprovalsPage.vue'),
        meta: { role: 'ADMIN' }
      },
      {
        path: 'admin/novelties',
        name: 'admin-novelties',
        component: () => import('../pages/admin/AdminNoveltiesPage.vue'),
        meta: { role: 'ADMIN' }
      },
      {
        path: 'admin/close-ep',
        name: 'admin-close-ep',
        component: () => import('../pages/admin/CloseProductiveStagePage.vue'),
        meta: { role: 'ADMIN' }
      },
      {
        path: 'admin/reports',
        name: 'admin-reports',
        component: () => import('../pages/admin/ReportsDashboardPage.vue'),
        meta: { role: 'ADMIN' }
      },

      // SHARED PROTECTED ROUTES
      // (profile removed - use role-specific profile pages)
    ]
  },

  // --- ERROR 404 ---
  {
    path: '/:catchAll(.*)*',
    component: () => import('../pages/ErrorNotFound.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// --- NAVIGATION GUARDS ---
router.beforeEach(async (to, from, next) => {
  console.log(`Navegando a: ${to.path}`);
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;
  console.log(`¿Autenticado?: ${isAuthenticated}`);

  // 1. Handle Guest Only routes (like Login)
  if (to.meta.guestOnly && isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  // 2. Handle routes requiring Authentication
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'login' });
  }

  // 3. Handle Mandatory Password Change (firstLogin)
  // if (isAuthenticated && authStore.mustChangePassword && to.name !== 'change-password') {
  //   return next({ name: 'change-password' });
  // }

  // 4. Prevent accessing Change Password if it's not needed anymore
  // if (to.name === 'change-password' && isAuthenticated && !authStore.mustChangePassword) {
  //   return next({ name: 'dashboard' });
  // }

  // 5. Handle Role-based access control
  if (to.meta.role && authStore.user?.role !== to.meta.role) {
    console.warn(`Acceso denegado: Se requiere rol ${to.meta.role}`);
    return next({ name: 'dashboard' });
  }

  next();
});

export default router;
