import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { Bike, Customer, RepairOrder, RepairPriority } from "../types";
import { formatDate, money } from "../utils/format";

const STATUS_OPTIONS = [
  "received",
  "diagnosing",
  "awaiting_approval",
  "in_progress",
  "awaiting_parts",
  "completed",
  "picked_up",
  "cancelled",
];

export default function RepairOrders() {
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    bike_id: "",
    description: "",
    priority: "normal" as RepairPriority,
    promised_date: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get("/repair-orders", { params: { status: statusFilter || undefined } });
    setOrders(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function openForm() {
    setError("");
    setForm({ customer_id: "", bike_id: "", description: "", priority: "normal", promised_date: "" });
    setBikes([]);
    setShowForm(true);
    const res = await api.get("/customers");
    setCustomers(res.data);
  }

  async function handleCustomerChange(customerId: string) {
    setForm((f) => ({ ...f, customer_id: customerId, bike_id: "" }));
    if (!customerId) {
      setBikes([]);
      return;
    }
    const res = await api.get(`/customers/${customerId}`);
    setBikes(res.data.bikes);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/repair-orders", {
        customer_id: Number(form.customer_id),
        bike_id: form.bike_id ? Number(form.bike_id) : null,
        description: form.description,
        priority: form.priority,
        promised_date: form.promised_date || null,
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Repair Orders</h1>
          <p className="text-slate-500 text-sm mt-1">Track intake through pickup.</p>
        </div>
        <button className="btn-primary" onClick={openForm}>
          + New Repair Order
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          className={`btn-secondary ${statusFilter === "" ? "!bg-slate-900 !text-white" : ""}`}
          onClick={() => setStatusFilter("")}
        >
          All
        </button>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            className={`btn-secondary capitalize ${statusFilter === s ? "!bg-slate-900 !text-white" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Bike</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Dropped Off</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-400">
                  No repair orders found.
                </td>
              </tr>
            ) : (
              orders.map((ro) => (
                <tr key={ro.id}>
                  <td>
                    <Link to={`/repair-orders/${ro.id}`} className="font-medium text-brand-600 hover:underline">
                      #{ro.id}
                    </Link>
                  </td>
                  <td className="text-slate-700">{ro.customer_name}</td>
                  <td className="text-slate-500">
                    {ro.bike_brand ? `${ro.bike_brand} ${ro.bike_model || ""}` : "—"}
                  </td>
                  <td>
                    <StatusBadge value={ro.status} />
                  </td>
                  <td>
                    <StatusBadge value={ro.priority} />
                  </td>
                  <td className="text-slate-500">{formatDate(ro.dropoff_date)}</td>
                  <td className="font-medium">{money(ro.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="New Repair Order" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Customer *</label>
              <select
                required
                className="input"
                value={form.customer_id}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value="">Select a customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Bike</label>
              <select
                className="input"
                value={form.bike_id}
                onChange={(e) => setForm({ ...form, bike_id: e.target.value })}
                disabled={!form.customer_id}
              >
                <option value="">No specific bike</option>
                {bikes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.brand} {b.model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description of Issue</label>
              <textarea
                className="input"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Priority</label>
                <select
                  className="input"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as RepairPriority })}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="label">Promised Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.promised_date}
                  onChange={(e) => setForm({ ...form, promised_date: e.target.value })}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Creating…" : "Create Order"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
