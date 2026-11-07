'use client';

import React, { useState, useEffect, use, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Edit3,
  Award,
  TrendingUp,
  Users,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  FileSpreadsheet,
  FileCheck,
} from 'lucide-react';
import { ExamenAlumno } from '@/types/database';
import PdfViewerModal from '@/components/exam/PdfViewerModal';
import ManualGradingDrawer from '@/components/exam/ManualGradingDrawer';
import Insights from '@/components/dashboard/Insights';
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

export default function ExamenesResultadosPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const seccionId = resolvedParams.id;
  const searchParams = useSearchParams();

  const { seccion, loading: loadingSeccion } = useSeccionDetalle(seccionId);

  const [activeTab, setActiveTab] = useState<'confiables' | 'revision'>('confiables');
  const [examenes, setExamenes] = useState<ExamenAlumno[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de eliminación y exportación
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sistema de Notificaciones Toast
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Estado del visor modal PDF
  const [selectedExamForView, setSelectedExamForView] = useState<ExamenAlumno | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado del Drawer de Calificación Manual
  const [selectedExamForGrading, setSelectedExamForGrading] = useState<ExamenAlumno | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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
      // Obtenemos todos los exámenes de la sección para clasificar en pestañas
      const res = await fetch(`/api/examenes?seccionId=${seccionId}`);
      if (!res.ok) throw new Error('Error al consultar los exámenes de la sección');
      const data: ExamenAlumno[] = await res.json();
      setExamenes(data);
    } catch (err: any) {
      console.error('Error cargando exámenes:', err);
      setError('No se pudieron obtener los exámenes de la sección.');
      notificar('Error al cargar exámenes: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarExamenes();
  }, [seccionId]);

  // Exámenes clasificados por confianza_lectura
  const examenesConfiables = useMemo(
    () => examenes.filter((item) => Boolean(item.confianza_lectura) === true),
    [examenes]
  );

  const examenesRevision = useMemo(
    () => examenes.filter((item) => Boolean(item.confianza_lectura) === false),
    [examenes]
  );

  // Estadísticas calculadas EXCLUSIVAMENTE sobre la tabla de exámenes confiables
  const estadisticas = useMemo(() => {
    const total = examenesConfiables.length;
    if (total === 0) {
      return {
        promedio: 0,
        maxima: 0,
        minima: 0,
        aprobados: 0,
        porcentajeAprobados: 0,
        total,
      };
    }

    const notas = examenesConfiables.map((e) => e.nota_total || 0);
    const suma = notas.reduce((acc, curr) => acc + curr, 0);
    const promedio = parseFloat((suma / total).toFixed(1));
    const maxima = Math.max(...notas);
    const minima = Math.min(...notas);
    const aprobados = notas.filter((n) => n >= 10.5).length;
    const porcentajeAprobados = Math.round((aprobados / total) * 100);

    return {
      promedio,
      maxima,
      minima,
      aprobados,
      porcentajeAprobados,
      total,
    };
  }, [examenesConfiables]);

  // Lista según pestaña activa y filtrada por buscador
  const listaActivaFiltrada = useMemo(() => {
    const origen = activeTab === 'confiables' ? examenesConfiables : examenesRevision;
    const term = searchTerm.trim().toLowerCase();
    if (!term) return origen;

    return origen.filter(
      (item) =>
        item.nombre.toLowerCase().includes(term) ||
        (item.codigo_alumno && item.codigo_alumno.toLowerCase().includes(term)) ||
        (item.motivo_revision_manual && item.motivo_revision_manual.toLowerCase().includes(term))
    );
  }, [activeTab, examenesConfiables, examenesRevision, searchTerm]);

  // Manejador para exportar notas a Excel (.xlsx) en formato USS
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

  // Manejador para eliminar examen
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

  const handleOpenPdf = (examen: ExamenAlumno) => {
    setSelectedExamForView(examen);
    setIsModalOpen(true);
  };

  const handleOpenFeedbackPdf = (examen: ExamenAlumno) => {
    if (!examen.url_pdf_feedback) return;
    setSelectedExamForView({
      ...examen,
      url_pdf: examen.url_pdf_feedback,
      nombre: `[Feedback Visual] ${examen.nombre}`,
    });
    setIsModalOpen(true);
  };

  const handleOpenManualGrade = (examen: ExamenAlumno) => {
    setSelectedExamForGrading(examen);
    setIsDrawerOpen(true);
  };

  // Al guardar calificación manual exitosamente
  const handleSavedManualGrade = (examenActualizado: ExamenAlumno) => {
    setExamenes((prev) =>
      prev.map((item) => (item.id === examenActualizado.id ? examenActualizado : item))
    );
    notificar(
      `Examen de "${examenActualizado.nombre}" validado y movido a la tabla de calificados confiables.`,
      'exito'
    );
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

      {/* Cabecera Principal y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <SectionBreadcrumb
            seccion={seccion}
            loading={loadingSeccion}
            paginaActual="Resultados y Calificaciones"
          />
          {loadingSeccion ? (
            <div className="space-y-1.5 mt-1">
              <div className="h-8 w-72 sm:w-96 bg-slate-200 animate-pulse rounded-xl" />
              <div className="h-4 w-60 sm:w-80 bg-slate-100 animate-pulse rounded" />
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                Resultados: {seccion ? seccion.nombre : 'Sección'}{' '}
                <span className="text-amber-600 font-semibold text-base sm:text-xl block sm:inline">
                  ({seccion?.evaluacion?.titulo || 'Evaluación'} — {seccion?.evaluacion?.curso?.nombre || 'Curso'})
                </span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {seccion?.evaluacion?.curso?.codigo ? `${seccion.evaluacion.curso.codigo} • ` : ''}
                Gestión de exámenes evaluados con Gemini 1.5 Pro, feedback visual y persistencia SQLite.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón Exportar Notas (USS) */}
          <button
            onClick={handleExportarExcel}
            disabled={isExporting || examenesConfiables.length === 0}
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

      {/* DASHBOARD DE ANALÍTICAS DE DIFICULTAD (INSIGHTS) */}
      <Insights examenes={examenes} />

      {/* Tarjetas de Estadísticas (Calculadas Exclusivamente sobre Exámenes Confiables) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Promedio Sección</div>
            <div className="text-xl font-bold text-slate-900">
              {estadisticas.promedio} <span className="text-xs font-normal text-slate-400">/ 20</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Nota Máxima / Mínima</div>
            <div className="text-xl font-bold text-slate-900">
              {estadisticas.maxima} <span className="text-xs font-normal text-slate-400">/ {estadisticas.minima}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Aprobados</div>
            <div className="text-xl font-bold text-slate-900">
              {estadisticas.porcentajeAprobados}%{' '}
              <span className="text-xs font-normal text-slate-400">({estadisticas.aprobados}/{estadisticas.total})</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Calificados Confiables</div>
            <div className="text-xl font-bold text-slate-900">
              {estadisticas.total}{' '}
              <span className="text-xs font-normal text-slate-400">alumnos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conmutador de Pestañas (Tabs) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        <button
          onClick={() => {
            setActiveTab('confiables');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 -mb-px ${
            activeTab === 'confiables'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Tabla Principal (Confiables)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === 'confiables'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {examenesConfiables.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('revision');
            setSearchTerm('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all cursor-pointer border-b-2 -mb-px ${
            activeTab === 'revision'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>Bandeja de Revisión Urgente</span>
          {examenesRevision.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 animate-pulse">
              {examenesRevision.length}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
              0
            </span>
          )}
        </button>
      </div>

      {/* Alerta contextual para la Bandeja de Revisión Urgente */}
      {activeTab === 'revision' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex items-start gap-3.5">
          <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-rose-900">
              Atención Docente Requerida: Exámenes No Confiables
            </h3>
            <p className="text-xs text-rose-700 leading-relaxed">
              Los siguientes exámenes presentaron <strong>caligrafía ilegible, respuestas en blanco, archivos corruptos o inconsistencias</strong>. Para salvaguardar la justicia evaluativa, la nota automatizada se mantiene <strong>oculta</strong> y no se incluye en los promedios de la sección hasta que sean revisados y calificados manualmente.
            </p>
          </div>
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'confiables'
                ? 'Buscar por nombre o código de alumno...'
                : 'Buscar por nombre, código o motivo de revisión...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Mostrando: <strong className="text-slate-800">{listaActivaFiltrada.length}</strong> de{' '}
          {activeTab === 'confiables' ? examenesConfiables.length : examenesRevision.length}
        </div>
      </div>

      {/* Estados de Carga o Vacío */}
      {isLoading ? (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-600">Cargando registros de exámenes...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : listaActivaFiltrada.length === 0 ? (
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center">
          {activeTab === 'confiables' ? (
            <>
              <FileText className="w-12 h-12 text-slate-300 stroke-1 mb-3" />
              <h3 className="text-base font-semibold text-slate-800">
                No hay exámenes calificados confiables
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Los exámenes con caligrafía nítida verificada por Gemini aparecerán en esta tabla.
              </p>
            </>
          ) : (
            <>
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full mb-3">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">¡Bandeja de revisión al día!</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                No hay exámenes con problemas de lectura o caligrafía pendientes de verificación humana.
              </p>
            </>
          )}
        </div>
      ) : activeTab === 'confiables' ? (
        /* PESTAÑA 1: TABLA PRINCIPAL (EXÁMENES CONFIABLES) */
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
                  <th className="py-3.5 px-6 text-center">Caligrafía & Lectura</th>
                  <th className="py-3.5 px-6 text-center">Estado</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {listaActivaFiltrada.map((item) => (
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
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Confiable / Legible
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                        {item.estado_revision.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        {/* Botón Ver Feedback Visual (si existe) */}
                        {item.url_pdf_feedback && (
                          <button
                            onClick={() => handleOpenFeedbackPdf(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer shadow-xs"
                            title="Ver examen con marcas rojas de retroalimentación"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-rose-600" />
                            <span>Feedback</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenPdf(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 cursor-pointer"
                          title="Ver examen escaneado"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>

                        <button
                          onClick={() => handleOpenManualGrade(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="Editar nota manualmente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
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
      ) : (
        /* PESTAÑA 2: BANDEJA DE REVISIÓN URGENTE (EXÁMENES NO CONFIABLES) */
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-rose-100 bg-rose-50/75 text-rose-900 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Estudiante / Código</th>
                  <th className="py-3.5 px-6 text-center">Nota Automatizada</th>
                  <th className="py-3.5 px-6 text-center">Diagnóstico IA</th>
                  <th className="py-3.5 px-6">Motivo de Revisión Manual</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 text-sm">
                {listaActivaFiltrada.map((item) => (
                  <tr key={item.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">{item.nombre}</div>
                      <div className="text-xs text-slate-400">
                        {item.codigo_alumno ? `Código: ${item.codigo_alumno}` : 'Sin código detectado'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200" title="Nota oculta para evitar calificaciones erróneas">
                        Oculta (No confiable)
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Requiere Revisión
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 font-medium max-w-md">
                        {item.motivo_revision_manual || 'Examen con caligrafía ilegible, hoja en blanco o formato irreconocible.'}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        {/* Botón Feedback si se generó */}
                        {item.url_pdf_feedback && (
                          <button
                            onClick={() => handleOpenFeedbackPdf(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 cursor-pointer shadow-xs"
                            title="Ver feedback generado"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-rose-600" />
                            <span>Feedback</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenManualGrade(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-xs cursor-pointer"
                          title="Abrir visor para calificar manualmente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ver y Calificar</span>
                        </button>
                        <button
                          onClick={() => handleOpenPdf(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="Inspeccionar PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
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
      {selectedExamForView && (
        <PdfViewerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pdfUrl={selectedExamForView.url_pdf}
          studentName={selectedExamForView.nombre}
          grade={selectedExamForView.nota_total}
          maxGrade={selectedExamForView.nota_maxima}
          confidence={selectedExamForView.confianza_lectura}
        />
      )}

      {/* Drawer Lateral de Calificación Manual */}
      <ManualGradingDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        examen={selectedExamForGrading}
        onSavedSuccess={handleSavedManualGrade}
      />
    </div>
  );
}
