<template>
  <div class="companies-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-secondary text-weight-bold q-my-none">Gestión de Empresas</h2>
        <p class="text-grey-7 q-my-sm">Directorio de entes coformadores y contactos principales.</p>
      </div>
      <div class="col-auto q-gutter-sm">
        <q-btn color="primary" icon="add" label="Nueva Empresa" @click="openCreateModal()" />
      </div>
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-col-gutter-sm items-center">
        <div class="col-12 col-sm-4">
          <q-input v-model="filter" dense outlined placeholder="Buscar por nombre o NIT..." @update:model-value="debouncedFetch">
            <template v-slot:append><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-sm-3">
          <q-checkbox v-model="showInactive" label="Mostrar Inactivos" dense color="primary" @update:model-value="fetchCompanies" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Companies Table -->
    <q-card flat bordered>
      <q-table
        :rows="companies"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.isActive !== false ? 'positive' : 'negative'"
              text-color="white"
              dense
              size="sm"
            >
              {{ props.row.isActive !== false ? 'ACTIVA' : 'INACTIVA' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn size="sm" flat round color="secondary" icon="edit" @click="editCompany(props.row)">
              <q-tooltip>Editar Empresa</q-tooltip>
            </q-btn>
            <q-btn size="sm" flat round :color="props.row.isActive !== false ? 'negative' : 'positive'" :icon="props.row.isActive !== false ? 'block' : 'check_circle'" @click="toggleStatus(props.row)">
              <q-tooltip>{{ props.row.isActive !== false ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Nueva/Editar Empresa -->
    <q-dialog v-model="showCompanyModal" persistent>
      <q-card style="width: 500px; max-width: 90vw;">
        <q-form @submit="saveCompany">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">{{ isEditing ? 'Editar Empresa' : 'Nueva Empresa' }}</div>
          </q-card-section>
          
          <q-card-section class="q-pa-md q-gutter-md">
            <q-input v-model="companyForm.name" label="Razón Social / Nombre" outlined dense :rules="[val => !!val || 'Requerido']" />
            <q-input v-model="companyForm.taxId" label="NIT / Documento" outlined dense :rules="[val => !!val || 'Requerido']" />
            <q-input v-model="companyForm.address" label="Dirección" outlined dense />
            <q-input v-model="companyForm.phone" label="Teléfono (Opcional)" outlined dense />
            
            <q-separator class="q-my-md" />
            <div class="text-subtitle2 text-secondary q-mb-sm">Contacto Principal (Opcional)</div>
            <q-input v-model="contactForm.name" label="Nombre del Supervisor" outlined dense />
            <q-input v-model="contactForm.email" label="Correo del Supervisor" type="email" outlined dense />
            <q-input v-model="contactForm.phone" label="Teléfono del Supervisor" outlined dense />
          </q-card-section>
          
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Cancelar" color="grey" v-close-popup />
            <q-btn color="primary" label="Guardar" type="submit" :loading="saving" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import companyService from '../../api/company.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const companies = ref([]);
const loading = ref(false);
const filter = ref('');
const showInactive = ref(false);

const pagination = ref({
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0
});

// Modal State
const showCompanyModal = ref(false);
const isEditing = ref(false);
const saving = ref(false);

const companyForm = ref({
  _id: null,
  name: '',
  taxId: '',
  address: '',
  phone: '',
});

// A simplified contact object for the main creation form
const contactForm = ref({
  name: '',
  email: '',
  phone: ''
});

// Table Config
const columns = [
  { name: 'taxId', label: 'NIT', field: 'taxId', align: 'left' },
  { name: 'name', label: 'Razón Social', field: 'name', align: 'left' },
  { name: 'address', label: 'Dirección', field: 'address', align: 'left' },
  { name: 'status', label: 'Estado', field: 'status', align: 'center' },
  { name: 'actions', label: 'Acciones', align: 'center' }
];

let searchTimeout = null;

onMounted(() => {
  fetchCompanies();
});

function debouncedFetch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1;
    fetchCompanies();
  }, 500);
}

async function fetchCompanies() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.rowsPerPage,
      search: filter.value || undefined,
      isActive: showInactive.value ? undefined : true
    };

    const response = await companyService.getAll(params);
    companies.value = response.data.data || response.data;
    if (response.data.total) {
      pagination.value.rowsNumber = response.data.total;
    }
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar empresas' });
  } finally {
    loading.value = false;
  }
}

function onRequest(props) {
  const { page, rowsPerPage } = props.pagination;
  pagination.value.page = page;
  pagination.value.rowsPerPage = rowsPerPage;
  fetchCompanies();
}

function resetForm() {
  companyForm.value = {
    _id: null,
    name: '',
    taxId: '',
    address: '',
    phone: ''
  };
  contactForm.value = {
    name: '',
    email: '',
    phone: ''
  };
}

function openCreateModal() {
  resetForm();
  isEditing.value = false;
  showCompanyModal.value = true;
}

function editCompany(company) {
  resetForm();
  companyForm.value = { 
    _id: company._id,
    name: company.name || '',
    taxId: company.taxId || '',
    address: company.address || '',
    phone: company.phone || ''
  };
  
  if (company.contacts && company.contacts.length > 0) {
    contactForm.value = { ...company.contacts[0] };
  }
  
  isEditing.value = true;
  showCompanyModal.value = true;
}

async function saveCompany() {
  saving.value = true;
  try {
    const payload = { ...companyForm.value };
    delete payload._id;
    
    // Add contacts array if contact info is provided
    if (contactForm.value.name || contactForm.value.email) {
      payload.contacts = [{ ...contactForm.value }];
    }

    if (isEditing.value) {
      await companyService.update(companyForm.value._id, payload);
    } else {
      await companyService.create(payload);
    }

    $q.notify({ type: 'positive', message: `Empresa ${isEditing.value ? 'actualizada' : 'registrada'} con éxito` });
    showCompanyModal.value = false;
    fetchCompanies();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al guardar empresa';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(company) {
  // If backend uses delete for soft delete
  $q.dialog({
    title: 'Confirmar Acción',
    message: `¿Desea desactivar esta empresa? (Se mantendrá en el historial)`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      // Typically toggle status is a patch, but the spec says delete is soft-delete via isActive
      await companyService.delete(company._id);
      fetchCompanies();
      $q.notify({ type: 'positive', message: 'Estado actualizado' });
    } catch (error) {
      $q.notify({ type: 'negative', message: 'Error al actualizar estado' });
    }
  });
}
</script>

<style scoped>
.companies-container {
  max-width: 1300px;
  margin: 0 auto;
}
</style>
