import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

type ApiMessageResponse = {
  message: string;
};

app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response<ApiMessageResponse>) => {
  res.json({ message: "Enddit backend is running 🚀" });
});


app.get("/api/hello", (req: Request, res: Response<ApiMessageResponse>) => {
  res.json({ message: "Hello from Express TypeScript backend!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
