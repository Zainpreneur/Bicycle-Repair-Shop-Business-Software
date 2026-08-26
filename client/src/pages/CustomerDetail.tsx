import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";
import { Bike, Customer, Invoice, RepairOrder } from "../types";
import { formatDate, money } from "../utils/format";

const emptyBike = { brand: "", model: "", bike_type: "", color: "", serial_number: "", notes: "" };

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [repairOrders, setRepairOrders] = useState<RepairOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBikeForm, setShowBikeForm] = useState(false);
  const [bikeForm, setBikeForm] = useState(emptyBike);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await api.get(`/customers/${id}`);
    setCustomer(res.data.customer);
    setBikes(res.data.bikes);
    setRepairOrders(res.data.repairOrders);
    setInvoices(res.data.invoices);
    setEditForm({
      name: res.data.customer.name,
      email: res.data.customer.email || "",
      phone: res.data.customer.phone || "",
      address: res.data.customer.address || "",
      notes: res.data.customer.notes || "",
    });
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddBike(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post(`/customers/${id}/bikes`, bikeForm);
      setShowBikeForm(false);
      setBikeForm(emptyBike);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put(`/customers/${id}`, editForm);
      setShowEditForm(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomer() {
    if (!confirm("Delete this customer? This also removes their bikes, repair orders, and invoices.")) return;
    await api.delete(`/customers/${id}`);
    navigate("/customers");
  }

  async function handleDeleteBike(bikeId: number) {
    if (!confirm("Remove this bike from the customer's profile?")) return;
    await api.delete(`/customers/${id}/bikes/${bikeId}`);
    await load();
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (!customer) return <div className="text-red-600">Customer not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/customers" className="text-sm text-brand-600 hover:underline">
            &larr; Back to customers
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{customer.name}</h1>
          <div className="text-sm text-slate-500 mt-1 space-x-3">
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span>{customer.phone}</span>}
            {customer.address && <span>{customer.address}</span>}
          </div>
          {customer.notes && <p className="text-sm text-slate-500 mt-1 italic">"{customer.notes}"</p>}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowEditForm(true)}>
            Edit
          </button>
          <button className="btn-danger" onClick={handleDeleteCustomer}>
            Delete
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Bikes</h2>
          <button className="btn-secondary" onClick={() => setShowBikeForm(true)}>
            + Add Bike
          </button>
        </div>
        {bikes.length === 0 ? (
          <p className="text-sm text-slate-400">No bikes on file.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {bikes.map((b) => (
              <div key={b.id} className="border border-slate-200 rounded-md p-3 flex justify-between">
                <div>
                  <div className="font-medium text-slate-800">
                    {b.brand} {b.model}
                  </div>
                  <div className="text-xs text-slate-500">
                    {[b.bike_type, b.color, b.serial_number].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {b.notes && <div className="text-xs text-slate-400 mt-1">{b.notes}</div>}
                </div>
                <button
                  onClick={() => handleDeleteBike(b.id)}
                  className="text-slate-400 hover:text-red-600 text-sm h-fit"
                  title="Remove bike"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Repair Order History</h2>
        {repairOrders.length === 0 ? (
          <p className="text-sm text-slate-400">No repair orders yet.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>ID</th>
                <th>Status</th>
                <th>Description</th>
                <th>Dropped Off</th>
              </tr>
            </thead>
            <tbody>
              {repairOrders.map((ro) => (
                <tr key={ro.id}>
                  <td>
                    <Link to={`/repair-orders/${ro.id}`} className="text-brand-600 hover:underline font-medium">
                      #{ro.id}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge value={ro.status} />
                  </td>
                  <td className="text-slate-600">{ro.description || "—"}</td>
                  <td className="text-slate-500">{formatDate(ro.dropoff_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-400">No invoices yet.</p>
        ) : (
          <table className="table-base">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Status</th>
                <th>Total</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link to={`/invoices/${inv.id}`} className="text-brand-600 hover:underline font-medium">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge value={inv.status} />
                  </td>
                  <td className="font-medium">{money(inv.total)}</td>
                  <td className="text-slate-500">{formatDate(inv.issued_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showBikeForm && (
        <Modal title="Add Bike" onClose={() => setShowBikeForm(false)}>
          <form onSubmit={handleAddBike} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Brand</label>
                <input
                  className="input"
                  value={bikeForm.brand}
                  onChange={(e) => setBikeForm({ ...bikeForm, brand: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Model</label>
                <input
                  className="input"
                  value={bikeForm.model}
                  onChange={(e) => setBikeForm({ ...bikeForm, model: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Type</label>
                <input
                  className="input"
                  placeholder="Road, Mountain, Hybrid…"
                  value={bikeForm.bike_type}
                  onChange={(e) => setBikeForm({ ...bikeForm, bike_type: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Color</label>
                <input
                  className="input"
                  value={bikeForm.color}
                  onChange={(e) => setBikeForm({ ...bikeForm, color: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input
                className="input"
                value={bikeForm.serial_number}
                onChange={(e) => setBikeForm({ ...bikeForm, serial_number: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={2}
                value={bikeForm.notes}
                onChange={(e) => setBikeForm({ ...bikeForm, notes: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowBikeForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Add Bike"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showEditForm && (
        <Modal title="Edit Customer" onClose={() => setShowEditForm(false)}>
          <form onSubmit={handleEditCustomer} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input
                required
                className="input"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Address</label>
              <input
                className="input"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setShowEditForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
