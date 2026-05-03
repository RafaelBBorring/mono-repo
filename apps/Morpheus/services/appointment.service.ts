import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";

export async function checkConflict(
  psychologistId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string
) {
  return prisma.appointment.findFirst({
    where: {
      psychologistId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
}

export async function checkPsychologistSchedule(
  psychologistId: string,
  startsAt: Date,
  endsAt: Date
) {
  const dayOfWeek = startsAt.getDay();
  const startTime = startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const endTime = endsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

  return prisma.psychologistSchedule.findFirst({
    where: {
      psychologistId,
      dayOfWeek,
      startTime: { lte: startTime },
      endTime: { gte: endTime },
    },
  });
}

export async function createAppointment(
  tenantId: string,
  psychologistId: string,
  clientId: string,
  startsAt: Date,
  endsAt: Date,
  value: number | string | Decimal,
  notes?: string
) {
  return prisma.appointment.create({
    data: {
      tenantId,
      psychologistId,
      clientId,
      startsAt,
      endsAt,
      value: new Decimal(value),
      notes,
    },
  });
}

export async function updateAppointmentStatus(
  id: string,
  status?: string,
  paymentStatus?: string
) {
  return prisma.appointment.update({
    where: { id },
    data: {
      ...(status ? { status: status as any } : {}),
      ...(paymentStatus ? { paymentStatus: paymentStatus as any } : {}),
    },
  });
}

export async function cancelAppointment(id: string) {
  return prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
}

export async function getAppointmentsByPsychologist(
  psychologistId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.appointment.findMany({
    where: {
      psychologistId,
      startsAt: { gte: startDate },
      endsAt: { lte: endDate },
    },
  });
}

export async function getAppointmentsByClient(
  clientId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.appointment.findMany({
    where: {
      clientId,
      startsAt: { gte: startDate },
      endsAt: { lte: endDate },
    },
  });
}
