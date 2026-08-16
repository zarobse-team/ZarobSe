import dotenv from "dotenv";
import app from "./app";
import connectDB from "./config/db";

dotenv.config();

connectDB();

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server działa na porcie ${PORT}`);
});
