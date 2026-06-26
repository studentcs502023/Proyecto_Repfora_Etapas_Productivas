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

        <template v-slot:body-cell-extraordinario="props">
          <q-td :props="props" class="text-center">
            <q-btn
              size="sm"
              color="deep-orange"
              unelevated
              rounded
              icon="emergency"
              label="Extraordinario"
              @click="openExtraordinarioRowModal(props.row)"
              class="action-table-btn"
            />
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
              label="Ver Seguimientos"
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

    <!-- Modal: Seguimientos y Archivos (con edición de estado) -->
    <q-dialog v-model="showFilesModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="column modal-card">
        <div class="modal-header">
          <div class="cover-overlay-sm"></div>
          <div class="row items-center q-pa-lg text-white" style="position:relative;z-index:1">
            <q-avatar size="48px" color="white" text-color="primary" class="q-mr-md text-weight-bolder" style="font-size:20px">
              <q-icon name="folder" size="28px" />
            </q-avatar>
            <div class="col">
              <div class="text-h5 text-weight-bolder">Seguimientos del Aprendiz</div>
              <div class="text-caption opacity-80">{{ selectedApprenticeForFiles?.firstNameAndLast }} | {{ selectedApprenticeForFiles?.nationalId }}</div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup color="white" @click="closeFilesModal">
              <q-tooltip>Cerrar</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-card-section class="q-pa-lg bg-grey-1">
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-sm-4">
              <q-input v-model="filesSearch" dense outlined placeholder="Buscar por tipo, fecha..." debounce="200" clearable color="primary">
                <template v-slot:prepend><q-icon name="search" color="primary" /></template>
              </q-input>
            </div>
            <div class="col-12 col-sm-3">
              <q-select v-model="filesStatusFilter" :options="[{label:'Programado',value:'SCHEDULED'},{label:'Ejecutado',value:'EXECUTED'},{label:'Pagado',value:'PAID'}]" label="Estado" outlined dense emit-value map-options clearable color="primary" />
            </div>
            <div class="col-12 col-sm-3">
              <q-select v-model="filesTypeFilter" :options="[{label:'Presencial',value:'IN_PERSON'},{label:'Virtual',value:'VIRTUAL'},{label:'Extraordinario',value:'EXTRAORDINARY'}]" label="Tipo" outlined dense emit-value map-options clearable color="primary" />
            </div>
            <div class="col-12 col-sm-2 text-right">
              <q-btn color="primary" icon="refresh" label="Actualizar" rounded unelevated @click="refreshFilesList" :loading="filesLoading" size="sm" class="full-width" />
            </div>
          </div>
        </q-card-section>

        <q-card-section class="col q-pa-lg scroll bg-grey-1">
          <div v-if="filesLoading" class="text-center q-pa-xl">
            <q-spinner color="primary" size="3em" />
            <div class="text-grey-6 q-mt-sm">Cargando seguimientos...</div>
          </div>

          <div v-else-if="!filteredFilesList.length" class="text-center text-grey q-pa-xl">
            <q-icon name="folder_off" size="4em" color="grey-4" class="q-mb-md" />
            <div class="text-h6 text-grey-6">Sin seguimientos</div>
          </div>

          <q-table v-else :rows="filteredFilesList" :columns="filesColumns" row-key="_id" flat :pagination="{ rowsPerPage: 20 }" table-header-class="files-table-header" hide-bottom v-model:selected="filesSelected">
            <template v-slot:body-cell-trackingNumber="props">
              <q-td :props="props">
                <span class="text-weight-bold">#{{ props.row.trackingNumber }}</span>
                <q-badge v-if="props.row.isExtraordinary" color="deep-orange" label="Extra" class="q-ml-sm" />
              </q-td>
            </template>

            <template v-slot:body-cell-typeLabel="props">
              <q-td :props="props">
                {{ props.row.type === 'IN_PERSON' ? 'Presencial' : props.row.type === 'VIRTUAL' ? 'Virtual' : 'Extraordinario' }}
              </q-td>
            </template>

            <template v-slot:body-cell-scheduledDate="props">
              <q-td :props="props">{{ formatDateShort(props.row.scheduledDate) }}</q-td>
            </template>

            <template v-slot:body-cell-status="props">
              <q-td :props="props" class="text-center">
                <q-btn-group flat spread>
                  <q-btn :color="props.row._status === 'SCHEDULED' ? 'orange' : 'grey-5'" :text-color="props.row._status === 'SCHEDULED' ? 'orange' : 'grey'"
                         size="sm" unelevated :label="'Pendiente'" @click="changeTrackingStatus(props.row, 'SCHEDULED')"
                         :disable="props.row._status === 'SCHEDULED' || savingStatus === props.row._id"
                         :outline="props.row._status !== 'SCHEDULED'" :dense="props.row._status !== 'SCHEDULED'" rounded />
                  <q-btn :color="props.row._status === 'EXECUTED' ? 'green' : 'grey-5'" :text-color="props.row._status === 'EXECUTED' ? 'green' : 'grey'"
                         size="sm" unelevated :label="'Ejecutado'" @click="changeTrackingStatus(props.row, 'EXECUTED')"
                         :disable="props.row._status === 'EXECUTED' || savingStatus === props.row._id"
                         :outline="props.row._status !== 'EXECUTED'" :dense="props.row._status !== 'EXECUTED'" rounded />
                  <q-btn :color="props.row._status === 'PAID' ? 'purple' : 'grey-5'" :text-color="props.row._status === 'PAID' ? 'purple' : 'grey'"
                         size="sm" unelevated :label="'Cobrado'" @click="changeTrackingStatus(props.row, 'PAID')"
                         :disable="props.row._status === 'PAID' || props.row._status === 'SCHEDULED' || savingStatus === props.row._id"
                         :outline="props.row._status !== 'PAID'" :dense="props.row._status !== 'PAID'" rounded />
                </q-btn-group>
              </q-td>
            </template>

            <template v-slot:body-cell-assignedHours="props">
              <q-td :props="props" class="text-center">
                <span :class="props.row.assignedHours ? 'text-weight-bold text-positive' : 'text-grey'">
                  {{ props.row.assignedHours ? props.row.assignedHours + 'h' : '-' }}
                </span>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-center">
                <div class="row q-gutter-xs justify-center">
                  <q-btn v-if="!props.row.driveFileId" size="sm" color="orange" outline rounded icon="upload_file" @click="triggerUploadForTracking(props.row)">
                    <q-tooltip>Subir PDF</q-tooltip>
                  </q-btn>
                  <q-btn v-if="props.row.driveFileId" size="sm" flat round color="primary" icon="visibility" @click="previewFile(props.row)">
                    <q-tooltip>Ver PDF</q-tooltip>
                  </q-btn>
                  <q-btn v-if="props.row.driveFileId" size="sm" flat round color="secondary" icon="download" @click="downloadFile(props.row)">
                    <q-tooltip>Descargar</q-tooltip>
                  </q-btn>
                  <q-btn v-if="props.row._status === 'SCHEDULED'" size="sm" color="blue" outline rounded icon="draw" @click="quickSignTracking(props.row)">
                    <q-tooltip>Validar firmas</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>

            <template v-slot:no-data>
              <div class="full-width column flex-center text-grey q-pa-xl">
                <q-icon name="folder_off" size="4em" color="grey-4" class="q-mb-md" />
                <div class="text-h6 text-grey-6">Sin seguimientos</div>
              </div>
            </template>
          </q-table>
        </q-card-section>

        <q-separator />
        <q-card-actions align="right" class="q-pa-md bg-white">
          <q-btn flat label="Cancelar" color="grey" v-close-popup @click="closeFilesModal" />
          <q-btn color="primary" label="Guardar Cambios" rounded unelevated :loading="savingFiles" @click="saveFilesChanges" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Hidden file input for quick PDF upload from files modal -->
    <q-dialog v-model="showQuickUpload" persistent>
      <q-card style="width: 400px; border-radius: 20px;">
        <q-card-section class="bg-orange text-white">
          <div class="text-h6">Subir PDF - Seguimiento #{{ quickUploadTracking?.trackingNumber }}</div>
        </q-card-section>
        <q-card-section class="q-pa-md q-gutter-y-md">
          <q-file v-model="quickUploadFile" label="Seleccionar PDF" outlined accept=".pdf" max-file-size="10485760" color="orange" @rejected="onCreateFileRejected" />
          <q-checkbox v-model="quickSignBoth" label="Validar firmas automáticamente" color="primary" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" color="grey" v-close-popup />
          <q-btn color="orange" label="Subir" rounded unelevated @click="quickUploadAndSign" :loading="savingFiles" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Modal: Programar Seguimiento (Wizard 5 pasos) -->
    <q-dialog v-model="showCreateModal" persistent maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="column modal-card">
        <div class="modal-header">
          <div class="cover-overlay-sm"></div>
          <div class="row items-center q-pa-lg text-white" style="position:relative;z-index:1">
            <q-avatar size="48px" color="white" text-color="primary" class="q-mr-md text-weight-bolder" style="font-size:20px">
              <q-icon name="event" size="28px" />
            </q-avatar>
            <div class="col">
              <div class="text-h5 text-weight-bolder">Programar Seguimiento</div>
              <div class="text-caption opacity-80">{{ createForm.selectedApprentice?.fullName || 'Selecciona un aprendiz' }}</div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup color="white" @click="resetCreateWizard">
              <q-tooltip>Cerrar</q-tooltip>
            </q-btn>
          </div>
        </div>

        <q-card-section class="col q-pa-lg scroll bg-grey-1">
          <q-stepper v-model="createStep" ref="createStepper" color="primary" animated flat class="stepper-custom" style="max-width: 800px;" header-nav>

            <!-- ====== PASO 1: Buscar Aprendiz ====== -->
            <q-step :name="1" title="Buscar Aprendiz" icon="search" :done="createStep > 1">
              <div class="q-pa-md bg-white rounded-borders shadow-1">
                <q-input v-model="createSearchFilter" dense outlined placeholder="Buscar por nombre, documento o ficha..." debounce="200" clearable color="primary" class="q-mb-md">
                  <template v-slot:prepend><q-icon name="search" color="primary" /></template>
                </q-input>
                <q-list bordered separator class="rounded-borders" style="max-height: 350px; overflow-y: auto;">
                  <q-item v-for="ep in filteredCreateApprentices" :key="ep._id" clickable v-ripple :active="createForm.selectedApprentice?._id === ep._id" active-class="bg-green-1 text-primary" @click="selectCreateApprentice(ep)">
                    <q-item-section avatar>
                      <q-avatar color="primary" text-color="white">{{ ep.apprentice?.fullName?.charAt(0) }}</q-avatar>
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-weight-bold">{{ ep.apprentice?.fullName }}</q-item-label>
                      <q-item-label caption>Ficha: {{ ep.apprentice?.enrollmentNumber }} | Doc: {{ ep.apprentice?.nationalId }}</q-item-label>
                      <q-item-label caption>Programa: {{ ep.apprentice?.program }} | {{ getModalityLabel(ep.modality) }}</q-item-label>
                    </q-item-section>
                    <q-item-section side v-if="createForm.selectedApprentice?._id === ep._id">
                      <q-icon name="check_circle" color="primary" size="sm" />
                    </q-item-section>
                  </q-item>
                  <q-item v-if="!filteredCreateApprentices.length">
                    <q-item-section class="text-center text-grey q-pa-md">
                      <q-icon name="search_off" size="2em" class="q-mb-sm" />
                      <div>No se encontraron aprendices</div>
                    </q-item-section>
                  </q-item>
                </q-list>
                <div v-if="createForm.selectedApprentice && createForm.trackingInfo" class="q-mt-md">
                  <q-card flat bordered class="bg-blue-1 rounded-borders q-pa-md">
                    <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">Información de Seguimientos</div>
                    <div class="row q-col-gutter-sm">
                      <div class="col-4"><q-chip dense color="primary" text-color="white" :label="`Requeridos: ${createForm.trackingInfo.requiredTrackings}`" /></div>
                      <div class="col-4"><q-chip dense color="green" text-color="white" :label="`Completados: ${createForm.trackingInfo.completedTrackings}`" /></div>
                      <div class="col-4"><q-chip dense :color="createForm.trackingInfo.maxReached ? 'red' : 'orange'" text-color="white" :label="`Próximo: #${createForm.trackingInfo.nextTrackingNumber}`" /></div>
                    </div>
                    <q-banner v-if="createForm.trackingInfo.maxReached" class="bg-red-1 text-red q-mt-sm rounded-borders">
                      <q-icon name="warning" size="sm" class="q-mr-sm" /> Ya se alcanzó el máximo de seguimientos requeridos.
                    </q-banner>
                  </q-card>
                </div>
              </div>
              <q-stepper-navigation class="q-mt-md">
                <q-btn color="primary" label="Continuar" rounded unelevated @click="createStep = 2" :disable="!createForm.selectedApprentice || createForm.trackingInfo?.maxReached" />
              </q-stepper-navigation>
            </q-step>

            <!-- ====== PASO 2: Configurar Seguimiento ====== -->
            <q-step :name="2" title="Configurar" icon="settings" :done="createStep > 2">
              <div class="q-pa-md bg-white rounded-borders shadow-1 q-gutter-y-md">
                <q-card flat bordered class="bg-grey-1 rounded-borders q-pa-md">
                  <div class="text-subtitle2 text-weight-bold text-grey-9">Aprendiz: {{ createForm.selectedApprentice?.firstNameAndLast }}</div>
                  <div class="text-caption text-grey-7">Documento: {{ createForm.selectedApprentice?.nationalId }} | Ficha: {{ createForm.selectedApprentice?.enrollmentNumber }}</div>
                </q-card>

                <div class="row q-col-gutter-md">
                  <div class="col-6">
                    <q-input v-model="createForm.trackingNumber" label="N° de Seguimiento" outlined dense readonly color="primary" bg-color="grey-2">
                      <template v-slot:prepend><q-icon name="tag" /></template>
                    </q-input>
                  </div>
                  <div class="col-6">
                    <q-select v-model="createForm.type" :options="[{label:'Presencial', value:'IN_PERSON'}, {label:'Virtual', value:'VIRTUAL'}]" label="Tipo" outlined dense emit-value map-options color="primary" bg-color="white" :rules="[val => !!val || 'Requerido']" />
                  </div>
                </div>

                <q-input v-model="createForm.scheduledDate" label="Fecha Programada *" type="date" outlined dense color="primary" bg-color="white" :rules="[val => !!val || 'Requerido']" />

                <q-input v-model="createForm.notes" label="Observaciones (Opcional)" type="textarea" outlined dense rows="2" color="primary" bg-color="white" />

                <q-checkbox v-model="createForm.isExtraordinary" label="Seguimiento Extraordinario (requiere aprobación de coordinación)" color="deep-orange" />
                <q-banner v-if="createForm.isExtraordinary" class="bg-orange-1 text-deep-orange rounded-borders">
                  <q-icon name="info" size="sm" class="q-mr-sm" /> Este seguimiento quedará pendiente de aprobación por la coordinación antes de poder ejecutarse.
                </q-banner>
              </div>
              <q-stepper-navigation class="q-mt-md">
                <q-btn flat color="primary" label="Atrás" @click="createStep = 1" class="q-mr-sm" />
                <q-btn color="primary" label="Continuar" rounded unelevated @click="createStep = 3" :disable="!createForm.scheduledDate" />
              </q-stepper-navigation>
            </q-step>

            <!-- ====== PASO 3: Subir PDF ====== -->
            <q-step :name="3" title="Subir PDF" icon="upload_file" :done="createStep > 3">
              <div class="q-pa-md bg-white rounded-borders shadow-1">
                <q-banner class="bg-blue-1 rounded-borders q-mb-md">
                  <q-icon name="info" size="sm" class="q-mr-sm" /> Carga el archivo PDF del seguimiento firmado. Tamaño máximo: 10 MB.
                </q-banner>
                <q-file v-model="createForm.file" label="Seleccionar Seguimiento (PDF)" outlined accept=".pdf" color="primary" bg-color="white" max-file-size="10485760" @rejected="onCreateFileRejected" class="q-mb-md">
                  <template v-slot:prepend><q-icon name="picture_as_pdf" color="primary" /></template>
                </q-file>
                <div v-if="createForm.file" class="bg-green-1 q-pa-md rounded-borders text-positive flex items-center">
                  <q-icon name="check_circle" size="sm" class="q-mr-sm" /> Archivo cargado: <strong>{{ createForm.file.name }}</strong>
                </div>
              </div>
              <q-stepper-navigation class="q-mt-md">
                <q-btn flat color="primary" label="Atrás" @click="createStep = 2" class="q-mr-sm" />
                <q-btn color="primary" label="Continuar" rounded unelevated @click="createStep = 4" :disable="!createForm.file" />
              </q-stepper-navigation>
            </q-step>

            <!-- ====== PASO 4: Validación con IA ====== -->
            <q-step :name="4" title="Validación IA" icon="psychology" :done="createStep > 4">
              <div class="q-pa-md bg-white rounded-borders shadow-1">
                <p class="text-subtitle1 text-grey-8 text-weight-medium">Verifica que el documento cargado cumple con los requisitos usando inteligencia artificial.</p>

                <q-banner v-if="!createForm.aiValidated" class="bg-blue-1 rounded-borders q-mb-md">
                  <q-icon name="info" size="sm" class="q-mr-sm" /> Presiona <strong>"Verificar con IA"</strong> para analizar el documento antes de continuar.
                </q-banner>

                <q-banner v-if="createForm.aiValidated && createForm.aiValid" class="bg-green-1 text-positive rounded-borders q-mb-md">
                  <q-icon name="check_circle" size="sm" class="q-mr-sm" />
                  <strong>Validación exitosa:</strong> {{ createForm.aiMessage }}
                </q-banner>

                <q-banner v-if="createForm.aiValidated && !createForm.aiValid" class="bg-red-1 text-negative rounded-borders q-mb-md">
                  <q-icon name="error" size="sm" class="q-mr-sm" />
                  <strong>Validación fallida:</strong> {{ createForm.aiMessage }}
                </q-banner>

                <div v-if="createForm.aiDetails" class="q-mb-md">
                  <q-card flat bordered class="bg-grey-1">
                    <q-card-section class="q-pa-md text-grey-8">
                      <div class="text-caption text-grey-5 text-weight-bold uppercase">Detalles:</div>
                      <div v-if="createForm.aiDetails.pages">Páginas: {{ createForm.aiDetails.pages }}</div>
                      <div v-if="createForm.aiDetails.wordCount">Palabras: {{ createForm.aiDetails.wordCount }}</div>
                      <div v-if="createForm.aiDetails.score !== undefined">Puntaje: {{ createForm.aiDetails.score }}/100</div>
                      <div v-if="createForm.aiDetails.foundRequired">Keywords: {{ createForm.aiDetails.foundRequired?.join(', ') }}</div>
                      <div v-if="createForm.aiDetails.method">Método: {{ createForm.aiDetails.method }}</div>
                      <div v-if="createForm.aiDetails.suggestion" class="text-orange q-mt-sm">{{ createForm.aiDetails.suggestion }}</div>
                    </q-card-section>
                  </q-card>
                </div>

                <div class="row q-gutter-md">
                  <q-btn color="purple" icon="psychology" label="Verificar con IA" rounded unelevated @click="validateCreatePDF" :loading="createForm.validatingAI" :disable="createForm.aiValidated && createForm.aiValid" />
                  <q-btn v-if="createForm.aiValidated && !createForm.aiValid" color="orange" outline label="Volver a Intentar" rounded @click="resetCreateAI" />
                </div>
              </div>
              <q-stepper-navigation class="q-mt-md">
                <q-btn flat color="primary" label="Atrás" @click="createStep = 3" class="q-mr-sm" />
                <q-btn color="primary" label="Continuar" rounded unelevated @click="createStep = 5" :disable="!createForm.aiValidated || !createForm.aiValid" />
              </q-stepper-navigation>
            </q-step>

            <!-- ====== PASO 5: Confirmar ====== -->
            <q-step :name="5" title="Confirmar" icon="check_circle">
              <div class="q-pa-xl bg-white rounded-borders shadow-1 text-center">
                <q-icon name="task_alt" size="5em" color="positive" class="q-mb-md" />
                <div class="text-h5 text-weight-bold text-primary">Confirmar Seguimiento</div>
                <p class="text-caption text-grey-7 q-my-md">Revisa los datos antes de confirmar:</p>
                <q-list bordered separator class="rounded-borders text-left q-mb-lg">
                  <q-item><q-item-section avatar><q-icon name="person" /></q-item-section><q-item-section><q-item-label>Aprendiz</q-item-label><q-item-label caption>{{ createForm.selectedApprentice?.fullName }} - {{ createForm.selectedApprentice?.nationalId }}</q-item-label></q-item-section></q-item>
                  <q-item><q-item-section avatar><q-icon name="tag" /></q-item-section><q-item-section><q-item-label>Seguimiento N°</q-item-label><q-item-label caption>#{{ createForm.trackingInfo?.nextTrackingNumber || createForm.trackingNumber }}</q-item-label></q-item-section></q-item>
                  <q-item><q-item-section avatar><q-icon name="category" /></q-item-section><q-item-section><q-item-label>Tipo</q-item-label><q-item-label caption>{{ createForm.type === 'IN_PERSON' ? 'Presencial' : 'Virtual' }}{{ createForm.isExtraordinary ? ' (Extraordinario)' : '' }}</q-item-label></q-item-section></q-item>
                  <q-item><q-item-section avatar><q-icon name="event" /></q-item-section><q-item-section><q-item-label>Fecha</q-item-label><q-item-label caption>{{ createForm.scheduledDate }}</q-item-label></q-item-section></q-item>
                  <q-item v-if="createForm.notes"><q-item-section avatar><q-icon name="notes" /></q-item-section><q-item-section><q-item-label>Observaciones</q-item-label><q-item-label caption>{{ createForm.notes }}</q-item-label></q-item-section></q-item>
                  <q-item><q-item-section avatar><q-icon name="description" /></q-item-section><q-item-section><q-item-label>Archivo</q-item-label><q-item-label caption>{{ createForm.file?.name || 'Sin archivo' }}</q-item-label></q-item-section></q-item>
                  <q-item><q-item-section avatar><q-icon name="psychology" /></q-item-section><q-item-section><q-item-label>Validación IA</q-item-label><q-item-label caption>{{ createForm.aiValid ? 'APROBADA' : 'Pendiente' }}</q-item-label></q-item-section></q-item>
                </q-list>
                <q-btn color="positive" size="lg" label="Confirmar Seguimiento" rounded unelevated @click="confirmCreateTracking" :loading="saving" class="q-px-xl" />
              </div>
              <q-stepper-navigation class="q-mt-md">
                <q-btn flat color="primary" label="Atrás" @click="createStep = 4" />
              </q-stepper-navigation>
            </q-step>

          </q-stepper>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Modal: Seguimiento Extraordinario por Aprendiz -->
    <q-dialog v-model="showExtraordinarioRowModal" persistent transition-show="scale" transition-hide="scale">
      <q-card style="width: 550px; max-width: 90vw; border-radius: 20px;" class="overflow-hidden">
        <q-form @submit="saveExtraordinarioTracking">
          <div class="bg-deep-orange text-white q-pa-md row items-center justify-between">
            <div>
              <div class="text-h6 text-weight-bold"><q-icon name="emergency" class="q-mr-xs"/> Seguimiento Extraordinario</div>
              <div class="text-caption opacity-80">{{ selectedApprenticeExtra?.fullName }}</div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup color="white" />
          </div>
          <q-card-section class="q-pa-lg q-gutter-y-md bg-grey-1">
            <q-banner class="bg-orange-1 text-deep-orange rounded-borders text-caption q-mb-md">
              <q-icon name="info" class="q-mr-xs"/> Requiere aprobación de la coordinación para ser ejecutado.
            </q-banner>
            <q-card flat bordered class="bg-white rounded-borders q-pa-md">
              <div class="text-subtitle2 text-weight-bold text-grey-9 q-mb-sm">Datos del Aprendiz</div>
              <div class="row q-col-gutter-y-xs text-grey-8">
                <div class="col-6"><span class="text-weight-medium">Nombre:</span> {{ selectedApprenticeExtra?.fullName }}</div>
                <div class="col-6"><span class="text-weight-medium">Documento:</span> {{ selectedApprenticeExtra?.nationalId }}</div>
                <div class="col-6"><span class="text-weight-medium">Ficha:</span> {{ selectedApprenticeExtra?.enrollmentNumber }}</div>
                <div class="col-6"><span class="text-weight-medium">Programa:</span> {{ selectedApprenticeExtra?.program }}</div>
                <div class="col-12"><span class="text-weight-medium">Modalidad:</span> {{ getModalityLabel(selectedApprenticeExtra?.modality) }}</div>
              </div>
            </q-card>
            <q-input v-model="extraordinarioForm.scheduledDate" label="Fecha del Seguimiento *" type="date" outlined dense color="deep-orange" bg-color="white" :rules="[val => !!val || 'Requerido']" />
            <q-input v-model="extraordinarioForm.extraordinaryReason" label="Motivo de la solicitud *" type="textarea" outlined dense rows="3" placeholder="Explique brevemente el motivo de este seguimiento extraordinario..." color="deep-orange" bg-color="white" :rules="[val => !!val && val.length >= 30 || 'Requerido. Mínimo 30 caracteres.']" />
            <q-file v-model="extraordinarioForm.file" label="Cargar Seguimiento (PDF)" outlined accept=".pdf" color="deep-orange" bg-color="white" max-file-size="10485760" @rejected="onExtraordinarioFileRejected">
              <template v-slot:prepend><q-icon name="picture_as_pdf" color="deep-orange" /></template>
            </q-file>
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md bg-white">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="deep-orange" label="Enviar Solicitud" rounded unelevated type="submit" :loading="savingExtraordinario" icon="send" />
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

            <q-step :name="1" title="Seguimiento del Aprendiz" icon="description" :done="executeStep > 1 || !!selectedTracking.driveFileUrl">
              <div class="q-pa-md bg-white rounded-borders shadow-1">
                <p class="text-subtitle1 text-grey-8 text-weight-medium">El aprendiz debe subir el seguimiento firmado con sus datos y firmas correspondientes.</p>
                
                <div v-if="selectedTracking.driveFileUrl" class="bg-green-1 q-pa-md rounded-borders q-mb-md text-positive flex items-center">
                  <q-icon name="check_circle" size="sm" class="q-mr-sm" /> El aprendiz ya subi&oacute; el seguimiento firmado. Puedes reemplazarlo si es necesario.
                </div>
                <div v-else class="bg-orange-1 q-pa-md rounded-borders q-mb-md text-orange flex items-center">
                  <q-icon name="hourglass_empty" size="sm" class="q-mr-sm" /> Esperando que el aprendiz suba el seguimiento firmado.
                </div>

                <q-file v-model="executeForm.file" label="Reemplazar Seguimiento (PDF)" outlined accept=".pdf" class="q-mb-md" color="primary">
                  <template v-slot:prepend><q-icon name="picture_as_pdf" color="primary" /></template>
                </q-file>

                <q-btn v-if="executeForm.file" color="primary" label="Reemplazar Documento" rounded unelevated @click="uploadPDF" :loading="saving" class="q-px-md" />

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
                <p class="text-subtitle1 text-grey-8 text-weight-medium">Confirma que el seguimiento contiene las firmas del aprendiz y del instructor.</p>
                <q-list bordered separator class="rounded-borders q-mb-md">
                  <q-item tag="label" v-ripple>
                    <q-item-section avatar><q-checkbox v-model="executeForm.signedByApprentice" color="primary" /></q-item-section>
                    <q-item-section><q-item-label>Firma del Aprendiz / Jefe Inmediato</q-item-label></q-item-section>
                  </q-item>
                  <q-item tag="label" v-ripple>
                    <q-item-section avatar><q-checkbox v-model="executeForm.signedByInstructor" color="primary" /></q-item-section>
                    <q-item-section><q-item-label>Firma del Instructor (Mi firma)</q-item-label></q-item-section>
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
  { name: 'extraordinario', label: 'Seg. Extraordinario', align: 'center' },
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

const noTrackingModalities = ['APPRENTICESHIP_CONTRACT', 'LABOR_LINK'];

const myEPsSinContrato = computed(() =>
  myEPs.value.filter(ep => !noTrackingModalities.includes(ep.modality))
);

const filteredApprentices = computed(() => {
  let rows = myEPs.value
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
        fileName: t.apprenticeFileName || t.fileName || `Seguimiento #${t.trackingNumber}`,
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
const createStep = ref(1);
const createSearchFilter = ref('');
const savingCreate = ref(false);

const createForm = ref({
  selectedApprentice: null,
  trackingInfo: null,
  trackingNumber: 1,
  type: 'IN_PERSON',
  scheduledDate: '',
  notes: '',
  isExtraordinary: false,
  file: null,
  aiValidated: false,
  aiValid: false,
  aiMessage: '',
  aiDetails: null,
  validatingAI: false
});

const filteredCreateApprentices = computed(() => {
  let rows = myEPs.value
    .filter(ep => !['APPRENTICESHIP_CONTRACT', 'LABOR_LINK'].includes(ep.modality))
    .map(ep => ({
      _id: ep._id,
      apprentice: {
        _id: ep.apprentice?._id || (typeof ep.apprentice === 'string' ? ep.apprentice : ''),
        fullName: ep.apprentice?.fullName || '',
        nationalId: ep.apprentice?.nationalId || 'N/D',
        enrollmentNumber: ep.apprentice?.enrollmentNumber || '',
        program: ep.apprentice?.program || '',
        trainingLevel: ep.apprentice?.trainingLevel || 'TECHNOLOGIST'
      },
      modality: ep.modality,
      firstNameAndLast: getFirstAndLast(ep.apprentice?.fullName || ''),
      requiredTrackings: ep.requiredTrackings || (ep.apprentice?.trainingLevel === 'TECHNICIAN' || ep.apprentice?.trainingLevel === 'TECHNOLOGIST' ? 3 : 2),
      completedTrackings: ep.completedTrackings || 0
    }));
  if (createSearchFilter.value) {
    const q = createSearchFilter.value.toLowerCase();
    rows = rows.filter(r =>
      r.apprentice.fullName.toLowerCase().includes(q) ||
      r.apprentice.nationalId.includes(q) ||
      r.apprentice.enrollmentNumber.toLowerCase().includes(q) ||
      r.apprentice.program.toLowerCase().includes(q)
    );
  }
  return rows;
});
const showExtraordinaryModal = ref(false);
const showExtraordinarioRowModal = ref(false);
const selectedApprenticeExtra = ref(null);
const savingExtraordinario = ref(false);
const extraordinarioForm = ref({ scheduledDate: '', extraordinaryReason: '', file: null });
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
  createStep.value = 1;
  createSearchFilter.value = '';
  createForm.value = {
    selectedApprentice: null,
    trackingInfo: null,
    trackingNumber: 1,
    type: 'IN_PERSON',
    scheduledDate: '',
    notes: '',
    isExtraordinary: false,
    file: null,
    aiValidated: false,
    aiValid: false,
    aiMessage: '',
    aiDetails: null,
    validatingAI: false
  };
  showCreateModal.value = true;
}

function resetCreateWizard() {
  showCreateModal.value = false;
  createStep.value = 1;
}

async function selectCreateApprentice(ep) {
  createForm.value.selectedApprentice = ep;
  try {
    const body = await trackingService.getNextNumber(ep._id);
    const info = body.data || body;
    createForm.value.trackingInfo = info;
    createForm.value.trackingNumber = info.nextTrackingNumber;
  } catch (err) {
    console.error('Error fetching tracking info:', err);
    createForm.value.trackingInfo = { requiredTrackings: ep.requiredTrackings, completedTrackings: ep.completedTrackings || 0, nextTrackingNumber: (ep.completedTrackings || 0) + 1, maxReached: false };
    createForm.value.trackingNumber = (ep.completedTrackings || 0) + 1;
  }
}

function onCreateFileRejected() {
  $q.notify({ type: 'warning', message: 'Solo se permiten archivos PDF de máximo 10 MB.', position: 'top', timeout: 5000 });
}

async function validateCreatePDF() {
  if (!createForm.value.file) return;
  createForm.value.validatingAI = true;
  try {
    const fd = new FormData();
    fd.append('file', createForm.value.file);
    const body = await trackingService.validatePDF(fd);
    const result = body.data || body;
    createForm.value.aiValidated = true;
    createForm.value.aiValid = result.valid;
    createForm.value.aiMessage = result.message || '';
    createForm.value.aiDetails = result.details || null;
    if (result.valid) {
      $q.notify({ type: 'positive', message: 'Validación IA exitosa.', position: 'top', timeout: 5000 });
    } else {
      $q.notify({ type: 'negative', message: 'La IA encontró problemas en el documento.', position: 'top', timeout: 5000 });
    }
  } catch (error) {
    console.error(error);
    createForm.value.aiValidated = true;
    createForm.value.aiValid = false;
    createForm.value.aiMessage = error.message || 'Error al validar';
    $q.notify({ type: 'negative', message: 'Error al validar con IA.', position: 'top', timeout: 5000 });
  } finally {
    createForm.value.validatingAI = false;
  }
}

function resetCreateAI() {
  createForm.value.aiValidated = false;
  createForm.value.aiValid = false;
  createForm.value.aiMessage = '';
  createForm.value.aiDetails = null;
}

async function confirmCreateTracking() {
  const f = createForm.value;
  if (!f.selectedApprentice || !f.scheduledDate) {
    $q.notify({ type: 'warning', message: 'Faltan datos requeridos.', position: 'top', timeout: 5000 });
    return;
  }
  saving.value = true;
  try {
    if (f.isExtraordinary) {
      const fd = new FormData();
      fd.append('productiveStageId', f.selectedApprentice._id);
      fd.append('type', 'EXTRAORDINARY');
      fd.append('scheduledDate', f.scheduledDate);
      fd.append('extraordinaryReason', f.notes || 'Seguimiento extraordinario solicitado por el instructor');
      if (f.file) fd.append('file', f.file);
      await trackingService.requestExtraordinaryWithFile(fd);
      $q.notify({ type: 'positive', message: 'Seguimiento extraordinario enviado a coordinación.', position: 'top', timeout: 5000 });
    } else {
      const payload = {
        productiveStageId: f.selectedApprentice._id,
        type: f.type,
        scheduledDate: f.scheduledDate,
        notes: f.notes?.trim() || ''
      };
      const createRes = await trackingService.create(payload);
      const tracking = createRes.data?.tracking || createRes.tracking;
      if (tracking && f.file) {
        const fd = new FormData();
        fd.append('file', f.file);
        await trackingService.uploadPDF(tracking._id, fd);
      }
      $q.notify({ type: 'positive', message: 'Seguimiento programado con éxito.', position: 'top', timeout: 5000 });
    }
    showCreateModal.value = false;
    fetchMyEPs();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al programar seguimiento.', position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

function openExtraordinaryModal() {
  resetForm();
  form.value.type = 'EXTRAORDINARY';
  showExtraordinaryModal.value = true;
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

function openExtraordinarioRowModal(row) {
  selectedApprenticeExtra.value = row;
  extraordinarioForm.value = { scheduledDate: '', extraordinaryReason: '', file: null };
  showExtraordinarioRowModal.value = true;
}

function onExtraordinarioFileRejected() {
  $q.notify({ type: 'warning', message: 'Solo se permiten archivos PDF de máximo 10 MB.', position: 'top', timeout: 5000 });
}

async function saveExtraordinarioTracking() {
  if (!selectedApprenticeExtra.value) return;
  savingExtraordinario.value = true;
  try {
    const fd = new FormData();
    fd.append('productiveStageId', selectedApprenticeExtra.value._id);
    fd.append('type', 'EXTRAORDINARY');
    fd.append('scheduledDate', extraordinarioForm.value.scheduledDate);
    fd.append('extraordinaryReason', extraordinarioForm.value.extraordinaryReason.trim());
    if (extraordinarioForm.value.file) {
      fd.append('file', extraordinarioForm.value.file);
    }
    await trackingService.requestExtraordinaryWithFile(fd);
    $q.notify({ type: 'positive', message: 'Seguimiento extraordinario enviado a coordinación.', position: 'top', timeout: 5000 });
    showExtraordinarioRowModal.value = false;
    fetchMyEPs();
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al enviar seguimiento extraordinario.', position: 'top', timeout: 5000 });
  } finally {
    savingExtraordinario.value = false;
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
