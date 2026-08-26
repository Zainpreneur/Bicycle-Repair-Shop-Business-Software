import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { InventoryItem, RepairOrder, RepairStatus, ServiceItem } from "../types";
import { formatDate, formatDateTime, money } from "../utils/format";

const STATUS_OPTIONS: RepairStatus[] = [
  "received",
  "diagnosing",
  "awaiting_approval",
  "in_progress",
  "awaiting_parts",
  "completed",
  "picked_up",
  "cancelled",
];

export default function RepairOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [parts, setParts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemType, setItemType] = useState<"service" | "part">("service");
  const [selectedRef, setSelectedRef] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [taxRate, setTaxRate] = useState(0.08);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [orderRes, servicesRes, partsRes] = await Promise.all([
      api.get(`/repair-orders/${id}`),
      api.get("/services"),
      api.get("/inventory"),
    ]);
    setOrder(orderRes.data);
    setServices(servicesRes.data);
    setParts(partsRes.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function resetItemForm() {
    setSelectedRef("");
    setCustomDescription("");
    setQuantity(1);
    setUnitPrice(0);
  }

  function handleRefChange(refId: string) {
    setSelectedRef(refId);
    if (!refId) return;
    if (itemType === "service") {
      const svc = services.find((s) => s.id === Number(refId));
      if (svc) setUnitPrice(svc.price);
    } else {
      const part = parts.find((p) => p.id === Number(refId));
      if (part) setUnitPrice(part.unit_price);
    }
  }

  async function handleStatusChange(status: RepairStatus) {
    if (!order) return;
    await api.patch(`/repair-orders/${order.id}/status`, { status });
    await load();
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setError("");
    setBusy(true);
    try {
      let description = customDescription;
      if (!description && selectedRef) {
        if (itemType === "service") {
          description = services.find((s) => s.id === Number(selectedRef))?.name || "Service";
        } else {
          description = parts.find((p) => p.id === Number(selectedRef))?.name || "Part";
        }
      }
      await api.post(`/repair-orders/${order.id}/items`, {
        item_type: itemType,
        reference_id: selectedRef ? Number(selectedRef) : null,
        description: description || (itemType === "service" ? "Custom labor" : "Custom part"),
        quantity,
        unit_price: unitPrice,
      });
      resetItemForm();
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveItem(itemId: number) {
    if (!order) return;
    if (!confirm("Remove this line item? Any part quantity used will be returned to stock.")) return;
    await api.delete(`/repair-orders/${order.id}/items/${itemId}`);
    await load();
  }

  async function handleGenerateInvoice() {
    if (!order) return;
    setError("");
    setBusy(true);
    try {
      const res = await api.post("/invoices", { repair_order_id: order.id, tax_rate: taxRate });
      navigate(`/invoices/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteOrder() {
    if (!order) return;
    if (!confirm("Delete this repair order? This cannot be undone.")) return;
    await api.delete(`/repair-orders/${order.id}`);
    navigate("/repair-orders");
  }

  if (loading) return <div className="text-slate-500">Loading…</div>;
  if (!order) return <div className="text-red-600">Repair order not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link to="/repair-orders" className="text-sm text-brand-600 hover:underline">
            &larr; Back to repair orders
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Repair Order #{order.id}</h1>
          <div className="text-sm text-slate-500 mt-1">
            <Link to={`/customers/${order.customer_id}`} className="text-brand-600 hover:underline">
              {order.customer_name}
            </Link>
            {order.bike_brand && (
              <span>
                {" "}
                &middot; {order.bike_brand} {order.bike_model}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 items-start">
          <StatusBadge value={order.priority} />
          <button className="btn-danger" onClick={handleDeleteOrder}>
            Delete
          </button>
        </div>
      </div>

      <div className="card p-5 grid sm:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-slate-500 uppercase font-medium">Status</div>
          <select
            className="input mt-1"
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value as RepairStatus)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase font-medium">Dropped Off</div>
          <div className="mt-1.5 text-sm text-slate-800">{formatDate(order.dropoff_date)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase font-medium">Promised</div>
          <div className="mt-1.5 text-sm text-slate-800">{formatDate(order.promised_date)}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase font-medium">Completed</div>
          <div className="mt-1.5 text-sm text-slate-800">{formatDate(order.completed_date)}</div>
        </div>
        {order.description && (
          <div className="sm:col-span-4">
            <div className="text-xs text-slate-500 uppercase font-medium">Issue Description</div>
            <div className="mt-1 text-sm text-slate-700">{order.description}</div>
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Services &amp; Parts</h2>
        {order.items && order.items.length > 0 ? (
          <table className="table-base mb-4">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Line Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="capitalize text-slate-500">{item.item_type}</td>
                  <td className="text-slate-800">{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unit_price)}</td>
                  <td className="font-medium">{money(item.quantity * item.unit_price)}</td>
                  <td className="text-right">
                    <button
                      className="text-red-600 hover:underline text-xs"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-400 mb-4">No line items yet.</p>
        )}

        <div className="text-right font-bold text-lg text-slate-900 mb-4">Total: {money(order.total)}</div>

        <form onSubmit={handleAddItem} className="border-t border-slate-100 pt-4 space-y-3">
          <div className="text-sm font-medium text-slate-700">Add Line Item</div>
          <div className="grid sm:grid-cols-5 gap-3">
            <select
              className="input"
              value={itemType}
              onChange={(e) => {
                setItemType(e.target.value as "service" | "part");
                setSelectedRef("");
                setUnitPrice(0);
              }}
            >
              <option value="service">Service</option>
              <option value="part">Part</option>
            </select>
            <select
              className="input sm:col-span-2"
              value={selectedRef}
              onChange={(e) => handleRefChange(e.target.value)}
            >
              <option value="">Custom / type below…</option>
              {itemType === "service"
                ? services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({money(s.price)})
                    </option>
                  ))
                : parts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.quantity} in stock ({money(p.unit_price)})
                    </option>
                  ))}
            </select>
            <input
              type="number"
              min={0.01}
              step="0.01"
              className="input"
              placeholder="Qty"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            <input
              type="number"
              min={0}
              step="0.01"
              className="input"
              placeholder="Unit price"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
            />
          </div>
          {!selectedRef && (
            <input
              className="input"
              placeholder="Custom description"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-secondary" disabled={busy}>
            {busy ? "Adding…" : "+ Add Item"}
          </button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Invoicing</h2>
        <div className="flex items-end gap-3">
          <div>
            <label className="label">Tax Rate</label>
            <input
              type="number"
              min={0}
              max={1}
              step="0.01"
              className="input w-28"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>
          <button
            className="btn-primary"
            onClick={handleGenerateInvoice}
            disabled={busy || !order.items || order.items.length === 0}
          >
            Generate Invoice
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">Last updated {formatDateTime(order.updated_at)}</p>
      </div>
    </div>
  );
}
