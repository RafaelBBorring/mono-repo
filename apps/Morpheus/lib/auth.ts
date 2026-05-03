import bcrypt from "bcryptjs";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function bcryptCompare(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
