'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Plus,
  Calendar,
  Layers,
  ChevronRight,
  FileCheck,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  ListOrdered,
  HelpCircle,
} from 'lucide-react';
import {
  listarCursos,
  crearCurso,
  listarEvaluaciones,
  crearEvaluacion,
  listarSecciones,
  crearSeccion,
} from '@/lib/firebase/firestore.service';
import { Curso, Evaluacion, Seccion, ItemRubrica } from '@/types/database';

export default function GestionCursosPage() {
  // Datos principales
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<Curso | null>(null);

  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [evaluacionSeleccionada, setEvaluacionSeleccionada] = useState<Evaluacion | null>(null);

  const [secciones, setSecciones] = useState<Seccion[]>([]);

  // Estados de carga
  const [loadingCursos, setLoadingCursos] = useState<boolean>(true);
  const [loadingEvaluaciones, setLoadingEvaluaciones] = useState<boolean>(false);
  const [loadingSecciones, setLoadingSecciones] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modales
  const [modalCursoAbierto, setModalCursoAbierto] = useState(false);
  const [modalEvalAbierto, setModalEvalAbierto] = useState(false);
  const [modalSeccionAbierto, setModalSeccionAbierto] = useState(false);

  // Campos de formulario para Curso
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombreCurso, setNuevoNombreCurso] = useState('');
  const [nuevoPeriodo, setNuevoPeriodo] = useState('2026-II');

  // Campos de formulario para Evaluación
  const [nuevoTituloEval, setNuevoTituloEval] = useState('');
  const [nuevaFechaEval, setNuevaFechaEval] = useState(new Date().toISOString().split('T')[0]);
  const [nuevoPuntajeMax, setNuevoPuntajeMax] = useState('20');

  // Campos de formulario para Sección y Rúbrica
  const [nuevoNombreSeccion, setNuevoNombreSeccion] = useState('Fila A');
  const [totalPreguntas, setTotalPreguntas] = useState<number>(5);
  const [rubricaDraft, setRubricaDraft] = useState<ItemRubrica[]>([]);

  // 1. Cargar cursos iniciales
  const cargarCursos = async () => {
    setLoadingCursos(true);
    try {
      const data = await listarCursos();
      setCursos(data);
      if (data.length > 0 && !cursoSeleccionado) {
        setCursoSeleccionado(data[0]);
      }
    } catch (err) {
      console.error('Error cargando cursos:', err);
    } finally {
      setLoadingCursos(false);
    }
  };

  useEffect(() => {
    cargarCursos();
  }, []);

  // 2. Cargar evaluaciones cuando cambia el curso seleccionado
  useEffect(() => {
    if (!cursoSeleccionado?.id) {
      setEvaluaciones([]);
      setEvaluacionSeleccionada(null);
      return;
    }
    const cargarEvals = async () => {
      setLoadingEvaluaciones(true);
      try {
        const data = await listarEvaluaciones(cursoSeleccionado.id!);
        setEvaluaciones(data);
        if (data.length > 0) {
          setEvaluacionSeleccionada(data[0]);
        } else {
          setEvaluacionSeleccionada(null);
          setSecciones([]);
        }
      } catch (err) {
        console.error('Error cargando evaluaciones:', err);
      } finally {
        setLoadingEvaluaciones(false);
      }
    };
    cargarEvals();
  }, [cursoSeleccionado]);

  // 3. Cargar secciones cuando cambia la evaluación seleccionada
  useEffect(() => {
    if (!cursoSeleccionado?.id || !evaluacionSeleccionada?.id) {
      setSecciones([]);
      return;
    }
    const cargarSecs = async () => {
      setLoadingSecciones(true);
      try {
        const data = await listarSecciones(cursoSeleccionado.id!, evaluacionSeleccionada.id!);
        setSecciones(data);
      } catch (err) {
        console.error('Error cargando secciones:', err);
      } finally {
        setLoadingSecciones(false);
      }
    };
    cargarSecs();
  }, [cursoSeleccionado, evaluacionSeleccionada]);

  // Inicializar plantilla de rúbrica cuando cambia el número de preguntas
  useEffect(() => {
    const cant = Math.max(1, Math.min(50, totalPreguntas));
    const items: ItemRubrica[] = Array.from({ length: cant }, (_, i) => ({
      numero_pregunta: i + 1,
      tipo: 'opcion_multiple',
      opciones_validas: ['A', 'B', 'C', 'D'],
      respuesta_correcta: 'A',
      puntaje: Number((20 / cant).toFixed(2)),
      penalidad_error: 0,
    }));
    setRubricaDraft(items);
  }, [totalPreguntas]);

  // Handlers para crear registros en Firestore
  const handleCrearCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCodigo || !nuevoNombreCurso) return;
    setSubmitting(true);
    try {
      const nuevoId = await crearCurso({
        codigo: nuevoCodigo.trim().toUpperCase(),
        nombre: nuevoNombreCurso.trim(),
        periodo: nuevoPeriodo.trim(),
      });
      const cursoCreado: Curso = {
        id: nuevoId,
        codigo: nuevoCodigo.trim().toUpperCase(),
        nombre: nuevoNombreCurso.trim(),
        periodo: nuevoPeriodo.trim(),
        creado_el: new Date(),
      };
      setCursos((prev) => [...prev, cursoCreado]);
      setCursoSeleccionado(cursoCreado);
      setModalCursoAbierto(false);
      setNuevoCodigo('');
      setNuevoNombreCurso('');
    } catch (err) {
      alert('Error creando curso: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCrearEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSeleccionado?.id || !nuevoTituloEval) return;
    setSubmitting(true);
    try {
      const nuevoId = await crearEvaluacion(cursoSeleccionado.id, {
        titulo: nuevoTituloEval.trim(),
        fecha_evaluacion: nuevaFechaEval,
        puntaje_maximo: parseFloat(nuevoPuntajeMax) || 20,
      });
      const evalCreada: Evaluacion = {
        id: nuevoId,
        curso_id: cursoSeleccionado.id,
        titulo: nuevoTituloEval.trim(),
        fecha_evaluacion: nuevaFechaEval,
        puntaje_maximo: parseFloat(nuevoPuntajeMax) || 20,
        creado_el: new Date(),
      };
      setEvaluaciones((prev) => [...prev, evalCreada]);
      setEvaluacionSeleccionada(evalCreada);
      setModalEvalAbierto(false);
      setNuevoTituloEval('');
    } catch (err) {
      alert('Error creando evaluación: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCrearSeccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSeleccionado?.id || !evaluacionSeleccionada?.id || !nuevoNombreSeccion) return;
    setSubmitting(true);
    try {
      const nuevoId = await crearSeccion(cursoSeleccionado.id, evaluacionSeleccionada.id, {
        nombre: nuevoNombreSeccion.trim(),
        total_preguntas: rubricaDraft.length,
        rubrica: rubricaDraft,
      });
      const seccionCreada: Seccion = {
        id: nuevoId,
        evaluacion_id: evaluacionSeleccionada.id,
        nombre: nuevoNombreSeccion.trim(),
        total_preguntas: rubricaDraft.length,
        rubrica: rubricaDraft,
        creado_el: new Date(),
      };
      setSecciones((prev) => [...prev, seccionCreada]);
      setModalSeccionAbierto(false);
      setNuevoNombreSeccion('Fila B');
    } catch (err) {
      alert('Error creando sección con rúbrica: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const actualizarItemRubrica = (
    index: number,
    campo: keyof ItemRubrica,
    valor: string | number
  ) => {
    setRubricaDraft((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  };

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Gestión Académica de Cursos y Rúbricas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define la estructura de Cursos $\rightarrow$ Evaluaciones $\rightarrow$ Secciones con sus claves de respuestas para la corrección IA.
          </p>
        </div>

        <button
          onClick={() => setModalCursoAbierto(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nuevo Curso
        </button>
      </div>

      {/* Grid de 3 Columnas: Jerarquía Cursos -> Evaluaciones -> Secciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* COLUMNA 1: Cursos */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <BookOpen className="w-5 h-5 text-amber-600" />
              <span>1. Cursos</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">({cursos.length})</span>
          </div>

          {loadingCursos ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : cursos.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No hay cursos registrados. Haz clic en "Nuevo Curso".
            </div>
          ) : (
            <div className="space-y-2">
              {cursos.map((c) => {
                const activo = cursoSeleccionado?.id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCursoSeleccionado(c)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      activo
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                        {c.codigo}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900">{c.nombre}</h4>
                      <span className="text-[10px] text-slate-400">{c.periodo}</span>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${activo ? 'text-amber-600' : 'text-slate-300'}`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA 2: Evaluaciones */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Calendar className="w-5 h-5 text-amber-600" />
              <span>2. Evaluaciones</span>
            </div>
            {cursoSeleccionado && (
              <button
                onClick={() => setModalEvalAbierto(true)}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva
              </button>
            )}
          </div>

          {!cursoSeleccionado ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Selecciona un curso primero para ver sus evaluaciones.
            </div>
          ) : loadingEvaluaciones ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : evaluaciones.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-400">No hay evaluaciones en {cursoSeleccionado.nombre}.</p>
              <button
                onClick={() => setModalEvalAbierto(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 rounded-lg border border-amber-200"
              >
                Crear Ej. Parcial 1
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {evaluaciones.map((ev) => {
                const activo = evaluacionSeleccionada?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setEvaluacionSeleccionada(ev)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                      activo
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{ev.titulo}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>Puntaje: {ev.puntaje_maximo} pts</span>
                        <span>•</span>
                        <span>{ev.fecha_evaluacion}</span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 ${activo ? 'text-amber-600' : 'text-slate-300'}`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* COLUMNA 3: Secciones y Rúbricas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Layers className="w-5 h-5 text-amber-600" />
              <span>3. Secciones & Rúbricas</span>
            </div>
            {evaluacionSeleccionada && (
              <button
                onClick={() => setModalSeccionAbierto(true)}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nueva
              </button>
            )}
          </div>

          {!evaluacionSeleccionada ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Selecciona una evaluación para ver sus variantes de examen (Fila A, B...).
            </div>
          ) : loadingSecciones ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            </div>
          ) : secciones.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-slate-400">Sin secciones ni rúbricas configuradas.</p>
              <button
                onClick={() => setModalSeccionAbierto(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 rounded-lg border border-amber-200"
              >
                Crear Sección (ej. Fila A)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {secciones.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-amber-300 transition-all bg-slate-50/50 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{sec.nombre}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                        {sec.total_preguntas} Preguntas
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Rúbrica: {sec.rubrica.map((r) => `P${r.numero_pregunta}:${r.respuesta_correcta}`).slice(0, 5).join(', ')}
                      {sec.rubrica.length > 5 && '...'}
                    </p>
                  </div>

                  <Link
                    href={`/secciones/${sec.id}?cursoId=${cursoSeleccionado?.id}&evaluacionId=${evaluacionSeleccionada.id}`}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all"
                  >
                    <span>Abrir Panel de Calificación</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Crear Curso */}
      {modalCursoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setModalCursoAbierto(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Crear Nuevo Curso</h3>
            <form onSubmit={handleCrearCurso} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código del Curso
                </label>
                <input
                  type="text"
                  placeholder="ej. MAT-201, FIS-101"
                  value={nuevoCodigo}
                  onChange={(e) => setNuevoCodigo(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Asignatura
                </label>
                <input
                  type="text"
                  placeholder="ej. Cálculo Multivariable"
                  value={nuevoNombreCurso}
                  onChange={(e) => setNuevoNombreCurso(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Periodo Académico
                </label>
                <input
                  type="text"
                  value={nuevoPeriodo}
                  onChange={(e) => setNuevoPeriodo(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalCursoAbierto(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Crear Evaluación */}
      {modalEvalAbierto && cursoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setModalEvalAbierto(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Nueva Evaluación</h3>
            <p className="text-xs text-slate-500 mb-4">
              Para el curso: <strong className="text-slate-800">{cursoSeleccionado.nombre}</strong>
            </p>
            <form onSubmit={handleCrearEvaluacion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título de la Evaluación
                </label>
                <input
                  type="text"
                  placeholder="ej. Examen Parcial 1, Práctica Calificada 2"
                  value={nuevoTituloEval}
                  onChange={(e) => setNuevoTituloEval(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Aplicación
                  </label>
                  <input
                    type="date"
                    value={nuevaFechaEval}
                    onChange={(e) => setNuevaFechaEval(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Puntaje Máximo
                  </label>
                  <input
                    type="number"
                    value={nuevoPuntajeMax}
                    onChange={(e) => setNuevoPuntajeMax(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalEvalAbierto(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Evaluación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Crear Sección y Editor de Rúbrica */}
      {modalSeccionAbierto && evaluacionSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 border border-slate-200 shadow-2xl relative my-8">
            <button
              onClick={() => setModalSeccionAbierto(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900">
                Configurar Sección y Clave de Rúbrica
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Evaluación: <strong className="text-slate-800">{evaluacionSeleccionada.titulo}</strong>
            </p>

            <form onSubmit={handleCrearSeccion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de la Sección o Fila
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Fila A, Fila B, Grupo 1"
                    value={nuevoNombreSeccion}
                    onChange={(e) => setNuevoNombreSeccion(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número de Preguntas
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={totalPreguntas}
                    onChange={(e) => setTotalPreguntas(parseInt(e.target.value) || 5)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Editor visual de la Rúbrica */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Claves de Respuestas Correctas y Puntos por Ítem:
                </label>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-2 bg-slate-50/50">
                  {rubricaDraft.map((item, idx) => (
                    <div key={item.numero_pregunta} className="py-2 px-3 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 w-16">
                        Pregunta {item.numero_pregunta}:
                      </span>
                      {/* Opciones de respuesta A, B, C, D, E */}
                      <div className="flex items-center gap-1.5">
                        {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => actualizarItemRubrica(idx, 'respuesta_correcta', opt)}
                            className={`w-7 h-7 rounded-lg font-bold text-xs transition-all ${
                              item.respuesta_correcta === opt
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {/* Puntaje por pregunta */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">Pts:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          value={item.puntaje}
                          onChange={(e) =>
                            actualizarItemRubrica(idx, 'puntaje', parseFloat(e.target.value) || 1)
                          }
                          className="w-16 px-2 py-1 text-xs border border-slate-300 rounded bg-white text-center font-semibold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalSeccionAbierto(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Guardar Rúbrica y Sección</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

