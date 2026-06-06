<template>
  <div class="profile-container q-pa-md">
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Mi Perfil</h2>
        <p class="text-grey-7 q-my-sm">Consulta y actualiza tu información personal.</p>
      </div>
    </div>

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-md-4">
        <q-card flat bordered class="text-center q-pa-xl">
          <q-avatar size="100px" color="teal" text-color="white" class="text-h3 q-mb-md">
            {{ initial }}
          </q-avatar>
          <div class="text-h6 text-weight-bold q-mb-xs">{{ user?.fullName }}</div>
          <q-chip color="teal" text-color="white" dense>Aprendiz</q-chip>
          <q-separator class="q-my-lg" />
          <q-list dense>
            <q-item v-if="user?.nationalId">
              <q-item-section avatar><q-icon name="badge" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Documento</q-item-label>
                <q-item-label>{{ user.nationalId }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="user?.email">
              <q-item-section avatar><q-icon name="email" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Correo</q-item-label>
                <q-item-label class="text-caption">{{ user.email }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="user?.enrollmentNumber">
              <q-item-section avatar><q-icon name="numbers" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Ficha</q-item-label>
                <q-item-label>{{ user.enrollmentNumber }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="user?.program">
              <q-item-section avatar><q-icon name="school" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Programa</q-item-label>
                <q-item-label class="text-caption">{{ user.program }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="user?.trainingCenter">
              <q-item-section avatar><q-icon name="location_city" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Centro</q-item-label>
                <q-item-label>{{ user.trainingCenter }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="user?.trainingLevel">
              <q-item-section avatar><q-icon name="bar_chart" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Nivel</q-item-label>
                <q-item-label>{{ user.trainingLevel === 'TECHNICIAN' ? 'Técnico' : 'Tecnólogo' }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-8">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold text-black q-mb-md">
              <q-icon name="lock" class="q-mr-sm" />Cambiar Contraseña
            </div>
            <q-form @submit.prevent="changePassword">
              <div class="row q-col-gutter-md">
                <div class="col-12">
                  <q-input
                    v-model="passwordForm.currentPassword"
                    label="Contraseña Actual"
                    :type="showCurrent ? 'text' : 'password'"
                    outlined dense
                    :rules="[val => !!val || 'Campo requerido']"
                  >
                    <template v-slot:append>
                      <q-icon :name="showCurrent ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showCurrent = !showCurrent" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="passwordForm.newPassword"
                    label="Nueva Contraseña"
                    :type="showNew ? 'text' : 'password'"
                    outlined dense
                    :rules="[
                      val => !!val || 'Campo requerido',
                      val => val.length >= 8 || 'Mínimo 8 caracteres',
                      val => /[A-Z]/.test(val) || 'Debe tener al menos una mayúscula',
                      val => /[a-z]/.test(val) || 'Debe tener al menos una minúscula',
                      val => /[0-9]/.test(val) || 'Debe tener al menos un número',
                      val => /[@$!%*?&]/.test(val) || 'Debe tener al menos un carácter especial'
                    ]"
                  >
                    <template v-slot:append>
                      <q-icon :name="showNew ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showNew = !showNew" />
                    </template>
                  </q-input>
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="passwordForm.confirmPassword"
                    label="Confirmar Nueva Contraseña"
                    :type="showConfirm ? 'text' : 'password'"
                    outlined dense
                    :rules="[
                      val => !!val || 'Campo requerido',
                      val => val === passwordForm.newPassword || 'Las contraseñas no coinciden'
                    ]"
                  >
                    <template v-slot:append>
                      <q-icon :name="showConfirm ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showConfirm = !showConfirm" />
                    </template>
                  </q-input>
                </div>
              </div>

              <div class="q-mt-sm q-gutter-xs">
                <q-chip v-for="hint in passwordHints" :key="hint.label"
                  :color="hint.ok ? 'positive' : 'grey-4'"
                  :text-color="hint.ok ? 'white' : 'grey-7'"
                  dense size="sm"
                  :icon="hint.ok ? 'check' : 'close'"
                >
                  {{ hint.label }}
                </q-chip>
              </div>

              <div class="row justify-end q-mt-md">
                <q-btn type="submit" color="secondary" label="Actualizar Contraseña" icon="lock_reset" :loading="savingPassword" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import authService from '../../api/auth.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const authStore = useAuthStore();

const savingPassword = ref(false);
const showCurrent = ref(false);
const showNew = ref(false);
const showConfirm = ref(false);

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const user = computed(() => authStore.user);

const initial = computed(() => user.value?.fullName?.charAt(0)?.toUpperCase() || '?');

const passwordHints = computed(() => [
  { label: '8+ caracteres', ok: passwordForm.value.newPassword.length >= 8 },
  { label: 'Mayúscula', ok: /[A-Z]/.test(passwordForm.value.newPassword) },
  { label: 'Minúscula', ok: /[a-z]/.test(passwordForm.value.newPassword) },
  { label: 'Número', ok: /[0-9]/.test(passwordForm.value.newPassword) },
  { label: 'Carácter esp.', ok: /[@$!%*?&]/.test(passwordForm.value.newPassword) },
  { label: 'Coinciden', ok: !!passwordForm.value.confirmPassword && passwordForm.value.newPassword === passwordForm.value.confirmPassword }
]);

async function changePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    $q.notify({ type: 'warning', message: 'Las contraseñas no coinciden.', position: 'top', timeout: 5000 });
    return;
  }
  savingPassword.value = true;
  try {
    await authService.changePassword({
      currentPassword: passwordForm.value.currentPassword.trim(),
      newPassword: passwordForm.value.newPassword.trim(),
      confirmPassword: passwordForm.value.confirmPassword.trim()
    });
    $q.notify({ type: 'positive', message: '¡Contraseña actualizada correctamente!', position: 'top', timeout: 5000 });
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: err.message || 'Error al cambiar la contraseña.', position: 'top', timeout: 5000 });
  } finally {
    savingPassword.value = false;
  }
}
</script>

<style scoped>
.profile-container {
  max-width: 900px;
  margin: 0 auto;
}
</style>
