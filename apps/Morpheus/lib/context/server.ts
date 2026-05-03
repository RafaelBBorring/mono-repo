import { auth } from "@/auth";

export async function getServerSession() {
  return auth();
}

export async function getServerTenantId(): Promise<string> {
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    throw new Error("Unauthorized");
  }
  return session.user.tenantId;
}

export async function getServerUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function getServerUser() {
  const session = await getServerSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
