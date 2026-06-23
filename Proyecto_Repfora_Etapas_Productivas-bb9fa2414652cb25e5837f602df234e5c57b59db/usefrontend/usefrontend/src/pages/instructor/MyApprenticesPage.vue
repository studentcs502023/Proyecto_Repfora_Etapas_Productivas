<template>
  <div class="apprentices-container q-pa-md">

    <!-- Premium Header -->
    <div class="page-header q-mb-xl shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content text-white">
        <div class="row items-center justify-between">
          <div>
            <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
              <q-icon name="group" class="q-mr-sm" size="md"/>Lista de Aprendices
            </h2>
            <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">
              Aprendices asignados bajo tu supervisión y sus etapas productivas.
            </p>
          </div>
          <div class="header-stat text-center q-pa-md glass-stat">
            <div class="text-h3 text-weight-bolder">{{ eps.length }}</div>
            <div class="text-caption text-weight-medium opacity-80">ASIGNADOS</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Barra de búsqueda -->
    <q-card flat class="search-card q-mb-lg">
      <q-card-section class="q-pa-md">
        <q-input
          v-model="filter"
          dense
          outlined
          placeholder="Buscar por nombre o ficha..."
          color="primary"
          class="search-input"
          clearable
        >
          <template v-slot:prepend>
            <q-icon name="search" color="primary" />
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <!-- Tabla Premium -->
    <q-card flat class="table-card">
      <q-table
        :rows="filteredEps"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        :pagination="{ rowsPerPage: 15 }"
        class="custom-table"
        table-header-class="custom-table-header"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>

        <template v-slot:body-cell-nombre="props">
          <q-td :props="props">
            <div class="row items-center no-wrap">
              <q-avatar size="36px" color="primary" text-color="white" class="q-mr-sm avatar-initial">
                {{ props.row.apprentice?.fullName?.charAt(0) || '?' }}
              </q-avatar>
              <span class="text-weight-bold">{{ props.row.apprentice?.fullName || 'N/D' }}</span>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-programa="props">
          <q-td :props="props">
            <span class="text-primary text-weight-medium">{{ props.row.apprentice?.program || 'N/D' }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-ficha="props">
          <q-td :props="props">
            <span class="ficha-badge">{{ props.row.apprentice?.enrollmentNumber || 'N/D' }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-modalidad="props">
          <q-td :props="props">
            <q-chip dense size="sm" :color="getModalityColor(props.row.modality)" text-color="white" class="text-weight-medium">
              {{ getModalityLabel(props.row.modality) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-fechaAsignacion="props">
          <q-td :props="props">
            <div class="text-weight-medium">{{ formatDate(props.row.approvalDate || props.row.registrationDate) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-empresa="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.companySnapshot?.companyName || 'Sin Empresa' }}</div>
            <div class="text-caption text-grey-6">{{ props.row.companySnapshot?.supervisorName || '' }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-acciones="props">
          <q-td :props="props" class="text-center">
            <q-btn
              size="sm"
              color="primary"
              outline
              label="Ver Progreso"
              icon="visibility"
              @click="viewProgress(props.row)"
              class="action-btn"
              rounded
            />
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width column flex-center text-grey q-pa-xl">
            <q-icon name="group_off" size="5em" color="grey-4" class="q-mb-md" />
            <div class="text-h6 text-grey-6">No hay aprendices asignados</div>
            <div class="text-caption text-grey-5">Los aprendices aparecerán aquí cuando sean asignados.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal Progreso Mejorado -->
    <q-dialog v-model="showProgressModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="selectedEp" class="column modal-card">
        <!-- Header del Modal -->
        <div class="modal-header">
          <div class="cover-overlay-sm"></div>
          <div class="row items-center q-pa-lg text-white" style="position:relative;z-index:1">
            <q-avatar size="48px" color="white" text-color="primary" class="q-mr-md text-weight-bolder" style="font-size:20px">
              {{ selectedEp.apprentice?.fullName?.charAt(0) || '?' }}
            </q-avatar>
            <div class="col">
              <div class="text-h5 text-weight-bolder">{{ selectedEp.apprentice?.fullName }}</div>
              <div class="text-caption opacity-80">{{ selectedEp.apprentice?.program }} · Ficha {{ selectedEp.apprentice?.enrollmentNumber }}</div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup color="white">
              <q-tooltip>Cerrar</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-card-section class="col scroll q-pa-lg bg-grey-1">
          <div class="row q-col-gutter-lg">

            <!-- Info General -->
            <div class="col-12 col-md-4">
              <q-card flat class="info-card q-mb-md">
                <q-card-section>
                  <div class="text-subtitle1 text-primary text-weight-bold q-mb-md">
                    <q-icon name="info" class="q-mr-xs" />Información General
                  </div>
                  <div class="info-row">
                    <span class="info-label">Empresa</span>
                    <span class="info-value">{{ selectedEp.companySnapshot?.companyName || 'N/D' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Supervisor</span>
                    <span class="info-value">{{ selectedEp.companySnapshot?.supervisorName || 'N/D' }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Modalidad</span>
                    <q-chip dense size="sm" :color="getModalityColor(selectedEp.modality)" text-color="white">
                      {{ getModalityLabel(selectedEp.modality) }}
                    </q-chip>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Fecha Asignación</span>
                    <span class="info-value">{{ formatDate(selectedEp.approvalDate || selectedEp.registrationDate) }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Estado EP</span>
                    <q-chip dense size="sm" :color="getStatusColor(selectedEp.status)" text-color="white">
                      {{ getStatusLabel(selectedEp.status) }}
                    </q-chip>
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <!-- Acciones Rápidas -->
            <div class="col-12 col-md-8">
              <div class="text-h5 text-weight-bold text-dark q-mb-md">Gestión Rápida</div>
              <div class="row q-col-gutter-md">

                <div class="col-12 col-sm-6">
                  <q-card flat class="quick-action-card cursor-pointer" @click="$router.push('/instructor/review-bitacoras')">
                    <q-card-section class="text-center q-pa-lg">
                      <div class="action-icon-wrap bg-primary-light">
                        <q-icon name="rule_folder" size="2.5em" color="primary" />
                      </div>
                      <div class="text-h6 text-weight-bold q-mt-md">Revisar Bitácoras</div>
                      <div class="text-caption text-grey-6 q-mt-xs">Evaluar entregas pendientes</div>
                    </q-card-section>
                    <div class="action-bar bg-primary"></div>
                  </q-card>
                </div>

                <div class="col-12 col-sm-6">
                  <q-card flat class="quick-action-card cursor-pointer" @click="$router.push('/instructor/manage-trackings')">
                    <q-card-section class="text-center q-pa-lg">
                      <div class="action-icon-wrap bg-secondary-light">
                        <q-icon name="co_present" size="2.5em" color="secondary" />
                      </div>
                      <div class="text-h6 text-weight-bold q-mt-md">Seguimientos</div>
                      <div class="text-caption text-grey-6 q-mt-xs">Programar o ejecutar seguimientos</div>
                    </q-card-section>
                    <div class="action-bar bg-secondary"></div>
                  </q-card>
                </div>

                <div class="col-12 col-sm-6">
                  <q-card flat class="quick-action-card cursor-pointer" @click="$router.push('/instructor/report-novelties')">
                    <q-card-section class="text-center q-pa-lg">
                      <div class="action-icon-wrap bg-negative-light">
                        <q-icon name="report_problem" size="2.5em" color="negative" />
                      </div>
                      <div class="text-h6 text-weight-bold q-mt-md">Novedades</div>
                      <div class="text-caption text-grey-6 q-mt-xs">Reportar incidente a coordinación</div>
                    </q-card-section>
                    <div class="action-bar bg-negative"></div>
                  </q-card>
                </div>

                <div class="col-12 col-sm-6">
                  <q-card flat class="quick-action-card cursor-pointer" @click="$router.push('/instructor-hours')">
                    <q-card-section class="text-center q-pa-lg">
                      <div class="action-icon-wrap bg-warning-light">
                        <q-icon name="schedule" size="2.5em" color="warning" />
                      </div>
                      <div class="text-h6 text-weight-bold q-mt-md">Horas Instructor</div>
                      <div class="text-caption text-grey-6 q-mt-xs">Registro de horas de seguimiento</div>
                    </q-card-section>
                    <div class="action-bar bg-warning"></div>
                  </q-card>
                </div>

              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue';
import productiveStageService from '../../api/productiveStage.service';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

const $q = useQuasar();
const router = useRouter();

const eps = ref([]);
const loading = ref(false);
const filter = ref('');

const showProgressModal = ref(false);
const selectedEp = ref(null);

const columns = [
  { name: 'nombre', label: 'Nombre', field: 'apprentice', align: 'left', sortable: true },
  { name: 'programa', label: 'Programa', field: 'apprentice', align: 'left', sortable: true },
  { name: 'ficha', label: 'Ficha', field: 'apprentice', align: 'left', sortable: true },
  { name: 'modalidad', label: 'Modalidad', field: 'modality', align: 'left', sortable: true },
  { name: 'fechaAsignacion', label: 'Fecha Asignacion', field: 'approvalDate', align: 'left', sortable: true },
  { name: 'empresa', label: 'Empresa', field: 'company', align: 'left' },
  { name: 'acciones', label: 'Acciones', align: 'center' }
];

let pollInterval = null;

function onVisibilityChange() {
  if (document.visibilityState === 'visible') fetchApprentices();
}

onMounted(() => {
  fetchApprentices();
  pollInterval = setInterval(fetchApprentices, 30000);
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});

onActivated(() => { fetchApprentices(); });

async function fetchApprentices() {
  loading.value = true;
  try {
    const body = await productiveStageService.getAllEPs({ limit: 100 });
    eps.value = body.data?.eps || body.data || [];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar aprendices.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

const filteredEps = computed(() => {
  if (!filter.value) return eps.value;
  const q = filter.value.toLowerCase();
  return eps.value.filter(ep =>
    ep.apprentice?.fullName?.toLowerCase().includes(q) ||
    ep.apprentice?.enrollmentNumber?.toLowerCase().includes(q)
  );
});

function getModalityLabel(val) {
  const map = {
    'APPRENTICESHIP_CONTRACT': 'Contrato Aprendizaje',
    'LABOR_LINK': 'Vínculo Laboral',
    'INTERNSHIP': 'Pasantía',
    'INDIVIDUAL_PRODUCTIVE_PROJECT': 'Proyecto Individual',
    'GROUP_PRODUCTIVE_PROJECT': 'Proyecto Grupal'
  };
  return map[val] || val;
}

function getModalityColor(val) {
  const map = {
    'APPRENTICESHIP_CONTRACT': 'primary',
    'LABOR_LINK': 'teal',
    'INTERNSHIP': 'purple',
    'INDIVIDUAL_PRODUCTIVE_PROJECT': 'deep-orange',
    'GROUP_PRODUCTIVE_PROJECT': 'indigo'
  };
  return map[val] || 'grey';
}

function getStatusColor(status) {
  const map = {
    'PENDING_REGISTRATION': 'grey',
    'PENDING_APPROVAL': 'orange',
    'ACTIVE': 'info',
    'IN_FOLLOWUP': 'primary',
    'CERTIFICATION': 'secondary',
    'COMPLETED': 'positive',
    'ARCHIVED': 'dark'
  };
  return map[status] || 'grey';
}

function getStatusLabel(status) {
  const map = {
    'PENDING_REGISTRATION': 'Sin Registro',
    'PENDING_APPROVAL': 'Pendiente Admin',
    'ACTIVE': 'Activa',
    'IN_FOLLOWUP': 'En Seguimiento',
    'CERTIFICATION': 'Certificación',
    'COMPLETED': 'Completada',
    'ARCHIVED': 'Archivada'
  };
  return map[status] || status;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/D';
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function viewProgress(ep) {
  selectedEp.value = ep;
  showProgressModal.value = true;
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.apprentices-container {
  max-width: 1200px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Header ─────────────────────────────────────── */
.page-header {
  background: linear-gradient(135deg, #093028 0%, #237A57 100%);
  border-radius: 20px;
  padding: 28px 32px;
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
.header-content { position: relative; z-index: 1; }
.shadow-text { text-shadow: 2px 2px 8px rgba(0,0,0,0.4); }
.opacity-80 { opacity: 0.8; }

.glass-stat {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.25);
  border-radius: 16px;
  min-width: 100px;
}

/* ─── Search Card ─────────────────────────────────── */
.search-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05) !important;
}

/* ─── Table Card ──────────────────────────────────── */
.table-card {
  border-radius: 20px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  overflow: hidden;
}

.custom-table :deep(.q-table__container) { background: transparent; }
.custom-table :deep(th) {
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 2px solid rgba(0,0,0,0.05);
}
.custom-table :deep(tbody tr) {
  transition: all 0.2s ease;
}
.custom-table :deep(tbody tr:hover) {
  background-color: #f0fdf4 !important;
  transform: scale(1.001);
}
.custom-table :deep(td) {
  border-bottom: 1px solid rgba(0,0,0,0.04);
  padding-top: 12px;
  padding-bottom: 12px;
}

.avatar-initial {
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}

.ficha-badge {
  display: inline-block;
  padding: 2px 10px;
  background: #f0fdf4;
  color: #166534;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #bbf7d0;
}

.action-btn {
  transition: all 0.2s ease;
}
.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46,125,50,0.3) !important;
}

/* ─── Modal ───────────────────────────────────────── */
.modal-card { border-radius: 0; }

.modal-header {
  background: linear-gradient(135deg, #093028 0%, #237A57 100%);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.cover-overlay-sm {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0);
  background-size: 18px 18px;
}

/* Info Card */
.info-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.07);
  background: white;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06) !important;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  gap: 8px;
}
.info-row:last-child { border-bottom: none; }
.info-label {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}
.info-value {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  text-align: right;
}

/* Quick Action Cards */
.quick-action-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.07) !important;
  background: white;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05) !important;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}
.quick-action-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.12) !important;
}
.action-bar {
  height: 4px;
  width: 100%;
}
.action-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.bg-primary-light   { background: rgba(46,125,50,0.1); }
.bg-secondary-light { background: rgba(57,169,0,0.1); }
.bg-negative-light  { background: rgba(198,40,40,0.1); }
.bg-warning-light   { background: rgba(245,127,23,0.1); }
</style>
