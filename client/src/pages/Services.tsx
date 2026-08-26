import React, { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import Modal from "../components/Modal";
import { ServiceItem } from "../types";
import { money } from "../utils/format";

const emptyForm = { name: "", description: "", price: 0, estimated_minutes: 30 };

export default function Services() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get("/services");
    setServices(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(service: ServiceItem) {
    setEditing(service);
    setForm({
      name: service.name,
      description: service.description || "",
      price: service.price,
      estimated_minutes: service.estimated_minutes,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/services/${editing.id}`, form);
      } else {
        await api.post("/services", form);
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this service?")) return;
    await api.delete(`/services/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Catalog</h1>
          <p className="text-slate-500 text-sm mt-1">Standard labor offerings and pricing.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + New Service
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Est. Minutes</th>
              <th>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : services.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-slate-400">
                  No services defined yet.
                </td>
              </tr>
            ) : (
              services.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium text-slate-800">{s.name}</td>
                  <td className="text-slate-500">{s.description || "—"}</td>
                  <td className="text-slate-500">{s.estimated_minutes} min</td>
                  <td className="font-medium">{money(s.price)}</td>
                  <td className="text-right space-x-3">
                    <button className="text-brand-600 hover:underline text-xs" onClick={() => openEdit(s)}>
                      Edit
                    </button>
                    <button className="text-red-600 hover:underline text-xs" onClick={() => handleDelete(s.id)}>
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
        <Modal title={editing ? "Edit Service" : "New Service"} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input
                required
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Price</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Estimated Minutes</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.estimated_minutes}
                  onChange={(e) => setForm({ ...form, estimated_minutes: Number(e.target.value) })}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Service"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
