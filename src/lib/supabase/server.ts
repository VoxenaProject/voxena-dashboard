import { createClient } from "@supabase/supabase-js";

// Client service_role pour les API routes (bypass RLS)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
