import express from "express";
import cors from "cors";
import friendsRouter from "./routes/friends.routes";

import postRouter from "./routes/posts.routes";
import authRouter from "./routes/auth.routes";
import profileRouter from "./routes/profile.routes";
import chatRouter from "./routes/chat.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Enddit backend is running 🚀" });
});


app.use("/api/posts", postRouter);
app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter)
app.use("/api/friends", friendsRouter);
app.use("/api/chat", chatRouter);


export default app;
