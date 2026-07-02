<template>
  <div class="companies-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="domain" class="q-mr-sm" size="md"/>Gestión de Empresas
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Directorio de entes coformadores y contactos principales.</p>
      </div>
      <div class="header-actions col-12 col-md-auto q-gutter-sm row justify-end items-center">
        <q-btn 
          color="secondary" 
          text-color="white"
          icon="add" 
          label="Nueva Empresa" 
          class="header-btn text-weight-bold shadow-2"
          rounded
          @click="openCreateModal()" 
        />
      </div>
    </div>

    <!-- Filters -->
    <q-card class="filter-card my-card q-mb-lg no-shadow">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <q-input 
            v-model="filter" 
            dense 
            outlined 
            color="primary"
            class="glass-input text-weight-medium"
            placeholder="Buscar por nombre o NIT..." 
            @update:model-value="debouncedFetch"
          >
            <template v-slot:prepend><q-icon name="search" color="grey-6" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-6 row justify-end items-center">
          <q-checkbox 
            v-model="showInactive" 
            label="Mostrar Empresas Inactivas" 
            color="secondary" 
            class="text-weight-medium text-grey-8 custom-checkbox"
            @update:model-value="fetchCompanies" 
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Companies Table -->
    <q-card class="table-card my-card no-shadow">
      <q-table
        :rows="companies"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        flat
        class="custom-table bg-transparent"
        table-header-class="custom-table-header"
        v-model:pagination="pagination"
        @request="onRequest"
      >
        <template v-slot:loading>
          <q-inner-loading showing color="primary" />
        </template>
        
        <template v-slot:body-cell-status="props">
          <q-td :props="props">
            <q-chip
              :color="props.row.isActive !== false ? 'positive' : 'negative'"
              text-color="white"
              dense
              class="status-chip text-weight-bold shadow-1"
            >
              {{ props.row.isActive !== false ? 'ACTIVA' : 'INACTIVA' }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props" class="q-gutter-xs">
            <q-btn size="sm" flat round color="secondary" icon="edit" class="action-btn" @click="editCompany(props.row)">
              <q-tooltip class="bg-secondary text-white shadow-4">Editar Empresa</q-tooltip>
            </q-btn>
            <q-btn size="sm" flat round :color="props.row.isActive !== false ? 'negative' : 'positive'" :icon="props.row.isActive !== false ? 'block' : 'check_circle'" class="action-btn" @click="toggleStatus(props.row)">
              <q-tooltip class="bg-dark text-white shadow-4">{{ props.row.isActive !== false ? 'Desactivar' : 'Activar' }}</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Modal: Nueva/Editar Empresa -->
    <q-dialog v-model="showCompanyModal" persistent transition-show="scale" transition-hide="scale">
      <q-card class="modal-card" style="width: 600px; max-width: 90vw;">
        <q-form @submit="saveCompany">
          <q-card-section class="bg-primary text-white row items-center">
            <div class="text-h6 text-weight-bold">
              <q-icon :name="isEditing ? 'edit' : 'add_circle'" class="q-mr-sm" size="sm"/>
              {{ isEditing ? 'Editar Empresa' : 'Nueva Empresa' }}
            </div>
            <q-space />
            <q-btn icon="close" flat round dense v-close-popup />
          </q-card-section>
          
          <q-card-section class="q-pa-lg q-gutter-md" style="max-height: 60vh; overflow-y: auto;">
            <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm"><q-icon name="domain" class="q-mr-xs"/>Datos de la Empresa</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input v-model="companyForm.name" label="Razón Social / Nombre" lazy-trim outlined dense color="primary" class="glass-input" hint="Nombre legal o razón social de la empresa" :rules="[val => !!val || 'Requerido', val => !val || !/\d/.test(val) || 'No se permiten números']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="companyForm.taxId" label="NIT / Documento" lazy-trim outlined dense color="primary" class="glass-input" hint="NIT sin guiones ni dígito de verificación" :rules="[val => !!val || 'Requerido', val => /^\d{5,15}$/.test(val) || 'Debe tener solo dígitos (5-15)']" />
              </div>
              <div class="col-12">
                <q-input v-model="companyForm.address" label="Dirección" lazy-trim outlined dense color="primary" class="glass-input" hint="Dirección física de la empresa" :rules="[val => !!val || 'Requerido']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="companyForm.email" label="Correo Electrónico" type="email" lazy-trim outlined dense color="primary" class="glass-input" hint="Correo corporativo de la empresa" :rules="[val => !!val || 'Requerido', val => !val || /.+@.+\..+/.test(val) || 'El correo debe contener @ y un dominio válido']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="companyForm.phone" label="Teléfono" lazy-trim outlined dense color="primary" class="glass-input" hint="Incluye indicativo si aplica" :rules="[val => !!val || 'Requerido', val => /^\d{7,15}$/.test(val) || 'Debe tener solo dígitos (7-15)']" />
              </div>
            </div>
            
            <q-separator class="q-my-md opacity-20" />
            <div class="text-subtitle2 text-primary text-uppercase text-weight-bold q-mb-sm"><q-icon name="person_outline" class="q-mr-xs"/>Contacto Principal (Opcional)</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input v-model="contactForm.fullName" label="Nombre del Supervisor" lazy-trim outlined dense color="primary" class="glass-input" hint="Nombre completo del supervisor" :rules="[val => !!val || 'Requerido', val => !val || !/\d/.test(val) || 'No se permiten números']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="contactForm.jobTitle" label="Cargo del Supervisor" lazy-trim outlined dense color="primary" class="glass-input" hint="Ej: Jefe de Recursos Humanos" :rules="[val => !val || val.trim().length >= 3 || 'Mínimo 3 caracteres']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="contactForm.email" label="Correo del Supervisor" type="email" lazy-trim outlined dense color="primary" class="glass-input" hint="Correo directo del supervisor" :rules="[val => !val || /.+@.+\..+/.test(val) || 'El correo debe contener @ y un dominio válido']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="contactForm.phone" label="Teléfono del Supervisor" lazy-trim outlined dense color="primary" class="glass-input" hint="Incluye indicativo si aplica" :rules="[val => !val || /^\d{7,15}$/.test(val) || 'Debe ser un número válido (7-15 dígitos)']" />
              </div>
            </div>
          </q-card-section>
          
          <q-separator class="opacity-20" />
          <q-card-actions align="right" class="q-pa-md bg-grey-1">
            <q-btn flat label="Cancelar" color="grey-8" class="text-weight-bold" v-close-popup />
            <q-btn color="primary" label="Guardar" type="submit" :loading="saving" class="text-weight-bold shadow-2" rounded padding="xs lg"/>
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
  email: '',
});

// A simplified contact object for the main creation form
const contactForm = ref({
  _id: null,
  fullName: '',
  jobTitle: '',
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
      isActive: showInactive.value ? false : true
    };

    const response = await companyService.getAll(params);
    const result = response.data.data || response.data;
    companies.value = result.companies || [];
    if (result.pagination) {
      pagination.value.rowsNumber = result.pagination.total;
    }
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'Error al cargar empresas', position: 'top', timeout: 5000 });
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
    phone: '',
    email: ''
  };
  contactForm.value = {
    _id: null,
    fullName: '',
    jobTitle: '',
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
    phone: company.phone || '',
    email: company.email || ''
  };
  
  if (company.contacts && company.contacts.length > 0) {
    const c = company.contacts[0];
    contactForm.value = {
      _id: c._id || null,
      fullName: c.fullName || c.name || '',
      jobTitle: c.jobTitle || '',
      email: c.email || '',
      phone: c.phone || ''
    };
  }
  
  isEditing.value = true;
  showCompanyModal.value = true;
}

async function saveCompany() {
  saving.value = true;
  try {
    const payload = {
      name: companyForm.value.name.trim(),
      taxId: companyForm.value.taxId.trim(),
      address: companyForm.value.address.trim(),
      phone: companyForm.value.phone.trim(),
      email: companyForm.value.email.trim()
    };

    if (contactForm.value.fullName) {
      payload.contacts = [{
        fullName: contactForm.value.fullName.trim(),
        jobTitle: contactForm.value.jobTitle.trim(),
        email: contactForm.value.email.trim(),
        phone: contactForm.value.phone.trim()
      }];
    }

    if (isEditing.value) {
      delete payload.contacts;
      await companyService.update(companyForm.value._id, payload);
      if (contactForm.value.fullName) {
        const contactData = {
          fullName: contactForm.value.fullName.trim(),
          jobTitle: contactForm.value.jobTitle.trim(),
          email: contactForm.value.email.trim(),
          phone: contactForm.value.phone.trim()
        };
        if (contactForm.value._id) {
          await companyService.updateContact(companyForm.value._id, contactForm.value._id, contactData);
        } else {
          await companyService.addContact(companyForm.value._id, contactData);
        }
      }
    } else {
      await companyService.create(payload);
    }

    $q.notify({ type: 'positive', message: `Empresa ${isEditing.value ? 'actualizada' : 'registrada'} con éxito`, position: 'top', timeout: 5000 });
    showCompanyModal.value = false;
    fetchCompanies();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al guardar empresa';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
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
      $q.notify({ type: 'positive', message: 'Estado actualizado', position: 'top', timeout: 5000 });
    } catch (error) {
      console.error(error);
      $q.notify({ type: 'negative', message: error.message || 'Error al actualizar estado', position: 'top', timeout: 5000 });
    }
  });
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.companies-container {
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

.shadow-text { text-shadow: 2px 2px 8px rgba(0,0,0,0.4); }
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

/* Chips & Badges */
.status-chip { letter-spacing: 0.5px; }

.action-btn { transition: all 0.2s ease; }
.action-btn:hover { transform: scale(1.15) rotate(5deg); }

.header-btn { transition: all 0.3s ease; }
.header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important;
}

.custom-checkbox :deep(.q-checkbox__inner) { transition: all 0.3s ease; }
</style>
