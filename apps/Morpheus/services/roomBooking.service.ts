import { prisma } from "@/lib/prisma";

export async function checkRoomBookingConflict(
  roomId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
) {
  return prisma.roomBooking.findFirst({
    where: {
      roomId,
      active: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
}

export async function createRoomBooking(
  roomId: string,
  userId: string,
  title: string,
  startsAt: Date,
  endsAt: Date,
  description?: string
) {
  return prisma.roomBooking.create({
    data: {
      roomId,
      userId,
      title,
      startsAt,
      endsAt,
      description,
    },
  });
}

export async function updateRoomBooking(
  id: string,
  data: {
    title?: string;
    startsAt?: Date;
    endsAt?: Date;
    description?: string;
  }
) {
  return prisma.roomBooking.update({
    where: { id },
    data,
  });
}

export async function deleteRoomBooking(id: string) {
  return prisma.roomBooking.update({
    where: { id },
    data: { active: false },
  });
}

export async function getRoomBookings(
  roomId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.roomBooking.findMany({
    where: {
      roomId,
      active: true,
      startsAt: { gte: startDate },
      endsAt: { lte: endDate },
    },
  });
}

export async function getRoomBookingDetail(id: string) {
  return prisma.roomBooking.findUnique({
    where: { id },
  });
}
