import { Timestamp } from 'firebase/firestore';

/**
 * Estado de procesamiento y validación del examen
 */
export type EstadoRevision = 'aprobado_ia' | 'requiere_revision_manual' | 'corregido_manual';

/**
 * Tipos de preguntas soportadas por el motor multimodal de Gemini 1.5 Pro
 */
export type TipoPregunta =
  | 'opcion_multiple'
  | 'texto_abierto'
  | 'relacionar_columnas'
  | 'grafico_esquema'
  | 'calculo';

/**
 * Modelo para las opciones de respuesta y criterios en la rúbrica
 */
export interface ItemRubrica {
  numero_pregunta: number;
  tipo_pregunta: TipoPregunta;
  tipo?: string; // Retrocompatibilidad
  opciones_validas?: string[]; // ej. ['A', 'B', 'C', 'D', 'E'] para opción múltiple
  respuesta_correcta: string; // Para opción múltiple: 'A', 'B', etc. Para el resto: Criterio de Evaluación / Respuesta Esperada amplia
  puntaje: number;
  penalidad_error?: number;
}

/**
 * 1. Colección: Cursos
 * Ruta: /cursos/{cursoId}
 */
export interface Curso {
  id?: string;
  codigo: string;          // ej. "MAT-201"
  nombre: string;          // ej. "Cálculo Multivariable"
  periodo: string;         // ej. "2026-II"
  profesor_id?: string;
  creado_el: Timestamp | Date | string;
  actualizado_el?: Timestamp | Date | string;
}

/**
 * 2. Subcolección: Evaluaciones
 * Ruta: /cursos/{cursoId}/evaluaciones/{evaluacionId}
 */
export interface Evaluacion {
  id?: string;
  curso_id: string;
  titulo: string;          // ej. "Examen Parcial 1"
  fecha_evaluacion: string;
  puntaje_maximo: number;  // ej. 20
  creado_el: Timestamp | Date | string;
}

/**
 * 3. Subcolección: Secciones (Variantes de examen por fila/grupo)
 * Ruta: /cursos/{cursoId}/evaluaciones/{evaluacionId}/secciones/{seccionId}
 */
export interface Seccion {
  id?: string;
  evaluacion_id: string;
  nombre: string;          // ej. "Fila A", "Fila B", "Sección 101"
  total_preguntas: number;
  rubrica: ItemRubrica[];  // Lista de respuestas correctas y ponderaciones
  url_plantilla_pdf?: string;
  creado_el: Timestamp | Date | string;
}

/**
 * Detalle individual por pregunta calificada por la IA o el docente
 */
export interface DesglosePregunta {
  numero_pregunta: number;
  tipo_pregunta?: TipoPregunta;
  respuesta_detectada: string;
  respuesta_correcta: string;
  es_correcta: boolean;
  puntaje_obtenido: number;
  confianza_item: number; // 0-100
  justificacion?: string;
  observaciones?: string;
}

/**
 * 4. Subcolección: Examenes_Alumnos
 * Ruta: /cursos/{cursoId}/evaluaciones/{evaluacionId}/secciones/{seccionId}/examenes_alumnos/{examenId}
 */
export interface ExamenAlumno {
  id?: string;
  seccion_id: string;
  evaluacion_id: string;
  curso_id: string;
  codigo_alumno?: string;
  nombre: string;
  nota_total: number;
  nota_maxima: number;
  confianza_lectura: number; // 0-100 calculado por visión multimodal
  estado_revision: EstadoRevision;
  url_pdf: string;
  ruta_storage_pdf: string;
  desglose_json: DesglosePregunta[];
  motivo_revision_manual?: string;
  revisado_por?: string;
  creado_el: Timestamp | Date | string;
  actualizado_el?: Timestamp | Date | string;
}

/**
 * Payload esperado por el endpoint /api/grade-exam
 */
export interface GradeExamRequest {
  curso_id: string;
  evaluacion_id: string;
  seccion_id: string;
  url_pdf: string;
  storage_path: string;
  rubrica: ItemRubrica[];
}

/**
 * Estructura de salida estricta esperada de Gemini 1.5 Pro
 */
export interface GeminiGradeResult {
  nombre_alumno: string;
  codigo_alumno?: string;
  confianza_lectura: number; // 0 a 100
  nota_total: number;
  requiere_revision_humana: boolean;
  motivo_alerta?: string;
  desglose: {
    numero_pregunta: number;
    respuesta_detectada: string;
    confianza_pregunta: number; // 0 a 100
    observaciones?: string;
  }[];
}

