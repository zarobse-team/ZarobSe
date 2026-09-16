import express from "express";

import authRoutes from "./routes/auth.routes";
import jobsRoutes from "./routes/jobs.routes";
import usersRoutes from "./routes/users.routes";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/users", usersRoutes);

app.get("/", (req, res) => {
  res.send("Backend działa poprawnie!");
});

export default app;
