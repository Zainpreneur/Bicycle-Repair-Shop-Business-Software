import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { asyncHandler, HttpError } from "../utils/asyncHandler";

const router = Router();

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const rows = db
      .prepare(
        `SELECT * FROM customers
         WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?
         ORDER BY name ASC`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
    res.json(rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    if (!customer) throw new HttpError(404, "Customer not found");
    const bikes = db
      .prepare("SELECT * FROM bikes WHERE customer_id = ? ORDER BY created_at DESC")
      .all(req.params.id);
    const repairOrders = db
      .prepare("SELECT * FROM repair_orders WHERE customer_id = ? ORDER BY created_at DESC")
      .all(req.params.id);
    const invoices = db
      .prepare("SELECT * FROM invoices WHERE customer_id = ? ORDER BY issued_date DESC")
      .all(req.params.id);
    res.json({ customer, bikes, repairOrders, invoices });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);
    const result = db
      .prepare(
        "INSERT INTO customers (name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?)"
      )
      .run(data.name, data.email || null, data.phone || null, data.address || null, data.notes || null);
    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(customer);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = customerSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Customer not found");
    db.prepare(
      "UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, notes = ? WHERE id = ?"
    ).run(data.name, data.email || null, data.phone || null, data.address || null, data.notes || null, req.params.id);
    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    res.json(customer);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Customer not found");
    db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
    res.status(204).send();
  })
);

// --- Bikes nested under a customer ---

const bikeSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  bike_type: z.string().optional(),
  color: z.string().optional(),
  serial_number: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  "/:id/bikes",
  asyncHandler(async (req, res) => {
    const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(req.params.id);
    if (!customer) throw new HttpError(404, "Customer not found");
    const data = bikeSchema.parse(req.body);
    const result = db
      .prepare(
        `INSERT INTO bikes (customer_id, brand, model, bike_type, color, serial_number, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.params.id,
        data.brand || null,
        data.model || null,
        data.bike_type || null,
        data.color || null,
        data.serial_number || null,
        data.notes || null
      );
    const bike = db.prepare("SELECT * FROM bikes WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(bike);
  })
);

router.put(
  "/:customerId/bikes/:bikeId",
  asyncHandler(async (req, res) => {
    const data = bikeSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM bikes WHERE id = ? AND customer_id = ?").get(
      req.params.bikeId,
      req.params.customerId
    );
    if (!existing) throw new HttpError(404, "Bike not found");
    db.prepare(
      `UPDATE bikes SET brand = ?, model = ?, bike_type = ?, color = ?, serial_number = ?, notes = ?
       WHERE id = ?`
    ).run(
      data.brand || null,
      data.model || null,
      data.bike_type || null,
      data.color || null,
      data.serial_number || null,
      data.notes || null,
      req.params.bikeId
    );
    const bike = db.prepare("SELECT * FROM bikes WHERE id = ?").get(req.params.bikeId);
    res.json(bike);
  })
);

router.delete(
  "/:customerId/bikes/:bikeId",
  asyncHandler(async (req, res) => {
    const existing = db.prepare("SELECT * FROM bikes WHERE id = ? AND customer_id = ?").get(
      req.params.bikeId,
      req.params.customerId
    );
    if (!existing) throw new HttpError(404, "Bike not found");
    db.prepare("DELETE FROM bikes WHERE id = ?").run(req.params.bikeId);
    res.status(204).send();
  })
);

export default router;
