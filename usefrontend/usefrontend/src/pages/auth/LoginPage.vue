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

    // Redirection directly to RF-003 for apprentice
    if (authStore.user?.role === 'APPRENTICE') {
      router.push('/register-ep');
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
