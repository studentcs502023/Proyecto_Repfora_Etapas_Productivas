<template>
  <q-page padding class="register-ep-container">
    <div class="text-h4 text-black text-weight-bold q-mb-md">Registro de Etapa Productiva</div>
    <p class="text-grey-7">Completa los siguientes pasos para registrar oficialmente tu etapa productiva.</p>

    <q-stepper
      v-model="step"
      ref="stepper"
      color="primary"
      animated
      flat
      bordered
    >
      <!-- STEP 1: Modalidad y Fechas -->
      <q-step
        :name="1"
        title="Modalidad y Fechas"
        icon="settings"
        :done="step > 1"
      >
        <q-form @submit="stepper.next()" class="q-gutter-md">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-select
                v-model="form.modality"
                :options="modalityOptions"
                label="Modalidad de Etapa Productiva"
                outlined
                emit-value
                map-options
                :rules="[val => !!val || 'Seleccione una modalidad']"
              />
            </div>
          </div>
          
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.startDate"
                label="Fecha de Inicio Estimada"
                type="date"
                outlined
                stack-label
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.estimatedEndDate"
                label="Fecha de Finalizaci├│n Estimada"
                type="date"
                outlined
                stack-label
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
          </div>

          <q-stepper-navigation>
            <q-btn type="submit" color="primary" label="Continuar" />
          </q-stepper-navigation>
        </q-form>
      </q-step>

      <!-- STEP 2: Documentaci├│n de Soporte -->
      <q-step
        :name="2"
        title="Documentaci├│n Obligatoria"
        icon="upload_file"
        :done="step > 2"
      >
        <q-form @submit="stepper.next()" class="q-gutter-md">
          <div class="text-subtitle2 text-black q-mb-sm">Documentos Requeridos para: {{ getModalityLabel(form.modality) || '...' }}</div>
          <p class="text-grey-7">Por favor, adjunte los siguientes documentos en formato PDF (m├íximo 3MB por archivo).</p>

          <div v-if="requiredDocuments.length === 0" class="text-warning q-mb-md">
            Seleccione una modalidad en el paso anterior para ver los documentos requeridos.
          </div>

          <div v-for="doc in requiredDocuments" :key="doc.type" class="q-mb-md">
            <q-file 
              v-model="uploadedDocuments[doc.type]" 
              :label="doc.label + (doc.required ? ' *' : '')" 
              outlined 
              accept=".pdf"
              :rules="[
                val => (!doc.required || !!val) || 'Requerido',
                val => !val || val.type === 'application/pdf' || 'Solo formato PDF',
                val => !val || val.size <= 3 * 1024 * 1024 || 'M├íximo 3MB'
              ]"
            >
              <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
            </q-file>
          </div>

          <q-stepper-navigation>
            <q-btn type="submit" color="primary" label="Continuar" :disable="requiredDocuments.length === 0" />
            <q-btn flat color="primary" @click="step = 1" label="Atr├ís" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-form>
      </q-step>

      <!-- STEP 3: Empresa y Supervisor -->
      <q-step
        :name="3"
        title="Empresa y Supervisor"
        icon="business"
        :done="step > 3"
      >
        <q-form @submit="stepper.next()" class="q-gutter-md">
          <div class="q-mb-md">
            <q-radio v-model="companyMode" val="existing" label="Seleccionar Empresa Existente" color="primary" />
            <q-radio v-model="companyMode" val="new" label="Registrar Nueva Empresa" color="primary" />
          </div>

          <!-- Existing Company -->
          <div v-if="companyMode === 'existing'" class="q-mb-md">
            <q-select
              v-model="form.companyId"
              :options="companies"
              option-value="_id"
              option-label="name"
              label="Buscar Empresa Coformadora"
              outlined
              emit-value
              map-options
              use-input
              input-debounce="0"
              @filter="filterCompanies"
              :rules="[val => !!val || 'Seleccione una empresa']"
            >
              <template v-slot:no-option>
                <q-item>
                  <q-item-section class="text-grey">No se encontraron empresas.</q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <!-- New Company -->
          <div v-if="companyMode === 'new'" class="q-mb-md">
            <div class="text-subtitle2 text-black q-mb-sm">Datos de la Empresa</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input v-model="newCompany.taxId" label="NIT" outlined :rules="[val => !!val || 'Requerido', val => /^\d{5,15}$/.test(val) || 'Debe tener solo dígitos (5-15)']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="newCompany.name" label="Raz├│n Social" outlined :rules="[val => !!val || 'Requerido']" />
              </div>
              <div class="col-12">
                <q-input v-model="newCompany.address" label="Direcci├│n" outlined :rules="[val => !!val || 'Requerido']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="newCompany.phone" label="Tel├®fono (Empresa)" outlined :rules="[val => !!val || 'Requerido', val => /^\d{7,15}$/.test(val) || 'Debe tener solo dígitos (7-15)']" />
              </div>
              <div class="col-12 col-md-6">
                <q-input v-model="newCompany.email" label="Correo Electr├│nico (Empresa)" type="email" outlined :rules="[val => !!val || 'Requerido']" />
              </div>
            </div>
          </div>

          <q-separator class="q-my-md" />
          <div class="text-subtitle2 text-black q-mb-sm">Datos del Supervisor / Cargo</div>
          
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.companySnapshot.apprenticeJobTitle"
                label="Cargo que ocupar├í el aprendiz"
                outlined
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.companySnapshot.supervisorName"
                label="Nombre del Supervisor"
                outlined
                :rules="[val => !!val || 'Requerido', val => !val || !/\d/.test(val) || 'No se permiten números']"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.companySnapshot.supervisorEmail"
                label="Correo del Supervisor"
                type="email"
                outlined
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.companySnapshot.supervisorPhone"
                label="Tel├®fono del Supervisor"
                outlined
                :rules="[val => !!val || 'Requerido', val => /^\d{7,15}$/.test(val) || 'Debe tener solo dígitos (7-15)']"
              />
            </div>
          </div>

          <q-stepper-navigation>
            <q-btn type="submit" color="primary" label="Continuar" />
            <q-btn flat color="primary" @click="step = 2" label="Atr├ís" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-form>
      </q-step>

      <!-- STEP 4: Confirmaci├│n -->
      <q-step
        :name="4"
        title="Confirmaci├│n"
        icon="check"
      >
        <div class="q-pa-md bg-grey-2 rounded-borders">
          <div class="text-h6 text-primary q-mb-md">Resumen de la Solicitud</div>
          <q-list dense>
            <q-item>
              <q-item-section>
                <q-item-label caption>Modalidad</q-item-label>
                <q-item-label>{{ getModalityLabel(form.modality) }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label caption>Empresa</q-item-label>
                <q-item-label>{{ companyMode === 'new' ? newCompany.name : selectedCompanyName }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label caption>Fechas Estimadas</q-item-label>
                <q-item-label>{{ form.startDate }} al {{ form.estimatedEndDate }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label caption>Supervisor</q-item-label>
                <q-item-label>{{ form.companySnapshot.supervisorName }} ({{ form.companySnapshot.supervisorPhone }})</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <q-separator class="q-my-md" />
          <div class="text-subtitle2 text-primary q-mb-sm">Documentos a Subir</div>
          <q-list dense>
            <q-item v-for="doc in requiredDocuments" :key="doc.type">
              <q-item-section avatar>
                <q-icon :name="uploadedDocuments[doc.type] ? 'check_circle' : 'error'" :color="uploadedDocuments[doc.type] ? 'positive' : 'negative'" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ doc.label }}</q-item-label>
                <q-item-label caption>{{ uploadedDocuments[doc.type] ? uploadedDocuments[doc.type].name : 'Pendiente' }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <div class="q-mt-md text-caption text-grey-8">
            Al enviar esta solicitud, ser├í revisada por la coordinaci├│n para su aprobaci├│n y asignaci├│n de instructores.
          </div>
        </div>

        <q-stepper-navigation>
          <q-btn color="positive" @click="submitEP" label="Enviar Solicitud" :loading="submitting" />
          <q-btn flat color="primary" @click="step = 3" label="Atr├ís" class="q-ml-sm" />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import productiveStageService from '../../api/productiveStage.service';
import companyService from '../../api/company.service';
import documentService from '../../api/document.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const router = useRouter();

const step = ref(1);
const stepper = ref(null);
const submitting = ref(false);

const companyMode = ref('existing');
const companies = ref([]);
const originalCompanies = ref([]);

const form = ref({
  modality: '',
  companyId: '',
  startDate: '',
  estimatedEndDate: '',
  companySnapshot: {
    apprenticeJobTitle: '',
    supervisorName: '',
    supervisorPhone: '',
    supervisorEmail: ''
  }
});

const newCompany = ref({
  taxId: '',
  name: '',
  address: '',
  phone: '',
  email: ''
});

const uploadedDocuments = ref({});

const requiredDocuments = computed(() => {
  switch (form.value.modality) {
    case 'APPRENTICESHIP_CONTRACT':
      return [
        { type: 'SIGNED_CONTRACT', label: 'Contrato firmado por todas las partes', required: true },
        { type: 'ARL_CERTIFICATE', label: 'Certificaci├│n de afiliaci├│n a ARL', required: true },
        { type: 'PAYROLL_REGISTRY', label: 'Registro en planilla', required: true }
      ];
    case 'INTERNSHIP':
      return [
        { type: 'ACCEPTANCE_LETTER', label: 'Convenio o carta de aceptaci├│n de la empresa', required: true },
        { type: 'ARL_CERTIFICATE', label: 'Certificaci├│n ARL (cuando aplique)', required: true },
        { type: 'ALTERNATIVE_SELECTION_FORMAT', label: 'Formato de selecci├│n de alternativa', required: true },
        { type: 'ACTIVITIES_SCHEDULE', label: 'Cronograma de actividades', required: true }
      ];
    case 'INDIVIDUAL_PRODUCTIVE_PROJECT':
    case 'GROUP_PRODUCTIVE_PROJECT':
      return [
        { type: 'PROJECT_PROPOSAL', label: 'Propuesta de proyecto aprobada', required: true },
        { type: 'ENTITY_ENDORSEMENT', label: 'Aval de la entidad/empresa', required: true },
        { type: 'ACTIVITIES_SCHEDULE', label: 'Cronograma de desarrollo', required: true },
        { type: 'BUDGET', label: 'Presupuesto (cuando aplique)', required: true }
      ];
    case 'LABOR_LINK':
      return [
        { type: 'EMPLOYMENT_CONTRACT', label: 'Contrato laboral o acta de vinculaci├│n', required: true },
        { type: 'ARL_CERTIFICATE', label: 'Certificaci├│n ARL', required: true },
        { type: 'PAYROLL_REGISTRY', label: 'Registro en planilla (cuando aplique)', required: true }
      ];
    default:
      return [];
  }
});

watch(() => form.value.modality, () => {
  uploadedDocuments.value = {};
});

const modalityOptions = [
  { label: 'Contrato de Aprendizaje', value: 'APPRENTICESHIP_CONTRACT' },
  { label: 'V├¡nculo Laboral', value: 'LABOR_LINK' },
  { label: 'Pasant├¡a', value: 'INTERNSHIP' },
  { label: 'Proyecto Productivo Individual', value: 'INDIVIDUAL_PRODUCTIVE_PROJECT' },
  { label: 'Proyecto Productivo Grupal', value: 'GROUP_PRODUCTIVE_PROJECT' }
];

onMounted(async () => {
  try {
    const res = await companyService.getAll({ limit: 1000 });
    const data = res.data?.data || res.data;
    originalCompanies.value = data.companies || data || [];
    companies.value = [...originalCompanies.value];
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: error.message || 'No se pudieron cargar las empresas.', position: 'top', timeout: 5000 });
  }
});

const selectedCompanyName = computed(() => {
  const company = originalCompanies.value.find(c => c._id === form.value.companyId);
  return company ? company.name : 'No seleccionada';
});

function getModalityLabel(val) {
  const opt = modalityOptions.find(o => o.value === val);
  return opt ? opt.label : val;
}

function filterCompanies(val, update) {
  if (val === '') {
    update(() => {
      companies.value = originalCompanies.value;
    });
    return;
  }
  update(() => {
    const needle = val.toLowerCase();
    companies.value = originalCompanies.value.filter(
      v => v.name.toLowerCase().indexOf(needle) > -1 || v.taxId.indexOf(needle) > -1
    );
  });
}

async function submitEP() {
  submitting.value = true;
  try {
    const payload = {
      ...form.value
    };
    
    // Si la empresa es nueva, NO la creamos en base de datos.
    // Enviamos omitido el companyId y guardamos los datos de la nueva empresa en el snapshot.
    // El backend se encargar├í de crearla S├ôLO si el Admin aprueba la solicitud.
    if (companyMode.value === 'new') {
      delete payload.companyId;
      payload.companySnapshot.companyName = newCompany.value.name;
      payload.companySnapshot.taxId = newCompany.value.taxId;
      payload.companySnapshot.address = newCompany.value.address;
      payload.companySnapshot.companyPhone = newCompany.value.phone;
      payload.companySnapshot.companyEmail = newCompany.value.email;
    } else {
      const selected = originalCompanies.value.find(c => c._id === form.value.companyId);
      if (selected) {
        payload.companySnapshot.companyName = selected.name;
        payload.companySnapshot.taxId = selected.taxId;
        payload.companySnapshot.address = selected.address;
        payload.companySnapshot.companyPhone = selected.phone;
        payload.companySnapshot.companyEmail = selected.email;
      }
    }

    // 1. Registrar Etapa Productiva (Queda en PENDING_APPROVAL)
    const epRes = await productiveStageService.registerEP(payload);
    const newEpId = epRes.data?.ep?._id || epRes.data?.data?.ep?._id || epRes.data?._id;

    // 2. Subir Documentos Din├ímicos
    if (newEpId) {
      const uploadPromises = [];
      for (const doc of requiredDocuments.value) {
        const file = uploadedDocuments.value[doc.type];
        if (file) {
          const fd = new FormData();
          fd.append('productiveStageId', newEpId);
          fd.append('documentType', doc.type);
          fd.append('file', file);
          uploadPromises.push(documentService.upload(fd));
        }
      }
      await Promise.all(uploadPromises);
    }

    $q.notify({
      type: 'positive',
      message: 'Solicitud enviada con ├®xito. Pendiente de revisi├│n por Administraci├│n.'
    });
    router.push({ name: 'dashboard' });
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al registrar la etapa productiva.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.register-ep-container {
  max-width: 900px;
  margin: 0 auto;
}
</style>
