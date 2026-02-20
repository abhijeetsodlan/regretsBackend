import { Router } from "express";
import { csrfCookie } from "../controllers/session.controller.js";

const router = Router();

router.get("/csrf-cookie", csrfCookie);

export default router;

