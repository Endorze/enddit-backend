import {z} from "zod"

export const loginSchema = z.object({
    email: z.email("Invalid e-mail format"),
    password: z.string().min(6, "Incorrect password")
})

export const signUpSchema = z.object({
    email: z.email(),
    password: z.string().min(6, "Your password requires least 6 characters"),
    username: z.string().min(3, "Your username should be least 3 characters")
})

export const createPostSchema = z.object({
    title: z.string().min(1, "Title required"),
    content: z.string().optional(),
    image: z.instanceof(FormData).optional()
})