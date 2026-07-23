export interface Clinic {
  id: string;
  name: string;
  adminEmail: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeStatus: string;
  billingEnforced: boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  planId?: "essential" | "pro" | "elite";
  trialUsed: boolean;
}

export interface ClinicDoctor {
  id: string;
  clinicId: string;
  psychologistId?: number;
  email: string;
  displayName: string;
  role: "admin" | "doctor";
  userId?: string;
}

export type AuthUser =
  | { role: "admin"; clinicId: string; email: string; displayName: string }
  | { role: "doctor"; clinicId: string; email: string; displayName: string; psychologistId?: number };

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface UserWorkspace {
  clinicId: string;
  clinicName: string;
  role: "admin" | "doctor";
  psychologistId?: number;
}

export interface ClinicInvitation {
  id: string;
  clinicId: string;
  email: string;
  role: string;
  token: string;
  accepted: boolean;
  expiresAt: string;
  createdAt: string;
}

export interface SupabaseClinic {
  id: string;
  name: string;
  admin_email: string;
  admin_password_hash: string;
  user_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_status: string;
  billing_enforced: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  plan_id: "essential" | "pro" | "elite" | null;
  trial_used: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseClinicDoctor {
  id: string;
  clinic_id: string;
  psychologist_id: number | null;
  user_id: string | null;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
  created_at: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseClinicInvitation {
  id: string;
  clinic_id: string;
  email: string;
  role: string;
  token: string;
  accepted: boolean;
  expires_at: string;
  created_at: string;
}

export function mapClinic(row: SupabaseClinic): Clinic {
  return {
    id: row.id,
    name: row.name,
    adminEmail: row.admin_email,
    stripeCustomerId: row.stripe_customer_id ?? undefined,
    stripeSubscriptionId: row.stripe_subscription_id ?? undefined,
    stripePriceId: row.stripe_price_id ?? undefined,
    stripeStatus: row.stripe_status,
    billingEnforced: row.billing_enforced,
    currentPeriodEnd: row.current_period_end ?? undefined,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    planId: row.plan_id ?? undefined,
    trialUsed: row.trial_used ?? false,
  };
}

export function mapUser(row: SupabaseUser): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}

export function mapClinicInvitation(row: SupabaseClinicInvitation): ClinicInvitation {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    email: row.email,
    role: row.role,
    token: row.token,
    accepted: row.accepted,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
