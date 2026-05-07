import express from "express";
import cors from "cors";
import { corsOptions } from "./config/cors.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", chatRoutes);

export default app;
