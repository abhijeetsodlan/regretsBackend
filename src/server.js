const dotenv = require("dotenv");
const http = require("http");
const { connectDB } = require("./config/db.js");
const { createServer } = require("./app.js");
const { attachRealtime } = require("./realtime/realtime.js");
const { NightRoomPost } = require("./models/night-room-post.model.js");

dotenv.config();

const port = process.env.PORT;

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
    console.log(`API is runninggg on http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err.message || err);
  process.exit(1);
});



