# QoriTupuy 🎓🤖

**QoriTupuy** (*"Encuentro Dorado"* en Quechua) es una plataforma SaaS educativa de alto rendimiento diseñada para automatizar la corrección, transcripción caligráfica y calificación de exámenes universitarios manuscritos escaneados mediante **Visión Computacional Multimodal** impulsada por **Google Gemini** (`@google/genai`), **Next.js 16 (App Router + Turbopack)** y **Prisma ORM (SQLite)**.

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.3-black.svg)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3.1-blue.svg)](https://react.dev/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.4.1-emerald.svg)](https://www.prisma.io/)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini-4285F4.svg)](https://ai.google.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6.svg)](https://www.typescriptlang.org/)

---

## 🚀 Capacidades y Características Principales

### 1. Procesamiento por Lotes Multi-Página (Batch Processing)
- **División Automática con `pdf-lib`**: Ingesta de un único PDF multipágina (ej. paquete de toda una sección) y fragmentación en exámenes individuales de 1 página.
- **Pipeline Secuencial Anti-Saturación**: Procesamiento `for...of` estricto con **Throttling controlado** (`delay(2000)` entre páginas) para evitar límites de tasa (códigos 429 / 503) en la API de Gemini.
- **Gestión Eficiente de Memoria**: Liberación explícita de búferes de memoria y recolección de basura (GC) inmediata, junto con eliminación física de archivos temporales (`fs.unlinkSync`) en bloques seguros `finally`.

### 2. Auditoría Caligráfica y Control de Calidad
- **Detección Automática de Legibilidad**: Clasificación inteligente entre exámenes legibles (`confianza_lectura: true`) y exámenes ambiguos, en blanco o con baja fidelidad (`confianza_lectura: false`).
- **Bandeja de Doble Pestaña**:
  - **Calificados con Éxito**: Visualización de notas, visor modal del examen escaneado y descarga de retroalimentación.
  - **Requieren Revisión Manual**: Filtro de exámenes observados con motivo explícito detectado por la IA (`motivo_revision_manual`), con edición rápida de notas.

### 3. Generación de PDFs con Retroalimentación Visual (Sello Rojo)
- **Estampado Vectorial con `pdf-lib`**: Toggle opcional antes de procesar el examen que genera un PDF anotado.
- **Sello Caligráfico**: Inserta la nota final en tinta roja (`rgb(1, 0, 0)`) en el margen superior derecho y lista las preguntas incorrectas para que el estudiante comprenda sus áreas de mejora.

### 4. Exportación Universitaria a Excel (.xlsx)
- **Descarga en 1 Clic**: Endpoint especializado (`/api/secciones/[id]/exportar`) que transforma los resultados válidos a formato universitario oficial (USS):
  - `Código_Alumno`
  - `Apellidos_Nombres`
  - `Nota_Final`
- Compatible con sistemas de gestión académica y hojas de cálculo (Excel, Google Sheets, LibreOffice).

### 5. Dashboard de Analíticas e Insights Dinámicos
- **Cálculo Robusto sin Sesgos**: Inspección dinámica de claves mediante `Object.keys()` sobre el detalle de respuestas para determinar el número real de ítems sin valores fijos ni riesgo de división por cero (`NaN`).
- **Métricas Clave**: Promedio general del salón, tasa de aprobación, nota máxima/mínima y ranking de las preguntas con mayor índice de error.

### 6. Editor Visual de Rúbricas Multimodal (`RubricEditor`)
Soporte para 12 modalidades de evaluación universitaria con ponderación dinámica:
1. **Opción Múltiple Dinámica** (A, B, C, D... con número configurable de alternativas).
2. **Verdadero / Falso** (V / F clásico).
3. **Verdadero / Falso con Justificación** (exige criterio argumentativo si la clave es Falsa).
4. **Completar Espacios / Líneas en Blanco** (evaluación con palabras clave y sinónimos clínicos/técnicos).
5. **Respuesta Corta** (conceptos o términos exactos).
6. **Ordenamiento / Secuencia Lógica** (secuencias cronológicas o diagramas de flujo con puntaje parcial).
7. **Rotulado de Imágenes / Diagramas** (asociación anatómica o espacial).
8. **Ensayo con Rúbrica Multicriterio** (criterios desglosados independientes: Ortografía, Coherencia, Contenido).
9. **Texto Abierto / Desarrollo Caligráfico** (comparación semántica contra el criterio docente).
10. **Cálculo Matemático / Procedimiento** (verificación de pasos y resultado numérico).
11. **Relación de Columnas / Trazos** (asociación de conceptos cruzados).
12. **Gráficos y Esquemas Manuscritos** (reconocimiento visual de diagramas y curvas).

**Seguridad en el Editor**:
- **Bloqueo de UI (`isSubmitting`)**: Deshabilita botones de acción (Guardar, Cancelar, Volver) y entradas mientras se guarda para impedir dobles envíos.
- **Revalidación Forzada**: Invocación de `revalidatePath` en Next.js para purgar la caché del servidor al actualizar la rúbrica.
- **Redirección Segura**: Navegación (`router.push`) ejecutada exclusivamente tras confirmar `response.ok === true`.

---

## 🗺️ Mapa de Rutas de la Aplicación

### Vistas del Dashboard (Frontend)
| Ruta | Descripción |
| :--- | :--- |
| `/` | Landing page principal con métricas globales y acceso al sistema. |
| `/cursos` | **Panel Académico CRUD**: Gestión en 3 columnas de Cursos $\rightarrow$ Evaluaciones $\rightarrow$ Secciones con Editor de Rúbricas. |
| `/secciones/[id]` | **Área de Calificación**: Dropzone de PDFs (Drag & Drop), toggle de retroalimentación roja y barra de progreso. |
| `/secciones/[id]/calificados` | **Resultados y Analíticas**: Pestañas de Aprobados IA vs Revisión Manual, exportación a Excel y vaciado masivo. |
| `/secciones/[id]/revision` | **Bandeja de Calibración Docente**: Edición directa y resolución de inconsistencias. |

### Endpoints del Backend (API Routes)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET`, `POST` | `/api/cursos` | Listado y creación de asignaturas académicas. |
| `GET`, `PUT`, `DELETE` | `/api/cursos/[id]` | Consulta, edición y eliminación en cascada de curso. |
| `GET`, `POST` | `/api/evaluaciones` | Listado y registro de exámenes parciales / prácticas. |
| `GET`, `PUT`, `DELETE` | `/api/evaluaciones/[id]` | Consulta, actualización y baja de evaluación. |
| `GET`, `POST` | `/api/secciones` | Listado y creación de secciones con rúbricas asociadas. |
| `GET`, `PUT`, `DELETE` | `/api/secciones/[id]` | Actualización de rúbrica (con `revalidatePath`) y eliminación. |
| `DELETE` | `/api/secciones/[id]/vaciar` | **Limpieza Masiva**: Elimina todos los exámenes de la sección. |
| `GET` | `/api/secciones/[id]/exportar` | **Exportación Excel**: Descarga de calificaciones en formato `.xlsx` (USS). |
| `GET`, `POST` | `/api/examenes` | Consulta global y guardado de resultados calificados. |
| `GET`, `PUT`, `DELETE` | `/api/examenes/[id]` | Edición de nota manual o eliminación de un examen específico. |
| `POST` | `/api/grade-exam` | **Motor de Inferencia IA**: Split multi-página, throttling anti-429, feedback en PDF y persistencia en Prisma. |
| `POST` | `/api/upload-local` | Almacenamiento seguro de archivos PDF en disco local (`public/uploads`). |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Framework Fullstack** | [Next.js 16.4.3 (App Router)](https://nextjs.org/) con motor [Turbopack](https://turbo.build/) |
| **Librería UI** | [React 19.3.1](https://react.dev/) + [TypeScript 5.7](https://www.typescriptlang.org/) |
| **Estilos & Componentes** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [Lucide React Icons](https://lucide.dev/) |
| **Base de Datos & ORM** | [Prisma ORM 6.4.1](https://www.prisma.io/) sobre base de datos relacional [SQLite](https://sqlite.org/) |
| **Inteligencia Artificial** | [Google Gemini 2.5 Flash / 1.5 Pro](https://ai.google.dev/) vía SDK oficial `@google/genai` con salida estructurada (`responseSchema`) |
| **Manipulación de PDFs** | [pdf-lib 1.17.1](https://pdf-lib.js.org/) (fragmentación de páginas y marcado vectorial de notas) |
| **Generación de Hojas de Cálculo** | [xlsx (SheetJS) 0.18.5](https://sheetjs.com/) |
| **Validación de Datos** | [Zod 3.24](https://zod.dev/) |

---

## 💻 Puesta en Marcha Local

### 1. Clonar el Repositorio
```bash
git clone https://github.com/TU_USUARIO/QoriTupuy.git
cd QoriTupuy
```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Crea tu archivo `.env.local` a partir de la plantilla:
```bash
cp .env.example .env.local
```

Configura tus credenciales en `.env.local`:
```env
# API Key de Google AI Studio (requerida para la inferencia multimodal de Gemini)
GEMINI_API_KEY="AIzaSy..."

# URL de conexión a la base de datos local SQLite con Prisma
DATABASE_URL="file:./dev.db"
```

> [!NOTE]
> Puedes generar tu clave API gratuita en [Google AI Studio](https://aistudio.google.com/).

### 4. Inicializar la Base de Datos con Prisma
Aplica el esquema de datos sobre SQLite:
```bash
npx prisma db push
```

*(Opcional)* Si deseas explorar o editar los datos visualmente:
```bash
npx prisma studio
```

### 5. Iniciar el Entorno de Desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para comenzar a utilizar **QoriTupuy**.

---

## 🏗️ Construcción para Producción

Para compilar el proyecto optimizado con Next.js y Turbopack:

```bash
# 1. Comprobación estricta de tipos de TypeScript
npx tsc --noEmit

# 2. Generación del build de producción
npm run build

# 3. Iniciar el servidor productivo
npm run start
```

---

## 📂 Estructura del Proyecto

```text
QoriTupuy/
├── prisma/
│   ├── dev.db                 # Base de datos SQLite local (en .gitignore)
│   └── schema.prisma          # Definición de modelos (Curso, Evaluacion, Seccion, ExamenAlumno)
├── public/
│   ├── uploads/               # PDFs temporales y exámenes procesados (en .gitignore)
│   │   ├── examenes/          # Páginas unitarias fragmentadas
│   │   └── feedback/          # PDFs con marcas y sellos rojos
│   └── ...
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── cursos/        # Panel CRUD de Cursos, Evaluaciones y Secciones
│   │   │   └── secciones/[id]/
│   │   │       ├── page.tsx          # Vista principal de carga de PDFs y dropzone
│   │   │       ├── calificados/      # Tabla de resultados y analíticas (Excel, vaciado)
│   │   │       └── revision/         # Bandeja de revisión manual
│   │   ├── api/
│   │   │   ├── cursos/        # Endpoints REST de Cursos
│   │   │   ├── evaluaciones/  # Endpoints REST de Evaluaciones
│   │   │   ├── secciones/     # Endpoints de Secciones, vaciado y exportar Excel
│   │   │   ├── examenes/      # Endpoints CRUD de notas de alumnos
│   │   │   ├── grade-exam/    # Pipeline central de inferencia Gemini + pdf-lib
│   │   │   └── upload-local/  # Gestor de subida de archivos local
│   │   └── layout.tsx
│   ├── components/
│   │   ├── dashboard/         # BandejaRevision, Insights, PdfDropzone, etc.
│   │   └── rubric/            # RubricEditor (Editor visual de 12 tipos de preguntas)
│   ├── lib/
│   │   ├── gemini/            # Cliente e integraciones de Gemini (@google/genai, grader.ts)
│   │   └── prisma.ts          # Singleton del cliente Prisma
│   └── types/
│       └── database.ts        # Tipos e interfaces de TypeScript
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 📄 Licencia

Este proyecto está distribuido bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para mayores detalles.
