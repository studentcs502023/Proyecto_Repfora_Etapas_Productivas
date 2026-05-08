<template>
  <q-page padding class="register-ep-container">
    <div class="text-h4 text-secondary text-weight-bold q-mb-md">Registro de Etapa Productiva</div>
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
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.estimatedEndDate"
                label="Fecha de Finalización Estimada"
                type="date"
                outlined
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
          </div>

          <q-stepper-navigation>
            <q-btn type="submit" color="primary" label="Continuar" />
          </q-stepper-navigation>
        </q-form>
      </q-step>

      <!-- STEP 2: Empresa y Supervisor -->
      <q-step
        :name="2"
        title="Empresa y Supervisor"
        icon="business"
        :done="step > 2"
      >
        <q-form @submit="stepper.next()" class="q-gutter-md">
          <div class="text-subtitle2 text-secondary q-mb-sm">Selección de Empresa</div>
          <q-select
            v-model="form.companyId"
            :options="companies"
            option-value="_id"
            option-label="name"
            label="Buscar Empresa Coformadora"
            outlined
            emit-value
            map-options
            :rules="[val => !!val || 'Seleccione una empresa']"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey">No se encontraron empresas. Contacte a la coordinación.</q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-separator class="q-my-md" />
          <div class="text-subtitle2 text-secondary q-mb-sm">Datos del Supervisor / Cargo</div>
          
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.companySnapshot.apprenticeJobTitle"
                label="Cargo que ocupará el aprendiz"
                outlined
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="form.companySnapshot.supervisorName"
                label="Nombre del Supervisor"
                outlined
                :rules="[val => !!val || 'Requerido']"
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
                label="Teléfono del Supervisor"
                outlined
                :rules="[val => !!val || 'Requerido']"
              />
            </div>
          </div>

          <q-stepper-navigation>
            <q-btn type="submit" color="primary" label="Continuar" />
            <q-btn flat color="primary" @click="step = 1" label="Atrás" class="q-ml-sm" />
          </q-stepper-navigation>
        </q-form>
      </q-step>

      <!-- STEP 3: Confirmación -->
      <q-step
        :name="3"
        title="Confirmación"
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
                <q-item-label>{{ selectedCompanyName }}</q-item-label>
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
          <div class="q-mt-md text-caption text-grey-8">
            Al enviar esta solicitud, será revisada por la coordinación para su aprobación y asignación de instructores.
          </div>
        </div>

        <q-stepper-navigation>
          <q-btn color="positive" @click="submitEP" label="Enviar Solicitud" :loading="submitting" />
          <q-btn flat color="primary" @click="step = 2" label="Atrás" class="q-ml-sm" />
        </q-stepper-navigation>
      </q-step>
    </q-stepper>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import productiveStageService from '../../api/productiveStage.service';
import companyService from '../../api/company.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const router = useRouter();

const step = ref(1);
const stepper = ref(null);
const submitting = ref(false);
const companies = ref([]);

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

const modalityOptions = [
  { label: 'Contrato de Aprendizaje', value: 'APPRENTICESHIP_CONTRACT' },
  { label: 'Vínculo Laboral', value: 'LABOR_LINK' },
  { label: 'Pasantía', value: 'INTERNSHIP' },
  { label: 'Proyecto Productivo Individual', value: 'INDIVIDUAL_PRODUCTIVE_PROJECT' },
  { label: 'Proyecto Productivo Grupal', value: 'GROUP_PRODUCTIVE_PROJECT' }
];

onMounted(async () => {
  try {
    const res = await companyService.getAll({ limit: 100 });
    companies.value = res.data.data || res.data;
  } catch (error) {
    $q.notify({ type: 'negative', message: 'No se pudieron cargar las empresas.' });
  }
});

const selectedCompanyName = computed(() => {
  const company = companies.value.find(c => c._id === form.value.companyId);
  return company ? company.name : 'No seleccionada';
});

function getModalityLabel(val) {
  const opt = modalityOptions.find(o => o.value === val);
  return opt ? opt.label : val;
}

async function submitEP() {
  submitting.value = true;
  try {
    await productiveStageService.registerEP(form.value);
    $q.notify({
      type: 'positive',
      message: 'Etapa Productiva registrada con éxito. Está pendiente de aprobación.'
    });
    router.push('/dashboard');
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
