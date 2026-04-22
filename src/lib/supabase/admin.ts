import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only helper. This client uses the Supabase service-role key and must
// never be imported into "use client" modules or any browser-executed code.
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );