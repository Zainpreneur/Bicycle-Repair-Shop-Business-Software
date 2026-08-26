import "dotenv/config";
import db from "./db";

const customerCount = (db.prepare("SELECT COUNT(*) AS c FROM customers").get() as { c: number }).c;
if (customerCount > 0) {
  console.log("Database already has data — skipping seed. Delete the .db file to reseed.");
  process.exit(0);
}

console.log("Seeding sample data...");

const insertCustomer = db.prepare(
  "INSERT INTO customers (name, email, phone, address, notes) VALUES (?, ?, ?, ?, ?)"
);
const insertBike = db.prepare(
  `INSERT INTO bikes (customer_id, brand, model, bike_type, color, serial_number, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insertItem = db.prepare(
  `INSERT INTO inventory_items (name, sku, category, quantity, unit_cost, unit_price, reorder_level)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insertService = db.prepare(
  "INSERT INTO services (name, description, price, estimated_minutes) VALUES (?, ?, ?, ?)"
);
const insertOrder = db.prepare(
  `INSERT INTO repair_orders (customer_id, bike_id, status, priority, description, promised_date)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertOrderItem = db.prepare(
  `INSERT INTO repair_order_items (repair_order_id, item_type, reference_id, description, quantity, unit_price)
   VALUES (?, ?, ?, ?, ?, ?)`
);
const insertAppointment = db.prepare(
  `INSERT INTO appointments (customer_id, bike_id, scheduled_at, duration_minutes, reason, status, notes)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
const insertInvoice = db.prepare(
  `INSERT INTO invoices (invoice_number, repair_order_id, customer_id, status, subtotal, tax_rate, tax, total, paid_date)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const seed = db.transaction(() => {
  const c1 = insertCustomer.run("Maria Alonso", "maria@example.com", "555-0101", "12 Elm St", "Prefers text updates").lastInsertRowid as number;
  const c2 = insertCustomer.run("Devon Brooks", "devon@example.com", "555-0102", "88 Oak Ave", "").lastInsertRowid as number;
  const c3 = insertCustomer.run("Priya Nair", "priya@example.com", "555-0103", "4 River Rd", "Racing club member").lastInsertRowid as number;

  const b1 = insertBike.run(c1, "Trek", "Marlin 7", "Mountain", "Blue", "TRK-9981", "").lastInsertRowid as number;
  const b2 = insertBike.run(c2, "Specialized", "Sirrus X", "Hybrid", "Black", "SPZ-4471", "").lastInsertRowid as number;
  const b3 = insertBike.run(c3, "Cannondale", "SuperSix EVO", "Road", "Red", "CDL-2210", "Carbon frame - handle with care").lastInsertRowid as number;

  const partChain = insertItem.run("Shimano Chain 11-speed", "PRT-CHN-11", "Drivetrain", 12, 14, 28, 3).lastInsertRowid as number;
  const partBrakePads = insertItem.run("Disc Brake Pads (pair)", "PRT-BRK-01", "Brakes", 20, 6, 15, 5).lastInsertRowid as number;
  const partTube = insertItem.run("26in Inner Tube", "PRT-TUBE-26", "Tires", 30, 3, 8, 8).lastInsertRowid as number;
  insertItem.run("700c Road Tire", "PRT-TIRE-700C", "Tires", 2, 18, 35, 4);
  insertItem.run("Bar Tape", "PRT-TAPE-01", "Accessories", 15, 4, 12, 4);

  insertService.run("Basic Tune-Up", "Gear/brake adjust, lube, safety check", 65, 45);
  const svcFlat = insertService.run("Flat Tire Repair", "Patch or replace tube", 15, 20).lastInsertRowid as number;
  const svcBrake = insertService.run("Brake Adjustment", "Adjust or replace brake pads", 25, 30).lastInsertRowid as number;
  insertService.run("Full Overhaul", "Complete disassembly, clean, rebuild", 150, 180);
  insertService.run("Wheel Truing", "True a wheel on the stand", 20, 25);

  // Order 1: in progress, chain replacement
  const o1 = insertOrder.run(c1, b1, "in_progress", "normal", "Chain is skipping under load", null).lastInsertRowid as number;
  insertOrderItem.run(o1, "part", partChain, "Shimano Chain 11-speed", 1, 28);
  insertOrderItem.run(o1, "service", null, "Drivetrain adjustment", 1, 25);
  db.prepare("UPDATE inventory_items SET quantity = quantity - 1 WHERE id = ?").run(partChain);

  // Order 2: completed + invoiced + paid
  const o2 = insertOrder.run(c2, b2, "picked_up", "low", "Flat tire on rear wheel", null).lastInsertRowid as number;
  db.prepare("UPDATE repair_orders SET completed_date = datetime('now', '-2 days') WHERE id = ?").run(o2);
  insertOrderItem.run(o2, "service", svcFlat, "Flat Tire Repair", 1, 15);
  insertOrderItem.run(o2, "part", partTube, "26in Inner Tube", 1, 8);
  db.prepare("UPDATE inventory_items SET quantity = quantity - 1 WHERE id = ?").run(partTube);
  insertInvoice.run("INV-00001", o2, c2, "paid", 23, 0.08, 1.84, 24.84, null);
  db.prepare("UPDATE invoices SET paid_date = datetime('now', '-1 day') WHERE invoice_number = 'INV-00001'").run();

  // Order 3: awaiting parts, brake job
  const o3 = insertOrder.run(c3, b3, "awaiting_parts", "high", "Squeaky disc brakes, needs new pads", "2026-08-25").lastInsertRowid as number;
  insertOrderItem.run(o3, "service", svcBrake, "Brake Adjustment", 1, 25);
  insertOrderItem.run(o3, "part", partBrakePads, "Disc Brake Pads (pair)", 1, 15);
  db.prepare("UPDATE inventory_items SET quantity = quantity - 1 WHERE id = ?").run(partBrakePads);

  // Order 4: just received
  insertOrder.run(c1, b1, "received", "normal", "Annual tune-up requested", null);

  // Unpaid invoice example (standalone, no repair order link would violate FK-optional but let's link to o1 style)
  const o5 = insertOrder.run(c2, b2, "completed", "normal", "Wheel truing", null).lastInsertRowid as number;
  db.prepare("UPDATE repair_orders SET completed_date = datetime('now', '-1 day') WHERE id = ?").run(o5);
  insertOrderItem.run(o5, "service", null, "Wheel Truing", 1, 20);
  insertInvoice.run("INV-00002", o5, c2, "unpaid", 20, 0.08, 1.6, 21.6, null);

  // Appointments
  insertAppointment.run(c1, b1, "2026-08-25 10:00", 45, "Tune-up", "scheduled", "");
  insertAppointment.run(c3, b3, "2026-08-26 14:30", 30, "Brake check follow-up", "confirmed", "");
  insertAppointment.run(c2, null, "2026-08-28 09:00", 30, "New bike fitting consultation", "scheduled", "");
});

seed();

console.log("Seed complete: 3 customers, 3 bikes, 5 inventory items, 5 services, 5 repair orders, 2 invoices, 3 appointments.");
