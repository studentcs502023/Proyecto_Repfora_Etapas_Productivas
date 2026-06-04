import { env } from '../config/env.js';

const frontendUrl = env.FRONTEND_URL || 'http://localhost:5174';

export const buildBitacoraSubject = () =>
  'Recordatorio: Subir Bitácora';

export const buildBitacoraMessage = ({ fullName, nextBitacoraNumber, nextDueDate, daysUntilDue }) => {
  const dueDateStr = new Date(nextDueDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const urgencyStyle = daysUntilDue <= 2 ? 'color: #c10015; border-color: #c10015;' : 'color: #318335; border-color: #318335;';

  return `
    <div style="${urgencyStyle} padding: 15px; border: 2px solid; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="margin: 0; text-align: center;">RECORDATORIO DE BITÁCORA</h3>
      <p style="text-align: center; font-size: 16px; margin: 10px 0;">
        ${daysUntilDue <= 1 ? '<strong>Fecha límite: HOY</strong>' : `<strong>Fecha de entrega: ${dueDateStr} (en ${daysUntilDue} días)</strong>`}
      </p>
    </div>

    <p>Estimado/a aprendiz <strong>${fullName}</strong>,</p>

    <p>
      Le recordamos que debe entregar su <strong>Bitácora #${nextBitacoraNumber}</strong> correspondiente
      al periodo de etapa productiva en curso.
    </p>

    <p>La fecha programada de entrega es: <strong>${dueDateStr}</strong>.</p>

    <p>
      Recuerde descargar la plantilla oficial, diligenciar sus actividades y subir el documento
      en formato PDF a través de la plataforma.
    </p>

    <p style="text-align: center; margin: 20px 0;">
      <a href="${frontendUrl}/#/bitacoras" style="display: inline-block; background-color: #318335; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        IR A MIS BITÁCORAS
      </a>
    </p>

    ${daysUntilDue <= 1 ? `
    <p style="color: #c10015; font-weight: bold;">
      ⚠ La fecha de entrega es hoy. Si no sube su bitácora a tiempo, el instructor y el administrador serán notificados.
    </p>` : ''}

    <p>Atentamente,<br><strong>Sistema REPFORA E.P.</strong></p>
  `;
};

export const buildBitacoraOverdueSubject = () =>
  'Bitácora pendiente de entrega';

export const buildBitacoraOverdueMessage = ({ fullName, expectedBitacoras, completedBitacoras, daysOverdue }) => {
  const missing = expectedBitacoras - completedBitacoras;

  return `
    <div style="color: #c10015; padding: 15px; border: 2px solid #c10015; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="margin: 0; text-align: center;">BITÁCORA(S) PENDIENTE(S)</h3>
      <p style="text-align: center; font-size: 16px; margin: 10px 0;">
        <strong>${missing} bitácora(s) sin entregar | ${daysOverdue} día(s) de retraso</strong>
      </p>
    </div>

    <p>Estimado/a aprendiz <strong>${fullName}</strong>,</p>

    <p>
      El sistema ha detectado que tiene <strong>${missing} bitácora(s) pendiente(s)</strong> de entrega
      según el cronograma establecido (una cada 14 días).
    </p>
    <p>
      Entregas realizadas: <strong>${completedBitacoras}</strong> de <strong>${expectedBitacoras}</strong> esperadas.
    </p>

    <p>
      Por favor ingrese a la plataforma lo antes posible para ponerse al día con sus entregas.
      Recuerde que el incumplimiento prolongado puede generar una alerta crítica al administrador.
    </p>

    <p style="text-align: center; margin: 20px 0;">
      <a href="${frontendUrl}/#/bitacoras" style="display: inline-block; background-color: #318335; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        IR A MIS BITÁCORAS
      </a>
    </p>

    <p>Atentamente,<br><strong>Sistema REPFORA E.P.</strong></p>
  `;
};

export const buildTrackingSubject = () =>
  'Recordatorio de Seguimiento';

export const buildTrackingMessage = ({ fullName, trackingType, scheduledDate, instructorName, daysUntilTracking }) => {
  const dateStr = new Date(scheduledDate).toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const typeLabels = { IN_PERSON: 'Presencial', VIRTUAL: 'Virtual', EXTRAORDINARY: 'Extraordinario' };

  return `
    <div style="color: #00324d; padding: 15px; border: 2px solid #00324d; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="margin: 0; text-align: center;">RECORDATORIO DE SEGUIMIENTO</h3>
      <p style="text-align: center; font-size: 16px; margin: 10px 0;">
        <strong>${dateStr} (en ${daysUntilTracking} día(s))</strong>
      </p>
    </div>

    <p>Estimado/a aprendiz <strong>${fullName}</strong>,</p>

    <p>
      Le informamos que tiene programada una sesión de seguimiento de etapa productiva:
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Fecha:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${dateStr}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Tipo:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${typeLabels[trackingType] || trackingType}</td></tr>
      ${instructorName ? `<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Instructor:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${instructorName}</td></tr>` : ''}
    </table>

    <p>
      Asegúrese de estar disponible en la fecha programada. Si tiene algún inconveniente,
      comuníquese con su instructor a través de la plataforma.
    </p>

    <p style="text-align: center; margin: 20px 0;">
      <a href="${frontendUrl}/#/trackings" style="display: inline-block; background-color: #318335; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        IR A MIS SEGUIMIENTOS
      </a>
    </p>

    <p>Atentamente,<br><strong>Sistema REPFORA E.P.</strong></p>
  `;
};
