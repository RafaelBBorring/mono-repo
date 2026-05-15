import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wjwjbfzusppinjlyxznk.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqd2piZnp1c3BwaW5qbHl4em5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTA2MjMsImV4cCI6MjA5NDI2NjYyM30.npzBD5TWoyQ2wfvuVEcOhq5fWjfd7A_2AlrDu8bA3ig";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
