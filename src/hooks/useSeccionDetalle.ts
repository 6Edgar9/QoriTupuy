'use client';

import { useState, useEffect } from 'react';

export interface SeccionConRelaciones {
  id: string;
  nombre: string;
  evaluacion_id: string;
  total_preguntas: number;
  rubrica: any;
  url_plantilla_pdf?: string | null;
  evaluacion?: {
    id: string;
    titulo: string;
    curso_id: string;
    fecha_evaluacion: string;
    puntaje_maximo: number;
    curso?: {
      id: string;
      nombre: string;
      codigo: string;
      periodo: string;
    };
  };
}

export function useSeccionDetalle(seccionId: string) {
  const [seccion, setSeccion] = useState<SeccionConRelaciones | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!seccionId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/secciones/${seccionId}`)
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar la información de la sección');
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setSeccion(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error cargando sección:', err);
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [seccionId]);

  return { seccion, loading, error };
}

