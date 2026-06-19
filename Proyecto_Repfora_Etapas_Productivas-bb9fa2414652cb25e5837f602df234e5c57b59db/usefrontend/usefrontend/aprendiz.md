REQUERIMIENTO FUNCIONAL: RF-001 - Habilitación y Notificación de Registro al Aprendiz
1. Descripción del Requerimiento
Permitir que el Administrador habilite al Aprendiz en la plataforma REPFORA E.P. Una vez realizada esta acción, el sistema debe generar y enviar de forma automática un correo electrónico de notificación y acceso tanto al correo institucional como al correo personal registrado del aprendiz, confirmando su habilitación para iniciar la etapa productiva.

2. Criterio de Aceptación (Escenario Principal)
Contexto: El Administrador habilita al Aprendiz en la página de REPFORA E.P.

Evento: El sistema procesa la habilitación y despacha la notificación de acceso.

Resultado Esperado: Al aprendiz le llega un correo electrónico informándole que está listo para comenzar su etapa productiva, detallando las instrucciones de acceso y los pasos iniciales para el registro de su modalidad.

3. Plantilla y Estructura del Correo de Confirmación
Remitente: Sistema REPFORA E.P. (Administrador)

Asunto: Está registrado en REPFORA E.P. para comenzar su etapa productiva.

Destinatarios: Correo Personal y Correo Institucional del Aprendiz.

Cuerpo del Mensaje:

Cordial saludo, aprendiz.

Por medio del presente correo me complace informarle que usted ya puede iniciar su etapa productiva. Para comenzar este proceso de la mejor manera posible, debe seguir los siguientes pasos:

Ingreso a la plataforma: Ingrese a la página de REPFORA E.P. a través del siguiente enlace: [Link de acceso al sistema].

Credenciales de acceso: >    * Usuario: Su número de documento de identidad.

Contraseña: Su número de documento de identidad. (Nota: Tenga en cuenta que es obligatorio realizar el cambio de contraseña en su primer acceso por seguridad).

Registro del proceso: Una vez dentro del Dashboard principal, encontrará y deberá seleccionar la opción “Registrar Etapa Productiva”.

Documentación: Allí deberá elegir la modalidad que va a realizar y adjuntar los documentos correspondientes en formato PDF.

Validación: Después de enviar el registro, en un plazo de algunos días recibirá una notificación indicando si su solicitud fue Aceptada o Rechazada.

Si es Aceptado: Se formalizará el inicio de su etapa productiva y se le asignará un instructor de seguimiento según la modalidad elegida.

Si es Rechazado: Deberá revisar las observaciones detalladas por el administrador y realizar las correcciones respectivas lo antes posible para volver a enviar la solicitud.

Tenga en cuenta que si no realiza correctamente este registro, su etapa productiva no podrá ser validada dentro del sistema.

Atentamente, > Administrador REPFORA E.P.

REQUERIMIENTO FUNCIONAL: RF-002 - Autenticación y Gestión de Credenciales
1. Descripción del Requerimiento
Permitir al Aprendiz autenticarse de forma segura en la plataforma utilizando su tipo/número de documento y contraseña, garantizando el acceso controlado a su panel principal y la protección de sus datos.

2. Escenarios y Criterios de Aceptación
Escenario 1: Autenticación Exitosa

Contexto: El Aprendiz está correctamente registrado en el sistema y posee credenciales válidas.

Evento: Ingresa su número de documento y contraseña (si es por primera vez, la contraseña coincide con su documento) y hace clic en "Iniciar Sesión".

Resultado Esperado: El sistema genera una sesión válida, otorga el token de acceso y lo redirige al panel principal (Dashboard).

Campos Visibles: Campo Documento, Campo Contraseña, Botón Iniciar Sesión.

Escenario 2: Cambio de Contraseña Obligatorio en Primer Ingreso

Contexto: Es la primera vez que el Aprendiz inicia sesión en la plataforma (su contraseña actual es igual a su número de documento).

Evento: El sistema detecta el primer ingreso tras pulsar "Iniciar Sesión".

Resultado Esperado: Se despliega una ventana emergente o modal que obliga al usuario a cambiar la contraseña actual por una nueva. El sistema valida que cumpla con políticas de seguridad y que sea diferente al documento.

Campos Visibles: Ventana modal de cambio de contraseña, Campo Nueva Contraseña, Campo Confirmar Contraseña, Botón Enviar/Guardar.

Escenario 3: Recuperación de Contraseña ("Olvidé mi Contraseña")

Contexto: El Aprendiz no recuerda su contraseña de acceso.

Evento: Hace clic en el enlace/botón "Olvidé mi Contraseña".

Resultado Esperado: El sistema solicita el correo electrónico asociado, valida su existencia y envía de manera automática un enlace o código de restablecimiento de contraseña.

Campos Visibles: Enlace "Olvidé mi Contraseña", Campo Correo Electrónico, Notificación de envío.

Escenario 4: Bloqueo Temporal por Intentos Fallidos

Contexto: Un usuario intenta ingresar a una cuenta con datos erróneos consecutivamente.

Evento: El aprendiz ingresa credenciales incorrectas tres (3) veces seguidas.

Resultado Esperado: El sistema bloquea temporalmente el acceso para ese documento durante dos (2) minutos como medida de seguridad, muestra un temporizador y notifica la alerta.

Campos Visibles: Mensaje de bloqueo, Temporizador regresivo de espera.

REQUERIMIENTO FUNCIONAL: RF-003 - Registro de Modalidad de Etapa Productiva
1. Descripción del Requerimiento
Habilitar un módulo para que el Aprendiz formalice el inicio de su etapa productiva, permitiéndole seleccionar la modalidad correspondiente, registrar los datos de la empresa y cargar la documentación legal requerida en formato digital.

2. Escenarios y Criterios de Aceptación
Escenario 1: Proceso de Registro de Modalidad

Contexto: El Aprendiz se encuentra habilitado en el sistema y listo para iniciar su trámite.

Evento: Accede a la sección "Registrar Etapa Productiva" y presiona el botón de registro.

Resultado Esperado: El sistema despliega un formulario estructurado para seleccionar la modalidad, diligenciar la información de la empresa contratante y subir los documentos de soporte técnico en formato PDF. El estado inicial de la solicitud queda como "Pendiente".

Campos Visibles: Formulario de registro (Modalidad, Razón Social Empresa, NIT, etc.), Cargador de archivos PDF, Estado del trámite.

Escenario 2: Notificación de Aprobación y Asignación de Instructor

Contexto: El administrador ha revisado y aprobado el registro del aprendiz.

Evento: El sistema procesa la aprobación del administrador en el backend.

Resultado Esperado: El estado de la Etapa Productiva cambia automáticamente de “Pendiente” a “Aprobado”, se le asigna un instructor de seguimiento y se envía un correo electrónico de confirmación con los datos del instructor.

Campos Visibles: Estado actualizado en el módulo, Datos de contacto del Instructor Asignado.

Escenario 3: Control y Recordatorio de Registro Pendiente

Contexto: El aprendiz ha sido habilitado pero no ha completado el formulario de registro.

Evento: El sistema valida mensualmente el estado de los aprendices sin registrar.

Resultado Esperado: El sistema genera de manera automática una alerta por correo electrónico recordando los meses restantes de los dos años máximos disponibles por ley para realizar la etapa productiva.

Campos Visibles: Correo electrónico con advertencias de tiempos límite y pasos a seguir.

REQUERIMIENTO FUNCIONAL: RF-004 - Sistema de Alertas y Notificaciones de Cronograma
1. Descripción del Requerimiento
Asegurar que el sistema emita alertas automáticas al correo del Aprendiz sobre fechas límite críticas para la carga de bitácoras de seguimiento y entrega de documentos finales de certificación.

2. Escenarios y Criterios de Aceptación
Escenario 1: Recordatorio para Carga de Bitácoras

Contexto: El aprendiz se encuentra en su etapa productiva activa y se acerca el periodo de entrega mensual o quincenal.

Evento: El sistema detecta que el mes actual exige la entrega de una nueva bitácora de actividades.

Resultado Esperado: El sistema despacha una notificación automática vía correo electrónico con el asunto: “Recordatorio: Subir Bitácora”, instándolo a subir el documento a tiempo.

Campos Visibles: Correo electrónico de alerta con enlace directo al módulo.

Escenario 2: Notificación de Agenda de Seguimiento

Contexto: El instructor ha programado una visita o sesión de seguimiento en la plataforma.

Evento: Llega el mes/fecha programada para la evaluación del aprendiz.

Resultado Esperado: El sistema envía una notificación al aprendiz con el asunto: “Recordatorio de Seguimiento”, indicándole que su instructor realizará la correspondiente evaluación.

Campos Visibles: Correo electrónico con detalles de la programación.

REQUERIMIENTO FUNCIONAL: RF-005 - Gestión, Carga y Control de Bitácoras
1. Descripción del Requerimiento
Proporcionar al Aprendiz un módulo interactivo para descargar formatos, subir bitácoras de actividades en formato PDF y realizar el seguimiento al estado de revisión por parte de su instructor asignado.

2. Escenarios y Criterios de Aceptación
Escenario 1: Carga de la Bitácora al Sistema

Contexto: El registro de la Etapa Productiva del aprendiz se encuentra aprobado.

Evento: El aprendiz ingresa al módulo de Bitácoras, descarga la plantilla obligatoria y presiona el botón para subir la bitácora diligenciada en PDF.

Resultado Esperado: El archivo se almacena en el sistema y el estado de la bitácora cambia automáticamente a "En Revisión", quedando disponible para el instructor.

Campos Visibles: Módulo de bitácoras, Botón de descarga de plantilla, Botón de carga de archivo PDF, Indicador de estado ("En Revisión").

Escenario 2: Notificación y Gestión de Bitácora Rechazada

Contexto: El instructor identifica inconsistencias o errores en la bitácora cargada y decide rechazarla.

Evento: El instructor cambia el estado a "Rechazado" y agrega comentarios de retroalimentación.

Resultado Esperado: El sistema envía una alerta inmediata al Dashboard y al correo electrónico del aprendiz. El aprendiz contará con un plazo estricto de cinco (5) días hábiles para corregir el documento y volverlo a subir.

Campos Visibles: Estado "Rechazado", Comentarios de corrección del instructor, Notificaciones en dashboard/correo.

Escenario 3: Bitácora Aceptada y Respaldo Seguro

Contexto: El instructor valida que la bitácora cumple con todos los requisitos técnicos y de contenido.

Evento: El instructor marca la bitácora como "Aprobada/Aceptada".

Resultado Esperado: El sistema cambia el estado en la interfaz a "Aprobado", bloquea el archivo para evitar cualquier tipo de modificación y lo respalda de forma automatizada en el almacenamiento seguro de la institución (OneDrive/Cloud).

Campos Visibles: Estado "Aprobado" (archivo bloqueado para edición).

Escenario 4: Alerta Crítica por Incumplimiento de Entrega

Contexto: El aprendiz ha dejado de subir sus reportes periódicos durante un largo periodo.

Evento: El sistema detecta una inactividad o falta de entrega de bitácoras durante tres (3) meses consecutivos.

Resultado Esperado: El sistema genera de forma automática una alerta crítica dirigida al Administrador para iniciar el proceso de anulación de la etapa productiva por deserción/incumplimiento.

Campos Visibles: Panel de alertas del administrador.

REQUERIMIENTO FUNCIONAL: RF-006 - Carga de Documentación para Certificación Final
1. Descripción del Requerimiento
Habilitar un módulo final que permita al Aprendiz consolidar y subir en un formato único digital todos los documentos requeridos para tramitar y obtener su certificación formal.

2. Escenarios y Criterios de Aceptación
Escenario 1: Carga Exitosa de Documentos de Certificación

Contexto: El aprendiz ha culminado satisfactoriamente sus horas y bitácoras de la etapa productiva.

Evento: El usuario ingresa a la sección de "Certificaciones" y sube un único archivo digital consolidado en formato PDF (que incluye el Paz y Salvo, Documento de Identidad, Certificado APE, etc.).

Resultado Esperado: El sistema recibe el archivo correctamente, bloquea nuevos envíos y actualiza el estado del trámite a "En Revisión por Administración" para que el personal encargado valide la documentación.

Campos Visibles: Sección Certificaciones, Cargador de archivos PDF unificado, Indicador de estado de revisión.




REQUISITOS Y FLUJO DE CERTIFICACIÓN - REPORA (RF-007)

======================================================================
REQUISITO FUNCIONAL: RF-007
ROL: Como aprendiz
NECESIDAD: Necesito ver el estado actual de proceso de certificación, junto con detalles específicos según cada estado.
FINALIDAD: Con la finalidad de conocer en tiempo real el avance de mi certificación y acciones requeridas en caso de observaciones.
======================================================================

----------------------------------------------------------------------
ESTADO 1: Estado "Activo"
----------------------------------------------------------------------
Descripción / Contexto:
El aprendiz aún no ha comenzado el proceso de certificación. Falta cargar los documentos requeridos.

Disparador (Trigger):
Cuando el Aprendiz accede a la sección "Modalidad" y dentro de modalidad entra a "Certificación".

Comportamiento del Sistema / Interfaz:
- El sistema muestra un espacio vacío para cargar los archivos en formato PDF, los cuales contienen todos los documentos que el aprendiz necesita para su certificación.
- Al lado de esta sección se encuentra un espacio de certificación, donde se indica el estado del proceso: "Activo".
- Bajo observaciones (en este caso, el aprendiz podrá visualizar las observaciones realizadas sobre el archivo).
- Cuando el aprendiz cargue el documento, el estado deberá cambiar automáticamente a “Trámite”.


----------------------------------------------------------------------
ESTADO 2: Estado "Validación"
----------------------------------------------------------------------
Descripción / Contexto:
Cuando el aprendiz suba por primera vez el archivo en formato PDF, el administrador deberá verificar que estén todos los documentos requeridos para la certificación.

Disparador (Trigger):
Cuando el Aprendiz accede a la sección "Modalidad" y dentro de modalidad entra a "Certificación".

Comportamiento del Sistema / Interfaz:
Cuando el administrador haya validado los documentos, el estado de certificación cambiará a “En proceso”, lo que permitirá avanzar al siguiente paso: procesar la certificación.


----------------------------------------------------------------------
ESTADO 3: Estado "Proceso"
----------------------------------------------------------------------
Descripción / Contexto:
La certificación está en proceso.

Disparador (Trigger):
Cuando el Aprendiz accede a la sección "Modalidad" y dentro de modalidad entra a "Certificación".

Comportamiento del Sistema / Interfaz:
Cuando la certificación haya sido procesada por parte de la administración, el sistema deberá cambiar el estado de certificación a “Finalizado”, indicando que el proceso ha concluido exitosamente.


----------------------------------------------------------------------
ESTADO 4: Estado "Finalizado"
----------------------------------------------------------------------
Descripción / Contexto:
Cuando la verificación esté lista, el aprendiz podrá visualizar en el sistema si su certificación fue aprobada y, en ese caso, descargar o consultar su certificado.

Disparador (Trigger):
Cuando el Aprendiz accede a la sección "Modalidad" y dentro de modalidad entra a "Certificación".

Comportamiento del Sistema / Interfaz:
- Cuando el estado de la certificación esté en “Finalizado”, el aprendiz podrá obtener su certificado e ingresar a SOFIA Plus para descargarlo.
- El proceso habrá terminado, y en la plataforma se mostrará un mensaje de confirmación indicando que: "Su certificado está listo. Puede descargarlo en SOFIA Plus."