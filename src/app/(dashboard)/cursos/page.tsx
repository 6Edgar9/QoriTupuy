'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Calendar,
  Layers,
  ChevronRight,
  CheckCircle2,
  X,
  Loader2,
  Sparkles,
  ArrowRight,
  Pencil,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Curso, Evaluacion, Seccion, ItemRubrica } from '@/types/database';
import RubricEditor from '@/components/rubric/RubricEditor';

interface Toast {
  id: string;
  tipo: 'exito' | 'error' | 'info';
  mensaje: string;
}

interface DeleteTarget {
  tipo: 'curso' | 'evaluacion' | 'seccion';
  id: string;
  nombre: string;
  cursoId?: string;
  evaluacionId?: string;
}

export default function GestionCursosPage() {
  const router = useRouter();

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

  // Modales de creación/edición
  const [modalCursoAbierto, setModalCursoAbierto] = useState(false);
  const [cursoAEditar, setCursoAEditar] = useState<Curso | null>(null);

  const [modalEvalAbierto, setModalEvalAbierto] = useState(false);
  const [evalAEditar, setEvalAEditar] = useState<Evaluacion | null>(null);

  const [modalSeccionAbierto, setModalSeccionAbierto] = useState(false);
  const [seccionAEditar, setSeccionAEditar] = useState<Seccion | null>(null);

  // Modal de confirmación de eliminación
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Notificaciones Toast
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Campos de formulario para Curso
  const [formCodigo, setFormCodigo] = useState('');
  const [formNombreCurso, setFormNombreCurso] = useState('');
  const [formPeriodo, setFormPeriodo] = useState('2026-II');

  // Campos de formulario para Evaluación
  const [formTituloEval, setFormTituloEval] = useState('');
  const [formFechaEval, setFormFechaEval] = useState(new Date().toISOString().split('T')[0]);
  const [formPuntajeMax, setFormPuntajeMax] = useState('20');

  // Campos de formulario para Sección y Rúbrica
  const [formNombreSeccion, setFormNombreSeccion] = useState('Fila A');
  const [totalPreguntas, setTotalPreguntas] = useState<number>(5);
  const [rubricaDraft, setRubricaDraft] = useState<ItemRubrica[]>([]);

  const notificar = (mensaje: string, tipo: 'exito' | 'error' | 'info' = 'exito') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // 1. Cargar cursos iniciales desde SQLite vía API local
  const cargarCursos = async () => {
    setLoadingCursos(true);
    try {
      const res = await fetch('/api/cursos');
      if (!res.ok) throw new Error('No se pudo cargar la lista de cursos');
      const data: Curso[] = await res.json();
      setCursos(data);
      if (data.length > 0 && !cursoSeleccionado) {
        setCursoSeleccionado(data[0]);
      }
    } catch (err: any) {
      console.error('Error cargando cursos:', err);
      notificar('Error al cargar cursos: ' + err.message, 'error');
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
        const res = await fetch(`/api/evaluaciones?cursoId=${cursoSeleccionado.id}`);
        if (!res.ok) throw new Error('No se pudieron cargar las evaluaciones');
        const data: Evaluacion[] = await res.json();
        setEvaluaciones(data);
        if (data.length > 0) {
          setEvaluacionSeleccionada(data[0]);
        } else {
          setEvaluacionSeleccionada(null);
          setSecciones([]);
        }
      } catch (err: any) {
        console.error('Error cargando evaluaciones:', err);
        notificar('Error al cargar evaluaciones: ' + err.message, 'error');
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
        const res = await fetch(`/api/secciones?evaluacionId=${evaluacionSeleccionada.id}`);
        if (!res.ok) throw new Error('No se pudieron cargar las secciones');
        const data: Seccion[] = await res.json();
        setSecciones(data);
      } catch (err: any) {
        console.error('Error cargando secciones:', err);
        notificar('Error al cargar secciones: ' + err.message, 'error');
      } finally {
        setLoadingSecciones(false);
      }
    };
    cargarSecs();
  }, [cursoSeleccionado, evaluacionSeleccionada]);

  // ==========================================
  // MANEJADORES DE CURSOS (CRUD)
  // ==========================================
  const abrirCrearCurso = () => {
    setCursoAEditar(null);
    setFormCodigo('');
    setFormNombreCurso('');
    setFormPeriodo('2026-II');
    setModalCursoAbierto(true);
  };

  const abrirEditarCurso = (curso: Curso, e: React.MouseEvent) => {
    e.stopPropagation();
    setCursoAEditar(curso);
    setFormCodigo(curso.codigo);
    setFormNombreCurso(curso.nombre);
    setFormPeriodo(curso.periodo);
    setModalCursoAbierto(true);
  };

  const handleGuardarCurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCodigo.trim() || !formNombreCurso.trim()) return;
    setSubmitting(true);
    try {
      const codigoNormalizado = formCodigo.trim().toUpperCase();
      const nombreNormalizado = formNombreCurso.trim();
      const periodoNormalizado = formPeriodo.trim();

      if (cursoAEditar?.id) {
        // Actualizar mediante PUT /api/cursos/:id
        const res = await fetch(`/api/cursos/${cursoAEditar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: codigoNormalizado,
            nombre: nombreNormalizado,
            periodo: periodoNormalizado,
          }),
        });
        if (!res.ok) throw new Error('Error al actualizar el curso en base de datos');
        const cursoActualizado: Curso = await res.json();

        setCursos((prev) =>
          prev.map((c) => (c.id === cursoAEditar.id ? cursoActualizado : c))
        );
        if (cursoSeleccionado?.id === cursoAEditar.id) {
          setCursoSeleccionado(cursoActualizado);
        }
        notificar(`Curso "${codigoNormalizado}" actualizado con éxito.`);
      } else {
        // Crear mediante POST /api/cursos
        const res = await fetch('/api/cursos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: codigoNormalizado,
            nombre: nombreNormalizado,
            periodo: periodoNormalizado,
          }),
        });
        if (!res.ok) throw new Error('Error al crear el curso en base de datos');
        const cursoCreado: Curso = await res.json();

        setCursos((prev) => [...prev, cursoCreado]);
        setCursoSeleccionado(cursoCreado);
        notificar(`Curso "${codigoNormalizado}" creado con éxito.`);
      }

      setModalCursoAbierto(false);
      setCursoAEditar(null);
      setFormCodigo('');
      setFormNombreCurso('');
    } catch (err: any) {
      notificar('Error al guardar curso: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // MANEJADORES DE EVALUACIONES (CRUD)
  // ==========================================
  const abrirCrearEvaluacion = () => {
    setEvalAEditar(null);
    setFormTituloEval('');
    setFormFechaEval(new Date().toISOString().split('T')[0]);
    setFormPuntajeMax('20');
    setModalEvalAbierto(true);
  };

  const abrirEditarEvaluacion = (ev: Evaluacion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEvalAEditar(ev);
    setFormTituloEval(ev.titulo);
    setFormFechaEval(ev.fecha_evaluacion);
    setFormPuntajeMax(ev.puntaje_maximo.toString());
    setModalEvalAbierto(true);
  };

  const handleGuardarEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSeleccionado?.id || !formTituloEval.trim()) return;
    setSubmitting(true);
    try {
      const tituloNormalizado = formTituloEval.trim();
      const puntajeMaxNum = parseFloat(formPuntajeMax) || 20;

      if (evalAEditar?.id) {
        // Actualizar mediante PUT /api/evaluaciones/:id
        const res = await fetch(`/api/evaluaciones/${evalAEditar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: tituloNormalizado,
            fecha_evaluacion: formFechaEval,
            puntaje_maximo: puntajeMaxNum,
          }),
        });
        if (!res.ok) throw new Error('Error al actualizar la evaluación');
        const evalActualizada: Evaluacion = await res.json();

        setEvaluaciones((prev) =>
          prev.map((item) => (item.id === evalAEditar.id ? evalActualizada : item))
        );
        if (evaluacionSeleccionada?.id === evalAEditar.id) {
          setEvaluacionSeleccionada(evalActualizada);
        }
        notificar(`Evaluación "${tituloNormalizado}" actualizada.`);
      } else {
        // Crear mediante POST /api/evaluaciones
        const res = await fetch('/api/evaluaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            curso_id: cursoSeleccionado.id,
            titulo: tituloNormalizado,
            fecha_evaluacion: formFechaEval,
            puntaje_maximo: puntajeMaxNum,
          }),
        });
        if (!res.ok) throw new Error('Error al crear la evaluación');
        const evalCreada: Evaluacion = await res.json();

        setEvaluaciones((prev) => [...prev, evalCreada]);
        setEvaluacionSeleccionada(evalCreada);
        notificar(`Evaluación "${tituloNormalizado}" creada con éxito.`);
      }

      setModalEvalAbierto(false);
      setEvalAEditar(null);
      setFormTituloEval('');
    } catch (err: any) {
      notificar('Error al guardar evaluación: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // MANEJADORES DE SECCIONES & RÚBRICAS (CRUD)
  // ==========================================
  const ajustarCantidadPreguntas = (nuevaCant: number) => {
    const cant = Math.max(1, Math.min(50, nuevaCant));
    setTotalPreguntas(cant);
    setRubricaDraft((prev) => {
      if (cant > prev.length) {
        const faltantes = cant - prev.length;
        const nuevosItems: ItemRubrica[] = Array.from({ length: faltantes }, (_, i) => ({
          numero_pregunta: prev.length + i + 1,
          tipo_pregunta: 'opcion_multiple_dinamica',
          cantidad_alternativas: 4,
          opciones_validas: ['A', 'B', 'C', 'D'],
          respuesta_correcta: 'A',
          puntaje: Number((20 / cant).toFixed(1)) || 1,
        }));
        return [...prev, ...nuevosItems];
      } else if (cant < prev.length) {
        return prev.slice(0, cant);
      }
      return prev;
    });
  };

  const abrirCrearSeccion = () => {
    setSeccionAEditar(null);
    setFormNombreSeccion('Fila A');
    const cant = 5;
    setTotalPreguntas(cant);
    const items: ItemRubrica[] = Array.from({ length: cant }, (_, i) => ({
      numero_pregunta: i + 1,
      tipo_pregunta: 'opcion_multiple_dinamica',
      cantidad_alternativas: 4,
      opciones_validas: ['A', 'B', 'C', 'D'],
      respuesta_correcta: 'A',
      puntaje: Number((20 / cant).toFixed(1)),
    }));
    setRubricaDraft(items);
    setModalSeccionAbierto(true);
  };

  const abrirEditarSeccion = (sec: Seccion) => {
    setSeccionAEditar(sec);
    setFormNombreSeccion(sec.nombre);
    setTotalPreguntas(sec.rubrica?.length || sec.total_preguntas || 5);
    setRubricaDraft(JSON.parse(JSON.stringify(sec.rubrica || [])));
    setModalSeccionAbierto(true);
  };

  const handleGuardarSeccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cursoSeleccionado?.id || !evaluacionSeleccionada?.id || !formNombreSeccion.trim()) return;
    setSubmitting(true);
    try {
      const nombreNormalizado = formNombreSeccion.trim();

      // Sanitización estricta de la rúbrica antes de persistir
      const rubricaSanitizada: ItemRubrica[] = rubricaDraft.map((item, index) => {
        const clean: ItemRubrica = {
          numero_pregunta: index + 1,
          tipo_pregunta: item.tipo_pregunta || 'opcion_multiple_dinamica',
          respuesta_correcta: (item.respuesta_correcta ?? '').toString(),
          puntaje: Number(item.puntaje) || 1,
        };

        if (item.cantidad_alternativas !== undefined) {
          clean.cantidad_alternativas = Number(item.cantidad_alternativas);
        }
        if (item.opciones_validas && item.opciones_validas.length > 0) {
          clean.opciones_validas = item.opciones_validas;
        }
        if (item.respuesta_esperada_texto !== undefined && item.respuesta_esperada_texto !== '') {
          clean.respuesta_esperada_texto = item.respuesta_esperada_texto;
        }
        if (item.palabras_clave && item.palabras_clave.length > 0) {
          clean.palabras_clave = item.palabras_clave;
        }
        if (item.criterios_ensayo && item.criterios_ensayo.length > 0) {
          clean.criterios_ensayo = item.criterios_ensayo;
        }
        return clean;
      });

      let destinoRedireccion = '';

      if (seccionAEditar?.id) {
        // Actualizar mediante PUT /api/secciones/:id
        const res = await fetch(`/api/secciones/${seccionAEditar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: nombreNormalizado,
            total_preguntas: rubricaSanitizada.length,
            rubrica: rubricaSanitizada,
          }),
        });
        if (!res.ok) throw new Error('Error al actualizar la sección');
        const seccionActualizada: Seccion = await res.json();

        setSecciones((prev) =>
          prev.map((s) => (s.id === seccionAEditar.id ? seccionActualizada : s))
        );
        notificar(`Sección "${nombreNormalizado}" y rúbrica actualizadas.`);

        // Redirección Segura: exclusivamente tras confirmar res.ok === true
        if (res.ok === true) {
          destinoRedireccion = `/secciones/${seccionActualizada.id}`;
        }
      } else {
        // Crear mediante POST /api/secciones
        const res = await fetch('/api/secciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            evaluacion_id: evaluacionSeleccionada.id,
            nombre: nombreNormalizado,
            total_preguntas: rubricaSanitizada.length,
            rubrica: rubricaSanitizada,
          }),
        });
        if (!res.ok) throw new Error('Error al crear la sección');
        const seccionCreada: Seccion = await res.json();

        setSecciones((prev) => [...prev, seccionCreada]);
        notificar(`Sección "${nombreNormalizado}" creada con éxito.`);

        // Redirección Segura: exclusivamente tras confirmar res.ok === true
        if (res.ok === true) {
          destinoRedireccion = `/secciones/${seccionCreada.id}`;
        }
      }

      setModalSeccionAbierto(false);
      setSeccionAEditar(null);

      if (destinoRedireccion) {
        router.push(destinoRedireccion);
      }
    } catch (err: any) {
      notificar('Error al guardar sección: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // MANEJADOR DE ELIMINACIONES CONFIRMADAS
  // ==========================================
  const ejecutarEliminacion = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      if (deleteTarget.tipo === 'curso') {
        const res = await fetch(`/api/cursos/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar curso');
        setCursos((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        if (cursoSeleccionado?.id === deleteTarget.id) {
          const restantes = cursos.filter((c) => c.id !== deleteTarget.id);
          setCursoSeleccionado(restantes.length > 0 ? restantes[0] : null);
        }
        notificar(`Curso "${deleteTarget.nombre}" eliminado correctamente.`);
      } else if (deleteTarget.tipo === 'evaluacion') {
        const res = await fetch(`/api/evaluaciones/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar evaluación');
        setEvaluaciones((prev) => prev.filter((e) => e.id !== deleteTarget.id));
        if (evaluacionSeleccionada?.id === deleteTarget.id) {
          const restantes = evaluaciones.filter((e) => e.id !== deleteTarget.id);
          setEvaluacionSeleccionada(restantes.length > 0 ? restantes[0] : null);
        }
        notificar(`Evaluación "${deleteTarget.nombre}" eliminada correctamente.`);
      } else if (deleteTarget.tipo === 'seccion') {
        const res = await fetch(`/api/secciones/${deleteTarget.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar sección');
        setSecciones((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        notificar(`Sección "${deleteTarget.nombre}" eliminada.`);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      notificar('Error al eliminar: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Sistema de Toasts Flotantes */}
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
            {toast.tipo === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
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

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Gestión Académica de Cursos y Rúbricas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra la jerarquía completa: Cursos &rarr; Evaluaciones &rarr; Secciones con almacenamiento relacional SQLite local.
          </p>
        </div>

        <button
          onClick={abrirCrearCurso}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-600/20 transition-all self-start sm:self-auto cursor-pointer"
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
                  <div
                    key={c.id}
                    onClick={() => setCursoSeleccionado(c)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                      activo
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">
                        {c.codigo}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 truncate">{c.nombre}</h4>
                      <span className="text-[10px] text-slate-400">{c.periodo}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Botones de Edición y Borrado */}
                      <button
                        title="Editar Curso"
                        onClick={(e) => abrirEditarCurso(c, e)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Eliminar Curso"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({
                            tipo: 'curso',
                            id: c.id!,
                            nombre: `${c.codigo} - ${c.nombre}`,
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight
                        className={`w-4 h-4 ml-1 ${activo ? 'text-amber-600' : 'text-slate-300'}`}
                      />
                    </div>
                  </div>
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
                onClick={abrirCrearEvaluacion}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
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
                onClick={abrirCrearEvaluacion}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 rounded-lg border border-amber-200 cursor-pointer"
              >
                Crear Ej. Parcial 1
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {evaluaciones.map((ev) => {
                const activo = evaluacionSeleccionada?.id === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setEvaluacionSeleccionada(ev)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                      activo
                        ? 'border-amber-500 bg-amber-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">{ev.titulo}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>Puntaje: {ev.puntaje_maximo} pts</span>
                        <span>•</span>
                        <span>{ev.fecha_evaluacion}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        title="Editar Evaluación"
                        onClick={(e) => abrirEditarEvaluacion(ev, e)}
                        className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Eliminar Evaluación"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({
                            tipo: 'evaluacion',
                            id: ev.id!,
                            nombre: ev.titulo,
                            cursoId: cursoSeleccionado.id,
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight
                        className={`w-4 h-4 ml-1 ${activo ? 'text-amber-600' : 'text-slate-300'}`}
                      />
                    </div>
                  </div>
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
                onClick={abrirCrearSeccion}
                className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
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
                onClick={abrirCrearSeccion}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-800 rounded-lg border border-amber-200 cursor-pointer"
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
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{sec.nombre}</h4>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          {sec.total_preguntas} Preguntas
                        </span>
                        <button
                          title="Editar Sección y Rúbrica"
                          onClick={() => abrirEditarSeccion(sec)}
                          className="p-1 text-slate-400 hover:text-amber-700 hover:bg-amber-100/60 rounded-md transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Eliminar Sección"
                          onClick={() =>
                            setDeleteTarget({
                              tipo: 'seccion',
                              id: sec.id!,
                              nombre: sec.nombre,
                              cursoId: cursoSeleccionado?.id,
                              evaluacionId: evaluacionSeleccionada.id,
                            })
                          }
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Rúbrica:{' '}
                      {sec.rubrica && sec.rubrica.length > 0
                        ? sec.rubrica
                            .map((r) => `P${r.numero_pregunta}:${r.respuesta_correcta || '?'}`)
                            .slice(0, 5)
                            .join(', ')
                        : 'Sin preguntas'}
                      {sec.rubrica && sec.rubrica.length > 5 && '...'}
                    </p>
                  </div>

                  <Link
                    href={`/secciones/${sec.id}`}
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

      {/* MODAL 1: Crear / Editar Curso */}
      {modalCursoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => {
                setModalCursoAbierto(false);
                setCursoAEditar(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {cursoAEditar ? 'Editar Curso' : 'Crear Nuevo Curso'}
            </h3>
            <form onSubmit={handleGuardarCurso} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código del Curso
                </label>
                <input
                  type="text"
                  placeholder="ej. MAT-201, FIS-101"
                  value={formCodigo}
                  onChange={(e) => setFormCodigo(e.target.value)}
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
                  value={formNombreCurso}
                  onChange={(e) => setFormNombreCurso(e.target.value)}
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
                  value={formPeriodo}
                  onChange={(e) => setFormPeriodo(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalCursoAbierto(false);
                    setCursoAEditar(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{cursoAEditar ? 'Guardar Cambios' : 'Guardar Curso'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Crear / Editar Evaluación */}
      {modalEvalAbierto && cursoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => {
                setModalEvalAbierto(false);
                setEvalAEditar(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {evalAEditar ? 'Editar Evaluación' : 'Nueva Evaluación'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Para el curso: <strong className="text-slate-800">{cursoSeleccionado.nombre}</strong>
            </p>
            <form onSubmit={handleGuardarEvaluacion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título de la Evaluación
                </label>
                <input
                  type="text"
                  placeholder="ej. Examen Parcial 1, Práctica Calificada 2"
                  value={formTituloEval}
                  onChange={(e) => setFormTituloEval(e.target.value)}
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
                    value={formFechaEval}
                    onChange={(e) => setFormFechaEval(e.target.value)}
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
                    step="0.5"
                    min="1"
                    max="100"
                    value={formPuntajeMax}
                    onChange={(e) => setFormPuntajeMax(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setModalEvalAbierto(false);
                    setEvalAEditar(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{evalAEditar ? 'Guardar Cambios' : 'Crear Evaluación'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Crear / Editar Sección y Editor de Rúbrica */}
      {modalSeccionAbierto && evaluacionSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl p-6 border border-slate-200 shadow-2xl relative my-8">
            <button
              disabled={submitting}
              onClick={() => {
                setModalSeccionAbierto(false);
                setSeccionAEditar(null);
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="text-lg font-bold text-slate-900">
                {seccionAEditar ? 'Editar Sección y Rúbrica' : 'Configurar Sección y Clave de Rúbrica'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Evaluación: <strong className="text-slate-800">{evaluacionSeleccionada.titulo}</strong>
            </p>

            <form onSubmit={handleGuardarSeccion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de la Sección o Fila
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Fila A, Fila B, Grupo 1"
                    value={formNombreSeccion}
                    disabled={submitting}
                    onChange={(e) => setFormNombreSeccion(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
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
                    disabled={submitting}
                    onChange={(e) => ajustarCantidadPreguntas(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Editor visual de la Rúbrica Multimodal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Configuración Multimodal de Preguntas y Criterios:
                </label>
                <RubricEditor
                  rubrica={rubricaDraft}
                  onChange={setRubricaDraft}
                  isSubmitting={submitting}
                  showActionButtons={false}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setModalSeccionAbierto(false);
                    setSeccionAEditar(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{seccionAEditar ? 'Guardar Cambios' : 'Guardar Rúbrica y Sección'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Confirmación de Eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 border border-slate-200 shadow-2xl relative text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                ¿Eliminar {deleteTarget.tipo}?
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Estás a punto de borrar <strong className="text-slate-800">"{deleteTarget.nombre}"</strong>.
                {deleteTarget.tipo === 'curso' && ' Todas las evaluaciones y secciones asociadas se eliminarán permanentemente en SQLite.'}
                {deleteTarget.tipo === 'evaluacion' && ' Todas las secciones y exámenes de esta evaluación se eliminarán.'}
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={ejecutarEliminacion}
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
