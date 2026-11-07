'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ItemRubrica, TipoPregunta, CriterioEnsayoItem } from '@/types/database';
import {
  CheckSquare,
  FileText,
  GitMerge,
  PieChart,
  Calculator,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlignLeft,
  Tag,
  ArrowDown10,
  Image as ImageIcon,
  MessageSquare,
  ListPlus,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';

export interface RubricEditorProps {
  rubrica: ItemRubrica[];
  onChange: (nuevaRubrica: ItemRubrica[]) => void;
  onSave?: (rubricaFinal: ItemRubrica[]) => Promise<void> | void;
  onCancel?: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
  seccionId?: string;
  redirectTo?: string;
  showActionButtons?: boolean;
}

const TIPOS_PREGUNTA: { value: TipoPregunta; label: string; icon: React.ReactNode; placeholder: string }[] = [
  {
    value: 'opcion_multiple_dinamica',
    label: 'Opción Múltiple Dinámica (A, B, C...)',
    icon: <CheckSquare className="w-3.5 h-3.5 text-amber-600" />,
    placeholder: '',
  },
  {
    value: 'verdadero_falso',
    label: 'Verdadero / Falso (V / F)',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    placeholder: '',
  },
  {
    value: 'verdadero_falso_justificado',
    label: 'V / F con Justificación (si es Falso)',
    icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
    placeholder: 'Criterio de justificación si el alumno marca Falso...',
  },
  {
    value: 'completar_espacios',
    label: 'Completar Espacios / Líneas en Blanco',
    icon: <Tag className="w-3.5 h-3.5 text-amber-700" />,
    placeholder: 'Ejemplo: glucólisis, citoplasma, piruvato',
  },
  {
    value: 'respuesta_corta',
    label: 'Respuesta Corta (Concepto / Palabra exacta)',
    icon: <MessageSquare className="w-3.5 h-3.5 text-sky-600" />,
    placeholder: 'Ejemplo: Fotosíntesis, Ciclo de Calvin',
  },
  {
    value: 'ordenamiento_secuencia',
    label: 'Ordenamiento / Secuencia Lógica',
    icon: <ArrowDown10 className="w-3.5 h-3.5 text-cyan-600" />,
    placeholder: 'Ejemplo: 1-C, 2-A, 3-D, 4-B (o A -> C -> D -> B)',
  },
  {
    value: 'rotulado_imagen',
    label: 'Rotulado de Imagen / Diagrama Anatómico',
    icon: <ImageIcon className="w-3.5 h-3.5 text-orange-600" />,
    placeholder: 'Ejemplo: Arriba-Izq: Estómago, Arriba-Der: Hígado, Abajo: Páncreas',
  },
  {
    value: 'ensayo_multicriterio',
    label: 'Ensayo con Rúbrica Multicriterio',
    icon: <ListPlus className="w-3.5 h-3.5 text-violet-600" />,
    placeholder: 'Describe el tema general del ensayo y gestiona los criterios abajo...',
  },
  {
    value: 'texto_abierto',
    label: 'Texto Abierto / Desarrollo Caligráfico',
    icon: <FileText className="w-3.5 h-3.5 text-blue-600" />,
    placeholder: 'Ejemplo: Debe definir apoptosis como muerte celular programada y citar caspasas...',
  },
  {
    value: 'calculo',
    label: 'Cálculo Matemático / Procedimiento',
    icon: <Calculator className="w-3.5 h-3.5 text-teal-600" />,
    placeholder: 'Ejemplo: Procedimiento de derivación implícita con resultado exacto: dy/dx = -x/y...',
  },
  {
    value: 'relacionar_columnas',
    label: 'Relacionar Columnas / Trazos de Flechas',
    icon: <GitMerge className="w-3.5 h-3.5 text-purple-600" />,
    placeholder: 'Ejemplo: 1 con C (Sarcopenia -> pérdida masa muscular), 2 con A, 3 con B...',
  },
  {
    value: 'grafico_esquema',
    label: 'Gráfico / Esquema / Dibujo Manuscrito',
    icon: <PieChart className="w-3.5 h-3.5 text-indigo-600" />,
    placeholder: 'Ejemplo: Diagrama de flujo circular de la renta con familias y empresas identificadas...',
  },
];

const LETRAS_ABC = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export default function RubricEditor({
  rubrica,
  onChange,
  onSave,
  onCancel,
  onBack,
  isSubmitting: isSubmittingProp,
  seccionId,
  redirectTo,
  showActionButtons = true,
}: RubricEditorProps) {
  const router = useRouter();
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const isSubmitting = isSubmittingProp !== undefined ? isSubmittingProp : internalSubmitting;

  const handleGuardar = async () => {
    if (isSubmitting) return;
    setInternalSubmitting(true);
    try {
      if (onSave) {
        await onSave(rubrica);
        if (redirectTo) {
          router.push(redirectTo);
        }
      } else if (seccionId) {
        const response = await fetch(`/api/secciones/${seccionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rubrica }),
        });

        // Redirección Segura: Usa router.push() en el frontend exclusivamente después de que el bloque try confirme un response.ok === true
        if (response.ok === true) {
          const dest = redirectTo || `/secciones/${seccionId}`;
          router.push(dest);
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Error al actualizar la rúbrica');
        }
      }
    } catch (error: any) {
      console.error('Error al guardar la rúbrica:', error);
    } finally {
      setInternalSubmitting(false);
    }
  };

  const handleCancelar = () => {
    if (isSubmitting) return;
    if (onCancel) {
      onCancel();
    } else if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.back();
    }
  };

  const handleVolver = () => {
    if (isSubmitting) return;
    if (onBack) {
      onBack();
    } else if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.back();
    }
  };

  const actualizarItem = (
    index: number,
    campo: keyof ItemRubrica,
    valor: any
  ) => {
    if (isSubmitting) return;
    const copia = [...rubrica];
    const itemActual = { ...copia[index], [campo]: valor };

    // Si cambia de tipo de pregunta, inicializar defaults coherentes
    if (campo === 'tipo_pregunta') {
      const nuevoTipo = valor as TipoPregunta;
      if (nuevoTipo === 'opcion_multiple_dinamica' || (nuevoTipo as any) === 'opcion_multiple') {
        const cant = itemActual.cantidad_alternativas || 4;
        itemActual.cantidad_alternativas = cant;
        const validas = LETRAS_ABC.slice(0, cant);
        itemActual.opciones_validas = validas;
        if (!validas.includes(itemActual.respuesta_correcta)) {
          itemActual.respuesta_correcta = 'A';
        }
      } else if (nuevoTipo === 'verdadero_falso') {
        if (!['V', 'F'].includes(itemActual.respuesta_correcta)) {
          itemActual.respuesta_correcta = 'V';
        }
      } else if (nuevoTipo === 'verdadero_falso_justificado') {
        if (!['V', 'F'].includes(itemActual.respuesta_correcta)) {
          itemActual.respuesta_correcta = 'F';
        }
        if (itemActual.respuesta_esperada_texto === undefined) {
          itemActual.respuesta_esperada_texto = '';
        }
      } else if (nuevoTipo === 'completar_espacios' || nuevoTipo === 'respuesta_corta') {
        if (!itemActual.palabras_clave || itemActual.palabras_clave.length === 0) {
          itemActual.palabras_clave = [];
        }
      } else if (nuevoTipo === 'ensayo_multicriterio') {
        if (!itemActual.criterios_ensayo || itemActual.criterios_ensayo.length === 0) {
          const pjeTotal = itemActual.puntaje || 4;
          const pjeMitad = Number((pjeTotal / 2).toFixed(1));
          itemActual.criterios_ensayo = [
            { nombre: 'Contenido y Conceptos Clave', puntaje: pjeMitad },
            { nombre: 'Coherencia y Redacción', puntaje: Number((pjeTotal - pjeMitad).toFixed(1)) },
          ];
        }
      } else {
        // Texto abierto, cálculo, ordenamiento, rotulado, esquema
        if (['A', 'B', 'C', 'D', 'E', 'V', 'F'].includes(itemActual.respuesta_correcta)) {
          itemActual.respuesta_correcta = '';
        }
      }
    }

    copia[index] = itemActual;
    onChange(copia);
  };

  const cambiarCantidadAlternativas = (index: number, cant: number) => {
    if (isSubmitting) return;
    const safeCant = Math.max(2, Math.min(10, cant || 2));
    const copia = [...rubrica];
    const item = { ...copia[index] };
    const validas = LETRAS_ABC.slice(0, safeCant);

    item.cantidad_alternativas = safeCant;
    item.opciones_validas = validas;
    if (!validas.includes(item.respuesta_correcta)) {
      item.respuesta_correcta = validas[0];
    }
    copia[index] = item;
    onChange(copia);
  };

  // Helper para manejar criterios de ensayo_multicriterio
  const obtenerCriteriosNormalizados = (criterios?: string[] | CriterioEnsayoItem[]): CriterioEnsayoItem[] => {
    if (!criterios || criterios.length === 0) return [];
    return criterios.map((c) => {
      if (typeof c === 'string') {
        return { nombre: c, puntaje: 1 };
      }
      return c;
    });
  };

  const agregarCriterioEnsayo = (index: number) => {
    if (isSubmitting) return;
    const copia = [...rubrica];
    const item = { ...copia[index] };
    const actuales = obtenerCriteriosNormalizados(item.criterios_ensayo);
    actuales.push({
      nombre: `Criterio ${actuales.length + 1}`,
      puntaje: 1,
    });
    item.criterios_ensayo = actuales;
    copia[index] = item;
    onChange(copia);
  };

  const actualizarCriterioEnsayo = (
    itemIndex: number,
    critIndex: number,
    campo: keyof CriterioEnsayoItem,
    valor: any
  ) => {
    if (isSubmitting) return;
    const copia = [...rubrica];
    const item = { ...copia[itemIndex] };
    const actuales = obtenerCriteriosNormalizados(item.criterios_ensayo);
    actuales[critIndex] = {
      ...actuales[critIndex],
      [campo]: valor,
    };
    item.criterios_ensayo = actuales;

    // Recalcular el puntaje total de la pregunta como la suma de sus criterios
    if (campo === 'puntaje') {
      const sumaPuntajes = actuales.reduce((acc, c) => acc + (Number(c.puntaje) || 0), 0);
      item.puntaje = Number(sumaPuntajes.toFixed(1));
    }

    copia[itemIndex] = item;
    onChange(copia);
  };

  const eliminarCriterioEnsayo = (itemIndex: number, critIndex: number) => {
    if (isSubmitting) return;
    const copia = [...rubrica];
    const item = { ...copia[itemIndex] };
    const actuales = obtenerCriteriosNormalizados(item.criterios_ensayo).filter((_, i) => i !== critIndex);
    item.criterios_ensayo = actuales;
    const sumaPuntajes = actuales.reduce((acc, c) => acc + (Number(c.puntaje) || 0), 0);
    if (sumaPuntajes > 0) {
      item.puntaje = Number(sumaPuntajes.toFixed(1));
    }
    copia[itemIndex] = item;
    onChange(copia);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
        <span>Preguntas configuradas: <strong className="text-slate-800">{rubrica.length}</strong></span>
        <span>Puntaje total acumulado: <strong className="text-amber-700 font-bold">
          {rubrica.reduce((acc, curr) => acc + (Number(curr.puntaje) || 0), 0).toFixed(1)} pts
        </strong></span>
      </div>

      <div className="max-h-[30rem] overflow-y-auto space-y-3 pr-1">
        {rubrica.map((item, idx) => {
          let tipoActual: TipoPregunta = item.tipo_pregunta || (item.tipo as TipoPregunta) || 'opcion_multiple_dinamica';
          if ((tipoActual as any) === 'opcion_multiple') {
            tipoActual = 'opcion_multiple_dinamica';
          }
          const metaTipo = TIPOS_PREGUNTA.find((t) => t.value === tipoActual) || TIPOS_PREGUNTA[0];
          const cantAlts = item.cantidad_alternativas || item.opciones_validas?.length || 4;
          const opcionesDinamicas = LETRAS_ABC.slice(0, Math.max(2, Math.min(10, cantAlts)));

          return (
            <div
              key={item.numero_pregunta}
              className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-amber-400 transition-all space-y-3"
            >
              {/* Fila Superior: Número, Selector de Tipo y Puntaje */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 font-black text-slate-800 text-xs flex items-center justify-center border border-slate-200 shrink-0">
                    P{item.numero_pregunta}
                  </span>

                  {/* Dropdown de Tipo de Pregunta */}
                  <div className="relative">
                    <select
                      value={tipoActual}
                      disabled={isSubmitting}
                      onChange={(e) =>
                        actualizarItem(idx, 'tipo_pregunta', e.target.value as TipoPregunta)
                      }
                      className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-3 pr-7 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {TIPOS_PREGUNTA.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Input de Puntaje */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <label className="text-[11px] font-semibold text-slate-500">Puntaje:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="20"
                    disabled={isSubmitting || tipoActual === 'ensayo_multicriterio'}
                    value={item.puntaje}
                    onChange={(e) =>
                      actualizarItem(idx, 'puntaje', parseFloat(e.target.value) || 1)
                    }
                    className="w-16 px-2 py-1 text-xs text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                    title={tipoActual === 'ensayo_multicriterio' ? 'Se calcula sumando los criterios' : ''}
                  />
                  <span className="text-[11px] text-slate-400">pts</span>
                </div>
              </div>

              {/* RENDERIZADO CONDICIONAL SEGÚN EL TIPO DE PREGUNTA */}

              {/* CASO 1: Opción Múltiple Dinámica */}
              {tipoActual === 'opcion_multiple_dinamica' && (
                <div className="pt-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs">
                      <label className="font-semibold text-slate-600">N° Alternativas:</label>
                      <input
                        type="number"
                        min="2"
                        max="10"
                        disabled={isSubmitting}
                        value={cantAlts}
                        onChange={(e) => cambiarCantidadAlternativas(idx, parseInt(e.target.value) || 4)}
                        className="w-12 px-2 py-1 text-xs text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-600">Alternativa Correcta:</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {opcionesDinamicas.map((opt) => {
                          const seleccionada = item.respuesta_correcta?.toUpperCase() === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => actualizarItem(idx, 'respuesta_correcta', opt)}
                              className={`w-7 h-7 rounded-lg font-black text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                seleccionada
                                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-400'
                                  : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CASO 2: Verdadero / Falso */}
              {tipoActual === 'verdadero_falso' && (
                <div className="pt-1 flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-600">Clave Correcta:</span>
                  <div className="flex items-center gap-2">
                    {['V', 'F'].map((opt) => {
                      const seleccionada = item.respuesta_correcta?.toUpperCase() === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => actualizarItem(idx, 'respuesta_correcta', opt)}
                          className={`px-3 py-1 rounded-lg font-black text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            seleccionada
                              ? opt === 'V'
                                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                                : 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400'
                              : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {opt === 'V' ? 'Verdadero (V)' : 'Falso (F)'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CASO 3: Verdadero / Falso Justificado */}
              {tipoActual === 'verdadero_falso_justificado' && (
                <div className="pt-1 space-y-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-slate-600">Clave Correcta:</span>
                    <div className="flex items-center gap-2">
                      {['V', 'F'].map((opt) => {
                        const seleccionada = item.respuesta_correcta?.toUpperCase() === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => actualizarItem(idx, 'respuesta_correcta', opt)}
                            className={`px-3 py-1 rounded-lg font-black text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              seleccionada
                                ? opt === 'V'
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                                  : 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400'
                                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {opt === 'V' ? 'Verdadero (V)' : 'Falso (F)'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {item.respuesta_correcta?.toUpperCase() === 'F' && (
                    <div className="space-y-1.5 p-3 bg-rose-50/50 border border-rose-200 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-rose-900 flex items-center gap-1.5">
                          <AlignLeft className="w-3.5 h-3.5 text-rose-600" />
                          <span>Criterio de Justificación Esperada (Corrección del alumno):</span>
                        </label>
                        <span className="text-[10px] text-rose-600 font-medium">Requerido si es F</span>
                      </div>
                      <textarea
                        rows={2}
                        disabled={isSubmitting}
                        placeholder="Ejemplo: Debe indicar que las mitocondrias poseen su propio ADN circular y sintetizan ATP..."
                        value={item.respuesta_esperada_texto || ''}
                        onChange={(e) => actualizarItem(idx, 'respuesta_esperada_texto', e.target.value)}
                        className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* CASO 4: Completar Espacios o Respuesta Corta (Tags / Palabras Clave) */}
              {(tipoActual === 'completar_espacios' || tipoActual === 'respuesta_corta') && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-700" />
                      <span>Palabras / Frases Exactas Esperadas (separadas por comas):</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Gemini aceptará sinónimos clínicos</span>
                  </div>
                  <input
                    type="text"
                    disabled={isSubmitting}
                    placeholder="ej. glucólisis, citoplasma, piruvato"
                    value={item.palabras_clave ? item.palabras_clave.join(', ') : item.respuesta_correcta || ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const arr = raw.split(',').map((s) => s.trim()).filter(Boolean);
                      const copia = [...rubrica];
                      copia[idx] = {
                        ...copia[idx],
                        palabras_clave: arr,
                        respuesta_correcta: raw,
                      };
                      onChange(copia);
                    }}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />

                  {/* Visualización de tags generados */}
                  {item.palabras_clave && item.palabras_clave.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Términos validados:</span>
                      {item.palabras_clave.map((kw, kIdx) => (
                        <span
                          key={kIdx}
                          className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CASO 5: Ordenamiento / Secuencia Lógica */}
              {tipoActual === 'ordenamiento_secuencia' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <ArrowDown10 className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Orden Cronológico o Lógico Esperado:</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Permite puntaje parcial</span>
                  </div>
                  <textarea
                    rows={2}
                    disabled={isSubmitting}
                    placeholder="Ejemplo: 1-C, 2-A, 3-D, 4-B (o Secuencia: Proface -> Metafase -> Anafase -> Telofase)"
                    value={item.respuesta_correcta || ''}
                    onChange={(e) => actualizarItem(idx, 'respuesta_correcta', e.target.value)}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:bg-white focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>
              )}

              {/* CASO 6: Rotulado de Imagen */}
              {tipoActual === 'rotulado_imagen' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                      <span>Etiquetas asociadas a las partes del Gráfico o Diagrama:</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Inspección espacial de flechas</span>
                  </div>
                  <textarea
                    rows={2}
                    disabled={isSubmitting}
                    placeholder="Ejemplo: 1 / Arriba: Estómago, 2 / Derecha: Hígado, 3 / Centro: Duodeno, 4 / Abajo: Páncreas"
                    value={item.respuesta_correcta || ''}
                    onChange={(e) => actualizarItem(idx, 'respuesta_correcta', e.target.value)}
                    className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                </div>
              )}

              {/* CASO 7: Ensayo Multicriterio Dinámico */}
              {tipoActual === 'ensayo_multicriterio' && (
                <div className="space-y-3 pt-1 p-3 bg-violet-50/40 border border-violet-200 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-violet-950 flex items-center gap-1.5">
                      <ListPlus className="w-3.5 h-3.5 text-violet-600" />
                      <span>Rúbrica Desglosada por Criterios Independientes:</span>
                    </label>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => agregarCriterioEnsayo(idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3" /> Añadir Criterio
                    </button>
                  </div>

                  {/* Lista de criterios */}
                  <div className="space-y-2">
                    {obtenerCriteriosNormalizados(item.criterios_ensayo).map((crit, cIdx) => (
                      <div
                        key={cIdx}
                        className="flex items-center gap-2 bg-white p-2 border border-violet-200 rounded-lg shadow-2xs"
                      >
                        <span className="text-[11px] font-black text-violet-800 w-5 text-center">
                          {cIdx + 1}.
                        </span>
                        <input
                          type="text"
                          disabled={isSubmitting}
                          placeholder="Nombre del criterio (ej. Ortografía, Coherencia, Uso de fuentes)"
                          value={crit.nombre}
                          onChange={(e) =>
                            actualizarCriterioEnsayo(idx, cIdx, 'nombre', e.target.value)
                          }
                          className="flex-1 px-2.5 py-1 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded focus:ring-2 focus:ring-violet-500 focus:bg-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          required
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            min="0.5"
                            max="20"
                            disabled={isSubmitting}
                            value={crit.puntaje}
                            onChange={(e) =>
                              actualizarCriterioEnsayo(
                                idx,
                                cIdx,
                                'puntaje',
                                parseFloat(e.target.value) || 0.5
                              )
                            }
                            className="w-14 px-2 py-1 text-xs text-center font-bold text-violet-900 bg-slate-50 border border-slate-300 rounded focus:ring-2 focus:ring-violet-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <span className="text-[10px] text-slate-400">pts</span>
                        </div>
                        {obtenerCriteriosNormalizados(item.criterios_ensayo).length > 1 && (
                          <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => eliminarCriterioEnsayo(idx, cIdx)}
                            className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Eliminar criterio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Consigna General / Pregunta del Ensayo:
                    </label>
                    <textarea
                      rows={2}
                      disabled={isSubmitting}
                      placeholder="Redacta la pregunta o tema que el alumno debe desarrollar extensamente..."
                      value={item.respuesta_correcta || ''}
                      onChange={(e) => actualizarItem(idx, 'respuesta_correcta', e.target.value)}
                      className="w-full px-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                </div>
              )}

              {/* CASO 8: Texto Abierto, Cálculo, Columnas, Gráficos clásicos */}
              {tipoActual !== 'opcion_multiple_dinamica' &&
                tipoActual !== 'verdadero_falso' &&
                tipoActual !== 'verdadero_falso_justificado' &&
                tipoActual !== 'completar_espacios' &&
                tipoActual !== 'respuesta_corta' &&
                tipoActual !== 'ordenamiento_secuencia' &&
                tipoActual !== 'rotulado_imagen' &&
                tipoActual !== 'ensayo_multicriterio' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                        {metaTipo.icon}
                        <span>Criterio de Evaluación / Respuesta Esperada por la IA:</span>
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Gemini comparará semánticamente contra esto
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      disabled={isSubmitting}
                      placeholder={metaTipo.placeholder}
                      value={item.respuesta_correcta || ''}
                      onChange={(e) => actualizarItem(idx, 'respuesta_correcta', e.target.value)}
                      className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Botones de Acción con Bloqueo de UI (isSubmitting) y Redirección Segura */}
      {showActionButtons && (
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleVolver}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelar}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleGuardar}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Guardar Rúbrica</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
