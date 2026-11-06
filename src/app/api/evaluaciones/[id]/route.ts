import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { titulo, fecha_evaluacion, puntaje_maximo } = body;

    const evaluacionActualizada = await prisma.evaluacion.update({
      where: { id },
      data: {
        ...(titulo && { titulo: titulo.trim() }),
        ...(fecha_evaluacion && { fecha_evaluacion }),
        ...(puntaje_maximo !== undefined && { puntaje_maximo: Number(puntaje_maximo) }),
      },
    });

    return NextResponse.json(evaluacionActualizada);
  } catch (error: any) {
    console.error('Error al actualizar evaluación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar evaluación: ' + error.message },
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
    await prisma.evaluacion.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Evaluación eliminada' });
  } catch (error: any) {
    console.error('Error al eliminar evaluación:', error);
    return NextResponse.json(
      { error: 'Error al eliminar evaluación: ' + error.message },
      { status: 500 }
    );
  }
}

