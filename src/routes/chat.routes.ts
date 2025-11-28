import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { requireUser } from "../middleware/auth";

const chatRouter = Router();

//hämtar messages
chatRouter.get(
  "/:friendId/messages",
  requireUser,
  async (req: Request, res: Response) => {
    try {
      const { endditUser } = req;
      const { friendId } = req.params;

      if (!endditUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = endditUser.id;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Failed to load messages" });
      }

      return res.json(data ?? []);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

chatRouter.post(
  "/:friendId/messages",
  requireUser,
  async (req: Request, res: Response) => {
    try {
      const { endditUser } = req;
      const { friendId } = req.params;
      const { content } = req.body;

      if (!endditUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const userId = endditUser.id;

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          receiver_id: friendId,
          content,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Failed to send message" });
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default chatRouter;
