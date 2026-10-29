'use client';

import React, { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck,
  AlertTriangle,
  UploadCloud,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import PdfDropzone from '@/components/upload/PdfDropzone';
import { ExamenAlumno } from '@/types/database';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SeccionDashboardPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const seccionId = resolvedParams.id;
  const searchParams = useSearchParams();

  const cursoId = searchParams.get('cursoId') || 'MAT-201';
  const evaluacionId = searchParams.get('evaluacionId') || 'PARCIAL-1';

  const [ultimosProcesados, setUltimosProcesados] = useState<ExamenAlumno[]>([]);

  const handleGradingSuccess = (examen: ExamenAlumno) => {
    setUltimosProcesados((prev) => [examen, ...prev]);
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb y Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <span>Cursos</span>
            <span>/</span>
            <span>{cursoId}</span>
            <span>/</span>
            <span>{evaluacionId}</span>
            <span>/</span>
            <span className="text-amber-700 font-bold uppercase">{seccionId}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Gestión de Evaluación: <span className="text-amber-600 capitalize">{seccionId.replace('-', ' ')}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sube exámenes manuscritos escaneados para su evaluación instantánea mediante visión computacional.
          </p>
        </div>

        {/* Accesos rápidos a las dos tablas */}
        <div className="flex items-center gap-3">
          <Link
            href={`/secciones/${seccionId}/calificados?cursoId=${cursoId}&evaluacionId=${evaluacionId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-sm"
          >
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Ver Calificados (&ge;85%)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            href={`/secciones/${seccionId}/revision?cursoId=${cursoId}&evaluacionId=${evaluacionId}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-all shadow-sm"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Bandeja Revisión (&lt;85%)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Zona de Subida Masiva */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="mb-6 text-center max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5" />
            Inferencia en tiempo real
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Cargar Exámenes Escaneados
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Los PDFs se almacenan en Firebase Cloud Storage y se envían de forma automática a Gemini 1.5 Pro contrastando la rúbrica de esta sección.
          </p>
        </div>

        <PdfDropzone
          cursoId={cursoId}
          evaluacionId={evaluacionId}
          seccionId={seccionId}
          onGradingSuccess={handleGradingSuccess}
        />
      </div>

      {/* Últimos exámenes procesados en esta sesión */}
      {ultimosProcesados.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            Procesados en esta sesión ({ultimosProcesados.length})
          </h3>
          <div className="divide-y divide-slate-100 text-xs">
            {ultimosProcesados.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800">{item.nombre}</span>
                  <span className="text-slate-400 ml-2">Nota: {item.nota_total}/{item.nota_maxima || 20}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full font-semibold ${
                      item.confianza_lectura >= 85
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    Confianza: {item.confianza_lectura}%
                  </span>
                  <span className="capitalize text-slate-500">
                    {item.estado_revision.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

