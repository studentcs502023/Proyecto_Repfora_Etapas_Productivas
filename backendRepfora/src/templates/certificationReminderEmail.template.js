import { env } from '../config/env.js';

const frontendUrl = env.FRONTEND_URL || 'http://localhost:5174';

export const buildCertificationSubject = (level) => {
  switch (level) {
    case 'RED':    return 'URGENTE: Quedan 7 días o menos para subir tus documentos de certificación';
    case 'ORANGE': return 'ATENCIÓN: Quedan 15 días para subir tus documentos de certificación';
    case 'YELLOW': return 'Importante: Quedan 30 días para subir tus documentos de certificación';
    default:       return 'Subida de documentos para proceso de certificación';
  }
};

export const buildCertificationMessage = ({ fullName, daysRemaining, level, estimatedEndDate }) => {
  const endDateStr = estimatedEndDate
    ? new Date(estimatedEndDate).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  let alertStyle = 'color: #318335;';
  let alertTitle = 'RECORDATORIO';
  let urgencyText = '';

  if (level === 'RED') {
    alertStyle = 'color: #c10015;';
    alertTitle = 'ALERTA CRÍTICA';
    urgencyText = `
    <p style="color: #c10015; font-weight: bold;">
      ⚠ Su plazo está por vencer de forma inminente. Si no sube los documentos a tiempo,
      el sistema notificará automáticamente al administrador y su proceso de certificación podría retrasarse o anularse.
    </p>`;
  } else if (level === 'ORANGE') {
    alertStyle = 'color: #ff6b00;';
    alertTitle = 'ATENCIÓN IMPORTANTE';
    urgencyText = `
    <p style="color: #ff6b00; font-weight: bold;">
      ⚠ Queda poco tiempo. Asegúrese de subir los documentos requeridos para no retrasar su certificación.
    </p>`;
  } else if (level === 'YELLOW') {
    alertStyle = 'color: #f2c037;';
    alertTitle = 'RECORDATORIO';
  }

  return `
    <div style="${alertStyle} padding: 15px; border: 2px solid; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="margin: 0; text-align: center;">${alertTitle}</h3>
      ${daysRemaining > 0 ? `<p style="text-align: center; font-size: 18px; margin: 10px 0;"><strong>Tiempo restante: ${daysRemaining} día(s)</strong></p>` : ''}
    </div>

    <p>Estimado/a aprendiz <strong>${fullName}</strong>,</p>

    <p>
      Reciba un cordial saludo.
    </p>

    <p>
      Le recordamos que, con el fin de dar inicio al proceso de certificación de su formación,
      debe ingresar al sistema y <strong>subir un documento en formato PDF con todos los archivos requeridos</strong>.
      Esta documentación es obligatoria y debe ser entregada lo antes posible, para evitar retrasos en la emisión de su certificado.
    </p>

    ${endDateStr ? `<p>La <strong>fecha estimada de cierre</strong> de su etapa productiva es: <strong>${endDateStr}</strong>.</p>` : ''}

    <p><strong>El PDF debe incluir los siguientes documentos:</strong></p>
    <ul>
      <li>Paz y Salvo diligenciado y firmado tanto por el aprendiz como por el instructor de seguimiento.</li>
      <li>Fotocopia del documento de identidad (actualizado, legible y ampliado al 150%). En caso de ser extranjero, debe adjuntar el documento de identidad de su país de origen y el permiso de permanencia temporal.</li>
      <li>Certificado de inscripción o registro en la Agencia Pública de Empleo (APE).</li>
      <li>Evidencia fotográfica de la destrucción del carné estudiantil. Si no fue beneficiario de carné físico, debe adjuntar una carta firmada indicando la no entrega del mismo, incluyendo su nombre completo, documento de identidad y ficha de formación.</li>
      <li>Certificado de presentación de las pruebas TyT ante el ICFES (aplica únicamente para aprendices de nivel Tecnólogo).</li>
      <li>Certificado de culminación de etapa productiva emitido por la empresa. En caso de haber desarrollado un proyecto productivo, debe anexar el acta de cierre del proyecto con la debida aprobación.</li>
      <li>Certificado de inventario de almacén, que garantice que no tiene elementos a su cargo.</li>
    </ul>

    <p><strong>Nota adicional:</strong> Si entrega elementos adicionales o no entrega alguno, debe dejar una nota explicativa dentro del mismo archivo PDF indicando la razón.</p>

    <p><strong>Importante:</strong> Asegúrese de que todos los archivos sean legibles, estén actualizados y correctamente organizados en el documento PDF.</p>

    ${urgencyText}

    <p style="text-align: center; margin: 20px 0;">
      <a href="${frontendUrl}/#/certification" style="display: inline-block; background-color: #318335; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        SUBIR DOCUMENTOS DE CERTIFICACIÓN
      </a>
    </p>

    <p>Agradecemos su atención y compromiso con este proceso.</p>

    <p>Atentamente,<br><strong>Administrador REPFORA E.P.</strong></p>
  `;
};
