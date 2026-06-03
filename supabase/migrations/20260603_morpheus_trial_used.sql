-- Add trial_used column to clinics (referenced by checkout route and stripeBilling)
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS trial_used BOOLEAN NOT NULL DEFAULT false;
