import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createClientSchema } from "@/lib/schemas";
import { audit } from "@/lib/audit";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const where: any = {
    tenantId: session.user.tenantId,
    active: true,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { cpf: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const clients = await prisma.client.findMany({
    where,
    include: {
      psychologist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createClientSchema.parse(body);

    const client = await prisma.client.create({
      data: {
        name: data.name,
        cpf: data.cpf || null,
        email: data.email || null,
        phone: data.phone || null,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        psychologistId: data.psychologistId,
        tenantId: session.user.tenantId,
        consentSms: data.consentSms,
        consentEmail: data.consentEmail,
        consentWhatsapp: data.consentWhatsapp,
      },
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Client",
      entityId: client.id,
    });

    return NextResponse.json(client, { status: 201 });
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
