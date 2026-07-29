import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { servicesRouter } from "./routes/services.js";

export function createApp() {
  const app = express();

  const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/services", servicesRouter);

  app.use((err, _req, res, _next) => {
    const status = Number.isInteger(err?.status) ? err.status : 500;
    res.status(status).json({ message: err?.message || "Internal server error" });
  });

  return app;
}
