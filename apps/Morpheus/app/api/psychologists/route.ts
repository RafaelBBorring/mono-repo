import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPsychologistSchema } from "@/lib/schemas";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const psychologists = await prisma.psychologist.findMany({
    where: {
      tenantId: session.user.tenantId,
      active: true,
    },
    include: { schedules: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(psychologists);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createPsychologistSchema.parse(body);

    const psychologist = await prisma.$transaction(async (tx) => {
      const psy = await tx.psychologist.create({
        data: {
          name: data.name,
          cpf: data.cpf || null,
          email: data.email || null,
          phone: data.phone || null,
          crp: data.crp || null,
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
          tenantId: session.user.tenantId,
        },
      });

      if (data.schedules && data.schedules.length > 0) {
        await tx.psychologistSchedule.createMany({
          data: data.schedules.map((s) => ({
            psychologistId: psy.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        });
      }

      return tx.psychologist.findUnique({
        where: { id: psy.id },
        include: { schedules: true },
      });
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Psychologist",
      entityId: psychologist!.id,
    });

    return NextResponse.json(psychologist, { status: 201 });
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
