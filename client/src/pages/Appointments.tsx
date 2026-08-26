import React, { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { Appointment, AppointmentStatus, Bike, Customer } from "../types";
import { formatDateTime } from "../utils/format";

const STATUS_OPTIONS: AppointmentStatus[] = ["scheduled", "confirmed", "completed", "cancelled", "no_show"];

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    bike_id: "",
    scheduled_at: "",
    duration_minutes: 30,
    reason: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get("/appointments");
    setAppointments(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function openForm() {
    setError("");
    setForm({ customer_id: "", bike_id: "", scheduled_at: "", duration_minutes: 30, reason: "" });
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
      await api.post("/appointments", {
        customer_id: Number(form.customer_id),
        bike_id: form.bike_id ? Number(form.bike_id) : null,
        scheduled_at: form.scheduled_at.replace("T", " "),
        duration_minutes: form.duration_minutes,
        reason: form.reason,
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: number, status: AppointmentStatus) {
    await api.patch(`/appointments/${id}/status`, { status });
    await load();
  }

  async function handleDelete(id: number) {
    if (!confirm("Cancel and delete this appointment?")) return;
    await api.delete(`/appointments/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500 text-sm mt-1">Scheduled drop-offs and consultations.</p>
        </div>
        <button className="btn-primary" onClick={openForm}>
          + New Appointment
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>When</th>
              <th>Customer</th>
              <th>Bike</th>
              <th>Reason</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : appointments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-400">
                  No appointments scheduled.
                </td>
              </tr>
            ) : (
              appointments.map((a) => (
                <tr key={a.id}>
                  <td className="text-slate-700">{formatDateTime(a.scheduled_at)}</td>
                  <td className="text-slate-700">{a.customer_name}</td>
                  <td className="text-slate-500">
                    {a.bike_brand ? `${a.bike_brand} ${a.bike_model || ""}` : "—"}
                  </td>
                  <td className="text-slate-500">{a.reason || "—"}</td>
                  <td>
                    <select
                      className="text-xs border-none bg-transparent font-medium"
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value as AppointmentStatus)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    <StatusBadge value={a.status} />
                  </td>
                  <td className="text-right">
                    <button className="text-red-600 hover:underline text-xs" onClick={() => handleDelete(a.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="New Appointment" onClose={() => setShowForm(false)}>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date &amp; Time *</label>
                <input
                  required
                  type="datetime-local"
                  className="input"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  className="input"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="label">Reason</label>
              <input
                className="input"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Scheduling…" : "Schedule"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
