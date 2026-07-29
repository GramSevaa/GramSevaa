import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body ?? {};
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email, password are required" });
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail }).select("_id");
  if (existing) return res.status(409).json({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await User.create({
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    role: role === "provider" ? "provider" : "resident",
    isActive: true
  });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
  });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ message: "email, password are required" });
  const normalizedEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  if (!user.isActive) return res.status(403).json({ message: "Account deactivated" });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }
  });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, isActive: req.user.isActive } });
});

