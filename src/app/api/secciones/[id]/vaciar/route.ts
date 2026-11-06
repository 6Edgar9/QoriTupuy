import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar si la sección existe
    const seccion = await prisma.seccion.findUnique({
      where: { id },
    });

    if (!seccion) {
      return NextResponse.json(
        { error: 'Sección no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar todos los exámenes de esta sección
    const resultado = await prisma.examenAlumno.deleteMany({
      where: { seccion_id: id },
    });

    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${resultado.count} exámenes asociados a la sección "${seccion.nombre}".`,
      count: resultado.count,
    });
  } catch (error: any) {
    console.error('Error al vaciar sección:', error);
    return NextResponse.json(
      { error: 'Error al vaciar exámenes de la sección: ' + error.message },
      { status: 500 }
    );
  }
}

