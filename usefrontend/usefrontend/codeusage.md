<template>
  <div class="reports-dashboard-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Panel de Reportes</h2>
        <p class="text-grey-7 q-my-sm">Visión general del estado de las etapas productivas e instructores.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="loadAllReports" :loading="loading" />
      </div>
    </div>

    <!-- Loading State -->
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
    </q-card>

    <div v-else>
      
      <!-- EP Summary Section -->
      <div class="text-h6 text-primary q-mb-sm">Resumen de Etapas Productivas ({{ new Date().getFullYear() }})</div>
      <div class="row q-col-gutter-md q-mb-lg" v-if="epSummary">
        <div class="col-12 col-md-3">
          <q-card flat bordered class="bg-blue-1 border-blue text-center full-height flex flex-center column q-pa-md">
            <div class="text-h3 text-weight-bold text-primary">{{ epSummary.totalEPs || 0 }}</div>
            <div class="text-subtitle1 text-grey-9">Total Etapas</div>
            <q-btn class="q-mt-sm" color="primary" size="sm" icon="download" label="Exportar" @click="exportEP" :loading="exporting === 'ep'" />
          </q-card>
        </div>
        
        <div class="col-12 col-md-9">
          <q-card flat bordered class="q-pa-md">
            <div class="text-subtitle2 text-black q-mb-sm">Por Estado</div>
            <div class="row q-col-gutter-sm">
              <div class="col" v-for="(count, status) in (epSummary.byStatus || {})" :key="status">
                <q-card class="bg-grey-2 text-center q-pa-sm">
                  <div class="text-h6">{{ count }}</div>
                  <div class="text-caption text-weight-bold" style="font-size: 10px;">{{ getStatusLabel(status) }}</div>
                </q-card>
              </div>
            </div>
            
            <q-separator class="q-my-md" />
            
            <div class="text-subtitle2 text-black q-mb-sm">Por Modalidad</div>
            <q-list dense>
              <q-item v-for="(data, mod) in (epSummary.byModality || {})" :key="mod">
                <q-item-section>{{ getModalityLabel(mod) }}</q-item-section>
                <q-item-section side>
                  <q-badge color="primary">{{ data.total }}</q-badge>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card>
        </div>
      </div>

      <q-separator class="q-my-lg" />

      <!-- Instructors Hours Section -->
      <div class="row items-center justify-between q-mb-sm">
        <div class="text-h6 text-primary">Horas de Instructores</div>
        <q-btn color="secondary" size="sm" icon="download" label="Exportar General" @click="exportHours" :loading="exporting === 'hours'" />
      </div>
      <q-card flat bordered class="q-mb-lg" v-if="hourSummary">
        <q-table
          :rows="hourSummary.instructors || []"
          :columns="instructorColumns"
          row-key="instructor.id"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-instructor="props">
            <q-td :props="props">
              <div class="text-weight-bold">{{ props.row.instructor?.fullName }}</div>
              <div class="text-caption">{{ props.row.instructor?.knowledgeArea || 'Área general' }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-total="props">
            <q-td :props="props">
              <q-chip color="info" text-color="white" dense>{{ props.row.yearTotals?.totalHours || 0 }} h</q-chip>
            </q-td>
          </template>

          <template v-slot:body-cell-pending="props">
            <q-td :props="props">
              <q-chip :color="(props.row.yearTotals?.pendingPaymentHours || 0) > 0 ? 'warning' : 'grey'" text-color="white" dense>
                {{ props.row.yearTotals?.pendingPaymentHours || 0 }} h por cobrar
              </q-chip>
            </q-td>
          </template>
        </q-table>
        <div class="bg-grey-2 q-pa-md text-right text-subtitle2">
          Total Global de Horas: {{ hourSummary.grandTotals?.totalHours || 0 }} | Pendientes de Pago: <span class="text-negative">{{ hourSummary.grandTotals?.totalPending || 0 }}</span>
        </div>
      </q-card>

      <q-separator class="q-my-lg" />

      <!-- Expiry Alerts Section -->
      <div class="text-h6 text-negative q-mb-sm"><q-icon name="warning" /> Alertas de Vencimiento de Matrícula</div>
      <q-card flat bordered class="border-red" v-if="expiryReport">
        <q-table
          :rows="expiryReport.apprentices || []"
          :columns="expiryColumns"
          row-key="enrollmentNumber"
          flat
          hide-pagination
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-alert="props">
            <q-td :props="props" class="text-center">
              <q-icon name="error" size="sm" :color="getAlertColor(props.row.alertLevel)" />
            </q-td>
          </template>
          
          <template v-slot:body-cell-apprentice="props">
            <q-td :props="props">
              <div class="text-weight-bold">{{ props.row.fullName }}</div>
              <div class="text-caption">Ficha: {{ props.row.enrollmentNumber }}</div>
            </q-td>
          </template>

          <template v-slot:body-cell-days="props">
            <q-td :props="props">
              <div class="text-weight-bold" :class="`text-${getAlertColor(props.row.alertLevel)}`">
                {{ props.row.daysRemaining }} días
              </div>
              <div class="text-caption">{{ formatDate(props.row.enrollmentExpiryDate) }}</div>
            </q-td>
          </template>
          
          <template v-slot:no-data>
            <div class="full-width row flex-center text-positive q-pa-lg">
              <q-icon name="check_circle" size="sm" class="q-mr-sm" /> No hay aprendices próximos a vencer.
            </div>
          </template>
        </q-table>
      </q-card>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import reportService from '../../api/report.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const loading = ref(true);
const exporting = ref(null);

const epSummary = ref(null);
const hourSummary = ref(null);
const expiryReport = ref(null);

const instructorColumns = [
  { name: 'instructor', label: 'Instructor', align: 'left' },
  { name: 'total', label: 'Total Horas (Año)', align: 'center' },
  { name: 'pending', label: 'Pendientes Pago', align: 'center' }
];

const expiryColumns = [
  { name: 'alert', label: 'Alerta', align: 'center' },
  { name: 'apprentice', label: 'Aprendiz', align: 'left' },
  { name: 'program', label: 'Programa', field: 'program', align: 'left' },
  { name: 'days', label: 'Vencimiento', align: 'left' }
];

onMounted(() => {
  loadAllReports();
});

async function loadAllReports() {
  loading.value = true;
  try {
    const [epRes, hrRes, expRes] = await Promise.all([
      reportService.getEPSummary(),
      reportService.getInstructorHours(),
      reportService.getEnrollmentExpiry()
    ]);
    
    epSummary.value = epRes.data.data || epRes.data;
    hourSummary.value = hrRes.data.data || hrRes.data;
    expiryReport.value = expRes.data.data || expRes.data;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar los reportes.' });
  } finally {
    loading.value = false;
  }
}

async function exportEP() {
  exporting.value = 'ep';
  try {
    const response = await reportService.exportEPSummary();
    downloadBlob(response.data, 'Reporte_Etapas_Productivas.pdf');
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al exportar reporte.' });
  } finally {
    exporting.value = null;
  }
}

async function exportHours() {
  exporting.value = 'hours';
  try {
    const response = await reportService.exportInstructorHours();
    downloadBlob(response.data, 'Reporte_Horas_Instructores.pdf');
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al exportar reporte.' });
  } finally {
    exporting.value = null;
  }
}

function downloadBlob(data, filename) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function getStatusLabel(status) {
  const map = {
    'PENDING_REGISTRATION': 'Sin Registrar',
    'PENDING_APPROVAL': 'Por Aprobar',
    'ACTIVE': 'Activa',
    'IN_FOLLOWUP': 'Seguimiento',
    'CERTIFICATION': 'Certificación',
    'COMPLETED': 'Completada',
    'ARCHIVED': 'Archivada'
  };
  return map[status] || status;
}

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

function getAlertColor(level) {
  if (level === 'RED') return 'negative';
  if (level === 'ORANGE') return 'orange';
  if (level === 'YELLOW') return 'warning';
  return 'grey';
}
</script>

<style scoped>
.reports-dashboard-container {
  max-width: 1300px;
  margin: 0 auto;
}
.border-blue { border-color: #bbdefb; }
.border-red { border-color: #ffcdd2; }
</style>






<template>
  <div class="config-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Configuración del Sistema</h2>
        <p class="text-grey-7 q-my-sm">Parámetros globales, límites de horas y alertas.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Recargar" @click="fetchConfigs" :loading="loading" />
      </div>
    </div>
    
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
      <div class="q-mt-md text-grey">Cargando configuraciones...</div>
    </q-card>

    <div class="row q-col-gutter-md" v-else>
      <div class="col-12" v-for="config in configs" :key="config.key">
        <q-card flat bordered>
          <q-card-section class="row items-center">
            <div class="col-12 col-md-4">
              <div class="text-weight-bold text-subtitle1">{{ formatKeyName(config.key) }}</div>
              <div class="text-caption text-grey-7">{{ config.description || config.key }}</div>
            </div>
            
            <div class="col-12 col-md-6 q-px-md">
              <q-input 
                v-if="typeof config.value === 'number' || !isNaN(config.value)" 
                v-model.number="config.editValue" 
                type="number" 
                dense outlined 
              />
              <q-toggle 
                v-else-if="typeof config.value === 'boolean' || config.value === 'true' || config.value === 'false'" 
                v-model="config.editValue" 
                color="primary" 
              />
              <q-input 
                v-else 
                v-model="config.editValue" 
                dense outlined 
              />
            </div>
            
            <div class="col-12 col-md-2 text-right">
              <q-btn 
                color="secondary" 
                icon="save" 
                label="Actualizar" 
                @click="updateConfig(config)" 
                :disable="config.value === config.editValue"
                :loading="config.saving"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import systemConfigService from '../../api/systemConfig.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const configs = ref([]);
const loading = ref(false);

onMounted(() => {
  fetchConfigs();
});

async function fetchConfigs() {
  loading.value = true;
  try {
    const response = await systemConfigService.getAll();
    // Assuming response is an array of config objects
    const data = response.data.data || response.data;
    
    configs.value = data.map(c => ({
      ...c,
      editValue: c.value,
      saving: false
    }));
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar configuraciones' });
  } finally {
    loading.value = false;
  }
}

async function updateConfig(config) {
  config.saving = true;
  try {
    await systemConfigService.update(config.key, config.editValue);
    config.value = config.editValue;
    $q.notify({ type: 'positive', message: `Configuración ${config.key} actualizada` });
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al actualizar configuración' });
    // Revert change
    config.editValue = config.value;
  } finally {
    config.saving = false;
  }
}

function formatKeyName(key) {
  // Convert MAX_LOGBOOKS_TECHNICIAN to Max Logbooks Technician
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}
</script>

<style scoped>
.config-container {
  max-width: 1000px;
  margin: 0 auto;
}
</style>




<template>
  <div class="close-ep-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Cierre de Etapa Productiva</h2>
        <p class="text-grey-7 q-my-sm">Validación de documentos y finalización del proceso de certificación.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="fetchEPs" :loading="loading" />
      </div>
    </div>

    <!-- Table -->
    <q-card flat bordered>
      <q-table
        :rows="eps"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:body-cell-apprentice="props">
          <q-td :props="props">
            <div class="text-weight-bold">{{ props.row.apprentice?.fullName }}</div>
            <div class="text-caption text-grey-7">Ficha: {{ props.row.apprentice?.enrollmentNumber }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-dates="props">
          <q-td :props="props">
            <div><strong>Inicio:</strong> {{ formatDate(props.row.startDate) }}</div>
            <div><strong>Fin:</strong> {{ formatDate(props.row.estimatedEndDate) }}</div>
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="props.value === 'COMPLETED' ? 'positive' : 'info'"
              text-color="white"
              dense
              size="sm"
            >
              {{ props.value === 'COMPLETED' ? 'COMPLETADA' : 'EN CERTIFICACIÓN' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn v-if="props.row.status === 'CERTIFICATION'" size="sm" color="primary" label="Revisar Cierre" @click="openReviewModal(props.row)" />
            <q-btn v-if="props.row.status === 'COMPLETED'" size="sm" outline color="positive" icon="done_all" label="Cerrada" disable />
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            No hay aprendices en etapa de certificación.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Review Documents & Close -->
    <q-dialog v-model="showReviewModal" persistent maximized>
      <q-card v-if="selectedEP" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">Revisión de Documentos - {{ selectedEP.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <div class="row q-col-gutter-lg">
            
            <!-- Left Column: Documents -->
            <div class="col-12 col-md-7">
              <div class="text-h4 text-black q-mb-md">Documentos Obligatorios</div>
              
              <q-banner v-if="loadingDocs" class="bg-grey-2 q-mb-md text-center">
                <q-spinner color="primary" size="2em" /> Cargando estado...
              </q-banner>
              
              <div v-else-if="epStatus">
                <q-list bordered separator class="rounded-borders">
                  
                  <q-item v-for="reqDoc in requiredDocumentTypes" :key="reqDoc.value" class="q-py-md">
                    <q-item-section avatar>
                      <q-icon :name="getDocIcon(reqDoc.value)" size="2em" :color="getDocColor(reqDoc.value)" />
                    </q-item-section>
                    
                    <q-item-section>
                      <q-item-label class="text-weight-bold">{{ reqDoc.label }}</q-item-label>
                      <q-item-label caption v-if="!hasDocument(reqDoc.value)" class="text-negative">
                        El aprendiz aún no ha subido este documento.
                      </q-item-label>
                      <q-item-label caption v-else>
                        Subido el: {{ formatDateTime(getDocument(reqDoc.value).uploadedAt) }}
                      </q-item-label>
                    </q-item-section>
                    
                    <q-item-section side v-if="hasDocument(reqDoc.value)">
                      <div class="row items-center q-gutter-sm">
                        <q-chip :color="getDocStatusColor(getDocument(reqDoc.value).status)" text-color="white" dense>
                          {{ getDocStatusLabel(getDocument(reqDoc.value).status) }}
                        </q-chip>
                        <q-btn type="a" :href="getDocument(reqDoc.value).driveFileUrl" target="_blank" flat round color="primary" icon="visibility">
                          <q-tooltip>Ver Documento</q-tooltip>
                        </q-btn>
                      </div>
                    </q-item-section>
                  </q-item>

                </q-list>

                <div class="q-mt-md" v-if="epStatus.submitted && epStatus.submitted.some(d => d.status === 'SUBMITTED')">
                  <div class="text-subtitle2 text-primary q-mb-sm">Acciones de Revisión Pendientes</div>
                  <q-card flat bordered class="q-pa-sm" v-for="doc in epStatus.submitted.filter(d => d.status === 'SUBMITTED')" :key="doc._id">
                    <div class="row items-center justify-between">
                      <div class="text-weight-bold">{{ getDocTypeLabel(doc.documentType) }}</div>
                      <div class="q-gutter-xs">
                        <q-btn color="positive" size="sm" label="Aprobar" @click="approveDocument(doc._id)" :loading="processing" />
                        <q-btn color="negative" size="sm" label="Rechazar" @click="promptReject(doc._id)" :loading="processing" />
                      </div>
                    </div>
                  </q-card>
                </div>
              </div>

            </div>

            <!-- Right Column: Verification & Close -->
            <div class="col-12 col-md-5">
              <div class="text-h4 text-black q-mb-md">Cierre Definitivo</div>
              
              <q-card flat bordered class="bg-grey-1 q-mb-md">
                <q-card-section>
                  <div class="text-subtitle2 q-mb-sm">Resumen del Expediente</div>
                  <div class="row justify-between q-mb-xs">
                    <span>Bitácoras ({{ selectedEP.completedBitacoras }} / {{ selectedEP.maxBitacoras || '?' }})</span>
                    <q-icon :name="selectedEP.completedBitacoras >= selectedEP.maxBitacoras ? 'check_circle' : 'cancel'" 
                            :color="selectedEP.completedBitacoras >= selectedEP.maxBitacoras ? 'positive' : 'negative'" />
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span>Seguimientos ({{ selectedEP.completedTrackings }} / {{ selectedEP.requiredTrackings || '?' }})</span>
                    <q-icon :name="selectedEP.completedTrackings >= selectedEP.requiredTrackings ? 'check_circle' : 'cancel'" 
                            :color="selectedEP.completedTrackings >= selectedEP.requiredTrackings ? 'positive' : 'negative'" />
                  </div>
                  <div class="row justify-between q-mb-xs">
                    <span>Documentos Aprobados</span>
                    <q-icon :name="epStatus?.allRequiredApproved ? 'check_circle' : 'cancel'" 
                            :color="epStatus?.allRequiredApproved ? 'positive' : 'negative'" />
                  </div>
                </q-card-section>
              </q-card>

              <div class="bg-blue-1 text-primary q-pa-md rounded-borders border-blue q-mb-md">
                <div class="text-weight-bold q-mb-sm"><q-icon name="info" /> Requisitos para el cierre</div>
                <ul class="q-pl-md q-my-none text-caption">
                  <li>Todas las bitácoras deben estar aprobadas.</li>
                  <li>Todos los seguimientos deben estar ejecutados.</li>
                  <li>Los 3 documentos finales deben estar cargados y <strong>aprobados</strong> por usted.</li>
                  <li>No debe haber novedades sin resolver.</li>
                </ul>
              </div>

              <q-btn 
                color="positive" size="lg" class="full-width" icon="task_alt" label="Finalizar Etapa Productiva" 
                :disable="!canClose" 
                @click="completeEP" 
                :loading="processing"
              />
              <div v-if="!canClose" class="text-center text-caption text-negative q-mt-sm">
                Aún faltan requisitos por cumplir para habilitar el cierre.
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import productiveStageService from '../../api/productiveStage.service';
import documentService from '../../api/document.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const eps = ref([]);
const loading = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 10, rowsNumber: 0 });

const showReviewModal = ref(false);
const selectedEP = ref(null);
const epStatus = ref(null);
const loadingDocs = ref(false);
const processing = ref(false);

const requiredDocumentTypes = [
  { label: 'Certificado de la Empresa', value: 'EP_CERTIFICATE' },
  { label: 'Evaluación de Desempeño', value: 'PERFORMANCE_EVALUATION' },
  { label: 'Acta de Compromiso', value: 'COMMITMENT_LETTER' }
];

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'company', label: 'Empresa', field: row => row.companySnapshot?.companyName, align: 'left' },
  { name: 'dates', label: 'Fechas', align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

onMounted(() => {
  fetchEPs();
});

async function fetchEPs() {
  loading.value = true;
  try {
    // Solo traemos las que están en CERTIFICATION o COMPLETED (para historial)
    const resCert = await productiveStageService.getAllEPs({ status: 'CERTIFICATION', limit: 50 });
    const resComp = await productiveStageService.getAllEPs({ status: 'COMPLETED', limit: 20 });
    
    eps.value = [...(resCert.data.data || resCert.data), ...(resComp.data.data || resComp.data)];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar etapas.' });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  // Client side or update params
  fetchEPs();
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('es-CO', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

function getDocTypeLabel(type) {
  const opt = requiredDocumentTypes.find(o => o.value === type);
  return opt ? opt.label : type;
}

function getDocStatusColor(status) {
  switch(status) {
    case 'SUBMITTED': return 'info';
    case 'APPROVED': return 'positive';
    case 'REJECTED': return 'negative';
    default: return 'grey';
  }
}

function getDocStatusLabel(status) {
  switch(status) {
    case 'SUBMITTED': return 'Por Revisar';
    case 'APPROVED': return 'Aprobado';
    case 'REJECTED': return 'Rechazado';
    default: return status;
  }
}

function getDocument(type) {
  if (!epStatus.value || !epStatus.value.submitted) return null;
  return epStatus.value.submitted.find(d => d.documentType === type);
}

function hasDocument(type) {
  return !!getDocument(type);
}

function getDocIcon(type) {
  const doc = getDocument(type);
  if (!doc) return 'upload_file';
  if (doc.status === 'APPROVED') return 'check_circle';
  if (doc.status === 'REJECTED') return 'cancel';
  return 'pending_actions';
}

function getDocColor(type) {
  const doc = getDocument(type);
  if (!doc) return 'grey-6';
  if (doc.status === 'APPROVED') return 'positive';
  if (doc.status === 'REJECTED') return 'negative';
  return 'info';
}

const canClose = computed(() => {
  if (!selectedEP.value || !epStatus.value) return false;
  
  const bitacorasOk = selectedEP.value.completedBitacoras >= (selectedEP.value.maxBitacoras || 1);
  const trackingsOk = selectedEP.value.completedTrackings >= (selectedEP.value.requiredTrackings || 1);
  const docsOk = epStatus.value.allRequiredApproved;
  
  // Also ideally check for novelties resolved, but button can be enabled and backend rejects if not.
  return bitacorasOk && trackingsOk && docsOk;
});

function openReviewModal(ep) {
  selectedEP.value = ep;
  epStatus.value = null;
  showReviewModal.value = true;
  loadDocuments();
}

async function loadDocuments() {
  loadingDocs.value = true;
  try {
    const res = await documentService.getEPStatus(selectedEP.value._id);
    epStatus.value = res.data.data || res.data;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar los documentos.' });
  } finally {
    loadingDocs.value = false;
  }
}

async function approveDocument(docId) {
  processing.value = true;
  try {
    await documentService.approve(docId);
    $q.notify({ type: 'positive', message: 'Documento aprobado.' });
    await loadDocuments();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al aprobar documento.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    processing.value = false;
  }
}

function promptReject(docId) {
  $q.dialog({
    title: 'Rechazar Documento',
    message: 'Indique el motivo del rechazo (Mín. 10 caracteres):',
    prompt: {
      model: '',
      type: 'textarea',
      isValid: val => val.length >= 10
    },
    cancel: true,
    persistent: true
  }).onOk(async data => {
    processing.value = true;
    try {
      await documentService.reject(docId, data);
      $q.notify({ type: 'warning', message: 'Documento rechazado. Se ha notificado al aprendiz.' });
      await loadDocuments();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al rechazar documento.';
      $q.notify({ type: 'negative', message: msg });
    } finally {
      processing.value = false;
    }
  });
}

async function completeEP() {
  $q.dialog({
    title: 'Confirmar Cierre Definitivo',
    message: '¿Está seguro de que desea finalizar la Etapa Productiva de este aprendiz? Esta acción no se puede deshacer.',
    cancel: true,
    persistent: true
  }).onOk(async () => {
    processing.value = true;
    try {
      await productiveStageService.completeEP(selectedEP.value._id);
      $q.notify({ type: 'positive', message: '¡Etapa Productiva finalizada exitosamente!' });
      showReviewModal.value = false;
      fetchEPs();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || 'Error al cerrar la etapa productiva.';
      $q.notify({ type: 'negative', message: msg });
    } finally {
      processing.value = false;
    }
  });
}
</script>

<style scoped>
.close-ep-container {
  max-width: 1200px;
  margin: 0 auto;
}
.border-blue {
  border-color: #bbdefb;
}
</style>
