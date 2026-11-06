import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { calificarExamenConGemini } from '@/lib/gemini/grader';
import { EstadoRevision, ItemRubrica, DesglosePregunta } from '@/types/database';

export const maxDuration = 300; // Permite procesamiento por lotes prolongado

/**
 * Carga el buffer del PDF desde el disco local o desde URL local/remota
 */
function loadPdfBufferLocal(filePath?: string, urlPdf?: string): Buffer {
  // 1. Si viene una ruta absoluta de disco local
  if (filePath && fs.existsSync(filePath)) {
    console.log(`📖 Leyendo PDF directamente desde filePath: ${filePath}`);
    return fs.readFileSync(filePath);
  }

  // 2. Si viene una ruta pública local (ej: /uploads/archivo.pdf)
  if (urlPdf && urlPdf.startsWith('/uploads/')) {
    const resolvedPath = path.join(process.cwd(), 'public', urlPdf);
    if (fs.existsSync(resolvedPath)) {
      console.log(`📖 Leyendo PDF desde ruta pública local: ${resolvedPath}`);
      return fs.readFileSync(resolvedPath);
    }
  }

  // 3. Si viene solo el nombre del archivo dentro de public/uploads/
  if (urlPdf) {
    const fileName = path.basename(urlPdf);
    const resolvedPath = path.join(process.cwd(), 'public', 'uploads', fileName);
    if (fs.existsSync(resolvedPath)) {
      console.log(`📖 Leyendo PDF desde uploads/basename: ${resolvedPath}`);
      return fs.readFileSync(resolvedPath);
    }
  }

  throw new Error(`No se encontró el archivo PDF en el disco local (filePath: ${filePath}, urlPdf: ${urlPdf}).`);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Parsear el cuerpo de la petición (JSON o FormData)
    let cursoId = '';
    let evaluacionId = '';
    let seccionId = '';
    let urlPdf = '';
    let filePath = '';
    let storagePath = '';
    let directBuffer: Buffer | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      cursoId = body.cursoId;
      evaluacionId = body.evaluacionId;
      seccionId = body.seccionId;
      urlPdf = body.urlPdf;
      filePath = body.filePath || '';
      storagePath = body.storagePath || body.urlPdf || '';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      cursoId = (formData.get('cursoId') as string) || '';
      evaluacionId = (formData.get('evaluacionId') as string) || '';
      seccionId = (formData.get('seccionId') as string) || '';
      urlPdf = (formData.get('urlPdf') as string) || '';
      filePath = (formData.get('filePath') as string) || '';
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

    if (!urlPdf && !filePath && !directBuffer) {
      return NextResponse.json(
        { error: 'Debe proporcionarse la ruta del archivo PDF o adjuntar el archivo directamente.' },
        { status: 400 }
      );
    }

    // 3. Obtener la Sección y su respectiva Rúbrica desde SQLite mediante Prisma
    const seccion = await prisma.seccion.findUnique({
      where: { id: seccionId },
    });

    if (!seccion) {
      return NextResponse.json(
        { error: `No se encontró la sección con ID ${seccionId} en la base de datos.` },
        { status: 404 }
      );
    }

    let rubrica: ItemRubrica[] = [];
    try {
      rubrica = typeof seccion.rubrica === 'string' ? JSON.parse(seccion.rubrica) : seccion.rubrica;
    } catch (e) {
      rubrica = [];
    }

    if (!rubrica || rubrica.length === 0) {
      return NextResponse.json(
        { error: 'La sección no tiene configurada una rúbrica de respuestas correctas.' },
        { status: 400 }
      );
    }

    // 4. Cargar buffer del archivo localmente usando File System
    let pdfBuffer: Buffer;
    if (directBuffer) {
      pdfBuffer = directBuffer;
    } else {
      try {
        pdfBuffer = loadPdfBufferLocal(filePath, urlPdf);
      } catch (fsErr: any) {
        return NextResponse.json(
          { error: `Error leyendo el archivo PDF localmente: ${fsErr.message}` },
          { status: 404 }
        );
      }
    }

    // 5. Cargar documento PDF con pdf-lib y determinar cantidad de páginas
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(`📑 PDF cargado con éxito. Total de páginas detectadas: ${pageCount}`);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const timePrefix = Date.now();
    const examenesCreados: any[] = [];

    // 6. Procesamiento por Lotes Secuencial (1 página = 1 examen de alumno)
    // Se ejecuta de manera secuencial (for...of) para evitar saturación de cuota y errores 503/429 en Gemini
    for (let pageIdx = 0; pageIdx < pageCount; pageIdx++) {
      console.log(`🔍 [Lote] Procesando página ${pageIdx + 1} de ${pageCount}...`);

      // Crear un PDF independiente de 1 página
      const singlePageDoc = await PDFDocument.create();
      const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [pageIdx]);
      singlePageDoc.addPage(copiedPage);

      const singlePdfBytes = await singlePageDoc.save();
      const singlePdfBuffer = Buffer.from(singlePdfBytes);

      // Guardar el archivo PDF individual en disco local
      const pageFileName = `examen_${timePrefix}_p${pageIdx + 1}.pdf`;
      const pageFilePath = path.join(uploadsDir, pageFileName);
      const pagePublicUrl = `/uploads/${pageFileName}`;
      fs.writeFileSync(pageFilePath, singlePdfBuffer);

      // Calificar la página con Gemini Multimodal
      console.log(`🤖 [Lote] Evaluando página ${pageIdx + 1}/${pageCount} con Gemini...`);
      const resultadoIA = await calificarExamenConGemini(
        singlePdfBuffer,
        'application/pdf',
        rubrica
      );

      // Determinar estado de revisión según confianza de lectura (umbral >= 85)
      const estadoRevision: EstadoRevision =
        resultadoIA.confianza_lectura >= 85 && !resultadoIA.requiere_revision_humana
          ? 'aprobado_ia'
          : 'requiere_revision_manual';

      const desgloseSanitizado: DesglosePregunta[] = (resultadoIA.desglose_json || []).map((item) => ({
        ...item,
        justificacion: item.justificacion || '',
        observaciones: item.observaciones || '',
      }));

      // Persistir examen en SQLite con Prisma
      const nuevoExamen = await prisma.examenAlumno.create({
        data: {
          seccion_id: seccionId,
          evaluacion_id: evaluacionId,
          curso_id: cursoId,
          codigo_alumno: resultadoIA.codigo_alumno || '',
          nombre: resultadoIA.nombre_detectado || `Alumno Pág ${pageIdx + 1}`,
          nota_total: resultadoIA.nota_total,
          nota_maxima: resultadoIA.nota_maxima || 20,
          confianza_lectura: resultadoIA.confianza_lectura,
          estado_revision: estadoRevision,
          url_pdf: pagePublicUrl,
          ruta_storage_pdf: pagePublicUrl,
          desglose_json: JSON.stringify(desgloseSanitizado),
          motivo_revision_manual: resultadoIA.motivo_revision_manual || '',
        },
      });

      console.log(`✅ [Lote] Examen guardado en SQLite (ID: ${nuevoExamen.id}, Alumno: ${nuevoExamen.nombre}, Nota: ${nuevoExamen.nota_total})`);

      examenesCreados.push({
        ...nuevoExamen,
        desglose_json: desgloseSanitizado,
      });
    }

    const duracionMs = Date.now() - startTime;
    console.log(`✨ Procesamiento por lotes completado: ${examenesCreados.length} exámenes guardados en ${duracionMs}ms`);

    // 7. Devolver respuesta 200 con el listado completo de exámenes calificados
    return NextResponse.json(
      {
        success: true,
        duracion_ms: duracionMs,
        total_paginas: pageCount,
        total_evaluados: examenesCreados.length,
        examenes: examenesCreados,
        // Retrocompatibilidad con clientes que esperan examen individual
        examen: examenesCreados[0],
        examen_id: examenesCreados[0]?.id,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error en /api/grade-exam:', error);

    const errorMessage = error.message || 'Error interno del servidor';
    const isTimeout = errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('aborted');
    const isOverloaded =
      errorMessage.includes('SERVICE_OVERLOADED') ||
      errorMessage.includes('503') ||
      errorMessage.includes('UNAVAILABLE') ||
      errorMessage.includes('high demand') ||
      errorMessage.includes('RESOURCE_EXHAUSTED');

    let clientMessage = errorMessage;
    let statusCode = 500;

    if (isOverloaded) {
      statusCode = 503;
      clientMessage = 'Los servidores de Inteligencia Artificial están saturados globalmente. Tu examen no se pudo evaluar. Por favor, intenta de nuevo en unos minutos.';
    } else if (isTimeout) {
      statusCode = 504;
      clientMessage = 'La solicitud excedió el tiempo límite durante el procesamiento del examen. Por favor, reintenta.';
    }

    return NextResponse.json(
      {
        success: false,
        error: clientMessage,
        isOverloaded,
      },
      { status: statusCode }
    );
  }
}
