<template>
  <div class="config-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="settings_system_daydream" class="q-mr-sm" size="md"/>Configuración del Sistema
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Parámetros globales, límites de horas y alertas.</p>
      </div>
    </div>
    
    <q-card v-if="loading" class="my-card no-shadow q-pa-xl text-center">
      <q-spinner color="primary" size="4em" />
      <div class="q-mt-md text-h6 text-primary text-weight-medium">Cargando configuraciones...</div>
    </q-card>

    <div class="row q-col-gutter-lg" v-else>
      <div class="col-12" v-for="config in configs" :key="config.key">
        <q-card class="my-card config-item no-shadow">
          <q-card-section class="row items-center q-pa-lg">
            <div class="col-12 col-md-5 q-mb-sm-md q-mb-md-none">
              <div class="text-weight-bold text-h6 text-primary">{{ formatKeyName(config.key) }}</div>
              <div class="text-caption text-grey-8 text-weight-medium q-mt-xs">{{ config.description || config.key }}</div>
            </div>
            
            <div class="col-12 col-md-5 q-px-md-xl q-mb-sm-md q-mb-md-none">
              <q-input 
                v-if="typeof config.value === 'number' || !isNaN(config.value)" 
                v-model.number="config.editValue" 
                type="number" 
                dense outlined color="primary" class="glass-input text-weight-bold"
              />
              <q-toggle 
                v-else-if="typeof config.value === 'boolean' || config.value === 'true' || config.value === 'false'" 
                v-model="config.editValue" 
                color="primary" size="lg"
              />
              <q-input 
                v-else 
                v-model="config.editValue" 
                dense outlined color="primary" class="glass-input text-weight-bold"
              />
            </div>
            
            <div class="col-12 col-md-2 text-right">
              <q-btn 
                color="secondary" 
                icon="save" 
                label="Actualizar" 
                class="header-btn text-weight-bold shadow-2 full-width" rounded
                @click="updateConfig(config)" 
                :disable="config.value === config.editValue"
                :loading="config.saving"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import systemConfigService from '../../api/systemConfig.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

// State
const configs = ref([]);
const loading = ref(false);

onMounted(() => {
  fetchConfigs();
});

async function fetchConfigs() {
  loading.value = true;
  try {
    const response = await systemConfigService.getAll();
    // Extracción segura del array 'configs'
    const data = response.data?.configs || [];
    
    configs.value = data.map(c => ({
      ...c,
      editValue: c.value,
      saving: false
    }));
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar configuraciones', position: 'top', timeout: 5000 });
  } finally {
    loading.value = false;
  }
}

async function updateConfig(config) {
  config.saving = true;
  try {
    await systemConfigService.update(config.key, config.editValue);
    config.value = config.editValue;
    $q.notify({ type: 'positive', message: `Configuración ${config.key} actualizada`, position: 'top', timeout: 5000 });
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al actualizar configuración', position: 'top', timeout: 5000 });
    // Revertir cambio
    config.editValue = config.value;
  } finally {
    config.saving = false;
  }
}

// Diccionario para traducir palabras individuales de las llaves de configuración
const wordDictionary = {
  'MAX': 'Máximo de',
  'MIN': 'Mínimo de',
  'LOGBOOK': 'Bitácora',
  'LOGBOOKS': 'Bitácoras',
  'TECHNICIAN': 'Técnico',
  'TECHNOLOGIST': 'Tecnólogo',
  'HOURS': 'Horas',
  'TRACKING': 'Seguimiento',
  'TRACKINGS': 'Seguimientos',
  'DAYS': 'Días',
  'EXPIRY': 'Vencimiento',
  'ENROLLMENT': 'Matrícula',
  'DEADLINE': 'Límite',
  'MONTHS': 'Meses',
  'REGISTRATION': 'Registro',
  'EP': 'Etapa Productiva',
  'LIMIT': 'Límite',
  'ALERT': 'Alerta',
  'WARNING': 'Aviso',
  'REQUIRED': 'Requerido',
  'REVIEW': 'Revisión',
  'PER': 'por',
  'IN_PERSON': 'Presencial',
  'VIRTUAL': 'Virtual',
  'EXTRAORDINARY': 'Extraordinario',
  'CERTIFICATION': 'Certificación',
  'MONTHLY': 'Mensuales',
  'INSTRUCTOR': 'Instructor',
  'YELLOW': 'Amarilla',
  'ORANGE': 'Naranja',
  'RED': 'Roja',
  'NOTIFICATION': 'Notificación',
  'EMAIL': 'Correo',
  'GOOGLE_DRIVE': 'Google Drive',
  'ROOT': 'Raíz',
  'FOLDER': 'Carpeta',
  'ID': 'ID',
  'NEW': 'Nuevos',
  'OLD': 'Antiguos',
  'YEAR': 'Año',
  'YEARS': 'Años'
};

function formatKeyName(key) {
  // Traducciones exactas para claves conocidas
  const exactMatches = {
    'EP_REGISTRATION_DEADLINE_MONTHS': 'Meses Límite para Registro de EP',
    'MAX_LOGBOOKS_TECHNICIAN': 'Máximo de Bitácoras - Técnico',
    'MAX_LOGBOOKS_TECHNOLOGIST': 'Máximo de Bitácoras - Tecnólogo',
    'HOURS_PER_LOGBOOK_REVIEW': 'Horas por Revisión de Bitácora',
    'HOURS_PER_IN_PERSON_TRACKING': 'Horas por Seguimiento Presencial',
    'HOURS_PER_VIRTUAL_TRACKING': 'Horas por Seguimiento Virtual',
    'HOURS_PER_EXTRAORDINARY_TRACKING': 'Horas por Seguimiento Extraordinario',
    'HOURS_PER_CERTIFICATION': 'Horas por Certificación',
    'REQUIRED_TRACKINGS_TECHNICIAN': 'Seguimientos Requeridos - Técnico',
    'REQUIRED_TRACKINGS_TECHNOLOGIST': 'Seguimientos Requeridos - Tecnólogo',
    'MAX_MONTHLY_HOURS_INSTRUCTOR': 'Máximo de Horas Mensuales por Instructor',
    'EXPIRY_ALERT_DAYS_YELLOW': 'Días para Alerta Amarilla',
    'EXPIRY_ALERT_DAYS_ORANGE': 'Días para Alerta Naranja',
    'EXPIRY_ALERT_DAYS_RED': 'Días para Alerta Roja',
    'NOTIFICATION_EMAIL': 'Correo para Notificaciones',
    'GOOGLE_DRIVE_ROOT_FOLDER_ID': 'ID Carpeta Raíz Google Drive',
    'EP_DEADLINE_MONTHS_NEW_ENROLLMENT': 'Meses Límite para Registrar EP (Matrícula Nueva)',
    'EP_DEADLINE_YEARS_OLD_ENROLLMENT': 'Años Límite para Registrar EP (Matrícula Antigua)'
  };
  
  if (exactMatches[key]) return exactMatches[key];

  // Fallback: reemplazar guiones bajos por espacios con capitalización
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.config-container {
  max-width: 1200px;
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

/* Cards & Glassmorphism */
.my-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
}

.config-item:hover {
  transform: translateX(5px);
  box-shadow: -5px 15px 40px rgba(0,0,0,0.08) !important;
  border-left: 4px solid var(--q-primary);
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

/* Buttons */
.header-btn { transition: all 0.3s ease; }
.header-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(0,0,0,0.2) !important;
}
</style>
