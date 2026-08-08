import { createClient } from "@supabase/supabase-js";

// Client server-only, pakai service_role — JANGAN pernah diekspos ke browser.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const THUMBNAIL_BUCKET = "thumbnails";
