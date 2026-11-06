import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursoId = searchParams.get('cursoId');

    if (!cursoId) {
      return NextResponse.json(
        { error: 'El parámetro cursoId es requerido.' },
        { status: 400 }
      );
    }

    const evaluaciones = await prisma.evaluacion.findMany({
      where: { curso_id: cursoId },
      orderBy: { creado_el: 'asc' },
    });

    return NextResponse.json(evaluaciones);
  } catch (error: any) {
    console.error('Error al listar evaluaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener evaluaciones: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { curso_id, titulo, fecha_evaluacion, puntaje_maximo } = body;

    if (!curso_id || !titulo) {
      return NextResponse.json(
        { error: 'curso_id y titulo son obligatorios.' },
        { status: 400 }
      );
    }

    const nuevaEvaluacion = await prisma.evaluacion.create({
      data: {
        curso_id,
        titulo: titulo.trim(),
        fecha_evaluacion: fecha_evaluacion || new Date().toISOString().split('T')[0],
        puntaje_maximo: Number(puntaje_maximo) || 20,
      },
    });

    return NextResponse.json(nuevaEvaluacion, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear evaluación:', error);
    return NextResponse.json(
      { error: 'Error al crear evaluación: ' + error.message },
      { status: 500 }
    );
  }
}

