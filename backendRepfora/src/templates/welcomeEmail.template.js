import { env } from '../config/env.js';

const frontendUrl = env.FRONTEND_URL || 'http://localhost:5174';

export const buildWelcomeSubject = () =>
  'Está registrado en REPFORA E.P. para comenzar su etapa productiva.';

export const buildWelcomeMessage = () => `
  <p style="font-size: 15px; margin-bottom: 16px;">
    Usted ha sido registrado(a) exitosamente en la plataforma <strong>REPFORA E.P.</strong> del SENA
    para realizar el seguimiento de su etapa productiva.
  </p>

  <p style="margin-bottom: 8px;">
    <strong>1. Ingreso a la plataforma:</strong><br>
    Acceda a trav&eacute;s del siguiente enlace:
    <a href="${frontendUrl}/#/login" style="color: #39a900; font-weight: bold;">REPFORA E.P. — Iniciar Sesi&oacute;n</a>
  </p>

  <p style="margin-bottom: 8px;">
    <strong>2. Credenciales de acceso:</strong><br>
    &bull; <strong>Usuario:</strong> Su n&uacute;mero de documento de identidad.<br>
    &bull; <strong>Contrase&ntilde;a:</strong> Su n&uacute;mero de documento de identidad.<br>
    <em style="color: #c10015;">Es obligatorio cambiar la contrase&ntilde;a en su primer acceso.</em>
  </p>

  <p style="margin-bottom: 8px;">
    <strong>3. Registro de etapa productiva:</strong><br>
    En el panel principal, seleccione <strong>&ldquo;Registrar Etapa Productiva&rdquo;</strong>.
  </p>

  <p style="margin-bottom: 8px;">
    <strong>4. Documentaci&oacute;n:</strong><br>
    Elija la modalidad a realizar y adjunte los documentos en formato PDF.
  </p>

  <p style="margin-bottom: 8px;">
    <strong>5. Validaci&oacute;n:</strong><br>
    En los d&iacute;as siguientes recibir&aacute; una notificaci&oacute;n indicando si su solicitud fue
    <strong>Aceptada</strong> o <strong>Rechazada</strong>.
  </p>

  <ul style="margin: 12px 0; padding-left: 20px; color: #333;">
    <li style="margin-bottom: 4px;"><strong>Si es Aceptado:</strong> Se formalizar&aacute; el inicio de su etapa productiva y se le asignar&aacute; un instructor de seguimiento.</li>
    <li style="margin-bottom: 4px;"><strong>Si es Rechazado:</strong> Revise las observaciones del administrador y realice las correcciones para volver a enviar la solicitud.</li>
  </ul>

  <p style="color: #c10015; font-weight: bold; margin: 16px 0;">
    Si no realiza correctamente este registro, su etapa productiva no podr&aacute; ser validada.
  </p>

  <p style="margin-top: 20px;">Atentamente,<br><strong>Administrador REPFORA E.P.</strong></p>
`;
