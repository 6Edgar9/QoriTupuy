'use client';

import React, { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowUpDown,
  Eye,
  Loader2,
  RefreshCw,
  Trash2,
  CheckCircle2,
  X,
  Info,
} from 'lucide-react';
import { ExamenAlumno } from '@/types/database';
import PdfViewerModal from '@/components/exam/PdfViewerModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Toast {
  id: string;
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

export default function ExamenesAprobadosPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const seccionId = resolvedParams.id;
  const searchParams = useSearchParams();

  const cursoId = searchParams.get('cursoId') || 'curso_demo';
  const evaluacionId = searchParams.get('evaluacionId') || 'eval_demo';

  const [examenes, setExamenes] = useState<ExamenAlumno[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Sistema de Notificaciones Toast
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Estado del visor modal
  const [selectedExam, setSelectedExam] = useState<ExamenAlumno | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const notificar = (mensaje: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const cargarExamenes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/examenes?seccionId=${seccionId}&tipo=aprobados`);
      if (!res.ok) throw new Error('Error al consultar exámenes calificados');
      const data: ExamenAlumno[] = await res.json();
      setExamenes(data);
    } catch (err: any) {
      console.error('Error cargando aprobados por IA:', err);
      setError('No se pudieron obtener los exámenes calificados.');
      notificar('Error al cargar exámenes: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarExamenes();
  }, [cursoId, evaluacionId, seccionId]);

  // Manejador para eliminar un examen individual
  const handleEliminarExamen = async (examen: ExamenAlumno) => {
    if (!examen.id) return;
    const confirmacion = window.confirm(
      `¿Deseas eliminar permanentemente el examen de "${examen.nombre}"?`
    );
    if (!confirmacion) return;

    setDeletingId(examen.id);
    try {
      const res = await fetch(`/api/examenes/${examen.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al eliminar el examen');
      }

      setExamenes((prev) => prev.filter((item) => item.id !== examen.id));
      notificar(`Examen de "${examen.nombre}" eliminado correctamente.`, 'exito');
    } catch (err: any) {
      console.error('Error al eliminar examen:', err);
      notificar('No se pudo eliminar el examen: ' + err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Manejador para vaciar todos los exámenes de la sección
  const handleVaciarRegistro = async () => {
    const confirmacion = window.confirm(
      '⚠️ ¿Estás completamente seguro de que deseas VACIAR todos los exámenes de esta sección?\n\nEsta acción eliminará todos los registros de SQLite permanentemente.'
    );
    if (!confirmacion) return;

    setIsClearing(true);
    try {
      const res = await fetch(`/api/secciones/${seccionId}/vaciar`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al vaciar los exámenes');
      }
      const data = await res.json();
      setExamenes([]);
      notificar(data.message || 'Se han eliminado todos los exámenes de la sección.', 'exito');
    } catch (err: any) {
      console.error('Error al vaciar exámenes:', err);
      notificar('Error al vaciar la sección: ' + err.message, 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Filtrado local por término de búsqueda
  const examenesFiltrados = examenes.filter((item) =>
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.codigo_alumno && item.codigo_alumno.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenPdf = (examen: ExamenAlumno) => {
    setSelectedExam(examen);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* Sistema de Toasts */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-sm transition-all duration-300 animate-in slide-in-from-top-2 ${
              toast.tipo === 'exito'
                ? 'bg-emerald-900/90 text-white border-emerald-700 backdrop-blur-md'
                : toast.tipo === 'error'
                ? 'bg-rose-900/90 text-white border-rose-700 backdrop-blur-md'
                : 'bg-slate-900/90 text-white border-slate-700 backdrop-blur-md'
            }`}
          >
            {toast.tipo === 'exito' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.tipo === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.tipo === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="font-medium text-xs leading-relaxed">{toast.mensaje}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-white/60 hover:text-white shrink-0 ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">
              Exámenes Aprobados por IA
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Confianza &ge; 85%
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Alumnos con caligrafía nítida verificada automáticamente por visión de Gemini 1.5 Pro.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón Vaciar Registro */}
          <button
            onClick={handleVaciarRegistro}
            disabled={isClearing || examenes.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-xs disabled:opacity-40 cursor-pointer"
            title="Eliminar todos los exámenes de esta sección"
          >
            {isClearing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>Vaciar Registro de Notas</span>
          </button>

          {/* Botón Refrescar */}
          <button
            onClick={cargarExamenes}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código de alumno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total calificados: <strong className="text-slate-800">{examenesFiltrados.length}</strong>
        </div>
      </div>

      {/* Estado de Carga */}
      {isLoading ? (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Cargando lista ordenada de exámenes...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : examenesFiltrados.length === 0 ? (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <FileText className="w-12 h-12 text-slate-300 stroke-1 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No hay exámenes calificados en esta categoría</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Los exámenes procesados con confianza superior o igual a 85% aparecerán listados aquí en orden alfabético.
          </p>
        </div>
      ) : (
        /* Tabla Principal de Calificados A-Z */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6 flex items-center gap-1.5 cursor-pointer">
                    <span>Nombre del Alumno</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </th>
                  <th className="py-3.5 px-6">Código / DNI</th>
                  <th className="py-3.5 px-6 text-center">Nota Final</th>
                  <th className="py-3.5 px-6 text-center">Confianza IA</th>
                  <th className="py-3.5 px-6 text-center">Estado</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {examenesFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      {item.nombre}
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {item.codigo_alumno || '—'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-bold text-slate-900 text-base">
                        {item.nota_total}
                      </span>
                      <span className="text-xs text-slate-400 font-normal">
                        /{item.nota_maxima || 20}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {item.confianza_lectura}%
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                        {item.estado_revision.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenPdf(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Examen</span>
                        </button>
                        <button
                          onClick={() => handleEliminarExamen(item)}
                          disabled={deletingId === item.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200 cursor-pointer disabled:opacity-50"
                          title="Eliminar este examen"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Visualizador de PDF */}
      {selectedExam && (
        <PdfViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pdfUrl={selectedExam.url_pdf}
          studentName={selectedExam.nombre}
          grade={selectedExam.nota_total}
          maxGrade={selectedExam.nota_maxima}
          confidence={selectedExam.confianza_lectura}
        />
      )}
    </div>
  );
}
