'use client';

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  BrainCircuit,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ExamenAlumno, DetalleRespuestaItem } from '@/types/database';

interface InsightsProps {
  examenes: ExamenAlumno[];
}

interface EstadisticaPregunta {
  indice: number;
  numero: number;
  etiqueta: string;
  textoPregunta?: string;
  totalIntentos: number;
  totalAciertos: number;
  totalFallos: number;
  porcentajeFallo: number;
  porcentajeAcierto: number;
}

/**
 * Parsea de forma segura el campo detalle_respuestas de un examen.
 * Espera un arreglo (Array) de objetos con la estructura:
 * { "question": "...", "correctAnswer": "...", "userAnswer": "...", "userIsCorrect": boolean }
 * Verifica siempre si detalle_respuestas existe y es un string válido antes de parsearlo para evitar errores.
 */
function parsearArrayRespuestas(raw: unknown): DetalleRespuestaItem[] {
  if (!raw) return [];

  // Si ya es un array de objetos
  if (Array.isArray(raw)) {
    return raw;
  }

  // Si es un string, verificar existencia y contenido antes de JSON.parse
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // En caso de que viniera como objeto/diccionario, convertir sus valores a array
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed);
      }
    } catch {
      return [];
    }
  }

  return [];
}

export default function Insights({ examenes }: InsightsProps) {
  // 1. Itera exclusivamente sobre los exámenes válidos (confianza_lectura === true)
  const examenesValidos = useMemo(() => {
    if (!Array.isArray(examenes)) return [];
    return examenes.filter((ex) => Boolean(ex.confianza_lectura) === true);
  }, [examenes]);

  // 2. Cálculo dinámico de fallos utilizando un Map por índice de pregunta
  const estadisticasPreguntas = useMemo<EstadisticaPregunta[]>(() => {
    // Prevención de NaN si no hay exámenes válidos
    if (examenesValidos.length === 0) return [];

    // Map temporal para contar los fallos por el índice de la pregunta (0, 1, 2...)
    const mapaConteo = new Map<
      number,
      {
        totalIntentos: number;
        totalFallos: number;
        totalAciertos: number;
        numero: number;
        textoPregunta?: string;
      }
    >();

    for (const examen of examenesValidos) {
      // Parseo correcto del JSON esperando un Array de objetos
      let respuestas = parsearArrayRespuestas(examen.detalle_respuestas);

      // Si detalle_respuestas viene vacío, intentar con desglose_json como respaldo
      if (respuestas.length === 0 && examen.desglose_json) {
        respuestas = parsearArrayRespuestas(examen.desglose_json);
      }

      if (!Array.isArray(respuestas) || respuestas.length === 0) {
        continue;
      }

      // Por cada examen, itera sobre el array de respuestas
      respuestas.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;

        if (!mapaConteo.has(index)) {
          const numPregunta = item.numero_pregunta || index + 1;
          const texto = item.question || `Pregunta ${numPregunta}`;
          mapaConteo.set(index, {
            totalIntentos: 0,
            totalFallos: 0,
            totalAciertos: 0,
            numero: numPregunta,
            textoPregunta: texto,
          });
        }

        const registro = mapaConteo.get(index)!;
        registro.totalIntentos += 1;

        // Evaluar campo userIsCorrect (con soporte para es_correcta)
        const isCorrect =
          item.userIsCorrect !== undefined
            ? Boolean(item.userIsCorrect)
            : item.es_correcta !== undefined
            ? Boolean(item.es_correcta)
            : false;

        // Si userIsCorrect === false, incrementa el contador de fallos para ese índice
        if (!isCorrect) {
          registro.totalFallos += 1;
        } else {
          registro.totalAciertos += 1;
        }
      });
    }

    if (mapaConteo.size === 0) return [];

    const resultados: EstadisticaPregunta[] = [];
    const indicesOrdenados = Array.from(mapaConteo.keys()).sort((a, b) => a - b);

    for (const index of indicesOrdenados) {
      const info = mapaConteo.get(index)!;

      // Prevención de NaN: Si ningún alumno respondió esa pregunta específica
      if (info.totalIntentos === 0) continue;

      // Calcula el porcentaje de fallos dividiendo la cantidad de fallos de esa pregunta
      // entre el total de alumnos válidos que respondieron esa pregunta específica.
      const rawPorcentajeFallo = (info.totalFallos / info.totalIntentos) * 100;
      const porcentajeFallo = isNaN(rawPorcentajeFallo)
        ? 0
        : Math.min(100, Math.max(0, Math.round(rawPorcentajeFallo)));

      const porcentajeAcierto = Math.max(0, 100 - porcentajeFallo);
      const etiqueta = `P${info.numero}`;

      resultados.push({
        indice: index,
        numero: info.numero,
        etiqueta,
        textoPregunta: info.textoPregunta,
        totalIntentos: info.totalIntentos,
        totalAciertos: info.totalAciertos,
        totalFallos: info.totalFallos,
        porcentajeFallo,
        porcentajeAcierto,
      });
    }

    return resultados;
  }, [examenesValidos]);

  // Preguntas con tasa de fallo crítica (>= 60%)
  const preguntasCriticas = useMemo(
    () => estadisticasPreguntas.filter((p) => p.porcentajeFallo >= 60),
    [estadisticasPreguntas]
  );

  // Pregunta más difícil, más accesible y tasa global segura (sin NaN)
  const { masDificil, masFacil, tasaGlobalAcierto } = useMemo(() => {
    if (estadisticasPreguntas.length === 0) {
      return { masDificil: null, masFacil: null, tasaGlobalAcierto: 0 };
    }

    const copiaPorFallo = [...estadisticasPreguntas].sort(
      (a, b) => b.porcentajeFallo - a.porcentajeFallo
    );
    const masDificil = copiaPorFallo[0];
    const masFacil = copiaPorFallo[copiaPorFallo.length - 1];

    const totalAciertosGlobal = estadisticasPreguntas.reduce((acc, p) => acc + p.totalAciertos, 0);
    const totalIntentosGlobal = estadisticasPreguntas.reduce((acc, p) => acc + p.totalIntentos, 0);
    const rawTasaGlobal =
      totalIntentosGlobal > 0 ? (totalAciertosGlobal / totalIntentosGlobal) * 100 : 0;
    const tasaGlobalAcierto = isNaN(rawTasaGlobal) ? 0 : Math.round(rawTasaGlobal);

    return { masDificil, masFacil, tasaGlobalAcierto };
  }, [estadisticasPreguntas]);

  // Prevención de NaN y estado vacío si no hay exámenes válidos ni preguntas
  if (examenesValidos.length === 0 || estadisticasPreguntas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Analíticas de Dificultad & Curva de Aprendizaje
            </h3>
            <p className="text-xs text-slate-400">
              No hay respuestas de exámenes válidos registradas aún para calcular estadísticas.
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full">
          0% Acierto General
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      {/* Título del Dashboard de Analíticas */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Analíticas de Dificultad & Curva de Aprendizaje
            </h3>
            <p className="text-xs text-slate-500">
              Diagnóstico pedagógico dinámico sobre {examenesValidos.length} exámenes calificados.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          {tasaGlobalAcierto}% Acierto General
        </span>
      </div>

      {/* Alertas Automáticas Críticas (Si fallo >= 60%) */}
      {preguntasCriticas.length > 0 ? (
        <div className="space-y-2">
          {preguntasCriticas.map((p) => (
            <div
              key={p.indice}
              className="p-3.5 bg-rose-50/90 border border-rose-300 rounded-xl text-rose-950 flex items-start gap-3 animate-in fade-in duration-200"
            >
              <div className="p-1.5 bg-rose-600 text-white rounded-lg mt-0.5 shrink-0 shadow-xs">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-rose-900 text-sm">
                  ⚠️ Atención: El {p.porcentajeFallo}% de los alumnos falló la Pregunta {p.numero}
                </span>
                <p className="text-rose-800 leading-relaxed">
                  {p.totalFallos} de {p.totalIntentos} estudiantes evaluados en este ítem no obtuvieron la respuesta correcta. Considere revisar la claridad de la rúbrica o repasar este tema pedagógico en clase.
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-2.5 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Rendimiento Equilibrado:</strong> Ninguna pregunta superó el umbral crítico del 60% de fallo en esta sección.
          </span>
        </div>
      )}

      {/* Tarjetas Resumen de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Pregunta con Mayor Dificultad</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {masDificil ? `Pregunta ${masDificil.numero}` : '—'}
            </div>
          </div>
          {masDificil && (
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              {masDificil.porcentajeFallo}% fallos
            </span>
          )}
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Pregunta con Mayor Acierto</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {masFacil ? `Pregunta ${masFacil.numero}` : '—'}
            </div>
          </div>
          {masFacil && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {masFacil.porcentajeAcierto}% aciertos
            </span>
          )}
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Ítems Evaluados Dinámicamente</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {estadisticasPreguntas.length} Preguntas
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
            {examenesValidos.length} alumnos
          </span>
        </div>
      </div>

      {/* Barras de Desglose por Pregunta */}
      <div className="space-y-2 pt-1">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Desglose de Desempeño por Ítem
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {estadisticasPreguntas.map((p) => {
            const esCritica = p.porcentajeFallo >= 60;
            const esModerada = p.porcentajeFallo >= 40 && p.porcentajeFallo < 60;

            return (
              <div
                key={p.indice}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                      {p.etiqueta}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {p.totalAciertos}/{p.totalIntentos} aciertos
                    </span>
                  </div>

                  <span
                    className={`font-bold text-[11px] px-1.5 py-0.5 rounded ${
                      esCritica
                        ? 'text-rose-700 bg-rose-100'
                        : esModerada
                        ? 'text-amber-800 bg-amber-100'
                        : 'text-emerald-700 bg-emerald-100'
                    }`}
                  >
                    {p.porcentajeFallo}% fallos
                  </span>
                </div>

                {/* Barra de progreso visual */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-2 transition-all duration-300"
                    style={{ width: `${p.porcentajeAcierto}%` }}
                    title={`${p.porcentajeAcierto}% aciertos`}
                  />
                  <div
                    className={`${esCritica ? 'bg-rose-500' : 'bg-amber-400'} h-2 transition-all duration-300`}
                    style={{ width: `${p.porcentajeFallo}%` }}
                    title={`${p.porcentajeFallo}% fallos`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
