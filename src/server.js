import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { createServer } from "./app.js";

dotenv.config();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

async function bootstrap() {
  await connectDB();
  const app = createServer();
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err.message || err);
  process.exit(1);
});
