import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPsychologistSchema } from "@/lib/schemas";
import { audit } from "@/lib/audit";

const updatePsychologistSchema = createPsychologistSchema.partial();

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const psychologist = await prisma.psychologist.findFirst({
    where: {
      id: params.id,
      tenantId: session.user.tenantId,
      active: true,
    },
    include: { schedules: true },
  });

  if (!psychologist) {
    return NextResponse.json(
      { error: "Psicologo nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(psychologist);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updatePsychologistSchema.parse(body);

    const existing = await prisma.psychologist.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        active: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Psicologo nao encontrado" },
        { status: 404 }
      );
    }

    const psychologist = await prisma.$transaction(async (tx) => {
      await tx.psychologist.update({
        where: { id: params.id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.cpf !== undefined && { cpf: data.cpf || null }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(data.phone !== undefined && { phone: data.phone || null }),
          ...(data.crp !== undefined && { crp: data.crp || null }),
          ...(data.birthDate !== undefined && {
            birthDate: data.birthDate ? new Date(data.birthDate) : null,
          }),
        },
      });

      if (data.schedules) {
        await tx.psychologistSchedule.deleteMany({
          where: { psychologistId: params.id },
        });
        if (data.schedules.length > 0) {
          await tx.psychologistSchedule.createMany({
            data: data.schedules.map((s) => ({
              psychologistId: params.id,
              dayOfWeek: s.dayOfWeek!,
              startTime: s.startTime!,
              endTime: s.endTime!,
            })),
          });
        }
      }

      return tx.psychologist.findUnique({
        where: { id: params.id },
        include: { schedules: true },
      });
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Psychologist",
      entityId: params.id,
    });

    return NextResponse.json(psychologist);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const existing = await prisma.psychologist.findFirst({
    where: {
      id: params.id,
      tenantId: session.user.tenantId,
      active: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Psicologo nao encontrado" },
      { status: 404 }
    );
  }

  const psychologist = await prisma.psychologist.update({
    where: { id: params.id },
    data: { active: false },
  });

  await audit({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "DELETE",
    entity: "Psychologist",
    entityId: params.id,
  });

  return NextResponse.json(psychologist);
}
