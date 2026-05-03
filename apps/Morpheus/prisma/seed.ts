import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const passwordHash = await bcrypt.hash("admin123", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "clinica-demo" },
    update: {},
    create: {
      name: "Clinica Demo",
      slug: "clinica-demo",
      plan: "TRIAL",
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@clinica-demo.com" },
    update: {},
    create: {
      name: "Admin Demo",
      email: "admin@clinica-demo.com",
      passwordHash,
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });

  const room1 = await prisma.room.create({
    data: {
      tenantId: tenant.id,
      name: "Sala de Atendimento 1",
      color: "#6366f1",
    },
  });

  const room2 = await prisma.room.create({
    data: {
      tenantId: tenant.id,
      name: "Sala de Atendimento 2",
      color: "#ec4899",
    },
  });

  const psychologist = await prisma.psychologist.create({
    data: {
      tenantId: tenant.id,
      name: "Dra. Maria Silva",
      cpf: "12345678901",
      crp: "06/12345",
      email: "maria@clinica-demo.com",
      phone: "(11) 99999-9999",
    },
  });

  await prisma.psychologistSchedule.createMany({
    data: [
      { psychologistId: psychologist.id, dayOfWeek: 1, startTime: "08:00", endTime: "18:00" },
      { psychologistId: psychologist.id, dayOfWeek: 2, startTime: "08:00", endTime: "18:00" },
      { psychologistId: psychologist.id, dayOfWeek: 3, startTime: "08:00", endTime: "18:00" },
      { psychologistId: psychologist.id, dayOfWeek: 4, startTime: "08:00", endTime: "18:00" },
      { psychologistId: psychologist.id, dayOfWeek: 5, startTime: "08:00", endTime: "18:00" },
    ],
  });

  const client = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      psychologistId: psychologist.id,
      name: "Joao Cliente",
      cpf: "98765432100",
      email: "joao@email.com",
      phone: "(11) 98888-8888",
      consentEmail: true,
    },
  });

  console.log("Database seeded successfully!");
  console.log("Admin: admin@clinica-demo.com / admin123");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
