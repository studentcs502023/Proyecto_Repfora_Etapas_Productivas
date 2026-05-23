<template>
  <div class="my-ep-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Mi Etapa Productiva</h2>
        <p class="text-grey-7 q-my-sm">Seguimiento de tu progreso y estado actual.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="fetchMyEP" :loading="loading" />
      </div>
    </div>

    <!-- Loading State -->
    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
    </q-card>

    <!-- No EP found -->
    <q-card flat bordered v-else-if="!ep" class="bg-blue-1 text-center q-pa-xl">
      <q-icon name="info" size="4em" color="primary" class="q-mb-md" />
      <div class="text-h6 text-primary">No tienes una Etapa Productiva registrada</div>
      <p class="text-grey-8">Debes registrar tu etapa productiva para comenzar tu proceso de seguimiento y certificación.</p>
      <q-btn color="primary" label="Registrar Etapa Productiva" to="/apprentice/register-ep" class="q-mt-md" />
    </q-card>

    <div v-else class="row q-col-gutter-lg">
      <!-- Main Content (Left) -->
      <div class="col-12 col-md-8">
        
        <!-- Progress Tracker -->
        <q-card flat bordered class="q-mb-lg">
          <q-card-section class="bg-primary text-white">
            <div class="text-h6">Progreso General</div>
          </q-card-section>
          <q-card-section class="q-pa-lg">
            <q-stepper
              v-model="currentStep"
              ref="stepper"
              color="primary"
              flat
              active-color="primary"
              inactive-color="grey-4"
              done-color="positive"
              header-nav
            >
              <q-step
                :name="1"
                title="Registro"
                icon="app_registration"
                :done="currentStep > 1"
              />
              <q-step
                :name="2"
                title="Aprobación"
                icon="rule"
                :done="currentStep > 2"
                :error="ep.status === 'PENDING_REGISTRATION' && ep.comments.length > 0"
              />
              <q-step
                :name="3"
                title="En Desarrollo"
                icon="trending_up"
                :done="currentStep > 3"
              />
              <q-step
                :name="4"
                title="Certificación"
                icon="workspace_premium"
                :done="currentStep > 4"
              />
              <q-step
                :name="5"
                title="Completado"
                icon="check_circle"
                :done="ep.status === 'COMPLETED' || ep.status === 'ARCHIVED'"
              />
            </q-stepper>

            <!-- Status Alert if rejected -->
            <q-banner v-if="ep.status === 'PENDING_REGISTRATION' && ep.comments.length > 0" class="bg-red-1 text-negative q-mt-md rounded-borders">
              <template v-slot:avatar>
                <q-icon name="warning" />
              </template>
              Tu solicitud fue rechazada. Por favor, revisa los comentarios del coordinador y registra tu etapa nuevamente.
              <template v-slot:action>
                <q-btn flat color="negative" label="Registrar Nuevamente" to="/apprentice/register-ep" />
              </template>
            </q-banner>
          </q-card-section>
        </q-card>

        <!-- Company & Modality Details -->
        <q-card flat bordered class="q-mb-lg">
          <q-card-section class="bg-grey-2">
            <div class="text-subtitle1 text-weight-bold text-black">Detalles del Vínculo</div>
          </q-card-section>
          <q-list bordered separator>
            <q-item>
              <q-item-section avatar><q-icon name="work" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Modalidad</q-item-label>
                <q-item-label>{{ getModalityLabel(ep.modality) }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="business" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Empresa</q-item-label>
                <q-item-label>{{ ep.companySnapshot?.companyName || ep.company?.name }}</q-item-label>
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section avatar><q-icon name="date_range" color="grey-7" /></q-item-section>
              <q-item-section>
                <q-item-label caption>Fechas</q-item-label>
                <q-item-label>{{ formatDate(ep.startDate) }} - {{ formatDate(ep.estimatedEndDate) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>

        <!-- Instructors Details -->
        <q-card flat bordered v-if="ep.status !== 'PENDING_REGISTRATION' && ep.status !== 'PENDING_APPROVAL'">
          <q-card-section class="bg-grey-2">
            <div class="text-subtitle1 text-weight-bold text-black">Instructores Asignados</div>
          </q-card-section>
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6" v-if="ep.followupInstructor">
                <q-card class="bg-blue-1" flat bordered>
                  <q-card-section>
                    <div class="text-caption text-primary text-weight-bold">Seguimiento</div>
                    <div class="text-subtitle2">{{ ep.followupInstructor.fullName }}</div>
                    <div class="text-caption">{{ ep.followupInstructor.email }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-sm-6" v-if="ep.technicalInstructor">
                <q-card class="bg-green-1" flat bordered>
                  <q-card-section>
                    <div class="text-caption text-positive text-weight-bold">Técnico</div>
                    <div class="text-subtitle2">{{ ep.technicalInstructor.fullName }}</div>
                    <div class="text-caption">{{ ep.technicalInstructor.email }}</div>
                  </q-card-section>
                </q-card>
              </div>
              <div class="col-12 col-sm-6" v-if="ep.projectInstructor">
                <q-card class="bg-purple-1" flat bordered>
                  <q-card-section>
                    <div class="text-caption text-purple text-weight-bold">Proyecto</div>
                    <div class="text-subtitle2">{{ ep.projectInstructor.fullName }}</div>
                    <div class="text-caption">{{ ep.projectInstructor.email }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>

      </div>

      <!-- Right Column (Sidebar) -->
      <div class="col-12 col-md-4">
        
        <!-- Drive Folder -->
        <q-card flat bordered class="q-mb-lg bg-yellow-1 border-yellow" v-if="ep.driveFolderUrl">
          <q-card-section class="text-center q-pa-md">
            <q-icon name="folder_shared" size="3em" color="warning" class="q-mb-sm" />
            <div class="text-subtitle1 text-weight-bold text-grey-9">Carpeta de Evidencias</div>
            <p class="text-caption text-grey-8">Sube tus bitácoras y documentos aquí.</p>
            <q-btn type="a" :href="ep.driveFolderUrl" target="_blank" color="warning" text-color="black" label="Abrir en Google Drive" icon="open_in_new" outline class="full-width" />
          </q-card-section>
        </q-card>

        <!-- KPI Progress -->
        <q-card flat bordered class="q-mb-lg" v-if="ep.status !== 'PENDING_REGISTRATION' && ep.status !== 'PENDING_APPROVAL'">
          <q-card-section class="bg-secondary text-white">
            <div class="text-subtitle1">KPIs de Progreso</div>
          </q-card-section>
          <q-card-section>
            <div class="q-mb-md">
              <div class="row justify-between q-mb-xs">
                <span class="text-caption">Bitácoras</span>
                <span class="text-caption text-weight-bold">{{ ep.completedBitacoras }} / {{ ep.maxBitacoras || '?' }}</span>
              </div>
              <q-linear-progress :value="(ep.completedBitacoras / (ep.maxBitacoras || 1))" color="primary" size="8px" class="rounded-borders" />
            </div>
            <div>
              <div class="row justify-between q-mb-xs">
                <span class="text-caption">Seguimientos</span>
                <span class="text-caption text-weight-bold">{{ ep.completedTrackings }} / {{ ep.requiredTrackings || '?' }}</span>
              </div>
              <q-linear-progress :value="(ep.completedTrackings / (ep.requiredTrackings || 1))" color="accent" size="8px" class="rounded-borders" />
            </div>
          </q-card-section>
        </q-card>

        <!-- Comments Thread -->
        <q-card flat bordered class="comments-card">
          <q-card-section class="bg-grey-3">
            <div class="text-subtitle1 text-weight-bold text-grey-9">Hilo de Comentarios</div>
          </q-card-section>
          
          <q-card-section class="scroll" style="height: 300px;">
            <q-chat-message
              v-for="(msg, idx) in ep.comments"
              :key="idx"
              :name="msg.author?.fullName || 'Usuario'"
              :text="[msg.text]"
              :sent="msg.author?._id === authStore.user?.id"
              :stamp="formatDateTime(msg.createdAt)"
              :bg-color="msg.author?._id === authStore.user?.id ? 'primary' : 'grey-4'"
              :text-color="msg.author?._id === authStore.user?.id ? 'white' : 'black'"
            />
            <div v-if="!ep.comments || ep.comments.length === 0" class="text-center text-grey q-mt-xl">
              No hay comentarios.
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section class="q-pa-sm">
            <q-form @submit="sendComment" class="row no-wrap items-center q-gutter-xs">
              <q-input v-model="newComment" outlined dense placeholder="Escribe un comentario..." class="col" :rules="[val => !!val || '']" hide-bottom-space />
              <q-btn round dense flat icon="send" color="primary" type="submit" :loading="sendingComment" :disable="!newComment.trim()" />
            </q-form>
          </q-card-section>
        </q-card>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import productiveStageService from '../../api/productiveStage.service';
import { useAuthStore } from '../../stores/auth';
import { useQuasar } from 'quasar';

const $q = useQuasar();
const authStore = useAuthStore();

const ep = ref(null);
const loading = ref(true);
const newComment = ref('');
const sendingComment = ref(false);

const modalityOptions = [
  { label: 'Contrato de Aprendizaje', value: 'APPRENTICESHIP_CONTRACT' },
  { label: 'Vínculo Laboral', value: 'LABOR_LINK' },
  { label: 'Pasantía', value: 'INTERNSHIP' },
  { label: 'Proyecto Productivo Individual', value: 'INDIVIDUAL_PRODUCTIVE_PROJECT' },
  { label: 'Proyecto Productivo Grupal', value: 'GROUP_PRODUCTIVE_PROJECT' }
];

const currentStep = computed(() => {
  if (!ep.value) return 1;
  switch (ep.value.status) {
    case 'PENDING_REGISTRATION': return 1;
    case 'PENDING_APPROVAL': return 2;
    case 'ACTIVE': 
    case 'IN_FOLLOWUP': return 3;
    case 'CERTIFICATION': return 4;
    case 'COMPLETED':
    case 'ARCHIVED': return 5;
    default: return 1;
  }
});

onMounted(() => {
  fetchMyEP();
});

async function fetchMyEP() {
  loading.value = true;
  try {
    const res = await productiveStageService.getMyEP();
    // Assuming getMyEP returns array and we want the first active or the only one
    const epList = res.data.data || res.data;
    if (Array.isArray(epList) && epList.length > 0) {
      ep.value = epList[0];
    } else if (epList && !Array.isArray(epList)) {
      ep.value = epList;
    } else {
      ep.value = null;
    }
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al cargar los datos de tu etapa productiva.' });
  } finally {
    loading.value = false;
  }
}

function getModalityLabel(val) {
  const opt = modalityOptions.find(o => o.value === val);
  return opt ? opt.label : val;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('es-CO');
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-CO', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
}

async function sendComment() {
  if (!newComment.value.trim() || !ep.value) return;
  
  sendingComment.value = true;
  try {
    await productiveStageService.addComment(ep.value._id, newComment.value);
    newComment.value = '';
    await fetchMyEP(); // Reload to get new comments populated with authors
  } catch (error) {
    console.error(error);
    $q.notify({ type: 'negative', message: 'Error al enviar comentario.' });
  } finally {
    sendingComment.value = false;
  }
}
</script>

<style scoped>
.my-ep-container {
  max-width: 1400px;
  margin: 0 auto;
}
.border-yellow {
  border-color: #ffe082;
}
.comments-card {
  display: flex;
  flex-direction: column;
}
</style>
