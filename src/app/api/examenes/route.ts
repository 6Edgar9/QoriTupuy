import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DesglosePregunta } from '@/types/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seccionId = searchParams.get('seccionId');
    const tipo = searchParams.get('tipo'); // 'aprobados' | 'revision' | undefined (todos)

    if (!seccionId) {
      return NextResponse.json(
        { error: 'El parámetro seccionId es requerido.' },
        { status: 400 }
      );
    }

    const whereClause: Record<string, any> = {
      seccion_id: seccionId,
    };

    if (tipo === 'aprobados') {
      whereClause.confianza_lectura = { gte: 85 };
    } else if (tipo === 'revision') {
      whereClause.confianza_lectura = { lt: 85 };
    }

    const examenes = await prisma.examenAlumno.findMany({
      where: whereClause,
      orderBy:
        tipo === 'aprobados'
          ? [{ nombre: 'asc' }]
          : [{ confianza_lectura: 'asc' }],
    });

    const parsedExamenes = examenes.map((ex: any) => {
      let desglose_json: DesglosePregunta[] = [];
      try {
        desglose_json =
          typeof ex.desglose_json === 'string'
            ? JSON.parse(ex.desglose_json)
            : ex.desglose_json;
      } catch (e) {
        desglose_json = [];
      }
      return {
        ...ex,
        desglose_json,
      };
    });

    return NextResponse.json(parsedExamenes);
  } catch (error: any) {
    console.error('Error al listar exámenes:', error);
    return NextResponse.json(
      { error: 'Error al obtener exámenes: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, nota_total, estado_revision, motivo_revision_manual, revisado_por } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'El id del examen es requerido.' },
        { status: 400 }
      );
    }

    const examenActualizado = await prisma.examenAlumno.update({
      where: { id },
      data: {
        ...(nota_total !== undefined && { nota_total: Number(nota_total) }),
        ...(estado_revision && { estado_revision }),
        ...(motivo_revision_manual !== undefined && { motivo_revision_manual }),
        ...(revisado_por !== undefined && { revisado_por }),
      },
    });

    let desglose_json: DesglosePregunta[] = [];
    try {
      desglose_json =
        typeof examenActualizado.desglose_json === 'string'
          ? JSON.parse(examenActualizado.desglose_json)
          : (examenActualizado.desglose_json as any);
    } catch (e) {
      desglose_json = [];
    }

    return NextResponse.json({
      ...examenActualizado,
      desglose_json,
    });
  } catch (error: any) {
    console.error('Error al actualizar examen:', error);
    return NextResponse.json(
      { error: 'Error al actualizar examen: ' + error.message },
      { status: 500 }
    );
  }
}
