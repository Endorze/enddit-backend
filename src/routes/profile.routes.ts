import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireUser } from "../middleware/auth";

const profileRouter = Router();

profileRouter.get("/me", requireUser, async (req: Request, res: Response) => {
  try {
    const { endditUser } = req;

    if (!endditUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        username,
        profile (
          avatar_url,
          description
        )
      `)
      .eq("id", endditUser.id)
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to load profile" });
    }

    if (!data) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json({
      userId: data.id,
      username: data.username,
      avatarUrl: data.profile[0]?.avatar_url ?? null,
      description: data.profile[0]?.description ?? "",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default profileRouter;
