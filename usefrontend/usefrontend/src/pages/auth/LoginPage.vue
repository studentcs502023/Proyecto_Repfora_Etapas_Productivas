<template>
  <q-layout view="lHh Lpr lFf">
    <!-- Animated Canvas Background -->
    <canvas ref="bgCanvas" class="tech-background"></canvas>
    <!-- Scan Line -->
    <div class="scan-line"></div>
    <!-- Vignette overlay -->
    <div class="vignette"></div>

    <q-page-container>
      <q-page class="flex flex-center" style="min-height: 100vh; background: transparent;">

        <!-- Wide two-panel card -->
        <q-card class="login-card shadow-24" style="width: 100%; max-width: 860px; border-radius: 16px; z-index: 10; overflow: hidden; display: flex; flex-direction: row;">

          <!-- LEFT PANEL: SENA branding -->
          <div class="sena-panel flex-1 flex column items-center justify-center q-pa-xl">
            <!-- Animated logo glow ring -->
            <div class="logo-ring q-mb-lg">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/8/83/Sena_Colombia_logo.svg"
                class="sena-logo-img"
                alt="SENA Logo"
              />
            </div>
            <div class="text-white text-h6 text-weight-bold" style="letter-spacing: 2px; text-shadow: 0 0 12px rgba(255,255,255,0.3);">SENA</div>
            <div class="text-white text-caption q-mt-xs text-center" style="opacity: 0.75; max-width: 180px; line-height: 1.5;">
              Servicio Nacional de Aprendizaje
            </div>
            <div class="divider-line q-my-lg"></div>
            <div class="text-white text-body2 text-center text-weight-medium" style="opacity: 0.85; letter-spacing: 1px;">
              Sistema de Registro<br/>de Etapas Productivas
            </div>
          </div>

          <!-- RIGHT PANEL: Form -->
          <div class="form-panel bg-white flex column justify-center q-pa-xl" style="min-width: 340px;">
            <!-- Header pill -->
            <div class="header-pill text-white text-weight-bold text-center q-mb-lg">
              REPFORA E.P.
            </div>

            <div class="text-h6 text-weight-bold text-black q-mb-xs" style="letter-spacing: 1px;">Iniciar Sesión</div>
            <div class="text-caption text-grey-6 q-mb-lg">Ingresa tus credenciales para continuar</div>

            <q-form @submit="handleLogin" class="q-gutter-md">
              <!-- National ID -->
              <q-input
                v-model="loginForm.nationalId"
                label="Número de Cédula"
                outlined
                dense
                color="primary"
                :rules="[val => !!val || 'La cédula es requerida']"
              >
                <template v-slot:prepend>
                  <q-icon name="badge" color="primary" />
                </template>
              </q-input>

              <!-- Password -->
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
                  <q-icon name="lock" color="primary" />
                </template>
                <template v-slot:append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <!-- Remember me -->
              <div class="row items-center">
                <q-checkbox v-model="rememberMe" label="Recordarme" dense color="primary" class="text-grey-8" />
              </div>

              <!-- Error -->
              <div v-if="authStore.error" class="text-negative text-caption text-center">
                {{ authStore.error }}
              </div>

              <!-- Submit -->
              <q-btn
                type="submit"
                class="full-width q-py-sm text-weight-bold q-mt-md"
                label="INICIAR SESIÓN"
                :loading="authStore.loading"
                unelevated
                style="background-color: #3a7d34; color: white; border-radius: 8px; letter-spacing: 1px;"
              />
            </q-form>

            <div class="text-caption text-grey-5 text-center q-mt-xl">
              REPFORA © 2026 — SENA Colombia
            </div>
          </div>

        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
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
    $q.notify({ type: 'positive', message: 'Bienvenido al sistema', position: 'top' });

    // Redirection directly to RF-003 for apprentice
    if (authStore.user?.role === 'APPRENTICE') {
      router.push('/register-ep');
    } else {
      router.push({ name: 'dashboard' });
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Canvas animation
const bgCanvas = ref(null);
let animationFrameId = null;

const handleResize = () => {
  const canvas = bgCanvas.value;
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

onMounted(() => {
  const canvas = bgCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particlesArray = [];

  handleResize();
  window.addEventListener('resize', handleResize);

  class Particle {
    constructor() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 1;
      this.speedX = (Math.random() - 0.5);
      this.speedY = (Math.random() - 0.5);
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
      ctx.fillStyle = '#3a7d34';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function init() {
    particlesArray = [];
    const n = (canvas.height * canvas.width) / 9000;
    for (let i = 0; i < n; i++) particlesArray.push(new Particle());
  }

  function handleParticles() {
    for (let i = 0; i < particlesArray.length; i++) {
      particlesArray[i].update();
      particlesArray[i].draw();
      for (let j = i; j < particlesArray.length; j++) {
        const dx = particlesArray[i].x - particlesArray[j].x;
        const dy = particlesArray[i].y - particlesArray[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(58,125,52,${1 - dist / 110})`;
          ctx.lineWidth = 1;
          ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
          ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
          ctx.stroke();
          ctx.closePath();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    handleParticles();
    animationFrameId = requestAnimationFrame(animate);
  }

  init();
  animate();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
/* ── Background ──────────────────────────────── */
.tech-background {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  background-color: #050f07;
  z-index: 1;
}
.scan-line {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 4px;
  background: rgba(58,125,52,0.4);
  box-shadow: 0 0 12px rgba(58,125,52,0.8);
  z-index: 2;
  animation: scan 4s linear infinite;
}
@keyframes scan {
  0%   { transform: translateY(-10px); }
  100% { transform: translateY(100vh); }
}
.vignette {
  position: fixed; top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: radial-gradient(circle, transparent 45%, rgba(5,15,7,0.82) 100%);
  z-index: 3; pointer-events: none;
}

/* ── Card entrance ───────────────────────────── */
.login-card {
  animation: slideUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  opacity: 0; transform: translateY(50px);
}
@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}

/* ── Left SENA panel ─────────────────────────── */
.sena-panel {
  background: linear-gradient(160deg, #2d6329 0%, #3a7d34 55%, #1e4d1b 100%);
  position: relative;
  overflow: hidden;
  min-width: 280px;
}
.sena-panel::before {
  content: '';
  position: absolute; inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

/* glowing ring around logo */
.logo-ring {
  width: 130px; height: 130px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 2px solid rgba(255,255,255,0.2);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 30px rgba(100,220,100,0.2), 0 0 60px rgba(58,125,52,0.15);
  animation: pulse-ring 3s ease-in-out infinite;
}
@keyframes pulse-ring {
  0%, 100% { box-shadow: 0 0 30px rgba(100,220,100,0.2), 0 0 60px rgba(58,125,52,0.15); }
  50%       { box-shadow: 0 0 45px rgba(100,220,100,0.35), 0 0 80px rgba(58,125,52,0.25); }
}
.sena-logo-img {
  height: 72px;
  filter: brightness(0) invert(1);
}

.divider-line {
  width: 50px; height: 2px;
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
}

/* ── Right form panel ────────────────────────── */
.form-panel {
  flex: 1;
}

.header-pill {
  display: inline-block;
  background-color: #3a7d34;
  color: white;
  border-radius: 20px;
  padding: 4px 20px;
  font-size: 0.8rem;
  letter-spacing: 1.5px;
  align-self: flex-start;
}

/* ── Responsive: stack on mobile ─────────────── */
@media (max-width: 640px) {
  .login-card {
    flex-direction: column !important;
    max-width: 380px !important;
  }
  .sena-panel {
    min-width: unset !important;
    padding: 2rem !important;
  }
}
</style>
