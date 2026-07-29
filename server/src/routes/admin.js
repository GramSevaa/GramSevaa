import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Review } from "../models/Review.js";
import { Notification } from "../models/Notification.js";
import { AdminAction } from "../models/AdminAction.js";
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

adminRouter.get("/reviews", requireAuth, requireAdmin, async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit ?? "10", 10) || 10));

  const provider = String(req.query.provider ?? "").trim();
  const reviewer = String(req.query.reviewer ?? "").trim();
  const ratingRaw = String(req.query.rating ?? "").trim();

  const filter = {};
  if (provider) {
    if (!mongoose.Types.ObjectId.isValid(provider)) return res.status(400).json({ message: "Invalid provider id" });
    filter.provider = provider;
  }
  if (reviewer) {
    if (!mongoose.Types.ObjectId.isValid(reviewer)) return res.status(400).json({ message: "Invalid reviewer id" });
    filter.resident = reviewer;
  }
  if (ratingRaw) {
    const rating = Number.parseInt(ratingRaw, 10);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "Invalid rating" });
    filter.rating = rating;
  }

  const [total, reviews] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("provider", "name email")
      .populate("resident", "name email")
  ]);

  res.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    reviews: reviews.map((r) => ({
      id: r._id,
      provider: { id: r.provider?._id, name: r.provider?.name || "", email: r.provider?.email || "" },
      reviewer: { id: r.resident?._id, name: r.resident?.name || "", email: r.resident?.email || "" },
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt
    }))
  });
});

adminRouter.delete("/reviews/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid review id" });

  const review = await Review.findById(id);
  if (!review) return res.status(404).json({ message: "Review not found" });

  await Promise.all([
    Review.deleteOne({ _id: id }),
    Notification.deleteMany({ review: id }),
    AdminAction.create({
      admin: req.user._id,
      action: "delete_review",
      review: review._id,
      provider: review.provider,
      resident: review.resident,
      meta: { rating: review.rating, comment: review.comment }
    })
  ]);

  res.json({ ok: true });
});
