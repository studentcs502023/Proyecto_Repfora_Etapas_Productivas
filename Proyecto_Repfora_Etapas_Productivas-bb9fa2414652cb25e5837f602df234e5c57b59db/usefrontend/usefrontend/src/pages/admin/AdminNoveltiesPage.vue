<template>
  <div class="admin-novelties-container q-pa-md">
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="gavel" class="q-mr-sm" size="md"/>Gestion de Novedades
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Dashboard de incidentes reportados por instructores.</p>
      </div>
    </div>

    <div v-if="loadingStats" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="4em" />
    </div>

    <template v-else>
      <div class="row q-col-gutter-lg q-mb-lg">
        <div class="col-12 col-sm-4 col-md-2">
          <q-card class="my-card kpi-card no-shadow text-center q-pa-sm">
            <q-card-section>
              <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Total Activas</div>
              <div class="text-h3 text-weight-bolder text-primary q-mt-xs">{{ stats.kpis?.totalActive || 0 }}</div>
              <q-icon name="gavel" size="sm" color="primary" class="opacity-60 q-mt-sm" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-card class="my-card kpi-card no-shadow text-center q-pa-sm">
            <q-card-section>
              <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Pendientes</div>
              <div class="text-h3 text-weight-bolder text-orange q-mt-xs">{{ stats.kpis?.pending || 0 }}</div>
              <q-icon name="hourglass_empty" size="sm" color="orange" class="opacity-60 q-mt-sm" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-card class="my-card kpi-card no-shadow text-center q-pa-sm">
            <q-card-section>
              <div class="text-caption text-uppercase text-grey-7 text-weight-bold">En Proceso</div>
              <div class="text-h3 text-weight-bolder text-info q-mt-xs">{{ stats.kpis?.inProgress || 0 }}</div>
              <q-icon name="autorenew" size="sm" color="info" class="opacity-60 q-mt-sm" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-card class="my-card kpi-card no-shadow text-center q-pa-sm">
            <q-card-section>
              <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Resueltas (Mes)</div>
              <div class="text-h3 text-weight-bolder text-positive q-mt-xs">{{ stats.kpis?.resolvedThisMonth || 0 }}</div>
              <q-icon name="check_circle" size="sm" color="positive" class="opacity-60 q-mt-sm" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-card class="my-card kpi-card no-shadow text-center q-pa-sm" :class="stats.kpis?.criticalUnattended > 0 ? 'bg-red-1' : ''">
            <q-card-section>
              <div class="text-caption text-uppercase text-grey-7 text-weight-bold" :class="stats.kpis?.criticalUnattended > 0 ? 'text-red-9' : ''">Críticas &gt;3d</div>
              <div class="text-h3 text-weight-bolder q-mt-xs" :class="stats.kpis?.criticalUnattended > 0 ? 'text-negative' : 'text-grey-5'">{{ stats.kpis?.criticalUnattended || 0 }}</div>
              <q-icon name="warning" size="sm" :color="stats.kpis?.criticalUnattended > 0 ? 'negative' : 'grey-5'" class="opacity-60 q-mt-sm" />
            </q-card-section>
          </q-card>
        </div>
        <div class="col-12 col-sm-4 col-md-2">
          <q-card class="my-card kpi-card no-shadow text-center q-pa-sm">
            <q-card-section>
              <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Prom. Resolución</div>
              <div class="text-h3 text-weight-bolder text-teal q-mt-xs">{{ stats.visualData?.avgResolutionHours || 0 }}h</div>
              <q-icon name="schedule" size="sm" color="teal" class="opacity-60 q-mt-sm" />
            </q-card-section>
          </q-card>
        </div>
      </div>

      <div v-if="stats.urgentAlerts?.length" class="q-mb-lg">
        <div class="text-h6 text-negative text-weight-bolder q-mb-sm flex items-center">
          <q-icon name="error" class="q-mr-sm" size="sm"/> Alertas Destacadas - Criticas sin Atender &gt;3 dias
        </div>
        <q-card flat class="my-card q-mb-md">
          <q-list separator>
            <q-item v-for="alert in stats.urgentAlerts" :key="alert._id" class="q-py-sm">
              <q-item-section avatar>
                <q-icon :color="alert.hoursElapsed > 72 ? 'negative' : 'orange'" :name="alert.hoursElapsed > 72 ? 'error' : 'warning'" size="sm" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold text-grey-9">{{ getTypeLabel(alert.type) }}</q-item-label>
                <q-item-label caption class="text-grey-7" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">{{ alert.description }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  color="primary"
                  label="Gestionar"
                  icon="settings"
                  size="sm"
                  rounded
                  unelevated
                  class="text-weight-bold"
                  @click="openUrgentNovelty(alert._id)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>


    </template>

    <q-dialog v-model="showManageModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="detailNovelty" class="column bg-grey-1">
        <q-card-section class="bg-primary text-white row items-center q-pa-md shadow-3 z-top">
          <q-icon name="gavel" size="sm" class="q-mr-sm" />
          <div class="text-h6 text-weight-bold">Revision de Novedad: {{ detailNovelty.apprentice?.fullName }}</div>
          <q-space />
          <q-chip :color="getSeverityColor(detailNovelty.severity)" text-color="white" class="text-weight-bold q-mr-sm" dense>
            {{ getSeverityLabel(detailNovelty.severity) }}
          </q-chip>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <div class="row q-col-gutter-md" style="max-width: 1500px; margin: 0 auto;">

            <!-- LEFT COLUMN: Info General + Reporte + Timeline + Historial -->
            <div class="col-12 col-md-7">

              <!-- 1. Informacion General -->
              <q-card class="my-card no-shadow q-mb-md">
                <q-card-section>
                  <div class="text-h6 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="info" class="q-mr-sm"/> Informacion General
                  </div>
                  <div class="row q-col-gutter-sm">
                    <div class="col-6">
                      <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Aprendiz</div>
                      <div class="text-subtitle2 text-weight-bold">{{ detailNovelty.apprentice?.fullName }}</div>
                      <div class="text-caption text-grey-6">Ficha: {{ detailNovelty.apprentice?.enrollmentNumber }} | {{ detailNovelty.apprentice?.program }}</div>
                    </div>
                    <div class="col-3">
                      <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Tipo</div>
                      <q-badge color="accent" :label="getTypeLabel(detailNovelty.type)" class="q-px-sm q-py-xs text-weight-bold" rounded/>
                    </div>
                    <div class="col-3">
                      <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Gravedad</div>
                      <q-badge :color="getSeverityColor(detailNovelty.severity)" :label="getSeverityLabel(detailNovelty.severity)" class="q-px-sm q-py-xs text-weight-bold" rounded/>
                    </div>
                    <div class="col-6 q-mt-sm">
                      <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Fecha/Hora Registro</div>
                      <div class="text-body2 text-weight-medium">{{ formatDateTime(detailNovelty.createdAt) }}</div>
                    </div>
                    <div class="col-6 q-mt-sm">
                      <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Estado Actual</div>
                      <q-chip :color="getStatusColor(detailNovelty.status)" text-color="white" dense class="text-weight-bold">{{ getStatusLabel(detailNovelty.status) }}</q-chip>
                    </div>
                  </div>
                </q-card-section>
              </q-card>

              <!-- 2. Reporte del Instructor -->
              <q-card class="my-card no-shadow q-mb-md">
                <q-card-section>
                  <div class="text-h6 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="assignment" class="q-mr-sm"/> Reporte del Instructor
                  </div>
                  <div class="text-subtitle2 text-weight-bold q-mb-xs">Instructor: {{ detailNovelty.reportedBy?.fullName }}</div>
                  <div class="text-caption text-grey-7 q-mb-md">Fecha del incidente: {{ formatDate(detailNovelty.occurrenceDate) }}</div>
                  <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Descripcion Completa</div>
                  <div class="bg-blue-grey-1 q-pa-md rounded-borders q-mb-md shadow-1" style="white-space: pre-wrap;">{{ detailNovelty.description }}</div>
                  <div v-if="detailNovelty.contactAttempts" class="q-mb-md">
                    <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Intentos de Contacto</div>
                    <div class="bg-grey-2 q-pa-md rounded-borders" style="white-space: pre-wrap;">{{ detailNovelty.contactAttempts }}</div>
                  </div>
                  <div v-if="detailNovelty.recommendations" class="q-mb-md">
                    <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Recomendaciones del Instructor</div>
                    <div class="bg-amber-1 q-pa-md rounded-borders" style="white-space: pre-wrap;">{{ detailNovelty.recommendations }}</div>
                  </div>
                  <div v-if="detailNovelty.attachments?.length > 0">
                    <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm">Evidencias Adjuntas</div>
                    <q-list bordered separator dense class="bg-white rounded-borders">
                      <q-item v-for="(file, idx) in detailNovelty.attachments" :key="idx" class="q-py-sm">
                        <q-item-section avatar><q-icon name="description" color="primary"/></q-item-section>
                        <q-item-section class="text-weight-medium">{{ file.fileName }}</q-item-section>
                        <q-item-section side>
                          <q-btn v-if="file.driveFileUrl" type="a" :href="file.driveFileUrl" target="_blank" flat round icon="visibility" color="primary" class="bg-blue-1">
                            <q-tooltip>Ver</q-tooltip>
                          </q-btn>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </div>
                </q-card-section>
              </q-card>

              <!-- 3. Cronologia Completa -->
              <q-card class="my-card no-shadow q-mb-md">
                <q-card-section>
                  <div class="text-h6 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="timeline" class="q-mr-sm"/> Cronologia de Eventos
                  </div>
                  <q-timeline color="primary" v-if="detailNovelty.timeline?.length">
                    <q-timeline-entry
                      v-for="(event, i) in detailNovelty.timeline" :key="i"
                      :color="event.event === 'CREATED' ? 'accent' : event.event === 'STATUS_CHANGED' ? 'info' : event.event === 'RESOLVED' ? 'positive' : 'primary'"
                      :icon="event.event === 'CREATED' ? 'add_comment' : event.event === 'STATUS_CHANGED' ? 'swap_horiz' : event.event === 'RESOLVED' ? 'check_circle' : 'chat'"
                      :title="event.event"
                      :subtitle="formatDateTime(event.createdAt) + (event.author?.fullName ? ' - ' + event.author.fullName + ' (' + (event.authorRole || '') + ')' : '')"
                    >
                      <div v-if="event.description" class="text-body2">{{ event.description }}</div>
                    </q-timeline-entry>
                  </q-timeline>
                  <div v-else class="text-caption text-grey-6 text-center q-pa-md">Sin eventos registrados</div>
                </q-card-section>
              </q-card>

              <!-- 4. Historial del Aprendiz -->
              <q-card class="my-card no-shadow q-mb-md">
                <q-card-section>
                  <div class="text-h6 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="history" class="q-mr-sm"/> Historial del Aprendiz
                  </div>
                  <q-expansion-item expand-separator icon="gavel" label="Novedades Previas" caption="Ultimas novedades del aprendiz" class="bg-white rounded-borders q-mb-sm shadow-1">
                    <q-list dense separator v-if="apprenticeHistory.previousNovelties?.length">
                      <q-item v-for="n in apprenticeHistory.previousNovelties" :key="n._id">
                        <q-item-section>
                          <q-item-label>{{ getTypeLabel(n.type) }} <q-badge :color="getSeverityColor(n.severity)" dense :label="getSeverityLabel(n.severity)"/></q-item-label>
                        </q-item-section>
                        <q-item-section side>
                          <q-chip dense :color="getStatusColor(n.status)" text-color="white" size="sm">{{ getStatusLabel(n.status) }}</q-chip>
                        </q-item-section>
                      </q-item>
                    </q-list>
                    <div v-else class="text-caption text-grey-6 q-pa-sm">Sin novedades previas</div>
                  </q-expansion-item>
                  <q-expansion-item expand-separator icon="directions_run" label="Seguimientos Recientes" class="bg-white rounded-borders q-mb-sm shadow-1">
                    <q-list dense separator v-if="apprenticeHistory.recentTrackings?.length">
                      <q-item v-for="t in apprenticeHistory.recentTrackings" :key="t._id">
                        <q-item-section>{{ t.type }} #{{ t.trackingNumber }}</q-item-section>
                        <q-item-section side>{{ formatDate(t.executedDate) }}</q-item-section>
                      </q-item>
                    </q-list>
                    <div v-else class="text-caption text-grey-6 q-pa-sm">Sin seguimientos</div>
                  </q-expansion-item>
                  <q-expansion-item expand-separator icon="menu_book" label="Bitacoras Recientes" class="bg-white rounded-borders q-mb-sm shadow-1">
                    <q-list dense separator v-if="apprenticeHistory.recentBitacoras?.length">
                      <q-item v-for="b in apprenticeHistory.recentBitacoras" :key="b._id">
                        <q-item-section>Bitacora #{{ b.logbookNumber }}</q-item-section>
                        <q-item-section side>{{ b.assignedHours || 0 }}h</q-item-section>
                      </q-item>
                    </q-list>
                    <div v-else class="text-caption text-grey-6 q-pa-sm">Sin bitacoras</div>
                  </q-expansion-item>
                </q-card-section>
              </q-card>

              <!-- 5. Documentos Generados -->
              <q-card v-if="detailNovelty.generatedDocuments?.length" class="my-card no-shadow q-mb-md">
                <q-card-section>
                  <div class="text-h6 text-primary text-weight-bolder q-mb-md flex items-center">
                    <q-icon name="description" class="q-mr-sm"/> Documentos Generados
                  </div>
                  <q-list bordered separator dense class="bg-white rounded-borders">
                    <q-item v-for="(doc, idx) in detailNovelty.generatedDocuments" :key="idx" class="q-py-sm">
                      <q-item-section avatar><q-icon :name="doc.type === 'ACTA' ? 'description' : 'assignment'" color="secondary"/></q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-medium">{{ doc.title }}</q-item-label>
                        <q-item-label caption>{{ doc.type }} | {{ formatDate(doc.generatedAt) }}</q-item-label>
                      </q-item-section>
                      <q-item-section side v-if="doc.driveFileUrl">
                        <q-btn type="a" :href="doc.driveFileUrl" target="_blank" flat round icon="picture_as_pdf" color="secondary" class="bg-green-1"/>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>
            </div>

            <!-- RIGHT COLUMN: Panel de Acciones Administrativas -->
            <div class="col-12 col-md-5">
              <q-card class="my-card no-shadow sticky-panel">
                <q-card-section class="q-pa-lg">
                  <div class="text-h5 text-primary text-weight-bolder q-mb-lg flex items-center">
                    <q-icon name="admin_panel_settings" class="q-mr-sm" size="md"/> Acciones Administrativas
                  </div>

                  <div v-if="detailNovelty.status === 'RESOLVED'" class="bg-green-1 border-green q-pa-lg rounded-borders shadow-1 q-mb-lg">
                    <div class="text-h6 text-positive text-weight-bold q-mb-md"><q-icon name="check_circle" class="q-mr-sm"/>Novedad Resuelta</div>
                    <div class="text-uppercase text-weight-bold text-positive q-mb-xs">Acciones Tomadas:</div>
                    <div style="white-space: pre-wrap;" class="bg-white q-pa-md rounded-borders shadow-1 q-mb-md">{{ detailNovelty.actionsTaken }}</div>
                    <p class="text-caption text-grey-8 text-right q-mb-none">
                      Resuelto por: {{ detailNovelty.resolvedBy?.fullName }}<br/>
                      {{ formatDateTime(detailNovelty.resolvedAt) }}
                    </p>
                  </div>

                  <div v-else>
                    <q-banner class="bg-blue-1 text-primary q-mb-lg rounded-borders shadow-1 border-left-primary">
                      <template v-slot:avatar><q-icon name="info"/></template>
                      Estado: <strong>{{ getStatusLabel(detailNovelty.status) }}</strong>
                    </q-banner>

                    <q-form @submit="updateStatus" class="q-gutter-md q-mb-lg">
                      <div class="text-subtitle2 text-primary text-weight-bold q-mb-sm">Cambiar Estado</div>
                      <q-select v-model="actionForm.status" :options="availableStatusTransitions" label="Nuevo Estado" outlined dense emit-value map-options color="primary" class="glass-input" :rules="[val => !!val || 'Requerido']">
                        <template v-slot:prepend><q-icon name="swap_horiz" color="primary"/></template>
                      </q-select>
                      <q-input v-model="actionForm.actionsTaken" label="Acciones Tomadas / Resolucion *" type="textarea" outlined dense rows="4" color="primary" class="glass-input bg-white" :rules="[val => !!val && val.length >= 20 || 'Minimo 20 caracteres']"/>
                      <q-btn color="primary" icon="save" label="Actualizar Estado" type="submit" :loading="saving" class="full-width header-btn text-weight-bold shadow-2" rounded padding="sm"/>
                    </q-form>

                    <q-separator class="q-my-md opacity-20"/>

                    <div class="text-subtitle2 text-primary text-weight-bold q-mb-sm">Agregar Comentario</div>
                    <q-input v-model="newComment" label="Comentario o nota..." type="textarea" outlined dense rows="3" color="secondary" class="glass-input bg-white q-mb-sm"/>
                    <q-btn color="secondary" icon="chat" label="Agregar Comentario" :loading="addingComment" :disable="!newComment || newComment.length < 5" @click="addComment" class="full-width header-btn text-weight-bold shadow-2" rounded padding="sm"/>

                    <q-separator class="q-my-md opacity-20"/>

                    <div class="text-subtitle2 text-primary text-weight-bold q-mb-sm">Otras Acciones</div>
                    <div class="q-gutter-sm">
                      <q-btn color="purple" icon="groups" label="Convocar Comite" @click="notify('Comite convocado')" class="full-width header-btn text-weight-bold shadow-2" rounded padding="sm" flat outline/>
                      <q-btn color="teal" icon="picture_as_pdf" label="Generar Documento" @click="notify('Documento generado')" class="full-width header-btn text-weight-bold shadow-2" rounded padding="sm" flat outline/>
                      <q-btn color="positive" icon="check_circle" label="Resolver Novedad" :disable="actionForm.status !== 'RESOLVED' && detailNovelty.status !== 'IN_PROGRESS'" @click="notify('Novedad resuelta')" class="full-width header-btn text-weight-bold shadow-2" rounded padding="sm"/>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import noveltyService from '../../api/novelty.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const stats = ref({ kpis: {}, visualData: {}, urgentAlerts: [] });
const loadingStats = ref(true);

const novelties = ref([]);
const loadingTable = ref(false);
const filterStatus = ref(null);
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const columns = [
  { name: 'apprentice', label: 'Aprendiz', align: 'left' },
  { name: 'instructor', label: 'Reportado Por', align: 'left' },
  { name: 'type', label: 'Tipo', field: 'type', align: 'left' },
  { name: 'createdAt', label: 'Fecha', field: row => formatDate(row.createdAt), align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

const statusOptions = [
  { label: 'Pendiente', value: 'PENDING' },
  { label: 'En Gestion', value: 'IN_PROGRESS' },
  { label: 'Resuelta', value: 'RESOLVED' }
];

const noveltyTypeOptions = [
  { label: 'Desercion', value: 'DESERTION' },
  { label: 'Problema Disciplinario', value: 'DISCIPLINARY_ISSUE' },
  { label: 'Cambio Condiciones', value: 'COMPANY_CONDITIONS_CHANGE' },
  { label: 'Otro', value: 'OTHER' }
];

const showManageModal = ref(false);
const selectedNovelty = ref(null);
const detailNovelty = ref(null);
const apprenticeHistory = ref({ previousNovelties: [], recentTrackings: [], recentBitacoras: [] });
const saving = ref(false);
const addingComment = ref(false);
const newComment = ref('');
const actionForm = ref({ status: '', actionsTaken: '' });

const availableStatusTransitions = computed(() => {
  if (!detailNovelty.value) return [];
  const current = detailNovelty.value.status;
  if (current === 'PENDING') return [
    { label: 'Mover a: En Gestion', value: 'IN_PROGRESS' },
    { label: 'Cerrar: Resuelta', value: 'RESOLVED' }
  ];
  if (current === 'IN_PROGRESS') return [
    { label: 'Cerrar: Resuelta', value: 'RESOLVED' }
  ];
  return [];
});

onMounted(() => {
  loadStats();
  fetchNovelties();
});

async function loadStats() {
  loadingStats.value = true;
  try {
    const res = await noveltyService.getStats();
    stats.value = res.data?.data || res.data || { kpis: {}, visualData: {}, urgentAlerts: [] };
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar estadisticas.', position: 'top', timeout: 5000 });
  } finally {
    loadingStats.value = false;
  }
}

async function fetchNovelties() {
  loadingTable.value = true;
  try {
    const params = { page: pagination.value.page, limit: pagination.value.rowsPerPage };
    if (filterStatus.value) params.status = filterStatus.value;
    const res = await noveltyService.getAll(params);
    novelties.value = res.data?.data || res.data || [];
    if (res.data?.pagination?.total) pagination.value.rowsNumber = res.data.pagination.total;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar novedades.', position: 'top', timeout: 5000 });
  } finally {
    loadingTable.value = false;
  }
}

function onRequest(props) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  fetchNovelties();
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getTypeLabel(type) {
  const opt = noveltyTypeOptions.find(o => o.value === type);
  return opt ? opt.label : type;
}

function getStatusColor(status) {
  switch (status) {
    case 'PENDING': return 'orange';
    case 'IN_PROGRESS': return 'info';
    case 'RESOLVED': return 'positive';
    default: return 'grey';
  }
}

function getStatusLabel(status) {
  const opt = statusOptions.find(o => o.value === status);
  return opt ? opt.label : status;
}

function getSeverityColor(severity) {
  switch (severity) {
    case 'ALTA': return 'negative';
    case 'MEDIA': return 'orange';
    case 'BAJA': return 'info';
    default: return 'grey';
  }
}

function getSeverityLabel(severity) {
  switch (severity) {
    case 'ALTA': return 'Gravedad Alta';
    case 'MEDIA': return 'Gravedad Media';
    case 'BAJA': return 'Gravedad Baja';
    default: return severity || '—';
  }
}

const loadingDetail = ref(false);

async function openManageModal(novelty) {
  selectedNovelty.value = novelty;
  loadingDetail.value = true;
  try {
    const res = await noveltyService.getDetail(novelty._id);
    detailNovelty.value = res.data?.data || res.data;
    apprenticeHistory.value = detailNovelty.value.apprenticeHistory || { previousNovelties: [], recentTrackings: [], recentBitacoras: [] };
  } catch (e) {
    console.error(e);
    detailNovelty.value = novelty;
    apprenticeHistory.value = { previousNovelties: [], recentTrackings: [], recentBitacoras: [] };
  } finally {
    loadingDetail.value = false;
  }
  actionForm.value = {
    status: novelty.status === 'PENDING' ? 'IN_PROGRESS' : 'RESOLVED',
    actionsTaken: novelty.actionsTaken || ''
  };
  newComment.value = '';
  showManageModal.value = true;
}

async function openUrgentNovelty(id) {
  try {
    const res = await noveltyService.getById(id);
    const novelty = res.data?.data || res.data;
    if (novelty) openManageModal(novelty);
  } catch (e) {
    console.error(e);
    $q.notify({ type: 'negative', message: 'Error al abrir novedad.', position: 'top', timeout: 3000 });
  }
}

async function addComment() {
  if (!newComment.value || newComment.value.length < 5) return;
  addingComment.value = true;
  try {
    await noveltyService.addTimelineEvent(detailNovelty.value._id, {
      event: 'COMENTARIO',
      description: newComment.value.trim()
    });
    $q.notify({ type: 'positive', message: 'Comentario agregado.', position: 'top', timeout: 2000 });
    newComment.value = '';
    const res = await noveltyService.getDetail(detailNovelty.value._id);
    detailNovelty.value = res.data?.data || res.data;
    apprenticeHistory.value = detailNovelty.value.apprenticeHistory || apprenticeHistory.value;
  } catch (e) {
    console.error(e);
    $q.notify({ type: 'negative', message: 'Error al agregar comentario.', position: 'top', timeout: 3000 });
  } finally {
    addingComment.value = false;
  }
}

async function updateStatus() {
  saving.value = true;
  try {
    await noveltyService.updateStatus(detailNovelty.value._id, {
      status: actionForm.value.status,
      actionsTaken: actionForm.value.actionsTaken.trim()
    });
    await noveltyService.addTimelineEvent(detailNovelty.value._id, {
      event: actionForm.value.status === 'RESOLVED' ? 'RESOLVED' : 'STATUS_CHANGED',
      description: 'Estado cambiado a ' + getStatusLabel(actionForm.value.status) + '. ' + actionForm.value.actionsTaken.trim()
    });
    const res = await noveltyService.getDetail(detailNovelty.value._id);
    detailNovelty.value = res.data?.data || res.data;
    apprenticeHistory.value = detailNovelty.value.apprenticeHistory || apprenticeHistory.value;
    $q.notify({ type: 'positive', message: 'Estado actualizado.', position: 'top', timeout: 3000 });
    loadStats();
    fetchNovelties();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.response?.data?.message || 'Error al actualizar.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

function notify(msg) {
  $q.notify({ type: 'info', message: msg + ' (en desarrollo)', position: 'top', timeout: 2000 });
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.admin-novelties-container {
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

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
.opacity-60 { opacity: 0.6; }
.opacity-20 { opacity: 0.2; }

.my-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
}

.my-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 50px rgba(0,0,0,0.1) !important;
}

.kpi-card {
  border-radius: 18px;
  transition: transform 0.3s ease;
}
.kpi-card:hover {
  transform: translateY(-4px);
}

.chart-card {
  min-height: 250px;
}

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

.custom-table-header {
  background-color: #f1f8f4 !important;
  color: #1b5e20 !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.custom-table { border-radius: 20px; }
.custom-table :deep(.q-table__container) { background: transparent; }
.custom-table :deep(th) {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #4a5568;
  border-bottom: 2px solid rgba(0,0,0,0.05);
}
.custom-table :deep(tbody tr) { transition: all 0.2s ease; }
.custom-table :deep(tbody tr:hover) {
  background-color: #f8fcfb !important;
  transform: scale(1.002);
}
.custom-table :deep(td) { border-bottom: 1px solid rgba(0,0,0,0.03); }

.status-chip { letter-spacing: 0.5px; }
.action-btn { transition: all 0.2s ease; }
.action-btn:hover { transform: scale(1.15) rotate(5deg); }
.header-btn { transition: all 0.3s ease; }
.header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important;
}

.border-green { border: 1px solid #c8e6c9; }
.border-left-primary { border-left: 4px solid var(--q-primary); }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sticky-panel { position: sticky; top: 16px; }
</style>
