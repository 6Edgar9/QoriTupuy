import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const cursos = await prisma.curso.findMany({
      orderBy: { codigo: 'asc' },
    });
    return NextResponse.json(cursos);
  } catch (error: any) {
    console.error('Error al listar cursos:', error);
    return NextResponse.json(
      { error: 'Error al obtener cursos: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { codigo, nombre, periodo, profesor_id } = body;

    if (!codigo || !nombre) {
      return NextResponse.json(
        { error: 'Código y nombre son obligatorios.' },
        { status: 400 }
      );
    }

    const nuevoCurso = await prisma.curso.create({
      data: {
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        periodo: (periodo || '2026-II').trim(),
        profesor_id: profesor_id || null,
      },
    });

    return NextResponse.json(nuevoCurso, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear curso:', error);
    return NextResponse.json(
      { error: 'Error al crear curso: ' + error.message },
      { status: 500 }
    );
  }
}

