
<template>
  <q-layout view="lHh Lpr lFf">


    <q-page-container>
      <q-page class="flex flex-center bg-grey-1" style="min-height: calc(100vh - 40px);">
        <!-- Main Login Card -->
        <q-card class="login-card shadow-10 q-ma-md" style="width: 100%; max-width: 500px; border-radius: 0;">
          <!-- Green Header -->
          <div class="bg-primary text-white text-center q-pa-md">
            <h1 class="text-h5 text-weight-bold q-my-none" style="letter-spacing: 1px;">REPFORA E.P.</h1>
          </div>

          <q-card-section class="bg-white q-pa-xl text-center">
            <!-- Logo (SENA) inside body -->
            <div class="sena-logo q-mb-md">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Sena_Colombia_logo.svg" 
                   style="height: 70px; filter: invert(45%) sepia(85%) saturate(1142%) hue-rotate(85deg) brightness(96%) contrast(87%);" 
                   alt="SENA Logo" />
            </div>
            
            <div class="text-h6 text-weight-bold q-mb-lg text-black" style="letter-spacing: 1px;">LOGIN</div>

            <q-form @submit="handleLogin" class="q-gutter-md text-left">
              <!-- National ID Field -->
              <q-input
                v-model="loginForm.nationalId"
                label="Número de Cédula"
                outlined
                dense
                color="primary"
                :rules="[val => !!val || 'La cédula es requerida']"
              >
              </q-input>

              <!-- Password Field -->
              <q-input
                v-model="loginForm.password"
                label="Contraseña"
                outlined
                dense
                color="primary"
                :type="showPassword ? 'text' : 'password'"
                :rules="[val => !!val || 'La contraseña es requerida']"
              >
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <div class="row items-center justify-between q-mt-sm">
                <q-checkbox v-model="rememberMe" label="Recordarme" dense color="primary" class="text-grey-8" />
              </div>

              <!-- Error Message -->
              <div v-if="authStore.error" class="text-negative text-caption text-center q-mt-md">
                {{ authStore.error }}
              </div>

              <div class="text-center q-mt-lg">
                <q-btn
                  type="submit"
                  color="primary"
                  class="q-px-xl q-py-sm text-weight-bold"
                  label="INICIAR SESIÓN"
                  :loading="authStore.loading"
                  unelevated
                />
              </div>


            </q-form>
          </q-card-section>
        </q-card>
      </q-page>
    </q-page-container>

    <!-- Footer -->
    <q-footer class="bg-grey-3 text-black text-center q-pa-sm" style="border-top: 1px solid #ddd;">
      <div class="text-caption text-weight-bold">
        REPFORA - Sena 2026 © Todos los derechos reservados
      </div>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useQuasar } from 'quasar';
import { productiveStageService } from '../../api/productiveStage.service';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const showPassword = ref(false);
const rememberMe = ref(false);

const loginForm = reactive({
  nationalId: '',
  password: ''
});

async function handleLogin() {
  try {
    await authStore.login({
      nationalId: loginForm.nationalId,
      password: loginForm.password
    });

    $q.notify({
      type: 'positive',
      message: 'Bienvenido al sistema',
      position: 'top'
    });

    // Redirection for apprentice: check if EP already exists
    if (authStore.user?.role === 'APPRENTICE') {
      try {
        const data = await productiveStageService.getMyEP();
        if (data.eps && data.eps.length > 0) {
          router.push({ name: 'dashboard' });
        } else {
          router.push('/register-ep');
        }
      } catch (e) {
        console.error('Error al verificar etapa productiva:', e);
        router.push('/register-ep');
      }
    } else {
      router.push({ name: 'dashboard' });
    }
  } catch (error) {
    console.error('Login error:', error);
    // Error notification is usually enough, store error is shown in UI
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  width: 100vw;
}

.login-card {
  width: 100%;
}

.sena-logo {
  height: 80px;
}

/* Link override */
a {
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
</style>





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

// Diccionario para traducir palabras individuales de las llaves de configuración
const wordDictionary = {
  'MAX': 'Máximo de',
  'MIN': 'Mínimo de',
  'LOGBOOK': 'Bitácora',
  'LOGBOOKS': 'Bitácoras',
  'TECHNICIAN': '(Técnico)',
  'TECHNOLOGIST': '(Tecnólogo)',
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
  'REQUIRED': 'Requerido'
};

function formatKeyName(key) {
  // Traducciones exactas para claves conocidas
  const exactMatches = {
    'EP_REGISTRATION_DEADLINE_MONTHS': 'Meses Límite para Registro de EP',
    'MAX_LOGBOOKS_TECHNICIAN': 'Máximo de Bitácoras (Técnico)',
    'MAX_LOGBOOKS_TECHNOLOGIST': 'Máximo de Bitácoras (Tecnólogo)'
  };
  
  if (exactMatches[key]) return exactMatches[key];

  // Si no hay traducción exacta, traducimos palabra por palabra (Fallback dinámico)
  return key.split('_').map(word => {
    const w = wordDictionary[word.toUpperCase()] || word;
    // Evitamos transformar palabras con espacios como 'Máximo de' o '(Técnico)' de forma incorrecta
    if (wordDictionary[word.toUpperCase()]) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}
</script>

<style scoped>
.config-container {
  max-width: 1000px;
  margin: 0 auto;
}
</style>
