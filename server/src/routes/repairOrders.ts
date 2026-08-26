import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { REPAIR_PRIORITIES, REPAIR_STATUSES } from "../types";

const router = Router();

const orderSchema = z.object({
  customer_id: z.number().int(),
  bike_id: z.number().int().nullable().optional(),
  description: z.string().optional(),
  priority: z.enum(REPAIR_PRIORITIES).default("normal"),
  promised_date: z.string().nullable().optional(),
});

const itemSchema = z.object({
  item_type: z.enum(["service", "part"]),
  reference_id: z.number().int().nullable().optional(),
  description: z.string().min(1),
  quantity: z.number().min(0.01).default(1),
  unit_price: z.number().min(0).default(0),
});

function withTotal(order: any) {
  const items = db
    .prepare("SELECT * FROM repair_order_items WHERE repair_order_id = ?")
    .all(order.id) as any[];
  const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  return { ...order, items, total: Math.round(total * 100) / 100 };
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const customerId = req.query.customerId as string | undefined;

    let query = `
      SELECT ro.*, c.name AS customer_name, b.brand AS bike_brand, b.model AS bike_model
      FROM repair_orders ro
      JOIN customers c ON c.id = ro.customer_id
      LEFT JOIN bikes b ON b.id = ro.bike_id
      WHERE 1 = 1`;
    const params: any[] = [];
    if (status) {
      query += " AND ro.status = ?";
      params.push(status);
    }
    if (customerId) {
      query += " AND ro.customer_id = ?";
      params.push(customerId);
    }
    query += " ORDER BY ro.created_at DESC";

    const rows = db.prepare(query).all(...params) as any[];
    const withTotals = rows.map((row) => {
      const items = db
        .prepare("SELECT * FROM repair_order_items WHERE repair_order_id = ?")
        .all(row.id) as any[];
      const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      return { ...row, total: Math.round(total * 100) / 100 };
    });
    res.json(withTotals);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = db
      .prepare(
        `SELECT ro.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
                b.brand AS bike_brand, b.model AS bike_model, b.bike_type, b.serial_number
         FROM repair_orders ro
         JOIN customers c ON c.id = ro.customer_id
         LEFT JOIN bikes b ON b.id = ro.bike_id
         WHERE ro.id = ?`
      )
      .get(req.params.id);
    if (!order) throw new HttpError(404, "Repair order not found");
    res.json(withTotal(order));
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = orderSchema.parse(req.body);
    const customer = db.prepare("SELECT id FROM customers WHERE id = ?").get(data.customer_id);
    if (!customer) throw new HttpError(400, "Customer does not exist");

    const result = db
      .prepare(
        `INSERT INTO repair_orders (customer_id, bike_id, description, priority, promised_date)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        data.customer_id,
        data.bike_id ?? null,
        data.description || null,
        data.priority,
        data.promised_date || null
      );
    const order = db.prepare("SELECT * FROM repair_orders WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(withTotal(order));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = orderSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM repair_orders WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Repair order not found");
    db.prepare(
      `UPDATE repair_orders
       SET customer_id = ?, bike_id = ?, description = ?, priority = ?, promised_date = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.customer_id,
      data.bike_id ?? null,
      data.description || null,
      data.priority,
      data.promised_date || null,
      req.params.id
    );
    const order = db.prepare("SELECT * FROM repair_orders WHERE id = ?").get(req.params.id);
    res.json(withTotal(order));
  })
);

const statusSchema = z.object({ status: z.enum(REPAIR_STATUSES) });

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM repair_orders WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Repair order not found");
    const completedDate =
      status === "completed" || status === "picked_up" ? "datetime('now')" : "NULL";
    db.prepare(
      `UPDATE repair_orders
       SET status = ?, updated_at = datetime('now'), completed_date = COALESCE(completed_date, ${completedDate === "NULL" ? "completed_date" : completedDate})
       WHERE id = ?`
    ).run(status, req.params.id);
    const order = db.prepare("SELECT * FROM repair_orders WHERE id = ?").get(req.params.id);
    res.json(withTotal(order));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = db.prepare("SELECT * FROM repair_orders WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Repair order not found");
    db.prepare("DELETE FROM repair_orders WHERE id = ?").run(req.params.id);
    res.status(204).send();
  })
);

// --- Line items (services performed / parts used) ---

router.post(
  "/:id/items",
  asyncHandler(async (req, res) => {
    const order = db.prepare("SELECT * FROM repair_orders WHERE id = ?").get(req.params.id);
    if (!order) throw new HttpError(404, "Repair order not found");
    const data = itemSchema.parse(req.body);

    const insert = db.transaction(() => {
      if (data.item_type === "part" && data.reference_id) {
        const part = db
          .prepare("SELECT * FROM inventory_items WHERE id = ?")
          .get(data.reference_id) as any;
        if (!part) throw new HttpError(400, "Inventory item does not exist");
        if (part.quantity < data.quantity) {
          throw new HttpError(400, `Not enough stock for "${part.name}" (have ${part.quantity})`);
        }
        db.prepare("UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?").run(
          data.quantity,
          data.reference_id
        );
      }
      const result = db
        .prepare(
          `INSERT INTO repair_order_items (repair_order_id, item_type, reference_id, description, quantity, unit_price)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.params.id,
          data.item_type,
          data.reference_id ?? null,
          data.description,
          data.quantity,
          data.unit_price
        );
      db.prepare("UPDATE repair_orders SET updated_at = datetime('now') WHERE id = ?").run(
        req.params.id
      );
      return result.lastInsertRowid;
    });

    const id = insert();
    const item = db.prepare("SELECT * FROM repair_order_items WHERE id = ?").get(id);
    res.status(201).json(item);
  })
);

router.delete(
  "/:id/items/:itemId",
  asyncHandler(async (req, res) => {
    const item = db
      .prepare("SELECT * FROM repair_order_items WHERE id = ? AND repair_order_id = ?")
      .get(req.params.itemId, req.params.id) as any;
    if (!item) throw new HttpError(404, "Line item not found");

    const remove = db.transaction(() => {
      if (item.item_type === "part" && item.reference_id) {
        db.prepare("UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?").run(
          item.quantity,
          item.reference_id
        );
      }
      db.prepare("DELETE FROM repair_order_items WHERE id = ?").run(req.params.itemId);
      db.prepare("UPDATE repair_orders SET updated_at = datetime('now') WHERE id = ?").run(
        req.params.id
      );
    });
    remove();
    res.status(204).send();
  })
);

export default router;
