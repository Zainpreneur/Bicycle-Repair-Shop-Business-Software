import { Router } from "express";
import { z } from "zod";
import db from "../db";
import { asyncHandler, HttpError } from "../utils/asyncHandler";
import { INVOICE_STATUSES } from "../types";

const router = Router();

function nextInvoiceNumber(): string {
  const row = db.prepare("SELECT COUNT(*) AS c FROM invoices").get() as { c: number };
  const seq = row.c + 1;
  return `INV-${String(seq).padStart(5, "0")}`;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    let query = `
      SELECT i.*, c.name AS customer_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      WHERE 1 = 1`;
    const params: any[] = [];
    if (status) {
      query += " AND i.status = ?";
      params.push(status);
    }
    query += " ORDER BY i.issued_date DESC";
    res.json(db.prepare(query).all(...params));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = db
      .prepare(
        `SELECT i.*, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address
         FROM invoices i
         JOIN customers c ON c.id = i.customer_id
         WHERE i.id = ?`
      )
      .get(req.params.id) as any;
    if (!invoice) throw new HttpError(404, "Invoice not found");
    const items = invoice.repair_order_id
      ? db
          .prepare("SELECT * FROM repair_order_items WHERE repair_order_id = ?")
          .all(invoice.repair_order_id)
      : [];
    res.json({ ...invoice, items });
  })
);

const createSchema = z.object({
  repair_order_id: z.number().int(),
  tax_rate: z.number().min(0).max(1).default(0),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const order = db
      .prepare("SELECT * FROM repair_orders WHERE id = ?")
      .get(data.repair_order_id) as any;
    if (!order) throw new HttpError(404, "Repair order not found");

    const existing = db
      .prepare("SELECT * FROM invoices WHERE repair_order_id = ?")
      .get(data.repair_order_id);
    if (existing) throw new HttpError(400, "This repair order already has an invoice");

    const items = db
      .prepare("SELECT * FROM repair_order_items WHERE repair_order_id = ?")
      .all(data.repair_order_id) as any[];
    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const tax = subtotal * data.tax_rate;
    const total = subtotal + tax;

    const invoiceNumber = nextInvoiceNumber();
    const result = db
      .prepare(
        `INSERT INTO invoices (invoice_number, repair_order_id, customer_id, subtotal, tax_rate, tax, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        invoiceNumber,
        data.repair_order_id,
        order.customer_id,
        Math.round(subtotal * 100) / 100,
        data.tax_rate,
        Math.round(tax * 100) / 100,
        Math.round(total * 100) / 100
      );
    const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(invoice);
  })
);

const statusSchema = z.object({ status: z.enum(INVOICE_STATUSES) });

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const { status } = statusSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Invoice not found");
    const paidDate = status === "paid" ? "datetime('now')" : "NULL";
    db.prepare(`UPDATE invoices SET status = ?, paid_date = ${paidDate} WHERE id = ?`).run(
      status,
      req.params.id
    );
    const invoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);
    res.json(invoice);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = db.prepare("SELECT * FROM invoices WHERE id = ?").get(req.params.id);
    if (!existing) throw new HttpError(404, "Invoice not found");
    db.prepare("DELETE FROM invoices WHERE id = ?").run(req.params.id);
    res.status(204).send();
  })
);

export default router;
