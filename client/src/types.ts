export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Bike {
  id: number;
  customer_id: number;
  brand: string | null;
  model: string | null;
  bike_type: string | null;
  color: string | null;
  serial_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  reorder_level: number;
  created_at: string;
}

export interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  estimated_minutes: number;
}

export type RepairStatus =
  | "received"
  | "diagnosing"
  | "awaiting_approval"
  | "in_progress"
  | "awaiting_parts"
  | "completed"
  | "picked_up"
  | "cancelled";

export type RepairPriority = "low" | "normal" | "high" | "urgent";

export interface RepairOrderItem {
  id: number;
  repair_order_id: number;
  item_type: "service" | "part";
  reference_id: number | null;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface RepairOrder {
  id: number;
  customer_id: number;
  bike_id: number | null;
  status: RepairStatus;
  priority: RepairPriority;
  description: string | null;
  dropoff_date: string;
  promised_date: string | null;
  completed_date: string | null;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  bike_brand?: string | null;
  bike_model?: string | null;
  items?: RepairOrderItem[];
  total: number;
}

export type InvoiceStatus = "unpaid" | "paid" | "void";

export interface Invoice {
  id: number;
  invoice_number: string;
  repair_order_id: number | null;
  customer_id: number;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number;
  tax: number;
  total: number;
  issued_date: string;
  paid_date: string | null;
  customer_name?: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  items?: RepairOrderItem[];
}

export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: number;
  customer_id: number;
  bike_id: number | null;
  scheduled_at: string;
  duration_minutes: number;
  reason: string | null;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  customer_name?: string;
  bike_brand?: string | null;
  bike_model?: string | null;
}

export interface DashboardData {
  activeRepairs: number;
  completedThisMonth: number;
  revenueThisMonth: number;
  unpaidInvoicesTotal: number;
  totalCustomers: number;
  lowStockItems: InventoryItem[];
  upcomingAppointments: Appointment[];
  recentRepairOrders: RepairOrder[];
  statusBreakdown: { status: RepairStatus; count: number }[];
}
