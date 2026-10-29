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
} from 'lucide-react';
import { listarExamenesAprobadosIA } from '@/lib/firebase/firestore.service';
import { ExamenAlumno } from '@/types/database';
import PdfViewerModal from '@/components/exam/PdfViewerModal';

interface PageProps {
  params: Promise<{ id: string }>;
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

  // Estado del visor modal
  const [selectedExam, setSelectedExam] = useState<ExamenAlumno | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cargarExamenes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listarExamenesAprobadosIA(cursoId, evaluacionId, seccionId);
      setExamenes(data);
    } catch (err) {
      console.error('Error cargando aprobados por IA:', err);
      setError('No se pudieron obtener los exámenes calificados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarExamenes();
  }, [cursoId, evaluacionId, seccionId]);

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
    <div className="space-y-6">
      {/* Encabezado y Métricas */}
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

        <button
          onClick={cargarExamenes}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refrescar
        </button>
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
                      <button
                        onClick={() => handleOpenPdf(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Examen
                      </button>
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

