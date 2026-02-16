import express from "express";
import cors from "cors";
import itemRoutes from "./routes/item.routes.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api/items", itemRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
