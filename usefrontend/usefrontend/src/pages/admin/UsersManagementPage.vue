<template>
  <div class="users-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Gestión de Usuarios</h2>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn color="secondary" outline icon="upload_file" label="Importar Aprendices" @click="showImportModal = true" />
        <q-btn color="primary" icon="add" label="Nuevo Instructor" @click="openCreateModal('INSTRUCTOR')" />
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
            <q-badge :color="getRoleColor(props.value)" :label="props.value" />
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
              <q-tooltip>Editar</q-tooltip>
            </q-btn>
            <q-btn v-if="activeTab === 'INSTRUCTORS'" size="sm" flat round :color="props.row.isActive ? 'negative' : 'positive'" :icon="props.row.isActive ? 'block' : 'check_circle'" @click="toggleStatus(props.row)">
              <q-tooltip>{{ props.row.isActive ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Nuevo/Editar Usuario -->
    <q-dialog v-model="showUserModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="saveUser">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">{{ isEditing ? 'Editar Usuario' : (activeTab === 'INSTRUCTORS' ? 'Nuevo Instructor' : 'Nuevo Aprendiz') }}</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-input v-model="userForm.nationalId" label="Cédula" outlined dense :rules="[val => !!val || 'Requerido']" />
            <q-input v-model="userForm.fullName" label="Nombre Completo" outlined dense :rules="[val => !!val || 'Requerido']" />
            <q-input v-model="userForm.email" label="Correo Electrónico" type="email" outlined dense :rules="[val => !!val || 'Requerido']" />
            
            <q-select 
              v-if="activeTab === 'INSTRUCTORS'" 
              v-model="userForm.instructorType" 
              :options="['FOLLOWUP', 'TECHNICAL', 'PROJECT']" 
              label="Tipo de Instructor" 
              outlined dense 
              :rules="[val => !!val || 'Requerido']" 
            />
            
            <div v-if="activeTab === 'APPRENTICES'" class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input v-model="userForm.enrollmentNumber" label="Ficha" outlined dense />
              </div>
              <div class="col-6">
                <q-input v-model="userForm.trainingLevel" label="Nivel (Ej: TECHNOLOGIST)" outlined dense />
              </div>
            </div>
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
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import userService from '../../api/user.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

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

// Form State
const userForm = ref({
  _id: null,
  nationalId: '',
  fullName: '',
  email: '',
  instructorType: '',
  enrollmentNumber: '',
  trainingLevel: ''
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
    } else {
      response = await userService.getApprentices(params);
    }

    // Adapt to standard pagination response
    users.value = response.data.data || response.data;
    if (response.data.total) {
      pagination.value.rowsNumber = response.data.total;
    }
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar usuarios' });
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
    instructorType: 'FOLLOWUP',
    enrollmentNumber: '',
    trainingLevel: 'TECHNOLOGIST'
  };
}

function openCreateModal(role) {
  resetForm();
  isEditing.value = false;
  showUserModal.value = true;
}

function editUser(user) {
  resetForm();
  userForm.value = { ...user };
  isEditing.value = true;
  showUserModal.value = true;
}

async function saveUser() {
  saving.value = true;
  try {
    const payload = { ...userForm.value };
    delete payload._id;

    if (activeTab.value === 'INSTRUCTORS') {
      if (isEditing.value) {
        await userService.updateInstructor(userForm.value._id, payload);
      } else {
        await userService.createInstructor(payload);
      }
    } else {
      if (isEditing.value) {
        await userService.updateApprentice(userForm.value._id, payload);
      } else {
        await userService.createApprentice(payload);
      }
    }

    $q.notify({ type: 'positive', message: `Usuario ${isEditing.value ? 'actualizado' : 'creado'} con éxito` });
    showUserModal.value = false;
    fetchUsers();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al guardar usuario';
    $q.notify({ type: 'negative', message: msg });
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
    $q.notify({ type: 'positive', message: `Importación exitosa. ${res.data?.count || ''} registros procesados.` });
    showImportModal.value = false;
    importFile.value = null;
    if (activeTab.value === 'APPRENTICES') fetchUsers();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al importar usuarios';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    importing.value = false;
  }
}

async function toggleStatus(user) {
  const newStatus = user.isActive ? 'INACTIVE' : 'ACTIVE';
  $q.dialog({
    title: 'Confirmar Acción',
    message: `¿Desea ${user.isActive ? 'desactivar' : 'activar'} a este usuario?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      if (activeTab.value === 'INSTRUCTORS') {
        await userService.changeInstructorStatus(user._id, newStatus, 'Status toggled from Admin Dashboard');
      }
      fetchUsers();
      $q.notify({ type: 'positive', message: 'Estado actualizado' });
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Error al actualizar estado' });
    }
  });
}
</script>

<style scoped>
.users-container {
  max-width: 1300px;
  margin: 0 auto;
}
</style>
