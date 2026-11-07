'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen } from 'lucide-react';
import { SeccionConRelaciones } from '@/hooks/useSeccionDetalle';

interface Props {
  seccion: SeccionConRelaciones | null;
  loading: boolean;
  paginaActual?: string;
}

export default function SectionBreadcrumb({ seccion, loading, paginaActual }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2 animate-pulse">
        <span className="w-12 h-4 bg-slate-200 rounded"></span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="w-24 h-4 bg-slate-200 rounded"></span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="w-28 h-4 bg-slate-200 rounded"></span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="w-16 h-4 bg-slate-200 rounded"></span>
      </div>
    );
  }

  const curso = seccion?.evaluacion?.curso;
  const evaluacion = seccion?.evaluacion;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-2 flex-wrap">
      <Link
        href="/cursos"
        className="hover:text-amber-700 hover:underline flex items-center gap-1 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
        <span>Cursos</span>
      </Link>

      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

      {curso ? (
        <Link
          href="/cursos"
          className="hover:text-amber-700 hover:underline transition-colors font-medium text-slate-700"
          title={`Curso: ${curso.nombre}`}
        >
          {curso.nombre} <span className="text-slate-400 text-[11px]">({curso.codigo})</span>
        </Link>
      ) : (
        <span className="text-slate-400">Curso</span>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

      {evaluacion ? (
        <span className="text-slate-700 font-medium" title={`Evaluación: ${evaluacion.titulo}`}>
          {evaluacion.titulo}
        </span>
      ) : (
        <span className="text-slate-400">Evaluación</span>
      )}

      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

      {seccion ? (
        <Link
          href={`/secciones/${seccion.id}`}
          className={`font-semibold transition-colors ${
            !paginaActual ? 'text-amber-700 font-bold' : 'hover:text-amber-700 text-slate-700 hover:underline'
          }`}
        >
          {seccion.nombre}
        </Link>
      ) : (
        <span className="text-slate-400">Sección</span>
      )}

      {paginaActual && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-amber-800 font-bold">{paginaActual}</span>
        </>
      )}
    </nav>
  );
}

