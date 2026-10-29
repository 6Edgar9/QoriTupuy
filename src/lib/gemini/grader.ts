import { GoogleGenAI, Type, Schema } from '@google/genai';
import { ItemRubrica, DesglosePregunta } from '@/types/database';

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
    confianza_pregunta: number; // 0 - 100
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
 * Prompt del sistema para Gemini 1.5 Pro configurado como evaluador universitario
 */
const SYSTEM_PROMPT = `
Eres "QoriTupuy AI", un evaluador universitario experto y riguroso en visión computacional y análisis caligráfico de exámenes manuscritos.
Tu misión es transcribir y calificar con máxima precisión las respuestas marcadas o escritas a mano por los alumnos en la hoja de examen escaneada, contrastándolas contra la RÚBRICA OFICIAL que se te proporciona.

REGLAS DE EVALUACIÓN:
1. DETECCIÓN DE IDENTIDAD:
   - Extrae el Nombre y Apellidos completos del alumno escritos en el encabezado.
   - Si existe un campo para Código de Alumno o DNI/Matrícula, extráelo. Si no es legible, indícalo.

2. DETECCIÓN DE RESPUESTAS:
   - Para opciones múltiples: identifica qué letra (A, B, C, D, E) o casilla rellenó o marcó el estudiante con bolígrafo/lápiz (ej. cruz, círculo, tachado o relleno).
   - Identifica ambigüedades: Si el alumno marcó dos opciones y tachó una, determina cuál intentó dejar válida.
   - Si no hay respuesta para una pregunta, marca "NO_RESPONDIDA".

3. CÁLCULO DE CONFIANZA DE LECTURA (0 A 100):
   - confianza_pregunta: asígnale de 0 a 100 según la nitidez visual y certidumbre caligráfica de cada respuesta.
   - confianza_lectura global: calcula un promedio ponderado de la legibilidad general del examen.
   - Si la caligrafía es borrosa, ilegible, hay borrones severos, o no estás seguro de la respuesta de alguna pregunta, asigna una confianza < 75 para esa pregunta y refleja esa incertidumbre en confianza_lectura global.
   - Si la confianza global es inferior a 85, marca "requiere_revision_humana: true" y detalla en "motivo_revision_manual" la razón (ej. "Mancha en pregunta 4", "Nombre con caligrafía difusa").

4. FORMATO DE SALIDA ESTRICTO:
   - Debes responder EXCLUSIVAMENTE con el objeto JSON estructurado según el esquema solicitado. No incluyas markdown adicional, ni etiquetas html ni texto fuera del JSON.
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
            description: 'Opción detectada (ej. "A", "B", "C", "NO_RESPONDIDA")',
          },
          confianza_pregunta: {
            type: Type.NUMBER,
            description: 'Nivel de certeza de lectura de 0 a 100 para este ítem',
          },
          observaciones: {
            type: Type.STRING,
            description: 'Anotaciones sobre borrones, tachaduras o claridad del trazo',
          },
        },
        required: ['numero_pregunta', 'respuesta_detectada', 'confianza_pregunta'],
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
 * @param imageBuffer Buffer de la imagen (PNG/JPEG) de la página del examen
 * @param mimeType Tipo MIME de la imagen ('image/png' | 'image/jpeg' | 'application/pdf')
 * @param rubrica Lista de preguntas, respuestas correctas y ponderaciones de la sección
 */
export async function calificarExamenConGemini(
  imageBuffer: Buffer | Uint8Array,
  mimeType: 'image/png' | 'image/jpeg' | 'application/pdf',
  rubrica: ItemRubrica[]
): Promise<EvaluacionGradingResult> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Variable de entorno GEMINI_API_KEY no configurada.');
  }

  const base64Data = Buffer.isBuffer(imageBuffer)
    ? imageBuffer.toString('base64')
    : Buffer.from(imageBuffer).toString('base64');

  const rubricaFormateada = rubrica.map((item) => ({
    pregunta: item.numero_pregunta,
    tipo: item.tipo,
    respuesta_correcta: item.respuesta_correcta,
    puntaje: item.puntaje,
    penalidad_error: item.penalidad_error || 0,
  }));

  const userPrompt = `
Por favor, analiza y califica la imagen del examen adjunto siguiendo estrictamente esta rúbrica oficial:

RÚBRICA OFICIAL:
${JSON.stringify(rubricaFormateada, null, 2)}

Total de preguntas esperadas: ${rubrica.length}.
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
        temperature: 0.1, // Baja temperatura para determinismo y precisión en transcripción
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const responseText = response.text?.trim() || '{}';
    const parsedData: GeminiGraderOutput = JSON.parse(responseText);

    // Cruzar las respuestas detectadas por Gemini con la rúbrica oficial para computar la nota exacta
    let notaTotalCalculada = 0;
    let notaMaximaPosible = 0;

    const desgloseCompleto: DesglosePregunta[] = rubrica.map((itemRubrica) => {
      notaMaximaPosible += itemRubrica.puntaje;

      // Buscar coincidencia en el array devuelto por Gemini
      const detectado = parsedData.desglose?.find(
        (d) => d.numero_pregunta === itemRubrica.numero_pregunta
      );

      const respuestaDetectada = detectado?.respuesta_detectada?.toUpperCase().trim() || 'NO_RESPONDIDA';
      const esCorrecta = respuestaDetectada === itemRubrica.respuesta_correcta.toUpperCase().trim();

      let puntajeObtenido = 0;
      if (esCorrecta) {
        puntajeObtenido = itemRubrica.puntaje;
      } else if (itemRubrica.penalidad_error && respuestaDetectada !== 'NO_RESPONDIDA') {
        puntajeObtenido = -Math.abs(itemRubrica.penalidad_error);
      }

      notaTotalCalculada += puntajeObtenido;

      return {
        numero_pregunta: itemRubrica.numero_pregunta,
        respuesta_detectada: respuestaDetectada,
        respuesta_correcta: itemRubrica.respuesta_correcta,
        es_correcta: esCorrecta,
        puntaje_obtenido: puntajeObtenido,
        confianza_item: detectado?.confianza_pregunta ?? 50,
        observaciones: detectado?.observaciones,
      };
    });

    // Asegurar que la nota total no sea menor a 0
    const notaFinalNormalizada = Math.max(0, Number(notaTotalCalculada.toFixed(2)));

    // Determinar si requiere revisión forzosa por confianza < 85
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

