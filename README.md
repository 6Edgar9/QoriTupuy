# QoriTupuy 🎓🤖

**QoriTupuy** (*"Encuentro Dorado"* en Quechua) es una plataforma SaaS educativa de alto rendimiento diseñada para automatizar la corrección, transcripción caligráfica y calificación de exámenes universitarios manuscritos escaneados mediante **Visión Computacional Multimodal** impulsada por **Google Gemini 1.5 Pro**.

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.1.7-black.svg)](https://nextjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-v11-orange.svg)](https://firebase.google.com/)
[![Gemini 1.5 Pro](https://img.shields.io/badge/AI-Gemini%201.5%20Pro-blue.svg)](https://ai.google.dev/)

---

## 🚀 Características Principales

- **Gestión Académica Integral (`/cursos`)**:
  - Interfaz de 3 columnas para crear y listar dinámicamente **Cursos** $\rightarrow$ **Evaluaciones** (Parciales, Prácticas) $\rightarrow$ **Secciones** (*Fila A*, *Fila B*).
  - **Editor Visual de Rúbricas**: Configura el número de preguntas, selección interactiva de alternativas correctas (**A, B, C, D, E**) y ponderación de puntajes por ítem.
- **Visión Multimodal Caligráfica**: Detección inteligente de respuestas marcadas (rellenos, cruces, círculos o tachaduras) y extracción del encabezado (nombre completo y código de estudiante).
- **Clasificación por Nivel de Confianza (Umbral 85%)**:
  - **Tabla de Aprobados por IA ($\ge 85\%$)**: Estudiantes evaluados con alta fidelidad caligráfica, ordenados alfabéticamente (A-Z) con modal visualizador de examen escaneado.
  - **Bandeja de Revisión Manual ($< 85\%$)**: Detección de anomalías o caligrafía ambigua con panel lateral (*Drawer*) para corrección y calibración docente inmediata.
- **Subida Masiva Resumable (hasta 100MB)**: Soporte para PDFs escaneados pesados utilizando Firebase Cloud Storage con barra de progreso en tiempo real y tolerancia a microcortes.

---

## 🗺️ Mapa de Rutas de la Aplicación

| Ruta | Descripción |
| :--- | :--- |
| `/` | Landing page institucional y accesos directos al panel docente. |
| `/cursos` | **Panel CRUD Académico**: Creación de Cursos, Evaluaciones y Secciones con editor visual de Rúbricas. |
| `/secciones/[id]` | **Dashboard de Calificación**: Subida masiva de PDFs (Drag & Drop de hasta 100MB) y disparo de inferencia IA. |
| `/secciones/[id]/calificados` | **Tabla de Aprobados IA**: Exámenes con confianza $\ge 85\%$ ordenados de la A a la Z con visor modal de PDF. |
| `/secciones/[id]/revision` | **Bandeja de Revisión Manual**: Exámenes con confianza $< 85\%$ con panel lateral (*Drawer*) para editar notas en Firestore. |
| `/api/grade-exam` | **API Route Multimodal**: Endpoint que procesa el PDF con Gemini 1.5 Pro y persiste la nota en Firestore. |

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend API**: [Next.js 15 (App Router)](https://nextjs.org/), React 19, TypeScript.
- **Estilos & UI**: [Tailwind CSS](https://tailwindcss.com/), Lucide React Icons.
- **Base de Datos & Almacenamiento**: [Firebase Firestore (NoSQL)](https://firebase.google.com/docs/firestore) y [Cloud Storage](https://firebase.google.com/docs/storage).
- **Inteligencia Artificial**: [Gemini 1.5 Pro](https://ai.google.dev/) vía SDK oficial `@google/genai` con salida JSON estructurada garantizada (`responseSchema`).

---

## 📦 1. Inicialización de Git y Subida a GitHub

Ejecuta los siguientes comandos en tu terminal dentro de la carpeta raíz del proyecto:

```bash
# 1. Inicializar el repositorio Git local
git init

# 2. Agregar todos los archivos al área de preparación (staging)
git add .

# 3. Crear el primer commit
git commit -m "feat: release oficial de QoriTupuy SaaS con Next.js 15, Gemini 1.5 Pro, Firebase y Licencia MIT"

# 4. Renombrar la rama principal a main
git branch -M main

# 5. Vincular con tu repositorio remoto privado en GitHub (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/QoriTupuy.git

# 6. Subir el código a GitHub
git push -u origin main
```

---

## ⚡ 2. Despliegue en Vercel (Paso a Paso)

1. Inicia sesión en tu cuenta de [Vercel](https://vercel.com/).
2. Haz clic en el botón **"Add New..."** y selecciona **"Project"**.
3. En la lista de repositorios de GitHub, localiza **`QoriTupuy`** y haz clic en **"Import"**.
4. En la pantalla de configuración del proyecto (*Configure Project*):
   - **Framework Preset**: Detectará automáticamente **Next.js**.
   - **Root Directory**: `./` (déjalo por defecto).
5. Despliega la sección **"Environment Variables"** y añade cada una de las variables indicadas en la tabla siguiente.
6. Haz clic en el botón **"Deploy"**. Vercel compilará y desplegará la aplicación automáticamente.

---

## 🔑 3. Variables de Entorno (Environment Variables)

Copia estas variables en la sección **Environment Variables** de tu proyecto en Vercel y en tu archivo local `.env.local`:

| Variable | Descripción | Ámbito |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key generada en [Google AI Studio](https://aistudio.google.com/). | Servidor (Privado) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` de la configuración web de Firebase. | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de Auth de Firebase (ej. `tu-app.firebaseapp.com`). | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID de tu proyecto en Firebase Console. | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de Cloud Storage (ej. `tu-app.firebasestorage.app`). | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID de mensajería de Firebase. | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Identificador único de la App Web de Firebase. | Cliente (Público) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | *(Opcional)* Credencial JSON de cuenta de servicio para Firebase Admin SDK. | Servidor (Privado) |

---

## 🔒 4. Reglas de Seguridad en Firebase Console

Para permitir la subida de PDFs pesados y el registro de exámenes en Firestore:

### A. Reglas de Cloud Firestore (`firestore.rules`)

Ve a **Firebase Console** $\rightarrow$ **Firestore Database** $\rightarrow$ pestaña **Reglas**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cursos/{cursoId} {
      allow read, write: if true; // En producción: if request.auth != null;
      
      match /evaluaciones/{evaluacionId} {
        allow read, write: if true;
        
        match /secciones/{seccionId} {
          allow read, write: if true;
          
          match /examenes_alumnos/{examenId} {
            allow read, write: if true;
          }
        }
      }
    }
  }
}
```

### B. Reglas de Cloud Storage (`storage.rules`)

Ve a **Firebase Console** $\rightarrow$ **Storage** $\rightarrow$ pestaña **Reglas**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cursos/{cursoId}/evaluaciones/{evaluacionId}/secciones/{seccionId}/examenes/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 100 * 1024 * 1024
                   && request.resource.contentType == 'application/pdf';
    }
  }
}
```

---

## 💻 5. Puesta en Marcha Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/QoriTupuy.git
cd QoriTupuy

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver **QoriTupuy** en ejecución.

---

## 📄 6. Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más información.
