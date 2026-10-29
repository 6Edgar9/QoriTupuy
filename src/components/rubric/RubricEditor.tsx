'use client';

import React from 'react';
import { ItemRubrica, TipoPregunta } from '@/types/database';
import {
  CheckSquare,
  FileText,
  GitMerge,
  PieChart,
  Calculator,
  HelpCircle,
} from 'lucide-react';

interface RubricEditorProps {
  rubrica: ItemRubrica[];
  onChange: (nuevaRubrica: ItemRubrica[]) => void;
}

const TIPOS_PREGUNTA: { value: TipoPregunta; label: string; icon: React.ReactNode; placeholder: string }[] = [
  {
    value: 'opcion_multiple',
    label: 'Opción Múltiple (A, B, C, D, E)',
    icon: <CheckSquare className="w-3.5 h-3.5 text-amber-600" />,
    placeholder: '',
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
    icon: <Calculator className="w-3.5 h-3.5 text-emerald-600" />,
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
    icon: <PieChart className="w-3.5 h-3.5 text-rose-600" />,
    placeholder: 'Ejemplo: Diagrama de flujo circular de la renta con familias y empresas identificadas...',
  },
];

export default function RubricEditor({ rubrica, onChange }: RubricEditorProps) {
  const actualizarItem = (
    index: number,
    campo: keyof ItemRubrica,
    valor: any
  ) => {
    const copia = [...rubrica];
    copia[index] = {
      ...copia[index],
      [campo]: valor,
    };

    // Si cambia de tipo y pasa a opcion_multiple, asegurar que la clave sea una letra válida si no lo era
    if (campo === 'tipo_pregunta') {
      if (valor === 'opcion_multiple' && !['A', 'B', 'C', 'D', 'E'].includes(copia[index].respuesta_correcta)) {
        copia[index].respuesta_correcta = 'A';
      } else if (valor !== 'opcion_multiple' && ['A', 'B', 'C', 'D', 'E'].includes(copia[index].respuesta_correcta)) {
        copia[index].respuesta_correcta = '';
      }
    }

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
          const tipoActual = item.tipo_pregunta || (item.tipo as TipoPregunta) || 'opcion_multiple';
          const metaTipo = TIPOS_PREGUNTA.find((t) => t.value === tipoActual) || TIPOS_PREGUNTA[0];

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
              {tipoActual === 'opcion_multiple' ? (
                /* Caso 1: Opción Múltiple -> Botones A, B, C, D, E */
                <div className="pt-1 flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600">Alternativa Correcta:</span>
                  <div className="flex items-center gap-1.5">
                    {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                      const seleccionada = item.respuesta_correcta?.toUpperCase() === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => actualizarItem(idx, 'respuesta_correcta', opt)}
                          className={`w-8 h-8 rounded-lg font-black text-xs transition-all ${
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
              ) : (
                /* Caso 2: Pregunta Multimodal (Texto Abierto, Cálculo, Relacionar, Esquema) */
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

