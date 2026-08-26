import "dotenv/config";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { requireAuth } from "./middleware/auth";
import { HttpError } from "./utils/asyncHandler";

import authRoutes from "./routes/auth";
import customerRoutes from "./routes/customers";
import inventoryRoutes from "./routes/inventory";
import serviceRoutes from "./routes/services";
import repairOrderRoutes from "./routes/repairOrders";
import invoiceRoutes from "./routes/invoices";
import appointmentRoutes from "./routes/appointments";
import dashboardRoutes from "./routes/dashboard";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);

// Everything below requires a valid JWT.
app.use("/api/customers", requireAuth, customerRoutes);
app.use("/api/inventory", requireAuth, inventoryRoutes);
app.use("/api/services", requireAuth, serviceRoutes);
app.use("/api/repair-orders", requireAuth, repairOrderRoutes);
app.use("/api/invoices", requireAuth, invoiceRoutes);
app.use("/api/appointments", requireAuth, appointmentRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Centralized error handler.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.errors });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Bicycle repair shop API listening on http://localhost:${PORT}`);
});
