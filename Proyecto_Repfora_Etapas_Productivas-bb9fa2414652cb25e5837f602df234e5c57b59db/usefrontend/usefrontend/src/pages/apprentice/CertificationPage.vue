<template>
  <div class="certification-container q-pa-md">
    <!-- Premium Header -->
    <div class="page-header q-mb-xl row items-center justify-between shadow-4">
      <div class="cover-overlay"></div>
      <div class="header-content col-12 col-md-auto q-mb-sm-md text-white">
        <h2 class="text-h3 text-weight-bolder q-my-none shadow-text">
          <q-icon name="workspace_premium" class="q-mr-sm" size="md"/>Certificaci&oacute;n Final
        </h2>
        <p class="text-subtitle1 opacity-80 q-mt-xs q-mb-none">Sube tu documentaci&oacute;n en un &uacute;nico archivo PDF para la certificaci&oacute;n de tu etapa productiva.</p>
      </div>
    </div>

    <!-- ALERTA: Plazo pr&oacute;ximo a vencer -->
    <q-banner v-if="showDeadlineAlert" class="bg-warning text-dark q-mb-lg shadow-2" style="border-radius:16px" rounded>
      <template v-slot:avatar><q-icon name="warning" size="2em" color="dark" /></template>
      <div class="text-weight-bold text-subtitle1">Tu etapa productiva est&aacute; pr&oacute;xima a finalizar</div>
      <div class="q-mt-xs">La fecha estimada de cierre es el <strong>{{ formatDate(ep.estimatedEndDate) }}</strong>. Debes subir el PDF con tus documentos cuanto antes.</div>
    </q-banner>

    <!-- Loading -->
    <q-card v-if="loading" class="my-card no-shadow q-pa-xl text-center">
      <q-spinner color="primary" size="4em" />
      <p class="text-h6 text-primary text-weight-medium q-mt-md">Cargando estado de certificaci&oacute;n...</p>
    </q-card>

    <!-- Sin acceso -->
    <q-card v-else-if="!ep || (ep.status !== 'CERTIFICATION' && ep.status !== 'COMPLETED' && ep.status !== 'ARCHIVED')" class="my-card no-shadow text-center q-pa-xl">
      <q-icon name="hourglass_empty" size="6em" color="primary" class="q-mb-lg" style="opacity:0.5" />
      <div class="text-h5 text-primary text-weight-bold">&Aacute;un no est&aacute;s en fase de certificaci&oacute;n</div>
      <p class="text-grey-7 q-mt-sm">Debes completar todas tus bit&aacute;coras y seguimientos antes de poder subir los documentos finales.</p>
      <q-btn color="primary" icon="home" label="Ver mi Progreso" to="/" class="q-mt-md header-btn text-weight-bold shadow-2" rounded />
    </q-card>

    <div v-else>
      <!-- EP completada -->
      <q-card v-if="ep.status === 'COMPLETED' || ep.status === 'ARCHIVED'" class="my-card no-shadow bg-green-1 q-mb-xl text-center q-pa-xl">
        <q-icon name="emoji_events" size="6em" color="positive" class="q-mb-md" />
        <div class="text-h4 text-positive text-weight-bolder">&#127881; &#161;Felicidades!</div>
        <div class="text-h6 text-grey-8 q-mt-sm">Tu Etapa Productiva ha finalizado exitosamente.</div>
        <p class="text-grey-7 q-mt-xs">Todos tus documentos fueron aprobados y el proceso est&aacute; cerrado.</p>
      </q-card>

      <template v-if="ep.status === 'CERTIFICATION'">
        <!-- Info de fechas -->
        <q-card class="my-card no-shadow q-mb-lg">
          <q-card-section class="row items-center q-pa-lg q-gutter-md">
            <q-icon name="calendar_today" color="primary" size="xl" />
            <div class="col">
              <div class="text-h6 text-weight-bold text-primary">Etapa Productiva en Fase de Certificaci&oacute;n</div>
              <div class="text-caption text-grey-7 q-mt-xs">
                Inicio: <strong>{{ formatDate(ep.startDate) }}</strong> &mdash;
                Fin estimada: <strong>{{ formatDate(ep.estimatedEndDate) }}</strong>
              </div>
            </div>
            <q-chip :color="daysRemaining <= 30 ? 'negative' : 'warning'" text-color="white" class="text-weight-bold shadow-2" size="md">
              <template v-if="daysRemaining > 0">{{ daysRemaining }} d&iacute;as restantes</template>
              <template v-else>&#9888; Plazo vencido</template>
            </q-chip>
          </q-card-section>
        </q-card>

        <!-- Documentos requeridos -->
        <q-card class="my-card no-shadow q-mb-lg">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold text-primary q-mb-lg flex items-center">
              <q-icon name="checklist" class="q-mr-sm" size="md"/>Documentos requeridos en el PDF &uacute;nico:
            </div>
            <q-list class="bg-grey-1 rounded-borders">
              <q-item v-for="(item, index) in requiredItems" :key="index" class="q-py-md doc-item">
                <q-item-section avatar>
                  <q-avatar color="primary" text-color="white" size="sm" class="text-weight-bold">{{ index + 1 }}</q-avatar>
                </q-item-section>
                <q-item-section>
                  <q-item-label class="text-weight-medium">{{ item.label }}</q-item-label>
                  <q-item-label v-if="item.note" caption class="text-warning text-weight-bold q-mt-xs">
                    <q-icon name="info" size="xs" class="q-mr-xs"/>{{ item.note }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <div class="text-caption text-grey-6 q-mt-md flex items-center">
              <q-icon name="lightbulb" size="sm" color="orange" class="q-mr-xs"/>Si entregas elementos adicionales o no entregas alguno, incluye una nota explicativa dentro del mismo PDF.
            </div>
          </q-card-section>
        </q-card>

        <!-- DOCUMENTO RECHAZADO -->
        <q-card v-if="certDoc && certDoc.status === 'REJECTED'" class="my-card no-shadow bg-red-1 border-red q-mb-lg">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold text-negative q-mb-md flex items-center">
              <q-icon name="cancel" class="q-mr-sm" size="md"/>Documento Rechazado &mdash; Debes corregir y volver a subir
            </div>
            <q-separator class="q-mb-md opacity-30" />
            <div class="text-weight-bold text-grey-8 q-mb-sm">Observaciones del administrador:</div>
            <div v-if="certDoc.comments && certDoc.comments.length > 0">
              <q-chat-message
                v-for="(comment, idx) in certDoc.comments"
                :key="idx"
                :text="[comment.text]"
                :sent="false"
                :name="comment.author?.fullName || 'Administrador'"
                :stamp="formatDateTime(comment.createdAt)"
                bg-color="red-2"
                size="sm"
              />
            </div>
            <div v-else class="text-caption text-grey-7">
              Sin comentarios espec&iacute;ficos. Revisa que todos los documentos est&eacute;n completos, legibles y en el orden requerido.
            </div>
          </q-card-section>
        </q-card>

        <!-- En revisión -->
        <q-card v-else-if="certDoc && certDoc.status === 'SUBMITTED'" class="my-card no-shadow bg-blue-1 q-mb-lg">
          <q-card-section class="row items-center q-pa-lg q-gutter-md">
            <q-icon name="hourglass_top" color="info" size="xl" />
            <div>
              <div class="text-h6 text-weight-bold text-info">Documento en revisi&oacute;n</div>
              <div class="text-grey-8 q-mt-xs">Tu documento <strong>{{ certDoc.fileName || 'PDF' }}</strong> fue subido y est&aacute; pendiente de revisi&oacute;n por el administrador.</div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Subir / Reemplazar -->
        <q-card class="my-card no-shadow text-center q-pa-xl upload-card" v-if="!certDoc || certDoc.status !== 'APPROVED'">
          <q-icon :name="certDoc && certDoc.status === 'REJECTED' ? 'replay' : 'upload_file'" size="6em" color="primary" class="q-mb-md upload-icon" />
          <div class="text-h5 text-weight-bold text-primary q-mb-sm">
            {{ certDoc && certDoc.status === 'REJECTED' ? 'Corregir y Reemplazar Archivo PDF' : certDoc ? 'Reemplazar Archivo PDF' : 'Subir Archivo PDF' }}
          </div>
          <p class="text-grey-7 q-mb-xl text-subtitle1">
            {{ certDoc && certDoc.status === 'REJECTED'
              ? 'Revisa las observaciones, corrige tu PDF y v&uacute;lvelo a subir (m&aacute;ximo 10MB).'
              : 'Adjunta un solo archivo PDF que contenga todos los documentos listados arriba (m&aacute;ximo 10MB).' }}
          </p>

          <q-file
            v-model="uploadFile"
            label="Seleccionar Archivo PDF"
            outlined
            color="primary"
            accept=".pdf"
            class="glass-input q-mb-lg"
            style="max-width: 420px; margin: 0 auto;"
            :rules="[
              val => !!val || 'Requerido',
              val => !val || val.type === 'application/pdf' || 'Solo formato PDF',
              val => !val || val.size <= 10 * 1024 * 1024 || 'M&aacute;ximo 10MB'
            ]"
          >
            <template v-slot:prepend><q-icon name="picture_as_pdf" color="negative" /></template>
          </q-file>

          <q-btn
            color="primary"
            :icon="certDoc && certDoc.status === 'REJECTED' ? 'replay' : 'cloud_upload'"
            label="Enviar Documento"
            @click="uploadDossier"
            :loading="saving"
            :disable="!uploadFile"
            size="lg"
            rounded
            class="header-btn text-weight-bold shadow-4 q-px-xl"
          />
        </q-card>

        <!-- Aprobado -->
        <q-card v-if="certDoc && certDoc.status === 'APPROVED'" class="my-card no-shadow text-center q-pa-xl bg-green-1">
          <q-icon name="check_circle" size="6em" color="positive" class="q-mb-md" />
          <div class="text-h5 text-positive text-weight-bolder">Documento Aprobado &#10003;</div>
          <p class="text-grey-7 q-mt-sm text-subtitle1">Tu documentaci&oacute;n de certificaci&oacute;n ha sido aprobada por el administrador. Contin&uacute;a pendiente de la finalizaci&oacute;n de tu etapa.</p>
        </q-card>
      </template>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import documentService from '../../api/document.service';
import productiveStageService from '../../api/productiveStage.service';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const ep = ref(null);
const certDoc = ref(null);
const loading = ref(true);
const saving = ref(false);
const uploadFile = ref(null);

const requiredItems = [
  { label: 'Paz y Salvo diligenciado y firmado por el aprendiz e instructor de seguimiento.', note: null },
  { label: 'Fotocopia del documento de identidad actualizado y legible al 150%. Extranjeros: documento del pa\u00eds de origen y permiso de permanencia temporal.', note: null },
  { label: 'Certificado de inscripci\u00f3n o registro en la Agencia P\u00fablica de Empleo (APE).', note: null },
  { label: 'Evidencia fotogr\u00e1fica de la destrucci\u00f3n del carnet estudiantil. Si no fue beneficiario, carta explicando la No entrega.', note: null },
  { label: 'Certificado de la presentaci\u00f3n de pruebas TyT ante el ICFES.', note: 'Aplica SOLO para Tecn\u00f3logos' },
  { label: 'Certificado de culminaci\u00f3n de etapa productiva emitido por la empresa. Proyecto productivo: acta de cierre aprobada.', note: null },
  { label: 'Certificado de inventarios de almac\u00e9n, garantizando que no tiene elementos a su cargo.', note: null }
];

const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

const daysRemaining = computed(() => {
  if (!ep.value || !ep.value.estimatedEndDate) return 0;
  const now = new Date();
  const end = new Date(ep.value.estimatedEndDate);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
});

const showDeadlineAlert = computed(() => {
  if (!ep.value || ep.value.status !== 'CERTIFICATION') return false;
  if (certDoc.value && certDoc.value.status === 'APPROVED') return false;
  if (!ep.value.estimatedEndDate) return false;
  const end = new Date(ep.value.estimatedEndDate);
  const now = new Date();
  return end.getTime() - now.getTime() <= TWO_MONTHS_MS;
});

onMounted(() => {
  loadData();
});

function formatDate(dateStr) {
  if (!dateStr) return 'N/D';
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-CO', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

async function loadData() {
  loading.value = true;
  try {
    const epRes = await productiveStageService.getMyEP();
    const epList = epRes.data?.eps || [];
    ep.value = epList.length > 0 ? epList[0] : null;

    if (ep.value && ep.value._id) {
      const statusRes = await documentService.getEPStatus(ep.value._id);
      const statusData = statusRes.data;
      if (statusData && statusData.submitted) {
        certDoc.value = statusData.submitted.find(d => d.documentType === 'CERTIFICATION_DOSSIER') || null;
        if (!certDoc.value && statusData.submitted.length > 0) {
          certDoc.value = statusData.submitted[0];
        }
      }
    }
  } catch (error) {
    console.error(error);
    $q.notify({ position: 'top', timeout: 5000, type: 'negative', message: 'Error al cargar el estado de certificaci\u00f3n.' });
  } finally {
    loading.value = false;
  }
}

async function uploadDossier() {
  if (!uploadFile.value) return;
  saving.value = true;
  try {
    if (certDoc.value && certDoc.value.status === 'REJECTED') {
      const fd = new FormData();
      fd.append('file', uploadFile.value);
      await documentService.resubmit(certDoc.value.id, fd);
      $q.notify({ position: 'top', timeout: 5000, type: 'positive', message: 'Documento corregido y subido exitosamente.' });
    } else {
      const fd = new FormData();
      fd.append('productiveStageId', ep.value._id);
      fd.append('documentType', 'CERTIFICATION_DOSSIER');
      fd.append('file', uploadFile.value);
      await documentService.upload(fd);
      $q.notify({ position: 'top', timeout: 5000, type: 'positive', message: 'Documento subido exitosamente.' });
    }
    uploadFile.value = null;
    await loadData();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al subir documento.';
    $q.notify({ position: 'top', timeout: 5000, type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.certification-container {
  max-width: 900px;
  margin: 0 auto;
  font-family: 'Outfit', sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Premium Header */
.page-header {
  background: linear-gradient(135deg, #318335 0%, #43A047 100%);
  border-radius: 20px;
  padding: 30px;
  position: relative;
  overflow: hidden;
}
.cover-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0);
  background-size: 20px 20px;
  pointer-events: none;
}
.shadow-text { text-shadow: 2px 2px 8px rgba(0,0,0,0.4); }
.opacity-80 { opacity: 0.8; }
.opacity-30 { opacity: 0.3; }

/* Glassmorphism Cards */
.my-card {
  border-radius: 20px;
  background: rgba(255,255,255,0.98);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 40px rgba(0,0,0,0.06) !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.border-red { border-left: 4px solid var(--q-negative) !important; }

/* List Items */
.doc-item {
  border-radius: 12px;
  transition: background 0.2s ease;
}
.doc-item:hover { background: #f8fcfb; }

/* Upload Section */
.upload-card { border: 2px dashed rgba(0,0,0,0.08); }
.upload-icon { opacity: 0.7; transition: all 0.3s ease; }
.upload-card:hover .upload-icon { opacity: 1; transform: scale(1.05); }

/* File input */
.glass-input :deep(.q-field__control) {
  border-radius: 12px;
  background: #f8fcfb;
  transition: all 0.3s ease;
}
.glass-input:focus-within :deep(.q-field__control) {
  background: #fff;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
}

/* Buttons */
.header-btn { transition: all 0.3s ease; }
.header-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.2) !important; }
</style>
