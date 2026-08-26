export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface AppJwtPayload {
  sub: number;
  username: string;
  name: string;
  role: string;
}

export const REPAIR_STATUSES = [
  "received",
  "diagnosing",
  "awaiting_approval",
  "in_progress",
  "awaiting_parts",
  "completed",
  "picked_up",
  "cancelled",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const REPAIR_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type RepairPriority = (typeof REPAIR_PRIORITIES)[number];

export const INVOICE_STATUSES = ["unpaid", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
