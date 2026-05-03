import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createRoomSchema } from "@/lib/schemas";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const rooms = await prisma.room.findMany({
    where: {
      tenantId: session.user.tenantId,
      active: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createRoomSchema.parse(body);

    const room = await prisma.room.create({
      data: {
        name: data.name,
        color: data.color,
        tenantId: session.user.tenantId,
      },
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Room",
      entityId: room.id,
    });

    return NextResponse.json(room, { status: 201 });
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
