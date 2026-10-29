'use client';

import React, { useEffect } from 'react';
import { X, ExternalLink, Download, FileText } from 'lucide-react';

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  studentName?: string;
  grade?: number;
  maxGrade?: number;
  confidence?: number;
}

export default function PdfViewerModal({
  isOpen,
  onClose,
  pdfUrl,
  studentName = 'Examen Escaneado',
  grade,
  maxGrade = 20,
  confidence,
}: PdfViewerModalProps) {
  // Manejo de la tecla ESC para cerrar el modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {studentName}
              </h3>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                {grade !== undefined && (
                  <span>
                    Nota:{' '}
                    <strong className="text-slate-800 font-semibold">
                      {grade}/{maxGrade}
                    </strong>
                  </span>
                )}
                {confidence !== undefined && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded font-semibold ${
                      confidence >= 85
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Confianza: {confidence}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              title="Descargar PDF"
            >
              <Download className="w-5 h-5" />
            </a>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visor de PDF embebido */}
        <div className="flex-1 w-full bg-slate-100 relative">
          {pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              title={`Examen de ${studentName}`}
              className="w-full h-full border-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
              <FileText className="w-16 h-16 stroke-1 mb-2" />
              <p className="text-sm font-medium">No se encontró la URL del documento PDF.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

