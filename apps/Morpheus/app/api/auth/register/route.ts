import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email ja cadastrado" },
        { status: 409 }
      );
    }

    const slug = data.clinicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const existingSlug = await prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      return NextResponse.json(
        { error: "Nome da clinica ja esta em uso" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.clinicName,
          slug,
          plan: "TRIAL",
          planExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.adminName,
          email: data.email,
          passwordHash: hashedPassword,
          role: "ADMIN",
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    return NextResponse.json(
      { message: "Registro realizado com sucesso", tenant: result.tenant },
      { status: 201 }
    );
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
