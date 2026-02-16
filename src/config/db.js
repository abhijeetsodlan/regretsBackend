import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
let memoryServer = null;

export async function connectDB() {
  let uri = process.env.MONGO_URI;
  const useInMemory = process.env.USE_IN_MEMORY === "true" || !uri;
  if (useInMemory) {
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    console.log("Using in-memory MongoDB");
  }
  await mongoose.connect(uri, { maxPoolSize: 10 });
  mongoose.connection.on("error", (e) => {
    console.error("MongoDB connection error:", e);
  });
  if (memoryServer) {
    process.on("SIGINT", async () => {
      await mongoose.disconnect();
      await memoryServer.stop();
      process.exit(0);
    });
  }
}
