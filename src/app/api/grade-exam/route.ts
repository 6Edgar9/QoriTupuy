import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma } from '@/lib/prisma';
import { calificarExamenConGemini } from '@/lib/gemini/grader';
import { EstadoRevision, ItemRubrica, DesglosePregunta } from '@/types/database';

export const maxDuration = 300; // Permite procesamiento por lotes prolongado

/**
 * Genera un PDF de retroalimentación estampando la nota en rojo en la esquina superior derecha
 * y agregando un resumen de aciertos y fallos en el encabezado.
 */
async function generarPdfRetroalimentacion(
  pagePdfBytes: Uint8Array,
  notaTotal: number,
  notaMaxima: number,
  desglose: DesglosePregunta[],
  nombreAlumno: string
): Promise<Buffer> {
  const doc = await PDFDocument.load(pagePdfBytes);
  const pages = doc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);

  // 1. Sello de Nota en color rojo en la parte superior derecha
  const notaTexto = `NOTA: ${notaTotal}/${notaMaxima}`;
  const fontSizeNota = 20;
  const textWidth = helveticaBold.widthOfTextAtSize(notaTexto, fontSizeNota);
  const stampX = Math.max(20, width - textWidth - 25);
  const stampY = height - 38;

  // Fondo del recuadro
  firstPage.drawRectangle({
    x: stampX - 8,
    y: stampY - 5,
    width: textWidth + 16,
    height: 28,
    color: rgb(1, 0.93, 0.93),
    borderColor: rgb(0.85, 0.1, 0.1),
    borderWidth: 1.5,
  });

  // Texto de la nota en rojo
  firstPage.drawText(notaTexto, {
    x: stampX,
    y: stampY,
    size: fontSizeNota,
    font: helveticaBold,
    color: rgb(0.85, 0.1, 0.1),
  });

  // 2. Resumen de preguntas falladas en el encabezado izquierdo
  const falladas = desglose.filter((d) => !d.es_correcta);
  const textoFeedback =
    falladas.length > 0
      ? `Falló Pregunta(s): ${falladas.map((f) => `P${f.numero_pregunta}`).join(', ')}`
      : '¡Todas las preguntas respondidas correctamente!';

  firstPage.drawText(textoFeedback, {
    x: 25,
    y: height - 32,
    size: 10,
    font: helveticaBold,
    color: falladas.length > 0 ? rgb(0.85, 0.1, 0.1) : rgb(0.1, 0.6, 0.2),
  });

  // 3. Pie de página institucional
  firstPage.drawText(
    `QoriTupuy Feedback Docente | Alumno: ${nombreAlumno} | Calificado con Gemini AI`,
    {
      x: 25,
      y: 12,
      size: 8,
      font: helvetica,
      color: rgb(0.45, 0.45, 0.45),
    }
  );

  const modifiedBytes = await doc.save();
  return Buffer.from(modifiedBytes);
}

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
    let generarFeedback = true;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      cursoId = body.cursoId;
      evaluacionId = body.evaluacionId;
      seccionId = body.seccionId;
      urlPdf = body.urlPdf;
      filePath = body.filePath || '';
      storagePath = body.storagePath || body.urlPdf || '';
      if (body.generarFeedback !== undefined) generarFeedback = Boolean(body.generarFeedback);
      if (body.generar_feedback !== undefined) generarFeedback = Boolean(body.generar_feedback);
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      cursoId = (formData.get('cursoId') as string) || '';
      evaluacionId = (formData.get('evaluacionId') as string) || '';
      seccionId = (formData.get('seccionId') as string) || '';
      urlPdf = (formData.get('urlPdf') as string) || '';
      filePath = (formData.get('filePath') as string) || '';
      storagePath = (formData.get('storagePath') as string) || '';
      if (formData.has('generarFeedback')) generarFeedback = formData.get('generarFeedback') === 'true';
      if (formData.has('generar_feedback')) generarFeedback = formData.get('generar_feedback') === 'true';

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
    const examenesDir = path.join(uploadsDir, 'examenes');
    const feedbackDir = path.join(uploadsDir, 'feedback');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    if (!fs.existsSync(examenesDir)) fs.mkdirSync(examenesDir, { recursive: true });
    if (!fs.existsSync(feedbackDir)) fs.mkdirSync(feedbackDir, { recursive: true });

    const timePrefix = Date.now();
    const examenesCreados: any[] = [];
    const pageIndices = Array.from({ length: pageCount }, (_, idx) => idx);

    // 6. Procesamiento por Lotes Secuencial (1 página = 1 examen de alumno)
    // Se itera secuencialmente con for...of y await (CERO uso de Promise.all) para evitar errores SQLITE_BUSY y 503 de Gemini
    try {
      for (const pageIdx of pageIndices) {
        let singlePageFilePath: string | null = null;
        try {
          console.log(`🔍 [Lote Secuencial] Procesando página ${pageIdx + 1} de ${pageCount}...`);

          // Crear un PDF independiente de 1 página
          const singlePageDoc = await PDFDocument.create();
          const [copiedPage] = await singlePageDoc.copyPages(pdfDoc, [pageIdx]);
          singlePageDoc.addPage(copiedPage);

          const singlePdfBytes = await singlePageDoc.save();
          const singlePdfBuffer = Buffer.from(singlePdfBytes);

          // Guardar permanentemente la página individual del alumno
          const pageExamFileName = `examen_${timePrefix}_p${pageIdx + 1}.pdf`;
          const pageExamFilePath = path.join(examenesDir, pageExamFileName);
          fs.writeFileSync(pageExamFilePath, singlePdfBuffer);
          const studentUrlPdf = `/uploads/examenes/${pageExamFileName}`;

          // Archivo temporal para calificar
          const pageFileName = `temp_examen_${timePrefix}_p${pageIdx + 1}.pdf`;
          singlePageFilePath = path.join(uploadsDir, pageFileName);
          fs.writeFileSync(singlePageFilePath, singlePdfBuffer);

          // Calificar la página con Gemini Multimodal
          console.log(`🤖 [Lote] Evaluando página ${pageIdx + 1}/${pageCount} con Gemini...`);
          const resultadoIA = await calificarExamenConGemini(
            singlePdfBuffer,
            'application/pdf',
            rubrica
          );

          // Determinar estado de revisión según confianza de lectura (boolean)
          const estadoRevision: EstadoRevision =
            resultadoIA.confianza_lectura && !resultadoIA.requiere_revision_humana
              ? 'aprobado_ia'
              : 'requiere_revision_manual';

          const desgloseSanitizado: DesglosePregunta[] = (resultadoIA.desglose_json || []).map((item) => ({
            ...item,
            justificacion: item.justificacion || '',
            observaciones: item.observaciones || '',
          }));

          // Generar PDF con feedback visual de marcas rojas si está solicitado
          let urlPdfFeedback: string | null = null;
          if (generarFeedback) {
            try {
              console.log(`📝 [Feedback] Generando PDF con marcas visuales para página ${pageIdx + 1}...`);
              const feedbackBuffer = await generarPdfRetroalimentacion(
                singlePdfBytes,
                resultadoIA.confianza_lectura ? resultadoIA.nota_total : 0,
                resultadoIA.nota_maxima || 20,
                desgloseSanitizado,
                resultadoIA.nombre_detectado || `Alumno Pág ${pageIdx + 1}`
              );
              const feedbackFileName = `feedback_${timePrefix}_p${pageIdx + 1}.pdf`;
              const feedbackFilePath = path.join(feedbackDir, feedbackFileName);
              fs.writeFileSync(feedbackFilePath, feedbackBuffer);
              urlPdfFeedback = `/uploads/feedback/${feedbackFileName}`;
            } catch (feedErr) {
              console.warn(`⚠️ No se pudo generar PDF de feedback para página ${pageIdx + 1}:`, feedErr);
            }
          }

          // Estructurar detalle_respuestas para el dashboard de analíticas
          const detalleRespuestas = desgloseSanitizado.map((item) => ({
            numero_pregunta: item.numero_pregunta,
            es_correcta: item.es_correcta,
            puntaje_obtenido: item.puntaje_obtenido,
            respuesta_detectada: item.respuesta_detectada,
            respuesta_correcta: item.respuesta_correcta,
          }));

          // Persistir examen en SQLite con Prisma de forma secuencial
          const nuevoExamen = await prisma.examenAlumno.create({
            data: {
              seccion_id: seccionId,
              evaluacion_id: evaluacionId,
              curso_id: cursoId,
              codigo_alumno: resultadoIA.codigo_alumno || '',
              nombre: resultadoIA.nombre_detectado || `Alumno Pág ${pageIdx + 1}`,
              nota_total: resultadoIA.confianza_lectura ? resultadoIA.nota_total : 0,
              nota_maxima: resultadoIA.nota_maxima || 20,
              confianza_lectura: resultadoIA.confianza_lectura,
              estado_revision: estadoRevision,
              url_pdf: studentUrlPdf,
              ruta_storage_pdf: pageExamFilePath,
              desglose_json: JSON.stringify(desgloseSanitizado),
              detalle_respuestas: JSON.stringify(detalleRespuestas),
              url_pdf_feedback: urlPdfFeedback,
              motivo_revision_manual: resultadoIA.motivo_revision_manual || '',
            },
          });

          console.log(`✅ [Lote] Examen guardado en SQLite (ID: ${nuevoExamen.id}, Alumno: ${nuevoExamen.nombre}, Feedback: ${Boolean(urlPdfFeedback)})`);

          examenesCreados.push({
            ...nuevoExamen,
            desglose_json: desgloseSanitizado,
            detalle_respuestas: detalleRespuestas,
          });
        } catch (pageError: any) {
          console.error(`❌ Error evaluando página ${pageIdx + 1} de ${pageCount}:`, pageError);
          throw pageError;
        } finally {
          // Prevención de Fuga de Memoria: eliminar físicamente el archivo PDF temporal de esa página
          if (singlePageFilePath && fs.existsSync(singlePageFilePath)) {
            try {
              fs.unlinkSync(singlePageFilePath);
              console.log(`🧹 Archivo temporal de página eliminado: ${singlePageFilePath}`);
            } catch (unlinkErr) {
              console.warn(`No se pudo eliminar archivo temporal ${singlePageFilePath}:`, unlinkErr);
            }
          }
        }
      }
    } finally {
      // Prevención de Fuga de Memoria: Al terminar el bucle completo, eliminar el PDF original de public/uploads/
      const possibleOriginalPaths = [
        filePath,
        urlPdf && urlPdf.startsWith('/uploads/') ? path.join(process.cwd(), 'public', urlPdf) : null,
        urlPdf ? path.join(uploadsDir, path.basename(urlPdf)) : null,
      ].filter(Boolean) as string[];

      for (const p of possibleOriginalPaths) {
        if (fs.existsSync(p)) {
          try {
            fs.unlinkSync(p);
            console.log(`🗑️ PDF original eliminado de disco para liberar espacio: ${p}`);
          } catch (origUnlinkErr) {
            console.warn(`No se pudo eliminar PDF original ${p}:`, origUnlinkErr);
          }
        }
      }
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
