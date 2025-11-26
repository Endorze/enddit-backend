export type EndditUser = {
    id: string
    created_at: string
    username: string
    email: string
}

export type Post = {
    id: number, 
    title: string,
    content: string,
    created_at: string,
    slug: string,
    user_id: string,
    image: string | null, 
    username: string;
    likesCount: number;
    likedByCurrentUser: boolean;
}