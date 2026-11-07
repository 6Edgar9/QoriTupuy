import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ItemRubrica } from '@/types/database';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const seccion = await prisma.seccion.findUnique({
      where: { id },
      include: {
        evaluacion: {
          include: {
            curso: true,
          },
        },
      },
    });

    if (!seccion) {
      return NextResponse.json({ error: 'Sección no encontrada' }, { status: 404 });
    }

    let rubrica: ItemRubrica[] = [];
    try {
      rubrica = typeof seccion.rubrica === 'string' ? JSON.parse(seccion.rubrica) : seccion.rubrica;
    } catch (e) {
      rubrica = [];
    }

    return NextResponse.json({
      ...seccion,
      rubrica,
    });
  } catch (error: any) {
    console.error('Error al obtener sección:', error);
    return NextResponse.json(
      { error: 'Error al obtener sección: ' + error.message },
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
    const { nombre, total_preguntas, rubrica, url_plantilla_pdf } = body;

    const data: Record<string, any> = {};
    if (nombre) data.nombre = nombre.trim();
    if (total_preguntas !== undefined) data.total_preguntas = Number(total_preguntas);
    if (rubrica !== undefined) {
      data.rubrica = typeof rubrica === 'string' ? rubrica : JSON.stringify(rubrica);
      if (total_preguntas === undefined && Array.isArray(rubrica)) {
        data.total_preguntas = rubrica.length;
      }
    }
    if (url_plantilla_pdf !== undefined) data.url_plantilla_pdf = url_plantilla_pdf;

    const seccionActualizada = await prisma.seccion.update({
      where: { id },
      data,
    });

    let parsedRubrica: ItemRubrica[] = [];
    try {
      parsedRubrica =
        typeof seccionActualizada.rubrica === 'string'
          ? JSON.parse(seccionActualizada.rubrica)
          : seccionActualizada.rubrica;
    } catch (e) {
      parsedRubrica = [];
    }

    return NextResponse.json({
      ...seccionActualizada,
      rubrica: parsedRubrica,
    });
  } catch (error: any) {
    console.error('Error al actualizar sección:', error);
    return NextResponse.json(
      { error: 'Error al actualizar sección: ' + error.message },
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
    await prisma.seccion.delete({
      where: { id },
    });
    return NextResponse.json({ success: true, message: 'Sección eliminada' });
  } catch (error: any) {
    console.error('Error al eliminar sección:', error);
    return NextResponse.json(
      { error: 'Error al eliminar sección: ' + error.message },
      { status: 500 }
    );
  }
}

