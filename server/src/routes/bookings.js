import { Router } from "express";
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

function startOfDayUtc(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map((x) => Number.parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export const bookingsRouter = Router();

bookingsRouter.get("/availability", async (req, res) => {
  const providerId = String(req.query.providerId ?? "").trim();
  const date = String(req.query.date ?? "").trim();
  if (!mongoose.Types.ObjectId.isValid(providerId)) return res.status(400).json({ message: "providerId is required" });

  const dayStart = startOfDayUtc(date);
  if (!dayStart) return res.status(400).json({ message: "date must be YYYY-MM-DD" });
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const bookings = await Booking.find({
    provider: providerId,
    status: { $in: ["pending", "confirmed"] },
    startAt: { $gte: dayStart, $lt: dayEnd }
  }).select("startAt durationMinutes");

  res.json({
    booked: bookings.map((b) => ({
      startAt: b.startAt,
      durationMinutes: b.durationMinutes
    }))
  });
});

bookingsRouter.post("/", requireAuth, requireRole(["resident"]), async (req, res) => {
  const { providerId, serviceId, startAt, durationMinutes } = req.body ?? {};
  if (!providerId || !startAt) return res.status(400).json({ message: "providerId and startAt are required" });
  if (!mongoose.Types.ObjectId.isValid(providerId)) return res.status(400).json({ message: "Invalid providerId" });
  if (serviceId && !mongoose.Types.ObjectId.isValid(serviceId)) return res.status(400).json({ message: "Invalid serviceId" });

  const provider = await User.findById(providerId).select("_id role isActive name");
  if (!provider || provider.role !== "provider") return res.status(400).json({ message: "Provider not found" });
  if (!provider.isActive) return res.status(400).json({ message: "Provider account is deactivated" });

  let service = null;
  if (serviceId) {
    service = await Service.findById(serviceId).select("_id provider isActive title");
    if (!service) return res.status(400).json({ message: "Service not found" });
    if (!service.isActive) return res.status(400).json({ message: "Service is inactive" });
    if (service.provider.toString() !== providerId) return res.status(400).json({ message: "Service does not belong to provider" });
  }

  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return res.status(400).json({ message: "Invalid startAt" });
  if (start.getTime() < Date.now() + 60_000) return res.status(400).json({ message: "Start time must be in the future" });

  const dur = Number.isFinite(Number(durationMinutes)) ? Number(durationMinutes) : 60;
  const duration = Math.min(480, Math.max(15, dur));

  const conflict = await Booking.findOne({
    provider: providerId,
    startAt: start,
    status: { $in: ["pending", "confirmed"] }
  }).select("_id");
  if (conflict) return res.status(409).json({ message: "Time slot already booked" });

  const booking = await Booking.create({
    resident: req.user._id,
    provider: providerId,
    service: service ? service._id : null,
    startAt: start,
    durationMinutes: duration,
    status: "pending"
  });

  res.status(201).json({
    booking: {
      id: booking._id,
      provider: { id: provider._id, name: provider.name },
      service: service ? { id: service._id, title: service.title } : null,
      startAt: booking.startAt,
      durationMinutes: booking.durationMinutes,
      status: booking.status
    }
  });
});

