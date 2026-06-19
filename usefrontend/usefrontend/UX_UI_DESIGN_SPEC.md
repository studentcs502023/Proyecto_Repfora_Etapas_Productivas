# UX_UI_DESIGN_SPEC.md — REPFORA E.P.
> Sistema de Registro y Seguimiento de Etapa Productiva — SENA
> **Guía de Experiencia de Usuario e Interfaz Visual**

---

## 1. ESTRATEGIA UX (User Experience)

### Objetivos de Experiencia
1. **Reducción de Fricción:** Minimizar los clics necesarios para subir bitácoras o aprobar seguimientos.
2. **Claridad de Estado:** El usuario debe saber en qué punto de su Etapa Productiva (EP) se encuentra en menos de 3 segundos.
3. **Confianza y Legalidad:** Estética profesional que refleje el carácter oficial de los documentos del SENA.
4. **Accesibilidad:** Cumplimiento de normas WCAG 2.1 (contraste alto, navegación por teclado).

### User Personas
| Rol | Necesidad Principal | Frustración Común |
|-----|---------------------|-------------------|
| **Aprendiz** | Subir bitácoras rápido y saber si fueron aprobadas. | No saber por qué rechazaron un documento o cuándo vence su plazo. |
| **Instructor** | Calificar masivamente y controlar sus horas mensuales. | Perder rastro de qué aprendiz tiene seguimientos pendientes. |
| **Admin** | Tener una visión global de la operación y configurar el sistema. | Datos desactualizados o procesos de certificación manuales lentos. |

---

## 2. ARQUITECTURA DE INFORMACIÓN

### Sitemap de Navegación
- **Dashboard (Home):** Vista resumida según el rol.
- **Módulo EP:**
    - Listado de Aprendices (Instructor/Admin).
    - Registro de Mi Etapa (Aprendiz).
    - Detalle de la Etapa (Línea de tiempo de progreso).
- **Gestión Documental:** Carpeta virtual de Bitácoras y Documentos de Certificación.
- **Seguimientos:** Calendario de citas y tabla de ejecución.
- **Reportes:** Dashboard de gráficas (Admin) y Reporte de Horas (Instructor).
- **Configuración:** Parámetros del sistema (Admin).

---

## 3. DISEÑO DE INTERFAZ (UI) - SISTEMA DE DISEÑO

### Paleta de Colores (Institucional SENA)
- **Primarios:**
    - `Verde SENA (#39A900)`: Botones de acción positiva, bordes de elementos activos, estados de éxito.
    - `Azul SENA (#00324D)`: Barras de navegación, encabezados de tablas, textos de importancia.
- **Semánticos (Estados):**
    - `Pendiente (#FFD200)`: Amarillo para revisiones pendientes.
    - `Rechazado/Alerta (#E30613)`: Rojo para errores, rechazos o vencimientos críticos.
    - `Informativo (#0072B2)`: Azul para estados neutros como "En Revisión".
- **Neutros:**
    - `Fondo (#F4F7F5)`: Gris muy claro verdoso.
    - `Card/Papel (#FFFFFF)`: Blanco puro.
    - `Bordes (#D1D5DB)`: Gris suave.

### Tipografía
- **Fuente Principal:** `Montserrat` (Sans-Serif).
- **Escala:**
    - `H1 (24px, Bold)`: Títulos de página.
    - `H2 (20px, SemiBold)`: Títulos de secciones.
    - `Body (16px, Regular)`: Textos generales.
    - `Small (14px, Medium)`: Etiquetas, placeholders, fechas.

### Iconografía
- Estilo: **Lucide React** (Líneas finas, 2px de grosor).
- `Bell`: Notificaciones.
- `FileText`: Bitácoras/Documentos.
- `Calendar`: Seguimientos.
- `User`: Perfil.
- `TrendingUp`: Reportes.

---

## 4. COMPONENTES CLAVE Y COMPORTAMIENTO

### A. El "Progress Tracker" (Línea de Tiempo)
Ubicado en la parte superior del detalle de la EP.
- Círculos numerados que cambian de color según el estado:
    - Gris: No alcanzado.
    - Verde: Completado.
    - Azul con pulso: Estado actual.

### B. Tabla de Gestión Dinámica
- **Filtros rápidos:** Pills (pastillas) en la parte superior para filtrar por estado (Ej: "Solo Pendientes").
- **Acciones:** Menú de tres puntos `...` al final de la fila o botones de icono directo (`Check` / `X`).
- **Avatar:** Miniatura de nombre para instructores y aprendices para humanizar la interfaz.

### C. Dropzone de Archivos
- Área con borde punteado verde.
- Icono de nube con flecha.
- Texto claro: "Arrastre su PDF aquí o haga clic (Max 10MB)".
- Barra de progreso real durante la subida al backend/Drive.

### D. Badges de Estado (Etiquetas)
- Texto en mayúsculas, fondo semi-transparente del color semántico.
- Ejemplo: `[ APROBADO ]` (Verde), `[ PENDIENTE ]` (Amarillo).

---

## 5. DISEÑO DE INTERACCIONES (Micro-interacciones)

1. **Hover en Botones:** Elevación sutil (`box-shadow`) y cambio de opacidad al 90%.
2. **Transiciones de Página:** Fade-in suave (200ms) para evitar cambios bruscos de pantalla.
3. **Empty States:** Cuando no hay datos (ej. "No hay bitácoras"), mostrar una ilustración sutil en gris con un botón de "Subir mi primera bitácora".
4. **Validación en Tiempo Real:** Los campos se ponen rojos con un mensaje debajo inmediatamente si el formato es incorrecto (ej. correo sin @).

---

## 6. RESPONSIVIDAD (Mobile vs Desktop)

- **Desktop (1280px+):** Sidebar lateral fijo a la izquierda. Tablas completas con todas las columnas.
- **Tablet (768px - 1024px):** Sidebar se colapsa a iconos.
- **Mobile (Hasta 767px):**
    - Sidebar se convierte en menú hamburguesa.
    - Tablas se transforman en "Cards" apiladas.
    - Acciones principales (Subir bitácora) se convierten en un Botón Flotante de Acción (FAB) con el signo `+`.

---

## 7. ESPECIFICACIONES DE ACCESIBILIDAD

- **Contraste:** Todo texto sobre fondo debe tener un ratio mínimo de 4.5:1.
- **Focus States:** Bordes azules o verdes claramente visibles al navegar con la tecla `TAB`.
- **Alt Text:** Todas las imágenes (logos) y botones de icono deben tener etiquetas descriptivas para lectores de pantalla.
