'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { uploadHeavyPdf } from '@/lib/firebase/storage.service';
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
    setProgressPercent(0);
    setStatusMessage(`Subiendo ${file.name} a Firebase Storage...`);

    try {
      // 3. Subida reanudable con control de progreso
      const storageResult = await uploadHeavyPdf({
        file,
        folderPath: `cursos/${cursoId}/evaluaciones/${evaluacionId}/secciones/${seccionId}/examenes`,
        fileName: file.name,
        onProgress: (percent) => {
          setProgressPercent(percent);
          setStatusMessage(`Subiendo a la nube: ${percent}% completado...`);
        },
      });

      // 4. Iniciar análisis de visión computacional con Gemini 1.5 Pro
      setUploadState('grading');
      setStatusMessage('Gemini 1.5 Pro analizando caligrafía y contrastando con la rúbrica...');

      const response = await fetch('/api/grade-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cursoId,
          evaluacionId,
          seccionId,
          urlPdf: storageResult.downloadUrl,
          storagePath: storageResult.storagePath,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error durante la calificación del examen.');
      }

      setUploadState('success');
      setLastExamResult(data.examen);
      setStatusMessage(
        `¡Examen de "${data.examen.nombre}" procesado con éxito! Nota: ${data.examen.nota_total}/${data.examen.nota_maxima || 20}`
      );
      onGradingSuccess?.(data.examen);
    } catch (err) {
      console.error('Error en proceso de subida y calificación:', err);
      setUploadState('error');
      const msg = (err as Error).message || 'Ocurrió un error inesperado al procesar el examen.';
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
    <div className="w-full max-w-3xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => uploadState !== 'uploading' && uploadState !== 'grading' && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
          isDragging
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
                Soporte para documentos de hasta <strong className="font-semibold text-slate-700">100 MB</strong>. Detección automática por visión computacional.
              </p>
            </div>
          </div>
        )}

        {/* Estado: Subiendo a Firebase Storage */}
        {uploadState === 'uploading' && (
          <div className="w-full flex flex-col items-center space-y-4 py-2">
            <div className="p-4 bg-blue-100 text-blue-700 rounded-full animate-pulse">
              <FileText className="w-10 h-10" />
            </div>
            <div className="w-full max-w-md">
              <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                <span>{currentFile?.name}</span>
                <span>{progressPercent}%</span>
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

        {/* Estado: Calificando con Gemini 1.5 Pro */}
        {uploadState === 'grading' && (
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="relative">
              <div className="p-4 bg-amber-100 text-amber-700 rounded-full">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-slate-800">Evaluando con Gemini 1.5 Pro</p>
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
                Confianza de lectura: {lastExamResult.confianza_lectura}%
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

