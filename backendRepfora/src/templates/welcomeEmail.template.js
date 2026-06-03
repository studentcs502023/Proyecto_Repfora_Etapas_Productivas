import { env } from '../config/env.js';

const frontendUrl = env.FRONTEND_URL || 'http://localhost:5174';

export const buildWelcomeSubject = () =>
  'Está registrado en REPFORA E.P. para comenzar su etapa productiva.';

export const buildWelcomeMessage = () => `
  <p>Cordial saludo, aprendiz.</p>
  <p>
    Por medio del presente correo me complace informarle que usted ya puede iniciar su etapa productiva.
    Para comenzar este proceso de la mejor manera posible, debe seguir los siguientes pasos:
  </p>

  <p>
    <strong>1. Ingreso a la plataforma:</strong><br>
    Ingrese a la p&aacute;gina de REPFORA E.P. a trav&eacute;s del siguiente enlace:
    <a href="${frontendUrl}/#/login" style="color: #39a900;">Acceso al sistema REPFORA E.P.</a>
  </p>

  <p>
    <strong>2. Credenciales de acceso:</strong><br>
    &bull; <strong>Usuario:</strong> Su n&uacute;mero de documento de identidad.<br>
    &bull; <strong>Contrase&ntilde;a:</strong> Su n&uacute;mero de documento de identidad.<br>
    <em style="color: #c10015;">Nota: Tenga en cuenta que es obligatorio realizar el cambio de contrase&ntilde;a en su primer acceso por seguridad.</em>
  </p>

  <p>
    <strong>3. Registro del proceso:</strong><br>
    Una vez dentro del Dashboard principal, encontrar&aacute; y deber&aacute; seleccionar la opci&oacute;n
    <strong>&ldquo;Registrar Etapa Productiva&rdquo;</strong>.
  </p>

  <p>
    <strong>4. Documentaci&oacute;n:</strong><br>
    All&iacute; deber&aacute; elegir la modalidad que va a realizar y adjuntar los documentos correspondientes en formato PDF.
  </p>

  <p>
    <strong>5. Validaci&oacute;n:</strong><br>
    Despu&eacute;s de enviar el registro, en un plazo de algunos d&iacute;as recibir&aacute; una notificaci&oacute;n indicando
    si su solicitud fue <strong>Aceptada</strong> o <strong>Rechazada</strong>.
  </p>

  <ul>
    <li><strong>Si es Aceptado:</strong> Se formalizar&aacute; el inicio de su etapa productiva y se le asignar&aacute; un instructor de seguimiento seg&uacute;n la modalidad elegida.</li>
    <li><strong>Si es Rechazado:</strong> Deber&aacute; revisar las observaciones detalladas por el administrador y realizar las correcciones respectivas lo antes posible para volver a enviar la solicitud.</li>
  </ul>

  <p style="color: #c10015;">
    <strong>Tenga en cuenta que si no realiza correctamente este registro, su etapa productiva no podr&aacute; ser validada dentro del sistema.</strong>
  </p>

  <p>Atentamente,<br><strong>Administrador REPFORA E.P.</strong></p>
`;
