# QoriTupuy 🎓🤖

**QoriTupuy** (*"Encuentro Dorado"* en Quechua) es una plataforma SaaS educativa de alto rendimiento diseñada para automatizar la corrección, transcripción caligráfica y calificación de exámenes universitarios manuscritos escaneados mediante **Visión Computacional Multimodal** impulsada por **Google Gemini 1.5 Pro**.

---

## 🚀 Características Principales

- **Visión Multimodal Caligráfica**: Detección inteligente de respuestas marcadas (rellenos, cruces, círculos o tachaduras) y extracción del encabezado (nombre completo y código de alumno).
- **Contraste Dinámico de Rúbrica**: Ponderación automática de aciertos y penalidades por respuesta incorrecta según la sección o fila del examen (*Fila A*, *Fila B*).
- **Clasificación por Nivel de Confianza (Umbral 85%)**:
  - **Tabla de Aprobados por IA ($\ge 85\%$)**: Estudiantes evaluados con alta fidelidad caligráfica, ordenados alfabéticamente (A-Z) con visor de examen escaneado.
  - **Bandeja de Revisión Manual ($< 85\%$)**: Detección de anomalías o caligrafía ambigua con panel lateral (*Drawer*) para corrección y calibración docente inmediata.
- **Subida Masiva Resumable (hasta 100MB)**: Soporte para PDFs escaneados pesados utilizando Firebase Cloud Storage con barra de progreso en tiempo real.

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend API**: [Next.js 15 (App Router)](https://nextjs.org/), React 19, TypeScript.
- **Estilos & UI**: [Tailwind CSS](https://tailwindcss.com/), Lucide Icons.
- **Base de Datos & Almacenamiento**: [Firebase Firestore (NoSQL)](https://firebase.google.com/docs/firestore) y [Cloud Storage](https://firebase.google.com/docs/storage).
- **Inteligencia Artificial**: [Gemini 1.5 Pro](https://ai.google.dev/) vía SDK oficial `@google/genai` con salida JSON estructurada garantizada (`responseSchema`).

---

## 📦 1. Inicialización de Git y Subida a GitHub

Ejecuta los siguientes comandos en tu terminal dentro de la carpeta raíz del proyecto (`c:\Users\megac\Desktop\QoriTupuy`):

```bash
# 1. Inicializar el repositorio Git local
git init

# 2. Agregar todos los archivos al área de preparación (staging)
git add .

# 3. Crear el primer commit
git commit -m "feat: release inicial de QoriTupuy SaaS con Next.js 15, Gemini 1.5 Pro y Firebase"

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
5. Despliega la sección **"Environment Variables"** y añade cada una de las variables indicadas a continuación.
6. Haz clic en el botón **"Deploy"**. Vercel compilará y desplegará la aplicación en menos de 2 minutos.

---

## 🔑 3. Variables de Entorno (Environment Variables en Vercel)

Copia y pega estas variables en la sección **Environment Variables** de tu proyecto en Vercel (y en tu archivo `.env.local` para desarrollo local):

| Variable | Descripción | Entorno |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key generada en [Google AI Studio](https://aistudio.google.com/). | Servidor (Privado) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` de la configuración web de Firebase. | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Dominio de Auth de Firebase (ej. `tu-app.firebaseapp.com`). | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ID de tu proyecto en Firebase Console. | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket de Storage (ej. `tu-app.appspot.com` o `tu-app.firebasestorage.app`). | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID numérico de Firebase Cloud Messaging. | Cliente (Público) |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Identificador único de la App Web de Firebase. | Cliente (Público) |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | *(Opcional / Backend Admin)* JSON en una sola línea de la cuenta de servicio de Firebase. | Servidor (Privado) |

---

## 🔒 4. Reglas de Seguridad en Firebase Console

Para que el sistema permita la subida de PDFs de hasta 100MB y el guardado/consulta de exámenes en Firestore, configura las siguientes reglas en la consola de Firebase:

### A. Reglas de Cloud Firestore (`firestore.rules`)

Ve a **Firebase Console** $\rightarrow$ **Firestore Database** $\rightarrow$ pestaña **Reglas**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Reglas para Cursos, Evaluaciones, Secciones y Exámenes de Alumnos
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

> [!NOTE]
> Para la fase de prototipo o demo se permite lectura y escritura directa. Al integrar autenticación con usuarios universitarios, reemplaza `if true;` por `if request.auth != null;`.

### B. Reglas de Cloud Storage (`storage.rules`)

Ve a **Firebase Console** $\rightarrow$ **Storage** $\rightarrow$ pestaña **Reglas**:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Permitir subida de PDFs de hasta 100MB organizados por curso y sección
    match /cursos/{cursoId}/evaluaciones/{evaluacionId}/secciones/{seccionId}/examenes/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 100 * 1024 * 1024
                   && request.resource.contentType == 'application/pdf';
    }
  }
}
```

---

## 💻 Desarrollo Local

Para correr la aplicación en tu entorno local:

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env.local
# (Asegúrate de colocar tu GEMINI_API_KEY y credenciales de Firebase en .env.local)

# 3. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación funcionando.

