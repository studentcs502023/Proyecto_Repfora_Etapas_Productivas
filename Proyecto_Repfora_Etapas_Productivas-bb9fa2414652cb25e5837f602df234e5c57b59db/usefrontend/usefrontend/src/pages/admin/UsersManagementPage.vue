<template>
  <div class="users-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="group" class="q-mr-sm" size="md"/>Gestión de Usuarios
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Administra instructores y aprendices del sistema</p>
      </div>
      <div class="header-actions col-12 col-md-auto q-gutter-sm row justify-end items-center">
        <q-btn 
          v-if="activeTab === 'APPRENTICES'" 
          color="white" 
          text-color="primary"
          icon="upload_file" 
          label="Importar Aprendices" 
          class="header-btn text-weight-bold shadow-2"
          rounded
          @click="showImportModal = true" 
        />
        <q-btn 
          color="secondary" 
          text-color="white"
          icon="add" 
          :label="activeTab === 'INSTRUCTORS' ? 'Nuevo Instructor' : 'Nuevo Aprendiz'" 
          class="header-btn text-weight-bold shadow-2"
          rounded
          @click="openCreateModal(activeTab)" 
        />
      </div>
    </div>

    <!-- Tabs for Roles -->
    <div class="tabs-wrapper q-mb-lg flex flex-center">
      <q-tabs
        v-model="activeTab"
        dense
        class="custom-tabs bg-white shadow-2 rounded-borders"
        active-color="white"
        active-bg-color="primary"
        indicator-color="transparent"
        align="center"
        narrow-indicator
      >
        <q-tab name="INSTRUCTORS" class="custom-tab text-weight-bold" icon="school" label="Instructores" />
        <q-tab name="APPRENTICES" class="custom-tab text-weight-bold" icon="local_library" label="Aprendices" />
      </q-tabs>
    </div>

    <!-- Filters -->
    <q-card class="filter-card my-card q-mb-lg no-shadow">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-input 
            v-model="filter" 
            dense 
            outlined 
            color="primary"
            class="glass-input text-weight-medium"
            placeholder="Buscar por nombre o cédula..." 
            @update:model-value="debouncedFetch"
          >
            <template v-slot:prepend><q-icon name="search" color="grey-6" /></template>
          </q-input>
        </div>
        <div v-if="activeTab === 'INSTRUCTORS'" class="col-12 col-md-4">
          <q-select
            v-model="knowledgeAreaFilter"
            :options="knowledgeAreas"
            label="Área de Conocimiento"
            outlined dense clearable
            color="primary"
            class="glass-input text-weight-medium"
            @update:model-value="onFilterChange"
          >
            <template v-slot:prepend><q-icon name="psychology" color="grey-6" /></template>
          </q-select>
        </div>
        <div class="col-12 col-md-4 row justify-end items-center">
          <q-checkbox 
            v-model="showInactive" 
            label="Mostrar Usuarios Inactivos" 
            color="secondary" 
            class="text-weight-medium text-grey-8 custom-checkbox"
            @update:model-value="fetchUsers" 
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Users Table -->
    <q-card class="table-card my-card no-shadow" style="overflow-x: auto;">
      <q-table
        :rows="users"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        dense
        class="custom-table bg-transparent full-width"
        table-header-class="custom-table-header"
        table-style="min-width: 800px; table-layout: fixed;"
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>
        
        <template v-slot:body-cell-role="props">
          <q-td :props="props">
            <q-badge :color="getRoleColor(props.value)" :label="getRoleLabel(props.value)" class="role-badge q-px-sm q-py-xs text-weight-bold shadow-1" rounded />
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              v-if="!props.row.isActive"
              color="negative"
              text-color="white"
              dense
              class="status-chip text-weight-bold shadow-1"
            >
              ELIMINADO
            </q-chip>
            <q-chip
              v-else-if="activeTab === 'INSTRUCTORS' && props.row.status === 'INACTIVE'"
              color="warning"
              text-color="white"
              dense
              class="status-chip text-weight-bold shadow-1"
            >
              INACTIVO
            </q-chip>
            <q-chip
              v-else-if="activeTab === 'INSTRUCTORS' && props.row.status === 'CONTRACT_ENDED'"
              color="orange"
              text-color="white"
              dense
              class="status-chip text-weight-bold shadow-1"
            >
              CONTRATO FINALIZADO
            </q-chip>
            <q-chip
              v-else
              color="positive"
              text-color="white"
              dense
              class="status-chip text-weight-bold shadow-1"
            >
              ACTIVO
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs" style="white-space: nowrap;">
            <q-btn size="xs" flat round color="secondary" icon="edit" class="action-btn" @click="editUser(props.row)">
              <q-tooltip class="bg-secondary text-white shadow-4">Editar usuario</q-tooltip>
            </q-btn>

            <q-btn v-if="activeTab === 'APPRENTICES'" size="xs" flat round color="accent" icon="assignment_ind" class="action-btn" @click="openAssignModal(props.row)">
              <q-tooltip class="bg-accent text-white shadow-4">Asignar instructor</q-tooltip>
            </q-btn>

            <q-btn v-if="activeTab === 'INSTRUCTORS' && props.row.isActive && props.row.status === 'ACTIVE'" size="xs" flat round color="warning" icon="block" class="action-btn" @click="confirmDisableInstructor(props.row)">
              <q-tooltip class="bg-warning text-white shadow-4">Deshabilitar instructor</q-tooltip>
            </q-btn>

            <q-btn v-if="activeTab === 'INSTRUCTORS' && props.row.isActive && props.row.status === 'INACTIVE'" size="xs" flat round color="positive" icon="check_circle" class="action-btn" @click="confirmEnableInstructor(props.row)">
              <q-tooltip class="bg-positive text-white shadow-4">Habilitar instructor</q-tooltip>
            </q-btn>

            <q-btn v-if="activeTab === 'INSTRUCTORS' && props.row.isActive && props.row.status !== 'CONTRACT_ENDED'" size="xs" flat round color="deep-orange" icon="cancel_presentation" class="action-btn" @click="confirmEndContract(props.row)">
              <q-tooltip class="bg-deep-orange text-white shadow-4">Finalizar contrato</q-tooltip>
            </q-btn>

            <q-btn v-if="!props.row.isActive" size="xs" flat round color="positive" icon="restore_from_trash" class="action-btn" @click="confirmActivateUser(props.row)">
              <q-tooltip class="bg-positive text-white shadow-4">Restaurar usuario eliminado</q-tooltip>
            </q-btn>

            <q-btn v-if="props.row.isActive" size="xs" flat round color="negative" icon="delete" class="action-btn" @click="confirmDeleteUser(props.row)">
              <q-tooltip class="bg-negative text-white shadow-4">Eliminar usuario</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Nuevo/Editar Usuario -->
    <q-dialog v-model="showUserModal" persistent transition-show="scale" transition-hide="scale">
      <q-card class="modal-card" :style="activeTab === 'APPRENTICES' ? 'width: 750px; max-width: 95vw;' : 'width: 550px; max-width: 90vw;'">
        <q-form @submit="saveUser" style="display: flex; flex-direction: column; max-height: 85vh;">
          <q-card-section class="bg-primary text-white row items-center">
            <div class="text-h6 text-weight-bold">
              <q-icon :name="isEditing ? 'edit' : 'add_circle'" class="q-mr-sm" size="sm"/>
              {{ isEditing ? 'Editar Usuario' : (activeTab === 'INSTRUCTORS' ? 'Nuevo Instructor' : 'Nuevo Aprendiz') }}
            </div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          
          <q-card-section class="q-pa-lg q-gutter-md" style="flex: 1; overflow-y: auto;">
            <!-- Campos comunes -->
            <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm"><q-icon name="person" class="q-mr-xs"/>Datos Personales</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input v-model="userForm.nationalId" label="Cédula / Documento" outlined dense color="primary" class="glass-input" :disable="isEditing" :rules="[val => !!val || 'Requerido', val => /^\d{7,15}$/.test(val) || 'Debe tener solo dígitos (7-15)']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="userForm.fullName" label="Nombre Completo" outlined dense color="primary" class="glass-input" :rules="[val => !!val || 'Requerido', val => !val || !/\d/.test(val) || 'No se permiten números']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="userForm.email" label="Correo Electrónico" type="email" outlined dense color="primary" class="glass-input" :rules="[val => !!val || 'Requerido', val => !val || /.+@.+\..+/.test(val) || 'El correo debe contener @ y un dominio válido']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="userForm.phone" label="Teléfono" outlined dense color="primary" class="glass-input" :rules="[val => !val || /^\d{7,15}$/.test(val) || 'Debe tener solo dígitos (7-15)']" />
              </div>
            </div>
            
            <!-- Campos exclusivos Instructor -->
            <template v-if="activeTab === 'INSTRUCTORS'">
              <q-separator class="q-my-md opacity-20" />
              <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm"><q-icon name="work" class="q-mr-xs"/>Datos del Instructor</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-6">
                  <q-select 
                    v-model="userForm.instructorType" 
                    :options="[{ label: 'Técnico', value: 'TECHNICAL' }, { label: 'Proyecto', value: 'PROJECT' }]" 
                    option-label="label"
                    option-value="value"
                    emit-value
                    map-options
                    label="Tipo de Instructor" 
                    outlined dense color="primary" class="glass-input"
                    :rules="[val => !!val || 'Requerido']" 
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="userForm.knowledgeArea"
                    :options="knowledgeAreasFiltered"
                    label="Área de Conocimiento"
                    outlined dense color="primary" class="glass-input"
                    emit-value
                    map-options
                    use-input
                    input-debounce="0"
                    @filter="filterKnowledgeAreas"
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
              </div>
            </template>
            
            <!-- Campos exclusivos Aprendiz -->
            <template v-if="activeTab === 'APPRENTICES'">
              <q-separator class="q-my-md opacity-20" />
              <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm"><q-icon name="school" class="q-mr-xs"/>Datos Académicos</div>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-md-4">
                  <q-input v-model="userForm.enrollmentNumber" label="No. Ficha" outlined dense color="primary" class="glass-input" :rules="[val => !!val || 'Requerido', val => /^\d+$/.test(val) || 'Solo números']" />
                </div>
                <div class="col-12 col-md-4">
                  <q-select
                    v-model="userForm.program"
                    :options="programsFiltered"
                    label="Programa de Formación"
                    outlined dense color="primary" class="glass-input"
                    emit-value
                    map-options
                    use-input
                    input-debounce="0"
                    @filter="filterPrograms"
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12 col-md-4">
                  <q-select 
                    v-model="userForm.trainingLevel" 
                    :options="[{ label: 'Técnico', value: 'TECHNICIAN' }, { label: 'Tecnólogo', value: 'TECHNOLOGIST' }]" 
                    option-label="label"
                    option-value="value"
                    emit-value
                    map-options
                    label="Nivel de Formación" 
                    outlined dense color="primary" class="glass-input"
                    :rules="[val => !!val || 'Requerido']" 
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="userForm.trainingCenter"
                    :options="centersFiltered"
                    label="Centro de Formación"
                    outlined dense color="primary" class="glass-input"
                    emit-value
                    map-options
                    use-input
                    input-debounce="0"
                    @filter="filterCenters"
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-input v-model="userForm.enrollmentExpiryDate" type="date" label="Fin de Etapa Lectiva" outlined dense color="primary" class="glass-input" stack-label :rules="[val => !!val || 'Requerido']" />
                </div>
                <div class="col-12">
                  <q-checkbox v-model="userForm.isPreNov2024" label="¿Ingresó antes de Noviembre 2024?" dense color="secondary" class="text-weight-medium text-grey-8 custom-checkbox" />
                </div>
              </div>
            </template>
          </q-card-section>
          
          <q-separator class="opacity-20" />
          <q-card-actions align="right" class="q-pa-md bg-grey-1">
            <q-btn flat label="Cancelar" color="grey-8" class="text-weight-bold" v-close-popup />
            <q-btn color="primary" label="Guardar" type="submit" :loading="saving" class="text-weight-bold shadow-2" rounded padding="xs lg"/>
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Importar Aprendices -->
    <q-dialog v-model="showImportModal" transition-show="scale" transition-hide="scale">
      <q-card class="modal-card" style="width: 450px;">
        <q-form @submit="importUsers">
          <q-card-section class="bg-secondary text-white row items-center">
            <div class="text-h6 text-weight-bold"><q-icon name="cloud_upload" class="q-mr-sm" size="sm"/>Importación Masiva</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          <q-card-section class="q-pa-lg text-center">
            <q-icon name="description" size="4rem" color="grey-4" class="q-mb-md" />
            <p class="text-body1 text-grey-8 q-mb-lg">Seleccione un archivo CSV o Excel (.xlsx) para cargar aprendices de forma masiva.</p>
            <q-file v-model="importFile" label="Seleccionar archivo..." outlined dense color="secondary" class="glass-input" accept=".csv, .xlsx" :rules="[val => !!val || 'Seleccione un archivo']">
              <template v-slot:prepend><q-icon name="attach_file" color="secondary" /></template>
            </q-file>
          </q-card-section>
          <q-separator class="opacity-20" />
          <q-card-actions align="center" class="q-pa-md bg-grey-1">
            <q-btn color="secondary" label="Subir Archivo" icon="upload" type="submit" :loading="importing" class="text-weight-bold shadow-2 full-width" rounded />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
    
    <!-- Modal: Asignación Rápida -->
    <q-dialog v-model="showAssignModal" persistent transition-show="scale" transition-hide="scale">
      <q-card class="modal-card" style="width: 450px;">
        <q-form @submit="submitQuickAssign">
          <q-card-section class="bg-accent text-white row items-center">
            <div class="text-h6 text-weight-bold"><q-icon name="assignment_ind" class="q-mr-sm" size="sm"/>Asignación Rápida</div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          <q-card-section class="q-pa-lg">
            <div class="bg-blue-grey-1 q-pa-md rounded-borders q-mb-lg row items-center">
              <q-avatar color="accent" text-color="white" icon="person" size="md" class="q-mr-md" />
              <div>
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">Aprendiz</div>
                <div class="text-subtitle1 text-weight-bolder text-dark">{{ selectedApprentice?.fullName }}</div>
              </div>
            </div>
            
            <q-select 
              v-model="selectedInstructor" 
              :options="instructorsList" 
              option-value="_id" 
              option-label="fullName" 
              label="Selecciona un Instructor" 
              outlined 
              dense 
              color="accent"
              class="glass-input"
              emit-value 
              :rules="[val => !!val || 'Requerido']" 
            >
              <template v-slot:prepend><q-icon name="school" color="accent" /></template>
            </q-select>
          </q-card-section>
          <q-separator class="opacity-20" />
          <q-card-actions align="right" class="q-pa-md bg-grey-1">
            <q-btn flat label="Cancelar" color="grey-8" class="text-weight-bold" v-close-popup />
            <q-btn color="accent" label="Asignar" type="submit" :loading="assigning" class="text-weight-bold shadow-2" rounded padding="xs lg"/>
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Reasignación por Finalización de Contrato -->
    <q-dialog v-model="showReassignModal" persistent transition-show="scale" transition-hide="scale">
      <q-card class="modal-card" style="width: 650px; max-width: 95vw;">
        <q-card-section class="bg-deep-orange text-white row items-center">
          <div class="text-h6 text-weight-bold">
            <q-icon name="swap_horiz" class="q-mr-sm" size="sm"/>
            Reasignación de Aprendices
          </div>
          <q-space />
          <q-btn icon="close" flat round dense @click="cancelReassignment" />
        </q-card-section>
        
        <q-card-section class="q-pa-lg" style="max-height: 60vh; overflow-y: auto;">
          <q-banner rounded class="bg-orange-1 text-orange-10 q-mb-md">
            <template v-slot:avatar>
              <q-icon name="info" color="orange-10" size="lg" />
            </template>
            <div class="text-weight-bold">El contrato de <span class="text-deep-orange">{{ endingInstructor?.fullName }}</span> ha sido finalizado.</div>
            <div class="text-caption">Debe reasignar los siguientes {{ affectedApprentices.length }} aprendiz(es) a un nuevo instructor activo:</div>
          </q-banner>

          <q-list bordered separator class="rounded-borders q-mb-md">
            <q-item v-for="(app, i) in affectedApprentices" :key="app.stageId" class="q-px-md">
              <q-item-section avatar>
                <q-avatar color="deep-orange-1" text-color="deep-orange-8" size="sm">{{ i + 1 }}</q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ app.fullName }}</q-item-label>
                <q-item-label caption>Modalidad: {{ app.modality || '—' }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-select
            v-model="newInstructorForReassign"
            :options="activeInstructorsList"
            option-value="_id"
            option-label="fullName"
            label="Selecciona el nuevo instructor"
            outlined
            dense
            color="deep-orange"
            class="glass-input"
            emit-value
            map-options
            :rules="[val => !!val || 'Debe seleccionar un instructor']"
          >
            <template v-slot:prepend><q-icon name="school" color="deep-orange" /></template>
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-avatar color="deep-orange" text-color="white" size="sm">{{ scope.opt.fullName.charAt(0) }}</q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.fullName }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.email }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-separator class="opacity-20" />
        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat label="Cancelar" color="grey-8" class="text-weight-bold" @click="cancelReassignment" />
          <q-btn color="deep-orange" label="Reasignar Aprendices" :loading="reassigning" :disable="!newInstructorForReassign" @click="executeReassignment" class="text-weight-bold shadow-2" rounded padding="xs lg"/>
        </q-card-actions>
      </q-card>
    </q-dialog>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import userService from '../../api/user.service';
import productiveStageService from '../../api/productiveStage.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const knowledgeAreas = [
  'Administrativa', 'Agrícola', 'Agroindustrial', 'Artesanías',
  'Biotecnología', 'Ciencias Naturales', 'Comercio', 'Construcción',
  'Contable y Financiera', 'Diseño', 'Electricidad y Electrónica',
  'Gestión Administrativa', 'Gestión de Redes y Seguridad',
  'Gestión Documental', 'Hostelería y Turismo', 'Idiomas',
  'Informática y Sistemas', 'Logística', 'Manufactura', 'Mecánica',
  'Medio Ambiente', 'Mercadeo y Ventas', 'Minería', 'Pecuaria',
  'Pesca', 'Química', 'Salud', 'Seguridad Ocupacional',
  'Telecomunicaciones', 'Textil y Confección', 'Transporte', 'Turismo'
];
const knowledgeAreasFiltered = ref([...knowledgeAreas]);
function filterKnowledgeAreas(val, update) {
  if (val === '') {
    update(() => { knowledgeAreasFiltered.value = [...knowledgeAreas]; });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    knowledgeAreasFiltered.value = knowledgeAreas.filter(v => v.toLowerCase().includes(needle));
  });
}

const programs = [
  'Técnico en Sistemas', 'Técnico en Programación de Software',
  'Técnico en Asistencia Administrativa', 'Técnico en Contabilización de Operaciones Comerciales y Financieras',
  'Técnico en Electricidad Industrial', 'Técnico en Electrónica Industrial',
  'Técnico en Mecánica Automotriz', 'Técnico en Soldadura',
  'Técnico en Cocina', 'Técnico en Panificación',
  'Técnico en Mesa y Bar', 'Técnico en Atención Integral a la Primera Infancia',
  'Técnico en Enfermería', 'Técnico en Seguridad Ocupacional',
  'Técnico en Logística Empresarial', 'Técnico en Mercadeo',
  'Técnico en Ventas de Productos y Servicios', 'Técnico en Confección Industrial',
  'Técnico en Gestión Empresarial', 'Técnico en Recursos Humanos',
  'Técnico en Contabilidad', 'Técnico en Producción Agropecuaria',
  'Técnico en Instalaciones Eléctricas Residenciales', 'Técnico en Construcciones Livianas',
  'Técnico en Mantenimiento de Equipos de Cómputo', 'Técnico en Gestión Documental',
  'Técnico en Producción de Multimedia', 'Técnico en Manejo Ambiental',
  'Tecnólogo en Análisis y Desarrollo de Software', 'Tecnólogo en Gestión Administrativa',
  'Tecnólogo en Contabilidad y Finanzas', 'Tecnólogo en Gestión del Talento Humano',
  'Tecnólogo en Logística del Transporte', 'Tecnólogo en Mercadeo',
  'Tecnólogo en Producción de Multimedia', 'Tecnólogo en Gestión Documental',
  'Tecnólogo en Gestión de Redes de Datos', 'Tecnólogo en Gestión de Procesos Administrativos de Salud',
  'Tecnólogo en Mantenimiento Electrónico e Instrumental Industrial',
  'Tecnólogo en Electricidad Industrial', 'Tecnólogo en Automatización Industrial',
  'Tecnólogo en Diseño de Modas', 'Tecnólogo en Gestión de Empresas Agropecuarias',
  'Tecnólogo en Calidad de los Alimentos', 'Tecnólogo en Gestión de la Producción Industrial',
  'Tecnólogo en Gestión del Transporte', 'Tecnólogo en Negociación Internacional'
];
const programsFiltered = ref([...programs]);
function filterPrograms(val, update) {
  if (val === '') {
    update(() => { programsFiltered.value = [...programs]; });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    programsFiltered.value = programs.filter(v => v.toLowerCase().includes(needle));
  });
}

const trainingCenters = [
  'Centro de Biotecnología Industrial', 'Centro de Diseño y Metrología',
  'Centro de Electricidad, Electrónica y Telecomunicaciones',
  'Centro de Gestión Administrativa', 'Centro de Gestión Industrial',
  'Centro de Gestión de Mercados, Logística y TI',
  'Centro de Gestión Tecnológica de Servicios', 'Centro de Materiales y Ensayos',
  'Centro de Manufactura en Textil y Cuero', 'Centro de Metalmecánico',
  'Centro de Procesos Industriales y Construcción', 'Centro de Servicios Financieros',
  'Centro de Tecnología de la Manufactura Avanzada', 'Centro de Tecnologías del Transporte',
  'Centro de Teleinformática y Producción Industrial',
  'Centro Nacional de Asistencia Técnica a la Industria (ASTIN)',
  'Centro Nacional de la Construcción', 'Centro Nacional de la Madera',
  'Centro Nacional de las Artes Gráficas', 'Centro Nacional de Mecanización Agrícola',
  'Centro Nacional de Metrología', 'Centro Nacional de Servicios Diagnósticos Automotrices',
  'Centro Nacional de Hotelería, Turismo y Alimentos',
  'Centro para la Formación Cafetera', 'Centro para la Formación en Diseño y Marketing',
  'Complejo Tecnológico de la Costa Atlántica', 'Complejo Tecnológico de la Vivienda',
  'Complejo Tecnológico Minero-Ambiental', 'Centro de la Construcción y la Madera',
  'Centro de Comercio y Servicios', 'Centro de Industria y Construcción',
  'Centro Agropecuario', 'Centro de Recursos Naturales',
  'Centro de Diseño e Innovación Tecnológica'
];
const centersFiltered = ref([...trainingCenters]);
function filterCenters(val, update) {
  if (val === '') {
    update(() => { centersFiltered.value = [...trainingCenters]; });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    centersFiltered.value = trainingCenters.filter(v => v.toLowerCase().includes(needle));
  });
}

// State
const activeTab = ref('INSTRUCTORS');
const users = ref([]);
const loading = ref(false);
const filter = ref('');
const knowledgeAreaFilter = ref('');
const showInactive = ref(false);

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

// Modals State
const showUserModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const showImportModal = ref(false);
const importFile = ref(null);
const importing = ref(false);

// Quick Assign State
const showAssignModal = ref(false);
const assigning = ref(false);
const selectedApprentice = ref(null);
const selectedInstructor = ref('');
const instructorsList = ref([]);

// End Contract / Reassign State
const showReassignModal = ref(false);
const reassigning = ref(false);
const endingInstructor = ref(null);
const affectedApprentices = ref([]);
const newInstructorForReassign = ref('');
const activeInstructorsList = ref([]);

// Form State
const userForm = ref({
  _id: null,
  nationalId: '',
  fullName: '',
  email: '',
  phone: '',
  // Instructor fields
  instructorType: '',
  knowledgeArea: '',
  // Apprentice fields
  enrollmentNumber: '',
  program: '',
  trainingLevel: '',
  trainingCenter: '',
  enrollmentExpiryDate: '',
  isPreNov2024: false
});

// Table Config
const columns = [
  { name: 'nationalId', label: 'Documento', field: 'nationalId', align: 'left', style: 'width: 110px;' },
  { name: 'fullName', label: 'Nombre Completo', field: 'fullName', align: 'left', style: 'width: 180px;' },
  { name: 'email', label: 'Correo', field: 'email', align: 'left', style: 'width: 190px;' },
  { name: 'role', label: 'Rol', field: 'role', align: 'center', style: 'width: 100px;' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center', style: 'width: 110px;' },
  { name: 'actions', label: 'Acciones', align: 'center', style: 'width: 130px;' }
];

let searchTimeout = null;

onMounted(() => {
  fetchUsers();
});

watch(activeTab, () => {
  filter.value = '';
  knowledgeAreaFilter.value = '';
  pagination.value.page = 1;
  fetchUsers();
});

function debouncedFetch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1;
    fetchUsers();
  }, 500);
}

function onFilterChange() {
  pagination.value.page = 1;
  fetchUsers();
}

async function fetchUsers() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      search: filter.value || undefined,
      isActive: showInactive.value ? false : true
    };

    if (activeTab.value === 'INSTRUCTORS' && knowledgeAreaFilter.value) {
      params.knowledgeArea = knowledgeAreaFilter.value;
    }

    let response;
    if (activeTab.value === 'INSTRUCTORS') {
      response = await userService.getInstructors(params);
      const resData = response.data.data || response.data;
      users.value = resData.instructors || resData;
      if (resData.pagination) {
        pagination.value.rowsNumber = resData.pagination.total;
      }
    } else {
      response = await userService.getApprentices(params);
      const resData = response.data.data || response.data;
      users.value = resData.apprentices || resData;
      if (resData.pagination) {
        pagination.value.rowsNumber = resData.pagination.total;
      }
    }
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar usuarios', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  const { page, rowsPerPage } = props.pagination;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  fetchUsers();
}

function getRoleLabel(role) {
  const map = { ADMIN: 'Administrador', INSTRUCTOR: 'Instructor', APPRENTICE: 'Aprendiz' };
  return map[role] || role;
}

function getRoleColor(role) {
  switch (role) {
    case 'ADMIN': return 'secondary';
    case 'INSTRUCTOR': return 'primary';
    case 'APPRENTICE': return 'accent';
    default: return 'grey';
  }
}

function resetForm() {
  userForm.value = {
    _id: null,
    nationalId: '',
    fullName: '',
    email: '',
    phone: '',
    instructorType: 'TECHNICAL',
    knowledgeArea: '',
    enrollmentNumber: '',
    program: '',
    trainingLevel: 'TECHNOLOGIST',
    trainingCenter: '',
    enrollmentExpiryDate: '',
    isPreNov2024: false
  };
}

function openCreateModal(role) {
  resetForm();
  isEditing.value = false;
  showUserModal.value = true;
}

function editUser(user) {
  resetForm();
  const data = { ...user };
  if (data.enrollmentExpiryDate) {
    data.enrollmentExpiryDate = data.enrollmentExpiryDate.split('T')[0];
  }
  userForm.value = data;
  isEditing.value = true;
  showUserModal.value = true;
}

async function saveUser() {
  saving.value = true;
  try {
    const payload = {
      nationalId: userForm.value.nationalId.trim(),
      fullName: userForm.value.fullName.trim(),
      email: userForm.value.email.trim(),
      phone: userForm.value.phone.trim(),
      instructorType: userForm.value.instructorType,
      knowledgeArea: userForm.value.knowledgeArea.trim(),
      enrollmentNumber: userForm.value.enrollmentNumber,
      program: userForm.value.program.trim(),
      trainingLevel: userForm.value.trainingLevel,
      trainingCenter: userForm.value.trainingCenter.trim(),
      enrollmentExpiryDate: userForm.value.enrollmentExpiryDate,
      isPreNov2024: userForm.value.isPreNov2024
    };

    if (activeTab.value === 'INSTRUCTORS') {
      if (isEditing.value) {
        await userService.updateInstructor(userForm.value._id, payload);
        const idx = users.value.findIndex(u => u._id === userForm.value._id);
        if (idx !== -1) {
          const res = await userService.getInstructorById(userForm.value._id);
          users.value[idx] = res.data?.instructor || res.data;
        }
      } else {
        const res = await userService.createInstructor(payload);
        const created = res.data?.instructor || res.data;
        users.value.unshift(created);
      }
    } else {
      if (isEditing.value) {
        await userService.updateApprentice(userForm.value._id, payload);
        const idx = users.value.findIndex(u => u._id === userForm.value._id);
        if (idx !== -1) {
          const res = await userService.getApprenticeById(userForm.value._id);
          users.value[idx] = res.data?.apprentice || res.data;
        }
      } else {
        const res = await userService.createApprentice(payload);
        const created = res.data?.apprentice || res.data;
        users.value.unshift(created);
      }
    }

    $q.notify({ type: 'positive', message: `Usuario ${isEditing.value ? 'actualizado' : 'creado'} con éxito`, position: 'top', timeout: 5000 });
    showUserModal.value = false;
  } catch (error) {
    console.error(error);
    const msg = error.message || error.response?.data?.message || 'Error al guardar usuario';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    saving.value = false;
  }
}

async function importUsers() {
  if (!importFile.value) return;
  importing.value = true;
  try {
    const formData = new FormData();
    formData.append('file', importFile.value);
    
    const res = await userService.importApprentices(formData);
    $q.notify({ type: 'positive', message: `Importación exitosa. ${res.data?.count || ''} registros procesados.`, position: 'top', timeout: 5000 });
    showImportModal.value = false;
    importFile.value = null;
    if (activeTab.value === 'APPRENTICES') fetchUsers();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al importar usuarios';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    importing.value = false;
  }
}

// Quick Assign Logic
async function openAssignModal(user) {
  selectedApprentice.value = user;
  selectedInstructor.value = '';
  showAssignModal.value = true;
  if (instructorsList.value.length === 0) {
    try {
      const res = await userService.getInstructors({ limit: 100 });
      const resData = res.data.data || res.data;
      const list = resData.instructors || resData;
      instructorsList.value = (Array.isArray(list) ? list : []).filter(i => i.isActive !== false);
    } catch (e) {
      console.error(e);
      $q.notify({ type: 'negative', message: e.message || 'Error cargando instructores', position: 'top', timeout: 5000 });
    }
  }
}

async function submitQuickAssign() {
  assigning.value = true;
  try {
    await productiveStageService.quickAssign(selectedApprentice.value._id, selectedInstructor.value);
    $q.notify({ type: 'positive', message: '¡Asignación rápida completada con éxito! (Etapa Activa)', position: 'top', timeout: 5000 });
    showAssignModal.value = false;
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error en asignación rápida';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    assigning.value = false;
  }
}

// --- Eliminar / Deshabilitar ---

function confirmDisableInstructor(user) {
  $q.dialog({
    title: 'Deshabilitar Instructor',
    message: `¿Está seguro de deshabilitar a ${user.fullName}? No podrá realizar nuevas acciones pero sus registros se conservan.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Deshabilitar', color: 'warning' },
    persistent: true
  }).onOk(() => disableInstructor(user));
}

async function disableInstructor(user) {
  try {
    await userService.changeInstructorStatus(user._id, 'INACTIVE', 'Deshabilitado por administrador');
    const idx = users.value.findIndex(u => u._id === user._id);
    if (idx !== -1) users.value[idx] = { ...users.value[idx], status: 'INACTIVE' };
    $q.notify({ type: 'warning', message: `${user.fullName} deshabilitado`, position: 'top', timeout: 3000 });
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al deshabilitar instructor';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  }
}

function confirmEnableInstructor(user) {
  $q.dialog({
    title: 'Activar Instructor',
    message: `¿Está seguro de activar nuevamente a ${user.fullName}? Podrá acceder al sistema y tener aprendices.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Activar', color: 'positive' },
    persistent: true
  }).onOk(() => enableInstructor(user));
}

async function enableInstructor(user) {
  try {
    await userService.changeInstructorStatus(user._id, 'ACTIVE', 'Activado por administrador');
    const idx = users.value.findIndex(u => u._id === user._id);
    if (idx !== -1) users.value[idx] = { ...users.value[idx], status: 'ACTIVE' };
    $q.notify({ type: 'positive', message: `${user.fullName} activado`, position: 'top', timeout: 3000 });
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al activar instructor';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  }
}

// --- Finalizar Contrato / Reasignación ---

function confirmEndContract(user) {
  $q.dialog({
    title: 'Finalizar Contrato',
    message: `¿Está seguro de finalizar el contrato de ${user.fullName}? Se identificarán los aprendices activos y deberá reasignarlos a otro instructor. Esta acción es irreversible.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Finalizar Contrato', color: 'deep-orange' },
    persistent: true
  }).onOk(() => endContract(user));
}

async function endContract(user) {
  try {
    const res = await userService.changeInstructorStatus(user._id, 'CONTRACT_ENDED', 'Contrato finalizado por administrador');
    const data = res.data?.data || res.data;
    endingInstructor.value = user;

    const idx = users.value.findIndex(u => u._id === user._id);
    if (idx !== -1) users.value[idx] = { ...users.value[idx], status: 'CONTRACT_ENDED' };

    const apprentices = data.affectedApprentices || [];
    affectedApprentices.value = apprentices;

    if (apprentices.length > 0) {
      await loadActiveInstructors(user._id);
      showReassignModal.value = true;
      $q.notify({ type: 'warning', message: `Contrato finalizado. ${apprentices.length} aprendiz(es) pendiente(s) de reasignación.`, position: 'top', timeout: 5000 });
    } else {
      $q.notify({ type: 'positive', message: 'Contrato de ' + user.fullName + ' finalizado. Sin aprendices pendientes.', position: 'top', timeout: 5000 });
    }
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al finalizar contrato';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  }
}

async function loadActiveInstructors(excludeId) {
  try {
    const res = await userService.getInstructors({ limit: 100, isActive: true });
    const resData = res.data.data || res.data;
    const list = resData.instructors || resData;
    activeInstructorsList.value = (Array.isArray(list) ? list : [])
      .filter(i => i._id !== excludeId && i.status === 'ACTIVE' && i.isActive !== false);
    newInstructorForReassign.value = '';
  } catch (e) {
    console.error(e);
    $q.notify({ type: 'negative', message: 'Error cargando instructores activos', position: 'top', timeout: 5000 });
  }
}

async function executeReassignment() {
  if (!newInstructorForReassign.value) return;
  reassigning.value = true;
  try {
    const stageIds = affectedApprentices.value.map(a => a.stageId);
    await userService.reassignApprentices(endingInstructor.value._id, newInstructorForReassign.value, stageIds);
    const newInstructor = activeInstructorsList.value.find(i => i._id === newInstructorForReassign.value);
    $q.notify({
      type: 'positive',
      message: `¡Reasignación completada! ${affectedApprentices.value.length} aprendiz(es) transferido(s) a ${newInstructor?.fullName || 'nuevo instructor'}.`,
      position: 'top',
      timeout: 5000
    });
    fetchUsers();
    cancelReassignment();
  } catch (error) {
    const msg = error.response?.data?.message || 'Error en reasignación';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    reassigning.value = false;
  }
}

function cancelReassignment() {
  showReassignModal.value = false;
  affectedApprentices.value = [];
  endingInstructor.value = null;
  newInstructorForReassign.value = '';
}

function confirmDeleteUser(user) {
  const rol = user.role === 'INSTRUCTOR' ? 'instructor' : 'aprendiz';
  $q.dialog({
    title: `Inactivar ${rol}`,
    message: `¿Está seguro de inactivar a ${user.fullName}? Podrá reactivarlo luego seleccionando "Mostrar Inactivos".`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Inactivar', color: 'negative' },
    persistent: true
  }).onOk(() => deleteUser(user));
}

async function deleteUser(user) {
  try {
    if (user.role === 'INSTRUCTOR') {
      await userService.deactivateInstructor(user._id);
    } else {
      await userService.deactivateApprentice(user._id);
    }
    users.value = users.value.filter(u => u._id !== user._id);
    if (showInactive.value) fetchUsers(); // Si está viendo inactivos, recargamos
    $q.notify({ type: 'positive', message: `${user.fullName} inactivado`, position: 'top', timeout: 3000 });
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al inactivar usuario';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  }
}

function confirmActivateUser(user) {
  const rol = user.role === 'INSTRUCTOR' ? 'instructor' : 'aprendiz';
  $q.dialog({
    title: `Activar ${rol}`,
    message: `¿Está seguro de activar nuevamente a ${user.fullName}? Podrá acceder al sistema y realizar acciones.`,
    cancel: { label: 'Cancelar', flat: true },
    ok: { label: 'Activar', color: 'positive' },
    persistent: true
  }).onOk(() => activateUser(user));
}

async function activateUser(user) {
  try {
    if (user.role === 'INSTRUCTOR') {
      await userService.activateInstructor(user._id);
    } else {
      await userService.activateApprentice(user._id);
    }
    
    // Si no estamos mostrando inactivos, al activarlo debería desaparecer si no hacemos fetch, 
    // pero si lo acabamos de activar y estamos en "Mostrar Inactivos", se debe actualizar la vista.
    fetchUsers();
    
    $q.notify({ type: 'positive', message: `${user.fullName} activado correctamente`, position: 'top', timeout: 3000 });
  } catch (error) {
    const msg = error.response?.data?.message || 'Error al activar usuario';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.users-container {
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Premium Header */
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

.shadow-text {
  text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
}

.opacity-80 { opacity: 0.8; }
.opacity-20 { opacity: 0.2; }

/* Cards & Glassmorphism */
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

.modal-card {
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
}

/* Custom Tabs */
.custom-tabs {
  border-radius: 30px !important;
  padding: 4px;
}

.custom-tab {
  border-radius: 25px;
  padding: 8px 24px;
  transition: all 0.3s ease;
}

/* Inputs */
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

/* Table Enhancements */
.custom-table {
  border-radius: 20px;
}

.custom-table :deep(.q-table__container) {
  background: transparent;
  overflow-x: auto;
}

.custom-table :deep(th) {
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #4a5568;
  border-bottom: 2px solid rgba(0,0,0,0.05);
  white-space: nowrap;
}

.custom-table :deep(tbody tr) {
  transition: all 0.2s ease;
}

.custom-table :deep(tbody tr:hover) {
  background-color: #f8fcfb !important;
  transform: scale(1.002);
}

.custom-table :deep(td) {
  border-bottom: 1px solid rgba(0,0,0,0.03);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}

/* Chips & Badges */
.status-chip, .role-badge {
  letter-spacing: 0.5px;
}

.action-btn {
  transition: all 0.2s ease;
}

.action-btn:hover {
  transform: scale(1.15) rotate(5deg);
}

.header-btn {
  transition: all 0.3s ease;
}

.header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important;
}

.custom-checkbox :deep(.q-checkbox__inner) {
  transition: all 0.3s ease;
}
</style>
