<template>
  <div class="profile-container q-pa-md">
    <!-- Premium Header with Gradient Cover -->
    <div class="cover-image relative-position rounded-borders overflow-hidden q-mb-xl shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content absolute-bottom q-pa-lg text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">Mi Perfil</h2>
        <p class="text-subtitle1 q-my-sm opacity-80">Consulta y actualiza tu información personal en un entorno seguro.</p>
      </div>
    </div>

    <div class="row q-col-gutter-xl">
      <!-- User Info Card -->
      <div class="col-12 col-md-4">
        <q-card class="user-card my-card text-center relative-position no-shadow">
          <div class="avatar-wrapper">
            <q-avatar size="120px" class="user-avatar shadow-10" font-size="52px" text-color="white">
              {{ initial }}
            </q-avatar>
          </div>
          
          <q-card-section class="q-pt-xl q-mt-md">
            <div class="text-h5 text-weight-bolder text-primary q-mb-xs">{{ user?.fullName }}</div>
            <q-chip color="secondary" text-color="white" class="text-weight-bold shadow-2 q-mb-md" icon="school">
              Aprendiz
            </q-chip>
            
            <q-separator class="q-my-md opacity-20" />
            
            <q-list class="text-left info-list">
              <q-item v-if="user?.nationalId" v-ripple class="info-item rounded-borders q-mb-sm">
                <q-item-section avatar><q-icon name="badge" color="primary" size="sm" /></q-item-section>
                <q-item-section>
                  <q-item-label caption class="text-uppercase text-weight-bold text-grey-6">Documento</q-item-label>
                  <q-item-label class="text-weight-medium text-dark">{{ user.nationalId }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-item v-if="user?.email" v-ripple class="info-item rounded-borders q-mb-sm">
                <q-item-section avatar><q-icon name="email" color="primary" size="sm" /></q-item-section>
                <q-item-section>
                  <q-item-label caption class="text-uppercase text-weight-bold text-grey-6">Correo</q-item-label>
                  <q-item-label class="text-weight-medium text-dark text-break">{{ user.email }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-item v-if="user?.enrollmentNumber" v-ripple class="info-item rounded-borders q-mb-sm">
                <q-item-section avatar><q-icon name="numbers" color="primary" size="sm" /></q-item-section>
                <q-item-section>
                  <q-item-label caption class="text-uppercase text-weight-bold text-grey-6">Ficha</q-item-label>
                  <q-item-label class="text-weight-medium text-dark">{{ user.enrollmentNumber }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-item v-if="user?.program" v-ripple class="info-item rounded-borders q-mb-sm">
                <q-item-section avatar><q-icon name="laptop_chromebook" color="primary" size="sm" /></q-item-section>
                <q-item-section>
                  <q-item-label caption class="text-uppercase text-weight-bold text-grey-6">Programa</q-item-label>
                  <q-item-label class="text-weight-medium text-dark">{{ user.program }}</q-item-label>
                </q-item-section>
              </q-item>

              <q-item v-if="user?.trainingCenter" v-ripple class="info-item rounded-borders q-mb-sm">
                <q-item-section avatar><q-icon name="business" color="primary" size="sm" /></q-item-section>
                <q-item-section>
                  <q-item-label caption class="text-uppercase text-weight-bold text-grey-6">Centro</q-item-label>
                  <q-item-label class="text-weight-medium text-dark">{{ user.trainingCenter }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-item v-if="user?.trainingLevel" v-ripple class="info-item rounded-borders">
                <q-item-section avatar><q-icon name="insights" color="primary" size="sm" /></q-item-section>
                <q-item-section>
                  <q-item-label caption class="text-uppercase text-weight-bold text-grey-6">Nivel</q-item-label>
                  <q-item-label class="text-weight-medium text-dark">
                    <q-badge :color="user.trainingLevel === 'TECHNICIAN' ? 'info' : 'accent'" rounded class="q-px-sm q-py-xs">
                      {{ user.trainingLevel === 'TECHNICIAN' ? 'Técnico' : 'Tecnólogo' }}
                    </q-badge>
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Password Card -->
      <div class="col-12 col-md-8">
        <q-card class="password-card my-card no-shadow">
          <q-card-section class="bg-primary text-white q-pa-md rounded-top">
            <div class="text-h6 text-weight-bold row items-center">
              <q-icon name="lock" class="q-mr-sm" size="sm" />
              Seguridad de la Cuenta
            </div>
          </q-card-section>
          
          <q-card-section class="q-pa-lg">
            <p class="text-grey-8 q-mb-lg">Asegúrate de usar una contraseña fuerte para mantener tu cuenta protegida.</p>
            
            <q-form ref="passwordFormRef" @submit.prevent="changePassword" class="password-form">
              <div class="row q-col-gutter-lg">
                <div class="col-12">
                  <q-input
                    v-model="passwordForm.currentPassword"
                    label="Contraseña Actual"
                    :type="showCurrent ? 'text' : 'password'"
                    outlined 
                    color="primary"
                    class="glass-input text-weight-medium"
                    lazy-rules
                    :rules="[val => !!val || 'Campo requerido']"
                  >
                    <template v-slot:prepend>
                      <q-icon name="vpn_key" color="grey-6" />
                    </template>
                    <template v-slot:append>
                      <q-icon :name="showCurrent ? 'visibility_off' : 'visibility'" class="cursor-pointer text-grey-6 hover-primary" @click="showCurrent = !showCurrent" />
                    </template>
                  </q-input>
                </div>
                
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="passwordForm.newPassword"
                    label="Nueva Contraseña"
                    :type="showNew ? 'text' : 'password'"
                    outlined 
                    color="primary"
                    class="glass-input text-weight-medium"
                    lazy-rules
                    :rules="[
                      val => !!val || 'Campo requerido',
                      val => val.length >= 8 || 'Mínimo 8 caracteres',
                      val => /[A-Z]/.test(val) || 'Debe tener al menos una mayúscula',
                      val => /[a-z]/.test(val) || 'Debe tener al menos una minúscula',
                      val => /[0-9]/.test(val) || 'Debe tener al menos un número',
                      val => /[@$!%*?&]/.test(val) || 'Debe tener al menos un carácter especial'
                    ]"
                  >
                    <template v-slot:prepend>
                      <q-icon name="lock_outline" color="grey-6" />
                    </template>
                    <template v-slot:append>
                      <q-icon :name="showNew ? 'visibility_off' : 'visibility'" class="cursor-pointer text-grey-6 hover-primary" @click="showNew = !showNew" />
                    </template>
                  </q-input>
                </div>
                
                <div class="col-12 col-sm-6">
                  <q-input
                    v-model="passwordForm.confirmPassword"
                    label="Confirmar Nueva Contraseña"
                    :type="showConfirm ? 'text' : 'password'"
                    outlined 
                    color="primary"
                    class="glass-input text-weight-medium"
                    lazy-rules
                    :rules="[
                      val => !!val || 'Campo requerido',
                      val => val === passwordForm.newPassword || 'Las contraseñas no coinciden'
                    ]"
                  >
                    <template v-slot:prepend>
                      <q-icon name="check_circle_outline" color="grey-6" />
                    </template>
                    <template v-slot:append>
                      <q-icon :name="showConfirm ? 'visibility_off' : 'visibility'" class="cursor-pointer text-grey-6 hover-primary" @click="showConfirm = !showConfirm" />
                    </template>
                  </q-input>
                </div>
              </div>

              <q-separator class="q-my-xl opacity-20" />

              <div class="row justify-end">
                <q-btn 
                  type="submit" 
                  color="secondary" 
                  label="Actualizar Contraseña" 
                  icon="lock_reset" 
                  :loading="savingPassword" 
                  class="submit-btn text-weight-bold shadow-4" 
                  padding="10px 30px"
                  rounded
                  unelevated
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
const passwordFormRef = ref(null);

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const user = computed(() => authStore.user);

const initial = computed(() => user.value?.fullName?.charAt(0)?.toUpperCase() || '?');

async function changePassword() {
  savingPassword.value = true;
  try {
    const payload = {
      currentPassword: passwordForm.value.currentPassword.trim(),
      newPassword: passwordForm.value.newPassword.trim(),
      confirmPassword: passwordForm.value.confirmPassword.trim()
    };
    await authService.changePassword(payload);
    if (authStore.user) {
      authStore.user.firstLogin = false;
      localStorage.setItem('user', JSON.stringify(authStore.user));
    }
    $q.notify({ type: 'positive', message: '¡Contraseña actualizada correctamente!', position: 'top', timeout: 5000 });
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
    passwordFormRef.value?.resetValidation();
  } catch (err) {
    console.error(err);
    const msg = err.response?.data?.message || err.message || 'Error al cambiar la contraseña';
    $q.notify({ type: 'negative', message: msg, position: 'top', timeout: 5000 });
  } finally {
    savingPassword.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.profile-container {
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Cover Image */
.cover-image {
  height: 220px;
  background: linear-gradient(135deg, #093028 0%, #237A57 100%);
  border-radius: 20px;
  position: relative;
  transition: all 0.3s ease;
}

.cover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0);
  background-size: 20px 20px;
}

.shadow-text {
  text-shadow: 2px 2px 8px rgba(0,0,0,0.4);
}

.opacity-80 {
  opacity: 0.8;
}

.opacity-20 {
  opacity: 0.2;
}

/* Cards */
.my-card {
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease;
}

.my-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 15px 50px rgba(0,0,0,0.1) !important;
}

/* Avatar */
.avatar-wrapper {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
}

.user-avatar {
  background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
  border: 6px solid #fff;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.user-card:hover .user-avatar {
  transform: scale(1.08) rotate(5deg);
}

/* List Items */
.info-item {
  transition: all 0.2s ease;
  border-left: 4px solid transparent;
}

.info-item:hover {
  background: #f8fcfb;
  border-left-color: var(--q-primary);
  transform: translateX(6px);
}

.text-break {
  word-break: break-all;
}

/* Password Form */
.rounded-top {
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  background: linear-gradient(to right, #093028, var(--q-primary));
}

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

.hover-primary:hover {
  color: var(--q-primary) !important;
}

.submit-btn {
  background: linear-gradient(135deg, var(--q-secondary), #00b4db);
  transition: all 0.3s ease;
}

.submit-btn:hover {
  transform: scale(1.03);
  box-shadow: 0 8px 25px rgba(0,180,219,0.3) !important;
}
</style>
