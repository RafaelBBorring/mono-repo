import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { audit } from "@/lib/audit";

const updateAppointmentSchema = z.object({
  status: z
    .enum(["SCHEDULED", "COMPLETED", "NO_SHOW", "CANCELLED"])
    .optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: params.id,
      tenantId: session.user.tenantId,
      active: true,
    },
    include: {
      psychologist: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json(
      { error: "Consulta nao encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(appointment);
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
    const data = updateAppointmentSchema.parse(body);

    const existing = await prisma.appointment.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        active: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Consulta nao encontrada" },
        { status: 404 }
      );
    }

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        psychologist: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Appointment",
      entityId: params.id,
    });

    return NextResponse.json(appointment);
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
