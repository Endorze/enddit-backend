import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireUser } from "../middleware/auth";

const friendsRouter = Router();

friendsRouter.get("/", requireUser, async (req: Request, res: Response) => {
  try {
    const { endditUser } = req;
    if (!endditUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = endditUser.id;

    const { data, error } = await supabase
      .from("friends")
      .select(`
        id,
        user_id_1,
        user_id_2,
        user1:users!friends_user_id_1_fkey (
          id,
          username,
          profile (
            avatar_url
          )
        ),
        user2:users!friends_user_id_2_fkey (
          id,
          username,
          profile (
            avatar_url
          )
        )
      `)
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to load friends" });
    }

    const mapped = (data ?? []).map((row: any) => {
      const isFirst = row.user_id_1 === userId;
      const friendUser = isFirst ? row.user2 : row.user1;
      return {
        friendshipId: row.id,
        userId: friendUser.id,
        username: friendUser.username,
        avatarUrl: friendUser.profile?.avatar_url ?? null,
      };
    });

    return res.json(mapped);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default friendsRouter;
