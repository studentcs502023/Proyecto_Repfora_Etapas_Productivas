<template>
  <div class="manage-trackings-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content text-white">
        <div class="row items-center justify-between">
          <div>
            <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
              <q-icon name="co_present" class="q-mr-sm" size="md"/>Gestión de Seguimientos
            </h2>
            <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">
              Registra, programa y ejecuta los seguimientos obligatorios de tus aprendices.
            </p>
          </div>
          <div class="row q-gutter-sm">
            <q-btn color="warning" unelevated rounded icon="warning" label="Extraordinario" class="action-header-btn" @click="openExtraordinaryModal" />
            <q-btn color="white" text-color="primary" unelevated rounded icon="add" label="Programar Seguimiento" class="action-header-btn" @click="openCreateModal" />
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Card -->
    <q-card flat class="filter-card q-mb-lg">
      <q-card-section class="q-pa-md row q-col-gutter-md items-center">
        <div class="col-12 col-sm-6">
          <q-input
            v-model="searchFilter"
            dense
            outlined
            placeholder="Buscar por nombre, ficha o programa..."
            debounce="300"
            clearable
            color="primary"
          >
            <template v-slot:prepend><q-icon name="search" color="primary" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-6">
          <q-select
            v-model="filterModality"
            :options="modalityOptions"
            label="Filtrar por Modalidad"
            outlined
            dense
            emit-value
            map-options
            clearable
            color="primary"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat class="table-card">
      <q-table
        :rows="filteredApprentices"
        :columns="apprenticeColumns"
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
              <q-avatar size="36px" color="primary" text-color="white" class="q-mr-md avatar-initial">
                {{ props.row.fullName?.charAt(0) || '?' }}
              </q-avatar>
              <div>
                <div class="text-weight-bold text-grey-9">{{ props.row.firstNameAndLast }}</div>
                <div class="text-caption text-grey-5">Ficha: {{ props.row.enrollmentNumber }}</div>
              </div>
            </div>
          </q-td>
        </template>

        <template v-slot:body-cell-documento="props">
          <q-td :props="props">
            <span class="text-weight-medium text-grey-8">{{ props.row.nationalId }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-etapaProductiva="props">
          <q-td :props="props">
            <q-chip dense size="sm" color="green-1" text-color="green-9" class="text-weight-bold">
              {{ getModalityLabel(props.row.modality) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-seguimientos="props">
          <q-td :props="props">
            <div class="row items-center justify-between no-wrap q-mb-xs">
              <span class="text-weight-bold text-primary">{{ props.row.completedTrackings }} / {{ props.row.requiredTrackings }}</span>
              <span class="text-caption text-grey-6">{{ Math.round((props.row.completedTrackings / props.row.requiredTrackings) * 100) }}%</span>
            </div>
            <q-linear-progress
              :value="props.row.requiredTrackings > 0 ? props.row.completedTrackings / props.row.requiredTrackings : 0"
              :color="props.row.completedTrackings >= props.row.requiredTrackings ? 'positive' : 'warning'"
              size="6px"
              rounded
            />
          </q-td>
        </template>

        <template v-slot:body-cell-nivel="props">
          <q-td :props="props">
            <q-badge :color="props.row.trainingLevel === 'TECHNOLOGIST' ? 'secondary' : 'info'" :label="props.row.trainingLevelLabel" class="badge-pill q-px-sm" />
          </q-td>
        </template>

        <template v-slot:body-cell-observaciones="props">
          <q-td :props="props" class="text-center">
            <q-btn
              size="sm"
              color="warning"
              unelevated
              rounded
              icon="chat"
              label="Observaciones"
              @click="openObservationsModal(props.row)"
              class="action-table-btn"
            >
              <q-badge
                v-if="props.row.comments?.length"
                color="red"
                floating
                :label="props.row.comments.length"
              />
            </q-btn>
          </q-td>
        </template>

        <template v-slot:body-cell-archivos="props">
          <q-td :props="props" class="text-center">
            <q-btn
              size="sm"
              color="primary"
              unelevated
              rounded
              icon="folder_open"
              label="Ver Actas"
              @click="openFilesModal(props.row)"
              class="action-table-btn"
            />
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width column flex-center text-grey q-pa-xl">
            <q-icon name="group_off" size="5em" color="grey-4" class="q-mb-md" />
            <div class="text-h6 text-grey-6">No hay aprendices asignados</div>
            <div class="text-caption">No se encontraron registros de aprendices bajo tu supervisión.</div>
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Observaciones (Chat) -->
    <q-dialog v-model="showObservationsModal" persistent transition-show="scale" transition-hide="scale">
      <q-card style="width: 600px; max-width: 90vw; border-radius: 20px;" class="overflow-hidden">
        <div class="bg-warning text-white q-pa-md row items-center justify-between">
          <div>
            <div class="text-h6 text-weight-bold"><q-icon name="chat" class="q-mr-xs"/> Observaciones</div>
            <div class="text-caption opacity-80">{{ selectedApprenticeForObs?.firstNameAndLast }}</div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup color="white" />
        </div>

        <q-card-section class="q-pa-md bg-grey-1" style="max-height: 400px; overflow-y: auto;">
          <div v-if="!observationsList.length" class="text-center text-grey q-pa-xl">
            <q-icon name="chat_bubble_outline" size="4em" color="grey-4" class="q-mb-md" />
            <div class="text-h6 text-grey-6">Sin observaciones registradas</div>
            <div class="text-caption">Los comentarios del instructor y administración aparecerán aquí.</div>
          </div>

          <div v-else class="q-gutter-y-md">
            <q-chat-message
              v-for="(comment, idx) in observationsList"
              :key="idx"
              :name="getCommentAuthorName(comment)"
              :text="[comment.text]"
              :sent="isMyComment(comment)"
              :stamp="formatDateTime(comment.createdAt)"
              :bg-color="isMyComment(comment) ? 'green-2' : 'white'"
              :text-color="isMyComment(comment) ? 'green-10' : 'grey-9'"
              size="10"
            />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-md bg-white">
          <div class="row q-col-gutter-sm items-end">
            <div class="col">
              <q-input
                v-model="newObservation"
                label="Agregar observación..."
                type="textarea"
                outlined
                dense
                rows="2"
                autogrow
                color="primary"
                :disable="savingObs"
              />
            </div>
            <div class="col-auto">
              <q-btn
                color="primary"
                icon="send"
                label="Enviar"
                rounded
                unelevated
                @click="addObservation"
                :loading="savingObs"
                :disable="!newObservation.trim()"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal: Seguimientos y Archivos -->
    <q-dialog v-model="showFilesModal" persistent transition-show="scale" transition-hide="scale">
      <q-card style="width: 700px; max-width: 90vw; border-radius: 20px;" class="overflow-hidden">
        <div class="bg-primary text-white q-pa-md row items-center justify-between">
          <div>
            <div class="text-h6 text-weight-bold"><q-icon name="folder" class="q-mr-xs"/> Seguimientos del Aprendiz</div>
            <div class="text-caption opacity-80">{{ selectedApprenticeForFiles?.firstNameAndLast }}</div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup color="white" />
        </div>

        <q-card-section class="q-pa-md bg-grey-1" style="max-height: 450px; overflow-y: auto;">
          <div v-if="filesLoading" class="text-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
            <div class="text-grey-6 q-mt-sm">Cargando seguimientos...</div>
          </div>

          <div v-else-if="!filesList.length" class="text-center text-grey q-pa-xl">
            <q-icon name="folder_off" size="4em" color="grey-4" class="q-mb-md" />
            <div class="text-h6 text-grey-6">Sin seguimientos registrados</div>
            <div class="text-caption">No hay seguimientos vigentes o programados para este aprendiz.</div>
          </div>

          <q-list v-else separator class="bg-white rounded-borders border-dashed-container">
            <q-item v-for="(file, idx) in filesList" :key="idx" class="q-py-md tracking-item">
              <q-item-section avatar>
                <q-avatar :color="file.status === 'SCHEDULED' ? 'orange-1' : 'green-1'" :text-color="file.status === 'SCHEDULED' ? 'orange' : 'green'">
                  <q-icon :name="file.status === 'SCHEDULED' ? 'event' : 'task_alt'" />
                </q-avatar>
              </q-item-section>
              
              <q-item-section>
                <q-item-label class="text-weight-bold text-grey-9">
                  Seguimiento #{{ file.trackingNumber }}
                  <q-badge v-if="file.isExtraordinary" color="warning" label="Extraordinario" class="q-ml-sm" />
                </q-item-label>
                <q-item-label caption class="text-grey-7">
                  {{ file.fileName || 'Acta de Seguimiento' }}
                </q-item-label>
                <q-item-label caption class="text-grey-5">
                  Fecha: {{ formatDateTime(file.uploadedAt || file.executedDate) }}
                </q-item-label>
                <q-item-label caption>
                  Estado: 
                  <q-badge :color="file.status === 'SCHEDULED' ? 'orange' : 'green'" class="q-ml-xs">
                    {{ getStatusLabel(file.status) }}
                  </q-badge>
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <div class="row q-gutter-xs">
                  <!-- Execute Button for Scheduled trackings -->
                  <q-btn
                    v-if="file.status === 'SCHEDULED'"
                    size="sm"
                    color="primary"
                    rounded
                    unelevated
                    label="Ejecutar"
                    icon="play_arrow"
                    @click="openExecuteModal(file)"
                  />
                  <!-- Preview and Download for executed trackings -->
                  <template v-else>
                    <q-btn
                      v-if="file.driveFileUrl"
                      size="sm"
                      flat
                      round
                      color="primary"
                      icon="visibility"
                      @click="previewFile(file)"
                    >
                      <q-tooltip>Visualizar en Drive</q-tooltip>
                    </q-btn>
                    <q-btn
                      v-if="file.driveFileUrl"
                      size="sm"
                      flat
                      round
                      color="secondary"
                      icon="download"
                      @click="downloadFile(file)"
                    >
                      <q-tooltip>Descargar PDF</q-tooltip>
                    </q-btn>
                  </template>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal: Programar (Ordinario) -->
    <q-dialog v-model="showCreateModal" persistent transition-show="scale" transition-hide="scale">
      <q-card style="width: 500px; max-width: 90vw; border-radius: 20px;" class="overflow-hidden">
        <q-form @submit="createTracking">
          <div class="bg-primary text-white q-pa-md">
            <div class="text-h6 text-weight-bold"><q-icon name="event" class="q-mr-xs"/> Programar Seguimiento</div>
          </div>

          <q-card-section class="q-pa-lg q-gutter-y-md bg-grey-1">
            <q-select
              v-model="form.productiveStageId"
              :options="myEPsSinContrato"
              option-value="_id"
              :option-label="opt => `${opt.apprentice?.fullName} - ${opt.companySnapshot?.companyName || 'Sin empresa'}`"
              label="Seleccionar Aprendiz / Etapa"
              outlined dense emit-value map-options
              color="primary"
              bg-color="white"
              :rules="[val => !!val || 'Requerido']"
            />

            <q-select
              v-model="form.type"
              :options="[{label:'Presencial', value:'IN_PERSON'}, {label:'Virtual', value:'VIRTUAL'}]"
              label="Tipo de Seguimiento"
              outlined dense emit-value map-options
              color="primary"
              bg-color="white"
              :rules="[val => !!val || 'Requerido']"
            />

            <q-input v-model="form.scheduledDate" label="Fecha Programada" type="date" outlined dense color="primary" bg-color="white" :rules="[val => !!val || 'Requerido']" />

            <q-input v-model="form.notes" label="Notas / Detalles (Opcional)" type="textarea" outlined dense rows="3" color="primary" bg-color="white" />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md bg-white">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Programar" rounded unelevated type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Solicitar Extraordinario -->
    <q-dialog v-model="showExtraordinaryModal" persistent transition-show="scale" transition-hide="scale">
      <q-card style="width: 500px; max-width: 90vw; border-radius: 20px;" class="overflow-hidden">
        <q-form @submit="requestExtraordinary">
          <div class="bg-warning text-white q-pa-md">
            <div class="text-h6 text-weight-bold"><q-icon name="warning" class="q-mr-xs"/> Solicitar Seg. Extraordinario</div>
          </div>

          <q-card-section class="q-pa-lg q-gutter-y-md bg-grey-1">
            <q-banner class="bg-orange-1 text-warning rounded-borders text-caption q-mb-md">
              <q-icon name="info" class="q-mr-xs"/> Los seguimientos extraordinarios requieren la aprobación de la coordinación antes de ser ejecutados.
            </q-banner>

            <q-select
              v-model="form.productiveStageId"
              :options="myEPs"
              option-value="_id"
              :option-label="opt => `${opt.apprentice?.fullName} - ${opt.companySnapshot?.companyName || 'Sin empresa'}`"
              label="Seleccionar Aprendiz / Etapa"
              outlined dense emit-value map-options
              color="primary"
              bg-color="white"
              :rules="[val => !!val || 'Requerido']"
            />

            <q-select
              v-model="form.type"
              :options="[{label:'Extraordinario (Presencial)', value:'EXTRAORDINARY'}, {label:'Virtual', value:'VIRTUAL'}, {label:'Presencial', value:'IN_PERSON'}]"
              label="Tipo Base"
              outlined dense emit-value map-options
              color="primary"
              bg-color="white"
              :rules="[val => !!val || 'Requerido']"
            />

            <q-input v-model="form.scheduledDate" label="Fecha Propuesta" type="date" outlined dense color="primary" bg-color="white" :rules="[val => !!val || 'Requerido']" />

            <q-input v-model="form.extraordinaryReason" label="Motivo de la solicitud *" type="textarea" outlined dense rows="4"
                     placeholder="Explique detalladamente por qué se requiere este seguimiento extra..."
                     color="primary"
                     bg-color="white"
                     :rules="[val => !!val && val.length >= 50 || 'Requerido. Mínimo 50 caracteres.']" />
          </q-card-section>

          <q-card-actions align="right" class="q-pa-md bg-white">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="warning" text-color="black" label="Enviar Solicitud" rounded unelevated type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Ejecutar Seguimiento -->
    <q-dialog v-model="showExecuteModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card v-if="selectedTracking" class="column modal-card">
        <div class="modal-header">
          <div class="cover-overlay-sm"></div>
          <div class="row items-center q-pa-lg text-white" style="position:relative;z-index:1">
            <q-avatar size="48px" color="white" text-color="primary" class="q-mr-md text-weight-bolder" style="font-size:20px">
              {{ selectedTracking.apprentice?.fullName?.charAt(0) || '?' }}
            </q-avatar>
            <div class="col">
              <div class="text-h5 text-weight-bolder">
                Ejecutar Seguimiento #{{ selectedTracking.trackingNumber }}
              </div>
              <div class="text-caption opacity-80">{{ selectedTracking.apprentice?.fullName }}</div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup color="white">
              <q-tooltip>Cerrar</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-card-section class="col q-pa-lg scroll bg-grey-1">
          <q-stepper v-model="executeStep" ref="stepper" color="primary" animated flat class="q-mx-auto stepper-custom" style="max-width: 800px;">

            <q-step :name="1" title="Subir Acta Firmada" icon="upload_file" :done="executeStep > 1 || !!selectedTracking.driveFileUrl">
              <div class="q-pa-md bg-white rounded-borders shadow-1">
                <p class="text-subtitle1 text-grey-8 text-weight-medium">Sube el documento PDF del seguimiento con las firmas correspondientes.</p>
                <div v-if="selectedTracking.driveFileUrl" class="bg-green-1 q-pa-md rounded-borders q-mb-md text-positive flex items-center">
                  <q-icon name="check_circle" size="sm" class="q-mr-sm" /> Documento subido previamente. Puedes reemplazarlo o continuar.
                </div>

                <q-file v-model="executeForm.file" label="Seleccionar Acta PDF" outlined accept=".pdf" class="q-mb-md" color="primary">
                  <template v-slot:prepend><q-icon name="picture_as_pdf" color="primary" /></template>
                </q-file>

                <q-btn color="primary" label="Subir Documento" rounded unelevated @click="uploadPDF" :loading="saving" :disable="!executeForm.file" class="q-px-md" />

                <div v-if="selectedTracking.driveFileUrl" class="q-mt-md">
                  <q-separator class="q-my-md" />
                  <p class="text-subtitle1 text-grey-8 text-weight-medium">Validar documento con inteligencia artificial</p>

                  <q-banner v-if="!executeForm.aiValidated" class="bg-blue-1 rounded-borders q-mb-md">
                    <q-icon name="info" size="sm" class="q-mr-sm" />
                    Presiona <strong>"Verificar con IA"</strong> para analizar el documento.
                  </q-banner>

                  <q-banner v-if="executeForm.aiValidated && executeForm.aiValid" class="bg-green-1 text-positive rounded-borders q-mb-md">
                    <q-icon name="check_circle" size="sm" class="q-mr-sm" />
                    <strong>Validación exitosa:</strong> {{ executeForm.aiMessage }}
                  </q-banner>

                  <q-banner v-if="executeForm.aiValidated && !executeForm.aiValid" class="bg-red-1 text-negative rounded-borders q-mb-md">
                    <q-icon name="error" size="sm" class="q-mr-sm" />
                    <strong>Validación fallida:</strong> {{ executeForm.aiMessage }}
                  </q-banner>

                  <div v-if="executeForm.aiDetails" class="q-mb-md">
                    <q-card flat bordered class="bg-grey-1">
                      <q-card-section class="q-pa-md text-grey-8">
                        <div class="text-caption text-grey-5 text-weight-bold uppercase">Detalles de validación:</div>
                        <div v-if="executeForm.aiDetails.pages">Páginas: {{ executeForm.aiDetails.pages }}</div>
                        <div v-if="executeForm.aiDetails.wordCount">Palabras detectadas: {{ executeForm.aiDetails.wordCount }}</div>
                        <div v-if="executeForm.aiDetails.score !== undefined">Puntaje: {{ executeForm.aiDetails.score }}/100</div>
                        <div v-if="executeForm.aiDetails.foundRequired">Keywords requeridas: {{ executeForm.aiDetails.foundRequired?.join(', ') }}</div>
                        <div v-if="executeForm.aiDetails.method">Método: {{ executeForm.aiDetails.method }}</div>
                        <div v-if="executeForm.aiDetails.suggestion" class="text-orange q-mt-sm">{{ executeForm.aiDetails.suggestion }}</div>
                      </q-card-section>
                    </q-card>
                  </div>

                  <div class="row q-gutter-md">
                    <q-btn color="purple" icon="psychology" label="Verificar con IA" rounded unelevated @click="validatePDFWithAI" :loading="executeForm.validatingAI" :disable="executeForm.aiValidated && executeForm.aiValid" />
                    <q-btn v-if="executeForm.aiValidated && !executeForm.aiValid" color="orange" outline label="Volver a Intentar" rounded @click="resetExecuteAI" />
                  </div>
                </div>
              </div>
              <q-stepper-navigation class="q-mt-md">
                <q-btn color="primary" label="Continuar" rounded unelevated @click="executeStep = 2" :disable="!selectedTracking.driveFileUrl || !executeForm.aiValidated || !executeForm.aiValid" />
              </q-stepper-navigation>
            </q-step>

            <q-step :name="2" title="Validar Firmas" icon="draw" :done="executeStep > 2 || selectedTracking.signatureValidatedAt">
              <div class="q-pa-md bg-white rounded-borders shadow-1">
                <p class="text-subtitle1 text-grey-8 text-weight-medium">Confirma que el documento adjunto contiene las firmas requeridas.</p>
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

                <q-btn color="primary" label="Guardar Validación" rounded unelevated @click="validateSignatures" :loading="saving" :disable="!executeForm.signedByInstructor" />
              </div>
              <q-stepper-navigation class="q-mt-md">
                <q-btn flat color="primary" label="Atrás" @click="executeStep = 1" class="q-mr-sm" />
                <q-btn color="primary" label="Continuar" rounded unelevated @click="executeStep = 3" :disable="!selectedTracking.signatureValidatedAt && !executeForm.signaturesSavedLocal" />
              </q-stepper-navigation>
            </q-step>

            <q-step :name="3" title="Finalizar Ejecución" icon="check_circle">
              <div class="q-pa-xl bg-white rounded-borders shadow-1 text-center">
                <q-icon name="task_alt" size="5em" color="positive" class="q-mb-md" />
                <div class="text-h5 text-weight-bold text-primary">¡Todo listo para ejecutar!</div>
                <p class="text-caption text-grey-7 q-my-md max-w-400">Al confirmar, el seguimiento quedará registrado como ejecutado, se sumarán las horas correspondientes y avanzará el progreso general del aprendiz.</p>
                <q-btn color="positive" size="lg" label="Confirmar Ejecución" rounded unelevated @click="executeTracking" :loading="saving" class="q-px-xl" />
              </div>
              <q-stepper-navigation class="q-mt-md">
                <q-btn flat color="primary" label="Atrás" @click="executeStep = 2" />
              </q-stepper-navigation>
            </q-step>

          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import trackingService from '../../api/tracking.service';
import productiveStageService from '../../api/productiveStage.service';
import { useAuthStore } from '../../stores/auth';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const authStore = useAuthStore();

const myEPs = ref([]);
const loading = ref(false);
const searchFilter = ref('');
const filterModality = ref(null);

const modalityOptions = [
  { label: 'Contrato de Aprendizaje', value: 'APPRENTICESHIP_CONTRACT' },
  { label: 'Vínculo Laboral', value: 'LABOR_LINK' },
  { label: 'Pasantía', value: 'INTERNSHIP' },
  { label: 'Proyecto Individual', value: 'INDIVIDUAL_PRODUCTIVE_PROJECT' },
  { label: 'Proyecto Grupal', value: 'GROUP_PRODUCTIVE_PROJECT' }
];

const apprenticeColumns = [
  { name: 'nombre', label: 'Nombre / Ficha', field: 'firstNameAndLast', align: 'left', sortable: true },
  { name: 'documento', label: 'Documento', field: 'nationalId', align: 'left' },
  { name: 'etapaProductiva', label: 'Modalidad Etapa', field: 'modality', align: 'left' },
  { name: 'seguimientos', label: 'Progreso Seguimientos', field: 'completedTrackings', align: 'center' },
  { name: 'nivel', label: 'Nivel', field: 'trainingLevel', align: 'center' },
  { name: 'observaciones', label: 'Observaciones', align: 'center' },
  { name: 'archivos', label: 'Seguimientos', align: 'center' }
];

function getFirstAndLast(fullName) {
  if (!fullName) return 'N/D';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} ${parts[1]}`;
  return `${parts[0]} ${parts[1]}`;
}

function getTrainingLevelLabel(level) {
  if (level === 'TECHNICIAN') return 'Técnico';
  if (level === 'TECHNOLOGIST') return 'Tecnólogo';
  return level || 'Operario';
}

const myEPsSinContrato = computed(() =>
  myEPs.value.filter(ep => ep.modality !== 'APPRENTICESHIP_CONTRACT')
);

const filteredApprentices = computed(() => {
  let rows = myEPs.value
    .filter(ep => ep.modality !== 'APPRENTICESHIP_CONTRACT')
    .map(ep => ({
    _id: ep._id,
    apprenticeId: ep.apprentice?._id || (typeof ep.apprentice === 'string' ? ep.apprentice : ''),
    fullName: ep.apprentice?.fullName || '',
    firstNameAndLast: getFirstAndLast(ep.apprentice?.fullName || ''),
    nationalId: ep.apprentice?.nationalId || 'N/D',
    modality: ep.modality,
    trainingLevel: ep.apprentice?.trainingLevel || 'TECHNOLOGIST',
    trainingLevelLabel: getTrainingLevelLabel(ep.apprentice?.trainingLevel),
    completedTrackings: ep.completedTrackings || 0,
    requiredTrackings: ep.requiredTrackings || (ep.apprentice?.trainingLevel === 'TECHNICIAN' || ep.apprentice?.trainingLevel === 'TECHNOLOGIST' ? 3 : 2),
    comments: ep.comments || [],
    enrollmentNumber: ep.apprentice?.enrollmentNumber || '',
    program: ep.apprentice?.program || '',
    status: ep.status
  }));

  if (searchFilter.value) {
    const q = searchFilter.value.toLowerCase();
    rows = rows.filter(r =>
      r.fullName.toLowerCase().includes(q) ||
      r.nationalId.includes(q) ||
      r.enrollmentNumber.toLowerCase().includes(q) ||
      r.program.toLowerCase().includes(q)
    );
  }

  if (filterModality.value) {
    rows = rows.filter(r => r.modality === filterModality.value);
  }

  return rows;
});

let pollInterval = null;

onMounted(() => {
  fetchMyEPs();
  pollInterval = setInterval(fetchMyEPs, 30000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

async function fetchMyEPs() {
  loading.value = true;
  try {
    const body = await productiveStageService.getAllEPs({ limit: 100 });
    const allEps = body.data?.eps || body.data || [];
    myEPs.value = allEps.filter(ep =>
      ['ACTIVE', 'IN_FOLLOWUP', 'CERTIFICATION'].includes(ep.status)
    );
  } catch (error) {
    console.error('Error fetching EPs', error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar etapas productivas.', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
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

function getStatusLabel(status) {
  const map = {
    'SCHEDULED': 'Programado',
    'EXECUTED': 'Ejecutado',
    'PAID': 'Finalizado'
  };
  return map[status] || status;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

// ============ Observations Modal ============
const showObservationsModal = ref(false);
const selectedApprenticeForObs = ref(null);
const observationsList = ref([]);
const newObservation = ref('');
const savingObs = ref(false);

function openObservationsModal(row) {
  selectedApprenticeForObs.value = row;
  observationsList.value = [...(row.comments || [])];
  newObservation.value = '';
  showObservationsModal.value = true;
}

function getCommentAuthorName(comment) {
  if (!comment.author) return 'Sistema';
  if (typeof comment.author === 'object') {
    return comment.author.fullName || comment.author.nationalId || 'Usuario';
  }
  return comment.author;
}

function isMyComment(comment) {
  const authorId = typeof comment.author === 'object' ? comment.author._id || comment.author : comment.author;
  return authorId === authStore.user?.id || authorId === authStore.user?._id;
}

async function addObservation() {
  if (!newObservation.value.trim() || !selectedApprenticeForObs.value) return;
  savingObs.value = true;
  try {
    await productiveStageService.addComment(selectedApprenticeForObs.value._id, newObservation.value.trim());
    const freshBody = await productiveStageService.getAllEPs({ limit: 200 });
    const freshEps = freshBody.data?.eps || freshBody.data || [];
    const updatedEp = freshEps.find(e => e._id === selectedApprenticeForObs.value._id);
    if (updatedEp) {
      observationsList.value = [...(updatedEp.comments || [])];
      const idx = myEPs.value.findIndex(e => e._id === selectedApprenticeForObs.value._id);
      if (idx >= 0) myEPs.value[idx] = updatedEp;
    }
    newObservation.value = '';
    $q.notify({ type: 'positive', message: 'Observación agregada correctamente.', position: 'top', timeout: 3000 });
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al agregar observación.', position: 'top', timeout: 5000 });
  } finally {
    savingObs.value = false;
  }
}

// ============ Files Modal ============
const showFilesModal = ref(false);
const selectedApprenticeForFiles = ref(null);
const filesList = ref([]);
const filesLoading = ref(false);

async function openFilesModal(row) {
  selectedApprenticeForFiles.value = row;
  filesList.value = [];
  filesLoading.value = true;
  showFilesModal.value = true;
  try {
    const body = await trackingService.getSummary(row._id);
    const trackings = body.data?.trackings || [];
    const result = [];
    for (const t of trackings) {
      result.push({
        _id: t._id,
        trackingNumber: t.trackingNumber,
        isExtraordinary: t.isExtraordinary,
        fileName: t.apprenticeFileName || t.fileName || `Acta de Seguimiento #${t.trackingNumber}`,
        driveFileUrl: t.apprenticeDriveFileUrl || t.driveFileUrl,
        driveFileId: t.apprenticeDriveFileId || t.driveFileId,
        status: t.status,
        executedDate: t.executedDate,
        uploadedAt: t.apprenticeFileUploadedAt || t.updatedAt,
        uploadedBy: t.apprenticeDriveFileUrl ? 'Aprendiz' : 'Instructor'
      });
    }
    filesList.value = result;
  } catch (error) {
    console.error('Error fetching files:', error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar archivos.', position: 'top', timeout: 5000 });
  } finally {
    filesLoading.value = false;
  }
}

function previewFile(file) {
  if (file.driveFileUrl) {
    window.open(file.driveFileUrl, '_blank');
  }
}

function downloadFile(file) {
  if (file.driveFileUrl) {
    const link = document.createElement('a');
    link.href = file.driveFileUrl;
    link.download = file.fileName || 'seguimiento.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ============ Existing Functionality ============
const saving = ref(false);
const showCreateModal = ref(false);
const showExtraordinaryModal = ref(false);
const showExecuteModal = ref(false);
const selectedTracking = ref(null);
const executeStep = ref(1);

const form = ref({
  productiveStageId: '',
  type: 'IN_PERSON',
  scheduledDate: '',
  notes: '',
  extraordinaryReason: ''
});

const executeForm = ref({
  file: null,
  signedByInstructor: false,
  signedByApprentice: false,
  signaturesSavedLocal: false,
  aiValidated: false,
  aiValid: false,
  aiMessage: '',
  aiDetails: null,
  validatingAI: false
});

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
  showCreateModal.value = true;
}

function openExtraordinaryModal() {
  resetForm();
  form.value.type = 'EXTRAORDINARY';
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
    fetchMyEPs();
  } catch (error) {
    console.error(error);
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
    fetchMyEPs();
  } catch (error) {
    console.error(error);
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
    signaturesSavedLocal: false,
    aiValidated: false,
    aiValid: false,
    aiMessage: '',
    aiDetails: null,
    validatingAI: false
  };
  showExecuteModal.value = true;
}

async function uploadPDF() {
  if (!executeForm.value.file) return;
  saving.value = true;
  try {
    const fd = new FormData();
    fd.append('file', executeForm.value.file);
    const body = await trackingService.uploadPDF(selectedTracking.value._id, fd);
    selectedTracking.value.driveFileUrl = body.data?.driveFileUrl;
    selectedTracking.value.driveFileId = body.data?.driveFileId;
    $q.notify({ type: 'positive', message: 'Documento subido correctamente.', position: 'top', timeout: 5000 });
    executeStep.value = 2;
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al subir documento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

async function validatePDFWithAI() {
  if (!selectedTracking.value?.driveFileId) return;
  executeForm.value.validatingAI = true;
  try {
    const fd = new FormData();
    fd.append('fileId', selectedTracking.value.driveFileId);
    const body = await trackingService.validatePDF(fd);
    const result = body.data || body;
    executeForm.value.aiValidated = true;
    executeForm.value.aiValid = result.valid;
    executeForm.value.aiMessage = result.message || '';
    executeForm.value.aiDetails = result.details || null;
    if (result.valid) {
      $q.notify({ type: 'positive', message: 'Validación IA exitosa.', position: 'top', timeout: 5000 });
    } else {
      $q.notify({ type: 'negative', message: 'La validación IA encontró problemas. Corrija el archivo e intente de nuevo.', position: 'top', timeout: 5000 });
    }
  } catch (error) {
    console.error(error);
    executeForm.value.aiValidated = true;
    executeForm.value.aiValid = false;
    executeForm.value.aiMessage = error.message || 'Error al validar con IA.';
    $q.notify({ type: 'negative', message: 'Error al validar con IA.', position: 'top', timeout: 5000 });
  } finally {
    executeForm.value.validatingAI = false;
  }
}

function resetExecuteAI() {
  executeForm.value.aiValidated = false;
  executeForm.value.aiValid = false;
  executeForm.value.aiMessage = '';
  executeForm.value.aiDetails = null;
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
    // Refresh modal list data as well
    if (selectedApprenticeForFiles.value) {
      openFilesModal(selectedApprenticeForFiles.value);
    }
    fetchMyEPs();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al ejecutar seguimiento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.manage-trackings-container {
  max-width: 1300px;
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

.action-header-btn {
  font-weight: 700;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}
.action-header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255,255,255,0.2);
}

/* ─── Filters Card ────────────────────────────────── */
.filter-card {
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.06);
  background: white;
  box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
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

.badge-pill {
  border-radius: 20px;
  font-weight: 600;
}

.action-table-btn {
  font-weight: 600;
  transition: all 0.2s ease;
}
.action-table-btn:hover {
  transform: translateY(-1px);
}

/* ─── Modal Custom Styles ─────────────────────────── */
.border-dashed-container {
  border: 1px dashed rgba(0,0,0,0.1);
  border-radius: 12px;
  overflow: hidden;
}
.tracking-item {
  transition: all 0.2s ease;
}
.tracking-item:hover {
  background: #f9fafb;
}

/* Stepper customization */
.stepper-custom {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.05) !important;
}

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
.max-w-400 {
  max-width: 400px;
  margin: 0 auto;
}
</style>
