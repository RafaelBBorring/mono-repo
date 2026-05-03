import { prisma } from "@/lib/prisma";

export async function checkRoomBookingConflict(params: {
  roomId: string;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string;
}) {
  const conflicting = await prisma.roomBooking.findFirst({
    where: {
      roomId: params.roomId,
      active: true,
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
  });

  return conflicting;
}
