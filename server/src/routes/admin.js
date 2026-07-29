import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit ?? "10", 10) || 10));
  const search = String(req.query.search ?? "").trim();

  const filter = {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    filter.$or = [{ name: re }, { email: re }];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("_id name email role isActive createdAt")
  ]);

  res.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    users: users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt
    }))
  });
});

adminRouter.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid user id" });
  if (req.user._id.toString() === id && req.body?.isActive === false) {
    return res.status(400).json({ message: "Admin cannot deactivate self" });
  }

  const update = {};
  if (req.body?.role !== undefined) {
    const role = String(req.body.role);
    if (!["admin", "provider", "resident"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    update.role = role;
  }
  if (req.body?.isActive !== undefined) {
    update.isActive = Boolean(req.body.isActive);
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ message: "No changes" });
  }

  const user = await User.findByIdAndUpdate(id, update, { new: true }).select("_id name email role isActive createdAt");
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    }
  });
});

 