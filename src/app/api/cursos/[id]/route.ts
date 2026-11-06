import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const curso = await prisma.curso.findUnique({
      where: { id },
      include: {
        evaluaciones: {
          include: {
            secciones: true,
          },
        },
      },
    });

    if (!curso) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
    }

    return NextResponse.json(curso);
  } catch (error: any) {
    console.error('Error al obtener curso:', error);
    return NextResponse.json(
      { error: 'Error al obtener curso: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { codigo, nombre, periodo, profesor_id } = body;

    const cursoActualizado = await prisma.curso.update({
      where: { id },
      data: {
        ...(codigo && { codigo: codigo.trim().toUpperCase() }),
        ...(nombre && { nombre: nombre.trim() }),
        ...(periodo && { periodo: periodo.trim() }),
        ...(profesor_id !== undefined && { profesor_id }),
      },
    });

    return NextResponse.json(cursoActualizado);
  } catch (error: any) {
    console.error('Error al actualizar curso:', error);
    return NextResponse.json(
      { error: 'Error al actualizar curso: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.curso.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Curso eliminado' });
  } catch (error: any) {
    console.error('Error al eliminar curso:', error);
    return NextResponse.json(
      { error: 'Error al eliminar curso: ' + error.message },
      { status: 500 }
    );
  }
}

