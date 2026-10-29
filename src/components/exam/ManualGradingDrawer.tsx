'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { ExamenAlumno } from '@/types/database';
import { actualizarExamenManual } from '@/lib/firebase/firestore.service';

interface ManualGradingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  examen: ExamenAlumno | null;
  onSavedSuccess?: (examenActualizado: ExamenAlumno) => void;
}

export default function ManualGradingDrawer({
  isOpen,
  onClose,
  examen,
  onSavedSuccess,
}: ManualGradingDrawerProps) {
  const [nuevaNota, setNuevaNota] = useState<string>('');
  const [motivoAjuste, setMotivoAjuste] = useState<string>('');
  const [revisorNombre, setRevisorNombre] = useState<string>('Profesor');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (examen) {
      setNuevaNota(examen.nota_total.toString());
      setMotivoAjuste(examen.motivo_revision_manual || 'Revisión y calibración manual de caligrafía.');
      setErrorMsg(null);
    }
  }, [examen]);

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

  if (!isOpen || !examen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const notaNum = parseFloat(nuevaNota);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > (examen.nota_maxima || 20)) {
      setErrorMsg(`La nota debe ser un número válido entre 0 y ${examen.nota_maxima || 20}.`);
      return;
    }

    if (!examen.id) {
      setErrorMsg('Identificador del examen no encontrado.');
      return;
    }

    setIsSaving(true);
    try {
      await actualizarExamenManual(
        examen.curso_id,
        examen.evaluacion_id,
        examen.seccion_id,
        examen.id,
        {
          nota_total: notaNum,
          estado_revision: 'corregido_manual',
          motivo_revision_manual: motivoAjuste,
          revisado_por: revisorNombre,
        }
      );

      const examenActualizado: ExamenAlumno = {
        ...examen,
        nota_total: notaNum,
        estado_revision: 'corregido_manual',
        motivo_revision_manual: motivoAjuste,
        revisado_por: revisorNombre,
      };

      onSavedSuccess?.(examenActualizado);
      onClose();
    } catch (err) {
      console.error('Error al actualizar examen manual:', err);
      setErrorMsg((err as Error).message || 'No se pudo guardar la calificación manual.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Revisión Manual: {examen.nombre}
                </h2>
                <p className="text-xs text-amber-700 font-medium">
                  Confianza de lectura IA: {examen.confianza_lectura}% (Bajo umbral)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body dividida en preview y formulario */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Alerta del motivo */}
            {examen.motivo_revision_manual && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong className="font-semibold">Alerta de la IA: </strong>
                  {examen.motivo_revision_manual}
                </div>
              </div>
            )}

            {/* Vista previa del PDF */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-500" /> Hoja de Examen Escaneada
                </label>
                <a
                  href={examen.url_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 hover:underline flex items-center gap-1"
                >
                  Abrir en pestaña nueva <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="h-72 w-full rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                <iframe
                  src={`${examen.url_pdf}#toolbar=0&navpanes=0`}
                  title={`Examen de ${examen.nombre}`}
                  className="w-full h-full border-none"
                />
              </div>
            </div>

            {/* Desglose de preguntas detectadas por la IA */}
            {examen.desglose_json && examen.desglose_json.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  Detección Ítem por Ítem (Gemini 1.5 Pro)
                </h4>
                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                  {examen.desglose_json.map((item) => (
                    <div
                      key={item.numero_pregunta}
                      className="px-3 py-2.5 space-y-1 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                            P{item.numero_pregunta}
                          </span>
                          {item.tipo_pregunta && item.tipo_pregunta !== 'opcion_multiple' && (
                            <span className="text-[10px] uppercase font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              {item.tipo_pregunta.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-slate-600 line-clamp-1">
                            Detectado: <strong className="font-semibold text-slate-900">{item.respuesta_detectada}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold ${
                              item.es_correcta ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            +{item.puntaje_obtenido} pts
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              item.confianza_item >= 80
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.confianza_item}% conf.
                          </span>
                        </div>
                      </div>

                      {/* Justificación semántica de la IA para preguntas multimodales */}
                      {item.justificacion && (
                        <p className="text-[11px] text-slate-500 italic pl-6">
                          Justificación IA: "{item.justificacion}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulario de Calificación Manual */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-200">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nota Total Definitiva (Máx. {examen.nota_maxima || 20})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={examen.nota_maxima || 20}
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-500">
                    Nota calculada por IA: {examen.nota_total}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Docente Revisor
                  </label>
                  <input
                    type="text"
                    value={revisorNombre}
                    onChange={(e) => setRevisorNombre(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones / Justificación de Corrección
                </label>
                <textarea
                  rows={3}
                  value={motivoAjuste}
                  onChange={(e) => setMotivoAjuste(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  placeholder="Explique las correcciones realizadas sobre las preguntas ambiguas..."
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Validar y Guardar Nota
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

