import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { asyncHandler, HttpError } from "../utils/asyncHandler";

const router = Router();

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0).default(0),
  estimated_minutes: z.number().int().min(0).default(30),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = db.prepare("SELECT * FROM services ORDER BY name ASC").all();
    res.json(rows);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = serviceSchema.parse(req.body);
    const result = db
      .prepare(
        "INSERT INTO services (name, description, price, estimated_minutes) VALUES (?, ?, ?, ?)"
      )
      .run(data.name, data.description || null, data.price, data.estimated_minutes);
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(service);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = serviceSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Service not found");
    db.prepare(
      "UPDATE services SET name = ?, description = ?, price = ?, estimated_minutes = ? WHERE id = ?"
    ).run(data.name, data.description || null, data.price, data.estimated_minutes, req.params.id);
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    res.json(service);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Service not found");
    db.prepare("DELETE FROM services WHERE id = ?").run(req.params.id);
    res.status(204).send();
  })
);

export default router;
