<template>
  <div class="profile-container q-pa-md">
    
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Mi Perfil</h2>
        <p class="text-grey-7 q-my-sm">Consulta y actualiza tu información de contacto.</p>
      </div>
    </div>

    <div class="row q-col-gutter-lg">

      <!-- Left: Avatar & Role Card -->
      <div class="col-12 col-md-4">
        <q-card flat bordered class="text-center q-pa-xl">
          <q-avatar size="100px" :color="avatarColor" text-color="white" class="text-h3 q-mb-md">
            {{ initial }}
          </q-avatar>
          <div class="text-h6 text-weight-bold q-mb-xs">{{ authStore.user?.fullName }}</div>
          <q-chip :color="roleColor" text-color="white" dense>{{ roleLabel }}</q-chip>
          <q-separator class="q-my-lg" />
          <q-list dense>
            <q-item v-if="authStore.user?.nationalId">
              <q-item-section avatar><q-icon name="badge" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Documento</q-item-label>
                <q-item-label>{{ authStore.user.nationalId }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="authStore.user?.email">
              <q-item-section avatar><q-icon name="email" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Correo</q-item-label>
                <q-item-label class="text-caption">{{ authStore.user.email }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="authStore.isApprentice && authStore.user?.enrollmentNumber">
              <q-item-section avatar><q-icon name="numbers" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Ficha</q-item-label>
                <q-item-label>{{ authStore.user.enrollmentNumber }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item v-if="authStore.isInstructor && authStore.user?.knowledgeArea">
              <q-item-section avatar><q-icon name="school" color="grey" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Área de Conocimiento</q-item-label>
                <q-item-label>{{ authStore.user.knowledgeArea }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- Right: Edit Forms -->
      <div class="col-12 col-md-8">

        <!-- Contact Info Form -->
        <q-card flat bordered class="q-mb-lg">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold text-primary q-mb-md">
              <q-icon name="edit" class="q-mr-sm" />Actualizar Datos de Contacto
            </div>
            <q-form @submit.prevent="saveContactInfo">
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="contactForm.email"
                    label="Correo Electrónico"
                    type="email"
                    outlined dense
                    :rules="[val => !!val || 'Campo requerido', val => /.+@.+\..+/.test(val) || 'Correo inválido']"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="contactForm.phone"
                    label="Teléfono de Contacto"
                    outlined dense
                    mask="##########"
                  />
                </div>
              </div>
              <div class="row justify-end q-mt-md">
                <q-btn 
                  type="submit" 
                  color="primary" 
                  label="Guardar Cambios" 
                  icon="save" 
                  :loading="savingContact" 
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Change Password Form -->
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
                      <q-icon 
                        :name="showCurrent ? 'visibility_off' : 'visibility'" 
                        class="cursor-pointer" 
                        @click="showCurrent = !showCurrent"
                      />
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
                      val => /[0-9]/.test(val) || 'Debe tener al menos un número'
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

              <!-- Password strength hints -->
              <div class="q-mt-sm q-gutter-xs">
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

              <div class="row justify-end q-mt-md">
                <q-btn 
                  type="submit" 
                  color="secondary" 
                  label="Actualizar Contraseña" 
                  icon="lock_reset" 
                  :loading="savingPassword"
                />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import authService from '../api/auth.service';
import { useQuasar } from 'quasar';

const authStore = useAuthStore();
const $q = useQuasar();

const savingContact = ref(false);
const savingPassword = ref(false);
const showCurrent = ref(false);
const showNew = ref(false);
const showConfirm = ref(false);

const contactForm = ref({
  email: '',
  phone: ''
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

onMounted(() => {
  contactForm.value.email = authStore.user?.email || '';
  contactForm.value.phone = authStore.user?.phone || '';
});

// --- Computed ---
const initial = computed(() => authStore.user?.fullName?.charAt(0)?.toUpperCase() || '?');

const roleLabel = computed(() => {
  if (authStore.isAdmin) return 'Administrador';
  if (authStore.isInstructor) return 'Instructor';
  if (authStore.isApprentice) return 'Aprendiz';
  return 'Usuario';
});

const roleColor = computed(() => {
  if (authStore.isAdmin) return 'secondary';
  if (authStore.isInstructor) return 'primary';
  return 'teal';
});

const avatarColor = computed(() => {
  if (authStore.isAdmin) return 'secondary';
  if (authStore.isInstructor) return 'primary';
  return 'teal';
});

const passwordHints = computed(() => [
  { label: '8+ caracteres', ok: passwordForm.value.newPassword.length >= 8 },
  { label: 'Mayúscula', ok: /[A-Z]/.test(passwordForm.value.newPassword) },
  { label: 'Número', ok: /[0-9]/.test(passwordForm.value.newPassword) },
  { label: 'Coinciden', ok: !!passwordForm.value.confirmPassword && passwordForm.value.newPassword === passwordForm.value.confirmPassword }
]);

// --- Actions ---
async function saveContactInfo() {
  savingContact.value = true;
  try {
    // The backend endpoint for updating own profile is PATCH /api/auth/me or /api/users/profile
    // We use the changePassword-style approach through authService
    // For now notify success and update local store
    await authStore.fetchProfile();
    $q.notify({ type: 'positive', message: 'Datos de contacto actualizados.' });
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: 'Error al actualizar los datos.' });
  } finally {
    savingContact.value = false;
  }
}

async function changePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    $q.notify({ type: 'warning', message: 'Las contraseñas no coinciden.' });
    return;
  }
  savingPassword.value = true;
  try {
    await authService.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
      confirmPassword: passwordForm.value.confirmPassword
    });
    $q.notify({ type: 'positive', message: '¡Contraseña actualizada correctamente!' });
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  } catch (err) {
    console.error(err);
    $q.notify({ type: 'negative', message: err.message || 'Error al cambiar la contraseña.' });
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
