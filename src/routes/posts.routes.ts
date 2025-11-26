import { Router, Request, Response } from "express";
import multer from "multer";
import { supabase } from "../lib/supabase";
import { requireUser } from "../middleware/auth";
import { slugify } from "../utils/slugify";
import { uploadImage } from "../utils/upload-image";
import { userInfo } from "os";
import { Post } from "../types/types";

const postRouter = Router();
const upload = multer();

type CreatePostBody = {
  title: string;
  content: string;
};


postRouter.get("/", requireUser, async (req: Request, res: Response) => {
  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      content,
      created_at,
      slug,
      image,
      user_id,
      users!posts_user_id_fkey (
        id,
        username
      )
    `)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error(postsError);
    return res.status(500).json({ message: "Failed to load posts" });
  }

  const postIds = (postsData ?? []).map((p) => p.id);

  const { data: likesRows, error: likesError } = await supabase
    .from("likes")
    .select("post_id, user_id, id");

  if (likesError) {
    console.error(likesError);
    return res.status(500).json({ message: "Failed to load likes" });
  }

  const likesMap = new Map<number, number>();
  (likesRows ?? []).forEach((row: any) => {
    likesMap.set(row.post_id, (likesMap.get(row.post_id) ?? 0) + 1);
  });

  const posts: Post[] = (postsData ?? []).map((post) => {

    const hasLiked = likesRows.some(
      row => row.user_id == req.endditUser?.id
        && row.post_id == post.id
    )

    const user = post.users as any

    const result: Post = ({
      id: post.id,
      title: post.title,
      content: post.content,
      created_at: post.created_at,
      slug: post.slug,
      image: post.image,
      user_id: post.user_id,
      username: user?.username ?? "Unknown user",
      likesCount: likesMap.get(post.id) ?? 0,
      likedByCurrentUser: hasLiked,
    })

    return result
  });

  return res.json(posts);
});

postRouter.post("/:postId/addcomment", requireUser, async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.postId)
    console.log("req params: ", req.params)
    const { endditUser } = req;
    const { user_id, content } = req.body;

    if (!postId) {
      return;
    }

    const { data, error: commentError } = await supabase
      .from("comments")
      .insert([{
        post_id: postId,
        user_id: endditUser?.id,
        content,
      }])
      .select()
      .single();
    return res.json(data);

  } catch (err) {
    console.error(err);
  }
})

postRouter.post("/:postId/likes/toggle", requireUser, async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.postId);
    const { endditUser } = req;

    if (!postId) {
      return res.status(400).json({ message: "Invalid Post Id" })
    }

    const { data: existingLike, error: likeError } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", endditUser!!.id)
      .maybeSingle();

    if (likeError) {
      console.error(likeError);
    }
    let liked: boolean;
    if (existingLike) {
      await supabase
        .from("likes")
        .delete()
        .eq("id", existingLike.id)

      liked = false;
    } else {
      await supabase
        .from("likes")
        .insert({ post_id: postId, user_id: endditUser!!.id });
      liked = true;
    }

    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    return res.json({
      liked,
      likesCount: count ?? 0,
    })

  } catch (err) {
    console.error(err);
  }
})

postRouter.post(
  "/",
  requireUser,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const { endditUser } = req;
      const { title, content } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Title and content required" });
      }

      let imageUrl: string | null = null;
      if (req.file) {
        imageUrl = await uploadImage(req.file);
      }

      const baseSlug = slugify(title);
      let slug = baseSlug;
      let counter = 1;

      while (true) {
        const { data: exists } = await supabase
          .from("posts")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (!exists) break;
        slug = `${baseSlug}-${counter++}`;
      }

      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            user_id: endditUser!!.id,
            slug,
            title,
            content,
            image: imageUrl,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create post" });
      }

      return res.status(201).json(data);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Unexpected error" });
    }
  }
);

//get comments for a post
postRouter.get("/:postId/comments", async (req: Request, res: Response) => {
  const postId = Number(req.params.postId);
  if (!postId) {
    return res.status(400).json({ message: "Invalid Post Id" })
  }

  const { data, error } = await supabase
    .from("comments").select(`id,
    post_id,
    content,
    created_at,
    parent_id,
    user:users!comments_user_id_fkey(username)
    `)
    .eq("post_id", postId)
    .is("parent_id", null)
    .order("created_at", { ascending: true })

  if (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to load comments" })
  }
  return res.json(data);
});


export default postRouter;
