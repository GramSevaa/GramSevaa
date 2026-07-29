import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Review } from "../models/Review.js";
import { Notification } from "../models/Notification.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

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

providersRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid provider id" });

  const provider = await User.findOne({ _id: id, role: "provider" }).select("_id name email isActive createdAt");
  if (!provider || !provider.isActive) return res.status(404).json({ message: "Provider not found" });

  res.json({
    provider: { id: provider._id, name: provider.name, email: provider.email, createdAt: provider.createdAt }
  });
});

providersRouter.get("/:id/reviews", async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid provider id" });

  const provider = await User.findOne({ _id: id, role: "provider" }).select("_id isActive");
  if (!provider || !provider.isActive) return res.status(404).json({ message: "Provider not found" });

  const reviews = await Review.find({ provider: id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("resident", "name");

  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  const avg = reviews.length > 0 ? sum / reviews.length : null;
  const rounded = avg === null ? null : Math.round(avg * 10) / 10;

  res.json({
    averageRating: rounded,
    reviewCount: reviews.length,
    reviews: reviews.map((r) => ({
      id: r._id,
      reviewerName: r.resident?.name || "Anonymous",
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt
    }))
  });
});

providersRouter.post("/:id/reviews", requireAuth, requireRole("resident"), async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid provider id" });

  const provider = await User.findOne({ _id: id, role: "provider" }).select("_id isActive");
  if (!provider || !provider.isActive) return res.status(404).json({ message: "Provider not found" });

  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment ?? "").trim();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: "Invalid rating" });

  try {
    const review = await Review.create({
      provider: id,
      resident: req.user._id,
      rating,
      comment
    });

    await Notification.create({
      provider: id,
      type: "review",
      review: review._id,
      reviewerName: req.user?.name || "Anonymous",
      rating: review.rating
    });

    res.status(201).json({
      review: {
        id: review._id,
        reviewerName: req.user?.name || "Anonymous",
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt
      }
    });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: "You already reviewed this provider" });
    throw err;
  }
});
