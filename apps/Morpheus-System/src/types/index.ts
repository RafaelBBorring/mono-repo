export interface Room {
  id: number;
  name: string;
  hex: string;
  rgb: string;
  lightHex: string;
  lightRgb: string;
}

export interface Psychologist {
  id: number;
  name: string;
  shortName: string;
  initials: string;
  email?: string;
  hex: string;
  rgb: string;
  lightHex: string;
  lightRgb: string;
}

export interface Reservation {
  id: string;
  roomId: number;
  psychId: number;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
}

export interface BillingAccount {
  id: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeStatus: string;
  billingEnforced: boolean;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  updatedAt: string;
}

export type AppView = "splash" | "admin" | "psych" | "login" | "signup" | "billing";

export interface AppState {
  view: AppView;
  activePsych: Psychologist | null;
}

export interface SupabaseRoom {
  id: number;
  name: string;
  hex: string;
  rgb: string;
  light_hex: string;
  light_rgb: string;
  created_at: string;
}

export interface SupabasePsychologist {
  id: number;
  name: string;
  short_name: string;
  initials: string;
  email: string | null;
  hex: string;
  rgb: string;
  light_hex: string;
  light_rgb: string;
  created_at: string;
}

export interface SupabaseReservation {
  id: string;
  room_id: number;
  psych_id: number;
  date: string;
  start_time: string;
  end_time: string;
  notes: string;
  created_at: string;
}

export interface SupabaseBillingAccount {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_status: string;
  billing_enforced: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  updated_at: string;
}
