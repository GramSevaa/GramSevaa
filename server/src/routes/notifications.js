import { Router } from "express";
import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, requireRole("provider"), async (req, res) => {
  const [unreadCount, items] = await Promise.all([
    Notification.countDocuments({ provider: req.user._id, readAt: null }),
    Notification.find({ provider: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
  ]);

  res.json({
    unreadCount,
    notifications: items.map((n) => ({
      id: n._id,
      type: n.type,
      reviewId: n.review,
      reviewerName: n.reviewerName || "Anonymous",
      rating: n.rating,
      readAt: n.readAt,
      createdAt: n.createdAt
    }))
  });
});

notificationsRouter.patch("/:id/read", requireAuth, requireRole("provider"), async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid notification id" });

  let notification = await Notification.findOneAndUpdate(
    { _id: id, provider: req.user._id, readAt: null },
    { readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    notification = await Notification.findOne({ _id: id, provider: req.user._id });
  }
  if (!notification) return res.status(404).json({ message: "Notification not found" });

  res.json({
    notification: {
      id: notification._id,
      type: notification.type,
      reviewId: notification.review,
      reviewerName: notification.reviewerName || "Anonymous",
      rating: notification.rating,
      readAt: notification.readAt,
      createdAt: notification.createdAt
    }
  });
});

