import React, { useEffect, useState } from "react";
import { api, apiErrorMessage } from "../api/client";
import Modal from "../components/Modal";
import { InventoryItem } from "../types";
import { money } from "../utils/format";

const emptyForm = {
  name: "",
  sku: "",
  category: "",
  quantity: 0,
  unit_cost: 0,
  unit_price: 0,
  reorder_level: 0,
};

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [q, setQ] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get("/inventory", { params: { q, lowStock: lowStockOnly || undefined } });
    setItems(res.data);
    setLoading(false);
  }

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, lowStockOnly]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(item: InventoryItem) {
    setEditing(item);
    setForm({
      name: item.name,
      sku: item.sku || "",
      category: item.category || "",
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      unit_price: item.unit_price,
      reorder_level: item.reorder_level,
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.put(`/inventory/${editing.id}`, form);
      } else {
        await api.post("/inventory", form);
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
    if (!confirm("Delete this inventory item?")) return;
    await api.delete(`/inventory/${id}`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">Parts and accessories stock.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          + New Item
        </button>
      </div>

      <div className="flex items-center gap-4">
        <input
          className="input max-w-sm"
          placeholder="Search by name, SKU, or category…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Qty</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Reorder At</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-6 text-slate-400">
                  No inventory items found.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="font-medium text-slate-800">{item.name}</td>
                  <td className="text-slate-500">{item.sku || "—"}</td>
                  <td className="text-slate-500">{item.category || "—"}</td>
                  <td className={item.quantity <= item.reorder_level ? "text-red-600 font-semibold" : ""}>
                    {item.quantity}
                  </td>
                  <td className="text-slate-500">{money(item.unit_cost)}</td>
                  <td className="font-medium">{money(item.unit_price)}</td>
                  <td className="text-slate-500">{item.reorder_level}</td>
                  <td className="text-right space-x-3">
                    <button className="text-brand-600 hover:underline text-xs" onClick={() => openEdit(item)}>
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline text-xs"
                      onClick={() => handleDelete(item.id)}
                    >
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
        <Modal title={editing ? "Edit Item" : "New Inventory Item"} onClose={() => setShowForm(false)}>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">SKU</label>
                <input
                  className="input"
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Category</label>
                <input
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Quantity on Hand</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Reorder Level</label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={form.reorder_level}
                  onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Unit Cost</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={form.unit_cost}
                  onChange={(e) => setForm({ ...form, unit_cost: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">Unit Price</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: Number(e.target.value) })}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Item"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
