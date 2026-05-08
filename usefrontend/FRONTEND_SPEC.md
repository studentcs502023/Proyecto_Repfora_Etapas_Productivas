# FRONTEND_SPEC.md — REPFORA E.P.
> Sistema de Registro y Seguimiento de Etapa Productiva — SENA
> **Basado en la arquitectura del Backend v1.0**

---

## 1. STACK TECNOLÓGICO RECOMENDADO

- **Framework:** React 18+ (TypeScript)
- **Styling:** Vanilla CSS (CSS Modules) para máxima flexibilidad y cumplimiento de identidad visual SENA.
- **State Management:** Context API (Auth, Notifications) + TanStack Query (Data fetching/cache).
- **Routing:** React Router v6.
- **Form Handling:** React Hook Form + Zod (para validación espejo del backend).
- **Component Library:** Headless UI o Radix UI (para accesibilidad) + Iconos de Lucide React.

---

## 2. IDENTIDAD VISUAL (SENA Brand)

- **Color Primario:** `#39A900` (Verde SENA)
- **Color Secundario:** `#00324D` (Azul Oscuro SENA)
- **Acentos:** `#FF6B00` (Naranja para alertas críticas), `#F6F6F6` (Fondos).
- **Tipografía:** Montserrat o Open Sans.
- **Estilo:** Moderno, "limpio", con bordes redondeados suaves (8px) y sombras sutiles.

---

## 3. ARQUITECTURA DE CAPAS (Frontend)

```
src/
├── api/                # Axios instances y llamadas al backend (services)
├── components/         # Componentes reutilizables (Button, Modal, Table)
├── context/            # AuthContext, NotificationContext
├── hooks/              # Custom hooks (useAuth, useProductiveStage)
├── layouts/            # DashboardLayout, AuthLayout
├── pages/              # Vistas principales por módulo
├── utils/              # Formateadores de fecha, constantes (enums.js)
└── App.tsx
```

---

## 4. FLUJOS Y VISTAS POR ROL

### A. Comunes
- **Login:** Formulario de Cédula y Contraseña.
- **Primer Ingreso:** Vista obligatoria para cambiar contraseña si `firstLogin: true`.
- **Notificaciones:** Panel lateral (drawer) con lista de notificaciones y badge de conteo.
- **Perfil:** Edición de datos básicos (teléfono/correo) y cambio de contraseña voluntario.

### B. APRENDIZ (Mi Etapa Productiva)
- **Dashboard:** Tarjetas con progreso (Bitácoras X/13, Seguimientos Y/3).
- **Registro EP:** Wizard para seleccionar modalidad, empresa y fechas.
- **Detalle de la Etapa:** Línea de tiempo de progreso y **Hilo de Comunicación** para intercambiar comentarios u observaciones (ej. motivos de rechazo) directamente con el Administrador.
- **Bitácoras:** Lista con estados. Modal para subir PDF y ver comentarios de rechazo.
- **Seguimientos:** Cronograma de seguimientos programados.
- **Certificación:** Dropzone para subir los 3 documentos obligatorios cuando el estado sea `CERTIFICATION`.

### C. INSTRUCTOR (Seguimiento)
- **Dashboard:** Lista de aprendices asignados con alertas de colores (semáforo de vencimiento).
- **Revisión de Bitácoras:** Vista de bandeja de entrada con bitácoras "PENDING". Visor de PDF integrado + panel de comentarios.
- **Gestión de Seguimientos:** Calendario/Lista para programar, subir PDF firmado, marcar como "Ejecutado" y opción para **Solicitar Seguimiento Extraordinario**.
- **Novedades:** Formulario para reportar incidentes críticos con adjuntos.
- **Horas:** Reporte mensual de horas acumuladas (Bitácoras + Seguimientos).

### D. ADMIN (Control Total)
- **Gestión de Usuarios:** CRUD de Instructores y Aprendices. Importación masiva vía Excel/CSV.
- **Empresas:** Directorio de empresas y contactos principales.
- **Configuración:** Panel para editar `SystemConfig` (horas, límites, días de alerta).
- **Aprobaciones:** Bandeja de EPs registradas pendientes de validación. Modal de **asignación de instructores dinámico** (pide 1, 2 o 3 instructores dependiendo de la modalidad elegida por el aprendiz).
- **Gestión de Novedades:** Bandeja para visualizar incidentes reportados por instructores. Permite leer el PDF autogenerado, actualizar el estado (`PENDING` → `IN_PROGRESS` → `RESOLVED`) y documentar las "Acciones Tomadas".
- **Cierre de Etapa:** Vista detallada de EP para auditar que todos los requisitos estén al 100%, con botones de acción crítica: **"Completar Etapa"** y **"Archivar"**.
- **Reportes:** Dashboard estadístico y descarga de reportes PDF globales.

---

## 5. REGLAS DE UX OBLIGATORIAS

1. **Persistencia de Token:** Almacenar JWT en `localStorage` o `sessionStorage`. Logout automático si el token expira (401).
2. **Feedback Inmediato:** Skeleton screens durante la carga y Toasts (notificaciones tipo snackbar) para confirmar acciones (éxito/error).
3. **Validación Espejo:** El frontend debe validar los mismos campos que el backend (minlength, formatos, tipos) antes de enviar la request.
4. **Confirmación de Acciones:** Modales de "re-confirmación" para acciones críticas (Aprobar certificación, Marcar como pagado, Deactivar usuario).
5. **Soft-Delete UI:** Nunca mostrar opción de "Eliminar" definitivamente si el backend usa `isActive: false`. Usar "Desactivar" o "Archivar".
6. **Estado de Botones:** Deshabilitar botones mientras una petición está en curso (loading state).

---

## 6. MAPEO DE ESTADOS (UI logic)

El frontend debe reaccionar al campo `status` de `ProductiveStage`:

| Estado EP | UI Apprentice | UI Admin / Instructor |
|-----------|--------------|-----------------------|
| `PENDING_REGISTRATION` | Mostrar Form de Registro | Ver perfil básico |
| `PENDING_APPROVAL` | "Esperando aprobación..." (y ver hilo de comentarios) | Botones Aprobar (Asignación Dinámica) / Rechazar (con comentario) |
| `ACTIVE` | Permitir subir Bitácoras | Permitir Programar Seguimientos |
| `IN_FOLLOWUP` | Ver progreso detallado | Ver historial de bitácoras/seguimientos |
| `CERTIFICATION` | Habilitar subida de Docs Finales | Validar documentos y Botón "Completar Etapa" (Admin) |
| `COMPLETED` | Descargar Certificados | Solo lectura / Botón "Archivar" (Admin) |

---

## 7. INTEGRACIÓN CON GOOGLE DRIVE (Visual)

- El frontend nunca toca la API de Drive directamente.
- Usa los campos `driveFileUrl` y `driveFolderUrl` devueltos por el backend para abrir los documentos en pestañas nuevas de Google Drive.
- Si es posible, usar un `iframe` para previsualizar bitácoras y seguimientos dentro de la plataforma.

---

## 8. MANEJO DE ERRORES ESTÁNDAR

El frontend debe interpretar el formato de error del backend:
```json
{
  "success": false,
  "message": "Error de validación",
  "errors": [
    { "msg": "Correo inválido", "param": "email" }
  ]
}
```
- Mapear automáticamente los `errors` a los inputs correspondientes usando `react-hook-form`.





Otros datos importantes 



Basado en los documentos de requerimientos (SRS) y las especificaciones técnicas del proyecto REPFORA E.P., los estilos de tu frontend deben seguir una línea institucional, limpia y funcional. Dado que es un sistema para el SENA, la interfaz debe priorizar la legibilidad y la estructura.

Aquí tienes los estilos y componentes más usados definidos en la documentación:  

1. Paleta de Colores (Identidad Institucional)
Aunque el diseño es moderno, debe alinearse con la imagen del SENA. Los colores predominantes identificados son:


Verde SENA (Primario): Utilizado para botones de acción principal, encabezados de tablas y elementos de éxito (aprobación de bitácoras).  


Gris y Blanco (Fondos): El sistema debe usar fondos claros (blanco o gris muy tenue) para reducir la fatiga visual, especialmente en las vistas de historial de bitácoras.  


Naranja/Amarillo (Alertas): Reservado para estados de "Pendiente" o "En Revisión" de las evidencias.  

2. Tipografía y Textos

Fuentes Sans-Serif: Se recomienda el uso de tipografías como Roboto o Open Sans para asegurar que el contenido técnico (como los informes de seguimiento) sea fácil de leer en cualquier dispositivo.  


Jerarquía Clara: Los títulos de las secciones (ej: "Listado de Aprendices") deben estar en negrita y con un tamaño notablemente superior al cuerpo del texto para facilitar la navegación rápida.  

3. Componentes de Interfaz Frecuentes
De acuerdo con los requerimientos de interfaz (RUI), estos son los elementos visuales que más repetirás:

Tablas de Datos (Data Tables): Es el componente principal. Deben incluir paginación, filtros de búsqueda (por ficha o nombre) y filas con colores alternos para mejorar la lectura.  


Tarjetas de Estado (Cards): Ideales para el Dashboard del aprendiz, mostrando el número de la bitácora y su estado actual con un ícono representativo.  


Modales de Confirmación: Para acciones críticas como cerrar sesión, eliminar un registro o confirmar el envío de una novedad.  


Línea de Tiempo (Timeline): Para visualizar de forma vertical u horizontal el progreso de las 12 bitácoras a lo largo de los 6 meses de etapa productiva.  

4. Diseño Responsivo (Responsive Design)
El documento SRS RUI-14 especifica como obligatorio que el sistema sea adaptable:  

Desktop: Vista completa con menús laterales desplegados.


Móvil: Los menús deben colapsarse (hamburguesa) y las tablas de datos deben convertirse en listas o tarjetas verticales para que los instructores puedan revisar bitácoras desde su celular.  

Para tu desarrollo en Quasar, estos estilos encajan perfectamente con los componentes nativos (q-table, q-card, q-timeline), por lo que te será sencillo implementarlos siguiendo estas guías.





En un sistema de gestión educativa como este, el administrador no suele revisar bitácora por bitácora (esa es tarea del instructor), pero sí tiene el control de la "maquinaria" que hace que todo funcione.

Aquí te detallo las funciones y la vista que debería tener el Administrador para esta funcionalidad:

1. Funciones del Administrador en las Bitácoras
Configuración del Calendario: El administrador debería poder definir las fechas globales de inicio y fin de los periodos de bitácoras. Por ejemplo, configurar que las bitácoras se habiliten cada 15 días automáticamente.

Auditoría y Supervisión: Puede ver el estado general de todos los aprendices. No para calificar, sino para generar reportes (ej: "Ver cuántos aprendices están al día y cuántos tienen bitácoras pendientes").

Gestión de Alertas: Configurar los mensajes automáticos que el sistema envía (los correos de recordatorio que mencionamos antes).

Reasignación: Si un instructor se enferma o cambia, el administrador es quien reasigna esos aprendices a un nuevo instructor para que el flujo de bitácoras no se detenga.

2. Vistas Sugeridas para el Administrador
Dashboard de Cumplimiento: Una gráfica (puede ser de torta o barras) que muestre:

% de Bitácoras entregadas a tiempo.

% de Bitácoras pendientes de calificación por parte de los instructores.

Alertas de aprendices en riesgo de deserción (basado en bitácoras no entregadas).

Panel de Configuración de Documentos: Un lugar donde el administrador sube las plantillas oficiales de las bitácoras. Así, cuando el aprendiz vaya a subir la suya, primero puede descargar el formato oficial desde la misma plataforma.

Reportes de Excel: Un botón para descargar un reporte general de todas las etapas productivas y el avance de sus 12 bitácoras para entregarlo a coordinación.

3. ¿Por qué es clave su base de datos?
Para el administrador, la base de datos es vital porque le permite hacer consultas masivas. Por ejemplo:

"Muéstrame todos los aprendices de la ficha X que no han subido la bitácora 3 y su instructor es Y".
Sin una base de datos propia, el administrador tendría que entrar carpeta por carpeta en OneDrive, lo cual es humanamente imposible con cientos de aprendices.

Resumen de la Jerarquía en la Funcionalidad:
Administrador: Configura fechas, sube plantillas y vigila el cumplimiento global (vía reportes).

Aprendiz: Descarga la plantilla, realiza la labor y sube la evidencia (las 12 bitácoras).

Instructor: Recibe la notificación, revisa el documento, califica y deja comentarios.



¡Hola! Es un excelente proyecto. Implementar la gestión de las 12 bitácoras dentro de REPFORA E.P. no solo centralizará la información que actualmente tienen dispersa en OneDrive, sino que permitirá un seguimiento real y automatizado.

Basado en los documentos de requerimientos (SRS) y las Historias de Usuario de tu proyecto, aquí tienes la propuesta de estructura, vistas y consejos para empezar:  
+1

1. Estructura de Vistas Propuesta
Para que la funcionalidad sea fluida, deberías considerar las siguientes interfaces:

Vista del Aprendiz (Carga de Evidencias):

Dashboard de Bitácoras: Una cuadrícula o lista con 12 tarjetas (una por cada quincena). Cada tarjeta debe mostrar el estado actual: Pendiente, Cargada, En Revisión, Aprobada o Rechazada.


Formulario de Entrega: Al seleccionar una bitácora, un formulario para adjuntar el archivo (PDF/Excel) y un campo de observaciones.  

Vista del Instructor (Seguimiento e Historial):


Panel de Control de Aprendices: Una tabla con la lista de aprendices asignados. Al hacer clic en uno, se abre su historial.  
+1


Historial de Bitácoras del Aprendiz: Una línea de tiempo cronológica donde el instructor puede ver las 12 bitácoras, descargar los archivos y dejar comentarios de retroalimentación.  
+1

Vista de Notificaciones (Transversal):

Un centro de notificaciones (campana) y alertas por correo para avisar al instructor cuando un aprendiz suba una nueva evidencia y al aprendiz cuando su bitácora sea calificada.  
+1

2. Estructura de la Base de Datos
Sí, es indispensable crear una base de datos. Dado que ya mencionas que el proyecto usará MongoDB (según tu historial de desarrollo), aquí tienes una idea del esquema:

Colección Bitacoras:

id_aprendiz: Relación con el usuario.

numero_bitacora: (1 al 12).

fecha_entrega: Fecha en la que el sistema recibió el archivo.


url_archivo: Link al almacenamiento (puedes seguir usando la API de OneDrive para guardar los archivos físicos, pero registrar el link aquí).  
+1

estado: (Ej: "Entregado", "Aprobado").

comentarios: Array de objetos con la retroalimentación del instructor.

3. Idea General de Desarrollo (Lógica)
Para que el sistema sea eficiente, te sugiero este flujo:

Validación de Fechas: El sistema debe calcular automáticamente las fechas de entrega basadas en la "Fecha de Inicio de Etapa Productiva" del aprendiz. Si son 2 por mes, el sistema puede marcar como "Vencida" una bitácora si pasan 15 días sin carga.


Alertas Automáticas: Configura un "cron job" o tarea programada que revise bitácoras próximas a vencer y envíe un correo al aprendiz y al instructor 7 días antes.  
+1

Integración con OneDrive: No necesitas abandonar OneDrive por completo. Puedes usar el SDK de Microsoft Graph para que cuando el aprendiz suba el archivo a la web de REPFORA, el backend lo mueva automáticamente a una carpeta organizada en OneDrive (/Fichas/Aprendiz/Bitacoras/) y guarde solo la referencia en la base de datos.  

4. ¿Cómo empezar?
Te aconsejo seguir estos pasos en orden:

Define el Modelo de Datos: Crea el esquema en MongoDB para las bitácoras y conéctalo con tu colección de Usuarios (Aprendices/Instructores).

Crea el Backend (API): Desarrolla los "endpoints" básicos: POST /bitacoras (para subir), GET /bitacoras/:aprendizID (para el historial) y PATCH /bitacoras/:id (para que el instructor califique).

Maqueta la Vista del Aprendiz: Empieza por la subida de archivos, ya que es la entrada de datos principal.

Implementa las Notificaciones: Usa una librería como nodemailer para los correos y, si usas Vue/Quasar como en tus otros proyectos, usa sockets o notificaciones tipo Push para las alertas en tiempo real dentro de la página.