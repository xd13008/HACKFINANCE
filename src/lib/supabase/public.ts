import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Client anonyme sans cookie pour le site public : les pages restent cachables (ISR).
 * Les règles d'accès (RLS) ne laissent passer que les contenus publiés.
 */
export function publicClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
