<template>
  <div class="manage-trackings-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Gestión de Seguimientos</h2>
        <p class="text-grey-7 q-my-sm">Programa y ejecuta las sesiones de seguimiento con tus aprendices.</p>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn color="green" outline icon="upload_file" label="Subir Acta" @click="openUploadActaModal" />
        <q-btn color="warning" outline icon="warning" label="Extraordinario" @click="openExtraordinaryModal" />
        <q-btn color="primary" icon="add" label="Programar Seguimiento" @click="openCreateModal" />
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-select 
            v-model="filterStatus" 
            :options="statusOptions" 
            label="Filtrar por Estado" 
            outlined dense emit-value map-options clearable 
            @update:model-value="fetchTrackings" 
          />
        </div>
        <div class="col-12 col-sm-3">
          <q-checkbox v-model="showExtraordinary" label="Ver Extraordinarios" dense color="warning" @update:model-value="fetchTrackings" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered>
      <q-table
        :rows="trackings"
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

        <template v-slot:body-cell-trackingNumber="props">
          <q-td :props="props">
            <div class="text-weight-bold">Seguimiento #{{ props.value }}</div>
            <q-badge v-if="props.row.isExtraordinary" color="warning" label="Extra" />
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="getStatusColor(props.value)"
              text-color="white"
              dense
              size="sm"
            >
              {{ getStatusLabel(props.value) }}
            </q-chip>
            <q-badge v-if="props.row.isExtraordinary && !props.row.approvedByAdmin" color="negative" class="q-ml-sm" label="Esperando Aprobación" />
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn v-if="props.row.status === 'SCHEDULED' && (!props.row.isExtraordinary || props.row.approvedByAdmin)" 
                   size="sm" color="primary" label="Ejecutar" @click="openExecuteModal(props.row)" />
            <q-btn v-if="props.row.status === 'EXECUTED'" 
                   size="sm" color="purple" outline label="Cobrar" @click="markAsPaid(props.row)" />
            <q-btn v-if="props.row.status === 'EXECUTED' || props.row.status === 'PAID'" 
                   size="sm" outline color="primary" icon="visibility" @click="viewDetails(props.row)">
              <q-tooltip>Ver Detalles</q-tooltip>
            </q-btn>
          </q-td>
        </template>
        
        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            No tienes seguimientos en este estado.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Programar (Ordinario) -->
    <q-dialog v-model="showCreateModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="createTracking">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Programar Seguimiento</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-select
              v-model="form.productiveStageId"
              :options="myEPs"
              option-value="_id"
              :option-label="opt => `${opt.apprentice?.fullName} - ${opt.company?.name}`"
              label="Seleccionar Aprendiz / Etapa"
              outlined dense emit-value map-options
              :rules="[val => !!val || 'Requerido']"
            />
            
            <q-select
              v-model="form.type"
              :options="[{label:'Presencial', value:'IN_PERSON'}, {label:'Virtual', value:'VIRTUAL'}]"
              label="Tipo de Seguimiento"
              outlined dense emit-value map-options
              :rules="[val => !!val || 'Requerido']"
            />

            <q-input v-model="form.scheduledDate" label="Fecha Programada" type="date" outlined dense :rules="[val => !!val || 'Requerido']" />
            
            <q-input v-model="form.notes" label="Notas / Detalles (Opcional)" type="textarea" outlined dense rows="3" />
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Programar" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Solicitar Extraordinario -->
    <q-dialog v-model="showExtraordinaryModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="requestExtraordinary">
          <q-card-section class="bg-warning text-white">
            <div class="text-h6">Solicitar Seg. Extraordinario</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-banner class="bg-orange-1 text-warning q-mb-md rounded-borders text-caption">
              Los seguimientos extraordinarios requieren la aprobación de la coordinación antes de ser ejecutados.
            </q-banner>

            <q-select
              v-model="form.productiveStageId"
              :options="myEPs"
              option-value="_id"
              :option-label="opt => `${opt.apprentice?.fullName} - ${opt.company?.name}`"
              label="Seleccionar Aprendiz / Etapa"
              outlined dense emit-value map-options
              :rules="[val => !!val || 'Requerido']"
            />
            
            <q-select
              v-model="form.type"
              :options="[{label:'Extraordinario (Presencial)', value:'EXTRAORDINARY'}, {label:'Virtual', value:'VIRTUAL'}, {label:'Presencial', value:'IN_PERSON'}]"
              label="Tipo Base"
              outlined dense emit-value map-options
              :rules="[val => !!val || 'Requerido']"
            />

            <q-input v-model="form.scheduledDate" label="Fecha Propuesta" type="date" outlined dense :rules="[val => !!val || 'Requerido']" />
            
            <q-input v-model="form.extraordinaryReason" label="Motivo de la solicitud *" type="textarea" outlined dense rows="4" 
                     placeholder="Explique detalladamente por qué se requiere este seguimiento extra..."
                     :rules="[val => !!val && val.length >= 50 || 'Requerido. Mínimo 50 caracteres.']" />
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="warning" text-color="black" label="Solicitar" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Ejecutar Seguimiento -->
    <q-dialog v-model="showExecuteModal" persistent maximized>
      <q-card v-if="selectedTracking" class="column">
        <q-card-section class="bg-primary text-white row items-center q-pb-none">
          <div class="text-h6">Ejecutar Seguimiento #{{ selectedTracking.trackingNumber }} - {{ selectedTracking.apprentice?.fullName }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup>
          <q-tooltip>Cerrar</q-tooltip>
        </q-btn>
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <q-stepper v-model="executeStep" ref="stepper" color="primary" animated flat bordered class="q-mx-auto" style="max-width: 800px;">
            
            <!-- Step 1: Upload PDF -->
            <q-step :name="1" title="Subir Acta Firmada" icon="upload_file" :done="executeStep > 1 || !!selectedTracking.driveFileUrl">
              <div class="q-pa-md">
                <p class="text-subtitle1 text-grey-8">Sube el documento PDF del seguimiento con las firmas correspondientes.</p>
                <div v-if="selectedTracking.driveFileUrl" class="bg-green-1 q-pa-md rounded-borders q-mb-md text-positive flex items-center">
                  <q-icon name="check_circle" size="sm" class="q-mr-sm" /> Documento subido previamente. Puedes reemplazarlo o continuar.
                </div>
                
                <q-file v-model="executeForm.file" label="Seleccionar Acta PDF" outlined accept=".pdf" class="q-mb-md">
                  <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
                </q-file>
                
                <q-btn color="secondary" label="Subir Documento" @click="uploadPDF" :loading="saving" :disable="!executeForm.file" />
              </div>
              <q-stepper-navigation>
                <q-btn color="primary" label="Continuar" @click="executeStep = 2" :disable="!selectedTracking.driveFileUrl" />
              </q-stepper-navigation>
            </q-step>

            <!-- Step 2: Validar Firmas -->
            <q-step :name="2" title="Validar Firmas" icon="draw" :done="executeStep > 2 || selectedTracking.signatureValidatedAt">
              <div class="q-pa-md">
                <p class="text-subtitle1 text-grey-8">Confirma que el documento adjunto contiene las firmas requeridas.</p>
                <q-list bordered separator class="rounded-borders q-mb-md">
                  <q-item tag="label" v-ripple>
                    <q-item-section avatar><q-checkbox v-model="executeForm.signedByInstructor" color="primary" /></q-item-section>
                    <q-item-section><q-item-label>Firma del Instructor (Mi firma)</q-item-label></q-item-section>
                  </q-item>
                  <q-item tag="label" v-ripple>
                    <q-item-section avatar><q-checkbox v-model="executeForm.signedByApprentice" color="primary" /></q-item-section>
                    <q-item-section><q-item-label>Firma del Aprendiz / Jefe Inmediato</q-item-label></q-item-section>
                  </q-item>
                </q-list>
                
                <q-btn color="secondary" label="Guardar Validación" @click="validateSignatures" :loading="saving" :disable="!executeForm.signedByInstructor" />
              </div>
              <q-stepper-navigation>
                <q-btn flat color="primary" label="Atrás" @click="executeStep = 1" class="q-mr-sm" />
                <q-btn color="primary" label="Continuar" @click="executeStep = 3" :disable="!selectedTracking.signatureValidatedAt && !executeForm.signaturesSavedLocal" />
              </q-stepper-navigation>
            </q-step>

            <!-- Step 3: Finalizar -->
            <q-step :name="3" title="Finalizar Ejecución" icon="check_circle">
              <div class="q-pa-md bg-grey-2 rounded-borders text-center">
                <q-icon name="task_alt" size="4em" color="positive" class="q-mb-md" />
                <div class="text-h6 text-primary">Todo listo para ejecutar</div>
                <p class="text-caption text-grey-8">Al confirmar, el seguimiento quedará cerrado, se sumarán las horas a tu cuenta mensual y avanzará el progreso del aprendiz.</p>
                <q-btn color="positive" size="lg" label="Marcar como Ejecutado" @click="executeTracking" :loading="saving" class="q-mt-md" />
              </div>
              <q-stepper-navigation>
                <q-btn flat color="primary" label="Atrás" @click="executeStep = 2" />
              </q-stepper-navigation>
            </q-step>

          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>
    <!-- Modal: Subir Acta de Seguimiento (4 pasos) -->
    <q-dialog v-model="showUploadActaModal" persistent maximized>
      <q-card class="column">
        <q-card-section class="bg-green text-white row items-center q-pb-none">
          <div class="text-h6">Subir Acta de Seguimiento</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup @click="resetUploadActa">
            <q-tooltip>Cerrar</q-tooltip>
          </q-btn>
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <q-stepper v-model="actaStep" ref="actaStepper" color="green" animated flat bordered class="q-mx-auto" style="max-width: 800px;">

            <!-- Paso 1: Busqueda del Aprendiz -->
            <q-step :name="1" title="Buscar Aprendiz" icon="search" :done="actaStep > 1">
              <div class="q-pa-md">
                <p class="text-subtitle1 text-grey-8">Busca al aprendiz por nombre, apellido, documento o ficha.</p>

                <q-select
                  v-model="actaForm.selectedApprentice"
                  :options="apprenticeOptions"
                  :option-label="opt => `${opt.fullName} - ${opt.nationalId} - Ficha: ${opt.enrollmentNumber || 'N/D'}`"
                  option-value="_id"
                  label="Seleccionar Aprendiz"
                  outlined
                  use-input
                  input-debounce="300"
                  @filter="filterApprentices"
                  @update:model-value="onApprenticeSelected"
                  behavior="menu"
                  class="q-mb-md"
                >
                  <template v-slot:no-option>
                    <q-item><q-item-section class="text-grey">No se encontraron resultados</q-item-section></q-item>
                  </template>
                </q-select>

                <q-banner v-if="actaForm.selectedApprentice" class="bg-green-1 rounded-borders" dense>
                  <div class="text-weight-bold">{{ actaForm.selectedApprentice.fullName }}</div>
                  <div>Documento: {{ actaForm.selectedApprentice.nationalId }} | Ficha: {{ actaForm.selectedApprentice.enrollmentNumber || 'N/D' }}</div>
                  <div>Programa: {{ actaForm.selectedApprentice.program || 'N/D' }} | Nivel: {{ actaForm.apprenticeLevel || 'N/D' }}</div>
                  <div class="text-positive text-weight-bold q-mt-sm">Seguimientos requeridos: {{ actaForm.requiredTrackings }}</div>
                </q-banner>
              </div>
              <q-stepper-navigation>
                <q-btn color="green" label="Continuar" @click="actaStep = 2" :disable="!actaForm.selectedApprentice" />
              </q-stepper-navigation>
            </q-step>

            <!-- Paso 2: Seleccion del Numero de Seguimiento -->
            <q-step :name="2" title="Numero de Seguimiento" icon="format_list_numbered" :done="actaStep > 2">
              <div class="q-pa-md">
                <p class="text-subtitle1 text-grey-8">Selecciona el numero de seguimiento a subir.</p>

                <q-select
                  v-model="actaForm.selectedTrackingNumber"
                  :options="trackingNumberOptions"
                  label="Numero de Seguimiento"
                  outlined
                  emit-value
                  class="q-mb-md"
                  @update:model-value="onTrackingNumberSelected"
                />

                <q-banner v-if="actaForm.selectedTrackingNumber === 'extra'" class="bg-warning text-black rounded-borders q-mb-md">
                  <q-icon name="warning" size="sm" class="q-mr-sm" />
                  Los seguimientos extraordinarios requieren aprobacion del administrador.
                </q-banner>

                <q-banner v-if="actaForm.existingFileWarning" class="bg-orange-1 text-warning rounded-borders q-mb-md">
                  <q-icon name="warning" size="sm" class="q-mr-sm" />
                  {{ actaForm.existingFileWarning }}
                </q-banner>

                <q-banner v-if="actaForm.selectedTrackingNumber && !actaForm.existingFileWarning" class="bg-green-1 text-positive rounded-borders">
                  <q-icon name="check_circle" size="sm" class="q-mr-sm" />
                  No existe un archivo cargado para el seguimiento #{{ actaForm.selectedTrackingNumber }}. Puede continuar.
                </q-banner>

                <div class="q-mt-md" v-if="actaForm.selectedTrackingNumber && actaForm.selectedApprentice">
                  <p class="text-caption text-grey">
                    Nivel: {{ actaForm.apprenticeLevel }} — Seguimientos requeridos: {{ actaForm.requiredTrackings }}
                  </p>
                </div>
              </div>
              <q-stepper-navigation>
                <q-btn flat color="green" label="Atras" @click="actaStep = 1" class="q-mr-sm" />
                <q-btn color="green" label="Continuar" @click="actaStep = 3" :disable="!actaForm.selectedTrackingNumber || !!actaForm.existingFileWarning" />
              </q-stepper-navigation>
            </q-step>

            <!-- Paso 3: Subida del Archivo PDF -->
            <q-step :name="3" title="Subir PDF" icon="upload_file" :done="actaStep > 3 && actaForm.pdfUploaded">
              <div class="q-pa-md">
                <p class="text-subtitle1 text-grey-8">Carga el acta de seguimiento en formato PDF (maximo 10 MB).</p>

                <q-file
                  v-model="actaForm.file"
                  label="Seleccionar Acta PDF"
                  outlined
                  accept=".pdf"
                  :max-file-size="10485760"
                  @rejected="onFileRejected"
                  class="q-mb-md"
                >
                  <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
                  <template v-slot:append>
                    <q-icon v-if="actaForm.file" name="close" class="cursor-pointer" @click.stop="actaForm.file = null" />
                  </template>
                </q-file>

                <q-banner v-if="actaForm.fileError" class="bg-red-1 text-negative rounded-borders q-mb-md">
                  <q-icon name="error" size="sm" class="q-mr-sm" />{{ actaForm.fileError }}
                </q-banner>

                <q-btn color="green" label="Subir Documento" @click="uploadActaPDF" :loading="saving" :disable="!actaForm.file" />
                <q-chip v-if="actaForm.pdfUploaded" color="positive" icon="check_circle" label="PDF cargado correctamente" class="q-ml-md" />
              </div>
              <q-stepper-navigation>
                <q-btn flat color="green" label="Atras" @click="actaStep = 2" class="q-mr-sm" />
                <q-btn color="green" label="Continuar" @click="actaStep = 4" :disable="!actaForm.pdfUploaded" />
              </q-stepper-navigation>
            </q-step>

            <!-- Paso 4: Validacion con IA y Confirmar -->
            <q-step :name="4" title="Validacion IA" icon="psychology" :done="actaForm.aiValidated && actaForm.aiValid">
              <div class="q-pa-md">
                <p class="text-subtitle1 text-grey-8">Verifica el documento con inteligencia artificial antes de confirmar.</p>

                <q-banner v-if="!actaForm.aiValidated" class="bg-blue-1 rounded-borders q-mb-md">
                  <q-icon name="info" size="sm" class="q-mr-sm" />
                  Presiona <strong>"Verificar con IA"</strong> para analizar el documento. No podras continuar sin esta validacion.
                </q-banner>

                <q-banner v-if="actaForm.aiValidated && actaForm.aiValid" class="bg-green-1 text-positive rounded-borders q-mb-md">
                  <q-icon name="check_circle" size="sm" class="q-mr-sm" />
                  <strong>Validacion exitosa:</strong> {{ actaForm.aiMessage }}
                </q-banner>

                <q-banner v-if="actaForm.aiValidated && !actaForm.aiValid" class="bg-red-1 text-negative rounded-borders q-mb-md">
                  <q-icon name="error" size="sm" class="q-mr-sm" />
                  <strong>Validacion fallida:</strong> {{ actaForm.aiMessage }}
                </q-banner>

                <div v-if="actaForm.aiDetails" class="q-mb-md">
                  <q-card flat bordered class="bg-grey-1">
                    <q-card-section>
                      <div class="text-caption text-grey">Detalles de validacion:</div>
                      <div v-if="actaForm.aiDetails.pages">Paginas: {{ actaForm.aiDetails.pages }}</div>
                      <div v-if="actaForm.aiDetails.wordCount">Palabras detectadas: {{ actaForm.aiDetails.wordCount }}</div>
                      <div v-if="actaForm.aiDetails.score !== undefined">Puntaje: {{ actaForm.aiDetails.score }}/100</div>
                      <div v-if="actaForm.aiDetails.foundRequired">Keywords requeridas: {{ actaForm.aiDetails.foundRequired?.join(', ') }}</div>
                      <div v-if="actaForm.aiDetails.method">Metodo: {{ actaForm.aiDetails.method }}</div>
                      <div v-if="actaForm.aiDetails.suggestion" class="text-orange q-mt-sm">{{ actaForm.aiDetails.suggestion }}</div>
                    </q-card-section>
                  </q-card>
                </div>

                <div class="row q-gutter-md">
                  <q-btn color="purple" icon="psychology" label="Verificar con IA" @click="validateActaWithAI" :loading="actaForm.validatingAI" :disable="actaForm.aiValidated && actaForm.aiValid" />
                  <q-btn v-if="actaForm.aiValidated && !actaForm.aiValid" color="orange" outline label="Volver a Intentar" @click="resetAIValidation" />
                </div>
              </div>
              <q-stepper-navigation>
                <q-btn flat color="green" label="Atras" @click="actaStep = 3" class="q-mr-sm" />
                <q-btn color="green" size="lg" label="Confirmar y Guardar" @click="confirmActaUpload" :loading="saving" :disable="!actaForm.aiValidated || !actaForm.aiValid" />
              </q-stepper-navigation>
            </q-step>

          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, onActivated } from 'vue';
import trackingService from '../../api/tracking.service';
import productiveStageService from '../../api/productiveStage.service';
import { userService } from '../../api/user.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const trackings = ref([]);
const myEPs = ref([]); // List of active EPs assigned to instructor
const loading = ref(false);
const filterStatus = ref(null);
const showExtraordinary = ref(false);
const pagination = ref({ page: 1, rowsPerPage: 20, rowsNumber: 0 });

const statusOptions = [
  { label: 'Programados', value: 'SCHEDULED' },
  { label: 'Ejecutados', value: 'EXECUTED' },
  { label: 'Cerrados (Pagados)', value: 'PAID' }
];

const columns = [
  { name: 'apprentice', label: 'Aprendiz', field: 'apprentice', align: 'left' },
  { name: 'trackingNumber', label: 'Seguimiento', field: 'trackingNumber', align: 'left' },
  { name: 'scheduledDate', label: 'Fecha Programada', field: row => formatDate(row.scheduledDate), align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

// Modals State
const showCreateModal = ref(false);
const showExtraordinaryModal = ref(false);
const saving = ref(false);

const form = ref({
  productiveStageId: '',
  type: 'IN_PERSON',
  scheduledDate: '',
  notes: '',
  extraordinaryReason: ''
});

// Execution Flow State
const showExecuteModal = ref(false);
const selectedTracking = ref(null);
const executeStep = ref(1);
const executeForm = ref({
  file: null,
  signedByInstructor: false,
  signedByApprentice: false,
  signaturesSavedLocal: false
});

// Upload Acta Flow State
const showUploadActaModal = ref(false);
const actaStep = ref(1);
const actaForm = ref({
  selectedApprentice: null,
  apprenticeLevel: '',
  requiredTrackings: 0,
  selectedTrackingNumber: null,
  isExtraordinary: false,
  existingFileWarning: '',
  file: null,
  fileError: '',
  pdfUploaded: false,
  aiValidated: false,
  aiValid: false,
  aiMessage: '',
  aiDetails: null,
  validatingAI: false,
  uploadedTrackingId: null
});
const apprenticeOptions = ref([]);

let pollInterval = null;

onMounted(() => {
  fetchTrackings();
  fetchMyEPs();
  pollInterval = setInterval(fetchTrackings, 60000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

onActivated(() => {
  fetchTrackings();
  fetchMyEPs();
});

async function fetchTrackings() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage
    };
    if (filterStatus.value) params.status = filterStatus.value;
    if (showExtraordinary.value) params.isExtraordinary = true;

    // El interceptor de Axios devuelve el body JSON: { success, message, data: { trackings, pagination } }
    const body = await trackingService.getTrackings(params);
    trackings.value = body.data?.trackings || body.data || [];
    if (body.data?.pagination?.total) pagination.value.rowsNumber = body.data.pagination.total;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar seguimientos.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  pagination.value.page = props.pagination.page;
  pagination.value.rowsPerPage = props.pagination.rowsPerPage;
  fetchTrackings();
}

async function fetchMyEPs() {
  try {
    // Instructor fetches all EPs (backend scopes to their assigned ones)
    // El backend retorna data: { eps, pagination }, el interceptor devuelve ese body
    const body = await productiveStageService.getAllEPs({ status: 'ACTIVE', limit: 100 });
    myEPs.value = body.data?.eps || body.data || [];
  } catch (error) {
    console.error('Error fetching EPs', error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar etapas productivas.', position: 'top', timeout: 5000 });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function getStatusColor(status) {
  switch(status) {
    case 'SCHEDULED': return 'info';
    case 'EXECUTED': return 'positive';
    case 'PAID': return 'purple';
    default: return 'grey';
  }
}

function getStatusLabel(status) {
  switch(status) {
    case 'SCHEDULED': return 'Programado';
    case 'EXECUTED': return 'Ejecutado';
    case 'PAID': return 'Finalizado';
    default: return status;
  }
}

function resetForm() {
  form.value = {
    productiveStageId: '',
    type: 'IN_PERSON',
    scheduledDate: '',
    notes: '',
    extraordinaryReason: ''
  };
}

function openCreateModal() {
  resetForm();
  form.value.type = 'IN_PERSON';
  fetchMyEPs();
  showCreateModal.value = true;
}

function openExtraordinaryModal() {
  resetForm();
  form.value.type = 'EXTRAORDINARY';
  fetchMyEPs();
  showExtraordinaryModal.value = true;
}

async function createTracking() {
  saving.value = true;
  try {
    const payload = {
      productiveStageId: form.value.productiveStageId,
      type: form.value.type,
      scheduledDate: form.value.scheduledDate,
      notes: form.value.notes.trim()
    };
    await trackingService.create(payload);
    $q.notify({ type: 'positive', message: 'Seguimiento programado con éxito.', position: 'top', timeout: 5000 });
    showCreateModal.value = false;
    fetchTrackings();
  } catch (error) {
    console.error(error);
    // El interceptor transforma el error: { message, status, errors }
    $q.notify({ type: 'negative', message: error.message || 'Error al programar seguimiento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

async function requestExtraordinary() {
  saving.value = true;
  try {
    const payload = {
      productiveStageId: form.value.productiveStageId,
      type: form.value.type,
      scheduledDate: form.value.scheduledDate,
      extraordinaryReason: form.value.extraordinaryReason.trim()
    };
    await trackingService.requestExtraordinary(payload);
    $q.notify({ type: 'positive', message: 'Solicitud enviada a coordinación.', position: 'top', timeout: 5000 });
    showExtraordinaryModal.value = false;
    fetchTrackings();
  } catch (error) {
    console.error(error);
    // El interceptor transforma el error: { message, status, errors }
    $q.notify({ type: 'negative', message: error.message || 'Error al solicitar seguimiento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

function openExecuteModal(tracking) {
  selectedTracking.value = tracking;
  executeStep.value = tracking.driveFileUrl ? 2 : 1;
  executeForm.value = {
    file: null,
    signedByInstructor: tracking.signedByInstructor || false,
    signedByApprentice: tracking.signedByApprentice || false,
    signaturesSavedLocal: false
  };
  showExecuteModal.value = true;
}

async function uploadPDF() {
  if (!executeForm.value.file) return;
  saving.value = true;
  try {
    const fd = new FormData();
    fd.append('file', executeForm.value.file);
    // El interceptor devuelve el body JSON: { success, message, data }
    const body = await trackingService.uploadPDF(selectedTracking.value._id, fd);
    selectedTracking.value.driveFileUrl = body.data?.driveFileUrl;
    $q.notify({ type: 'positive', message: 'Documento subido correctamente.', position: 'top', timeout: 5000 });
    executeStep.value = 2;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al subir documento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

async function validateSignatures() {
  saving.value = true;
  try {
    await trackingService.validateSignature(selectedTracking.value._id, {
      signedByInstructor: executeForm.value.signedByInstructor,
      signedByApprentice: executeForm.value.signedByApprentice
    });
    executeForm.value.signaturesSavedLocal = true;
    selectedTracking.value.signatureValidatedAt = new Date().toISOString();
    $q.notify({ type: 'positive', message: 'Firmas validadas correctamente.', position: 'top', timeout: 5000 });
    executeStep.value = 3;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al validar firmas.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

async function executeTracking() {
  saving.value = true;
  try {
    await trackingService.execute(selectedTracking.value._id);
    $q.notify({ type: 'positive', message: 'Seguimiento ejecutado exitosamente. Horas asignadas.', position: 'top', timeout: 5000 });
    showExecuteModal.value = false;
    fetchTrackings();
  } catch (error) {
    console.error(error);
    // El interceptor transforma el error: { message, status, errors }
    $q.notify({ type: 'negative', message: error.message || 'Error al ejecutar seguimiento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

async function markAsPaid(tracking) {
  $q.dialog({
    title: 'Confirmar pago',
    message: `¿Está seguro de marcar el Seguimiento #${tracking.trackingNumber} de ${tracking.apprentice?.fullName} como pagado? Esta acción no se puede deshacer.`,
    cancel: 'Cancelar',
    ok: 'Sí, marcar como pagado',
    persistent: true,
    color: 'purple'
  }).onOk(async () => {
    try {
      await trackingService.markPaid(tracking._id);
      $q.notify({ type: 'positive', message: 'Seguimiento marcado como pagado.', position: 'top', timeout: 5000 });
      fetchTrackings();
    } catch (error) {
      console.error(error);
      $q.notify({ type: 'negative', message: error.message || 'Error al marcar como pagado.', position: 'top', timeout: 5000 });
    }
  });
}

function viewDetails(tracking) {
  if (tracking.driveFileUrl) {
    window.open(tracking.driveFileUrl, '_blank');
  } else {
    $q.notify({ type: 'info', message: 'Este seguimiento no tiene un documento adjunto.', position: 'top', timeout: 5000 });
  }
}

// ============ Upload Acta Flow ============

function resetUploadActa() {
  actaStep.value = 1;
  actaForm.value = {
    selectedApprentice: null,
    apprenticeLevel: '',
    requiredTrackings: 0,
    selectedTrackingNumber: null,
    isExtraordinary: false,
    existingFileWarning: '',
    file: null,
    fileError: '',
    pdfUploaded: false,
    aiValidated: false,
    aiValid: false,
    aiMessage: '',
    aiDetails: null,
    validatingAI: false,
    uploadedTrackingId: null
  };
  apprenticeOptions.value = [];
}

function openUploadActaModal() {
  resetUploadActa();
  showUploadActaModal.value = true;
}

async function filterApprentices(val, update) {
  if (!val || val.length < 2) {
    update(() => { apprenticeOptions.value = []; });
    return;
  }
  try {
    const search = val.toLowerCase();
    const body = await userService.getApprentices({ search, limit: 20 });
    const apprentices = body.data?.apprentices || body.data || [];
    update(() => { apprenticeOptions.value = apprentices; });
  } catch (error) {
    console.error('Error buscando aprendices:', error);
    update(() => { apprenticeOptions.value = []; });
  }
}

function onApprenticeSelected(apprentice) {
  if (!apprentice) return;

  const level = apprentice.trainingLevel || 'TECHNOLOGIST';
  actaForm.value.apprenticeLevel = level === 'TECHNICIAN' ? 'TECNICO' : 'TECNOLOGO';

  // Required trackings: 3 for TECH/TECHNOLOGIST, 2 for OPERATOR
  if (level === 'TECHNICIAN' || level === 'TECHNOLOGIST') {
    actaForm.value.requiredTrackings = 3;
  } else {
    actaForm.value.requiredTrackings = 2;
  }

  actaForm.value.selectedTrackingNumber = null;
  actaForm.value.existingFileWarning = '';
}

const trackingNumberOptions = computed(() => {
  const max = actaForm.value.requiredTrackings;
  const options = [];
  for (let i = 1; i <= max; i++) {
    options.push({ label: `Seguimiento #${i}`, value: i });
  }
  options.push({ label: 'Seguimiento Extraordinario', value: 'extra' });
  return options;
});

function onTrackingNumberSelected(val) {
  actaForm.value.isExtraordinary = (val === 'extra');
  checkExistingTracking();
}

function onFileRejected(rejectedEntries) {
  const entry = rejectedEntries[0];
  if (entry) {
    const reason = entry.failedPropValidation;
    if (reason === 'max-file-size') {
      actaForm.value.fileError = 'El archivo excede el peso maximo de 10 MB.';
    } else if (reason === 'accept') {
      actaForm.value.fileError = 'Solo se permiten archivos PDF.';
    } else {
      actaForm.value.fileError = 'Archivo no valido.';
    }
  }
}

async function checkExistingTracking() {
  const selectedApprentice = actaForm.value.selectedApprentice;
  const trackingNum = actaForm.value.selectedTrackingNumber;
  if (!selectedApprentice || !trackingNum) return;

  actaForm.value.existingFileWarning = '';
  try {
    const myEPsBody = await productiveStageService.getAllEPs({ limit: 100 });
    const eps = myEPsBody.data?.eps || myEPsBody.data || [];
    const ep = eps.find(e => {
      const appId = typeof e.apprentice === 'object' ? e.apprentice._id : e.apprentice;
      return appId === selectedApprentice._id;
    });

    if (!ep) {
      actaForm.value.existingFileWarning = 'No se encontro una etapa productiva activa para este aprendiz.';
      return;
    }

    const summaryBody = await trackingService.getSummary(ep._id);
    const trackings = summaryBody.data?.trackings || [];

    let existing;
    if (trackingNum === 'extra') {
      // Check if any extraordinary tracking already has a file
      existing = trackings.find(t => t.isExtraordinary && (t.driveFileUrl || t.driveFileId));
      if (existing) {
        actaForm.value.existingFileWarning = `Ya existe un seguimiento extraordinario con archivo cargado. No es posible reemplazarlo desde esta seccion.`;
      }
    } else {
      existing = trackings.find(t =>
        t.trackingNumber === trackingNum &&
        !t.isExtraordinary &&
        (t.driveFileUrl || t.driveFileId)
      );
      if (existing) {
        actaForm.value.existingFileWarning = `El seguimiento #${trackingNum} ya tiene un archivo cargado. No es posible reemplazarlo desde esta seccion.`;
      }
    }

    // Also check if a tracking without file exists (can reuse)
    if (!actaForm.value.existingFileWarning) {
      let existingWithoutFile;
      if (trackingNum === 'extra') {
        existingWithoutFile = trackings.find(t => t.isExtraordinary);
      } else {
        existingWithoutFile = trackings.find(t => t.trackingNumber === trackingNum && !t.isExtraordinary);
      }
      if (existingWithoutFile) {
        actaForm.value.uploadedTrackingId = existingWithoutFile._id;
      } else {
        actaForm.value.uploadedTrackingId = null;
      }
    }
  } catch (error) {
    console.error('Error verificando seguimiento existente:', error);
  }
}

async function uploadActaPDF() {
  if (!actaForm.value.file) return;
  saving.value = true;
  actaForm.value.fileError = '';
  try {
    const fd = new FormData();
    fd.append('file', actaForm.value.file);

    // If we already found an existing tracking in step 2, use its ID
    if (actaForm.value.uploadedTrackingId) {
      const body = await trackingService.uploadPDF(actaForm.value.uploadedTrackingId, fd);
      actaForm.value.pdfUploaded = true;
      $q.notify({ type: 'positive', message: 'Documento subido correctamente.', position: 'top', timeout: 5000 });
      return;
    }

    // No existing tracking, need to create one first
    const selectedApprentice = actaForm.value.selectedApprentice;
    const myEPsBody = await productiveStageService.getAllEPs({ limit: 100 });
    const eps = myEPsBody.data?.eps || myEPsBody.data || [];
    const ep = eps.find(e => {
      const appId = typeof e.apprentice === 'object' ? e.apprentice._id : e.apprentice;
      return appId === selectedApprentice._id;
    });

    if (!ep) {
      $q.notify({ type: 'negative', message: 'No se encontro una etapa productiva activa para este aprendiz.', position: 'top', timeout: 5000 });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const payload = {
      productiveStageId: ep._id,
      type: 'IN_PERSON',
      scheduledDate: today
    };

    let createBody;
    if (actaForm.value.isExtraordinary) {
      createBody = await trackingService.requestExtraordinary({
        ...payload,
        extraordinaryReason: 'Acta de seguimiento extraordinario cargada por el instructor.'
      });
    } else {
      createBody = await trackingService.create(payload);
    }

    const newTracking = createBody.data?.tracking || createBody.data;
    if (newTracking) {
      const uploadBody = await trackingService.uploadPDF(newTracking._id, fd);
      actaForm.value.uploadedTrackingId = newTracking._id;
      actaForm.value.pdfUploaded = true;
      $q.notify({ type: 'positive', message: 'Documento subido correctamente.', position: 'top', timeout: 5000 });
    }
  } catch (error) {
    console.error(error);
    actaForm.value.fileError = error.message || 'Error al subir el documento.';
    $q.notify({ type: 'negative', message: error.message || 'Error al subir documento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

async function validateActaWithAI() {
  if (!actaForm.value.file) return;
  actaForm.value.validatingAI = true;
  try {
    const fd = new FormData();
    fd.append('file', actaForm.value.file);

    const body = await trackingService.validatePDF(fd);
    const result = body.data || body;

    actaForm.value.aiValidated = true;
    actaForm.value.aiValid = result.valid;
    actaForm.value.aiMessage = result.message || '';
    actaForm.value.aiDetails = result.details || null;

    if (result.valid) {
      $q.notify({ type: 'positive', message: 'Validacion IA exitosa.', position: 'top', timeout: 5000 });
    } else {
      $q.notify({ type: 'negative', message: 'La validacion IA encontro problemas. Corrija el archivo e intente de nuevo.', position: 'top', timeout: 5000 });
    }
  } catch (error) {
    console.error(error);
    actaForm.value.aiValidated = true;
    actaForm.value.aiValid = false;
    actaForm.value.aiMessage = error.message || 'Error al validar con IA.';
    $q.notify({ type: 'negative', message: 'Error al validar con IA.', position: 'top', timeout: 5000 });
  } finally {
    actaForm.value.validatingAI = false;
  }
}

function resetAIValidation() {
  actaForm.value.aiValidated = false;
  actaForm.value.aiValid = false;
  actaForm.value.aiMessage = '';
  actaForm.value.aiDetails = null;
}

async function confirmActaUpload() {
  if (!actaForm.value.uploadedTrackingId) {
    $q.notify({ type: 'warning', message: 'Primero sube el documento PDF.', position: 'top', timeout: 5000 });
    return;
  }
  saving.value = true;
  try {
    if (actaForm.value.isExtraordinary) {
      $q.notify({
        type: 'positive',
        message: 'Acta de seguimiento extraordinario subida correctamente. El administrador debe aprobarla antes de ejecutarse.',
        position: 'top',
        timeout: 8000
      });
    } else {
      await trackingService.execute(actaForm.value.uploadedTrackingId);
      $q.notify({ type: 'positive', message: 'Acta de seguimiento guardada y ejecutada exitosamente.', position: 'top', timeout: 5000 });
    }
    showUploadActaModal.value = false;
    resetUploadActa();
    fetchTrackings();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al confirmar el acta.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.manage-trackings-container {
  max-width: 1300px;
  margin: 0 auto;
}
</style>
