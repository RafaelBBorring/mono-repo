import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createClientSchema } from "@/lib/schemas";
import { audit } from "@/lib/audit";

const updateClientSchema = createClientSchema.partial();

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const client = await prisma.client.findFirst({
    where: {
      id: params.id,
      tenantId: session.user.tenantId,
      active: true,
    },
    include: {
      psychologist: { select: { id: true, name: true } },
    },
  });

  if (!client) {
    return NextResponse.json(
      { error: "Cliente nao encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(client);
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
    const data = updateClientSchema.parse(body);

    const existing = await prisma.client.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
        active: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Cliente nao encontrado" },
        { status: 404 }
      );
    }

    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.cpf !== undefined && { cpf: data.cpf || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.birthDate !== undefined && {
          birthDate: data.birthDate ? new Date(data.birthDate) : null,
        }),
        ...(data.psychologistId !== undefined && {
          psychologistId: data.psychologistId,
        }),
        ...(data.consentSms !== undefined && { consentSms: data.consentSms }),
        ...(data.consentEmail !== undefined && {
          consentEmail: data.consentEmail,
        }),
        ...(data.consentWhatsapp !== undefined && {
          consentWhatsapp: data.consentWhatsapp,
        }),
      },
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Client",
      entityId: client.id,
    });

    return NextResponse.json(client);
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

  const existing = await prisma.client.findFirst({
    where: {
      id: params.id,
      tenantId: session.user.tenantId,
      active: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Cliente nao encontrado" },
      { status: 404 }
    );
  }

  const client = await prisma.client.update({
    where: { id: params.id },
    data: { active: false },
  });

  await audit({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "DELETE",
    entity: "Client",
    entityId: params.id,
  });

  return NextResponse.json(client);
}
