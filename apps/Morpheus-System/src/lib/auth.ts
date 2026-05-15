export interface Clinic {
  id: string;
  name: string;
  adminEmail: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeStatus: string;
  billingEnforced: boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
}

export interface ClinicDoctor {
  id: string;
  clinicId: string;
  psychologistId?: number;
  email: string;
  displayName: string;
}

export type AuthUser =
  | { role: "admin"; clinicId: string; email: string; displayName: string }
  | { role: "doctor"; clinicId: string; email: string; displayName: string; psychologistId?: number };

export interface SupabaseClinic {
  id: string;
  name: string;
  admin_email: string;
  admin_password_hash: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_status: string;
  billing_enforced: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseClinicDoctor {
  id: string;
  clinic_id: string;
  psychologist_id: number | null;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: string;
}

export function mapClinic(row: SupabaseClinic): Clinic {
  return {
    id: row.id,
    name: row.name,
    adminEmail: row.admin_email,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    stripeStatus: row.stripe_status,
    billingEnforced: row.billing_enforced,
    currentPeriodEnd: row.current_period_end ?? undefined,
    cancelAtPeriodEnd: row.cancel_at_period_end,
  };
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
