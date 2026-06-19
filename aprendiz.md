# REPFORA E.P. — Contexto del Proyecto

> Sistema de gestión de Etapas Productivas del SENA.  
> Rama: **DevJefferson** | Sin git (descarga directa).

---

## Arquitectura general

```
raíz/
├── backendRepfora/          # API REST — Node.js + Express + MongoDB (Mongoose)
├── usefrontend/usefrontend/ # SPA — Vue 3 + Quasar + Pinia + Vite
├── package.json             # Solo dependencia openai (no usada en el proyecto)
└── aprendiz.md              # Este archivo
```

---

## Backend (`backendRepfora/`)

### Stack
| Componente | Tecnología |
|------------|-----------|
| Runtime | Node.js (ES Modules) |
| Framework | Express 5 |
| Base de datos | MongoDB Atlas (Mongoose ODM) |
| Autenticación | JWT + bcryptjs |
| Email | Brevo API (Sendinblue) vía axios |
| Validación | express-validator |
| Archivos | multer (memoria) |
| Tareas programadas | node-cron (8 AM diario) |
| PDFs | pdfkit |
| CSV/XLSX | csv-parser + xlsx |
| Testing | Jest + Supertest |

### Estructura de `src/`
```
src/
├── config/          # db.js, env.js, seed.js, systemConfig.seed.js
├── controllers/     # 13 controladores (auth, users, companies, productiveStages, bitacoras, trackings, hours, documents, novelties, notifications, reports, systemConfig, dashboard)
├── jobs/            # alerts.job.js (cron diario)
├── middlewares/     # auth, role, upload, validate
├── models/          # 11 modelos (User, Company, ProductiveStage, Bitacora, Tracking, HourRecord, Document, Notification, AuditLog, SystemConfig, Novelty)
├── routes/          # 13 archivos de rutas
├── services/        # 13 servicios (lógica de negocio) + email.service.js
└── utils/           # auditLog, configHelper, dateHelper, enums, importParser, pdfGenerator, response
```

### Roles
- **ADMIN** — Administrador del sistema
- **INSTRUCTOR** — Instructor SENA (tipos: FOLLOWUP, TECHNICAL, PROJECT)
- **APPRENTICE** — Aprendiz SENA

### Modelos principales

| Modelo | Colección | Propósito |
|--------|-----------|-----------|
| User | users | Usuarios (admin, instructores, aprendices) |
| Company | companies | Empresas donde se hace la EP |
| ProductiveStage | productive_stages | **Núcleo**: etapa productiva del aprendiz |
| Bitacora | bitacoras | Bitácoras quincenales del aprendiz |
| Tracking | trackings | Sesiones de seguimiento del instructor |
| HourRecord | hour_records | Acumulado mensual de horas por instructor |
| Document | documents | Documentos de certificación |
| Notification | notifications | Notificaciones en plataforma + email |
| AuditLog | audit_logs | Trazabilidad inmutable de acciones |
| SystemConfig | system_configs | Parámetros configurables |
| Novelty | novelties | Novedades/incidentes críticos |

### Ciclo de vida de una Etapa Productiva (7 estados)
```
PENDING_REGISTRATION → PENDING_APPROVAL → ACTIVE → IN_FOLLOWUP → CERTIFICATION → COMPLETED → ARCHIVED
```

### Modalidades de EP
- `APPRENTICESHIP_CONTRACT` (Contrato de Aprendizaje)
- `LABOR_LINK` (Vínculo Laboral)
- `INTERNSHIP` (Pasantía)
- `INDIVIDUAL_PRODUCTIVE_PROJECT` (Proyecto Individual)
- `GROUP_PRODUCTIVE_PROJECT` (Proyecto Grupal)

### Autenticación
- Login con `nationalId` + `password` (no email)
- JWT (24h), bcrypt (salt 10)
- Primer login fuerza cambio de contraseña
- Bloqueo tras 5 intentos fallidos (2 min)
- Recuperación: token por email (Brevo), expira 24h

### Endpoints API principales
| Ruta | Descripción |
|------|-------------|
| `POST /api/auth/login` | Iniciar sesión |
| `GET /api/auth/me` | Perfil del usuario autenticado |
| `POST /api/auth/change-password-first` | Cambio de contraseña obligatorio |
| `POST /api/users/instructors` | Crear instructor (ADMIN) |
| `POST /api/users/apprentices` | Crear aprendiz (ADMIN) |
| `POST /api/users/apprentices/import` | Importar aprendices CSV/XLSX |
| `POST /api/productive-stages` | Registrar EP (APPRENTICE) |
| `PATCH /api/productive-stages/:id/approve` | Aprobar EP (ADMIN) |
| `PATCH /api/productive-stages/:id/assign-instructors` | Asignar instructores |
| `PATCH /api/productive-stages/:id/complete` | Completar EP (ADMIN) |
| `POST /api/bitacoras` | Subir bitácora (APPRENTICE) |
| `PATCH /api/bitacoras/:id/approve` | Aprobar bitácora (INSTRUCTOR) |
| `POST /api/trackings` | Programar seguimiento (INSTRUCTOR) |
| `PATCH /api/trackings/:id/execute` | Ejecutar seguimiento |
| `POST /api/documents` | Subir documento (APPRENTICE) |
| `PATCH /api/documents/:id/approve` | Aprobar documento (ADMIN) |
| `POST /api/novelties` | Reportar novedad (INSTRUCTOR) |
| `GET /api/notifications` | Listar notificaciones |
| `GET /api/notifications/unread-count` | Contador de no leídas |
| `GET /api/dashboard/:role` | Dashboard por rol |
| `GET /api/reports/ep-summary` | Reportes (ADMIN) |
| `GET /api/system-config` | Configuración del sistema (ADMIN) |

### Flujo de horas
- Auto-generado: nunca manual
- Orígenes: revisión bitácora (2h), seguimiento presencial/virtual (2h), extraordinario (2h), certificación (2h)
- Tope mensual: 160h configurable
- Excesos se registran aparte, se pueden trasladar al mes siguiente
- Pago requiere doble confirmación (`confirm: true`)

---

## Frontend (`usefrontend/usefrontend/`)

### Stack
| Componente | Tecnología |
|------------|-----------|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| UI Kit | Quasar Framework 2 |
| Estado | Pinia |
| Router | Vue Router 4 (History mode) |
| HTTP | Axios (instancia con interceptors JWT) |
| CSS | Sass/SCSS |
| Build | Vite 4 (dev: puerto 5174, proxy /api → localhost:3000) |
| Lenguaje | JavaScript (no TypeScript) |

### Estructura de `src/`
```
src/
├── main.js              # Bootstrap (Quasar, Pinia, Router)
├── App.vue              # <router-view />
├── router/index.js      # 19 rutas + guards de navegación
├── stores/
│   ├── auth.js          # user, token, login/logout, roles
│   └── ui.js            # drawer, notifications, loading
├── layouts/
│   └── MainLayout.vue   # Shell: header SENA, sidebar dinámico, router-view
├── pages/
│   ├── IndexPage.vue
│   ├── DashboardPage.vue        # Dashboard por rol (587 líneas)
│   ├── ErrorNotFound.vue
│   ├── auth/
│   │   ├── LoginPage.vue
│   │   └── ChangePasswordFirstLoginPage.vue
│   ├── apprentice/              # Rutas de aprendiz
│   │   ├── RegisterProductiveStagePage.vue  # Wizard 4 pasos (463 líneas)
│   │   ├── BitacorasPage.vue
│   │   ├── TrackingsPage.vue
│   │   ├── CertificationPage.vue
│   │   └── MiPerfil.vue
│   ├── instructor/              # Rutas de instructor
│   │   ├── MyApprenticesPage.vue
│   │   ├── ReviewBitacorasPage.vue
│   │   ├── ManageTrackingsPage.vue
│   │   ├── ReportNoveltiesPage.vue
│   │   └── HoursReportPage.vue
│   └── admin/                   # Rutas de admin
│       ├── UsersManagementPage.vue
│       ├── CompaniesPage.vue
│       ├── SystemConfigPage.vue
│       ├── ApprovalsPage.vue           # Bandeja de aprobación (432 líneas)
│       ├── AdminNoveltiesPage.vue
│       ├── ManageNoveltiesPage.vue
│       ├── CloseProductiveStagePage.vue
│       └── ReportsDashboardPage.vue
├── api/                   # 13 servicios HTTP (axios)
├── composables/           # Placeholders vacíos (useAuth, useUI)
├── utils/                 # Placeholders vacíos (formatters, validators)
└── css/
    ├── app.scss           # Estilos globales, variables CSS
    └── quasar-variables.scss  # Tema SENA (verde #318335, azul #00324D, naranja #FF6B00)
```

### Rutas del frontend

#### Públicas
| Ruta | Componente |
|------|-----------|
| `/login` | LoginPage |
| `/change-password` | ChangePasswordFirstLoginPage |

#### Aprendiz
| Ruta | Componente |
|------|-----------|
| `/` | DashboardPage |
| `/register-ep` | RegisterProductiveStagePage |
| `/bitacoras` | BitacorasPage |
| `/trackings` | TrackingsPage |
| `/certification` | CertificationPage |
| `/mi-perfil` | MiPerfil |

#### Instructor
| Ruta | Componente |
|------|-----------|
| `/my-apprentices` | MyApprenticesPage |
| `/instructor/review-bitacoras` | ReviewBitacorasPage |
| `/instructor/manage-trackings` | ManageTrackingsPage |
| `/instructor/report-novelties` | ReportNoveltiesPage |
| `/instructor-hours` | HoursReportPage |

#### Admin
| Ruta | Componente |
|------|-----------|
| `/users` | UsersManagementPage |
| `/companies` | CompaniesPage |
| `/system-config` | SystemConfigPage |
| `/admin/approvals` | ApprovalsPage |
| `/admin/novelties` | AdminNoveltiesPage |
| `/admin/close-ep` | CloseProductiveStagePage |
| `/admin/reports` | ReportsDashboardPage |

### Guards de navegación
1. Rutas `guestOnly` → redirigen a dashboard si ya autenticado
2. Rutas `requiresAuth` → redirigen a login si no autenticado
3. Rutas con `role` → redirigen a dashboard si el rol no coincide

### Stores (Pinia)
- **auth**: `user`, `token`, `loading`, `error` | getters: `isAdmin`, `isInstructor`, `isApprentice`, `mustChangePassword` | acciones: `login()`, `logout()`, `fetchProfile()`, `changePasswordFirstLogin()`
- **ui**: `leftDrawerOpen`, `notifications[]`, `loadingOverlay`, `theme`

### Servicios API
13 archivos en `src/api/`: auth, bitacora, company, dashboard, document, hours, notification, novelty, productiveStage, report, systemConfig, tracking, user.

Todos usan la instancia axios de `api/index.js` que:
- Base URL: `import.meta.env.VITE_API_URL || '/api'`
- Timeout: 15s
- Adjunta token JWT en header `Authorization: Bearer <token>`
- Interceptor de respuesta: desenvuelve `response.data`, limpia auth en 401

---

## Especificaciones (specs)

12 documentos en `backendRepfora/`:

| # | Archivo | Módulo |
|---|---------|--------|
| 1 | spec_auth.md | Autenticación (login, JWT, recuperación, first-login) |
| 2 | spec_systemConfig.md | Parámetros configurables del sistema |
| 3 | spec_users.md | Gestión de usuarios (instructores, aprendices, importación) |
| 4 | spec_companies.md | Gestión de empresas y contactos |
| 5 | spec_productiveStages.md | **Núcleo**: ciclo de vida EP, transiciones, asignación |
| 6 | spec_bitacoras.md | Bitácoras: envío, revisión, horas |
| 7 | spec_trakings.md | Seguimientos: programación, ejecución, firmas |
| 8 | spec_hours.md | Acumulación de horas, pagos, reportes |
| 9 | spec_documents.md | Documentos de certificación |
| 10 | spec_novelties.md | Novedades e incidentes |
| 11 | spec_notifications.md | Notificaciones (in-app + email Brevo) |
| 12 | spec_reports.md | Reportes y exportación PDF |

### Documentos clave adicionales
- `Data_Model.md` — Modelo de datos completo (Mongoose schemas, enums, reglas de integridad) — **prevalece sobre specs**
- `Gemini.md` — Notas de integración IA (no implementada aún)

---

## Flujos principales

### 1. Registro de Etapa Productiva (Aprendiz)
1. Aprendiz llena wizard 4 pasos: modalidad, documentos, empresa, confirmación
2. EP se crea con status `PENDING_APPROVAL`
3. Admin revisa en ApprovalsPage → aprueba/rechaza + asigna instructores
4. EP pasa a `ACTIVE` → se notifica al aprendiz e instructores

### 2. Ciclo de bitácoras
1. Aprendiz sube PDF de bitácora → status `PENDING`
2. Instructor revisa → `APPROVED` o `REJECTED`
3. Si aprobada: +horas a HourRecord, +completedBitacoras, posible avance de estado EP
4. Si rechazada: aprendiz puede re-subir

### 3. Ciclo de seguimientos
1. Instructor programa seguimiento (ordinario o extraordinario)
2. Sube PDF firmado + valida firmas
3. Ejecuta: +horas, +completedTrackings
4. Marca como pagado (bloquea el registro)

### 4. Certificación
1. EP debe estar en `CERTIFICATION` (todas bitácoras y seguimientos completados)
2. Aprendiz sube 3 documentos requeridos (EP_CERTIFICATE, PERFORMANCE_EVALUATION, COMMITMENT_LETTER)
3. Admin aprueba cada documento
4. Cuando todos están aprobados: EP → `COMPLETED`

### 5. Novedades
1. Instructor reporta incidencia (deserción, disciplinario, cambio condiciones, otro)
2. Admin recibe notificación prioritaria + PDF auto-generado
3. Admin gestiona: `PENDING` → `IN_PROGRESS` → `RESOLVED`
4. Novedades sin resolver bloquean completar EP

### 6. Horas instructor
- Auto-acumuladas por cada actividad aprobada
- HourRecord mensual por instructor
- Admin puede marcar horas como pagadas
- Excesos trasladables al mes siguiente
- Reporte PDF mensual disponible

---

## Notas técnicas

- **Denormalización intencional**: `apprentice` e `instructor` en Bitacora, Tracking, Document y Novelty están duplicados de ProductiveStage para evitar doble populate.
- **Soft delete**: User, Company, ProductiveStage, Bitacora, Tracking, Document, Novelty usan `isActive: false`. Solo AuditLog es inmutable e imborrable.
- **First login**: forzado por middleware `auth.middleware.js` verificando flag `firstLogin` del usuario.
- **Google Drive**: campos `driveFileId` y `driveFileUrl` en todos los modelos que manejan archivos. La integración con Google Drive API está referenciada pero no se encontró el SDK importado.
- **Sin IA generativa**: El `package.json` raíz tiene `openai` pero no hay integración en backend ni frontend.
- **Composables vacíos**: `useAuth.js`, `useUI.js`, `formatters.js`, `validators.js` son placeholders.
- **Manejo inconsistente de respuestas API**: Algunos componentes usan `res.data.data`, otros `res.data?.data?.eps`. A mejorar.
