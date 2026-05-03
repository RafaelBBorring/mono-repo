import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { updateRoomSchema } from "@/lib/schemas";
import { audit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const room = await prisma.room.findFirst({
    where: {
      id: params.roomId,
      tenantId: session.user.tenantId,
      active: true,
    },
  });

  if (!room) {
    return NextResponse.json(
      { error: "Sala nao encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json(room);
}

export async function PATCH(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateRoomSchema.parse(body);

    const existing = await prisma.room.findFirst({
      where: {
        id: params.roomId,
        tenantId: session.user.tenantId,
        active: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Sala nao encontrada" },
        { status: 404 }
      );
    }

    const room = await prisma.room.update({
      where: { id: params.roomId },
      data,
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Room",
      entityId: room.id,
    });

    return NextResponse.json(room);
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
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const existing = await prisma.room.findFirst({
    where: {
      id: params.roomId,
      tenantId: session.user.tenantId,
      active: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Sala nao encontrada" },
      { status: 404 }
    );
  }

  const room = await prisma.room.update({
    where: { id: params.roomId },
    data: { active: false },
  });

  await audit({
    tenantId: session.user.tenantId,
    userId: session.user.id,
    action: "DELETE",
    entity: "Room",
    entityId: room.id,
  });

  return NextResponse.json(room);
}
