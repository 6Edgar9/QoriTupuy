'use client';

import React, { useMemo } from 'react';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  HelpCircle,
  BrainCircuit,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ExamenAlumno, DetalleRespuestaItem, DesglosePregunta } from '@/types/database';

interface InsightsProps {
  examenes: ExamenAlumno[];
}

interface EstadisticaPregunta {
  numero: number;
  totalIntentos: number;
  totalAciertos: number;
  totalFallos: number;
  porcentajeFallo: number;
  porcentajeAcierto: number;
}

export default function Insights({ examenes }: InsightsProps) {
  // Analizar únicamente los exámenes calificados válidos (confianza_lectura true)
  const examenesValidos = useMemo(
    () => examenes.filter((ex) => Boolean(ex.confianza_lectura) === true),
    [examenes]
  );

  const estadisticasPreguntas = useMemo<EstadisticaPregunta[]>(() => {
    if (examenesValidos.length === 0) return [];

    const conteo: Record<number, { intentos: number; aciertos: number; fallos: number }> = {};

    examenesValidos.forEach((ex) => {
      // Extraer datos ya sea de detalle_respuestas o de desglose_json
      let items: Array<DetalleRespuestaItem | DesglosePregunta> = [];

      if (ex.detalle_respuestas) {
        try {
          items =
            typeof ex.detalle_respuestas === 'string'
              ? JSON.parse(ex.detalle_respuestas)
              : ex.detalle_respuestas;
        } catch (e) {
          items = [];
        }
      }

      if (!items || items.length === 0) {
        try {
          items =
            typeof ex.desglose_json === 'string'
              ? JSON.parse(ex.desglose_json)
              : ex.desglose_json || [];
        } catch (e) {
          items = [];
        }
      }

      if (Array.isArray(items)) {
        items.forEach((item) => {
          const num = item.numero_pregunta;
          if (num === undefined || num === null) return;

          if (!conteo[num]) {
            conteo[num] = { intentos: 0, aciertos: 0, fallos: 0 };
          }

          conteo[num].intentos += 1;
          if (item.es_correcta) {
            conteo[num].aciertos += 1;
          } else {
            conteo[num].fallos += 1;
          }
        });
      }
    });

    const numerosOrdenados = Object.keys(conteo)
      .map(Number)
      .sort((a, b) => a - b);

    return numerosOrdenados.map((num) => {
      const data = conteo[num];
      const porcentajeFallo =
        data.intentos > 0 ? Math.round((data.fallos / data.intentos) * 100) : 0;
      const porcentajeAcierto = 100 - porcentajeFallo;

      return {
        numero: num,
        totalIntentos: data.intentos,
        totalAciertos: data.aciertos,
        totalFallos: data.fallos,
        porcentajeFallo,
        porcentajeAcierto,
      };
    });
  }, [examenesValidos]);

  // Preguntas con tasa de fallo crítica (>= 60%)
  const preguntasCriticas = useMemo(
    () => estadisticasPreguntas.filter((p) => p.porcentajeFallo >= 60),
    [estadisticasPreguntas]
  );

  // Pregunta más difícil y más accesible
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
    const tasaGlobalAcierto =
      totalIntentosGlobal > 0 ? Math.round((totalAciertosGlobal / totalIntentosGlobal) * 100) : 0;

    return { masDificil, masFacil, tasaGlobalAcierto };
  }, [estadisticasPreguntas]);

  if (examenesValidos.length === 0 || estadisticasPreguntas.length === 0) {
    return null;
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
              Diagnóstico pedagógico automático extraído del desglose de {examenesValidos.length} exámenes calificados.
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
              key={p.numero}
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
                  {p.totalFallos} de {p.totalIntentos} estudiantes no obtuvieron puntaje completo en este ítem. Considere revisar la claridad de la rúbrica o repasar este tema pedagógico en clase.
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
            <div className="text-[11px] text-slate-500 font-medium">Ítems Evaluados</div>
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
                key={p.numero}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-800 bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                      P{p.numero}
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

