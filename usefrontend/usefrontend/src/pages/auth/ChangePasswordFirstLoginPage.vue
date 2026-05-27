<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-1" style="min-height: calc(100vh - 40px);">
        <q-card class="login-card shadow-10 q-ma-md" style="width: 100%; max-width: 500px; border-radius: 0;">
          <!-- Green Header -->
          <div class="bg-primary text-white text-center q-pa-md">
            <h1 class="text-h5 text-weight-bold q-my-none" style="letter-spacing: 1px;">REPFORA E.P.</h1>
          </div>

          <q-card-section class="bg-white q-pa-xl">
            <!-- SENA Logo -->
            <div class="text-center q-mb-md">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/83/Sena_Colombia_logo.svg" 
                   style="height: 70px; filter: invert(45%) sepia(85%) saturate(1142%) hue-rotate(85deg) brightness(96%) contrast(87%);" 
                   alt="SENA Logo" />
            </div>
            
            <div class="text-h6 text-weight-bold text-center q-mb-md text-black" style="letter-spacing: 1px;">
              CAMBIO DE CONTRASEÑA OBLIGATORIO
            </div>
            <p class="text-subtitle2 text-grey-7 text-center q-mb-lg">
              Por motivos de seguridad, debe cambiar su contraseña inicial antes de continuar.
            </p>

            <q-form @submit.prevent="handleSubmit" class="q-gutter-md">
              <!-- New Password Field -->
              <q-input
                v-model="form.newPassword"
                label="Nueva Contraseña"
                outlined
                dense
                color="primary"
                :type="showNewPassword ? 'text' : 'password'"
                :rules="[
                  val => !!val || 'La contraseña es requerida',
                  val => val.length >= 8 || 'Mínimo 8 caracteres',
                  val => /[A-Z]/.test(val) || 'Debe contener al menos una mayúscula',
                  val => /[a-z]/.test(val) || 'Debe contener al menos una minúscula',
                  val => /\d/.test(val) || 'Debe contener al menos un número',
                  val => /[@$!%*?&]/.test(val) || 'Debe contener al menos un carácter especial (@$!%*?&)'
                ]"
                lazy-rules
              >
                <template v-slot:append>
                  <q-icon
                    :name="showNewPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showNewPassword = !showNewPassword"
                  />
                </template>
              </q-input>

              <!-- Confirm Password Field -->
              <q-input
                v-model="form.confirmPassword"
                label="Confirmar Contraseña"
                outlined
                dense
                color="primary"
                :type="showConfirmPassword ? 'text' : 'password'"
                :rules="[
                  val => !!val || 'Debe confirmar su contraseña',
                  val => val === form.newPassword || 'Las contraseñas no coinciden'
                ]"
                lazy-rules
              >
                <template v-slot:append>
                  <q-icon
                    :name="showConfirmPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showConfirmPassword = !showConfirmPassword"
                  />
                </template>
              </q-input>

              <!-- Dynamic Password Strength Hints -->
              <div class="q-mt-sm">
                <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">Requisitos de contraseña:</div>
                <div class="row q-gutter-xs">
                  <q-chip 
                    v-for="hint in passwordHints" :key="hint.label"
                    :color="hint.ok ? 'positive' : 'grey-4'"
                    :text-color="hint.ok ? 'white' : 'grey-7'"
                    dense size="sm"
                    :icon="hint.ok ? 'check' : 'close'"
                  >
                    {{ hint.label }}
                  </q-chip>
                </div>
              </div>

              <!-- Error Message from store -->
              <div v-if="errorMsg" class="text-negative text-caption text-center q-mt-md">
                {{ errorMsg }}
              </div>

              <div class="text-center q-mt-lg">
                <q-btn
                  type="submit"
                  color="primary"
                  class="q-px-xl q-py-sm text-weight-bold"
                  label="ACTUALIZAR CONTRASEÑA"
                  :loading="loading"
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
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useQuasar } from 'quasar';
import { productiveStageService } from '../../api/productiveStage.service';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const showNewPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);
const errorMsg = ref('');

const form = reactive({
  newPassword: '',
  confirmPassword: ''
});

const passwordHints = computed(() => {
  const p = form.newPassword;
  return [
    { label: '8+ caracteres', ok: p.length >= 8 },
    { label: 'Mayúscula', ok: /[A-Z]/.test(p) },
    { label: 'Minúscula', ok: /[a-z]/.test(p) },
    { label: 'Número', ok: /[0-9]/.test(p) },
    { label: 'Carácter esp. (@$!%*?&)', ok: /[@$!%*?&]/.test(p) },
    { label: 'Coinciden', ok: !!form.confirmPassword && p === form.confirmPassword }
  ];
});

async function handleSubmit() {
  errorMsg.value = '';
  loading.value = true;
  try {
    await authStore.changePasswordFirstLogin({
      newPassword: form.newPassword,
      confirmPassword: form.confirmPassword
    });

    $q.notify({
      type: 'positive',
      message: 'Contraseña actualizada con éxito',
      position: 'top'
    });

    // Redirect user to the correct place
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
    console.error('Password change error:', error);
    errorMsg.value = error.message || 'Error al cambiar la contraseña';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-card {
  width: 100%;
}
</style>
