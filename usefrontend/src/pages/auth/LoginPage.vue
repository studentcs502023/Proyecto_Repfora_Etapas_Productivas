<template>
  <div class="login-container flex flex-center bg-grey-2">
    <!-- Main Login Card -->
    <div class="login-card shadow-10 bg-white q-pa-xl rounded-borders">
      <div class="text-center q-mb-lg">
        <!-- Logo Placeholder (SENA) -->
        <div class="sena-logo q-mb-md flex flex-center">
          <q-icon name="school" color="primary" size="64px" />
        </div>
        <h1 class="text-h4 text-secondary text-weight-bold q-my-none">REPFORA</h1>
        <p class="text-grey-7 text-subtitle2">Etapa Productiva SENA</p>
      </div>

      <q-form @submit="handleLogin" class="q-gutter-md">
        <!-- National ID Field -->
        <q-input
          v-model="loginForm.nationalId"
          label="Número de Cédula"
          outlined
          dense
          color="primary"
          :rules="[val => !!val || 'La cédula es requerida']"
        >
          <template v-slot:prepend>
            <q-icon name="badge" color="secondary" />
          </template>
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
          <template v-slot:prepend>
            <q-icon name="lock" color="secondary" />
          </template>
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

        <div class="q-mt-xl">
          <q-btn
            type="submit"
            color="primary"
            class="full-width q-py-sm text-weight-bold"
            label="INGRESAR"
            :loading="authStore.loading"
            unelevated
          />
        </div>
      </q-form>

      <div class="text-center q-mt-xl text-grey-6 text-caption">
        © 2026 Servicio Nacional de Aprendizaje SENA
      </div>
    </div>
  </div>
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

    // Redirection is handled by the guard or manually here
    router.push({ name: 'dashboard' });
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
  max-width: 450px;
  border-top: 6px solid var(--q-primary);
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
