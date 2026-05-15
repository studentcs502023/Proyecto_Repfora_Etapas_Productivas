<template>
  <div class="config-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Configuración del Sistema</h2>
        <p class="text-grey-7 q-my-sm">Parámetros globales, límites de horas y alertas.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Recargar" @click="fetchConfigs" :loading="loading" />
      </div>
    </div>
    
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
      <div class="q-mt-md text-grey">Cargando configuraciones...</div>
    </q-card>

    <div class="row q-col-gutter-md" v-else>
      <div class="col-12" v-for="config in configs" :key="config.key">
        <q-card flat bordered>
          <q-card-section class="row items-center">
            <div class="col-12 col-md-4">
              <div class="text-weight-bold text-subtitle1">{{ formatKeyName(config.key) }}</div>
              <div class="text-caption text-grey-7">{{ config.description || config.key }}</div>
            </div>
            
            <div class="col-12 col-md-6 q-px-md">
              <q-input 
                v-if="typeof config.value === 'number' || !isNaN(config.value)" 
                v-model.number="config.editValue" 
                type="number" 
                dense outlined 
              />
              <q-toggle 
                v-else-if="typeof config.value === 'boolean' || config.value === 'true' || config.value === 'false'" 
                v-model="config.editValue" 
                color="primary" 
              />
              <q-input 
                v-else 
                v-model="config.editValue" 
                dense outlined 
              />
            </div>
            
            <div class="col-12 col-md-2 text-right">
              <q-btn 
                color="secondary" 
                icon="save" 
                label="Actualizar" 
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
    $q.notify({ type: 'negative', message: 'Error al cargar configuraciones' });
  } finally {
    loading.value = false;
  }
}

async function updateConfig(config) {
  config.saving = true;
  try {
    await systemConfigService.update(config.key, config.editValue);
    config.value = config.editValue;
    $q.notify({ type: 'positive', message: `Configuración ${config.key} actualizada` });
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al actualizar configuración' });
    // Revert change
    config.editValue = config.value;
  } finally {
    config.saving = false;
  }
}

function formatKeyName(key) {
  // Convert MAX_LOGBOOKS_TECHNICIAN to Max Logbooks Technician
  return key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}
</script>

<style scoped>
.config-container {
  max-width: 1000px;
  margin: 0 auto;
}
</style>
