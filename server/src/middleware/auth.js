import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

function getTokenFromHeader(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

export async function requireAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("_id name email role isActive");
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (!user.isActive) return res.status(403).json({ message: "Account deactivated" });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

export function requireRole(roles) {
  const list = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!list.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
