import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './client';
import {
  Curso,
  Evaluacion,
  Seccion,
  ExamenAlumno,
  EstadoRevision,
} from '@/types/database';

// Colección raíz: cursos
const CURSOS_COLLECTION = 'cursos';

/**
 * Helper para construir las rutas NoSQL jerárquicas
 */
export const getPaths = {
  cursos: () => CURSOS_COLLECTION,
  curso: (cursoId: string) => `${CURSOS_COLLECTION}/${cursoId}`,
  evaluaciones: (cursoId: string) => `${CURSOS_COLLECTION}/${cursoId}/evaluaciones`,
  evaluacion: (cursoId: string, evalId: string) =>
    `${CURSOS_COLLECTION}/${cursoId}/evaluaciones/${evalId}`,
  secciones: (cursoId: string, evalId: string) =>
    `${CURSOS_COLLECTION}/${cursoId}/evaluaciones/${evalId}/secciones`,
  seccion: (cursoId: string, evalId: string, secId: string) =>
    `${CURSOS_COLLECTION}/${cursoId}/evaluaciones/${evalId}/secciones/${secId}`,
  examenes: (cursoId: string, evalId: string, secId: string) =>
    `${CURSOS_COLLECTION}/${cursoId}/evaluaciones/${evalId}/secciones/${secId}/examenes_alumnos`,
  examen: (cursoId: string, evalId: string, secId: string, examenId: string) =>
    `${CURSOS_COLLECTION}/${cursoId}/evaluaciones/${evalId}/secciones/${secId}/examenes_alumnos/${examenId}`,
};

// Conversor genérico con ID
const converter = <T>() => ({
  toFirestore: (data: T) => data as DocumentData,
  fromFirestore: (snapshot: QueryDocumentSnapshot) =>
    ({ id: snapshot.id, ...snapshot.data() } as T),
});

/**
 * 1. Crear o actualizar Curso
 */
export async function crearCurso(curso: Omit<Curso, 'id' | 'creado_el'>): Promise<string> {
  const colRef = collection(db, getPaths.cursos());
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, {
    ...curso,
    creado_el: serverTimestamp(),
  });
  return newDocRef.id;
}

/**
 * Listar todos los cursos
 */
export async function listarCursos(): Promise<Curso[]> {
  const q = query(collection(db, getPaths.cursos()), orderBy('codigo', 'asc'));
  const snap = await getDocs(q.withConverter(converter<Curso>()));
  return snap.docs.map((d) => d.data());
}

/**
 * 2. Crear Evaluación para un curso
 */
export async function crearEvaluacion(
  cursoId: string,
  evaluacion: Omit<Evaluacion, 'id' | 'curso_id' | 'creado_el'>
): Promise<string> {
  const colRef = collection(db, getPaths.evaluaciones(cursoId));
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, {
    ...evaluacion,
    curso_id: cursoId,
    creado_el: serverTimestamp(),
  });
  return newDocRef.id;
}

/**
 * Listar Evaluaciones de un curso
 */
export async function listarEvaluaciones(cursoId: string): Promise<Evaluacion[]> {
  const q = query(collection(db, getPaths.evaluaciones(cursoId)));
  const snap = await getDocs(q.withConverter(converter<Evaluacion>()));
  return snap.docs.map((d) => d.data());
}

/**
 * 3. Crear Sección con su respectiva Rúbrica
 */
export async function crearSeccion(
  cursoId: string,
  evaluacionId: string,
  seccion: Omit<Seccion, 'id' | 'evaluacion_id' | 'creado_el'>
): Promise<string> {
  const colRef = collection(db, getPaths.secciones(cursoId, evaluacionId));
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, {
    ...seccion,
    evaluacion_id: evaluacionId,
    creado_el: serverTimestamp(),
  });
  return newDocRef.id;
}

/**
 * Obtener detalles y rúbrica de una sección específica
 */
export async function obtenerSeccion(
  cursoId: string,
  evaluacionId: string,
  seccionId: string
): Promise<Seccion | null> {
  const docRef = doc(db, getPaths.seccion(cursoId, evaluacionId, seccionId)).withConverter(
    converter<Seccion>()
  );
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}

/**
 * 4. Guardar Examen Calificado de Alumno
 */
export async function guardarExamenAlumno(
  cursoId: string,
  evaluacionId: string,
  seccionId: string,
  examen: Omit<ExamenAlumno, 'id' | 'creado_el' | 'actualizado_el'>
): Promise<string> {
  const colRef = collection(db, getPaths.examenes(cursoId, evaluacionId, seccionId));
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, {
    ...examen,
    creado_el: serverTimestamp(),
    actualizado_el: serverTimestamp(),
  });
  return newDocRef.id;
}

/**
 * Obtener Exámenes Calificados con Confianza >= 85 (Ordenados alfabéticamente A-Z)
 */
export async function listarExamenesAprobadosIA(
  cursoId: string,
  evaluacionId: string,
  seccionId: string
): Promise<ExamenAlumno[]> {
  const colRef = collection(db, getPaths.examenes(cursoId, evaluacionId, seccionId));
  // Filtro confianza >= 85 y orden alfabético
  const q = query(
    colRef,
    where('confianza_lectura', '>=', 85),
    orderBy('confianza_lectura', 'desc'),
    orderBy('nombre', 'asc')
  ).withConverter(converter<ExamenAlumno>());

  const snap = await getDocs(q);
  const resultados = snap.docs.map((d) => d.data());
  // Ordenamiento en memoria garantizado A-Z por nombre
  return resultados.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Obtener Exámenes con Confianza < 85 para la Bandeja de Revisión Manual
 */
export async function listarExamenesRevisionManual(
  cursoId: string,
  evaluacionId: string,
  seccionId: string
): Promise<ExamenAlumno[]> {
  const colRef = collection(db, getPaths.examenes(cursoId, evaluacionId, seccionId));
  const q = query(
    colRef,
    where('confianza_lectura', '<', 85),
    orderBy('confianza_lectura', 'asc')
  ).withConverter(converter<ExamenAlumno>());

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Actualizar corrección manual de examen por parte del docente
 */
export async function actualizarExamenManual(
  cursoId: string,
  evaluacionId: string,
  seccionId: string,
  examenId: string,
  actualizaciones: {
    nota_total: number;
    estado_revision: EstadoRevision;
    motivo_revision_manual?: string;
    revisado_por?: string;
  }
): Promise<void> {
  const docRef = doc(db, getPaths.examen(cursoId, evaluacionId, seccionId, examenId));
  await updateDoc(docRef, {
    ...actualizaciones,
    actualizado_el: serverTimestamp(),
  });
}

