import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const examen = await prisma.examenAlumno.findUnique({
      where: { id },
    });

    if (!examen) {
      return NextResponse.json(
        { error: 'Examen no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...examen,
      desglose_json:
        typeof examen.desglose_json === 'string'
          ? JSON.parse(examen.desglose_json)
          : examen.desglose_json,
    });
  } catch (error: any) {
    console.error('Error al obtener examen:', error);
    return NextResponse.json(
      { error: 'Error al obtener examen: ' + error.message },
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

    const examen = await prisma.examenAlumno.findUnique({
      where: { id },
    });

    if (!examen) {
      return NextResponse.json(
        { error: 'Examen no encontrado o ya fue eliminado' },
        { status: 404 }
      );
    }

    await prisma.examenAlumno.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Examen eliminado correctamente',
      id,
    });
  } catch (error: any) {
    console.error('Error al eliminar examen:', error);
    return NextResponse.json(
      { error: 'Error al eliminar examen: ' + error.message },
      { status: 500 }
    );
  }
}

