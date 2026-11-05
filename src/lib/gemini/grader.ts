import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ItemRubrica, DesglosePregunta, TipoPregunta } from '@/types/database';

// Función helper para inicialización perezosa (evita warnings en builds estáticos de Next.js)
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
  confianza_lectura: number; // 0 - 100
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
  confianza_lectura: number;
  requiere_revision_humana: boolean;
  motivo_revision_manual?: string;
  desglose_json: DesglosePregunta[];
}

/**
 * Prompt del sistema para Gemini 1.5 Pro configurado como evaluador universitario multimodal
 */
const SYSTEM_PROMPT = `
Eres "QoriTupuy AI", un evaluador universitario experto y riguroso en visión computacional multimodal, análisis caligráfico y razonamiento científico para exámenes manuscritos.
Tu misión es transcribir, interpretar y calificar con máxima precisión las respuestas marcadas, redactadas, calculadas o dibujadas por los estudiantes en la hoja de examen escaneada, contrastándolas contra la RÚBRICA OFICIAL MULTIMODAL.

REGLAS DE EVALUACIÓN SEGÚN EL TIPO DE PREGUNTA:
1. DETECCIÓN DE IDENTIDAD:
   - Extrae el Nombre y Apellidos completos del estudiante detectados en el encabezado.
   - Si existe un campo para Código de Alumno, DNI o Matrícula, extráelo con precisión.

2. EVALUACIÓN ESPECÍFICA POR TIPO:
   - 'opcion_multiple_dinamica' (u 'opcion_multiple'): Busca la marca del alumno solo entre las X alternativas permitidas (indicadas en cantidad_alternativas u opciones_validas, ej. A, B, C...). Identifica qué letra rellenó, marcó o circuló el estudiante. Si marcó dos y tachó una, determina cuál dejó válida.
   - 'verdadero_falso': Busca marcas como V/F, Verdadero/Falso, T/F o checks/cruces en las casillas correspondientes. Compara directamente con la clave (V o F).
   - 'verdadero_falso_justificado': Primero verifica si el alumno marcó V o F.
       * Si la clave correcta es V y el alumno marcó V: Asigna el puntaje total (no requiere justificación).
       * Si la clave correcta era Falso (F), el alumno DEBE haber marcado F y además DEBE haber escrito una corrección manuscrita. Transcribe mentalmente esa caligrafía manuscrita y compárala semánticamente con el "Criterio de Justificación Esperada" de la rúbrica.
       * Calcula puntaje parcial (ej. 50% de los puntos) si marcó Falso pero omitió o justificó incorrectamente la corrección, o puntaje total (100%) si ambas partes (marca F y justificación escrita) son correctas. Si marcó Verdadero siendo Falso, asigna 0 puntos.
   - 'texto_abierto' o 'calculo': Transcribe mentalmente la caligrafía manuscrita del estudiante y compárala semánticamente contra el Criterio de Evaluación de la rúbrica. En cálculos matemáticos, revisa tanto el procedimiento numérico como el resultado final.
   - 'relacionar_columnas' o 'grafico_esquema': Inspecciona visualmente las líneas de conexión, flechas, diagramas o palabras escritas en recuadros del examen y valida si coinciden con la rúbrica esperada.
   - Asigna el puntaje total o parcial (de 0 al puntaje máximo indicado para cada pregunta) según el nivel de acierto, y siempre incluye una justificación breve y clara de por qué asignaste ese puntaje en el campo "justificacion".
   - Si no hay respuesta visible para una pregunta, marca respuesta_detectada como "NO_RESPONDIDA", asigna 0 puntos y anota la ausencia en la justificación.

3. CÁLCULO DE CONFIANZA DE LECTURA (0 A 100):
   - confianza_pregunta: asígnale de 0 a 100 según la nitidez visual y certidumbre caligráfica de cada respuesta.
   - confianza_lectura global: calcula un promedio ponderado de la legibilidad general del examen.
   - Si la caligrafía es borrosa, ilegible, hay borrones severos o trazos ambiguos que impidan una evaluación certera, asigna una confianza < 75 para esa pregunta y refleja esa incertidumbre en confianza_lectura global.
   - Si la confianza global es inferior a 85, marca "requiere_revision_humana: true" y detalla en "motivo_revision_manual" la razón (ej. "Caligrafía difusa en justificación de P2", "Borrones en esquema de P4").

4. FORMATO DE SALIDA ESTRICTO:
   - Responde EXCLUSIVAMENTE con el objeto JSON estructurado según el esquema solicitado. No agregues texto fuera del JSON.
`;

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nombre_detectado: {
      type: Type.STRING,
      description: 'Nombre y apellidos completos del estudiante detectados en el encabezado',
    },
    codigo_alumno: {
      type: Type.STRING,
      description: 'Código de matrícula, DNI o identificador del estudiante',
    },
    confianza_lectura: {
      type: Type.NUMBER,
      description: 'Puntaje de certeza y legibilidad global del examen de 0 a 100',
    },
    requiere_revision_humana: {
      type: Type.BOOLEAN,
      description: 'Verdadero si la confianza es < 85 o existen anomalías visuales graves',
    },
    motivo_revision_manual: {
      type: Type.STRING,
      description: 'Explicación detallada en caso de requerir revisión manual por un docente',
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
    'confianza_lectura',
    'requiere_revision_humana',
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
      puntaje_maximo: item.puntaje,
      penalidad_error: item.penalidad_error || 0,
    };
  });

  const userPrompt = `
Por favor, analiza y califica visualmente el examen adjunto contrastándolo contra esta RÚBRICA MULTIMODAL AVANZADA:

${JSON.stringify(rubricaFormateada, null, 2)}

Total de preguntas a evaluar: ${rubrica.length}.
Para cada pregunta, evalúa la caligrafía, transcripción, opciones dinámicas, marcas V/F, justificaciones manuscritas, cálculos, conexiones o marcas y asigna el puntaje con su respectiva justificación.
`;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
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
    const parsedData: GeminiGraderOutput = JSON.parse(responseText);

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
        // Para verdadero_falso_justificado, texto abierto, cálculo, columnas y esquemas:
        // Tomamos el puntaje_asignado por Gemini, acotándolo estrictamente entre 0 y el máximo de la pregunta
        const puntajeIA = typeof detectado?.puntaje_asignado === 'number' ? detectado.puntaje_asignado : 0;
        puntajeObtenido = Math.min(itemRubrica.puntaje, Math.max(0, Number(puntajeIA.toFixed(2))));
        esCorrecta = detectado?.es_correcta ?? puntajeObtenido >= itemRubrica.puntaje * 0.5;
      }

      notaTotalCalculada += puntajeObtenido;

      return {
        numero_pregunta: itemRubrica.numero_pregunta,
        tipo_pregunta: tipoPregunta,
        respuesta_detectada: respuestaDetectada,
        respuesta_correcta: itemRubrica.respuesta_correcta + (itemRubrica.respuesta_esperada_texto ? ` (Justificación: ${itemRubrica.respuesta_esperada_texto})` : ''),
        es_correcta: esCorrecta,
        puntaje_obtenido: puntajeObtenido,
        confianza_item: detectado?.confianza_pregunta ?? 50,
        justificacion: detectado?.justificacion || '',
        observaciones: detectado?.observaciones,
      };
    });

    const notaFinalNormalizada = Math.max(0, Number(notaTotalCalculada.toFixed(2)));
    const confianzaLectura = Math.min(100, Math.max(0, Math.round(parsedData.confianza_lectura || 0)));
    const requiereRevision = confianzaLectura < 85 || parsedData.requiere_revision_humana;

    return {
      nombre_detectado: parsedData.nombre_detectado?.trim() || 'Alumno No Identificado',
      codigo_alumno: parsedData.codigo_alumno?.trim() || undefined,
      nota_total: notaFinalNormalizada,
      nota_maxima: notaMaximaPosible,
      confianza_lectura: confianzaLectura,
      requiere_revision_humana: requiereRevision,
      motivo_revision_manual: requiereRevision
        ? parsedData.motivo_revision_manual || `Nivel de confianza de lectura por debajo del umbral (${confianzaLectura}/100)`
        : undefined,
      desglose_json: desgloseCompleto,
    };
  } catch (error) {
    console.error('Error procesando evaluación con Gemini 1.5 Pro:', error);
    throw new Error(`Fallo en el servicio de calificación IA: ${(error as Error).message}`);
  }
}
