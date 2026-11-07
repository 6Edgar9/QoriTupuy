'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { ExamenAlumno } from '@/types/database';

interface PdfDropzoneProps {
  cursoId: string;
  evaluacionId: string;
  seccionId: string;
  onGradingSuccess?: (examen: ExamenAlumno) => void;
  onGradingError?: (errorMsg: string) => void;
}

type UploadState = 'idle' | 'uploading' | 'grading' | 'success' | 'error';

export default function PdfDropzone({
  cursoId,
  evaluacionId,
  seccionId,
  onGradingSuccess,
  onGradingError,
}: PdfDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [generarFeedback, setGenerarFeedback] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastExamResult, setLastExamResult] = useState<ExamenAlumno | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const validateAndProcessFile = async (file: File) => {
    // 1. Validar tipo
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadState('error');
      const err = 'Formato no soportado: Por favor arrastra un archivo en formato PDF.';
      setStatusMessage(err);
      onGradingError?.(err);
      return;
    }

    // 2. Validar tamaño (máximo 100MB)
    const MAX_SIZE_MB = 100;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadState('error');
      const err = `El archivo excede el tamaño máximo permitido de ${MAX_SIZE_MB}MB.`;
      setStatusMessage(err);
      onGradingError?.(err);
      return;
    }

    setCurrentFile(file);
    setUploadState('uploading');
    setProgressPercent(20);
    setStatusMessage(`Guardando ${file.name} localmente en public/uploads/...`);

    try {
      // 3. Subida local mediante FormData hacia /api/upload-local
      const formData = new FormData();
      formData.append('file', file);

      setProgressPercent(45);
      const uploadRes = await fetch('/api/upload-local', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Error al guardar el archivo PDF en disco.');
      }

      setProgressPercent(100);
      console.log('✅ Archivo guardado localmente:', uploadData);

      // 4. Iniciar análisis multimodal con Gemini pasando la ruta local
      setUploadState('grading');
      setStatusMessage('Gemini procesando caligrafía contra la rúbrica...');

      const gradeRes = await fetch('/api/grade-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cursoId,
          evaluacionId,
          seccionId,
          urlPdf: uploadData.publicUrl,       // Ruta pública (ej: /uploads/archivo.pdf) para el visor iframe
          filePath: uploadData.absolutePath,  // Ruta absoluta en disco para lectura fs directa
          storagePath: uploadData.publicUrl,
          generarFeedback,
        }),
      });

      const gradeData = await gradeRes.json();

      if (!gradeRes.ok || !gradeData.success) {
        // Detectar si la respuesta es por sobrecarga/demanda de IA
        if (gradeRes.status === 503 || gradeData.isOverloaded || (gradeData.error && gradeData.error.includes('saturados'))) {
          throw new Error('Los servidores de Inteligencia Artificial están saturados globalmente. Tu examen no se pudo evaluar. Por favor, intenta de nuevo en unos minutos.');
        }
        throw new Error(gradeData.error || 'Error durante la calificación del examen.');
      }

      setUploadState('success');
      const listaExamenes: ExamenAlumno[] = gradeData.examenes || (gradeData.examen ? [gradeData.examen] : []);
      const primerExamen = listaExamenes[0] || gradeData.examen;
      setLastExamResult(primerExamen);

      if (listaExamenes.length > 1) {
        setStatusMessage(
          `¡Lote de ${listaExamenes.length} exámenes evaluado con éxito y guardado en SQLite local!`
        );
        listaExamenes.forEach((ex) => onGradingSuccess?.(ex));
      } else if (primerExamen) {
        setStatusMessage(
          `¡Examen de "${primerExamen.nombre}" evaluado con éxito! Nota: ${primerExamen.nota_total}/${primerExamen.nota_maxima || 20}`
        );
        onGradingSuccess?.(primerExamen);
      }
    } catch (err: any) {
      console.error('Error en proceso de subida y calificación:', err);
      setUploadState('error');
      let msg = err.message || 'Ocurrió un error inesperado al procesar el examen.';

      // Limpieza preventiva si se filtró algún JSON de error crudo o fallo de red
      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('SERVICE_OVERLOADED')) {
        msg = 'Los servidores de Inteligencia Artificial están saturados globalmente. Tu examen no se pudo evaluar. Por favor, intenta de nuevo en unos minutos.';
      } else if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('ENOTFOUND')) {
        msg = 'Hubo una interrupción temporal de conexión con el proveedor de IA. Por favor, verifica tu conexión a internet y vuelve a intentar.';
      }

      setStatusMessage(msg);
      onGradingError?.(msg);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const resetUploader = () => {
    setUploadState('idle');
    setProgressPercent(0);
    setCurrentFile(null);
    setStatusMessage('');
    setLastExamResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      {/* Control Switch: Generar PDF de Retroalimentación */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800">
              Generar PDF de Retroalimentación (Marcas Rojas)
            </span>
            <p className="text-[11px] text-slate-500">
              Estampa la nota final y preguntas falladas en el PDF usando pdf-lib
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={generarFeedback}
            onChange={(e) => setGenerarFeedback(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
        </label>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => uploadState !== 'uploading' && uploadState !== 'grading' && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center ${isDragging
            ? 'border-amber-500 bg-amber-50/50 scale-[1.01]'
            : uploadState === 'error'
              ? 'border-red-400 bg-red-50/40'
              : uploadState === 'success'
                ? 'border-emerald-500 bg-emerald-50/40'
                : 'border-slate-300 hover:border-amber-500 hover:bg-slate-50/80 bg-white'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={uploadState === 'uploading' || uploadState === 'grading'}
          className="hidden"
        />

        {/* Estado: Idle */}
        {uploadState === 'idle' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-amber-100/70 text-amber-800 rounded-full">
              <UploadCloud className="w-10 h-10" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-800">
                Arrastra aquí el examen escaneado en PDF o <span className="text-amber-700 underline">haz clic para examinar</span>
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Almacenamiento y persistencia 100% local (File System + SQLite con Prisma ORM, sin latencia ni cuellos de botella de red).
              </p>
            </div>
          </div>
        )}

        {/* Estado: Guardando en disco local */}
        {uploadState === 'uploading' && (
          <div className="w-full flex flex-col items-center space-y-4 py-2">
            <div className="p-4 bg-blue-100 text-blue-700 rounded-full animate-pulse">
              <FileText className="w-10 h-10" />
            </div>
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                <span>{currentFile?.name}</span>
                <span>Guardando en servidor local...</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-slate-600">{statusMessage}</p>
          </div>
        )}

        {/* Estado: Calificando con Gemini */}
        {uploadState === 'grading' && (
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="relative">
              <div className="p-4 bg-amber-100 text-amber-700 rounded-full">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-800">Evaluando con Gemini Multimodal</p>
              <p className="text-sm text-slate-600 mt-1">{statusMessage}</p>
            </div>
          </div>
        )}

        {/* Estado: Éxito */}
        {uploadState === 'success' && lastExamResult && (
          <div className="flex flex-col items-center space-y-4 py-2">
            <div className="p-4 bg-emerald-100 text-emerald-700 rounded-full">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-emerald-800">¡Calificación Completada!</p>
              <p className="text-sm text-slate-700 mt-1">{statusMessage}</p>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                {lastExamResult.confianza_lectura ? 'Lectura Confiable' : 'Requiere Revisión Docente'}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetUploader();
              }}
              className="mt-2 px-4 py-2 text-sm font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm"
            >
              Subir otro examen
            </button>
          </div>
        )}

        {/* Estado: Error */}
        {uploadState === 'error' && (
          <div className="flex flex-col items-center space-y-4 py-2">
            <div className="p-4 bg-red-100 text-red-600 rounded-full">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-red-800">Error en el procesamiento</p>
              <p className="text-sm text-red-600 mt-1 max-w-md">{statusMessage}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetUploader();
              }}
              className="mt-2 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
