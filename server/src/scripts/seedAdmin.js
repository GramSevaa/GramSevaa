import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "../db.js";
import { User } from "../models/User.js";

const email = String(process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase().trim();
const password = String(process.env.SEED_ADMIN_PASSWORD ?? "");

if (!email || !password) {
  process.stderr.write("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required\n");
  process.exit(1);
}

await connectDb();

const passwordHash = await bcrypt.hash(password, 10);
const existing = await User.findOne({ email });

if (existing) {
  existing.passwordHash = passwordHash;
  existing.role = "admin";
  existing.isActive = true;
  await existing.save();
  process.stdout.write(`Updated admin: ${email}\n`);
  process.exit(0);
}

await User.create({
  name: "Admin",
  email,
  passwordHash,
  role: "admin",
  isActive: true
});

process.stdout.write(`Created admin: ${email}\n`);
process.exit(0);

