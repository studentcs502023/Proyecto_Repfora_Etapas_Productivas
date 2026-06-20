<template>
  <div class="manage-trackings-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Gestión de Seguimientos</h2>
        <p class="text-grey-7 q-my-sm">Registra y gestiona los seguimientos obligatorios por aprendiz.</p>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn color="green" outline icon="upload_file" label="Subir Acta" @click="openUploadActaModal" />
        <q-btn color="warning" outline icon="warning" label="Extraordinario" @click="openExtraordinaryModal" />
        <q-btn color="primary" icon="add" label="Programar Seguimiento" @click="openCreateModal" />
      </div>
    </div>

    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-5">
          <q-input
            v-model="searchFilter"
            dense
            outlined
            placeholder="Buscar por nombre del aprendiz, ficha o programa..."
            debounce="300"
            clearable
          >
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-4">
          <q-select
            v-model="filterModality"
            :options="modalityOptions"
            label="Filtrar por Modalidad"
            outlined
            dense
            emit-value
            map-options
            clearable
          />
        </div>
        <div class="col-12 col-sm-3 text-right">
          <q-btn
            color="primary"
            icon="add_circle"
            label="Agregar Seguimiento"
            size="md"
            @click="openUploadActaModal"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-card flat bordered>
      <q-table
        :rows="filteredApprentices"
        :columns="apprenticeColumns"
        :loading="loading"
        row-key="_id"
        flat
        :pagination="{ rowsPerPage: 15 }"
      >
        <template v-slot:body-cell-nombre="props">
          <q-td :props="props">
            <span class="text-weight-bold">{{ props.row.firstNameAndLast }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-documento="props">
          <q-td :props="props">
            <span>{{ props.row.nationalId }}</span>
          </q-td>
        </template>

        <template v-slot:body-cell-etapaProductiva="props">
          <q-td :props="props">
            <q-chip dense size="sm" color="grey-3" text-color="black">
              {{ getModalityLabel(props.row.modality) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-seguimientos="props">
          <q-td :props="props">
            <div class="text-weight-bold">
              {{ props.row.completedTrackings }} / {{ props.row.requiredTrackings }}
            </div>
            <q-linear-progress
              :value="props.row.requiredTrackings > 0 ? props.row.completedTrackings / props.row.requiredTrackings : 0"
              :color="props.row.completedTrackings >= props.row.requiredTrackings ? 'positive' : 'warning'"
              size="8px"
              rounded
              class="q-mt-xs"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-nivel="props">
          <q-td :props="props">
            <q-badge :color="props.row.trainingLevel === 'TECHNOLOGIST' ? 'secondary' : 'info'" :label="props.row.trainingLevelLabel" />
          </q-td>
        </template>

        <template v-slot:body-cell-observaciones="props">
          <q-td :props="props" class="text-center">
            <q-btn
              size="sm"
              color="orange"
              outline
              icon="chat"
              label="Observaciones"
              @click="openObservationsModal(props.row)"
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
              color="blue"
              outline
              icon="folder_open"
              label="Archivos Subidos"
              @click="openFilesModal(props.row)"
            />
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width row flex-center text-grey q-pa-lg">
            No hay aprendices asignados con etapas productivas activas.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Observaciones (Chat) -->
    <q-dialog v-model="showObservationsModal" persistent>
      <q-card style="width: 600px; max-width: 90vw;">
        <q-card-section class="bg-orange text-white row items-center">
          <div class="text-h6">Observaciones</div>
          <q-space />
          <div class="text-subtitle2">{{ selectedApprenticeForObs?.firstNameAndLast }}</div>
          <q-btn icon="close" flat round dense v-close-popup class="q-ml-md" />
        </q-card-section>

        <q-card-section class="q-pa-md" style="max-height: 400px; overflow-y: auto;">
          <div v-if="!observationsList.length" class="text-center text-grey q-pa-lg">
            <q-icon name="chat_bubble_outline" size="3em" class="q-mb-sm" />
            <div>No hay observaciones registradas.</div>
            <div class="text-caption">Los comentarios del administrador o instructor aparecerán aquí.</div>
          </div>

          <q-chat-message
            v-for="(comment, idx) in observationsList"
            :key="idx"
            :name="getCommentAuthorName(comment)"
            :text="[comment.text]"
            :sent="isMyComment(comment)"
            :stamp="formatDateTime(comment.createdAt)"
            :bg-color="isMyComment(comment) ? 'primary-1' : 'grey-3'"
            size="10"
          />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pa-md">
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
                :disable="savingObs"
              />
            </div>
            <div class="col-auto">
              <q-btn
                color="primary"
                icon="send"
                label="Enviar"
                @click="addObservation"
                :loading="savingObs"
                :disable="!newObservation.trim()"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal: Archivos Subidos -->
    <q-dialog v-model="showFilesModal" persistent>
      <q-card style="width: 700px; max-width: 90vw;">
        <q-card-section class="bg-blue text-white row items-center">
          <div class="text-h6">Archivos Subidos</div>
          <q-space />
          <div class="text-subtitle2">{{ selectedApprenticeForFiles?.firstNameAndLast }}</div>
          <q-btn icon="close" flat round dense v-close-popup class="q-ml-md" />
        </q-card-section>

        <q-card-section class="q-pa-md" style="max-height: 450px; overflow-y: auto;">
          <div v-if="filesLoading" class="text-center q-pa-lg">
            <q-spinner color="primary" size="2em" />
            <div class="text-grey q-mt-sm">Cargando archivos...</div>
          </div>

          <div v-else-if="!filesList.length" class="text-center text-grey q-pa-lg">
            <q-icon name="folder_off" size="3em" class="q-mb-sm" />
            <div>No hay archivos subidos para este aprendiz.</div>
          </div>

          <q-list v-else bordered separator>
            <q-item v-for="(file, idx) in filesList" :key="idx" class="q-py-sm">
              <q-item-section avatar>
                <q-icon name="picture_as_pdf" color="negative" size="md" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-bold">
                  Seguimiento #{{ file.trackingNumber }}
                  <q-badge v-if="file.isExtraordinary" color="warning" label="Extraordinario" class="q-ml-sm" size="sm" />
                </q-item-label>
                <q-item-label caption>
                  {{ file.fileName || 'Acta de seguimiento' }}
                </q-item-label>
                <q-item-label caption>
                  Subido: {{ formatDateTime(file.uploadedAt || file.executedDate) }}
                </q-item-label>
                <q-item-label caption>
                  Estado: {{ getStatusLabel(file.status) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="q-gutter-xs">
                  <q-btn
                    v-if="file.driveFileUrl"
                    size="sm"
                    color="primary"
                    outline
                    icon="visibility"
                    @click="previewFile(file)"
                  >
                    <q-tooltip>Visualizar</q-tooltip>
                  </q-btn>
                  <q-btn
                    v-if="file.driveFileUrl"
                    size="sm"
                    color="secondary"
                    outline
                    icon="download"
                    @click="downloadFile(file)"
                  >
                    <q-tooltip>Descargar PDF</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

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
              :options="myEPsSinContrato"
              option-value="_id"
              :option-label="opt => `${opt.apprentice?.fullName} - ${opt.companySnapshot?.companyName || 'Sin empresa'}`"
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
              :option-label="opt => `${opt.apprentice?.fullName} - ${opt.companySnapshot?.companyName || 'Sin empresa'}`"
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
          <div class="text-h6">Agregar Seguimiento</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup @click="resetUploadActa">
            <q-tooltip>Cerrar</q-tooltip>
          </q-btn>
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll">
          <q-stepper v-model="actaStep" ref="actaStepper" color="green" animated flat bordered class="q-mx-auto" style="max-width: 800px;">

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
  { name: 'nombre', label: 'Nombre', field: 'firstNameAndLast', align: 'left', sortable: true },
  { name: 'documento', label: 'Documento', field: 'nationalId', align: 'left' },
  { name: 'etapaProductiva', label: 'Etapa Productiva', field: 'modality', align: 'left' },
  { name: 'seguimientos', label: 'N.º Seguimientos', field: 'completedTrackings', align: 'center' },
  { name: 'nivel', label: 'Nivel Formación', field: 'trainingLevel', align: 'center' },
  { name: 'observaciones', label: 'Observaciones', align: 'center' },
  { name: 'archivos', label: 'Archivos', align: 'center' }
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
    filesList.value = trackings
      .filter(t => t.driveFileUrl || t.driveFileId)
      .map(t => ({
        trackingNumber: t.trackingNumber,
        isExtraordinary: t.isExtraordinary,
        fileName: t.fileName || `Seguimiento_${t.trackingNumber}.pdf`,
        driveFileUrl: t.driveFileUrl,
        driveFileId: t.driveFileId,
        status: t.status,
        executedDate: t.executedDate,
        uploadedAt: t.updatedAt || t.executedDate
      }));
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

// ============ Existing Functionality (preserved from original) ============
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
  signaturesSavedLocal: false
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

async function fetchTrackingsForEP(epId) {
  try {
    const body = await trackingService.getSummary(epId);
    return body.data?.trackings || [];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar seguimientos.', position: 'top', timeout: 5000 });
    return [];
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
    fetchMyEPs();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al ejecutar seguimiento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

// ============ Upload Acta Flow ============
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
  const search = val.toLowerCase();

  const results = myEPs.value
    .filter(ep => ep.modality !== 'APPRENTICESHIP_CONTRACT')
    .filter(ep => {
      const a = ep.apprentice;
      if (!a) return false;
      const fullName = (a.fullName || '').toLowerCase();
      const nationalId = (a.nationalId || '').toLowerCase();
      const enrollmentNumber = (a.enrollmentNumber || '').toLowerCase();
      return fullName.includes(search) || nationalId.includes(search) || enrollmentNumber.includes(search);
    })
    .map(ep => ({
      _id: ep.apprentice?._id || (typeof ep.apprentice === 'string' ? ep.apprentice : ''),
      fullName: ep.apprentice?.fullName || 'N/D',
      nationalId: ep.apprentice?.nationalId || 'N/D',
      enrollmentNumber: ep.apprentice?.enrollmentNumber || 'N/D',
      program: ep.apprentice?.program || 'N/D',
      trainingLevel: ep.apprentice?.trainingLevel || 'TECHNOLOGIST'
    }))
    .filter((v, i, a) => a.findIndex(x => x._id === v._id) === i)
    .slice(0, 20);

  update(() => { apprenticeOptions.value = results; });
}

function onApprenticeSelected(apprentice) {
  if (!apprentice) return;
  const level = apprentice.trainingLevel || 'TECHNOLOGIST';
  actaForm.value.apprenticeLevel = level === 'TECHNICIAN' ? 'TECNICO' : (level === 'TECHNOLOGIST' ? 'TECNOLOGO' : 'OPERARIO');
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
    const eps = myEPs.value;
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

    if (actaForm.value.uploadedTrackingId) {
      await trackingService.uploadPDF(actaForm.value.uploadedTrackingId, fd);
      actaForm.value.pdfUploaded = true;
      $q.notify({ type: 'positive', message: 'Documento subido correctamente.', position: 'top', timeout: 5000 });
      return;
    }

    const selectedApprentice = actaForm.value.selectedApprentice;
    const eps = myEPs.value;
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
      await trackingService.uploadPDF(newTracking._id, fd);
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
    fetchMyEPs();
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
