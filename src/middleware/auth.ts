import { supabase } from "../lib/supabase";
import { Request, Response, NextFunction } from "express";

export async function requireUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }

  const access_token = header.replace("Bearer ", "");

  const { data, error } = await supabase.auth.getUser(access_token);

  if (error || !data.user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  req.supabaseUser = data.user;
  const { data: endditUserData, error: userError } = await supabase
  .from("users")
  .select("*")
  .eq("id", data.user.id) 
  .maybeSingle();
  
if (userError || !endditUserData) {
  return res.status(401).json({ message: "No matching Enddit user" });
}

req.endditUser = endditUserData;

next();
}
