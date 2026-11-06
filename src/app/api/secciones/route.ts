import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemRubrica } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const evaluacionId = searchParams.get('evaluacionId');

    if (!evaluacionId) {
      return NextResponse.json(
        { error: 'El parámetro evaluacionId es requerido.' },
        { status: 400 }
      );
    }

    const secciones = await prisma.seccion.findMany({
      where: { evaluacion_id: evaluacionId },
      orderBy: { creado_el: 'asc' },
    });

    const parsedSecciones = secciones.map((sec: any) => {
      let rubrica: ItemRubrica[] = [];
      try {
        rubrica = typeof sec.rubrica === 'string' ? JSON.parse(sec.rubrica) : sec.rubrica;
      } catch (e) {
        rubrica = [];
      }
      return {
        ...sec,
        rubrica,
      };
    });

    return NextResponse.json(parsedSecciones);
  } catch (error: any) {
    console.error('Error al listar secciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener secciones: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { evaluacion_id, nombre, total_preguntas, rubrica, url_plantilla_pdf } = body;

    if (!evaluacion_id || !nombre) {
      return NextResponse.json(
        { error: 'evaluacion_id y nombre son obligatorios.' },
        { status: 400 }
      );
    }

    const rubricaStr =
      typeof rubrica === 'string' ? rubrica : JSON.stringify(rubrica || []);

    const nuevaSeccion = await prisma.seccion.create({
      data: {
        evaluacion_id,
        nombre: nombre.trim(),
        total_preguntas: Number(total_preguntas) || (Array.isArray(rubrica) ? rubrica.length : 5),
        rubrica: rubricaStr,
        url_plantilla_pdf: url_plantilla_pdf || null,
      },
    });

    return NextResponse.json(
      {
        ...nuevaSeccion,
        rubrica: typeof rubrica === 'string' ? JSON.parse(rubrica) : (rubrica || []),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error al crear sección:', error);
    return NextResponse.json(
      { error: 'Error al crear sección: ' + error.message },
      { status: 500 }
    );
  }
}
