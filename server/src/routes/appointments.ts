import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { APPOINTMENT_STATUSES } from "../types";

const router = Router();

const appointmentSchema = z.object({
  customer_id: z.number().int(),
  bike_id: z.number().int().nullable().optional(),
  scheduled_at: z.string().min(1),
  duration_minutes: z.number().int().min(5).default(30),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    let query = `
      SELECT a.*, c.name AS customer_name, b.brand AS bike_brand, b.model AS bike_model
      FROM appointments a
      JOIN customers c ON c.id = a.customer_id
      LEFT JOIN bikes b ON b.id = a.bike_id
      WHERE 1 = 1`;
    const params: any[] = [];
    if (from) {
      query += " AND a.scheduled_at >= ?";
      params.push(from);
    }
    if (to) {
      query += " AND a.scheduled_at <= ?";
      params.push(to);
    }
    query += " ORDER BY a.scheduled_at ASC";
    res.json(db.prepare(query).all(...params));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = appointmentSchema.parse(req.body);
    const result = db
      .prepare(
        `INSERT INTO appointments (customer_id, bike_id, scheduled_at, duration_minutes, reason, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.customer_id,
        data.bike_id ?? null,
        data.scheduled_at,
        data.duration_minutes,
        data.reason || null,
        data.notes || null
      );
    const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(appt);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = appointmentSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Appointment not found");
    db.prepare(
      `UPDATE appointments
       SET customer_id = ?, bike_id = ?, scheduled_at = ?, duration_minutes = ?, reason = ?, notes = ?
       WHERE id = ?`
    ).run(
      data.customer_id,
      data.bike_id ?? null,
      data.scheduled_at,
      data.duration_minutes,
      data.reason || null,
      data.notes || null,
      req.params.id
    );
    const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
    res.json(appt);
  })
);

const statusSchema = z.object({ status: z.enum(APPOINTMENT_STATUSES) });

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Appointment not found");
    db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, req.params.id);
    const appt = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
    res.json(appt);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = db.prepare("SELECT * FROM appointments WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Appointment not found");
    db.prepare("DELETE FROM appointments WHERE id = ?").run(req.params.id);
    res.status(204).send();
  })
);

export default router;
