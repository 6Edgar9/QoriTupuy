import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ItemRubrica, DesglosePregunta, TipoPregunta } from '@/types/database';

// Modelos Gemini candidatos en orden de preferencia y resiliencia
// Se prioriza gemini-2.5-flash por su alta disponibilidad, velocidad y soporte multimodal activo
const PRIMARY_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
].filter(Boolean) as string[];

const RESCUE_MODELS = [
  'gemini-1.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro',
];

// Helper para pausas asíncronas
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Función auxiliar para detectar si un error es transitorio (503 UNAVAILABLE, 429 RATE_LIMIT/QUOTA o fallos de red)
 */
function isTransientError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const status = error.status || '';
  const code = error.code || '';

  return (
    code === 503 ||
    code === 429 ||
    status === 'UNAVAILABLE' ||
    status === 'RESOURCE_EXHAUSTED' ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('timeout') ||
    msg.includes('socket hang up')
  );
}
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Variable de entorno GEMINI_API_KEY no configurada en el servidor.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Esquema de respuesta estricto para forzar JSON válido desde Gemini 1.5 Pro
 */
export interface GeminiGraderOutput {
  nombre_detectado: string;
  codigo_alumno?: string;
  confianza_lectura: boolean; // true si es legible, false si está en blanco o ilegible
  requiere_revision_humana: boolean;
  motivo_revision_manual?: string;
  desglose: {
    numero_pregunta: number;
    respuesta_detectada: string;
    puntaje_asignado: number;
    es_correcta: boolean;
    confianza_pregunta: number; // 0 - 100
    justificacion: string;
    observaciones?: string;
  }[];
}

/**
 * Resultado evaluado y consolidado con la rúbrica oficial
 */
export interface EvaluacionGradingResult {
  nombre_detectado: string;
  codigo_alumno?: string;
  nota_total: number;
  nota_maxima: number;
  confianza_lectura: boolean;
  requiere_revision_humana: boolean;
  motivo_revision_manual?: string;
  desglose_json: DesglosePregunta[];
}

/**
 * Prompt del sistema para Gemini 1.5 Pro configurado como evaluador universitario multimodal
 */
const SYSTEM_PROMPT = `
Eres "QoriTupuy AI", un evaluador universitario experto y riguroso en visión computacional multimodal, análisis caligráfico, razonamiento anatómico, científico y pedagógico para exámenes manuscritos.
Tu misión es transcribir, interpretar y calificar con máxima precisión las respuestas marcadas, redactadas, calculadas o dibujadas por los estudiantes en la hoja de examen escaneada, contrastándolas contra la RÚBRICA OFICIAL MULTIMODAL.

REGLAS DE EVALUACIÓN SEGÚN EL TIPO DE PREGUNTA:
1. DETECCIÓN DE IDENTIDAD:
   - Extrae el Nombre y Apellidos completos del estudiante detectados en el encabezado.
   - Si existe un campo para Código de Alumno, DNI o Matrícula, extráelo con precisión.

2. EVALUACIÓN ESPECÍFICA POR FORMATO:
   - 'opcion_multiple_dinamica' (u 'opcion_multiple'): Busca la marca del alumno solo entre las X alternativas permitidas (indicadas en cantidad_alternativas u opciones_validas, ej. A, B, C...). Identifica qué letra rellenó, marcó o circuló el estudiante. Si marcó dos y tachó una, determina cuál dejó válida.
   - 'verdadero_falso': Busca marcas como V/F, Verdadero/Falso, T/F o checks/cruces en las casillas correspondientes. Compara directamente con la clave (V o F).
   - 'verdadero_falso_justificado': Primero verifica si el alumno marcó V o F.
       * Si la clave correcta es V y el alumno marcó V: Asigna el puntaje total (no requiere justificación).
       * Si la clave correcta era Falso (F), el alumno DEBE haber marcado F y además DEBE haber escrito una corrección manuscrita. Transcribe mentalmente esa caligrafía manuscrita y compárala semánticamente con el "Criterio de Justificación Esperada" de la rúbrica.
       * Calcula puntaje parcial (ej. 50% de los puntos) si marcó Falso pero omitió o justificó incorrectamente la corrección, o puntaje total (100%) si ambas partes (marca F y justificación escrita) son correctas. Si marcó Verdadero siendo Falso, asigna 0 puntos.
   - 'completar_espacios' / 'respuesta_corta': Busca las palabras manuscritas en los espacios en blanco, líneas punteadas o líneas cortas del examen. Acepta sinónimos clínicos/científicos válidos si el contexto conceptual es correcto, contrastando prioritariamente con el array de 'palabras_clave' y la respuesta esperada.
   - 'ordenamiento_secuencia': Evalúa si los números, letras o flechas manuscritas por el alumno respetan el orden cronológico o lógico indicado en la rúbrica (ej. 1-C, 2-A, 3-D, 4-B). Otorga puntaje parcial si el orden es parcialmente correcto y puntaje total si la secuencia es exacta.
   - 'rotulado_imagen': Realiza una inspección espacial profunda de la imagen o esquema. Sigue visualmente las líneas guía, flechas o señaladores del diagrama impreso hacia donde el alumno escribió a mano, y valida si la palabra manuscrita coincide anatómica, espacial y conceptualmente con la rúbrica.
   - 'ensayo_multicriterio': Lee con atención el texto extenso o ensayo manuscrito. Evalúa y otorga puntaje independiente por CADA UNO de los criterios definidos en 'criterios_ensayo' (ej. Contenido, Coherencia, Uso de términos, Ortografía). Suma los subtotales para determinar la nota final de la pregunta y detalla en la justificación cómo le fue al estudiante en cada criterio evaluado.
   - 'texto_abierto' o 'calculo': Transcribe mentalmente la caligrafía manuscrita del estudiante y compárala semánticamente contra el Criterio de Evaluación de la rúbrica. En cálculos matemáticos, revisa tanto el procedimiento numérico como el resultado final.
   - 'relacionar_columnas' o 'grafico_esquema': Inspecciona visualmente las líneas de conexión, flechas, diagramas o palabras escritas en recuadros del examen y valida si coinciden con la rúbrica esperada.
   - Asigna el puntaje total o parcial (de 0 al puntaje máximo indicado para cada pregunta) según el nivel de acierto, y siempre incluye una justificación breve y clara de por qué asignaste ese puntaje en el campo "justificacion".
   - Si no hay respuesta visible para una pregunta, marca respuesta_detectada como "NO_RESPONDIDA", asigna 0 puntos y anota la ausencia en la justificación.

3. REGLA ESTRICTA DE CONFIANZA DE LECTURA (confianza_lectura: boolean):
   - Si el examen está completamente en blanco, la caligrafía es 100% ininteligible, el archivo está corrupto, o no puedes encontrar respuestas coherentes con la rúbrica, DEBES establecer confianza_lectura en false y explicar la razón en motivo_revision_manual. Si se puede leer y calificar normalmente, establece true.
   - Si confianza_lectura es false, marca además requiere_revision_humana en true.

4. FORMATO DE SALIDA ESTRICTO:
   - Responde EXCLUSIVAMENTE con el objeto JSON estructurado según el esquema solicitado. No agregues texto fuera del JSON.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nombre_detectado: {
      type: Type.STRING,
      description: 'Nombre y apellidos completos del estudiante detectados en el encabezado. Si no se encuentra, devolver "Alumno No Identificado"',
    },
    codigo_alumno: {
      type: Type.STRING,
      description: 'Código de matrícula, DNI o identificador del estudiante. Si no existe o no se distingue, devolver estrictamente una cadena vacía ""',
    },
    confianza_lectura: {
      type: Type.BOOLEAN,
      description: 'Establecer en true si el examen se puede leer y calificar normalmente. Establecer en false si el examen está completamente en blanco, la caligrafía es 100% ininteligible, corrupto o incoherente con la rúbrica.',
    },
    requiere_revision_humana: {
      type: Type.BOOLEAN,
      description: 'Verdadero si confianza_lectura es false o existen anomalías visuales graves que requieran revisión humana',
    },
    motivo_revision_manual: {
      type: Type.STRING,
      description: 'Explicación obligatoria y detallada si confianza_lectura es false o requiere revisión manual. Si se lee normalmente, devolver estrictamente una cadena vacía ""',
    },
    desglose: {
      type: Type.ARRAY,
      description: 'Lista de ítems evaluados pregunta por pregunta',
      items: {
        type: Type.OBJECT,
        properties: {
          numero_pregunta: { type: Type.INTEGER },
          respuesta_detectada: {
            type: Type.STRING,
            description: 'Opción marcada ("A", "B", "V", "F"...), transcripción del texto manuscrito o descripción de lo detectado',
          },
          puntaje_asignado: {
            type: Type.NUMBER,
            description: 'Puntaje asignado (total o parcial) entre 0 y el máximo de la pregunta',
          },
          es_correcta: {
            type: Type.BOOLEAN,
            description: 'Verdadero si la respuesta cumple sustancialmente con el criterio o clave',
          },
          confianza_pregunta: {
            type: Type.NUMBER,
            description: 'Nivel de certeza de lectura de 0 a 100 para este ítem',
          },
          justificacion: {
            type: Type.STRING,
            description: 'Justificación breve de por qué se asignó ese puntaje según el criterio de la rúbrica',
          },
          observaciones: {
            type: Type.STRING,
            description: 'Anotaciones sobre borrones, tachaduras o claridad del trazo manuscrito',
          },
        },
        required: [
          'numero_pregunta',
          'respuesta_detectada',
          'puntaje_asignado',
          'es_correcta',
          'confianza_pregunta',
          'justificacion',
        ],
      },
    },
  },
  required: [
    'nombre_detectado',
    'codigo_alumno',
    'confianza_lectura',
    'requiere_revision_humana',
    'motivo_revision_manual',
    'desglose',
  ],
};

/**
 * Ejecuta la evaluación multimodal de la imagen del examen contra la rúbrica oficial usando Gemini 1.5 Pro.
 * 
 * @param imageBuffer Buffer de la imagen (PNG/JPEG) o documento PDF de la página del examen
 * @param mimeType Tipo MIME ('image/png' | 'image/jpeg' | 'application/pdf')
 * @param rubrica Lista de preguntas, tipos, criterios de evaluación y ponderaciones de la sección
 */
export async function calificarExamenConGemini(
  imageBuffer: Buffer | Uint8Array,
  mimeType: 'image/png' | 'image/jpeg' | 'application/pdf',
  rubrica: ItemRubrica[]
): Promise<EvaluacionGradingResult> {
  const base64Data = Buffer.isBuffer(imageBuffer)
    ? imageBuffer.toString('base64')
    : Buffer.from(imageBuffer).toString('base64');

  const rubricaFormateada = rubrica.map((item) => {
    const tipoNormalizado = item.tipo_pregunta || item.tipo || 'opcion_multiple_dinamica';
    return {
      numero_pregunta: item.numero_pregunta,
      tipo_pregunta: tipoNormalizado,
      cantidad_alternativas: item.cantidad_alternativas,
      opciones_validas: item.opciones_validas,
      clave_o_criterio: item.respuesta_correcta,
      criterio_justificacion_si_falso: item.respuesta_esperada_texto,
      palabras_clave: item.palabras_clave,
      criterios_ensayo: item.criterios_ensayo,
      puntaje_maximo: item.puntaje,
      penalidad_error: item.penalidad_error || 0,
    };
  });

  const userPrompt = `
Por favor, analiza y califica visualmente el examen adjunto contrastándolo contra esta RÚBRICA MULTIMODAL UNIVERSAL:

${JSON.stringify(rubricaFormateada, null, 2)}

Total de preguntas a evaluar: ${rubrica.length}.
Para cada pregunta, evalúa la caligrafía, transcripción, opciones dinámicas, marcas V/F, justificaciones manuscritas, espacios completados, palabras clave, orden de secuencias, rotulados espaciales, ensayos multicriterio, cálculos o esquemas y asigna el puntaje con su respectiva justificación.
`;

  try {
    const ai = getGeminiClient();
    let lastError: Error | null = null;
    let parsedData: GeminiGraderOutput | null = null;

    // Helper para intentar llamar a un modelo con hasta 3 reintentos y backoff exponencial (2s, 4s, 8s)
    async function callWithExponentialBackoff(modelName: string): Promise<GeminiGraderOutput | null> {
      const maxRetries = 3;
      const delays = [2000, 4000, 8000];

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          console.log(`🤖 [Gemini Grader] Intentando evaluar con modelo "${modelName}" (Intento ${attempt + 1}/${maxRetries})...`);

          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType,
                      data: base64Data,
                    },
                  },
                  {
                    text: userPrompt,
                  },
                ],
              },
            ],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              temperature: 0.1, // Determinismo y rigurosidad
              responseMimeType: 'application/json',
              responseSchema,
            },
          });

          const responseText = response.text?.trim() || '{}';
          const parsed = JSON.parse(responseText);
          if (parsed && typeof parsed.nombre_detectado !== 'undefined') {
            console.log(`✅ [Gemini Grader] Evaluación exitosa con "${modelName}".`);
            return parsed;
          }
        } catch (err: any) {
          lastError = err as Error;
          const isTransient = isTransientError(err);
          console.warn(`⚠️ [Gemini Grader] Fallo en intento ${attempt + 1}/${maxRetries} con "${modelName}":`, err.message);

          if (isTransient && attempt < maxRetries - 1) {
            const delayMs = delays[attempt];
            console.log(`⏳ [Backoff] Esperando ${delayMs / 1000}s antes de reintentar por saturación/cuota (503/429)...`);
            await wait(delayMs);
          } else if (!isTransient) {
            // Si es un error definitivo no transitorio de este modelo (ej: 404 no disponible), saltar de inmediato al siguiente modelo
            console.warn(`⏭️ [Gemini Grader] Error permanente para ${modelName}, evaluando alternativas...`);
            break;
          }
        }
      }
      return null;
    }

    // 1. Probar primero los modelos principales (ej. gemini-1.5-pro / gemini-2.5-pro) con sus reintentos
    for (const modelName of PRIMARY_MODELS) {
      parsedData = await callWithExponentialBackoff(modelName);
      if (parsedData) break;
    }

    // 2. Si fallaron o se saturaron los modelos principales, activar Fallback de Rescate con Flash (gemini-2.5-flash / gemini-1.5-flash)
    if (!parsedData) {
      console.warn('🚨 [Gemini Grader] Modelos Pro saturados o no disponibles. Activando Fallback de Rescate con modelos Flash...');
      for (const rescueModel of RESCUE_MODELS) {
        parsedData = await callWithExponentialBackoff(rescueModel);
        if (parsedData) {
          console.log(`🛡️ [Gemini Grader] Rescate exitoso completado con modelo Flash "${rescueModel}".`);
          break;
        }
      }
    }

    if (!parsedData) {
      const errorMsg = (lastError as any)?.message || '';
      if (isTransientError(lastError)) {
        throw new Error('SERVICE_OVERLOADED: Los servidores de Inteligencia Artificial están experimentando una alta demanda global. Por favor, reintenta en unos instantes.');
      }
      throw new Error(`Fallo en el servicio de calificación IA (todos los modelos agotados): ${errorMsg || 'Sin respuesta'}`);
    }

    // Consolidar puntajes y desgloses
    let notaTotalCalculada = 0;
    let notaMaximaPosible = 0;

    const desgloseCompleto: DesglosePregunta[] = rubrica.map((itemRubrica) => {
      notaMaximaPosible += itemRubrica.puntaje;

      const detectado = parsedData.desglose?.find(
        (d) => d.numero_pregunta === itemRubrica.numero_pregunta
      );

      const tipoPregunta = (itemRubrica.tipo_pregunta || itemRubrica.tipo || 'opcion_multiple_dinamica') as TipoPregunta;
      const respuestaDetectada = detectado?.respuesta_detectada?.trim() || 'NO_RESPONDIDA';

      let puntajeObtenido = 0;
      let esCorrecta = false;

      if (tipoPregunta === 'opcion_multiple_dinamica' || (tipoPregunta as any) === 'opcion_multiple') {
        const respUpper = respuestaDetectada.toUpperCase();
        const claveUpper = itemRubrica.respuesta_correcta.toUpperCase().trim();
        esCorrecta = respUpper === claveUpper;

        if (esCorrecta) {
          puntajeObtenido = itemRubrica.puntaje;
        } else if (itemRubrica.penalidad_error && respUpper !== 'NO_RESPONDIDA') {
          puntajeObtenido = -Math.abs(itemRubrica.penalidad_error);
        }
      } else if (tipoPregunta === 'verdadero_falso') {
        // Normalizar respuestas V/F
        const respNorm = respuestaDetectada.toUpperCase().startsWith('V') || respuestaDetectada.toUpperCase().startsWith('T') ? 'V' :
                         respuestaDetectada.toUpperCase().startsWith('F') ? 'F' : respuestaDetectada.toUpperCase();
        const claveNorm = itemRubrica.respuesta_correcta.toUpperCase().trim();
        esCorrecta = respNorm === claveNorm;
        if (esCorrecta) {
          puntajeObtenido = itemRubrica.puntaje;
        } else if (itemRubrica.penalidad_error && respNorm !== 'NO_RESPONDIDA') {
          puntajeObtenido = -Math.abs(itemRubrica.penalidad_error);
        }
      } else {
        // Para verdadero_falso_justificado, completar_espacios, respuesta_corta, ordenamiento_secuencia,
        // rotulado_imagen, ensayo_multicriterio, texto_abierto, calculo, columnas y esquemas:
        // Tomamos el puntaje_asignado por Gemini, acotándolo estrictamente entre 0 y el máximo de la pregunta
        const puntajeIA = typeof detectado?.puntaje_asignado === 'number' ? detectado.puntaje_asignado : 0;
        puntajeObtenido = Math.min(itemRubrica.puntaje, Math.max(0, Number(puntajeIA.toFixed(2))));
        esCorrecta = detectado?.es_correcta ?? puntajeObtenido >= itemRubrica.puntaje * 0.5;
      }

      notaTotalCalculada += puntajeObtenido;

      let rawItemConf = typeof detectado?.confianza_pregunta === 'number' ? detectado.confianza_pregunta : 80;
      if (rawItemConf > 0 && rawItemConf <= 1) {
        rawItemConf = rawItemConf * 100;
      }
      const confianzaItem = Math.min(100, Math.max(0, Math.round(rawItemConf)));

      return {
        numero_pregunta: itemRubrica.numero_pregunta,
        tipo_pregunta: tipoPregunta,
        respuesta_detectada: respuestaDetectada,
        respuesta_correcta:
          itemRubrica.respuesta_correcta +
          (itemRubrica.respuesta_esperada_texto ? ` (Justificación: ${itemRubrica.respuesta_esperada_texto})` : '') +
          (itemRubrica.palabras_clave && itemRubrica.palabras_clave.length > 0 ? ` [Claves: ${itemRubrica.palabras_clave.join(', ')}]` : ''),
        es_correcta: esCorrecta,
        puntaje_obtenido: puntajeObtenido,
        confianza_item: confianzaItem,
        justificacion: detectado?.justificacion || '',
        observaciones: detectado?.observaciones || '',
      };
    });

    const notaFinalNormalizada = Math.max(0, Number(notaTotalCalculada.toFixed(2)));

    // Determinar confianza de lectura como booleano estricto
    let confianzaLectura = true;
    if (typeof parsedData.confianza_lectura === 'boolean') {
      confianzaLectura = parsedData.confianza_lectura;
    } else if (typeof parsedData.confianza_lectura === 'number') {
      confianzaLectura = parsedData.confianza_lectura >= 85;
    }

    const requiereRevision = !confianzaLectura || Boolean(parsedData.requiere_revision_humana);

    const motivoFinal = requiereRevision
      ? parsedData.motivo_revision_manual?.trim() || (!confianzaLectura ? 'Examen en blanco, corrupto o caligrafía 100% ininteligible.' : 'Requiere revisión docente.')
      : '';

    return {
      nombre_detectado: parsedData.nombre_detectado?.trim() || 'Alumno No Identificado',
      codigo_alumno: parsedData.codigo_alumno?.trim() || '',
      nota_total: notaFinalNormalizada,
      nota_maxima: notaMaximaPosible,
      confianza_lectura: confianzaLectura,
      requiere_revision_humana: requiereRevision,
      motivo_revision_manual: motivoFinal,
      desglose_json: desgloseCompleto,
    };
  } catch (error) {
    console.error('Error procesando evaluación con Gemini 1.5 Pro:', error);
    throw new Error(`Fallo en el servicio de calificación IA: ${(error as Error).message}`);
  }
}
