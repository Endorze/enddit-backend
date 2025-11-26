import { supabase } from "../lib/supabase";
import { randomUUID } from "crypto";

export async function uploadImage(file: Express.Multer.File) {
  const extension = file.originalname.split(".").pop();
  const filename = `${randomUUID()}.${extension}`;

  const { data, error } = await supabase.storage
    .from("images-enddit")
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
    });

  if (error) {
    console.error(error);
    throw new Error("Failed to upload image");
  }

  const { data: publicUrlData } = await supabase.storage
    .from("images-enddit")
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}
