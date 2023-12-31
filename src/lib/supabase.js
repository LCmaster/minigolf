import { createClient } from "@supabase/supabase-js";
import {
  PUBLIC_SUPABASE_API,
  PUBLIC_SUPABASE_ANON_KEY,
} from "$env/static/public";

export const client = createClient(
  PUBLIC_SUPABASE_API,
  PUBLIC_SUPABASE_ANON_KEY
);
