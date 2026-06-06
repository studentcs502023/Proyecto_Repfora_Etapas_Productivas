<template>
  <div class="users-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Gestión de Usuarios</h2>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn v-if="activeTab === 'APPRENTICES'" color="secondary" outline icon="upload_file" label="Importar Aprendices" @click="showImportModal = true" />
        <q-btn color="primary" icon="add" :label="activeTab === 'INSTRUCTORS' ? 'Nuevo Instructor' : 'Nuevo Aprendiz'" @click="openCreateModal(activeTab)" />
      </div>
    </div>

    <!-- Tabs for Roles -->
    <q-tabs
      v-model="activeTab"
      dense
      class="text-grey"
      active-color="primary"
      indicator-color="primary"
      align="left"
      narrow-indicator
    >
      <q-tab name="INSTRUCTORS" label="Instructores" />
      <q-tab name="APPRENTICES" label="Aprendices" />
    </q-tabs>

    <q-separator />

    <!-- Filters -->
    <q-card flat bordered class="q-mt-md q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-input v-model="filter" dense outlined placeholder="Buscar por nombre o cédula..." @update:model-value="debouncedFetch">
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-3">
          <q-checkbox v-model="showInactive" label="Mostrar Inactivos" dense color="primary" @update:model-value="fetchUsers" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Users Table -->
    <q-card flat bordered>
      <q-table
        :rows="users"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:body-cell-role="props">
          <q-td :props="props">
            <q-badge :color="getRoleColor(props.value)" :label="getRoleLabel(props.value)" />
          </q-td>
        </template>

        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.isActive ? 'positive' : 'negative'"
              text-color="white"
              dense
              size="sm"
            >
              {{ props.row.isActive ? 'ACTIVO' : 'INACTIVO' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn size="sm" flat round color="secondary" icon="edit" @click="editUser(props.row)">
              <q-tooltip>Editar usuario</q-tooltip>
            </q-btn>

            <q-btn v-if="activeTab === 'APPRENTICES'" size="sm" flat round color="accent" icon="assignment_ind" @click="openAssignModal(props.row)">
              <q-tooltip>Asignar instructor</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Nuevo/Editar Usuario -->
    <q-dialog v-model="showUserModal" persistent>
      <q-card :style="activeTab === 'APPRENTICES' ? 'width: 650px; max-width: 95vw;' : 'width: 500px; max-width: 90vw;'">
        <q-form @submit="saveUser">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">{{ isEditing ? 'Editar Usuario' : (activeTab === 'INSTRUCTORS' ? 'Nuevo Instructor' : 'Nuevo Aprendiz') }}</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <!-- Campos comunes -->
            <div class="text-subtitle2 text-grey-7 q-mb-xs">Datos Personales</div>
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-md-6">
                <q-input v-model="userForm.nationalId" label="Cédula / Documento" outlined dense :disable="isEditing" :rules="[val => !!val || 'Requerido', val => /^\d{5,15}$/.test(val) || 'Debe tener solo dígitos (5-15)']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="userForm.fullName" label="Nombre Completo" outlined dense :rules="[val => !!val || 'Requerido', val => !val || !/\d/.test(val) || 'No se permiten números']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="userForm.email" label="Correo Electrónico" type="email" outlined dense :rules="[val => !!val || 'Requerido', val => !val || /.+@.+\..+/.test(val) || 'El correo debe contener @ y un dominio válido']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="userForm.phone" label="Teléfono" outlined dense :rules="[val => !val || /^\d{7,15}$/.test(val) || 'Debe tener solo dígitos (7-15)']" />
              </div>
            </div>
            
            <!-- Campos exclusivos Instructor -->
            <template v-if="activeTab === 'INSTRUCTORS'">
              <q-separator class="q-my-sm" />
              <div class="text-subtitle2 text-grey-7 q-mb-xs">Datos del Instructor</div>
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-md-6">
                  <q-select 
                    v-model="userForm.instructorType" 
                    :options="[{ label: 'Seguimiento', value: 'FOLLOWUP' }, { label: 'Técnico', value: 'TECHNICAL' }, { label: 'Proyecto', value: 'PROJECT' }]" 
                    option-label="label"
                    option-value="value"
                    emit-value
                    map-options
                    label="Tipo de Instructor" 
                    outlined dense 
                    :rules="[val => !!val || 'Requerido']" 
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="userForm.knowledgeArea"
                    :options="knowledgeAreasFiltered"
                    label="Área de Conocimiento"
                    outlined dense
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
              <q-separator class="q-my-sm" />
              <div class="text-subtitle2 text-grey-7 q-mb-xs">Datos Académicos</div>
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-md-4">
                  <q-input v-model="userForm.enrollmentNumber" label="No. Ficha" outlined dense :rules="[val => !!val || 'Requerido', val => /^\d+$/.test(val) || 'Solo números']" />
                </div>
                <div class="col-12 col-md-4">
                  <q-select
                    v-model="userForm.program"
                    :options="programsFiltered"
                    label="Programa de Formación"
                    outlined dense
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
                    outlined dense 
                    :rules="[val => !!val || 'Requerido']" 
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-select
                    v-model="userForm.trainingCenter"
                    :options="centersFiltered"
                    label="Centro de Formación"
                    outlined dense
                    emit-value
                    map-options
                    use-input
                    input-debounce="0"
                    @filter="filterCenters"
                    :rules="[val => !!val || 'Requerido']"
                  />
                </div>
                <div class="col-12 col-md-6">
                  <q-input v-model="userForm.enrollmentExpiryDate" type="date" label="Fin de Etapa Lectiva" outlined dense stack-label :rules="[val => !!val || 'Requerido']" />
                </div>
                <div class="col-12">
                  <q-checkbox v-model="userForm.isPreNov2024" label="¿Ingresó antes de Noviembre 2024?" dense />
                </div>
              </div>
            </template>
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Guardar" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- Modal: Importar Aprendices -->
    <q-dialog v-model="showImportModal">
      <q-card style="width: 450px;">
        <q-form @submit="importUsers">
          <q-card-section class="bg-secondary text-white">
            <div class="text-h6">Importación Masiva</div>
          </q-card-section>
          <q-card-section class="q-pa-lg">
            <p class="text-caption text-grey-8">Seleccione un archivo CSV o Excel (.xlsx) para cargar aprendices.</p>
            <q-file v-model="importFile" label="Seleccionar archivo" outlined dense accept=".csv, .xlsx" :rules="[val => !!val || 'Seleccione un archivo']">
              <template v-slot:prepend><q-icon name="attach_file" /></template>
            </q-file>
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cerrar" color="grey" v-close-popup />
            <q-btn color="secondary" label="Subir Archivo" type="submit" :loading="importing" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
    <!-- Modal: Asignación Rápida -->
    <q-dialog v-model="showAssignModal" persistent>
      <q-card style="width: 450px;">
        <q-form @submit="submitQuickAssign">
          <q-card-section class="bg-accent text-white">
            <div class="text-h6">Asignación Rápida (Pruebas)</div>
          </q-card-section>
          <q-card-section class="q-pa-md">
            <p class="text-subtitle2 q-mb-md">Aprendiz: <span class="text-weight-bold">{{ selectedApprentice?.fullName }}</span></p>
            <q-select 
              v-model="selectedInstructor" 
              :options="instructorsList" 
              option-value="_id" 
              option-label="fullName" 
              label="Selecciona un Instructor" 
              outlined 
              dense 
              emit-value 
              map-options 
              :rules="[val => !!val || 'Requerido']" 
            />
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="accent" label="Asignar" type="submit" :loading="assigning" />
          </q-card-actions>
        </q-form>
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
  { name: 'nationalId', label: 'Cédula', field: 'nationalId', align: 'left' },
  { name: 'fullName', label: 'Nombre Completo', field: 'fullName', align: 'left' },
  { name: 'email', label: 'Correo', field: 'email', align: 'left' },
  { name: 'role', label: 'Rol', field: 'role', align: 'center' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

let searchTimeout = null;

onMounted(() => {
  fetchUsers();
});

watch(activeTab, () => {
  filter.value = '';
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

async function fetchUsers() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      search: filter.value || undefined,
      isActive: showInactive.value ? undefined : true
    };

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
    instructorType: 'FOLLOWUP',
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
          users.value[idx] = res.data.data?.instructor || res.data;
        }
      } else {
        const res = await userService.createInstructor(payload);
        const created = res.data.data?.instructor || res.data;
        users.value.unshift(created);
      }
    } else {
      if (isEditing.value) {
        await userService.updateApprentice(userForm.value._id, payload);
        const idx = users.value.findIndex(u => u._id === userForm.value._id);
        if (idx !== -1) {
          const res = await userService.getApprenticeById(userForm.value._id);
          users.value[idx] = res.data.data?.apprentice || res.data;
        }
      } else {
        const res = await userService.createApprentice(payload);
        const created = res.data.data?.apprentice || res.data;
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
</script>

<style scoped>
.users-container {
  max-width: 1300px;
  margin: 0 auto;
}
</style>
