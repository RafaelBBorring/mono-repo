import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAppointmentSchema } from "@/lib/schemas";
import { audit } from "@/lib/audit";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const psychologistId = searchParams.get("psychologistId");
  const clientId = searchParams.get("clientId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: any = {
    tenantId: session.user.tenantId,
    active: true,
  };

  if (psychologistId) where.psychologistId = psychologistId;
  if (clientId) where.clientId = clientId;
  if (startDate && endDate) {
    where.startsAt = { gte: new Date(startDate) };
    where.endsAt = { lte: new Date(endDate) };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      psychologist: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json(appointments);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createAppointmentSchema.parse(body);

    const appointment = await prisma.appointment.create({
      data: {
        psychologistId: data.psychologistId,
        clientId: data.clientId,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
        value: data.value,
        notes: data.notes,
        tenantId: session.user.tenantId,
      },
      include: {
        psychologist: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Appointment",
      entityId: appointment.id,
    });

    return NextResponse.json(appointment, { status: 201 });
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
