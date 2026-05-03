import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export async function audit(params: {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  metadata?: object;
}) {
  const hdrs = headers();
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action as any,
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.metadata ?? undefined,
      ipAddress: hdrs.get("x-forwarded-for") ?? undefined,
      userAgent: hdrs.get("user-agent") ?? undefined,
    },
  });
}
