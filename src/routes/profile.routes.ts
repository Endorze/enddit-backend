import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireUser } from "../middleware/auth";
import { id } from "zod/v4/locales";

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

profileRouter.get("/by-username/:username", requireUser, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { data, error } = await supabase
      .from("users")
      .select(`id, username, profile(avatar_url, description)`)
      .eq("username", username)
      .single();

    console.log("data: ", data)
    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to load profile" })
    }

    if (!data) {
      return res.status(404).json({ message: "Username not found" })
    }

    return res.json({
      userId: data.id,
      username: data.username,
      avatarUrl: data.profile[0]?.avatar_url ?? "default",
      description: data.profile[0]?.description,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: "Internal server error" })
  }

})

profileRouter.post("/addfriend/:userId", requireUser, async (req: Request, res: Response) => {
  try {
    const { endditUser } = req;
    const { userId: toUserId } = req.params;

    if (!endditUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const fromUserId = endditUser.id;

    if (fromUserId === toUserId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    // ✅ kolla om det redan finns pending request mellan just dessa två
    const { data: existing, error: existingError } = await supabase
      .from("friend_request")
      .select("id")
      .or(
        `and(from_user_id.eq.${fromUserId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${fromUserId})`
      )
      .maybeSingle();

    if (existingError) {
      console.error(existingError);
      return res.status(500).json({ message: "Failed checking existing request" });
    }

    if (existing) {
      return res.status(400).json({ message: "Friend request already exists" });
    }

    const { data, error } = await supabase
      .from("friend_request")
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to create friend request" });
    }

    return res.json({
      id: data.id,
      from_user_id: data.from_user_id,
      to_user_id: data.to_user_id,
      created_at: data.created_at,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

profileRouter.get(
  "/friendrequests",
  requireUser,
  async (req: Request, res: Response) => {
    try {
      const { endditUser } = req;

      if (!endditUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { data, error } = await supabase
        .from("friend_request")
        .select(`
          id,
          created_at,
          from_user:from_user_id (
            id,
            username,
            profile (
              avatar_url
            )
          )
        `)
        .eq("to_user_id", endditUser.id);

      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Failed to load friend requests" });
      }

      const mapped = (data ?? []).map((row: any) => ({
        id: row.id,
        fromUserId: row.from_user.id,
        username: row.from_user.username,
        avatarUrl: row.from_user.profile?.avatar_url ?? null,
        createdAt: row.created_at,
      }));

      return res.json(mapped);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

profileRouter.post(
  "/friendrequests/:requestId/respond",
  requireUser,
  async (req: Request, res: Response) => {
    try {
      const { endditUser } = req;
      const { requestId } = req.params;
      const { accept } = req.body as { accept: boolean };

      if (!endditUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 1. Hämta request
      const { data: request, error: reqError } = await supabase
        .from("friend_request")
        .select("*")
        .eq("id", requestId)
        .single();

      if (reqError || !request) {
        console.error(reqError);
        return res.status(404).json({ message: "Request not found" });
      }

      if (request.to_user_id !== endditUser.id) {
        return res
          .status(403)
          .json({ message: "You are not allowed to respond to this request" });
      }

      // 2. Om accept -> skapa vänskap
      if (accept) {
        const a = request.from_user_id;
        const b = request.to_user_id;
        const user_id_1 = a < b ? a : b;
        const user_id_2 = a < b ? b : a;

        const { error: friendError } = await supabase
          .from("friends")
          .insert({ user_id_1, user_id_2 });

        if (friendError) {
          console.error(friendError);
          return res
            .status(500)
            .json({ message: "Failed to create friendship" });
        }
      }

      // 3. Ta alltid bort request (oavsett accept/decline)
      const { error: deleteError } = await supabase
        .from("friend_request")
        .delete()
        .eq("id", requestId);

      if (deleteError) {
        console.error(deleteError);
        return res
          .status(500)
          .json({ message: "Failed to delete friend request" });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);



export default profileRouter;
