<template>
  <div class="certification-container q-pa-md">
    <div class="row items-center q-mb-md">
      <div class="col">
        <h2 class="text-h4 text-black text-weight-bold q-my-none">Certificaci&oacute;n Final</h2>
        <p class="text-grey-7 q-my-sm">Sube tu documentaci&oacute;n en un &uacute;nico archivo PDF para la certificaci&oacute;n de tu etapa productiva.</p>
      </div>
      <div class="col-auto">
        <q-btn color="primary" icon="refresh" label="Actualizar" @click="loadData" :loading="loading" />
      </div>
    </div>

    <!-- ALERTA: Plazo pr&oacute;ximo a vencer (2 meses antes de fecha fin estimada) -->
    <q-banner v-if="showDeadlineAlert" class="bg-warning text-warning-8 q-mb-lg rounded-borders" rounded>
      <template v-slot:avatar><q-icon name="warning" size="2em" /></template>
      <div class="text-weight-bold">Tu etapa productiva est&aacute; pr&oacute;xima a finalizar</div>
      <div>
        La fecha estimada de cierre es el <strong>{{ formatDate(ep.estimatedEndDate) }}</strong>.
        Debes subir el PDF con tus documentos de certificaci&oacute;n cuanto antes para evitar retrasos.
      </div>
    </q-banner>

    <q-card flat bordered v-if="loading" class="q-pa-xl text-center">
      <q-spinner color="primary" size="3em" />
      <p class="text-grey-7 q-mt-md">Cargando estado de certificaci&oacute;n...</p>
    </q-card>

    <q-card flat bordered v-else-if="!ep || (ep.status !== 'CERTIFICATION' && ep.status !== 'COMPLETED' && ep.status !== 'ARCHIVED')" class="bg-blue-1 text-center q-pa-xl">
      <q-icon name="hourglass_empty" size="4em" color="primary" class="q-mb-md" />
      <div class="text-h6 text-primary">A&uacute;n no est&aacute;s en fase de certificaci&oacute;n</div>
      <p class="text-grey-8">Debes completar todas tus bit&aacute;coras y seguimientos antes de poder subir los documentos finales.</p>
      <q-btn color="primary" outline label="Ver mi Progreso" to="/" class="q-mt-md" />
    </q-card>

    <div v-else>
      <!-- EP completada -->
      <q-banner v-if="ep.status === 'COMPLETED' || ep.status === 'ARCHIVED'" class="bg-green-1 text-positive q-mb-lg rounded-borders" rounded>
        <template v-slot:avatar><q-icon name="emoji_events" size="2em" /></template>
        <div class="text-h6">Felicidades. Tu Etapa Productiva ha finalizado exitosamente.</div>
        <div>Todos tus documentos fueron aprobados y el proceso est&aacute; cerrado.</div>
      </q-banner>

      <template v-if="ep.status === 'CERTIFICATION'">
        <!-- Info de fechas de la EP -->
        <q-card flat bordered class="q-mb-lg">
          <q-card-section class="row items-center q-gutter-md">
            <div class="col-auto text-center">
              <q-icon name="calendar_today" color="primary" size="2em" />
            </div>
            <div class="col">
              <div class="text-weight-bold">Etapa Productiva en Fase de Certificaci&oacute;n</div>
              <div class="text-caption text-grey-7">
                Inicio: <strong>{{ formatDate(ep.startDate) }}</strong> &mdash;
                Fin estimada: <strong>{{ formatDate(ep.estimatedEndDate) }}</strong>
              </div>
            </div>
            <div class="col-auto">
              <q-chip :color="daysRemaining <= 30 ? 'negative' : 'warning'" text-color="white" size="sm">
                <template v-if="daysRemaining > 0">{{ daysRemaining }} d&iacute;as restantes</template>
                <template v-else>Plazo vencido</template>
              </q-chip>
            </div>
          </q-card-section>
        </q-card>

        <!-- Documentos requeridos -->
        <q-card flat bordered class="q-mb-lg">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold text-black q-mb-md">
              <q-icon name="checklist" color="primary" class="q-mr-sm" />
              Documentos que debe contener el archivo PDF &uacute;nico:
            </div>
            <q-list dense separator>
              <q-item v-for="(item, index) in requiredItems" :key="index" class="q-py-sm">
                <q-item-section avatar>
                  <q-icon name="radio_button_unchecked" size="xs" color="primary" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ index + 1 }}. {{ item.label }}</q-item-label>
                  <q-item-label v-if="item.note" caption class="text-warning"><q-icon name="info" size="xs" /> {{ item.note }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
            <div class="text-caption text-grey-6 q-mt-sm q-px-md">
              <q-icon name="lightbulb" size="xs" color="orange" /> Si entregas elementos adicionales o no entregas alguno, incluye una nota explicativa dentro del mismo PDF.
            </div>
          </q-card-section>
        </q-card>

        <!-- DOCUMENTO RECHAZADO - Observaciones del administrador -->
        <q-card v-if="certDoc && certDoc.status === 'REJECTED'" flat bordered class="bg-red-1 q-mb-lg">
          <q-card-section>
            <div class="text-subtitle1 text-weight-bold text-negative q-mb-sm">
              <q-icon name="cancel" /> Documento Rechazado &mdash; Debes corregir y volver a subir
            </div>
            <q-separator class="q-mb-sm" />
            <div class="text-weight-bold q-mb-xs">Observaciones del administrador:</div>
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
            <div v-else class="text-caption text-grey-7 q-mt-xs">
              Sin comentarios espec&iacute;ficos. Revisa que todos los documentos est&eacute;n completos, legibles y en el orden requerido.
            </div>
          </q-card-section>
        </q-card>

        <!-- Archivo actual (SUBMITTED) -->
        <q-banner v-else-if="certDoc && certDoc.status === 'SUBMITTED'" class="bg-info text-white q-mb-lg rounded-borders" rounded>
          <template v-slot:avatar><q-icon name="hourglass_top" /></template>
          <div class="text-weight-bold">Documento en revisi&oacute;n</div>
          <div>Tu documento <strong>{{ certDoc.fileName || 'PDF' }}</strong> fue subido y est&aacute; pendiente de revisi&oacute;n por el administrador.</div>
        </q-banner>

        <!-- Subir / Reemplazar -->
        <q-card flat bordered class="text-center q-pa-xl" v-if="!certDoc || certDoc.status !== 'APPROVED'">
          <q-icon :name="certDoc && certDoc.status === 'REJECTED' ? 'replay' : 'upload_file'" size="5em" color="primary" class="q-mb-md" />
          <div class="text-h6 text-black q-mb-sm">
            {{ certDoc && certDoc.status === 'REJECTED' ? 'Corregir y Reemplazar Archivo PDF' : certDoc ? 'Reemplazar Archivo PDF' : 'Subir Archivo PDF' }}
          </div>
          <p class="text-grey-7 q-mb-lg">
            {{ certDoc && certDoc.status === 'REJECTED'
              ? 'Revisa las observaciones del administrador, corrige tu PDF y v&uacute;lvelo a subir (m&aacute;ximo 10MB).'
              : 'Adjunta un solo archivo PDF que contenga todos los documentos listados arriba (m&aacute;ximo 10MB).' }}
          </p>

          <q-file
            v-model="uploadFile"
            label="Seleccionar Archivo PDF"
            outlined
            accept=".pdf"
            :rules="[
              val => !!val || 'Requerido',
              val => !val || val.type === 'application/pdf' || 'Solo formato PDF',
              val => !val || val.size <= 10 * 1024 * 1024 || 'M&aacute;ximo 10MB'
            ]"
            class="q-mb-md"
            style="max-width: 400px; margin: 0 auto;"
          >
            <template v-slot:prepend><q-icon name="picture_as_pdf" /></template>
          </q-file>

          <div>
            <q-btn
              color="primary"
              :icon="certDoc && certDoc.status === 'REJECTED' ? 'replay' : 'cloud_upload'"
              label="Subir"
              @click="uploadDossier"
              :loading="saving"
              :disable="!uploadFile"
              size="lg"
            />
          </div>
        </q-card>

        <!-- Aprobado -->
        <q-card v-if="certDoc && certDoc.status === 'APPROVED'" flat bordered class="text-center q-pa-xl bg-green-1">
          <q-icon name="check_circle" size="5em" color="positive" class="q-mb-md" />
          <div class="text-h6 text-positive q-mb-sm">Documento Aprobado</div>
          <p class="text-grey-8">Tu documentaci&oacute;n de certificaci&oacute;n ha sido aprobada por el administrador. Contin&uacute;a pendiente de la finalizaci&oacute;n de tu etapa.</p>
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
    $q.notify({ type: 'negative', message: 'Error al cargar el estado de certificaci\u00f3n.' });
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
      $q.notify({ type: 'positive', message: 'Documento corregido y subido exitosamente.' });
    } else {
      const fd = new FormData();
      fd.append('productiveStageId', ep.value._id);
      fd.append('documentType', 'CERTIFICATION_DOSSIER');
      fd.append('file', uploadFile.value);
      await documentService.upload(fd);
      $q.notify({ type: 'positive', message: 'Documento subido exitosamente.' });
    }
    uploadFile.value = null;
    await loadData();
  } catch (error) {
    console.error(error);
    const msg = error.response?.data?.message || 'Error al subir documento.';
    $q.notify({ type: 'negative', message: msg });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.certification-container {
  max-width: 800px;
  margin: 0 auto;
}
</style>
