import { Router } from "express";
import { User } from "../models/User.js";

export const providersRouter = Router();

providersRouter.get("/", async (_req, res) => {
  const providers = await User.find({ role: "provider", isActive: true })
    .sort({ createdAt: -1 })
    .select("_id name email");

  res.json({
    providers: providers.map((p) => ({
      id: p._id,
      name: p.name,
      email: p.email
    }))
  });
});

