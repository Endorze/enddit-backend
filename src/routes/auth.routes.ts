import { Router } from "express";
import { supabase } from "../lib/supabase";

const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const session = data.session;

  return res.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user,
  });
});

export default authRouter;
