import { Router } from "express";
import db from "../db";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const activeRepairs = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM repair_orders WHERE status NOT IN ('completed', 'picked_up', 'cancelled')`
        )
        .get() as { c: number }
    ).c;

    const completedThisMonth = (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM repair_orders
           WHERE status IN ('completed', 'picked_up') AND strftime('%Y-%m', completed_date) = strftime('%Y-%m', 'now')`
        )
        .get() as { c: number }
    ).c;

    const revenueThisMonth = (
      db
        .prepare(
          `SELECT COALESCE(SUM(total), 0) AS total FROM invoices
           WHERE status = 'paid' AND strftime('%Y-%m', paid_date) = strftime('%Y-%m', 'now')`
        )
        .get() as { total: number }
    ).total;

    const unpaidInvoicesTotal = (
      db.prepare(`SELECT COALESCE(SUM(total), 0) AS total FROM invoices WHERE status = 'unpaid'`).get() as {
        total: number;
      }
    ).total;

    const totalCustomers = (db.prepare("SELECT COUNT(*) AS c FROM customers").get() as { c: number }).c;

    const lowStockItems = db
      .prepare("SELECT * FROM inventory_items WHERE quantity <= reorder_level ORDER BY name ASC")
      .all();

    const upcomingAppointments = db
      .prepare(
        `SELECT a.*, c.name AS customer_name
         FROM appointments a
         JOIN customers c ON c.id = a.customer_id
         WHERE a.scheduled_at >= datetime('now') AND a.status IN ('scheduled', 'confirmed')
         ORDER BY a.scheduled_at ASC
         LIMIT 5`
      )
      .all();

    const recentRepairOrders = db
      .prepare(
        `SELECT ro.*, c.name AS customer_name
         FROM repair_orders ro
         JOIN customers c ON c.id = ro.customer_id
         ORDER BY ro.created_at DESC
         LIMIT 5`
      )
      .all();

    const statusBreakdown = db
      .prepare(
        `SELECT status, COUNT(*) AS count FROM repair_orders
         WHERE status NOT IN ('completed', 'picked_up', 'cancelled')
         GROUP BY status`
      )
      .all();

    res.json({
      activeRepairs,
      completedThisMonth,
      revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
      unpaidInvoicesTotal: Math.round(unpaidInvoicesTotal * 100) / 100,
      totalCustomers,
      lowStockItems,
      upcomingAppointments,
      recentRepairOrders,
      statusBreakdown,
    });
  })
);

export default router;
