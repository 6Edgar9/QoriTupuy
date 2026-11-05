'use client';

import React from 'react';
import { ItemRubrica, TipoPregunta } from '@/types/database';
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
} from 'lucide-react';

interface RubricEditorProps {
  rubrica: ItemRubrica[];
  onChange: (nuevaRubrica: ItemRubrica[]) => void;
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

export default function RubricEditor({ rubrica, onChange }: RubricEditorProps) {
  const actualizarItem = (
    index: number,
    campo: keyof ItemRubrica,
    valor: any
  ) => {
    const copia = [...rubrica];
    const itemActual = { ...copia[index], [campo]: valor };

    // Si cambia de tipo de pregunta, ajustar defaults coherentes
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
      } else {
        // Texto abierto, cálculo, esquemas, etc.
        if (['A', 'B', 'C', 'D', 'E', 'V', 'F'].includes(itemActual.respuesta_correcta)) {
          itemActual.respuesta_correcta = '';
        }
      }
    }

    copia[index] = itemActual;
    onChange(copia);
  };

  const cambiarCantidadAlternativas = (index: number, cant: number) => {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500 pb-1 border-b border-slate-100">
        <span>Preguntas configuradas: <strong className="text-slate-800">{rubrica.length}</strong></span>
        <span>Puntaje total acumulado: <strong className="text-amber-700 font-bold">
          {rubrica.reduce((acc, curr) => acc + (Number(curr.puntaje) || 0), 0).toFixed(1)} pts
        </strong></span>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
        {rubrica.map((item, idx) => {
          let tipoActual: TipoPregunta = item.tipo_pregunta || (item.tipo as TipoPregunta) || 'opcion_multiple_dinamica';
          // normalizar si venía como opcion_multiple clásico
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
                  <span className="w-8 h-8 rounded-lg bg-slate-100 font-black text-slate-800 text-xs flex items-center justify-center border border-slate-200">
                    P{item.numero_pregunta}
                  </span>

                  {/* Dropdown de Tipo de Pregunta */}
                  <div className="relative">
                    <select
                      value={tipoActual}
                      onChange={(e) =>
                        actualizarItem(idx, 'tipo_pregunta', e.target.value as TipoPregunta)
                      }
                      className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg py-1.5 pl-3 pr-7 focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
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
                    value={item.puntaje}
                    onChange={(e) =>
                      actualizarItem(idx, 'puntaje', parseFloat(e.target.value) || 1)
                    }
                    className="w-16 px-2 py-1 text-xs text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                      <label className="font-semibold text-slate-600">N° de Alternativas:</label>
                      <input
                        type="number"
                        min="2"
                        max="10"
                        value={cantAlts}
                        onChange={(e) => cambiarCantidadAlternativas(idx, parseInt(e.target.value) || 4)}
                        className="w-12 px-2 py-1 text-xs text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                              onClick={() => actualizarItem(idx, 'respuesta_correcta', opt)}
                              className={`w-7 h-7 rounded-lg font-black text-xs transition-all ${seleccionada
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
                          onClick={() => actualizarItem(idx, 'respuesta_correcta', opt)}
                          className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${seleccionada
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
                            onClick={() => actualizarItem(idx, 'respuesta_correcta', opt)}
                            className={`px-3 py-1 rounded-lg font-black text-xs transition-all ${seleccionada
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

                  {/* Si es Falso, desplegar textarea para Criterio de Justificación Esperada */}
                  {item.respuesta_correcta?.toUpperCase() === 'F' && (
                    <div className="space-y-1.5 p-3 bg-rose-50/50 border border-rose-200 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-rose-900 flex items-center gap-1.5">
                          <AlignLeft className="w-3.5 h-3.5 text-rose-600" />
                          <span>Criterio de Justificación Esperada (Corrección que debe escribir el alumno):</span>
                        </label>
                        <span className="text-[10px] text-rose-600 font-medium">Requerido si es F</span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Ejemplo: Debe escribir que las mitocondrias poseen su propio ADN circular y no son sintetizadas por el aparato de Golgi..."
                        value={item.respuesta_esperada_texto || ''}
                        onChange={(e) => actualizarItem(idx, 'respuesta_esperada_texto', e.target.value)}
                        className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* CASO 4: Demás preguntas multimodales (Texto Abierto, Cálculo, Relacionar, Esquema) */}
              {tipoActual !== 'opcion_multiple_dinamica' &&
                tipoActual !== 'verdadero_falso' &&
                tipoActual !== 'verdadero_falso_justificado' && (
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
                      placeholder={metaTipo.placeholder}
                      value={item.respuesta_correcta || ''}
                      onChange={(e) => actualizarItem(idx, 'respuesta_correcta', e.target.value)}
                      className="w-full px-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-none resize-none"
                      required
                    />
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
