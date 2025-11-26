import type { User } from "@supabase/supabase-js";
import { EndditUser } from "./types";

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: User;
      endditUser?: EndditUser;
    }
  }
}