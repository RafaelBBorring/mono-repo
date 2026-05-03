import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createRoomBookingSchema } from "@/lib/schemas";
import { checkRoomBookingConflict } from "@/services/room-bookings";
import { audit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  const where: any = {
    roomId: params.roomId,
    active: true,
  };

  if (start && end) {
    where.startsAt = { lt: new Date(end) };
    where.endsAt = { gt: new Date(start) };
  }

  const bookings = await prisma.roomBooking.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const events = bookings.map((booking) => ({
    id: booking.id,
    title: booking.title,
    start: booking.startsAt.toISOString(),
    end: booking.endsAt.toISOString(),
    backgroundColor: "#6366f1",
    extendedProps: {
      description: booking.description,
      createdBy: booking.user.name,
    },
  }));

  return NextResponse.json(events);
}

export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createRoomBookingSchema.parse({
      ...body,
      roomId: params.roomId,
    });

    const conflict = await checkRoomBookingConflict({
      roomId: params.roomId,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Conflito de horario na sala" },
        { status: 409 }
      );
    }

    const booking = await prisma.roomBooking.create({
      data: {
        roomId: params.roomId,
        userId: session.user.id,
        title: data.title,
        description: data.description,
        startsAt: new Date(data.startsAt),
        endsAt: new Date(data.endsAt),
      },
    });

    await audit({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      action: "CREATE",
      entity: "RoomBooking",
      entityId: booking.id,
    });

    return NextResponse.json(booking, { status: 201 });
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
