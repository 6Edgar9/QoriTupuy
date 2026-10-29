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
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { listarExamenesRevisionManual } from '@/lib/firebase/firestore.service';
import { ExamenAlumno } from '@/types/database';
import ManualGradingDrawer from '@/components/exam/ManualGradingDrawer';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function BandejaRevisionPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const seccionId = resolvedParams.id;
  const searchParams = useSearchParams();

  const cursoId = searchParams.get('cursoId') || 'curso_demo';
  const evaluacionId = searchParams.get('evaluacionId') || 'eval_demo';

  const [examenes, setExamenes] = useState<ExamenAlumno[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado del Drawer de corrección manual
  const [selectedExam, setSelectedExam] = useState<ExamenAlumno | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const cargarExamenesRevision = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listarExamenesRevisionManual(cursoId, evaluacionId, seccionId);
      setExamenes(data);
    } catch (err) {
      console.error('Error cargando exámenes para revisión manual:', err);
      setError('No se pudieron obtener los exámenes de la bandeja de revisión.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarExamenesRevision();
  }, [cursoId, evaluacionId, seccionId]);

  const handleOpenDrawer = (examen: ExamenAlumno) => {
    setSelectedExam(examen);
    setIsDrawerOpen(true);
  };

  const handleSavedSuccess = (examenActualizado: ExamenAlumno) => {
    // Al haber sido corregido manualmente, lo retiramos de la lista de revisión pendiente
    setExamenes((prev) => prev.filter((item) => item.id !== examenActualizado.id));
  };

  const examenesFiltrados = examenes.filter((item) =>
    item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.codigo_alumno && item.codigo_alumno.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Banner de Alerta Informativo */}
      <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Bandeja de Revisión Manual Requerida
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Exámenes cuya certeza caligráfica fue menor a <strong className="text-amber-800">85%</strong> o presentaron borrones y ambigüedades. Requieren validación docente.
            </p>
          </div>
        </div>

        <button
          onClick={cargarExamenesRevision}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-sm shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Recargar Bandeja
        </button>
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
                  <th className="py-3.5 px-6 text-right">Acción</th>
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
                      <span className="font-bold text-slate-700">
                        {item.nota_total}
                      </span>
                      <span className="text-xs text-slate-400">/{item.nota_maxima || 20}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        {item.confianza_lectura}%
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-xs text-slate-600 max-w-md line-clamp-2">
                        {item.motivo_revision_manual || 'Caligrafía ambigua en una o más respuestas.'}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleOpenDrawer(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-all shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Ver y Corregir
                      </button>
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

