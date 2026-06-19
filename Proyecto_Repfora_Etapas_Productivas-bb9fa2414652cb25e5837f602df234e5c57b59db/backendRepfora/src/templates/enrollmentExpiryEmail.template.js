import { env } from '../config/env.js';

const frontendUrl = env.FRONTEND_URL || 'http://localhost:5174';

export const buildExpirySubject = (level) => {
  switch (level) {
    case 'RED':    return 'URGENTE: Quedan 7 días o menos para registrar tu Etapa Productiva';
    case 'ORANGE': return 'ATENCIÓN: Quedan 15 días para registrar tu Etapa Productiva';
    case 'YELLOW': return 'Importante: Quedan 30 días para registrar tu Etapa Productiva';
    default:       return 'Recordatorio: Registro de Etapa Productiva';
  }
};

export const buildExpiryMessage = ({ fullName, monthsRemaining, daysRemaining, level, deadline }) => {
  const deadlineStr = deadline ? new Date(deadline).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const monthsText = monthsRemaining > 0 ? `${monthsRemaining} mes(es)` : '';
  const daysText = daysRemaining > 0 ? `${daysRemaining} día(s)` : '';
  const timeLeft = [monthsText, daysText].filter(Boolean).join(' y ');

  let alertStyle = 'color: #c10015;'; // RED default
  let alertTitle = 'ALERTA CRÍTICA';
  if (level === 'ORANGE') { alertStyle = 'color: #ff6b00;'; alertTitle = 'ATENCIÓN IMPORTANTE'; }
  if (level === 'YELLOW') { alertStyle = 'color: #f2c037;'; alertTitle = 'RECORDATORIO'; }
  if (!level) { alertStyle = 'color: #318335;'; alertTitle = 'RECORDATORIO'; }

  return `
    <div style="${alertStyle} padding: 15px; border: 2px solid; border-radius: 8px; margin-bottom: 15px;">
      <h3 style="margin: 0; text-align: center;">${alertTitle}</h3>
      ${timeLeft ? `<p style="text-align: center; font-size: 18px; margin: 10px 0;"><strong>Tiempo restante: ${timeLeft}</strong></p>` : ''}
    </div>

    <p>Estimado/a aprendiz <strong>${fullName}</strong>,</p>

    <p>
      Le recordamos que aún <strong>no ha registrado su Etapa Productiva</strong> en la plataforma REPFORA E.P.
    </p>

    ${deadlineStr ? `<p>La <strong>fecha límite</strong> para realizar este registro es: <strong>${deadlineStr}</strong>.</p>` : ''}

    <p>
      Según la normativa vigente, usted cuenta con un plazo máximo determinado desde la finalización de su etapa lectiva
      para formalizar e iniciar su etapa productiva. Si no la registra dentro de este plazo, su proceso <strong>no podrá ser validado</strong>.
    </p>

    <p style="text-align: center; margin: 20px 0;">
      <a href="${frontendUrl}/#/login" style="display: inline-block; background-color: #318335; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        INGRESAR A REPFORA E.P.
      </a>
    </p>

    <p><strong>Pasos a seguir:</strong></p>
    <ol>
      <li>Ingrese a la plataforma con su número de documento</li>
      <li>Seleccione la opción <strong>"Registrar Etapa Productiva"</strong></li>
      <li>Elija la modalidad correspondiente</li>
      <li>Adjunte los documentos requeridos en formato PDF</li>
      <li>Envíe la solicitud para validación</li>
    </ol>

    ${level === 'RED' ? `
    <p style="color: #c10015; font-weight: bold;">
      ⚠ Su plazo está por vencer de forma inminente. Si no registra su etapa productiva a tiempo,
      el sistema notificará automáticamente al administrador y su proceso podría ser anulado.
    </p>` : ''}

    <p>Atentamente,<br><strong>Administrador REPFORA E.P.</strong></p>
  `;
};
