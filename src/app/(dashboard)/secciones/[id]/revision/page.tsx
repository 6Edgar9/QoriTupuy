'use client';

import React, { useState, useEffect, use } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Edit3,
  Loader2,
  RefreshCw,
  Trash2,
  X,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import { ExamenAlumno } from '@/types/database';
import ManualGradingDrawer from '@/components/exam/ManualGradingDrawer';
import { useSeccionDetalle } from '@/hooks/useSeccionDetalle';
import SectionBreadcrumb from '@/components/navigation/SectionBreadcrumb';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface Toast {
  id: string;
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

export default function BandejaRevisionPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const seccionId = resolvedParams.id;
  const searchParams = useSearchParams();

  const { seccion, loading: loadingSeccion } = useSeccionDetalle(seccionId);

  const [examenes, setExamenes] = useState<ExamenAlumno[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de eliminación y exportación
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Notificaciones Toast
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Estado del Drawer de corrección manual
  const [selectedExam, setSelectedExam] = useState<ExamenAlumno | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const notificar = (mensaje: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const cargarExamenesRevision = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/examenes?seccionId=${seccionId}&tipo=revision`);
      if (!res.ok) throw new Error('Error al consultar exámenes para revisión');
      const data: ExamenAlumno[] = await res.json();
      setExamenes(data);
    } catch (err: any) {
      console.error('Error cargando exámenes para revisión manual:', err);
      setError('No se pudieron obtener los exámenes de la bandeja de revisión.');
      notificar('Error al cargar exámenes de revisión: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarExamenesRevision();
  }, [seccionId]);

  // Manejador para exportar a Excel USS
  const handleExportarExcel = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/secciones/${seccionId}/exportar`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al exportar a Excel');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Notas_Seccion_${seccionId}_USS.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      notificar('Registro de notas en formato Excel USS generado con éxito.', 'exito');
    } catch (err: any) {
      console.error('Error al exportar:', err);
      notificar('No se pudo exportar a Excel: ' + err.message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenDrawer = (examen: ExamenAlumno) => {
    setSelectedExam(examen);
    setIsDrawerOpen(true);
  };

  const handleSavedSuccess = (examenActualizado: ExamenAlumno) => {
    // Al haber sido corregido manualmente, lo retiramos de la lista de revisión pendiente
    setExamenes((prev) => prev.filter((item) => item.id !== examenActualizado.id));
    notificar(`Examen de "${examenActualizado.nombre}" corregido y calibrado con éxito.`, 'exito');
  };

  // Eliminar examen individual
  const handleEliminarExamen = async (examen: ExamenAlumno) => {
    if (!examen.id) return;
    const confirmacion = window.confirm(
      `¿Deseas eliminar permanentemente el examen de "${examen.nombre}" de la bandeja de revisión?`
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

  // Vaciar todos los exámenes de la sección
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

  const examenesFiltrados = examenes.filter((item) =>
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.codigo_alumno && item.codigo_alumno.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

      {/* Migas de pan legibles */}
      <SectionBreadcrumb
        seccion={seccion}
        loading={loadingSeccion}
        paginaActual="Bandeja de Revisión"
      />

      {/* Banner de Alerta Informativo y Acciones */}
      <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Bandeja de Revisión:{' '}
              {loadingSeccion ? (
                <span className="inline-block w-40 h-5 bg-amber-200/50 animate-pulse rounded align-middle" />
              ) : (
                <>
                  {seccion?.nombre || 'Sección'}{' '}
                  <span className="text-amber-800 font-medium text-sm sm:text-base">
                    ({seccion?.evaluacion?.titulo || 'Evaluación'} — {seccion?.evaluacion?.curso?.nombre || 'Curso'})
                  </span>
                </>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {seccion?.evaluacion?.curso?.codigo ? `${seccion.evaluacion.curso.codigo} • ` : ''}
              Exámenes detectados con caligrafía ilegible, hoja en blanco, archivos corruptos o inconsistencias. Requieren validación docente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Botón Exportar Notas (USS) */}
          <button
            onClick={handleExportarExcel}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-xs disabled:opacity-40 cursor-pointer"
            title="Descargar registro de notas oficial en formato Excel USS (.xlsx)"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            )}
            <span>Exportar Notas (USS)</span>
          </button>

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
            <span>Vaciar Registro</span>
          </button>

          {/* Botón Recargar */}
          <button
            onClick={cargarExamenesRevision}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Recargar Bandeja</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en pendientes de revisión..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
          Pendientes de resolver: {examenesFiltrados.length}
        </div>
      </div>

      {/* Estados de Carga y Vacío */}
      {isLoading ? (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Comprobando exámenes en revisión...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : examenesFiltrados.length === 0 ? (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full mb-3">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">¡Bandeja al día!</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            No hay exámenes con dudas caligráficas pendientes de resolución humana en esta sección.
          </p>
        </div>
      ) : (
        /* Tabla de Revisión Manual */
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-amber-100 bg-amber-50/60 text-amber-900 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Estudiante</th>
                  <th className="py-3.5 px-6 text-center">Nota Estimada IA</th>
                  <th className="py-3.5 px-6 text-center">Nivel Confianza</th>
                  <th className="py-3.5 px-6">Motivo de Alerta</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {examenesFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">{item.nombre}</div>
                      <div className="text-xs text-slate-400">{item.codigo_alumno || 'Sin código'}</div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        Oculta (No confiable)
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        Requiere Revisión
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-xs text-slate-600 max-w-md line-clamp-2">
                        {item.motivo_revision_manual || 'Caligrafía ambigua en una o más respuestas.'}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDrawer(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all shadow-sm cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ver y Corregir</span>
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

      {/* Drawer Lateral de Calificación Manual */}
      <ManualGradingDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        examen={selectedExam}
        onSavedSuccess={handleSavedSuccess}
      />
    </div>
  );
}
