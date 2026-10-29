import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from 'firebase/storage';
import { storage } from './client';

export interface UploadPdfOptions {
  file: File | Blob;
  folderPath: string; // ej. "cursos/{cursoId}/evaluaciones/{evalId}/secciones/{secId}/examenes"
  fileName?: string;
  onProgress?: (progressPercent: number, bytesTransferred: number, totalBytes: number) => void;
}

export interface UploadPdfResult {
  downloadUrl: string;
  storagePath: string;
  fileSizeBytes: number;
  fileName: string;
}

const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB límite estricto

/**
 * Servicio optimizado para subir archivos PDF de gran volumen (hasta 100MB)
 * utilizando uploadBytesResumable para tolerar microcortes de red y reportar progreso fluido.
 */
export async function uploadHeavyPdf({
  file,
  folderPath,
  fileName,
  onProgress,
}: UploadPdfOptions): Promise<UploadPdfResult> {
  // 1. Validaciones previas de integridad y tamaño
  if (file.size > MAX_PDF_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `El archivo supera el límite permitido de 100 MB (Tamaño actual: ${sizeInMb} MB).`
    );
  }

  const mimeType = file.type || 'application/pdf';
  if (mimeType !== 'application/pdf') {
    throw new Error(`Formato no compatible: se requiere un archivo PDF válido (recibido: ${mimeType}).`);
  }

  // 2. Formatear nombre seguro y ruta de destino
  const safeName = fileName || (file instanceof File ? file.name : `examen_${Date.now()}.pdf`);
  const sanitizedFileName = `${Date.now()}_${safeName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const fullStoragePath = `${folderPath.replace(/^\/+|\/+$/g, '')}/${sanitizedFileName}`;

  const storageRef = ref(storage, fullStoragePath);

  // 3. Metadatos del archivo para cache y visualización en el navegador
  const metadata = {
    contentType: 'application/pdf',
    customMetadata: {
      originalName: safeName,
      uploadedAt: new Date().toISOString(),
      service: 'QoriTupuy-ExamUploader',
    },
  };

  // 4. Subida reanudable (Resumable Upload)
  const uploadTask: UploadTask = uploadBytesResumable(storageRef, file, metadata);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(
            Math.round(percent),
            snapshot.bytesTransferred,
            snapshot.totalBytes
          );
        }
      },
      (error) => {
        console.error('Error durante la subida a Cloud Storage:', error);
        reject(new Error(`Fallo en la subida a Cloud Storage: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            storagePath: fullStoragePath,
            fileSizeBytes: file.size,
            fileName: safeName,
          });
        } catch (urlError) {
          reject(new Error(`No se pudo obtener la URL de descarga: ${(urlError as Error).message}`));
        }
      }
    );
  });
}

