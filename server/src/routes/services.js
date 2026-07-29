import { Router } from "express";
import mongoose from "mongoose";
import { Service } from "../models/Service.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const servicesRouter = Router();

servicesRouter.get("/", async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit ?? "10", 10) || 10));
  const search = String(req.query.search ?? "").trim();
  const category = String(req.query.category ?? "").trim();
  const location = String(req.query.location ?? "").trim();

  const filter = { isActive: true };
  if (category) filter.category = category;
  if (location) filter.location = location;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "i");
    filter.$or = [{ title: re }, { description: re }, { category: re }, { location: re }];
  }

  const [total, services] = await Promise.all([
    Service.countDocuments(filter),
    Service.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("provider", "name email")
  ]);

  res.json({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    services: services.map((s) => ({
      id: s._id,
      title: s.title,
      category: s.category,
      description: s.description,
      location: s.location,
      price: s.price,
      isActive: s.isActive,
      provider: s.provider ? { id: s.provider._id, name: s.provider.name, email: s.provider.email } : null,
      createdAt: s.createdAt
    }))
  });
});

servicesRouter.get("/mine", requireAuth, requireRole(["provider"]), async (req, res) => {
  const services = await Service.find({ provider: req.user._id }).sort({ createdAt: -1 });
  res.json({
    services: services.map((s) => ({
      id: s._id,
      title: s.title,
      category: s.category,
      description: s.description,
      location: s.location,
      price: s.price,
      isActive: s.isActive,
      createdAt: s.createdAt
    }))
  });
});

servicesRouter.post("/", requireAuth, requireRole(["provider"]), async (req, res) => {
  const { title, category, description, location, price } = req.body ?? {};
  if (!title || !category) return res.status(400).json({ message: "title and category are required" });

  const service = await Service.create({
    provider: req.user._id,
    title: String(title).trim(),
    category: String(category).trim(),
    description: String(description ?? "").trim(),
    location: String(location ?? "").trim(),
    price: Number.isFinite(Number(price)) ? Number(price) : 0,
    isActive: true
  });

  res.status(201).json({
    service: {
      id: service._id,
      title: service.title,
      category: service.category,
      description: service.description,
      location: service.location,
      price: service.price,
      isActive: service.isActive,
      createdAt: service.createdAt
    }
  });
});

servicesRouter.patch("/:id", requireAuth, requireRole(["provider"]), async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid service id" });

  const service = await Service.findOne({ _id: id, provider: req.user._id });
  if (!service) return res.status(404).json({ message: "Service not found" });

  if (req.body?.title !== undefined) service.title = String(req.body.title).trim();
  if (req.body?.category !== undefined) service.category = String(req.body.category).trim();
  if (req.body?.description !== undefined) service.description = String(req.body.description ?? "").trim();
  if (req.body?.location !== undefined) service.location = String(req.body.location ?? "").trim();
  if (req.body?.price !== undefined) {
    const p = Number(req.body.price);
    service.price = Number.isFinite(p) ? p : 0;
  }
  if (req.body?.isActive !== undefined) service.isActive = Boolean(req.body.isActive);

  await service.save();
  res.json({
    service: {
      id: service._id,
      title: service.title,
      category: service.category,
      description: service.description,
      location: service.location,
      price: service.price,
      isActive: service.isActive,
      createdAt: service.createdAt
    }
  });
});

