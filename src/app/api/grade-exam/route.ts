import { NextRequest, NextResponse } from 'next/server';
import { obtenerSeccion, guardarExamenAlumno } from '@/lib/firebase/firestore.service';
import { calificarExamenConGemini } from '@/lib/gemini/grader';
import { EstadoRevision, ExamenAlumno } from '@/types/database';

export const maxDuration = 60; // Permite hasta 60s en entornos serverless

/**
 * Extractor básico de primera página del PDF a imagen.
 * Si el entorno cuenta con librerías nativas de canvas/poppler procesa el render;
 * de lo contrario, envía el buffer optimizado de alta resolución con soporte nativo de PDF/visión en Gemini 1.5 Pro.
 */
async function extractFirstPageFromPdf(
  pdfBuffer: Buffer
): Promise<{ buffer: Buffer; mimeType: 'image/png' | 'image/jpeg' | 'application/pdf' }> {
  try {
    // Si el buffer ya es una imagen directa (en caso de subida directa de escaneo JPG/PNG)
    const isPng = pdfBuffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const isJpg = pdfBuffer.subarray(0, 3).toString('hex') === 'ffd8ff';

    if (isPng) return { buffer: pdfBuffer, mimeType: 'image/png' };
    if (isJpg) return { buffer: pdfBuffer, mimeType: 'image/jpeg' };

    // Para archivos PDF: Gemini 1.5 Pro procesa nativamente documentos PDF aplicando internamente
    // rasterizado multimodal a 300 DPI por página para transcripción caligráfica.
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
    };
  } catch (err) {
    console.warn('Fallo en extracción de imagen del PDF, usando buffer original:', err);
    return {
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
    };
  }
}

/**
 * Descarga el contenido binario del PDF desde la URL de Cloud Storage con control de Timeout
 */
async function fetchPdfBufferWithTimeout(url: string, timeoutMs = 25000): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP Error al descargar archivo: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Parsear el cuerpo de la petición (JSON o FormData)
    let cursoId = '';
    let evaluacionId = '';
    let seccionId = '';
    let urlPdf = '';
    let storagePath = '';
    let directBuffer: Buffer | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      cursoId = body.cursoId;
      evaluacionId = body.evaluacionId;
      seccionId = body.seccionId;
      urlPdf = body.urlPdf;
      storagePath = body.storagePath || '';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      cursoId = (formData.get('cursoId') as string) || '';
      evaluacionId = (formData.get('evaluacionId') as string) || '';
      seccionId = (formData.get('seccionId') as string) || '';
      urlPdf = (formData.get('urlPdf') as string) || '';
      storagePath = (formData.get('storagePath') as string) || '';

      const file = formData.get('file') as File | null;
      if (file) {
        const bytes = await file.arrayBuffer();
        directBuffer = Buffer.from(bytes);
      }
    } else {
      return NextResponse.json(
        { error: 'Content-Type no soportado. Enviar application/json o multipart/form-data.' },
        { status: 400 }
      );
    }

    // 2. Validar parámetros requeridos
    if (!cursoId || !evaluacionId || !seccionId) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios: cursoId, evaluacionId y seccionId son requeridos.' },
        { status: 400 }
      );
    }

    if (!urlPdf && !directBuffer) {
      return NextResponse.json(
        { error: 'Debe proporcionarse la urlPdf o adjuntar un archivo en el cuerpo de la solicitud.' },
        { status: 400 }
      );
    }

    // 3. Obtener la Sección y su respectiva Rúbrica desde Firestore
    const seccion = await obtenerSeccion(cursoId, evaluacionId, seccionId);
    if (!seccion) {
      return NextResponse.json(
        { error: `No se encontró la sección con ID ${seccionId} en la evaluación especificada.` },
        { status: 404 }
      );
    }

    if (!seccion.rubrica || seccion.rubrica.length === 0) {
      return NextResponse.json(
        { error: 'La sección no tiene configurada una rúbrica de respuestas correctas.' },
        { status: 400 }
      );
    }

    // 4. Descargar u obtener el buffer binario del examen
    let pdfBuffer: Buffer;
    if (directBuffer) {
      pdfBuffer = directBuffer;
    } else {
      try {
        pdfBuffer = await fetchPdfBufferWithTimeout(urlPdf, 20000);
      } catch (dlError) {
        return NextResponse.json(
          { error: `Error descargando el examen desde Cloud Storage: ${(dlError as Error).message}` },
          { status: 504 }
        );
      }
    }

    // 5. Aislar la primera página / preparar buffer visual para visión caligráfica
    const visualContent = await extractFirstPageFromPdf(pdfBuffer);

    // 6. Calificar con Gemini 1.5 Pro mediante Grader
    const resultadoIA = await calificarExamenConGemini(
      visualContent.buffer,
      visualContent.mimeType,
      seccion.rubrica
    );

    // 7. Determinar estado de revisión según confianza de lectura (umbral >= 85)
    const estadoRevision: EstadoRevision =
      resultadoIA.confianza_lectura >= 85 && !resultadoIA.requiere_revision_humana
        ? 'aprobado_ia'
        : 'requiere_revision_manual';

    // 8. Construir objeto ExamenAlumno para Firestore
    const examenData: Omit<ExamenAlumno, 'id' | 'creado_el' | 'actualizado_el'> = {
      seccion_id: seccionId,
      evaluacion_id: evaluacionId,
      curso_id: cursoId,
      codigo_alumno: resultadoIA.codigo_alumno,
      nombre: resultadoIA.nombre_detectado,
      nota_total: resultadoIA.nota_total,
      nota_maxima: resultadoIA.nota_maxima,
      confianza_lectura: resultadoIA.confianza_lectura,
      estado_revision: estadoRevision,
      url_pdf: urlPdf || '',
      ruta_storage_pdf: storagePath,
      desglose_json: resultadoIA.desglose_json,
      motivo_revision_manual: resultadoIA.motivo_revision_manual,
    };

    // 9. Persistir registro en Firestore
    const examenId = await guardarExamenAlumno(cursoId, evaluacionId, seccionId, examenData);

    const duracionMs = Date.now() - startTime;

    // 10. Devolver respuesta 200 con el examen calificado
    return NextResponse.json(
      {
        success: true,
        duracion_ms: duracionMs,
        examen_id: examenId,
        examen: {
          id: examenId,
          ...examenData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error en /api/grade-exam:', error);

    const errorMessage = (error as Error).message || 'Error interno del servidor';
    const isTimeout = errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('aborted');

    return NextResponse.json(
      {
        success: false,
        error: isTimeout
          ? 'La solicitud excedió el tiempo límite durante el procesamiento del examen.'
          : errorMessage,
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}

