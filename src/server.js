import dotenv from "dotenv";
import http from "http";
import { connectDB } from "./config/db.js";
import { createServer } from "./app.js";
import { attachRealtime } from "./realtime/realtime.js";
import { NightRoomPost } from "./models/night-room-post.model.js";

dotenv.config();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

async function bootstrap() {
  await connectDB();
  try {
    await NightRoomPost.collection.dropIndex("expiresAt_1");
  } catch {
    // Index may not exist in fresh environments.
  }
  const app = createServer();
  const httpServer = http.createServer(app);
  attachRealtime(httpServer);

  httpServer.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err.message || err);
  process.exit(1);
});
