import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { asyncHandler, HttpError } from "../utils/asyncHandler";

const router = Router();

const itemSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().int().min(0).default(0),
  unit_cost: z.number().min(0).default(0),
  unit_price: z.number().min(0).default(0),
  reorder_level: z.number().int().min(0).default(0),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || "";
    const lowStock = req.query.lowStock === "true";
    let rows = db
      .prepare(
        `SELECT * FROM inventory_items WHERE name LIKE ? OR sku LIKE ? OR category LIKE ?
         ORDER BY name ASC`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`) as any[];
    if (lowStock) {
      rows = rows.filter((r) => r.quantity <= r.reorder_level);
    }
    res.json(rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(req.params.id);
    if (!item) throw new HttpError(404, "Inventory item not found");
    res.json(item);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = itemSchema.parse(req.body);
    const result = db
      .prepare(
        `INSERT INTO inventory_items (name, sku, category, quantity, unit_cost, unit_price, reorder_level)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        data.name,
        data.sku || null,
        data.category || null,
        data.quantity,
        data.unit_cost,
        data.unit_price,
        data.reorder_level
      );
    const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(item);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = itemSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Inventory item not found");
    db.prepare(
      `UPDATE inventory_items
       SET name = ?, sku = ?, category = ?, quantity = ?, unit_cost = ?, unit_price = ?, reorder_level = ?
       WHERE id = ?`
    ).run(
      data.name,
      data.sku || null,
      data.category || null,
      data.quantity,
      data.unit_cost,
      data.unit_price,
      data.reorder_level,
      req.params.id
    );
    const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(req.params.id);
    res.json(item);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Inventory item not found");
    db.prepare("DELETE FROM inventory_items WHERE id = ?").run(req.params.id);
    res.status(204).send();
  })
);

export default router;
